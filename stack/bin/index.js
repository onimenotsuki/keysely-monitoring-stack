"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.environmentName = exports.monitoringKubernetesNamespace = exports.managedGrafanaEndpoint = exports.managedGrafanaName = exports.aksApiFqdn = exports.aksClusterName = exports.aksSubnetName = exports.vnetName = exports.resourceGroupName = void 0;
const pulumi = __importStar(require("@pulumi/pulumi"));
const random = __importStar(require("@pulumi/random"));
const resourceGroup_1 = require("./infra/resourceGroup");
const network_1 = require("./infra/network");
const aks_1 = require("./infra/aks");
const managedGrafana_1 = require("./infra/managedGrafana");
const helmStacks_1 = require("./k8s/helmStacks");
const supabaseCredentialsSecret_1 = require("./k8s/supabaseCredentialsSecret");
const cfg = new pulumi.Config();
const baseName = cfg.require("baseName");
const environment = cfg.require("environment");
const monitoringNs = cfg.get("monitoringNamespace") ?? "monitoring";
const nodeCount = cfg.getNumber("aksNodeCount") ?? 2;
const vmSize = cfg.get("aksVmSize") ?? "Standard_D2s_v5";
const azureLocation = new pulumi.Config("azure-native").require("location");
const tags = {
    environment,
    project: "keysely-monitoring-stack",
    managedBy: "pulumi",
};
const rg = (0, resourceGroup_1.createResourceGroup)(`${baseName}-rg`, azureLocation, tags);
const network = (0, network_1.createAksNetwork)(baseName, rg.name, rg.location, tags);
const dnsEntropy = new random.RandomString("aks-dns-entropy", {
    length: 8,
    lower: true,
    upper: false,
    numeric: true,
    special: false,
});
const dnsPrefix = pulumi.interpolate `${baseName}-${dnsEntropy.result}`.apply((s) => s.toLowerCase().replaceAll(/[^a-z0-9]/g, "").slice(0, 54));
const aks = (0, aks_1.createAks)({
    namePrefix: baseName,
    resourceGroupName: rg.name,
    location: rg.location,
    subnetId: network.subnetId,
    dnsPrefix,
    nodeCount,
    vmSize,
    tags,
});
const managedGrafana = (0, managedGrafana_1.createManagedGrafana)({
    namePrefix: baseName,
    resourceGroupName: rg.name,
    location: rg.location,
    tags,
});
const observability = (0, helmStacks_1.deployObservabilityHelm)(aks.kubeConfigRaw, monitoringNs);
(0, supabaseCredentialsSecret_1.createSupabaseDbSecret)(observability.provider, monitoringNs, cfg);
exports.resourceGroupName = rg.name;
exports.vnetName = network.vnet.name;
exports.aksSubnetName = network.subnet.name;
exports.aksClusterName = aks.name;
exports.aksApiFqdn = aks.fqdn;
exports.managedGrafanaName = managedGrafana.name;
exports.managedGrafanaEndpoint = managedGrafana.endpoint;
exports.monitoringKubernetesNamespace = monitoringNs;
exports.environmentName = environment;
//# sourceMappingURL=index.js.map