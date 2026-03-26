import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
/**
 * Optional Secret used by operators when wiring Grafana / exporters to Supabase.
 * Set config keys with `pulumi config set --secret` (see docs/supabase-grafana.md).
 */
export declare function createSupabaseDbSecret(provider: k8s.Provider, namespace: pulumi.Input<string>, cfg: pulumi.Config): k8s.core.v1.Secret | undefined;
