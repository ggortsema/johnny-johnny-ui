"use client";

import { Bot, BookOpenText, GitBranch, PanelLeftClose, PanelLeftOpen } from "lucide-react";

const navigation = [
  { id: "assistant", label: "Assistant", icon: Bot, description: "Chat with the agent" },
  { id: "docs", label: "Docs", icon: BookOpenText, description: "Read imported ADRs" },
  { id: "git", label: "Git", icon: GitBranch, description: "Inspect projection state" },
];

export default function Sidebar({
  activeSection,
  onSelect,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
}) {
  return (
    <aside className={`app-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
      <div className="sidebar-brand">
        <span className="brand-mark">JJ</span>
        {!collapsed && (
          <span>
            <strong>Johnny-Johnny</strong>
            <small>Agent workspace</small>
          </span>
        )}
      </div>

      <nav className="sidebar-nav" aria-label="Workspace sections">
        {navigation.map(({ id, label, icon: Icon, description }) => (
          <button
            key={id}
            type="button"
            className={`sidebar-link ${activeSection === id ? "active" : ""}`}
            onClick={() => onSelect(id)}
            aria-current={activeSection === id ? "page" : undefined}
            title={collapsed ? label : undefined}
          >
            <Icon size={19} />
            {!collapsed && (
              <span>
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        {!collapsed && (
          <div className="canonical-note">
            <span className="status-dot" />
            <div><strong>Canonical runtime</strong><small>PostgreSQL</small></div>
          </div>
        )}
        <button
          type="button"
          className="sidebar-collapse"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <><PanelLeftClose size={18} /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}
