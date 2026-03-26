# keysely-monitoring-stack

Infrastructure as Code for Keysely observability on AWS using AWS CDK (TypeScript): EKS, Amazon Managed Grafana, and in-cluster Prometheus/Loki/OpenTelemetry Collector.

## Architecture

- VPC with public/private subnets for cluster networking.
- EKS cluster with managed node group.
- Amazon Managed Grafana as the main visualization layer.
- Helm charts deployed from CDK:
  - `kube-prometheus-stack` (Grafana disabled)
  - `grafana/loki` (single binary)
  - `open-telemetry/opentelemetry-collector`

## Prerequisites

- Node.js 22+
- AWS CLI configured locally (`aws sso login` or equivalent)
- AWS CDK bootstrap in target account/region

## Repository layout

- `bin/keysely-monitoring-stack.ts`: CDK app entrypoint
- `lib/keysely-monitoring-stack.ts`: Main stack definition
- `cdk.json`: CDK app config
- `../.github/workflows/cdk.yml`: CI workflow with OIDC

## Local usage

```bash
npm install
npm run synth
npm run diff
npm run deploy:dev
```

## CI/CD

Workflow: `../.github/workflows/cdk.yml`.

- Pull requests run `cdk diff` on `KeyselyMonitoringStack-dev`
- Push to `main` runs `cdk deploy` on `KeyselyMonitoringStack-prod` in GitHub Environment `production`
- Manual dispatch supports `dev` or `prod`

Required GitHub secret per environment:

- `AWS_ROLE_ARN`: IAM Role to assume through GitHub OIDC

Optional GitHub variable per environment:

- `AWS_REGION`: target region (default `eu-west-1`)
