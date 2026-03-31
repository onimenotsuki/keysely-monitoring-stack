import * as cdk from "aws-cdk-lib";
import * as path from "node:path";
import {
  aws_ec2 as ec2,
  aws_eks as eks,
  aws_grafana as grafana,
  aws_iam as iam,
  aws_lambda as lambda,
  custom_resources as cr,
} from "aws-cdk-lib";
import { KubectlV29Layer } from "@aws-cdk/lambda-layer-kubectl-v29";
import { Construct } from "constructs";

export interface KeyselyMonitoringStackProps extends cdk.StackProps {
  envName: "dev" | "prod";
  baseName: string;
  monitoringNamespace: string;
  nodeCount: number;
  instanceType: string;
}

export class KeyselyMonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: KeyselyMonitoringStackProps) {
    super(scope, id, props);

    const commonTags: Record<string, string> = {
      environment: props.envName,
      project: "keysely-monitoring-stack",
      managedBy: "cdk",
    };

    const vpc = new ec2.Vpc(this, "MonitoringVpc", {
      maxAzs: 2,
      natGateways: 1,
      ipAddresses: ec2.IpAddresses.cidr("10.240.0.0/16"),
      subnetConfiguration: [
        {
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: "private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
    });

    const cluster = new eks.Cluster(this, "EksCluster", {
      clusterName: `${props.baseName}-eks`,
      version: eks.KubernetesVersion.V1_29,
      kubectlLayer: new KubectlV29Layer(this, "KubectlLayer"),
      vpc,
      vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
      endpointAccess: eks.EndpointAccess.PUBLIC_AND_PRIVATE,
      defaultCapacity: 0,
    });

    cluster.addNodegroupCapacity("ObservabilityNodeGroup", {
      nodegroupName: `${props.baseName}-ng`,
      desiredSize: props.nodeCount,
      minSize: Math.max(1, props.nodeCount - 1),
      maxSize: props.nodeCount + 1,
      instanceTypes: [new ec2.InstanceType(props.instanceType)],
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    const prometheus = cluster.addHelmChart("KubePrometheusStack", {
      chart: "kube-prometheus-stack",
      release: "kube-prometheus-stack",
      version: "61.0.0",
      namespace: props.monitoringNamespace,
      repository: "https://prometheus-community.github.io/helm-charts",
      createNamespace: true,
      values: {
        grafana: { enabled: false },
        prometheus: {
          prometheusSpec: {
            retention: "15d",
            serviceMonitorSelectorNilUsesHelmValues: false,
            podMonitorSelectorNilUsesHelmValues: false,
          },
        },
        alertmanager: { enabled: true },
        kubeStateMetrics: { enabled: true },
        nodeExporter: { enabled: true },
      },
    });

    const loki = cluster.addHelmChart("Loki", {
      chart: "loki",
      release: "loki",
      version: "6.6.2",
      namespace: props.monitoringNamespace,
      repository: "https://grafana.github.io/helm-charts",
      values: {
        deploymentMode: "SingleBinary",
        loki: {
          commonConfig: { replication_factor: 1 },
          storage: { type: "filesystem" },
          auth_enabled: false,
        },
        singleBinary: {
          replicas: 1,
          persistence: { enabled: true, size: "10Gi" },
        },
        chunksCache: { enabled: false },
        resultsCache: { enabled: false },
        gateway: { enabled: false },
      },
    });
    loki.node.addDependency(prometheus);

    const otel = cluster.addHelmChart("OtelCollector", {
      chart: "opentelemetry-collector",
      release: "otel-collector",
      version: "0.97.1",
      namespace: props.monitoringNamespace,
      repository: "https://open-telemetry.github.io/opentelemetry-helm-charts",
      values: {
        mode: "deployment",
        replicaCount: 1,
      },
    });
    otel.node.addDependency(loki);

    const grafanaSg = new ec2.SecurityGroup(this, "GrafanaSg", {
      vpc,
      description: "ENIs for Managed Grafana VPC connectivity",
      allowAllOutbound: true,
    });

    const workspace = new grafana.CfnWorkspace(this, "ManagedGrafana", {
      name: `${props.baseName}-amg`,
      accountAccessType: "CURRENT_ACCOUNT",
      authenticationProviders: ["AWS_SSO"],
      permissionType: "SERVICE_MANAGED",
      dataSources: ["PROMETHEUS"],
      vpcConfiguration: {
        securityGroupIds: [grafanaSg.securityGroupId],
        subnetIds: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }).subnetIds,
      },
    });

    // Expose Loki via internal NLB so Grafana VPC ENIs can reach it
    const LOKI_NODE_PORT = 30_100;
    const lokiLb = cluster.addManifest("LokiInternalLb", {
      apiVersion: "v1",
      kind: "Service",
      metadata: {
        name: "loki-lb",
        namespace: props.monitoringNamespace,
        annotations: {
          "service.beta.kubernetes.io/aws-load-balancer-scheme": "internal",
          "service.beta.kubernetes.io/aws-load-balancer-type": "nlb",
        },
      },
      spec: {
        type: "LoadBalancer",
        selector: { "app.kubernetes.io/name": "loki" },
        ports: [
          { name: "http", port: 3100, targetPort: 3100, nodePort: LOKI_NODE_PORT, protocol: "TCP" },
        ],
      },
    });
    lokiLb.node.addDependency(loki);

    new ec2.CfnSecurityGroupIngress(this, "NlbToLokiIngress", {
      groupId: cluster.clusterSecurityGroupId,
      ipProtocol: "tcp",
      fromPort: LOKI_NODE_PORT,
      toPort: LOKI_NODE_PORT,
      cidrIp: vpc.vpcCidrBlock,
      description: "Internal NLB health-checks and traffic to Loki NodePort",
    });

    // Lambda-backed Custom Resource that auto-provisions the Loki datasource
    const lokiServiceTag = `${props.monitoringNamespace}/loki-lb`;

    const dsProvisionerFn = new lambda.Function(this, "GrafanaDsProvisioner", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "..", "lambda", "grafana-ds-provisioner")),
      timeout: cdk.Duration.minutes(10),
      description: "Provisions Loki datasource in Managed Grafana via HTTP API",
    });

    dsProvisionerFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "grafana:CreateWorkspaceServiceAccount",
          "grafana:CreateWorkspaceServiceAccountToken",
          "grafana:DeleteWorkspaceServiceAccount",
          "grafana:DeleteWorkspaceServiceAccountToken",
        ],
        resources: [
          `arn:aws:grafana:${this.region}:${this.account}:/workspaces/${workspace.attrId}`,
          `arn:aws:grafana:${this.region}:${this.account}:/workspaces/${workspace.attrId}/*`,
        ],
      }),
    );

    dsProvisionerFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["elasticloadbalancing:DescribeLoadBalancers", "elasticloadbalancing:DescribeTags"],
        resources: ["*"],
      }),
    );

    const dsProvider = new cr.Provider(this, "GrafanaDsProvider", {
      onEventHandler: dsProvisionerFn,
    });

    const lokiDatasource = new cdk.CustomResource(this, "LokiDatasource", {
      serviceToken: dsProvider.serviceToken,
      properties: {
        WorkspaceId: workspace.attrId,
        GrafanaEndpoint: workspace.attrEndpoint,
        LokiServiceTag: lokiServiceTag,
      },
    });
    lokiDatasource.node.addDependency(lokiLb);

    cdk.Tags.of(this).add("environment", commonTags.environment);
    cdk.Tags.of(this).add("project", commonTags.project);
    cdk.Tags.of(this).add("managedBy", commonTags.managedBy);

    new cdk.CfnOutput(this, "VpcId", { value: vpc.vpcId });
    new cdk.CfnOutput(this, "EksClusterName", { value: cluster.clusterName });
    new cdk.CfnOutput(this, "EksClusterEndpoint", { value: cluster.clusterEndpoint });
    new cdk.CfnOutput(this, "ManagedGrafanaWorkspaceId", { value: workspace.attrId });
    new cdk.CfnOutput(this, "ManagedGrafanaEndpoint", { value: workspace.attrEndpoint });
    new cdk.CfnOutput(this, "LokiDatasourceUrl", { value: lokiDatasource.getAttString("LokiUrl") });
  }
}
