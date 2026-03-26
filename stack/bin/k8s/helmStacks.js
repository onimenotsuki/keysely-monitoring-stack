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
exports.deployObservabilityHelm = deployObservabilityHelm;
const k8s = __importStar(require("@pulumi/kubernetes"));
/**
 * In-cluster LGTM components targeting Azure Managed Grafana as the UI:
 * - Prometheus + operator (Grafana UI disabled on chart; use AMG)
 * - Loki single-binary
 * - OpenTelemetry Collector (defaults: OTLP in, exporters per chart defaults — extend for Prometheus remote_write / Loki push)
 */
function deployObservabilityHelm(kubeConfig, namespace) {
    const provider = new k8s.Provider("k8s-provider", {
        kubeconfig: kubeConfig,
        deleteUnreachable: true,
    });
    const prometheusStack = new k8s.helm.v3.Release("kube-prometheus-stack", {
        chart: "kube-prometheus-stack",
        version: "61.0.0",
        namespace,
        createNamespace: true,
        repositoryOpts: {
            repo: "https://prometheus-community.github.io/helm-charts",
        },
        values: {
            grafana: { enabled: false },
            prometheus: {
                prometheusSpec: {
                    retention: "15d",
                    serviceMonitorSelectorNilUsesHelmValues: false,
                    podMonitorSelectorNilUsesHelmValues: false,
                },
            },
            alertmanager: { enabled: true },
            kubeStateMetrics: { enabled: true },
            nodeExporter: { enabled: true },
        },
        timeout: 1200,
    }, { provider, customTimeouts: { create: "25m", update: "25m" } });
    const loki = new k8s.helm.v3.Release("loki", {
        chart: "loki",
        version: "6.6.2",
        namespace,
        repositoryOpts: {
            repo: "https://grafana.github.io/helm-charts",
        },
        values: {
            deploymentMode: "SingleBinary",
            loki: {
                commonConfig: {
                    replication_factor: 1,
                },
                storage: {
                    type: "filesystem",
                },
                auth_enabled: false,
            },
            singleBinary: {
                replicas: 1,
                persistence: {
                    enabled: true,
                    size: "10Gi",
                },
            },
            chunksCache: { enabled: false },
            resultsCache: { enabled: false },
            gateway: { enabled: false },
        },
        timeout: 900,
    }, { provider, dependsOn: [prometheusStack], customTimeouts: { create: "20m", update: "20m" } });
    const otelCollector = new k8s.helm.v3.Release("otel-collector", {
        chart: "opentelemetry-collector",
        version: "0.97.1",
        namespace,
        repositoryOpts: {
            repo: "https://open-telemetry.github.io/opentelemetry-helm-charts",
        },
        values: {
            mode: "deployment",
            replicaCount: 1,
        },
        timeout: 600,
    }, { provider, dependsOn: [loki], customTimeouts: { create: "15m", update: "15m" } });
    return { provider, prometheusStack, loki, otelCollector };
}
//# sourceMappingURL=helmStacks.js.map