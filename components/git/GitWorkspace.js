"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  CircleCheck,
  GitBranch,
  Layers3,
  ListTree,
  LoaderCircle,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useRuntimeConfig } from "@/components/auth/AuthBootstrap";
import SectionTabs from "@/components/ui/SectionTabs";
import { ErrorNotice, ScopeGate } from "@/components/ui/Notices";
import { useAgentApi } from "@/lib/agent-api";

function Metric({ label, value, icon: Icon }) {
  return (
    <article className="metric-card">
      <div><span>{label}</span><strong>{value ?? "—"}</strong></div>
      <Icon size={20} />
    </article>
  );
}

function JsonView({ value }) {
  return <pre className="json-view"><code>{JSON.stringify(value, null, 2)}</code></pre>;
}

export default function GitWorkspace({ principal }) {
  const defaults = useRuntimeConfig();
  const { request } = useAgentApi();
  const [activeTab, setActiveTab] = useState("overview");
  const [projectTitle, setProjectTitle] = useState(defaults.projectTitle);
  const [provider, setProvider] = useState(defaults.provider);
  const [providerAccount, setProviderAccount] = useState(defaults.providerAccount);
  const [summary, setSummary] = useState(null);
  const [epics, setEpics] = useState(null);
  const [items, setItems] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [reconciliation, setReconciliation] = useState(null);
  const [mode, setMode] = useState("dry-run");
  const [maxOperations, setMaxOperations] = useState(100);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [itemLoading, setItemLoading] = useState(false);
  const [error, setError] = useState(null);
  const initialLoadRef = useRef(false);

  const scopes = principal?.scopes || [];
  const canRead = scopes.includes("read:backlogs");
  const canOperate = scopes.includes("operate:backlogs");

  const locationQuery = useMemo(() => {
    const query = new URLSearchParams({ provider, provider_account: providerAccount });
    return query.toString();
  }, [provider, providerAccount]);

  const projectPath = useMemo(
    () => `/backlogs/${encodeURIComponent(projectTitle.trim())}`,
    [projectTitle]
  );

  const loadProject = useCallback(async () => {
    if (!canRead || !projectTitle.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const [summaryPayload, epicPayload, itemPayload] = await Promise.all([
        request(`${projectPath}/summary?${locationQuery}`),
        request(`${projectPath}/epics?${locationQuery}`),
        request(`${projectPath}/items?${locationQuery}`),
      ]);
      setSummary(summaryPayload);
      setEpics(epicPayload);
      setItems(itemPayload);
      setSelectedItem(null);
      setSelectedItemId(null);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, [canRead, locationQuery, projectPath, projectTitle, request]);

  useEffect(() => {
    if (canRead && !initialLoadRef.current) {
      initialLoadRef.current = true;
      loadProject();
    }
  }, [canRead, loadProject]);

  async function loadItem(itemId) {
    setSelectedItemId(itemId);
    setItemLoading(true);
    setError(null);
    try {
      const payload = await request(`${projectPath}/items/${encodeURIComponent(itemId)}?${locationQuery}`);
      setSelectedItem(payload);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setItemLoading(false);
    }
  }

  async function runReconciliation() {
    if (!canOperate) return;
    if (mode === "confirmed" && confirmation !== "RECONCILE") return;
    setLoading(true);
    setError(null);
    try {
      const body = {
        mode,
        max_operations: Number(maxOperations) || 100,
      };
      const payload = await request(`${projectPath}/reconciliation?${locationQuery}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setReconciliation(payload);
      setConfirmation("");
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }

  if (principal === null) {
    return <div className="panel-loading"><LoaderCircle className="spin" size={22} /> Loading Git access…</div>;
  }

  if (!canRead) {
    return (
      <ScopeGate
        scope="read:backlogs"
        description="The Git workspace reads the canonical backlog and its stored provider metadata before it can display or reconcile projection state."
      />
    );
  }

  const itemRows = items?.items || [];
  const epicRows = epics?.items || [];

  return (
    <section className="section-surface git-surface">
      <SectionTabs
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "backlog", label: "Backlog", badge: itemRows.length || undefined },
          { id: "reconcile", label: "Reconcile" },
          { id: "raw", label: "Raw JSON" },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        actions={
          <button type="button" className="button button-secondary compact" onClick={loadProject} disabled={loading}>
            <RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh
          </button>
        }
      />

      <div className="project-controls">
        <label><span>Project title</span><input value={projectTitle} onChange={(event) => setProjectTitle(event.target.value)} /></label>
        <label><span>Provider</span><input value={provider} onChange={(event) => setProvider(event.target.value)} /></label>
        <label><span>Account</span><input value={providerAccount} onChange={(event) => setProviderAccount(event.target.value)} /></label>
        <button className="button button-primary compact" type="button" onClick={loadProject} disabled={loading || !projectTitle.trim()}>
          {loading ? <LoaderCircle className="spin" size={15} /> : <Search size={15} />} Load
        </button>
      </div>

      <ErrorNotice error={error} title="The Git projection request failed." />

      {activeTab === "overview" && (
        <div className="git-overview">
          <div className="projection-hero">
            <div className="projection-icon"><GitBranch size={24} /></div>
            <div>
              <p className="eyebrow">Stored provider binding</p>
              <h2>{summary?.project?.title || projectTitle}</h2>
              <p>PostgreSQL is canonical. GitHub is a projection synchronized through explicit, bounded workflows.</p>
            </div>
            {summary?.project?.url && (
              <a className="button button-secondary compact" href={summary.project.url} target="_blank" rel="noreferrer">
                Open provider <ArrowUpRight size={15} />
              </a>
            )}
          </div>

          <div className="metrics-grid">
            <Metric label="Epics" value={summary?.epic_count} icon={Layers3} />
            <Metric label="Issues" value={summary?.issue_count} icon={ListTree} />
            <Metric label="Acceptance criteria" value={summary?.acceptance_criterion_count} icon={CircleCheck} />
            <Metric label="Comments" value={summary?.comment_count} icon={Boxes} />
          </div>

          <div className="overview-grid">
            <article className="content-card">
              <header><div><p className="eyebrow">Epic structure</p><h3>Canonical capability groups</h3></div><span>{epicRows.length}</span></header>
              <div className="epic-list">
                {epicRows.slice(0, 8).map((epic) => (
                  <button key={epic.id} type="button" onClick={() => { setActiveTab("backlog"); loadItem(epic.id); }}>
                    <span><strong>{epic.title}</strong><small>{epic.repository} · {epic.status}</small></span>
                    <b>{epic.issue_count ?? 0}</b>
                  </button>
                ))}
                {!epicRows.length && <p className="empty-copy">Load a project to display its epics.</p>}
              </div>
            </article>
            <article className="content-card provider-card">
              <header><div><p className="eyebrow">Provider metadata</p><h3>Current projection identity</h3></div><GitBranch size={19} /></header>
              <dl>
                <div><dt>Provider</dt><dd>{summary?.project?.provider || provider}</dd></div>
                <div><dt>Account</dt><dd>{providerAccount}</dd></div>
                <div><dt>Project number</dt><dd>{summary?.project?.number ?? "Not stored"}</dd></div>
                <div><dt>Project URL</dt><dd>{summary?.project?.url || "Not stored"}</dd></div>
              </dl>
            </article>
          </div>
        </div>
      )}

      {activeTab === "backlog" && (
        <div className="backlog-browser">
          <div className="backlog-table-wrap">
            <table className="data-table">
              <thead><tr><th>Item</th><th>Type</th><th>Repository</th><th>Status</th></tr></thead>
              <tbody>
                {itemRows.map((item) => (
                  <tr key={item.id} className={selectedItemId === item.id ? "selected" : ""} onClick={() => loadItem(item.id)}>
                    <td><strong>{item.title}</strong><small>{item.id}</small></td>
                    <td><span className="type-pill">{item.type}</span></td>
                    <td>{item.repository}</td>
                    <td><span className="status-pill">{item.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!itemRows.length && <div className="empty-state"><ListTree size={28} /><h2>No backlog items loaded</h2></div>}
          </div>
          <aside className="item-inspector">
            {itemLoading ? (
              <div className="panel-loading"><LoaderCircle className="spin" size={20} /> Loading item…</div>
            ) : selectedItem ? (
              <>
                <p className="eyebrow">{selectedItem.type}</p>
                <h2>{selectedItem.title}</h2>
                <div className="item-badges"><span>{selectedItem.status}</span><span>{selectedItem.repository}</span></div>
                <p className="item-description">{selectedItem.description || "No description."}</p>
                <h3>Acceptance criteria</h3>
                <ul>{selectedItem.acceptance_criteria?.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul>
                <h3>Provider metadata</h3>
                <JsonView value={selectedItem.provider_metadata || {}} />
              </>
            ) : (
              <div className="empty-state"><GitBranch size={26} /><h2>Select an item</h2><p>Inspect its canonical content and provider metadata.</p></div>
            )}
          </aside>
        </div>
      )}

      {activeTab === "reconcile" && (
        canOperate ? (
          <div className="reconcile-layout">
            <article className="reconcile-form-card">
              <div className="reconcile-heading"><div className="projection-icon"><RotateCcw size={22} /></div><div><p className="eyebrow">Bounded provider operation</p><h2>Reconcile canonical state</h2><p>Preview is the safe default. Confirmed mode executes the generated operation plan against GitHub.</p></div></div>
              <div className="mode-selector">
                <button type="button" className={mode === "dry-run" ? "active" : ""} onClick={() => setMode("dry-run")}><Search size={16} /><span><strong>Dry run</strong><small>Plan only</small></span></button>
                <button type="button" className={mode === "confirmed" ? "active danger" : ""} onClick={() => setMode("confirmed")}><Play size={16} /><span><strong>Confirmed</strong><small>Execute plan</small></span></button>
              </div>
              <label className="form-field"><span>Maximum operations</span><input type="number" min="1" value={maxOperations} onChange={(event) => setMaxOperations(event.target.value)} /></label>
              {mode === "confirmed" && (
                <div className="confirmation-box">
                  <AlertTriangle size={19} />
                  <div><strong>This writes to the provider projection.</strong><p>Type <code>RECONCILE</code> to enable execution.</p><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="RECONCILE" /></div>
                </div>
              )}
              <button className={`button ${mode === "confirmed" ? "button-danger" : "button-primary"}`} type="button" onClick={runReconciliation} disabled={loading || (mode === "confirmed" && confirmation !== "RECONCILE")}>
                {loading ? <LoaderCircle className="spin" size={16} /> : mode === "confirmed" ? <Play size={16} /> : <Search size={16} />}
                {mode === "confirmed" ? "Execute reconciliation" : "Preview reconciliation"}
              </button>
            </article>

            <article className="reconcile-results-card">
              <header><div><p className="eyebrow">Latest result</p><h2>Operation plan</h2></div>{reconciliation && <span className={reconciliation.complete ? "complete" : "partial"}>{reconciliation.complete ? "Complete" : "Remaining work"}</span>}</header>
              {reconciliation ? (
                <>
                  <div className="result-stats">
                    <div><strong>{reconciliation.total_operation_count}</strong><span>Total</span></div>
                    <div><strong>{reconciliation.execution_operation_count}</strong><span>Selected</span></div>
                    <div><strong>{reconciliation.remaining_operation_count}</strong><span>Remaining</span></div>
                  </div>
                  <div className="operations-list">
                    {reconciliation.operations.map((operation, index) => (
                      <div key={`${operation.kind}-${operation.item_id}-${index}`}><span>{operation.kind}</span><strong>{operation.title}</strong><code>{operation.item_id}</code></div>
                    ))}
                    {!reconciliation.operations.length && <p className="empty-copy">Canonical and provider state are already aligned.</p>}
                  </div>
                </>
              ) : (
                <div className="empty-state"><RotateCcw size={28} /><h2>No plan generated yet</h2><p>Run a dry preview to inspect the provider operations.</p></div>
              )}
            </article>
          </div>
        ) : (
          <ScopeGate scope="operate:backlogs" description="Reading projection state and executing reconciliation are separate permissions." />
        )
      )}

      {activeTab === "raw" && (
        <div className="raw-grid">
          <article><header><h2>Summary</h2><span>GET /summary</span></header><JsonView value={summary || {}} /></article>
          <article><header><h2>Items</h2><span>GET /items</span></header><JsonView value={items || {}} /></article>
          <article><header><h2>Reconciliation</h2><span>POST /reconciliation</span></header><JsonView value={reconciliation || {}} /></article>
        </div>
      )}
    </section>
  );
}
