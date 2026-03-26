# Grafana and Supabase (PostgreSQL) integration

This stack provisions **Amazon Managed Grafana**. Supabase exposes a managed **PostgreSQL** endpoint you can add as a Grafana datasource for SQL exploration and selected internal metrics (via queries), not as a replacement for Postgres-native exporters unless you run them.

## Security guidelines

- Prefer a **read-only** database role for Grafana exploration.
- Always use **SSL** (`sslmode=require` or stricter).
- Store credentials only in your secret manager and GitHub environment secrets — never in Git.
- Restrict network access (Supabase IP allowlist / VPC) to Grafana egress IPs or private connectivity as your architecture matures.

## Credential handling

This repository does not persist Supabase credentials in IaC code. Configure the Managed Grafana **PostgreSQL** datasource directly in the Grafana UI (or external automation) using secure secrets handling.

## Grafana datasource (UI checklist)

1. In Amazon Managed Grafana, open **Connections → Data sources → Add new → PostgreSQL**.
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
