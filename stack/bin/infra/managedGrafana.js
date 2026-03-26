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
exports.createManagedGrafana = createManagedGrafana;
const dashboard = __importStar(require("@pulumi/azure-native/dashboard"));
/**
 * Azure Managed Grafana workspace (arm: Microsoft.Dashboard/grafana).
 * Add datasources for in-cluster Prometheus / Loki in the Grafana UI or via API after deploy.
 */
function createManagedGrafana(inputs) {
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
//# sourceMappingURL=managedGrafana.js.map