# Johnny-Johnny UI EKS Deployment

**Status:** Deployment artifacts implemented; environment execution pending  
**Public origin:** `https://johnny-johnny.mycroftai.org`  
**Cluster:** `johnny-johnny-dev` in `us-east-1`

## Architecture

The UI and API remain independent workloads behind the current AWS Load Balancer Controller Ingress:

```text
https://johnny-johnny.mycroftai.org/api/v1/*
→ johnny-johnny-agent Service
→ FastAPI agent pods

https://johnny-johnny.mycroftai.org/*
→ johnny-johnny-ui Service
→ Next.js UI pods
```

The shared Ingress keeps the existing internet-facing ALB, HTTP-to-HTTPS redirect, hostname, and ACM certificate ARN. The `/api/v1` path appears before `/` and is the more specific prefix. Each service has its own target group; the UI Service annotates `/health/live` as its target health path while the agent retains `/api/v1/health/ready`.

## Auth0 SPA prerequisite

Create a separate Auth0 **Single Page Application** for the UI. Do not reuse a Machine-to-Machine client and do not place a client secret in Kubernetes.

Configure the production values:

| Auth0 setting | Value |
|---|---|
| Application type | Single Page Application |
| Allowed Callback URLs | `https://johnny-johnny.mycroftai.org` |
| Allowed Logout URLs | `https://johnny-johnny.mycroftai.org` |
| Allowed Web Origins | `https://johnny-johnny.mycroftai.org` |
| API audience | `https://johnny-johnny.mycroftai.org` |

For local development, add `http://localhost:3000` to the three URL lists.

The API permissions used by this workspace are:

```text
invoke:assistant
read:backlogs
operate:backlogs
```

Assign appropriate permissions to real users through Auth0 roles/authorization policy. A newly granted permission requires a newly issued access token. The UI also asks for `openid profile email` to display the authenticated profile.

## Public versus secret configuration

The UI Deployment contains only public SPA/application values:

- Auth0 domain;
- Auth0 SPA client ID;
- Auth0 API audience;
- requested scopes;
- same-origin API base path;
- default project/provider/account labels.

It does not contain:

- an Auth0 client secret;
- an OpenAI key;
- a GitHub token;
- a database URL;
- a bearer access token.

Provider and persistence secrets remain in the agent workload's established AWS Secrets Manager and CSI path.

## Deploy

From the UI repository with the canonical agent repository beside it:

```bash
AUTH0_CLIENT_ID='AUTH0_SPA_CLIENT_ID' \
JOHNNY_JOHNNY_AGENT_DIR='../johnny-johnny-agent' \
./scripts/deploy-eks.sh
```

Common overrides:

```bash
AWS_REGION=us-east-1
EKS_CLUSTER=johnny-johnny-dev
PUBLIC_BASE_URL=https://johnny-johnny.mycroftai.org
AUTH0_DOMAIN=dev-ude3gljkecu7ylzt.us.auth0.com
AUTH0_AUDIENCE=https://johnny-johnny.mycroftai.org
AUTH0_SCOPE='openid profile email invoke:assistant read:backlogs operate:backlogs'
```

Optional acceptance tokens:

```bash
ACCESS_TOKEN='short-lived-user-token' \
ASSISTANT_ACCESS_TOKEN='short-lived-token-with-invoke:assistant' \
AUTH0_CLIENT_ID='AUTH0_SPA_CLIENT_ID' \
./scripts/deploy-eks.sh
```

The script disables shell tracing and never prints token values.

## Deployment order

The script applies resources in this order:

1. namespace;
2. UI Service, including the UI target health check;
3. rendered UI Deployment;
4. shared Ingress from the agent repository when present.

This prevents the shared Ingress from pointing at an absent UI Service during the normal first deployment. The agent repository's Ingress has also been updated to the same shared routing so later agent fast-loop deployments do not revert `/` to the API.

## Image construction

The script creates a clean temporary Docker context, excludes local dependencies/build state, and copies the canonical agent `docs` tree to `.agent-docs`. The Docker `prebuild` hook imports the ADRs and emits the generated manifest before creating the standalone Next.js output.

The runtime image:

- runs as UID 1001;
- drops Linux capabilities;
- disallows privilege escalation;
- uses a read-only root filesystem with an `emptyDir` mounted at `/tmp`;
- exposes only port 3000;
- receives public runtime settings through environment variables.

## Automated smokes

After rollout, the script checks:

- the Deployment controller observed the exact new generation;
- the Deployment and every selected pod use the immutable image URI;
- every selected UI container is Ready;
- `GET /health/live` returns `200` through HTTPS;
- `GET /runtime-config` returns complete public settings and no secret-named field;
- `GET /api/v1/health/live` still reaches the agent;
- unauthenticated `POST /api/v1/assistant/responses` still returns `401`;
- optional authenticated `whoami` and model-catalog calls succeed.

## Manual acceptance

After the scripted checks:

1. Open `https://johnny-johnny.mycroftai.org` in a private browser session.
2. Verify the landing page appears without protected content.
3. Log in through Auth0 and return to the same origin.
4. Confirm the Assistant, Documentation, and Git projection navigation appears.
5. Confirm the model dropdown is populated from the agent.
6. Send a short assistant request and inspect model/usage metadata.
7. Search for and open an ADR.
8. Load the configured backlog and run reconciliation in dry-run mode.
9. Verify Logout returns to the landing page.

## Rollback

List revisions and roll back the UI Deployment:

```bash
kubectl rollout history deployment/johnny-johnny-ui -n johnny-johnny
kubectl rollout undo deployment/johnny-johnny-ui -n johnny-johnny
kubectl rollout status deployment/johnny-johnny-ui -n johnny-johnny
```

If only routing must be restored, reapply a previously accepted shared Ingress manifest. Do not point `/` back to the API as a long-term rollback after the UI becomes the public application root; use a known-good UI image instead.
