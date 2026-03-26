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
export declare function createAksNetwork(namePrefix: string, resourceGroupName: pulumi.Input<string>, location: pulumi.Input<string>, tags: pulumi.Input<{
    [key: string]: string;
}>): NetworkResult;
