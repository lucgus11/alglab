import { Suspense } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useTheme, useOnline } from "@/hooks";
import { usePWAStatus } from "@/pwa";
import Home from "@/pages/Home";
import Library from "@/pages/Library";
import CaseDetail from "@/pages/CaseDetail";
import Train from "@/pages/Train";
import Recognition from "@/pages/Recognition";
import Settings from "@/pages/Settings";

const TABS = [
  { to: "/", label: "Accueil", icon: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z", end: true },
  { to: "/library", label: "Cas", icon: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" },
  { to: "/train", label: "Entraîner", icon: "M12 8v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 1h6" },
  { to: "/recognition", label: "Reconnaître", icon: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" },
  { to: "/settings", label: "Réglages", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" },
] as const;

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

function Banner() {
  const pwa = usePWAStatus();
  const online = useOnline();
  if (pwa.needRefresh)
    return (
      <div className="flex items-center justify-between gap-3 bg-brand-600 px-4 py-2 text-sm text-white">
        <span>Une nouvelle version est disponible.</span>
        <button className="rounded-lg bg-white/20 px-3 py-1 font-semibold" onClick={pwa.update}>
          Mettre à jour
        </button>
      </div>
    );
  if (pwa.offlineReady)
    return (
      <div className="flex items-center justify-between gap-3 bg-emerald-600 px-4 py-2 text-sm text-white">
        <span>✓ Application prête : elle fonctionne maintenant hors-ligne.</span>
        <button className="rounded-lg bg-white/20 px-3 py-1 font-semibold" onClick={pwa.dismiss}>
          OK
        </button>
      </div>
    );
  if (!online) return <div className="bg-amber-500 px-4 py-1.5 text-center text-sm font-medium text-black">Mode hors-ligne — tout reste disponible.</div>;
  return null;
}

export default function App() {
  useTheme();
  const { pathname } = useLocation();
  // Les écrans d'entraînement utilisent toute la hauteur : on masque la barre du bas ne gêne pas, mais on garde la nav.
  const immersive = pathname.startsWith("/train");

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col sm:flex-row">
      {/* Navigation latérale (≥ sm) */}
      <nav className="hidden w-56 shrink-0 flex-col gap-1 p-4 sm:flex" aria-label="Navigation principale">
        <div className="mb-4 flex items-center gap-2 px-2 text-lg font-extrabold tracking-tight">
          <img src="/favicon.svg" alt="" className="h-8 w-8" />
          AlgLab
        </div>
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={"end" in t}
            className={({ isActive }) =>
              `flex min-h-11 items-center gap-3 rounded-xl px-3 font-semibold transition ${isActive ? "bg-brand-600 text-white" : "muted hover:bg-black/5 dark:hover:bg-white/5"}`
            }
          >
            <Icon d={t.icon} />
            {t.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Banner />
        <main className={`min-h-0 flex-1 overflow-y-auto ${immersive ? "" : "px-4 pt-4"} pb-24 sm:pb-6`}>
          <Suspense fallback={<div className="p-8 text-center muted">Chargement…</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/library" element={<Library />} />
              <Route path="/library/:setId" element={<Library />} />
              <Route path="/case/:caseId" element={<CaseDetail />} />
              <Route path="/train" element={<Train />} />
              <Route path="/recognition" element={<Recognition />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>

      {/* Barre d'onglets (mobile) : à portée du pouce */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur sm:hidden"
        style={{ paddingBottom: "var(--safe-bottom)" }}
        aria-label="Navigation principale"
      >
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={"end" in t}
            className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${isActive ? "text-brand-400" : "muted"}`}
          >
            <Icon d={t.icon} />
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
