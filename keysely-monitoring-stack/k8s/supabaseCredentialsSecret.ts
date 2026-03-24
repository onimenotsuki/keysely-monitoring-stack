import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

/**
 * Optional Secret used by operators when wiring Grafana / exporters to Supabase.
 * Set config keys with `pulumi config set --secret` (see docs/supabase-grafana.md).
 */
export function createSupabaseDbSecret(
  provider: k8s.Provider,
  namespace: pulumi.Input<string>,
  cfg: pulumi.Config,
): k8s.core.v1.Secret | undefined {
  const host = cfg.get("supabaseDbHost") ?? cfg.getSecret("supabaseDbHost");
  if (!host) {
    return undefined;
  }

  const user = cfg.requireSecret("supabaseDbUser");
  const password = cfg.requireSecret("supabaseDbPassword");
  const database = cfg.get("supabaseDbName") ?? "postgres";
  const sslMode = cfg.get("supabaseDbSslMode") ?? "require";

  return new k8s.core.v1.Secret(
    "supabase-db-credentials",
    {
      metadata: {
        name: "supabase-db-credentials",
        namespace,
        labels: {
          "app.kubernetes.io/name": "supabase-db-credentials",
          "keysely.dev/component": "observability",
        },
      },
      type: "Opaque",
      stringData: {
        DB_HOST: host,
        DB_USER: user,
        DB_PASSWORD: password,
        DB_NAME: database,
        DB_SSLMODE: sslMode,
      },
    },
    { provider },
  );
}
