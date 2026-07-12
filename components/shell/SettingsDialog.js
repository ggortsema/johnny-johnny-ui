"use client";

import { Check, Settings, Volume2, X } from "lucide-react";
import { useEffect, useState } from "react";

export default function SettingsDialog({ open, onClose, autoRead, onAutoReadChange, principal, config }) {
  const [synthesisSupported, setSynthesisSupported] = useState(false);

  useEffect(() => {
    setSynthesisSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div className="settings-heading-icon"><Settings size={19} /></div>
          <div><p className="eyebrow">Workspace</p><h2 id="settings-title">Settings & access</h2></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close settings"><X size={19} /></button>
        </header>

        <div className="settings-section">
          <h3>Voice</h3>
          <label className="toggle-row">
            <span className="toggle-copy"><Volume2 size={18} /><span><strong>Read assistant responses</strong><small>{synthesisSupported ? "Use the browser’s speech synthesizer after each response." : "Speech synthesis is not available in this browser."}</small></span></span>
            <input type="checkbox" checked={autoRead && synthesisSupported} disabled={!synthesisSupported} onChange={(event) => onAutoReadChange(event.target.checked)} />
            <span className="toggle-control"><span /></span>
          </label>
        </div>

        <div className="settings-section">
          <h3>Granted API scopes</h3>
          <div className="scope-list">
            {(principal?.scopes || []).map((scope) => <span className="scope-chip" key={scope}><Check size={13} />{scope}</span>)}
            {!principal?.scopes?.length && <p className="muted-copy">No scopes have been loaded from <code>/auth/whoami</code>.</p>}
          </div>
        </div>

        <div className="settings-section settings-grid">
          <div><small>API base</small><code>{config.apiBaseUrl}</code></div>
          <div><small>OAuth audience</small><code>{config.auth0Audience}</code></div>
          <div><small>Provider</small><code>{config.provider}</code></div>
          <div><small>Provider account</small><code>{config.providerAccount}</code></div>
        </div>
      </section>
    </div>
  );
}
