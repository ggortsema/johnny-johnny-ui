"use client";

import {
  Bot,
  Check,
  Clipboard,
  CornerDownLeft,
  LoaderCircle,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Square,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import SectionTabs from "@/components/ui/SectionTabs";
import { ErrorNotice, ScopeGate } from "@/components/ui/Notices";
import { useAgentApi } from "@/lib/agent-api";

const initialMessages = [
  {
    id: "welcome",
    role: "assistant",
    text: "I’m connected to the Johnny-Johnny assistant capability. Ask about the project, a decision, or the next piece of work.",
    model: null,
    usage: null,
  },
];

const suggestions = [
  "What should we work on next?",
  "Explain the canonical backlog architecture.",
  "Summarize the current reconciliation model.",
];

function speakText(text) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = document.documentElement.lang || "en-US";
  window.speechSynthesis.speak(utterance);
  return true;
}

function ModelSelect({ models, value, onChange, loading }) {
  return (
    <label className="model-select-label">
      <span>Model</span>
      <select value={value || ""} onChange={(event) => onChange(event.target.value || null)} disabled={loading}>
        {models.length === 0 && <option value="">Server default</option>}
        {models.map((model) => (
          <option value={model.id} key={model.id}>
            {model.label || model.id}{model.is_default ? " · default" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function AssistantWorkspace({ principal, autoRead }) {
  const { request } = useAgentApi();
  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [synthesisSupported, setSynthesisSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef(null);

  const canInvoke = principal?.scopes?.includes("invoke:assistant");

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setRecognitionSupported(Boolean(SpeechRecognition));
    setSynthesisSupported("speechSynthesis" in window);
    return () => {
      recognitionRef.current?.abort?.();
      window.speechSynthesis?.cancel?.();
    };
  }, []);

  useEffect(() => {
    if (!canInvoke) {
      setModelsLoading(false);
      return;
    }
    let cancelled = false;
    setModelsLoading(true);
    request("/assistant/models")
      .then((payload) => {
        if (cancelled) return;
        const available = Array.isArray(payload?.models) ? payload.models : [];
        setModels(available);
        setSelectedModel(payload?.default_model || available.find((item) => item.is_default)?.id || available[0]?.id || null);
      })
      .catch((modelError) => {
        if (cancelled) return;
        // A pre-catalog agent remains usable through its configured default model.
        if (modelError.status !== 404) setError(modelError);
        setModels([]);
        setSelectedModel(null);
      })
      .finally(() => !cancelled && setModelsLoading(false));
    return () => { cancelled = true; };
  }, [canInvoke, request]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const lastResponse = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant" && message.model),
    [messages]
  );

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || listening) return;

    const recognition = new SpeechRecognition();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    const startingDraft = draft.trimEnd();

    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      setDraft(`${startingDraft}${startingDraft ? " " : ""}${transcript}`);
    };
    recognition.onerror = (event) => {
      setError(new Error(event.error === "not-allowed" ? "Microphone access was not allowed." : `Speech recognition failed: ${event.error}.`));
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop?.();
    setListening(false);
  }

  async function copyMessage(message) {
    await navigator.clipboard.writeText(message.text);
    setCopiedId(message.id);
    window.setTimeout(() => setCopiedId(null), 1400);
  }

  async function sendMessage(textOverride) {
    const text = (textOverride ?? draft).trim();
    if (!text || sending) return;

    setError(null);
    setDraft("");
    const userMessage = { id: `user-${Date.now()}`, role: "user", text };
    setMessages((current) => [...current, userMessage]);
    setSending(true);

    try {
      const body = { text };
      if (selectedModel) body.model = selectedModel;
      const response = await request("/assistant/responses", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const assistantMessage = {
        id: response.response_id || `assistant-${Date.now()}`,
        role: "assistant",
        text: response.text,
        model: response.model,
        usage: response.usage,
      };
      setMessages((current) => [...current, assistantMessage]);
      if (autoRead) speakText(response.text);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSending(false);
    }
  }

  function onComposerKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  if (principal === null) {
    return <div className="panel-loading"><LoaderCircle className="spin" size={22} /> Loading assistant access…</div>;
  }

  if (!canInvoke) {
    return (
      <ScopeGate
        scope="invoke:assistant"
        description="Assign an Auth0 role that grants the assistant permission, then sign in again for a fresh access token."
      />
    );
  }

  return (
    <section className="section-surface assistant-surface">
      <SectionTabs
        tabs={[{ id: "chat", label: "Chat" }, { id: "contract", label: "API contract" }]}
        activeTab={activeTab}
        onChange={setActiveTab}
        actions={activeTab === "chat" ? <ModelSelect models={models} value={selectedModel} onChange={setSelectedModel} loading={modelsLoading} /> : null}
      />

      {activeTab === "chat" ? (
        <div className="chat-layout">
          <div className="chat-transcript" ref={transcriptRef} aria-live="polite">
            <div className="chat-intro">
              <span className="assistant-orb"><Sparkles size={22} /></span>
              <h2>How can Johnny-Johnny help?</h2>
              <p>Responses come from the authenticated agent endpoint. The visible transcript stays local to this browser session.</p>
              <div className="prompt-suggestions">
                {suggestions.map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => sendMessage(suggestion)}>{suggestion}</button>
                ))}
              </div>
            </div>

            <div className="message-list">
              {messages.map((message) => (
                <article className={`chat-message ${message.role}`} key={message.id}>
                  <div className="message-avatar">{message.role === "assistant" ? <Bot size={18} /> : "You"}</div>
                  <div className="message-body">
                    <div className="message-heading">
                      <strong>{message.role === "assistant" ? "Johnny-Johnny" : "You"}</strong>
                      {message.model && <span>{message.model}</span>}
                    </div>
                    <p>{message.text}</p>
                    {message.role === "assistant" && (
                      <div className="message-actions">
                        <button type="button" onClick={() => copyMessage(message)} title="Copy response">
                          {copiedId === message.id ? <Check size={14} /> : <Clipboard size={14} />}
                          {copiedId === message.id ? "Copied" : "Copy"}
                        </button>
                        <button
                          type="button"
                          onClick={() => speakText(message.text)}
                          disabled={!synthesisSupported}
                          title={synthesisSupported ? "Read response aloud" : "Speech synthesis is not available in this browser"}
                        >
                          <Volume2 size={14} /> Read
                        </button>
                        {message.usage && (
                          <span>{message.usage.input_tokens} in · {message.usage.output_tokens} out</span>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              ))}
              {sending && (
                <article className="chat-message assistant pending">
                  <div className="message-avatar"><Bot size={18} /></div>
                  <div className="message-body"><div className="typing-dots"><span /><span /><span /></div></div>
                </article>
              )}
            </div>
          </div>

          <div className="composer-wrap">
            <ErrorNotice error={error} title="Johnny-Johnny could not answer." />
            <div className="composer">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onComposerKeyDown}
                placeholder="Ask Johnny-Johnny…"
                rows={1}
                aria-label="Message Johnny-Johnny"
              />
              <div className="composer-tools">
                <div>
                  <button
                    type="button"
                    className={`icon-button ${listening ? "active danger" : ""}`}
                    onClick={listening ? stopListening : startListening}
                    disabled={!recognitionSupported}
                    title={recognitionSupported ? (listening ? "Stop microphone" : "Use microphone") : "Speech recognition is not available in this browser"}
                    aria-label={listening ? "Stop microphone" : "Use microphone"}
                  >
                    {listening ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                  {synthesisSupported && (
                    <button type="button" className="icon-button" onClick={() => window.speechSynthesis.cancel()} aria-label="Stop reading response" title="Stop reading response"><Square size={16} /></button>
                  )}
                </div>
                <button className="send-button" type="button" onClick={() => sendMessage()} disabled={!draft.trim() || sending} aria-label="Send message">
                  {sending ? <LoaderCircle className="spin" size={18} /> : <Send size={18} />}
                </button>
              </div>
            </div>
            <p className="composer-hint"><CornerDownLeft size={13} /> Enter to send · Shift+Enter for a new line · Voice features depend on browser support.</p>
          </div>
        </div>
      ) : (
        <div className="contract-view">
          <div className="contract-hero">
            <p className="eyebrow">Provider-neutral boundary</p>
            <h2>POST /api/v1/assistant/responses</h2>
            <p>The UI sends text and an optional server-allowed model identifier. It never receives or stores the OpenAI credential.</p>
          </div>
          <div className="contract-grid">
            <article><span>Authorization</span><strong>invoke:assistant</strong><p>Auth0 bearer access token obtained through the SPA PKCE flow.</p></article>
            <article><span>Conversation state</span><strong>Backend-owned</strong><p>This first UI shows a local transcript but does not synthesize history into prompts.</p></article>
            <article><span>Last returned model</span><strong>{lastResponse?.model || "No response yet"}</strong><p>The response reports the model actually used by the configured provider adapter.</p></article>
          </div>
          <div className="code-example-grid">
            <pre><code>{`{
  "text": "What should we work on next?",
  "model": "${selectedModel || "server-default"}"
}`}</code></pre>
            <pre><code>{`{
  "response_id": "resp_...",
  "text": "...",
  "model": "...",
  "usage": {
    "input_tokens": 18,
    "output_tokens": 9
  }
}`}</code></pre>
          </div>
        </div>
      )}
    </section>
  );
}
