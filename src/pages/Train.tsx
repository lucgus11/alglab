import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ALL_SETS, getCase, getSet } from "@/core/algsets";
import { eligibleCases } from "@/core/trainer";
import { summarize } from "@/core/stats";
import type { Status } from "@/core/srs";
import { STATUS_LABEL, useStore } from "@/store/useStore";
import ClassicSession from "@/components/train/ClassicSession";
import SmartSession from "@/components/train/SmartSession";
import type { SessionConfig } from "@/components/train/session";

const STATUSES: Status[] = ["todo", "learning", "mastered"];
const LS_KEY = "alglab:train-cfg";

interface Saved {
  statuses: Status[];
  selection: "smart" | "random";
  mode: "classic" | "smart";
}

function loadSaved(): Partial<Saved> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "{}") as Partial<Saved>;
  } catch {
    return {};
  }
}

export default function Train() {
  const [params, setParams] = useSearchParams();
  const records = useStore((s) => s.records);
  const saved = useMemo(loadSaved, []);

  const caseParam = params.get("case");
  const targeted = caseParam ? getCase(caseParam) : undefined;
  const dueParam = params.get("due") === "1";

  const bestDueSet = useMemo(() => {
    const sums = ALL_SETS.map((s) => ({ s, due: summarize(s, records).due }));
    return sums.sort((a, b) => b.due - a.due)[0]!.s.id;
  }, [records]);

  const initialSet = targeted?.setId ?? params.get("set") ?? (dueParam ? bestDueSet : (ALL_SETS[0]!.id));
  const [setId, setSetId] = useState(getSet(initialSet) ? initialSet : ALL_SETS[0]!.id);
  const [statuses, setStatuses] = useState<Status[]>(saved.statuses ?? (dueParam ? ["learning", "mastered"] : ["todo", "learning"]));
  const [dueOnly, setDueOnly] = useState(dueParam);
  const [selection, setSelection] = useState<"smart" | "random">(saved.selection ?? "smart");
  const [mode, setMode] = useState<"classic" | "smart">(saved.mode ?? "classic");
  const [session, setSession] = useState<SessionConfig | null>(null);

  const set = getSet(setId)!;
  const onlyIds = targeted && targeted.setId === setId ? [targeted.id] : undefined;
  const pool = useMemo(
    () => eligibleCases({ set, statuses: onlyIds ? STATUSES : statuses, dueOnly: onlyIds ? false : dueOnly, onlyIds }, records),
    [set, statuses, dueOnly, onlyIds, records],
  );

  const start = () => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ statuses, selection, mode } satisfies Saved));
    } catch {
      /* stockage indisponible : sans importance */
    }
    setSession({ setId, statuses: onlyIds ? STATUSES : statuses, dueOnly: onlyIds ? false : dueOnly, onlyIds, selection, mode });
  };

  if (session) {
    const exit = () => setSession(null);
    return (
      <div className="mx-auto h-full max-w-2xl">
        {session.mode === "smart" ? <SmartSession cfg={session} onExit={exit} /> : <ClassicSession cfg={session} onExit={exit} />}
      </div>
    );
  }

  const toggleStatus = (s: Status) => setStatuses((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 pt-4">
      <h1 className="text-2xl font-extrabold">Entraînement</h1>

      {targeted && (
        <div className="surface flex items-center justify-between gap-3 rounded-2xl p-4">
          <div>
            <div className="text-xs muted">Cas ciblé</div>
            <div className="font-bold">
              {targeted.name}
              {targeted.nickname ? ` · ${targeted.nickname}` : ""}
            </div>
          </div>
          <button className="btn !min-h-10" onClick={() => { params.delete("case"); setParams(params, { replace: true }); }}>
            Tous les cas
          </button>
        </div>
      )}

      <section className="surface space-y-4 rounded-3xl p-5">
        <div>
          <div className="mb-2 text-sm font-semibold">Set</div>
          <div className="grid grid-cols-2 gap-1 rounded-2xl surface-2 p-1">
            {ALL_SETS.map((s) => (
              <button key={s.id} disabled={!!targeted && targeted.setId !== s.id} className={`min-h-11 rounded-xl font-bold ${s.id === setId ? "bg-brand-600 text-white" : "muted"}`} onClick={() => setSetId(s.id)}>
                {s.shortName}
              </button>
            ))}
          </div>
        </div>

        {!onlyIds && (
          <>
            <div>
              <div className="mb-2 text-sm font-semibold">Cas à travailler</div>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button key={s} className="chip !py-2" aria-pressed={statuses.includes(s)} onClick={() => toggleStatus(s)}>
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
              <span>
                <span className="font-semibold">Révisions dues uniquement</span>
                <span className="block text-xs muted">Cas à revoir selon la répétition espacée</span>
              </span>
              <input type="checkbox" className="h-6 w-6 accent-indigo-500" checked={dueOnly} onChange={(e) => setDueOnly(e.target.checked)} />
            </label>

            <div>
              <div className="mb-2 text-sm font-semibold">Tirage</div>
              <div className="grid grid-cols-2 gap-1 rounded-2xl surface-2 p-1">
                <button className={`min-h-11 rounded-xl text-sm font-bold ${selection === "smart" ? "bg-brand-600 text-white" : "muted"}`} onClick={() => setSelection("smart")}>
                  Intelligent
                </button>
                <button className={`min-h-11 rounded-xl text-sm font-bold ${selection === "random" ? "bg-brand-600 text-white" : "muted"}`} onClick={() => setSelection("random")}>
                  Aléatoire
                </button>
              </div>
              {selection === "smart" && <p className="mt-1 text-xs muted">Les cas lents, oubliés ou en retard reviennent plus souvent.</p>}
            </div>
          </>
        )}

        <div>
          <div className="mb-2 text-sm font-semibold">Cube</div>
          <div className="grid grid-cols-2 gap-1 rounded-2xl surface-2 p-1">
            <button className={`min-h-11 rounded-xl text-sm font-bold ${mode === "classic" ? "bg-brand-600 text-white" : "muted"}`} onClick={() => setMode("classic")}>
              Classique
            </button>
            <button className={`min-h-11 rounded-xl text-sm font-bold ${mode === "smart" ? "bg-brand-600 text-white" : "muted"}`} onClick={() => setMode("smart")}>
              Smart cube
            </button>
          </div>
          <p className="mt-1 text-xs muted">
            {mode === "classic" ? "Mélange affiché, chrono à l'espace ou au toucher, auto-évaluation." : "Bluetooth : chrono et validation automatiques, sans toucher l'écran."}
          </p>
        </div>
      </section>

      <button className="btn btn-primary w-full !min-h-14 text-base" disabled={pool.length === 0} onClick={start}>
        {pool.length === 0 ? "Aucun cas disponible" : `Commencer · ${pool.length} cas`}
      </button>
      {pool.length === 0 && <p className="text-center text-sm muted">Sélectionne d'autres statuts ou désactive « Révisions dues uniquement ».</p>}
    </div>
  );
}
