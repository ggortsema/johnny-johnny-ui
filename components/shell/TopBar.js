"use client";

import { ChevronDown, LogOut, Menu, Settings, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function initials(user) {
  const source = user?.name || user?.email || "JJ";
  return source
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function TopBar({
  sectionTitle,
  sectionDescription,
  user,
  onOpenSettings,
  onLogout,
  onOpenMobileNav,
  health,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function onDocumentClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  return (
    <header className="workspace-topbar">
      <button className="mobile-menu-button" type="button" onClick={onOpenMobileNav} aria-label="Open navigation">
        <Menu size={20} />
      </button>
      <div className="topbar-title">
        <div className="title-line">
          <h1>{sectionTitle}</h1>
          {health && (
            <span className={`health-pill ${health.status === "ok" ? "healthy" : "unhealthy"}`}>
              <span /> Agent {health.status === "ok" ? "online" : "unavailable"}
            </span>
          )}
        </div>
        <p>{sectionDescription}</p>
      </div>

      <div className="user-menu" ref={menuRef}>
        <button
          type="button"
          className="user-menu-trigger"
          onClick={() => setMenuOpen((value) => !value)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          {user?.picture ? <img src={user.picture} alt="" referrerPolicy="no-referrer" /> : <span>{initials(user)}</span>}
          <div>
            <strong>{user?.name || "Signed in"}</strong>
            <small>{user?.email || "Auth0 account"}</small>
          </div>
          <ChevronDown size={15} />
        </button>
        {menuOpen && (
          <div className="user-menu-popover" role="menu">
            <div className="user-menu-heading">
              <UserRound size={17} />
              <div><strong>{user?.name || "Johnny-Johnny user"}</strong><small>{user?.email || user?.sub}</small></div>
            </div>
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onOpenSettings(); }}>
              <Settings size={16} /> Settings
            </button>
            <button type="button" role="menuitem" onClick={onLogout}>
              <LogOut size={16} /> Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
