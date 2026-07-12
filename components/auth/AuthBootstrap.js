"use client";

import { Auth0Provider } from "@auth0/auth0-react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AlertTriangle, LoaderCircle } from "lucide-react";

const RuntimeConfigContext = createContext(null);

export function useRuntimeConfig() {
  const value = useContext(RuntimeConfigContext);
  if (!value) {
    throw new Error("Runtime configuration is not available.");
  }
  return value;
}

function LoadingScreen() {
  return (
    <main className="boot-screen" aria-live="polite">
      <div className="boot-mark" aria-hidden="true">JJ</div>
      <LoaderCircle className="spin" size={24} />
      <p>Preparing Johnny-Johnny…</p>
    </main>
  );
}

function ConfigurationScreen({ message, missing = [] }) {
  return (
    <main className="configuration-screen">
      <section className="configuration-card">
        <div className="configuration-icon"><AlertTriangle size={24} /></div>
        <p className="eyebrow">Configuration required</p>
        <h1>Johnny-Johnny UI cannot start authentication.</h1>
        <p className="muted-copy">{message}</p>
        {missing.length > 0 && (
          <div className="code-panel">
            {missing.map((name) => <code key={name}>{name}</code>)}
          </div>
        )}
        <p className="small-copy">
          Configure an Auth0 Single Page Application. The browser uses Authorization Code Flow with PKCE and never receives a client secret.
        </p>
      </section>
    </main>
  );
}

export default function AuthBootstrap({ children }) {
  const [state, setState] = useState({ status: "loading", config: null, error: null });

  useEffect(() => {
    const controller = new AbortController();

    async function loadConfiguration() {
      try {
        const response = await fetch("/runtime-config", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Runtime configuration returned HTTP ${response.status}.`);
        }
        const config = await response.json();
        setState({ status: "ready", config, error: null });
      } catch (error) {
        if (error.name !== "AbortError") {
          setState({ status: "error", config: null, error });
        }
      }
    }

    loadConfiguration();
    return () => controller.abort();
  }, []);

  const onRedirectCallback = useMemo(
    () => (appState) => {
      const returnTo = appState?.returnTo || window.location.pathname || "/";
      window.history.replaceState({}, document.title, returnTo);
    },
    []
  );

  if (state.status === "loading") return <LoadingScreen />;
  if (state.status === "error") {
    return <ConfigurationScreen message={state.error?.message || "Runtime configuration could not be loaded."} />;
  }
  if (!state.config.configured) {
    return (
      <ConfigurationScreen
        message="Required public SPA settings are missing from the UI Deployment."
        missing={state.config.missing}
      />
    );
  }

  return (
    <RuntimeConfigContext.Provider value={state.config}>
      <Auth0Provider
        domain={state.config.auth0Domain}
        clientId={state.config.auth0ClientId}
        authorizationParams={{
          redirect_uri: window.location.origin,
          audience: state.config.auth0Audience,
          scope: state.config.auth0Scope,
        }}
        cacheLocation="memory"
        useRefreshTokens={false}
        onRedirectCallback={onRedirectCallback}
      >
        {children}
      </Auth0Provider>
    </RuntimeConfigContext.Provider>
  );
}
