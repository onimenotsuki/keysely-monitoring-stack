# Keysely

Monorepo for Keysely. Infrastructure and observability live under [`stack/`](./stack/).

## Observability stack (`stack/`)

Infrastructure as Code for **observability on Microsoft Azure** (**KEY-99**): [Pulumi](https://www.pulumi.com/) (TypeScript), **Azure Managed Grafana**, **AKS**, and in-cluster **Prometheus**, **Loki**, and **OpenTelemetry Collector** (Helm). Optional **Supabase (PostgreSQL)** integration for Grafana datasources is documented in the stack docs.

| Layer | Technologies |
|-------|----------------|
| IaC | Pulumi 3.x, Node.js 20+, TypeScript 5 |
| Azure | Resource group, VNet, AKS (Azure CNI overlay), Azure Managed Grafana |
| Kubernetes / Helm | `kube-prometheus-stack` (in-cluster Grafana disabled), `grafana/loki`, `open-telemetry/opentelemetry-collector` |
| Packages | `@pulumi/pulumi`, `@pulumi/azure-native`, `@pulumi/kubernetes`, `@pulumi/random` |

**Project name (Pulumi):** `keysely-monitoring-stack`

## Repository layout

| Path | Purpose |
|------|---------|
| [`stack/`](./stack/) | Pulumi program: `infra/`, `k8s/`, `Pulumi.*.yaml`, `package.json` |
| [`.github/workflows/pulumi.yml`](./.github/workflows/pulumi.yml) | CI: PR → `pulumi preview` on `dev`; push to `main` → `pulumi up` on `prod` |

Full architecture, prerequisites, local setup, configuration keys, and GitHub secrets are in [**stack/README.md**](./stack/README.md).

## Quick start (local)

```bash
cd stack
npm install
pulumi login
pulumi stack select dev   # or stack init dev once
az login
pulumi up
```

## License

Proprietary — Keysely (unless otherwise stated by the organization).
