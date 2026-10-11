import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Activity, Map, LayoutDashboard, TrendingUp, History, GitCompare, Trees, Menu, X, Bot } from "lucide-react";

const navLinks = [
  { to: "/map",         label: "Map",       icon: Map },
  { to: "/dashboard",   label: "Dashboard", icon: LayoutDashboard },
  { to: "/history",     label: "History",   icon: History },
  { to: "/forecast",    label: "Forecast",  icon: TrendingUp },
  { to: "/compare",     label: "Compare",   icon: GitCompare },
  { to: "/greenery",    label: "Greenery",  icon: Trees },
  { to: "/eco-analyst", label: "Eco Agent", icon: Bot },
];

const C = {
  nav: "hsl(200,15%,62%)",
  navActive: "hsl(152,56%,48%)",
  bg: "hsl(222,47%,6%)",
  border: "hsl(222,25%,18%)",
  card: "hsl(222,40%,9%)",
  muted: "hsl(222,30%,14%)",
};

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  return (
    <>
      <style>{`
        .pp-nav-links { display: flex; align-items: center; gap: 2px; }
        .pp-hamburger { display: none; }
        .pp-mobile-menu { display: none; }
        @media (max-width: 768px) {
          .pp-nav-links { display: none !important; }
          .pp-hamburger { display: flex !important; }
          .pp-mobile-menu { display: flex !important; }
        }
      `}</style>

      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
        borderBottom: `1px solid ${C.border}`,
        background: "rgba(10,13,26,0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>

          {/* Main row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>

            {/* Logo */}
            <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
              <span style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 36, height: 36, borderRadius: 10,
                background: "hsl(152,56%,48%,0.12)",
                border: "1px solid hsl(152,56%,48%,0.28)",
              }}>
                <Activity size={18} color="hsl(152,56%,48%)" />
              </span>
              <span style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.02em", color: "hsl(160,20%,96%)" }}>
                PLANET
                <span style={{
                  background: "linear-gradient(135deg,hsl(152,56%,48%),hsl(190,85%,50%))",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                }}>PULSE</span>
              </span>
            </Link>

            {/* Desktop links */}
            <div className="pp-nav-links">
              {navLinks.map(({ to, label, icon: Icon }) => {
                const active = loc.pathname === to;
                return (
                  <Link key={to} to={to} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 11px", borderRadius: 8,
                    fontSize: "0.8125rem", fontWeight: 500,
                    color: active ? C.navActive : C.nav,
                    background: active ? "hsl(152,56%,48%,0.1)" : "transparent",
                    border: active ? "1px solid hsl(152,56%,48%,0.22)" : "1px solid transparent",
                    transition: "all 0.15s",
                    textDecoration: "none",
                  }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = C.muted; e.currentTarget.style.color = "hsl(160,20%,96%)"; }}}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.nav; }}}
                  >
                    <Icon size={13} />
                    {label}
                  </Link>
                );
              })}
            </div>

            {/* Hamburger */}
            <button className="pp-hamburger" onClick={() => setOpen(o => !o)}
              style={{ alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.nav }}>
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

          {/* Mobile menu */}
          {open && (
            <div className="pp-mobile-menu" style={{ flexDirection: "column", gap: 2, paddingBottom: 12, borderTop: `1px solid ${C.border}` }}>
              {navLinks.map(({ to, label, icon: Icon }) => {
                const active = loc.pathname === to;
                return (
                  <Link key={to} to={to} onClick={() => setOpen(false)} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", borderRadius: 8, marginTop: 4,
                    fontSize: "0.875rem", fontWeight: 500,
                    color: active ? C.navActive : C.nav,
                    background: active ? "hsl(152,56%,48%,0.1)" : "transparent",
                    textDecoration: "none",
                  }}>
                    <Icon size={15} />
                    {label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </header>
    </>
  );
}
