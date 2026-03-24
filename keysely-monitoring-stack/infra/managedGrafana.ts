import * as pulumi from "@pulumi/pulumi";
import * as dashboard from "@pulumi/azure-native/dashboard";

export interface ManagedGrafanaInputs {
  readonly namePrefix: string;
  readonly resourceGroupName: pulumi.Input<string>;
  readonly location: pulumi.Input<string>;
  readonly tags: pulumi.Input<{ [key: string]: string }>;
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
export function createManagedGrafana(inputs: ManagedGrafanaInputs): ManagedGrafanaResult {
  const workspaceName = `${inputs.namePrefix}-amg`;

  const grafana = new dashboard.Grafana("managed-grafana", {
    resourceGroupName: inputs.resourceGroupName,
    workspaceName,
    location: inputs.location,
    sku: { name: "Standard" },
    identity: { type: "SystemAssigned" },
    properties: {
      apiKey: "Enabled",
      deterministicOutboundIP: "Disabled",
      publicNetworkAccess: "Enabled",
      zoneRedundancy: "Disabled",
    },
    tags: inputs.tags,
  });

  const endpoint = grafana.properties.apply((p) => {
    const url = p?.endpoint;
    return url ?? "";
  });

  return { grafana, name: grafana.name, endpoint };
}
