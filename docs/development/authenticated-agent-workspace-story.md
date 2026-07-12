# Authenticated Agent Workspace Story

**Capability:** Authenticated Johnny-Johnny browser access  
**Status:** Implemented; environment deployment pending  
**UI version:** 0.2.0

## Story

As a Johnny-Johnny user, I want a secure, polished browser workspace so that I can read durable engineering decisions, exercise the assistant, and inspect or reconcile the canonical backlog's GitHub projection without exposing provider credentials or moving orchestration into the browser.

## Behavioral decisions

- The unauthenticated route is a product landing page, not an incomplete application shell.
- Login uses an Auth0 SPA and Authorization Code Flow with PKCE. No client secret is accepted by the UI.
- Successful authentication reveals a persistent left navigation and section-specific tabs across the workspace frame.
- The assistant transcript is local display state only. The backend remains responsible for future memory, retrieval, prompt construction, tools, and provider behavior.
- Model selection is constrained by an authenticated server-owned catalog.
- ADRs are build artifacts imported from the agent repository, not fetched from an arbitrary filesystem at runtime.
- The Git section presents the domain's canonical backlog and provider projection. It does not pretend that browser-side repository browsing is a canonical workflow.
- Reconciliation remains explicit: dry-run is the default; confirmed execution requires `operate:backlogs` and a typed confirmation.
- Voice features are progressive enhancements. Text interaction remains complete when recognition or synthesis is unavailable.
- The UI and agent are separate Kubernetes Deployments and Services behind one HTTPS ALB origin.

## Acceptance criteria

### Public experience

- [x] `/` renders a responsive Johnny-Johnny landing page before authentication.
- [x] A visible top-level Log in action starts the Auth0 SPA login flow.
- [x] Protected agent data is not requested from the landing page.

### Authentication and authorization

- [x] The browser uses Auth0 Authorization Code Flow with PKCE through the SPA SDK.
- [x] No client secret exists in source, runtime configuration, Docker build arguments, or Kubernetes configuration.
- [x] Tokens are requested for the configured API audience and held in memory.
- [x] The authenticated identity and granted scopes are verified through `/api/v1/auth/whoami`.
- [x] Missing capability scopes produce clear, section-level access messages.

### Application shell

- [x] Authenticated users receive left navigation for Assistant, Documentation, and Git projection.
- [x] Relevant tabs appear across the top of each section frame.
- [x] The top bar shows agent availability and a user menu.
- [x] User settings include automatic response reading and visible authorization/configuration details.
- [x] The layout adapts to tablet and mobile widths.

### Documentation

- [x] ADR Markdown is recursively copied from `johnny-johnny-agent/docs/architecture/adrs` during development/build when available.
- [x] A checked-in fallback permits an offline build.
- [x] The document section supports search, grouped navigation, a catalog view, and rendered Markdown.
- [x] The generated manifest retains source paths so readers can identify the durable artifact.

### Assistant

- [x] The UI retrieves the authenticated model catalog and identifies the default.
- [x] The user can select only a model returned by the server.
- [x] Sending text calls the provider-neutral assistant response endpoint with a bearer access token.
- [x] The transcript shows role, returned model, and token usage without persisting conversation orchestration.
- [x] Microphone dictation is offered only when the browser exposes speech recognition.
- [x] Responses can be spoken individually and optionally read automatically.
- [x] Provider and authorization errors are displayed without exposing credentials.

### Git projection

- [x] Users with `read:backlogs` can load summary, epic, item, and provider-projection content.
- [x] Project title, provider, and provider account are configurable from runtime defaults.
- [x] Raw normalized responses can be inspected.
- [x] Reconciliation preview is the default.
- [x] Confirmed reconciliation requires `operate:backlogs` and the explicit word `RECONCILE`.

### Deployment

- [x] The production image is a standalone, non-root Next.js runtime.
- [x] Kubernetes liveness/readiness use `/health/live`.
- [x] `/api/v1` routes to the agent and `/` routes to the UI on the existing HTTPS ALB/certificate.
- [x] The UI Service overrides the ALB target-group health path for its target.
- [x] The deployment script builds ADRs into the image, pushes an immutable ECR tag, checks the exact rollout, and runs public HTTPS smokes.
- [ ] Create/configure the environment's Auth0 SPA client and deploy this revision to EKS.
- [ ] Complete an interactive user-login acceptance test against the deployed origin.

## Out of scope

- persisted conversations or cross-device chat history;
- RAG, source citations, assistant tools, or prompt orchestration in the browser;
- arbitrary provider/model identifiers supplied by a client;
- direct GitHub credentials in the UI;
- arbitrary repository filesystem browsing without an agent capability;
- streaming or real-time bidirectional voice transports;
- replacing the temporary deploy script with StyxCD automation.
