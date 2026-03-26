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
    readonly tags: pulumi.Input<{
        [key: string]: string;
    }>;
}
export interface AksResult {
    readonly cluster: containerservice.ManagedCluster;
    readonly name: pulumi.Output<string>;
    readonly fqdn: pulumi.Output<string>;
    readonly kubeConfigRaw: pulumi.Output<string>;
}
export declare function createAks(inputs: AksInputs): AksResult;
