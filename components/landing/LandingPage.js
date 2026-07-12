"use client";

import { useAuth0 } from "@auth0/auth0-react";
import {
  ArrowRight,
  Bot,
  BookOpenText,
  GitBranch,
  LockKeyhole,
  Sparkles,
  Waypoints,
} from "lucide-react";

const featureCards = [
  {
    icon: Bot,
    title: "Exercise the assistant",
    copy: "Send authenticated requests through Johnny-Johnny’s provider-neutral assistant boundary, choose an allowed model, and inspect normalized usage.",
  },
  {
    icon: BookOpenText,
    title: "Read durable decisions",
    copy: "Browse ADRs imported from the agent repository during the UI build so architecture remains available where the work happens.",
  },
  {
    icon: GitBranch,
    title: "Inspect Git projection",
    copy: "Review canonical backlog content, provider metadata, and reconciliation plans without turning the browser into the source of truth.",
  },
];

export default function LandingPage({ authError }) {
  const { loginWithRedirect } = useAuth0();

  function signIn() {
    loginWithRedirect({ appState: { returnTo: "/" } });
  }

  return (
    <main className="landing-page">
      <header className="landing-header">
        <a className="brand-lockup" href="#top" aria-label="Johnny-Johnny home">
          <span className="brand-mark">JJ</span>
          <span>
            <strong>Johnny-Johnny</strong>
            <small>Agent workspace</small>
          </span>
        </a>
        <button className="button button-secondary login-button" onClick={signIn}>
          <LockKeyhole size={16} />
          Log in
        </button>
      </header>

      <section id="top" className="landing-hero">
        <div className="hero-copy">
          <div className="hero-kicker"><Sparkles size={15} /> Canonical work. Clear decisions. Useful assistance.</div>
          <h1>The control surface for building Johnny‑Johnny.</h1>
          <p>
            A focused workspace for the authenticated agent: talk to the assistant, read the architecture, and inspect the GitHub projection while PostgreSQL remains canonical.
          </p>
          <div className="hero-actions">
            <button className="button button-primary button-large" onClick={signIn}>
              Open the workspace <ArrowRight size={17} />
            </button>
            <span className="security-note"><LockKeyhole size={14} /> Auth0 SPA · OAuth 2.0 PKCE</span>
          </div>
          {authError && (
            <div className="inline-error" role="alert">
              Sign-in could not be completed: {authError.message}
            </div>
          )}
        </div>

        <div className="hero-visual" aria-label="Johnny-Johnny architecture overview">
          <div className="visual-glow" />
          <div className="visual-window">
            <div className="visual-window-bar">
              <span /><span /><span />
              <small>johnny-johnny.mycroftai.org</small>
            </div>
            <div className="visual-shell">
              <div className="visual-sidebar">
                <div className="visual-nav active"><Bot size={15} /> Assistant</div>
                <div className="visual-nav"><BookOpenText size={15} /> Docs</div>
                <div className="visual-nav"><GitBranch size={15} /> Git</div>
              </div>
              <div className="visual-main">
                <div className="visual-tabs"><b>Chat</b><span>API contract</span></div>
                <div className="visual-message user">What should we work on next?</div>
                <div className="visual-message agent">
                  <span className="mini-mark">JJ</span>
                  Start with the authenticated UI story, keep orchestration behind the agent, and prove the shared HTTPS boundary.
                </div>
                <div className="visual-composer">Ask Johnny-Johnny… <ArrowRight size={14} /></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-features" aria-label="Workspace capabilities">
        {featureCards.map(({ icon: Icon, title, copy }) => (
          <article className="feature-card" key={title}>
            <div className="feature-icon"><Icon size={20} /></div>
            <h2>{title}</h2>
            <p>{copy}</p>
          </article>
        ))}
      </section>

      <section className="architecture-strip">
        <div>
          <p className="eyebrow">One secure public boundary</p>
          <h2>UI and API, separately deployable.</h2>
          <p>
            The shared AWS ALB routes the application shell at <code>/</code> and the FastAPI resource server at <code>/api/v1</code>, all under the existing ACM certificate.
          </p>
        </div>
        <div className="architecture-flow" aria-label="Request flow">
          <span>Browser</span><Waypoints size={18} /><span>Auth0</span><Waypoints size={18} /><span>ALB</span><Waypoints size={18} /><span>Agent</span>
        </div>
      </section>

      <footer className="landing-footer">
        <span>Johnny-Johnny</span>
        <span>Domain first · explicit boundaries · durable knowledge</span>
      </footer>
    </main>
  );
}
