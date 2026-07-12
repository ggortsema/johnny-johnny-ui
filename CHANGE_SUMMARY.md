# Change Summary

## Change summary

Replaced the former single-page chatbot test UI with an Auth0-secured Johnny-Johnny workspace and extended the agent's assistant boundary to expose a server-owned model catalog. The delivered UI includes a public landing page, authenticated application shell, ADR reader, assistant chat with progressive voice controls, canonical backlog/GitHub projection inspector, reconciliation controls, runtime configuration, local API proxy, standalone container, and EKS deployment path using the existing ALB and certificate.

## Files affected

### Application and runtime

- `app/layout.js` — replaced global metadata/shell setup.
- `app/page.js` — replaced legacy page with the Auth0-bootstrapped application.
- `app/globals.css` — replaced legacy styles with the responsive Johnny-Johnny visual system.
- `app/health/live/route.js` — added minimal UI liveness endpoint.
- `app/runtime-config/route.js` — added runtime public SPA configuration endpoint.
- `app/api/v1/[...segments]/route.js` — added local/direct-service same-origin agent proxy.
- `components/JohnnyJohnnyApp.js` — added authentication-state landing/workspace switch.

### Authentication, shell, and settings

- `components/auth/AuthBootstrap.js`
- `components/landing/LandingPage.js`
- `components/shell/Sidebar.js`
- `components/shell/TopBar.js`
- `components/shell/Workspace.js`
- `components/shell/SettingsDialog.js`
- `components/ui/SectionTabs.js`
- `components/ui/Notices.js`

### Capability workspaces

- `components/assistant/AssistantWorkspace.js`
- `components/docs/DocsWorkspace.js`
- `components/git/GitWorkspace.js`
- `lib/agent-api.js`
- `lib/agent-api-core.mjs`

### Build, tests, and package configuration

- `scripts/import-agent-docs.mjs`
- `scripts/prepare-standalone.mjs`
- `tests/import-agent-docs.test.mjs`
- `tests/agent-api-core.test.mjs`
- `generated/docs-manifest.json`
- `content/docs/adr/**`
- `package.json`
- `package-lock.json`
- `next.config.mjs`
- `jsconfig.json`
- `.env.example`
- `.gitignore`
- `.dockerignore`
- `Dockerfile`

### EKS and durable documentation

- `scripts/deploy-eks.sh`
- `docs/deployment/eks/kubernetes/johnny-johnny-namespace.yml`
- `docs/deployment/eks/kubernetes/johnny-johnny-ui-service.yml`
- `docs/deployment/eks/kubernetes/johnny-johnny-ui-deployment.yml`
- `docs/deployment/eks/kubernetes/johnny-johnny-shared-ingress.yml`
- `docs/deployment/eks-deployment.md`
- `docs/development/authenticated-agent-workspace-story.md`
- `README.md`
- `CHANGE_SUMMARY.md`

### Agent companion changes

- `johnny-johnny-agent/docs/development/authenticated-ui-companion-change-summary-2026-07-11.md` records the agent-side behavior, files, verification, and pending environment acceptance.
- assistant domain request now accepts an optional provider-neutral model identifier;
- new `AssistantModel` catalog model and `LanguageModelProvider.available_models` port method;
- OpenAI settings normalize a default model plus optional `OPENAI_MODELS` allow-list;
- OpenAI adapter validates selection before provider invocation;
- `GET /api/v1/assistant/models` added with `invoke:assistant` authorization;
- `POST /api/v1/assistant/responses` accepts only an allow-listed optional model;
- controlled `assistant_model_not_available` error added;
- agent unit/behavior tests and API/deployment documentation updated;
- agent Deployment includes `OPENAI_MODELS`;
- agent Ingress now routes `/api/v1` to the agent and `/` to the UI.

## Imports added

### UI

- `@auth0/auth0-react` for SPA authentication and PKCE-backed access-token handling.
- `lucide-react` for the application icon system.
- `react-markdown` and `remark-gfm` for ADR rendering.
- React hooks used by the new stateful workspaces.
- Node `fs`, `path`, `url`, and test modules used by build-time document import and tests.

### Agent

- `AssistantModel` and `UnsupportedLanguageModelError` across the application, provider, API, and tests.
- API response models for the model catalog.

## Imports removed or replaced

- Removed the legacy chatbot page's direct backend assumptions and `NEXT_PUBLIC_API_URL` build-time coupling.
- Replaced public build-time browser configuration with a server route that reads runtime environment values.
- Replaced provider-fixed assistant invocation with a provider-neutral, server-allow-listed model selection contract.
- Replaced the original single-stage root Node image with a multi-stage standalone non-root image.

## Methods and functions added

### UI

- `AuthBootstrap`, `useRuntimeConfig`, and configuration/loading screens.
- authenticated `useAgentApi` request boundary.
- `joinApiUrl`, `readResponseBody`, and normalized API error helpers.
- assistant `sendMessage`, speech recognition lifecycle, speech synthesis, model loading, copy, and composer handlers.
- docs import traversal, copy, metadata extraction, manifest creation, and source resolution.
- docs search/group/selection behaviors.
- Git projection loading, item inspection, and reconciliation execution handlers.
- local API `forward` route handler for supported HTTP methods.
- EKS deployment validation, rendering, rollout, and smoke helper functions.

### Agent

- `GenerateAssistantResponse.available_models`.
- `OpenAISettings.__post_init__` model normalization.
- `OpenAILanguageModelProvider.available_models`.
- `list_assistant_models` route.
- unsupported-model exception handler.

## Methods and functions replaced

- Replaced the UI page-level legacy chatbot request flow with capability-specific authenticated workspaces.
- Replaced the assistant use case's text-only normalization with text plus optional model normalization.
- Replaced the OpenAI adapter's fixed-model generation path with default-or-allow-listed selection.
- Replaced assistant request serialization with an optional `model` field while preserving the original text-only request compatibility.
- Replaced the API-only Ingress root path with shared UI/API path routing.

## Verification completed

- `JOHNNY_JOHNNY_AGENT_DOCS_DIR=../johnny-johnny-agent/docs npm run check` — 4 UI tests passed, 30 ADRs imported, and the production standalone Next.js build completed.
- `npm audit --omit=dev` — 0 known production dependency vulnerabilities.
- `bash -n scripts/deploy-eks.sh` — deployment script syntax validated.
- UI and agent Kubernetes manifests — 10 YAML documents parsed successfully.
- Shared UI and agent Ingress manifests — byte-for-byte routing contract match.
- Standalone runtime — `/`, `/health/live`, `/runtime-config`, and static assets returned successful responses; the local API proxy returned its controlled `502 agent_proxy_unavailable` contract while no agent was running.
- Agent companion suite — 147 passed and 1 skipped under the available system Python. Because the environment could not install the locked OpenAI SDK, an import-compatible temporary test stub was used only to load provider exception types; it is not included in the repositories or delivery archives.

## Environment acceptance still required

The source, image definition, manifests, and deployment script are complete, but no AWS credentials, Docker daemon, EKS access, or production Auth0 SPA client were available in this environment. The image has therefore not been pushed and the workloads have not been deployed here. `docs/deployment/eks-deployment.md` records the remaining Auth0 and interactive acceptance steps.
