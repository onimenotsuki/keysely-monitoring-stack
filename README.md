# Keysely

Monorepo for Keysely. Infrastructure and observability live under [`stack/`](./stack/).

## Observability stack (`stack/`)

Infrastructure as Code for **observability on AWS** (**KEY-99**) using **AWS CDK + TypeScript** with **EKS**, **Amazon Managed Grafana**, and in-cluster **Prometheus**, **Loki**, and **OpenTelemetry Collector** (Helm).

- IaC: AWS CDK v2, Node.js 22+, TypeScript 5
- AWS: VPC, EKS, Amazon Managed Grafana
- Kubernetes / Helm: `kube-prometheus-stack` (in-cluster Grafana disabled), `grafana/loki`, `open-telemetry/opentelemetry-collector`
- Packages: `aws-cdk-lib`, `constructs`

**CDK app:** `stack/bin/keysely-monitoring-stack.ts`

## Repository layout

- [`stack/`](./stack/): CDK app (`bin/`, `lib/`, `cdk.json`, `package.json`)
- [`.github/workflows/cdk.yml`](./.github/workflows/cdk.yml): CI with `cdk diff` on PR and `cdk deploy` on `main`

Full architecture, prerequisites, local setup, configuration keys, and GitHub secrets are in [**stack/README.md**](./stack/README.md).

## Quick start (local)

```bash
cd stack
npm install
aws sso login
npm run synth
npm run deploy:dev
```

## License

Proprietary — Keysely (unless otherwise stated by the organization).
