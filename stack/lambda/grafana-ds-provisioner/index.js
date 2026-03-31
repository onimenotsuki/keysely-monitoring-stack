'use strict';

const {
  GrafanaClient,
  CreateWorkspaceServiceAccountCommand,
  CreateWorkspaceServiceAccountTokenCommand,
  DeleteWorkspaceServiceAccountCommand,
} = require('@aws-sdk/client-grafana');
const {
  ElasticLoadBalancingV2Client,
  DescribeLoadBalancersCommand,
  DescribeTagsCommand,
} = require('@aws-sdk/client-elastic-load-balancing-v2');
const https = require('node:https');

const RETRY_DELAY_MS = 15_000;
const MAX_RETRIES = 30;

function httpsJson(method, hostname, urlPath, token, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname,
        port: 443,
        path: urlPath,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, data: raw });
          }
        });
      },
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function findNlbDns(client, serviceTag) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let marker;
    do {
      const { LoadBalancers = [], NextMarker } = await client.send(
        new DescribeLoadBalancersCommand({ Marker: marker }),
      );
      for (let i = 0; i < LoadBalancers.length; i += 20) {
        const arns = LoadBalancers.slice(i, i + 20).map((lb) => lb.LoadBalancerArn);
        const { TagDescriptions = [] } = await client.send(
          new DescribeTagsCommand({ ResourceArns: arns }),
        );
        for (const td of TagDescriptions) {
          const hit = (td.Tags || []).find(
            (t) => t.Key === 'kubernetes.io/service-name' && t.Value === serviceTag,
          );
          if (hit) {
            const lb = LoadBalancers.find((l) => l.LoadBalancerArn === td.ResourceArn);
            if (lb?.State?.Code === 'active') return lb.DNSName;
            console.log(`NLB found but state=${lb?.State?.Code}`);
          }
        }
      }
      marker = NextMarker;
    } while (marker);

    console.log(`Attempt ${attempt}/${MAX_RETRIES} – NLB not ready, retrying in ${RETRY_DELAY_MS}ms`);
    await sleep(RETRY_DELAY_MS);
  }
  throw new Error(`NLB tagged kubernetes.io/service-name=${serviceTag} not active after ${MAX_RETRIES} retries`);
}

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event));

  if (event.RequestType === 'Delete') {
    return { PhysicalResourceId: event.PhysicalResourceId || 'n/a' };
  }

  const { WorkspaceId, GrafanaEndpoint, LokiServiceTag } = event.ResourceProperties;
  const elb = new ElasticLoadBalancingV2Client({});
  const gf = new GrafanaClient({});

  const nlbDns = await findNlbDns(elb, LokiServiceTag);
  const lokiUrl = `http://${nlbDns}:3100`;
  console.log('Loki URL resolved:', lokiUrl);

  const sa = await gf.send(
    new CreateWorkspaceServiceAccountCommand({
      workspaceId: WorkspaceId,
      name: `cdk-ds-${Date.now()}`,
      grafanaRole: 'ADMIN',
    }),
  );
  const saId = String(sa.id);
  console.log('Service account created:', saId);

  try {
    const { serviceAccountToken } = await gf.send(
      new CreateWorkspaceServiceAccountTokenCommand({
        workspaceId: WorkspaceId,
        serviceAccountId: saId,
        name: 'cdk-token',
        secondsToLive: 300,
      }),
    );
    const key = serviceAccountToken.key;

    const list = await httpsJson('GET', GrafanaEndpoint, '/api/datasources', key);
    const existing = Array.isArray(list.data) ? list.data.find((d) => d.type === 'loki') : null;

    if (existing) {
      console.log('Updating existing Loki datasource id:', existing.id);
      await httpsJson('PUT', GrafanaEndpoint, `/api/datasources/${existing.id}`, key, {
        ...existing,
        url: lokiUrl,
      });
    } else {
      console.log('Creating new Loki datasource');
      const res = await httpsJson('POST', GrafanaEndpoint, '/api/datasources', key, {
        name: 'Loki',
        type: 'loki',
        url: lokiUrl,
        access: 'proxy',
        isDefault: false,
      });
      console.log('Create result:', res.status, JSON.stringify(res.data));
    }
  } finally {
    try {
      await gf.send(
        new DeleteWorkspaceServiceAccountCommand({ workspaceId: WorkspaceId, serviceAccountId: saId }),
      );
      console.log('Service account cleaned up:', saId);
    } catch (e) {
      console.warn('SA cleanup failed:', e.message);
    }
  }

  return {
    PhysicalResourceId: `loki-ds-${WorkspaceId}`,
    Data: { LokiUrl: lokiUrl, NlbDns: nlbDns },
  };
};
