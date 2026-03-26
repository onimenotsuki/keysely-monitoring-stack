import * as cdk from "aws-cdk-lib";
import { aws_ec2 as ec2, aws_eks as eks, aws_grafana as grafana } from "aws-cdk-lib";
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

    const workspace = new grafana.CfnWorkspace(this, "ManagedGrafana", {
      name: `${props.baseName}-amg`,
      accountAccessType: "CURRENT_ACCOUNT",
      authenticationProviders: ["AWS_SSO"],
      permissionType: "SERVICE_MANAGED",
      dataSources: ["PROMETHEUS", "LOKI"],
    });

    cdk.Tags.of(this).add("environment", commonTags.environment);
    cdk.Tags.of(this).add("project", commonTags.project);
    cdk.Tags.of(this).add("managedBy", commonTags.managedBy);

    new cdk.CfnOutput(this, "VpcId", { value: vpc.vpcId });
    new cdk.CfnOutput(this, "EksClusterName", { value: cluster.clusterName });
    new cdk.CfnOutput(this, "EksClusterEndpoint", { value: cluster.clusterEndpoint });
    new cdk.CfnOutput(this, "ManagedGrafanaWorkspaceId", { value: workspace.attrId });
    new cdk.CfnOutput(this, "ManagedGrafanaEndpoint", { value: workspace.attrEndpoint });
  }
}
