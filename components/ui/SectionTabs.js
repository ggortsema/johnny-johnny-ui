"use client";

export default function SectionTabs({ tabs, activeTab, onChange, actions }) {
  return (
    <div className="section-tabs-row">
      <div className="section-tabs" role="tablist" aria-label="Section views">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`section-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
            {tab.badge !== undefined && <span className="tab-badge">{tab.badge}</span>}
          </button>
        ))}
      </div>
      {actions && <div className="section-actions">{actions}</div>}
    </div>
  );
}
