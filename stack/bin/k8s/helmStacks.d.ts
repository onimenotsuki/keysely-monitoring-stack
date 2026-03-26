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
export declare function deployObservabilityHelm(kubeConfig: pulumi.Input<string>, namespace: string): ObservabilityHelmResult;
