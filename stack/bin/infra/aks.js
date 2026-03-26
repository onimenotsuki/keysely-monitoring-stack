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
exports.createAks = createAks;
const containerservice = __importStar(require("@pulumi/azure-native/containerservice"));
function createAks(inputs) {
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
//# sourceMappingURL=aks.js.map