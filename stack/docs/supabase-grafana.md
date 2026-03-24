# Grafana and Supabase (PostgreSQL) integration

This stack provisions **Azure Managed Grafana** and optional Kubernetes secrets for database credentials. Supabase exposes a managed **PostgreSQL** endpoint you can add as a Grafana datasource for SQL exploration and selected internal metrics (via queries), not as a replacement for Postgres-native exporters unless you run them.

## Security guidelines

- Prefer a **read-only** database role for Grafana exploration.
- Always use **SSL** (`sslmode=require` or stricter).
- Store credentials only in **Pulumi secrets**, **Pulumi Cloud**, or your secret manager — never in Git.
- Restrict network access (Supabase IP allowlist / VPC) to Grafana egress IPs or private connectivity as your architecture matures.

## Pulumi configuration keys

Optional keys under project `keysely-monitoring-stack`. When `supabaseDbHost` is set, the program creates a Kubernetes `Secret` named `supabase-db-credentials` in the monitoring namespace.

| Key | Secret? | Description |
|-----|---------|-------------|
| `supabaseDbHost` | optional | Database host (e.g. `db.<project-ref>.supabase.co`) |
| `supabaseDbUser` | yes | PostgreSQL user (read-only recommended) |
| `supabaseDbPassword` | yes | Password for the user |
| `supabaseDbName` | no | Database name (default `postgres`) |
| `supabaseDbSslMode` | no | SSL mode (default `require`) |

### Example (local CLI)

```bash
pulumi stack select dev

pulumi config set --secret keysely-monitoring-stack:supabaseDbHost "db.<project-ref>.supabase.co"
pulumi config set --secret keysely-monitoring-stack:supabaseDbUser "grafana_reader"
pulumi config set --secret keysely-monitoring-stack:supabaseDbPassword "<password>"
pulumi config set keysely-monitoring-stack:supabaseDbName "postgres"
pulumi config set keysely-monitoring-stack:supabaseDbSslMode "require"
```

After deploy, the cluster holds the credentials in `monitoring/supabase-db-credentials`. Configure the Managed Grafana **PostgreSQL** datasource in the Grafana UI (or automation outside this repo) using the same values; **do not** commit datasource JSON with passwords.

## Grafana datasource (UI checklist)

1. In Azure Managed Grafana, open **Connections → Data sources → Add new → PostgreSQL**.
2. **Host** / **URL**: Supabase pooler or direct host per Supabase docs.
3. **Database**: matches `supabaseDbName`.
4. **User** / **Password**: read-only role.
5. **TLS/SSL mode**: enable TLS; mode per your security policy.
6. **Save & test** — fix firewall allowlisting if the test fails.

## Telemetry scope (what this does *not* cover by default)

- Supabase **provider-side** logs and metrics may require Supabase dashboards, exports, or additional agents.
- This repository focuses on **Keysely application** metrics (Prometheus), logs (Loki), traces (OpenTelemetry), and optional **SQL access** to Postgres for DB health queries.

## Internal wiki

Copy the variable matrix from [internal-wiki-template.md](./internal-wiki-template.md) into your company wiki and keep Grafana–Supabase handshake fields updated.
