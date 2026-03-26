import * as pulumi from "@pulumi/pulumi";
import * as dashboard from "@pulumi/azure-native/dashboard";
export interface ManagedGrafanaInputs {
    readonly namePrefix: string;
    readonly resourceGroupName: pulumi.Input<string>;
    readonly location: pulumi.Input<string>;
    readonly tags: pulumi.Input<{
        [key: string]: string;
    }>;
}
export interface ManagedGrafanaResult {
    readonly grafana: dashboard.Grafana;
    readonly name: pulumi.Output<string>;
    readonly endpoint: pulumi.Output<string>;
}
/**
 * Azure Managed Grafana workspace (arm: Microsoft.Dashboard/grafana).
 * Add datasources for in-cluster Prometheus / Loki in the Grafana UI or via API after deploy.
 */
export declare function createManagedGrafana(inputs: ManagedGrafanaInputs): ManagedGrafanaResult;
