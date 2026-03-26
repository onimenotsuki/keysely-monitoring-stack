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
exports.createAksNetwork = createAksNetwork;
const network = __importStar(require("@pulumi/azure-native/network"));
function createAksNetwork(namePrefix, resourceGroupName, location, tags) {
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
//# sourceMappingURL=network.js.map