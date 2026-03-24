import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";
import { createResourceGroup } from "./infra/resourceGroup";
import { createAksNetwork } from "./infra/network";
import { createAks } from "./infra/aks";
import { createManagedGrafana } from "./infra/managedGrafana";
import { deployObservabilityHelm } from "./k8s/helmStacks";
import { createSupabaseDbSecret } from "./k8s/supabaseCredentialsSecret";

const cfg = new pulumi.Config();
const baseName = cfg.require("baseName");
const environment = cfg.require("environment");
const monitoringNs = cfg.get("monitoringNamespace") ?? "monitoring";
const nodeCount = cfg.getNumber("aksNodeCount") ?? 2;
const vmSize = cfg.get("aksVmSize") ?? "Standard_D2s_v5";

const azureLocation = new pulumi.Config("azure-native").require("location");

const tags: { [key: string]: string } = {
  environment,
  project: "keysely-monitoring-stack",
  managedBy: "pulumi",
};

const rg = createResourceGroup(`${baseName}-rg`, azureLocation, tags);

const network = createAksNetwork(baseName, rg.name, rg.location, tags);

const dnsEntropy = new random.RandomString("aks-dns-entropy", {
  length: 8,
  lower: true,
  upper: false,
  numeric: true,
  special: false,
});

const dnsPrefix = pulumi.interpolate`${baseName}-${dnsEntropy.result}`.apply((s) =>
  s.toLowerCase().replaceAll(/[^a-z0-9]/g, "").slice(0, 54),
);

const aks = createAks({
  namePrefix: baseName,
  resourceGroupName: rg.name,
  location: rg.location,
  subnetId: network.subnetId,
  dnsPrefix,
  nodeCount,
  vmSize,
  tags,
});

const managedGrafana = createManagedGrafana({
  namePrefix: baseName,
  resourceGroupName: rg.name,
  location: rg.location,
  tags,
});

const observability = deployObservabilityHelm(aks.kubeConfigRaw, monitoringNs);
createSupabaseDbSecret(observability.provider, monitoringNs, cfg);

export const resourceGroupName = rg.name;
export const vnetName = network.vnet.name;
export const aksSubnetName = network.subnet.name;
export const aksClusterName = aks.name;
export const aksApiFqdn = aks.fqdn;
export const managedGrafanaName = managedGrafana.name;
export const managedGrafanaEndpoint = managedGrafana.endpoint;
export const monitoringKubernetesNamespace = monitoringNs;
export const environmentName = environment;
