import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ALL_SETS, getSet, referenceView } from "@/core/algsets";
import type { AlgCase } from "@/core/algsets";
import type { Status } from "@/core/srs";
import { STATUS_LABEL, statusOf, useStore } from "@/store/useStore";
import { CaseDiagram } from "@/components/CaseDiagram";
import { StatusBadge } from "@/components/StatusBadge";

const STATUSES: Status[] = ["todo", "learning", "mastered"];

export default function Library() {
  const { setId = "oll" } = useParams();
  const navigate = useNavigate();
  const set = getSet(setId) ?? ALL_SETS[0]!;
  const records = useStore((s) => s.records);
  const setStatus = useStore((s) => s.setStatus);

  const [query, setQuery] = useState("");
  const [families, setFamilies] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = <T,>(arr: T[], v: T): T[] => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return set.cases.filter((c) => {
      if (families.length && !families.includes(c.family)) return false;
      if (statuses.length && !statuses.includes(statusOf(records, c.id))) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || (c.nickname ?? "").toLowerCase().includes(q) || String(c.number ?? "") === q;
    });
  }, [set, query, families, statuses, records]);

  const grouped = useMemo(() => {
    return set.families
      .map((f) => ({ family: f, cases: filtered.filter((c) => c.family === f.id) }))
      .filter((g) => g.cases.length > 0);
  }, [set, filtered]);

  const onCardClick = (c: AlgCase) => {
    if (selectMode) {
      setSelected((prev) => {
        const n = new Set(prev);
        if (n.has(c.id)) n.delete(c.id);
        else n.add(c.id);
        return n;
      });
    } else navigate(`/case/${c.id}`);
  };

  const applyBulk = (status: Status) => {
    setStatus([...selected], status);
    setSelected(new Set());
    setSelectMode(false);
  };

  const selectAllVisible = () => setSelected(new Set(filtered.map((c) => c.id)));

  return (
    <div className="mx-auto max-w-5xl pb-24">
      <div className="sticky top-0 z-10 -mx-4 space-y-3 bg-[var(--bg)]/95 px-4 pb-3 pt-1 backdrop-blur">
        <div className="grid grid-cols-2 gap-1 rounded-2xl surface-2 p-1">
          {ALL_SETS.map((s) => (
            <Link
              key={s.id}
              to={`/library/${s.id}`}
              onClick={() => {
                setFamilies([]);
                setSelected(new Set());
              }}
              className={`flex min-h-11 items-center justify-center rounded-xl font-bold ${s.id === set.id ? "bg-brand-600 text-white" : "muted"}`}
            >
              {s.shortName} <span className="ml-1 text-xs font-medium opacity-70">({s.cases.length})</span>
            </Link>
          ))}
        </div>

        <div className="flex gap-2">
          <input className="input" type="search" placeholder="Rechercher un cas…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Rechercher un cas" />
          <button className="btn shrink-0" aria-pressed={selectMode} onClick={() => { setSelectMode((v) => !v); setSelected(new Set()); }}>
            {selectMode ? "Terminer" : "Sélection"}
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrer par statut">
          {STATUSES.map((s) => (
            <button key={s} className="chip" aria-pressed={statuses.includes(s)} onClick={() => setStatuses((p) => toggle(p, s))}>
              {STATUS_LABEL[s]}
            </button>
          ))}
          <span className="mx-1 w-px shrink-0 bg-[var(--border)]" />
          {set.families.map((f) => (
            <button key={f.id} className="chip" aria-pressed={families.includes(f.id)} onClick={() => setFamilies((p) => toggle(p, f.id))}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {grouped.length === 0 && <p className="py-12 text-center muted">Aucun cas ne correspond à ces filtres.</p>}

      {grouped.map(({ family, cases }) => (
        <section key={family.id} className="mb-6">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-bold">{family.label}</h2>
            <span className="text-xs muted">{cases.length} cas</span>
          </div>
          {family.description && <p className="mb-2 text-xs muted">{family.description}</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {cases.map((c) => {
              const status = statusOf(records, c.id);
              const isSel = selected.has(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => onCardClick(c)}
                  className={`surface flex flex-col items-center gap-2 rounded-2xl p-3 text-left transition active:scale-[0.98] ${isSel ? "ring-2 ring-brand-500" : ""}`}
                  aria-pressed={selectMode ? isSel : undefined}
                >
                  <CaseDiagram view={referenceView(c)} size="78%" title={c.name} />
                  <div className="w-full">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold">{c.name.replace("-perm", "")}</span>
                      <StatusBadge status={status} compact />
                    </div>
                    <div className="h-4 truncate text-xs muted">{c.nickname ?? " "}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {selectMode && (
        <div className="fixed inset-x-0 bottom-16 z-20 mx-auto max-w-xl px-4 sm:bottom-4">
          <div className="surface flex flex-wrap items-center gap-2 rounded-2xl p-3 shadow-xl">
            <span className="mr-auto text-sm font-semibold">{selected.size} sélectionné(s)</span>
            <button className="btn !min-h-10 text-sm" onClick={selectAllVisible}>
              Tout
            </button>
            {STATUSES.map((s) => (
              <button key={s} className="btn !min-h-10 text-sm" disabled={selected.size === 0} onClick={() => applyBulk(s)}>
                → {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
