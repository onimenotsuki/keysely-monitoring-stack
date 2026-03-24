# Pulumi Cloud setup

Guide for configuring **Pulumi Cloud** (organization, project, stacks, tokens) for the `keysely-monitoring-stack` repository (KEY-99).

## 1. Organization and access

1. Sign in to [Pulumi Cloud](https://app.pulumi.com).
2. Create or select the **organization** for Keysely (e.g. `keysely`).
3. **Organization settings** → **Members** → invite teammates with roles:
   - **ORG_ADMIN** — billing, members, policies
   - **ORG_MEMBER** — day-to-day stack updates according to team policy

If your org uses **SAML / SSO**, configure it under organization security settings; codify “contact your IdP admin” for provisioning in your internal wiki.

## 2. Project and stacks

This repository’s project name is defined in [`Pulumi.yaml`](../../Pulumi.yaml): `keysely-monitoring-stack`.

### Create stacks

Using the CLI (after `pulumi login`):

```bash
cd /path/to/keysely-monitoring-stack
pulumi stack init dev --secrets-provider passphrase   # or cloud default
pulumi stack init prod --secrets-provider passphrase
```

Or create stacks from the Pulumi Cloud UI: **Project** → **Stacks** → **New stack**.

Naming convention used in CI:

- `dev` — pull request previews
- `prod` — production deploys from `main` (see `.github/workflows/pulumi.yml`)

### Stack settings

For each stack in the Pulumi UI:

1. Open **Stack** → **Settings**.
2. Review **Secrets provider** (passphrase, cloud, or cloud backend default).
3. Restrict **who can read/update** stacks in line with your security policy (org defaults vs stack permissions).

## 3. Access tokens for GitHub Actions

1. **Personal access token** (user): Profile (avatar) → **Personal access tokens** → **Create token**.
2. Or **organization access token** (if available on your plan): Organization → **Access tokens**.

**Minimum scope:** token must allow `pulumi preview` and `pulumi up` on stacks in this project (typically full stack access for automation accounts).

### Map to GitHub

| GitHub Actions secret | Value |
|----------------------|--------|
| `PULUMI_ACCESS_TOKEN` | The token string from Pulumi Cloud |

Rotation:

1. Generate a new token in Pulumi Cloud.
2. Update the GitHub secret.
3. Revoke the old token.

## 4. GitHub integration options

Two common patterns:

| Pattern | Description |
|---------|-------------|
| **A. GitHub Actions + CLI only** | This repository uses `pulumi/actions` with `PULUMI_ACCESS_TOKEN`. No Pulumi Deployments app required. |
| **B. Pulumi Deployments / app** | Connect GitHub via the Pulumi GitHub app for hosted runners, PR comments, etc. Optional; if enabled, align branch protection and app permissions with your org policy. |

This repo currently follows **pattern A**. Document **pattern B** in your wiki if you adopt it later.

## 5. Stack configuration and secrets

Non-secret config lives in stack YAML files (`Pulumi.dev.yaml`, `Pulumi.prod.yaml`) in Git.

Secrets (Supabase DB password, etc.) must be set per stack:

```bash
pulumi stack select dev
pulumi config set --secret keysely-monitoring-stack:supabaseDbPassword "********"
```

In the Pulumi UI: **Stack** → **Configuration** → add keys with **secret** checked.

## 6. Audit and history

1. Open a **stack** → **Activity** (or **Updates**) to see `preview` / `update` history.
2. Use this view for audits: who triggered runs (when using Pulumi service accounts or team tokens, correlate with GitHub Actions run history).

**Policy packs:** If your org enables Policy as Code, violations appear on stack updates; align with internal compliance docs.

## 7. Related repository files

- [`README.md`](../../README.md) — developer setup
- [`docs/guides/azure-portal-setup.md`](./azure-portal-setup.md) — Azure + Entra for OIDC
- [`.github/workflows/pulumi.yml`](../../.github/workflows/pulumi.yml) — CI/CD
