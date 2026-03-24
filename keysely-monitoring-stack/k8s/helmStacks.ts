import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export interface ObservabilityHelmResult {
  readonly provider: k8s.Provider;
  readonly prometheusStack: k8s.helm.v3.Release;
  readonly loki: k8s.helm.v3.Release;
  readonly otelCollector: k8s.helm.v3.Release;
}

/**
 * In-cluster LGTM components targeting Azure Managed Grafana as the UI:
 * - Prometheus + operator (Grafana UI disabled on chart; use AMG)
 * - Loki single-binary
 * - OpenTelemetry Collector (defaults: OTLP in, exporters per chart defaults — extend for Prometheus remote_write / Loki push)
 */
export function deployObservabilityHelm(
  kubeConfig: pulumi.Input<string>,
  namespace: string,
): ObservabilityHelmResult {
  const provider = new k8s.Provider("k8s-provider", {
    kubeconfig: kubeConfig,
    deleteUnreachable: true,
  });

  const prometheusStack = new k8s.helm.v3.Release(
    "kube-prometheus-stack",
    {
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
    },
    { provider, customTimeouts: { create: "25m", update: "25m" } },
  );

  const loki = new k8s.helm.v3.Release(
    "loki",
    {
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
    },
    { provider, dependsOn: [prometheusStack], customTimeouts: { create: "20m", update: "20m" } },
  );

  const otelCollector = new k8s.helm.v3.Release(
    "otel-collector",
    {
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
    },
    { provider, dependsOn: [loki], customTimeouts: { create: "15m", update: "15m" } },
  );

  return { provider, prometheusStack, loki, otelCollector };
}
