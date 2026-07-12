# Johnny-Johnny UI

Johnny-Johnny UI is the authenticated browser workspace for `johnny-johnny-agent`. It provides a polished public landing page before login and, after Auth0 authentication, a left-navigation application shell for the assistant, architecture documents, and the canonical backlog's GitHub projection.

## Product shape

### Before login

The public route is a landing page that explains Johnny-Johnny without loading protected agent data. The top-right **Log in** action starts Auth0's Authorization Code Flow with PKCE.

### After login

The application presents:

- **Assistant** — authenticated chat against the agent's provider-neutral response endpoint, server-owned model selection, microphone dictation where supported, copy controls, token metadata, and optional spoken responses;
- **Documentation** — ADRs copied from `johnny-johnny-agent/docs/architecture/adrs` during the build and rendered in a searchable document reader;
- **Git projection** — canonical backlog summary, epics, items, provider metadata, raw API payloads, and explicit dry-run or confirmed reconciliation controls.

The browser stores only display preferences and the current in-memory transcript. Conversation orchestration, provider credentials, model allow-listing, backlog state, and GitHub synchronization stay behind the agent API.

## Security boundary

The browser application is an Auth0 Single Page Application:

```text
Browser
→ Auth0 Authorization Code Flow with PKCE
→ audience-scoped access token held in memory
→ Authorization: Bearer ...
→ Johnny-Johnny agent
```

There is no Auth0 client secret in the image, Kubernetes Deployment, runtime configuration endpoint, source, or browser. Public SPA settings are loaded at runtime from `/runtime-config`; access tokens remain in the Auth0 SDK's in-memory cache.

The UI requests these scopes by default:

```text
openid profile email invoke:assistant read:backlogs operate:backlogs
```

The agent remains authoritative. Missing permissions produce scoped UI gates rather than bypasses:

- `invoke:assistant` — model catalog and response generation;
- `read:backlogs` — canonical/projected backlog views;
- `operate:backlogs` — reconciliation preview and execution.

## Requirements

- Node.js 22
- npm 10 or compatible
- a running `johnny-johnny-agent`
- an Auth0 SPA client configured for the browser origin
- the agent repository available during builds when the ADR source should be refreshed

## Local development

Copy the environment example:

```bash
cp .env.example .env.local
```

Set at least:

```env
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your-spa-client-id
AUTH0_AUDIENCE=https://johnny-johnny.mycroftai.org
```

For local Auth0 testing, register this origin in the SPA application's **Allowed Callback URLs**, **Allowed Logout URLs**, and **Allowed Web Origins**:

```text
http://localhost:3000
```

Start the agent on port 8000, then install and run the UI:

```bash
npm ci
JOHNNY_JOHNNY_AGENT_DOCS_DIR=../johnny-johnny-agent/docs npm run dev
```

Open `http://localhost:3000`. The Next.js `/api/v1/*` route forwards local same-origin requests to `JOHNNY_JOHNNY_AGENT_ORIGIN`, which defaults to `http://127.0.0.1:8000`. In EKS, the ALB routes `/api/v1` directly to the agent service, so the proxy is primarily a local-development and direct-service fallback.

## Build-time ADR import

`predev` and `prebuild` run `scripts/import-agent-docs.mjs`. The importer searches, in order, for:

1. an explicit script source;
2. `JOHNNY_JOHNNY_AGENT_DOCS_DIR`;
3. `.agent-docs` in the Docker build context;
4. a sibling `johnny-johnny-agent/docs` directory;
5. a sibling `agent/docs` directory.

It copies Markdown recursively from `architecture/adrs`, then writes `generated/docs-manifest.json`. Checked-in ADR content acts as an offline fallback, while the EKS deployment script stages the canonical agent docs into `.agent-docs` before building the image.

## Verification

Run the complete UI check:

```bash
npm run check
```

This executes the Node tests, refreshes imported documents, and creates the production standalone Next.js build.

Runtime endpoints:

```text
GET /health/live      minimal UI liveness
GET /runtime-config   public, non-secret SPA configuration
```

## Model selection contract

The UI does not hard-code or freely submit provider model names. It first requests:

```http
GET /api/v1/assistant/models
```

The selected identifier is then sent as the optional `model` field to:

```http
POST /api/v1/assistant/responses
```

Older agent revisions that do not yet expose the catalog remain usable through the configured server default; the UI treats a catalog `404` as a compatibility fallback.

## Voice behavior

Microphone dictation uses the browser's speech-recognition implementation when one is present and permission is granted. The control is disabled with an explanatory tooltip when unavailable. Response reading uses browser speech synthesis and can be triggered per message or automatically from Settings. Johnny-Johnny application code sends only finalized transcript text in the normal assistant request; the browser or platform speech-recognition implementation may process audio through its own service, subject to that browser's behavior and privacy controls.

## EKS deployment

The temporary manual deployment path is:

```bash
AUTH0_CLIENT_ID='your-auth0-spa-client-id' \
JOHNNY_JOHNNY_AGENT_DIR='../johnny-johnny-agent' \
./scripts/deploy-eks.sh
```

Defaults match the existing Johnny-Johnny development environment:

```text
Region:      us-east-1
Cluster:     johnny-johnny-dev
Namespace:   johnny-johnny
Host:        https://johnny-johnny.mycroftai.org
UI ECR:      johnny-johnny/johnny-johnny-ui
```

The script:

1. installs exact dependencies and runs UI tests/build;
2. imports the agent ADRs into an isolated Docker context;
3. creates the ECR repository when absent;
4. builds and pushes a unique `linux/amd64` image;
5. renders only public runtime configuration into the Deployment;
6. applies the UI Service and Deployment;
7. applies the shared Ingress from the agent repository when available;
8. verifies the exact Deployment generation, image, and ready pods;
9. smokes UI health, runtime configuration, agent health, and unauthenticated assistant protection over HTTPS.

Optional `ACCESS_TOKEN` and `ASSISTANT_ACCESS_TOKEN` environment variables enable authenticated `whoami` and model-catalog smokes without printing either token.

The shared ALB routing is:

| Path | Kubernetes service |
|---|---|
| `/api/v1` | `johnny-johnny-agent:80` |
| `/` | `johnny-johnny-ui:80` |

The current ALB, hostname, HTTP-to-HTTPS redirect, and ACM certificate are retained. See `docs/deployment/eks-deployment.md` for Auth0 and operational details.

## Repository map

```text
app/                         Next.js routes, health, runtime config, local API proxy
components/                  landing, shell, assistant, docs, Git projection UI
content/docs/adr/            imported/check-in fallback ADR content
generated/docs-manifest.json build-generated searchable document catalog
lib/                         authenticated agent client and URL/response helpers
scripts/import-agent-docs.mjs
scripts/deploy-eks.sh
docs/development/            story and implementation artifacts
docs/deployment/             EKS and Auth0 deployment contract
```
