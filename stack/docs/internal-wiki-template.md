# Internal wiki template — Keysely observability (KEY-99)

Copy this page to your internal wiki. **Do not** store production passwords in the wiki; reference secret names and rotation owners only.

## Ownership

| Area | Owner / team | Rotation cadence |
|------|----------------|------------------|
| Azure subscription & SP / OIDC | | |
| Pulumi Cloud org & tokens | | |
| GitHub Actions secrets | | |
| Managed Grafana admins | | |
| Supabase project & DB roles | | |

## Pulumi stacks

| Stack | Azure subscription | Resource group (output) | purpose |
|-------|--------------------|-------------------------|---------|
| `dev` | | | Non-production |
| `prod` | | | Production |

## GitHub Actions secrets

| Secret | Used by | Notes |
|--------|---------|-------|
| `PULUMI_ACCESS_TOKEN` | Pulumi | Org or personal token with stack access |
| `AZURE_CLIENT_ID` | azure/login | App registration client ID |
| `AZURE_TENANT_ID` | azure/login | Directory (tenant) ID |
| `AZURE_SUBSCRIPTION_ID` | azure/login | Target subscription |

Environments:

- `production`: required for `pulumi up` on `prod` from `main` (configure approvers in GitHub).
- `development`: optional gate for manual `dev` runs.

## Grafana ↔ in-cluster LGTM

Document ingress URLs or private endpoints after first deploy.

| Datasource | Endpoint | Auth | Notes |
|------------|----------|------|-------|
| Prometheus | | | From `kube-prometheus-stack` Service |
| Loki | | | Single-binary Loki |
| OpenTelemetry | | | Collector OTLP gRPC/HTTP |

## Grafana ↔ Supabase (PostgreSQL)

| Field | Value / reference | Notes |
|-------|-------------------|-------|
| Datasource name | | e.g. `supabase-prod` |
| Host | | Supabase DB host |
| Database | | Usually `postgres` |
| User | | Read-only recommended |
| Password | `Secret: ...` | Pulumi / vault reference only in wiki |
| SSL | | Required |
| Max open connections / query timeout | | Tune to avoid starving pooler |

## Endpoints and access policy

- **Public ingress** (MVP): document stable DNS / TLS and IP allowlists.
- **Private Link** (hardening): document AMG private endpoints and AKS integration.

## Links

- Repository README (setup & operations).
- [Azure portal setup guide](./guides/azure-portal-setup.md).
- [Pulumi Cloud setup guide](./guides/pulumi-cloud-setup.md).
- [Supabase ↔ Grafana](./supabase-grafana.md).
