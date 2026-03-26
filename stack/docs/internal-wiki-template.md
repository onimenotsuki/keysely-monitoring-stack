# Internal wiki template — Keysely observability (KEY-99)

Copy this page to your internal wiki. **Do not** store production passwords in the wiki; reference secret names and rotation owners only.

## Ownership

- AWS account / OIDC role:
- AWS CDK deployment ownership:
- GitHub Actions secrets:
- Managed Grafana admins:
- Supabase project and DB roles:

## CDK stacks

- `KeyselyMonitoringStack-dev`: non-production
- `KeyselyMonitoringStack-prod`: production

## GitHub Actions secrets

- `AWS_ROLE_ARN`: used by `aws-actions/configure-aws-credentials` to assume IAM role through GitHub OIDC

Environments:

- `production`: required for `cdk deploy` on `prod` from `main` (configure approvers in GitHub).
- `development`: optional gate for manual `dev` runs.

## Grafana ↔ in-cluster LGTM

Document ingress URLs or private endpoints after first deploy.

- Prometheus endpoint and auth details (source: `kube-prometheus-stack` service)
- Loki endpoint and auth details (single-binary Loki)
- OpenTelemetry collector endpoint and auth details (OTLP gRPC/HTTP)

## Grafana ↔ Supabase (PostgreSQL)

- Datasource name (example: `supabase-prod`)
- Host (Supabase DB host)
- Database (usually `postgres`)
- User (read-only recommended)
- Password (`Secret: ...`; store secret manager reference only)
- SSL mode (required)
- Max open connections and query timeout (tune to avoid starving pooler)

## Endpoints and access policy

- **Public ingress** (MVP): document stable DNS / TLS and IP allowlists.
- **Private access** (hardening): document AMG private endpoints and EKS integration.

## Links

- Repository README (setup & operations).
- [Supabase ↔ Grafana](./supabase-grafana.md).
