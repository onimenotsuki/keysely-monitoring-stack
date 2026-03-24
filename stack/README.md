# keysely-monitoring-stack

Infrastructure as Code for Keysely **observability** on Microsoft Azure (**KEY-99**): [Pulumi](https://www.pulumi.com/) (TypeScript), **Azure Managed Grafana**, **AKS**, and in-cluster **Prometheus**, **Loki**, and **OpenTelemetry Collector** (Helm). Optional integration with **Supabase (PostgreSQL)** is documented for Grafana datasources.

## Architecture

- **Azure Resource Group** — all resources for the stack.
- **Virtual network + subnet** — AKS with **Azure CNI Overlay**.
- **AKS** — workload cluster for metrics, logs, and collectors.
- **Azure Managed Grafana** — primary UI; in-cluster Grafana from `kube-prometheus-stack` is **disabled**.
- **Helm** ([`k8s/helmStacks.ts`](./k8s/helmStacks.ts)):
  - `prometheus-community/kube-prometheus-stack` (Grafana disabled)
  - `grafana/loki` (single binary)
  - `open-telemetry/opentelemetry-collector`

Wire **Managed Grafana** datasources to Prometheus and Loki using the cluster ingress or private endpoints as your network model evolves (see [docs/internal-wiki-template.md](./docs/internal-wiki-template.md)).

## Prerequisites

- **Node.js** 20+
- **Pulumi CLI** 3.x and a [Pulumi Cloud](https://app.pulumi.com) account (or self-hosted backend)
- **Azure CLI** (`az`) for human login, or OIDC in CI
- **kubectl** (optional, for debugging)
- **helm** (optional; Pulumi installs charts)

## Platform setup (portals)

Configure cloud accounts using the step-by-step guides:

| Guide | Description |
|-------|-------------|
| [docs/guides/azure-portal-setup.md](./docs/guides/azure-portal-setup.md) | Subscription, resource providers, Entra app + federated credentials for GitHub OIDC, IAM, quotas, cost alerts |
| [docs/guides/pulumi-cloud-setup.md](./docs/guides/pulumi-cloud-setup.md) | Organization, stacks `dev` / `prod`, tokens for CI, audit |

Onboarding note for your **internal wiki**: link these guides and copy [docs/internal-wiki-template.md](./docs/internal-wiki-template.md).

## Repository layout

| Path | Purpose |
|------|---------|
| [`index.ts`](./index.ts) | Program entry |
| [`infra/`](./infra/) | Resource group, network, AKS, Managed Grafana |
| [`k8s/`](./k8s/) | Helm releases, optional Supabase `Secret` |
| [`Pulumi.dev.yaml`](./Pulumi.dev.yaml) / [`Pulumi.prod.yaml`](./Pulumi.prod.yaml) | Stack defaults |
| [`../.github/workflows/pulumi.yml`](../.github/workflows/pulumi.yml) | `preview` on PRs, `up` on `main` for `prod` |

## Local setup

```bash
npm install
pulumi login
pulumi stack init dev   # once
pulumi stack select dev
az login
pulumi config set azure-native:subscriptionId "<subscription-id>"   # if not using ARM_* env
pulumi up
```

### Configuration

Stack keys (project `keysely-monitoring-stack`):

- `baseName` — name prefix for Azure resources
- `environment` — tag value (`dev` / `prod`)
- `aksNodeCount`, `aksVmSize`, `monitoringNamespace`
- `azure-native:location` — Azure region

Supabase-related **secrets**: see [docs/supabase-grafana.md](./docs/supabase-grafana.md).

## CI/CD (GitHub Actions)

Workflow: [`../.github/workflows/pulumi.yml`](../.github/workflows/pulumi.yml).

| Event | Behavior |
|--------|----------|
| Pull request → `main` | `pulumi preview` on stack **`dev`** |
| Push → `main` | `pulumi up` on stack **`prod`** (GitHub Environment **`production`**) |
| `workflow_dispatch` | Manual `pulumi up` on chosen stack |

### Required GitHub secrets

| Secret | Purpose |
|--------|---------|
| `PULUMI_ACCESS_TOKEN` | Pulumi Cloud (or service) API token |
| `AZURE_CLIENT_ID` | Entra application (client) ID |
| `AZURE_TENANT_ID` | Entra directory (tenant) ID |
| `AZURE_SUBSCRIPTION_ID` | Target subscription |

Configure **GitHub Environments** `production` (and optionally `development`) with required reviewers before `prod` applies.

Federated credentials for OIDC are documented in [docs/guides/azure-portal-setup.md](./docs/guides/azure-portal-setup.md).

## Supabase and Grafana

See [docs/supabase-grafana.md](./docs/supabase-grafana.md) for Pulumi secrets, datasource checklist, and scope of telemetry.

## Post-deploy validation (Grafana Assistant CLI)

Read-only checks against Managed Grafana ([skill: grafana-assistant CLI](https://github.com/grafana/assistant-cli)):

1. Install `grafana-assistant` and add a **Grafana service account token** with Assistant permission.
2. `grafana-assistant config set-instance keysely-amg --url https://<amw-endpoint> -t '<token>'`
3. `grafana-assistant prompt "List configured data sources" --json`

Do not rely on the CLI to **mutate** dashboards or alerts; use the Grafana UI or supported automation.

## Private GitHub repository

Create a **private** repository (GitHub UI or `gh repo create keysely-monitoring-stack --private --source . --push`) if this directory is not already attached to one remote.

## License

Proprietary — Keysely (unless otherwise stated by the organization).
