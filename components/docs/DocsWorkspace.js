"use client";

import { BookOpenText, CalendarDays, FileText, Search, Tags } from "lucide-react";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import docsManifest from "@/generated/docs-manifest.json";
import SectionTabs from "@/components/ui/SectionTabs";

function MarkdownDocument({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a({ href, children }) {
          const external = href?.startsWith("http://") || href?.startsWith("https://");
          return <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>{children}</a>;
        },
        code({ className, children, ...props }) {
          const block = Boolean(className);
          return block ? <code className={className} {...props}>{children}</code> : <code className="inline-code" {...props}>{children}</code>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function sectionGroups(documents) {
  const groups = new Map();
  for (const document of documents) {
    const existing = groups.get(document.section) || { key: document.section, label: document.sectionLabel, documents: [] };
    existing.documents.push(document);
    groups.set(document.section, existing);
  }
  return [...groups.values()].sort((left, right) => left.label.localeCompare(right.label));
}

export default function DocsWorkspace() {
  const documents = docsManifest.documents || [];
  const [activeTab, setActiveTab] = useState("browse");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(documents[0]?.id || null);

  const filteredDocuments = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return documents;
    return documents.filter((document) =>
      [document.title, document.summary, document.relativePath, document.content]
        .join("\n")
        .toLowerCase()
        .includes(needle)
    );
  }, [documents, query]);

  const groups = useMemo(() => sectionGroups(filteredDocuments), [filteredDocuments]);
  const allGroups = useMemo(() => sectionGroups(documents), [documents]);
  const selected = filteredDocuments.find((document) => document.id === selectedId)
    || filteredDocuments[0]
    || (query.trim() ? null : documents[0]);

  return (
    <section className="section-surface docs-surface">
      <SectionTabs
        tabs={[
          { id: "browse", label: "Browse", badge: documents.length },
          { id: "catalog", label: "Catalog" },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        actions={
          <label className="docs-search">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ADRs" aria-label="Search architecture decision records" />
          </label>
        }
      />

      {activeTab === "browse" ? (
        <div className="docs-browser">
          <aside className="docs-index" aria-label="Architecture decision records">
            <div className="docs-index-heading">
              <span><BookOpenText size={17} /> Agent ADRs</span>
              <small>{filteredDocuments.length} shown</small>
            </div>
            <div className="docs-index-scroll">
              {groups.map((group) => (
                <div className="doc-group" key={group.key}>
                  <h3>{group.label}</h3>
                  {group.documents.map((document) => (
                    <button
                      type="button"
                      key={document.id}
                      onClick={() => setSelectedId(document.id)}
                      className={`doc-index-item ${selected?.id === document.id ? "active" : ""}`}
                    >
                      <FileText size={15} />
                      <span><strong>{document.title}</strong><small>{document.relativePath}</small></span>
                    </button>
                  ))}
                </div>
              ))}
              {filteredDocuments.length === 0 && <p className="empty-copy">No ADR matches “{query}”.</p>}
            </div>
          </aside>

          <article className="doc-reader">
            {selected ? (
              <>
                <header className="doc-reader-header">
                  <div>
                    <p className="eyebrow">{selected.sectionLabel}</p>
                    <h2>{selected.title}</h2>
                  </div>
                  <div className="doc-metadata">
                    {selected.status && <span><Tags size={14} />{selected.status}</span>}
                    {selected.date && <span><CalendarDays size={14} />{selected.date}</span>}
                    <code>{selected.sourcePath}</code>
                  </div>
                </header>
                <div className="markdown-body"><MarkdownDocument content={selected.content} /></div>
              </>
            ) : (
              <div className="empty-state"><BookOpenText size={28} /><h2>No documents imported</h2></div>
            )}
          </article>
        </div>
      ) : (
        <div className="docs-catalog">
          <div className="catalog-hero">
            <div><p className="eyebrow">Build-time knowledge</p><h2>{documents.length} architecture decisions ready to read.</h2></div>
            <div className="catalog-stat"><strong>{allGroups.length}</strong><span>collections</span></div>
            <div className="catalog-stat"><strong>{docsManifest.count}</strong><span>markdown files</span></div>
          </div>
          <div className="catalog-grid">
            {allGroups.map((group) => (
              <article key={group.key}>
                <div className="catalog-card-heading"><BookOpenText size={18} /><span>{group.documents.length} docs</span></div>
                <h3>{group.label}</h3>
                <p>{group.documents.slice(0, 3).map((document) => document.title).join(" · ")}</p>
                <button type="button" onClick={() => { setQuery(""); setSelectedId(group.documents[0]?.id); setActiveTab("browse"); }}>Open collection</button>
              </article>
            ))}
          </div>
          <div className="import-note">
            <FileText size={19} />
            <div><strong>Imported during the UI build</strong><p>Source: <code>{docsManifest.source}</code>. The deploy script stages the canonical agent docs into the Docker build context before <code>next build</code>.</p></div>
          </div>
        </div>
      )}
    </section>
  );
}
