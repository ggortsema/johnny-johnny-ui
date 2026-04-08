"use client";

import { useMemo, useState } from "react";

export default function HomePage() {
  const [baseUrl, setBaseUrl] = useState("http://localhost:8080");
  const [senderType, setSenderType] = useState("FRIEND");
  const [recipientKey, setRecipientKey] = useState("john");
  const [text, setText] = useState("Hey man are you free tonight?");
  const [responseType, setResponseType] = useState("natural");
  const [result, setResult] = useState(null);
  const [health, setHealth] = useState(null);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [error, setError] = useState("");

  const normalizedBaseUrl = useMemo(() => baseUrl.replace(/\/$/, ""), [baseUrl]);

  const selectedResponse = useMemo(() => {
    if (!result || !Array.isArray(result.candidates)) return null;
    return (
      result.candidates.find(
        (candidate) =>
          (candidate.variant || "").toLowerCase() === responseType.toLowerCase()
      ) || null
    );
  }, [result, responseType]);

  async function readJsonOrText(res) {
    const raw = await res.text();
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return raw;
    }
  }

  async function checkHealth() {
    setLoadingHealth(true);
    setError("");
    try {
      const res = await fetch(`${normalizedBaseUrl}/actuator/health`);
      const data = await readJsonOrText(res);
      if (!res.ok) {
        throw new Error(typeof data === "string" ? data : JSON.stringify(data, null, 2));
      }
      setHealth(data);
    } catch (e) {
      setHealth(null);
      setError(e.message || "Health check failed");
    } finally {
      setLoadingHealth(false);
    }
  }

  async function sendRequest() {
    setLoadingSuggest(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`${normalizedBaseUrl}/api/messages/suggest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          senderType,
          recipientKey,
          messageText: text
        })
      });

      const data = await readJsonOrText(res);
      if (!res.ok) {
        throw new Error(typeof data === "string" ? data : JSON.stringify(data, null, 2));
      }
      setResult(data);
    } catch (e) {
      setError(e.message || "Failed to send");
    } finally {
      setLoadingSuggest(false);
    }
  }

  return (
    <main className="page">
      <div className="stack">
        <div className="card stack">
          <div>
            <h1 style={{ margin: 0, fontSize: 32 }}>Chatbot Test UI</h1>
            <p className="muted" style={{ marginTop: 8 }}>
              Next.js front end for testing your Spring Boot + Drools + OpenAI chatbot backend.
            </p>
          </div>

          <div>
            <label htmlFor="baseUrl">Backend base URL</label>
            <input
              id="baseUrl"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:8080"
            />
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={checkHealth} disabled={loadingHealth}>
              {loadingHealth ? "Checking..." : "Check health"}
            </button>
            {health?.status && <span className="badge">Health: {health.status}</span>}
          </div>
        </div>

        <div className="card stack">
          <div>
            <h2 style={{ marginTop: 0 }}>Generate a reply</h2>
            <p className="muted small" style={{ marginTop: 8 }}>
              The dropdown controls which variant is shown. The backend can still return multiple candidates.
            </p>
          </div>

          <div className="row two">
            <div>
              <label htmlFor="senderType">Sender type</label>
              <select id="senderType" value={senderType} onChange={(e) => setSenderType(e.target.value)}>
                <option value="FRIEND">FRIEND</option>
                <option value="COWORKER">COWORKER</option>
                <option value="FAMILY">FAMILY</option>
                <option value="UNKNOWN">UNKNOWN</option>
              </select>
            </div>

            <div>
              <label htmlFor="recipientKey">Recipient key</label>
              <input
                id="recipientKey"
                value={recipientKey}
                onChange={(e) => setRecipientKey(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="responseType">Variant to display</label>
            <select id="responseType" value={responseType} onChange={(e) => setResponseType(e.target.value)}>
              <option value="concise">Concise</option>
              <option value="natural">Natural</option>
              <option value="bold">Bold</option>
            </select>
          </div>

          <div>
            <label htmlFor="text">Incoming message</label>
            <textarea
              id="text"
              rows="5"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div>
            <button onClick={sendRequest} disabled={loadingSuggest}>
              {loadingSuggest ? "Sending..." : "Send"}
            </button>
          </div>

          {error && <div className="error">{error}</div>}

          {selectedResponse && (
            <div className="responseBox">
              <div className="small muted" style={{ marginBottom: 8 }}>
                Variant: <strong>{selectedResponse.variant}</strong>
              </div>
              <div>{selectedResponse.text || "No text returned for this variant."}</div>
            </div>
          )}

          {result && Array.isArray(result.candidates) && !selectedResponse && (
            <div className="responseBox">
              No candidate with variant "{responseType}" was returned by the backend.
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Expected backend response shape</h3>
          <pre className="small">{`{
  "candidates": [
    { "variant": "concise", "text": "..." },
    { "variant": "natural", "text": "..." },
    { "variant": "bold", "text": "..." }
  ]
}`}</pre>
        </div>
      </div>
    </main>
  );
}
