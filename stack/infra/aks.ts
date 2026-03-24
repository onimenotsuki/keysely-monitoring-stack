import * as pulumi from "@pulumi/pulumi";
import * as containerservice from "@pulumi/azure-native/containerservice";

export interface AksInputs {
  readonly namePrefix: string;
  readonly resourceGroupName: pulumi.Input<string>;
  readonly location: pulumi.Input<string>;
  readonly subnetId: pulumi.Input<string>;
  readonly dnsPrefix: pulumi.Input<string>;
  readonly nodeCount: number;
  readonly vmSize: string;
  readonly tags: pulumi.Input<{ [key: string]: string }>;
}

export interface AksResult {
  readonly cluster: containerservice.ManagedCluster;
  readonly name: pulumi.Output<string>;
  readonly fqdn: pulumi.Output<string>;
  readonly kubeConfigRaw: pulumi.Output<string>;
}

export function createAks(inputs: AksInputs): AksResult {
  const clusterName = `${inputs.namePrefix}-aks`;

  const cluster = new containerservice.ManagedCluster(clusterName, {
    resourceGroupName: inputs.resourceGroupName,
    resourceName: clusterName,
    location: inputs.location,
    dnsPrefix: inputs.dnsPrefix,
    enableRBAC: true,
    identity: {
      type: "SystemAssigned",
    },
    networkProfile: {
      networkPlugin: "azure",
      networkPluginMode: "overlay",
      networkDataplane: "azure",
      outboundType: "loadBalancer",
      loadBalancerSku: "standard",
      serviceCidr: "172.16.0.0/16",
      dnsServiceIP: "172.16.0.10",
      podCidrs: ["192.168.0.0/16"],
    },
    agentPoolProfiles: [
      {
        name: "system",
        count: inputs.nodeCount,
        vmSize: inputs.vmSize,
        mode: "System",
        osType: "Linux",
        type: "VirtualMachineScaleSets",
        vnetSubnetID: inputs.subnetId,
      },
    ],
    tags: inputs.tags,
  });

  const kubeConfigRaw = containerservice.listManagedClusterUserCredentialsOutput({
    resourceGroupName: inputs.resourceGroupName,
    resourceName: cluster.name,
  }).kubeconfigs[0].value.apply((enc) => Buffer.from(enc, "base64").toString("utf-8"));

  return {
    cluster,
    name: cluster.name,
    fqdn: cluster.fqdn,
    kubeConfigRaw,
  };
}
