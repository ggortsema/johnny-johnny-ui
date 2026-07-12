"use client";

import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useMemo, useState } from "react";

import AssistantWorkspace from "@/components/assistant/AssistantWorkspace";
import DocsWorkspace from "@/components/docs/DocsWorkspace";
import GitWorkspace from "@/components/git/GitWorkspace";
import { useRuntimeConfig } from "@/components/auth/AuthBootstrap";
import Sidebar from "@/components/shell/Sidebar";
import SettingsDialog from "@/components/shell/SettingsDialog";
import TopBar from "@/components/shell/TopBar";
import { ErrorNotice } from "@/components/ui/Notices";
import { useAgentApi } from "@/lib/agent-api";
import { joinApiUrl, readResponseBody } from "@/lib/agent-api-core.mjs";

const sectionMetadata = {
  assistant: { title: "Assistant", description: "Exercise the authenticated Johnny-Johnny assistant boundary." },
  docs: { title: "Documentation", description: "Browse architecture decisions imported from the agent build." },
  git: { title: "Git projection", description: "Inspect canonical backlog content and reconcile its provider projection." },
};

export default function Workspace() {
  const { user, logout } = useAuth0();
  const { request } = useAgentApi();
  const config = useRuntimeConfig();
  const [activeSection, setActiveSection] = useState("assistant");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [principal, setPrincipal] = useState(null);
  const [identityError, setIdentityError] = useState(null);
  const [health, setHealth] = useState(null);
  const [autoRead, setAutoRead] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("jj:auto-read");
    setAutoRead(stored === "true");
  }, []);

  useEffect(() => {
    let cancelled = false;
    request("/auth/whoami")
      .then((payload) => !cancelled && setPrincipal(payload))
      .catch((error) => !cancelled && setIdentityError(error));
    return () => { cancelled = true; };
  }, [request]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(joinApiUrl(config.apiBaseUrl, "/health/live"), { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await readResponseBody(response);
        if (!response.ok) throw new Error("Agent health check failed.");
        return payload;
      })
      .then(setHealth)
      .catch(() => setHealth({ status: "unavailable" }));
    return () => controller.abort();
  }, [config.apiBaseUrl]);

  function updateAutoRead(value) {
    setAutoRead(value);
    window.localStorage.setItem("jj:auto-read", String(value));
  }

  function selectSection(section) {
    setActiveSection(section);
    setMobileNavOpen(false);
  }

  const content = useMemo(() => {
    if (activeSection === "docs") return <DocsWorkspace />;
    if (activeSection === "git") return <GitWorkspace principal={principal} />;
    return <AssistantWorkspace principal={principal} autoRead={autoRead} />;
  }, [activeSection, autoRead, principal]);

  const metadata = sectionMetadata[activeSection];

  return (
    <div className={`workspace-shell ${sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}>
      <Sidebar
        activeSection={activeSection}
        onSelect={selectSection}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
        mobileOpen={mobileNavOpen}
      />
      {mobileNavOpen && <button className="mobile-nav-scrim" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" />}

      <div className="workspace-frame">
        <TopBar
          sectionTitle={metadata.title}
          sectionDescription={metadata.description}
          user={user}
          health={health}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onLogout={() => logout({ logoutParams: { returnTo: window.location.origin } })}
        />
        <main className="workspace-main">
          {identityError && <ErrorNotice error={identityError} title="Your access token could not be inspected." />}
          {content}
        </main>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        autoRead={autoRead}
        onAutoReadChange={updateAutoRead}
        principal={principal}
        config={config}
      />
    </div>
  );
}
