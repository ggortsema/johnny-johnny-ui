"use client";

import { useAuth0 } from "@auth0/auth0-react";

import LandingPage from "@/components/landing/LandingPage";
import Workspace from "@/components/shell/Workspace";

export default function JohnnyJohnnyApp() {
  const { isAuthenticated, isLoading, error } = useAuth0();

  if (isLoading) {
    return (
      <main className="boot-screen" aria-live="polite">
        <div className="boot-mark" aria-hidden="true">JJ</div>
        <p>Completing secure sign-in…</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage authError={error} />;
  }

  return <Workspace />;
}
