import * as pulumi from "@pulumi/pulumi";
import * as network from "@pulumi/azure-native/network";

/**
 * VNet + subnet for AKS with delegation required for Azure CNI + overlay.
 */
export interface NetworkResult {
  readonly vnet: network.VirtualNetwork;
  readonly subnet: network.Subnet;
  readonly subnetId: pulumi.Output<string>;
}

export function createAksNetwork(
  namePrefix: string,
  resourceGroupName: pulumi.Input<string>,
  location: pulumi.Input<string>,
  tags: pulumi.Input<{ [key: string]: string }>,
): NetworkResult {
  const vnet = new network.VirtualNetwork(`${namePrefix}-vnet`, {
    resourceGroupName,
    location,
    virtualNetworkName: `${namePrefix}-vnet`,
    addressSpace: {
      addressPrefixes: ["10.240.0.0/16"],
    },
    tags,
  });

  const subnet = new network.Subnet(`${namePrefix}-aks-subnet`, {
    resourceGroupName,
    virtualNetworkName: vnet.name,
    subnetName: `${namePrefix}-aks-subnet`,
    addressPrefix: "10.240.0.0/20",
    delegations: [
      {
        name: "aks-delegation",
        serviceName: "Microsoft.ContainerService/managedClusters",
      },
    ],
  });

  return {
    vnet,
    subnet,
    subnetId: subnet.id,
  };
}
