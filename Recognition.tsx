import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ALL_SETS, buildInstance, getCase, getSet } from "@/core/algsets";
import type { AlgCase } from "@/core/algsets";
import { eligibleCases } from "@/core/trainer";
import { weightedPick, type Status } from "@/core/srs";
import { llView, type LLView } from "@/core/cube/sim";
import { preferredVariant, STATUS_LABEL, useStore } from "@/store/useStore";
import { CaseDiagram } from "@/components/CaseDiagram";
import { AlgText } from "@/components/AlgText";

const STATUSES: Status[] = ["todo", "learning", "mastered"];

interface Round {
  c: AlgCase;
  view: LLView;
  choices: AlgCase[];
}

const shuffle = <T,>(a: T[]): T[] => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j]!, r[i]!];
  }
  return r;
};

function label(c: AlgCase) {
  return c.setId === "pll" ? c.name.replace("-perm", "") : c.name;
}

export default function Recognition() {
  const [params] = useSearchParams();
  const records = useStore((s) => s.records);
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const recordRecognition = useStore((s) => s.recordRecognition);

  const targeted = params.get("case") ? getCase(params.get("case")!) : undefined;
  const [setId, setSetId] = useState(targeted?.setId ?? params.get("set") ?? "pll");
  const [statuses, setStatuses] = useState<Status[]>(STATUSES);
  const [running, setRunning] = useState(false);

  const set = getSet(setId) ?? ALL_SETS[0]!;
  const pool = useMemo(
    () => eligibleCases({ set, statuses, onlyIds: targeted && targeted.setId === set.id ? [targeted.id] : undefined }, records),
    [set, statuses, records, targeted],
  );

  const [round, setRound] = useState<Round | null>(null);
  const [phase, setPhase] = useState<"ready" | "show" | "answer" | "feedback">("ready");
  const [picked, setPicked] = useState<string | null>(null);
  const [ms, setMs] = useState(0);
  const [score, setScore] = useState({ ok: 0, total: 0, streak: 0 });
  const [barKey, setBarKey] = useState(0);
  const t0 = useRef(0);
  const hideTimer = useRef(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const newRound = useCallback((): Round | null => {
    if (pool.length === 0) return null;
    const { recog, preferred, custom } = useStore.getState();
    const c = weightedPick(
      pool,
      (x) => {
        const r = recog[x.id];
        return r ? 1 + (1 - r.correct / r.seen) * 4 : 2.5;
      },
      (x) => x.id,
      round?.c.id,
    )!;
    const alg = preferredVariant(c, preferred, custom).alg;
    const inst = buildInstance(alg, Math.floor(Math.random() * 4), set.randomPostAUF ? Math.floor(Math.random() * 4) : 0);
    const n = Math.min(settings.recognitionChoices, set.cases.length);
    const sameFam = shuffle(set.cases.filter((x) => x.id !== c.id && x.family === c.family));
    const others = shuffle(set.cases.filter((x) => x.id !== c.id && x.family !== c.family));
    const distractors = [...sameFam, ...others].slice(0, n - 1);
    return { c, view: llView(inst.state), choices: shuffle([c, ...distractors]) };
  }, [pool, set, settings.recognitionChoices, round?.c.id]);

  const show = useCallback(() => {
    const r = newRound();
    if (!r) return;
    setRound(r);
    setPicked(null);
    setPhase("show");
    setBarKey((k) => k + 1);
    t0.current = performance.now();
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setPhase("answer"), settings.recognitionMs);
  }, [newRound, settings.recognitionMs]);

  const answer = useCallback(
    (c: AlgCase) => {
      if (!round || (phaseRef.current !== "answer" && phaseRef.current !== "show")) return;
      window.clearTimeout(hideTimer.current);
      const elapsed = performance.now() - t0.current;
      const ok = c.id === round.c.id;
      setMs(elapsed);
      setPicked(c.id);
      setPhase("feedback");
      recordRecognition(round.c.id, ok, elapsed);
      setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), total: s.total + 1, streak: ok ? s.streak + 1 : 0 }));
    },
    [round, recordRecognition],
  );

  useEffect(() => {
    if (!running) return;
    const onKey = (e: KeyboardEvent) => {
      const p = phaseRef.current;
      if (p === "ready" && (e.code === "Space" || e.key === "Enter")) {
        e.preventDefault();
        show();
      } else if (p === "feedback" && (e.code === "Space" || e.key === "Enter")) {
        e.preventDefault();
        show();
      } else if ((p === "answer" || p === "show") && /^[1-9]$/.test(e.key)) {
        const c = round?.choices[Number(e.key) - 1];
        if (c) answer(c);
      } else if (e.key === "Escape") setRunning(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, show, answer, round]);

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  if (!running) {
    return (
      <div className="mx-auto max-w-xl space-y-4 pb-4">
        <h1 className="text-2xl font-extrabold">Reconnaissance</h1>
        <p className="text-sm muted">
          Entraîne la reconnaissance « 2-sided » : le haut du cube et deux faces latérales (avant et droite) s'affichent un court instant, puis il faut retrouver le cas de mémoire. Les cas que tu rates reviennent plus souvent.
        </p>
        <section className="surface space-y-4 rounded-3xl p-5">
          <div className="grid grid-cols-2 gap-1 rounded-2xl surface-2 p-1">
            {ALL_SETS.map((s) => (
              <button key={s.id} className={`min-h-11 rounded-xl font-bold ${s.id === setId ? "bg-brand-600 text-white" : "muted"}`} onClick={() => setSetId(s.id)}>
                {s.shortName}
              </button>
            ))}
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold">Cas inclus</div>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button key={s} className="chip !py-2" aria-pressed={statuses.includes(s)} onClick={() => setStatuses((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))}>
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <div className="mb-1 flex justify-between text-sm font-semibold">
              <span>Durée d'affichage</span>
              <span>{(settings.recognitionMs / 1000).toFixed(1)} s</span>
            </div>
            <input type="range" min={300} max={4000} step={100} value={settings.recognitionMs} onChange={(e) => update({ recognitionMs: Number(e.target.value) })} className="w-full accent-indigo-500" />
          </label>
          <label className="block">
            <div className="mb-1 flex justify-between text-sm font-semibold">
              <span>Nombre de choix</span>
              <span>{settings.recognitionChoices}</span>
            </div>
            <input type="range" min={3} max={9} step={1} value={settings.recognitionChoices} onChange={(e) => update({ recognitionChoices: Number(e.target.value) })} className="w-full accent-indigo-500" />
          </label>
        </section>
        <button className="btn btn-primary w-full !min-h-14 text-base" disabled={pool.length === 0} onClick={() => { setScore({ ok: 0, total: 0, streak: 0 }); setPhase("ready"); setRound(null); setRunning(true); }}>
          {pool.length === 0 ? "Aucun cas disponible" : `Commencer · ${pool.length} cas`}
        </button>
      </div>
    );
  }

  const correct = picked != null && round && picked === round.c.id;
  const { preferred, custom } = useStore.getState();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3 pb-4">
      <header className="flex items-center justify-between">
        <button className="btn !min-h-10" onClick={() => setRunning(false)}>
          ✕ Quitter
        </button>
        <div className="text-sm font-semibold">
          {score.ok}/{score.total} · série {score.streak}
        </div>
      </header>

      <div className="surface grid aspect-square w-full place-items-center rounded-3xl p-4">
        {phase === "ready" && (
          <button className="btn btn-primary !min-h-16 px-8 text-lg" onClick={show}>
            Afficher le cas
          </button>
        )}
        {phase === "show" && round && (
          <div className="w-full max-w-xs">
            <CaseDiagram view={round.view} sides="two" />
            <div className="mt-3 h-1.5 overflow-hidden rounded-full surface-2">
              <div key={barKey} className="h-full origin-left bg-brand-500" style={{ animation: `rbar ${settings.recognitionMs}ms linear forwards` }} />
            </div>
          </div>
        )}
        {phase === "answer" && <div className="text-center text-xl font-bold muted">Quel est ce cas ?</div>}
        {phase === "feedback" && round && (
          <div className="w-full max-w-xs text-center">
            <CaseDiagram view={round.view} sides="all" />
            <div className={`mt-3 text-xl font-extrabold ${correct ? "text-emerald-400" : "text-red-400"}`}>
              {correct ? "Correct !" : `C'était ${label(round.c)}`} <span className="text-sm font-medium muted">({(ms / 1000).toFixed(2)} s)</span>
            </div>
            {!correct && picked && <div className="text-sm muted">Tu as répondu {label(round.choices.find((c) => c.id === picked)!)}</div>}
            <div className="mt-2 rounded-xl surface-2 p-2 text-sm">
              <AlgText alg={preferredVariant(round.c, preferred, custom).alg} />
            </div>
          </div>
        )}
      </div>

      {(phase === "show" || phase === "answer") && round && (
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Choisis le cas">
          {round.choices.map((c, i) => (
            <button key={c.id} disabled={phase === "show" && false} onClick={() => answer(c)} className="btn !h-auto flex-col !gap-0 py-3">
              <span className="text-xl font-extrabold">{label(c)}</span>
              {c.nickname && c.setId === "oll" && <span className="text-[11px] font-normal muted">{c.nickname}</span>}
              <span className="text-[10px] font-normal muted">{i + 1}</span>
            </button>
          ))}
        </div>
      )}
      {phase === "feedback" && (
        <button className="btn btn-primary !min-h-14 text-base" onClick={show}>
          Suivant
        </button>
      )}
      <style>{`@keyframes rbar{from{transform:scaleX(1)}to{transform:scaleX(0)}}`}</style>
    </div>
  );
}
