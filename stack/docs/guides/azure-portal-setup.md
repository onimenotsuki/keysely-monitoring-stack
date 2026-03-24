# Azure Portal and Microsoft Entra setup

Step-by-step guide for administrators configuring Azure and Entra ID for the Keysely monitoring stack (KEY-99). CLI commands are optional; this document focuses on **Portal navigation**.

For GitHub Actions OIDC, also see your GitHub repository **Settings → Secrets and variables → Actions** after completing the Entra steps below.

## 1. Subscription and billing

1. Sign in to [Azure Portal](https://portal.azure.com).
2. Open **Subscriptions** and select the subscription that will host observability resources.
3. Confirm you have at least **Contributor** on a dedicated resource group (recommended) or an equivalent custom role that allows:
   - Resource groups
   - **Azure Kubernetes Service**
   - **Azure Managed Grafana** (`Microsoft.Dashboard`)
   - **Virtual network** and **subnets**
   - **Monitor** / diagnostic settings as needed
4. Note the **Subscription ID** (used by Pulumi and GitHub Actions).

**Default region:** align with `azure-native:location` in `Pulumi.dev.yaml` / `Pulumi.prod.yaml` (e.g. `westeurope`).

## 2. Resource providers

1. Open your subscription → **Settings** → **Resource providers**.
2. Ensure **Registered** (or register) at minimum:

   | Provider namespace | Typical use |
   |-------------------|-------------|
   | `Microsoft.ContainerService` | AKS |
   | `Microsoft.Dashboard` | Azure Managed Grafana |
   | `Microsoft.Network` | Virtual network / subnet |
   | `Microsoft.Monitor` | Azure Monitor integrations |
   | `Microsoft.OperationalInsights` | Log Analytics (optional add-ons) |

3. If a provider shows **Not registered**, select it → **Register** and wait until state is **Registered**.

## 3. Microsoft Entra app registration for CI (GitHub Actions OIDC)

Prefer **OpenID Connect (federated credentials)** over long-lived client secrets for GitHub Actions.

### 3.1 Create or select an app registration

1. Open **Microsoft Entra ID** (or **Entra admin center** → **Identity** → **Applications** → **App registrations**).
2. **New registration**:
   - **Name:** e.g. `keysely-monitoring-github-actions`
   - **Supported account types:** single tenant (typical)
3. After creation, copy:
   - **Application (client) ID** → GitHub secret `AZURE_CLIENT_ID`
   - **Directory (tenant) ID** → GitHub secret `AZURE_TENANT_ID`

### 3.2 Federated credential (GitHub)

1. In the app registration, open **Certificates & secrets** → **Federated credentials** → **Add credential**.
2. **Federated credential scenario:** GitHub Actions deploying Azure resources.
3. Configure:
   - **Organization** and **Repository** (your GitHub org/user and repo name).
   - **Entity type:** often **Branch** for `main`, or **Environment** if you scope by GitHub Environment (e.g. `production`).
   - **GitHub identifier:** branch name `main`, or environment name `production`, per your threat model.
4. Save. Repeat if you need separate credentials for `development` and `production` environments.

Official reference: [Azure workload identity federation](https://learn.microsoft.com/en-us/azure/active-directory/develop/workload-identity-federation-create-trust-github).

### 3.3 Azure RBAC for the app

1. Open **Subscriptions** or the target **Resource group** → **Access control (IAM)**.
2. **Add role assignment**:
   - **Role:** Contributor on the RG (minimum scope) or a custom role aligned with least privilege.
   - **Members:** the app registration (search by name or client ID).

### 3.4 Client secrets (local development only, optional)

If developers use `az login` with a secret locally (not recommended vs interactive login or OIDC):

1. App registration → **Certificates & secrets** → **New client secret**.
2. Store the value in a password manager; rotate before expiry.
3. Portal path for rotation: same blade → delete old secret → add new secret.

**Recommendation:** use `az login` interactive for humans; use **OIDC** for GitHub.

## 4. Networking and quotas

### Quotas

1. Open **Subscriptions** → your subscription → **Usage + quotas** (or **My quotas**).
2. Check **Public IPs**, **vCPU** for your VM family (AKS nodes), and regional limits.
3. Request increase if **Usage** is near **Limit** for the target region.

### Post-deploy networking

After Pulumi creates the VNet and AKS subnet, validate in **Virtual networks** → **Subnets** → delegation `Microsoft.ContainerService/managedClusters` is present on the AKS subnet.

## 5. Post-deploy sanity checks in Portal

After `pulumi up`, confirm:

| Resource | Portal path | Expect |
|----------|-------------|--------|
| Resource group | Resource groups | Name matches stack `baseName` pattern |
| AKS | Kubernetes services | Cluster `Running`, node pool healthy |
| Managed Grafana | Azure Managed Grafana | Workspace shows **Endpoint** URL |
| VNet / subnet | Virtual networks | Address spaces and AKS subnet delegation as defined in code |

Open the **Managed Grafana** resource → copy **Endpoint** for UI access and for Grafana Assistant CLI configuration.

## 6. Cost Management (recommended)

1. Open **Cost Management + Billing** → **Budgets**.
2. **Add** a budget scoped to the observability **resource group**.
3. Configure alert thresholds (e.g. 50%, 80%, 100% of monthly amount) to email or Action Group.

## 7. Related configuration in this repo

- Stack config: `Pulumi.dev.yaml`, `Pulumi.prod.yaml`
- GitHub workflow: `.github/workflows/pulumi.yml`
- Supabase / Grafana: [../supabase-grafana.md](../supabase-grafana.md)
