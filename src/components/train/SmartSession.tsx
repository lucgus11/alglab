import { useCallback, useEffect, useRef, useState } from "react";
import { CaseDiagram } from "@/components/CaseDiagram";
import { AlgText } from "@/components/AlgText";
import { ConnectPanel, MoveSequence, RatingBar, VirtualPad, RATING_META } from "./parts";
import { drawRep, type SessionConfig } from "./session";
import type { Rep } from "@/core/trainer";
import { getSet, goalReached } from "@/core/algsets";
import { parseAlg, simplifyMoves, type Move } from "@/core/cube/notation";
import { llView, statesEqual } from "@/core/cube/sim";
import { autoRate, formatMs, type Rating } from "@/core/srs";
import { GuidedPath } from "@/core/smart/tracker";
import { useSmart } from "@/core/smart/SmartContext";
import { useStore } from "@/store/useStore";
import { useElapsed, useWakeLock, vibrate } from "@/hooks";

type Phase = "scramble" | "ready" | "solving" | "done" | "blocked";
const AUTO_COMMIT_MS = 2400;

interface Result {
  ms: number;
  moves: number;
  recMs: number | null;
  rating: Rating;
}

export default function SmartSession({ cfg, onExit }: { cfg: SessionConfig; onExit: () => void }) {
  const { cube, tracker, status, disconnect } = useSmart();
  const settings = useStore((s) => s.settings);
  const recordAttempt = useStore((s) => s.recordAttempt);
  const set = getSet(cfg.setId)!;

  const [rep, setRep] = useState<Rep | null>(() => drawRep(cfg));
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<Phase>("scramble");
  const [todo, setTodo] = useState<Move[]>([]);
  const [startAt, setStartAt] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [showAlg, setShowAlg] = useState(false);
  const [battery, setBattery] = useState<number | null>(null);

  const repRef = useRef<Rep | null>(rep);
  const phaseRef = useRef<Phase>("scramble");
  const guided = useRef<GuidedPath | null>(null);
  const t0 = useRef(0);
  const readyAt = useRef(0);
  const movesRef = useRef(0);
  const commitTimer = useRef<number>(0);
  const resultRef = useRef<Result | null>(null);

  const go = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  useWakeLock(status === "connected");
  const elapsed = useElapsed(phase === "solving", startAt);

  /** Calcule le chemin depuis l'état actuel du cube jusqu'au cas, et démarre la phase de mélange. */
  const beginRep = useCallback(
    (r: Rep | null) => {
      repRef.current = r;
      setRep(r);
      setResult(null);
      resultRef.current = null;
      setStartAt(null);
      setShowAlg(false);
      movesRef.current = 0;
      if (!r) return;
      if (!tracker.pathKnown) {
        go("blocked");
        return;
      }
      const path = simplifyMoves([...tracker.pathToSolved(), ...r.instance.setupMoves]);
      guided.current = new GuidedPath(path);
      setTodo([...guided.current.todo]);
      if (guided.current.done) {
        readyAt.current = performance.now();
        go("ready");
      } else go("scramble");
    },
    [tracker],
  );

  // Premier tirage
  useEffect(() => {
    beginRep(repRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = useCallback(
    (rating: Rating) => {
      window.clearTimeout(commitTimer.current);
      const r = repRef.current;
      const res = resultRef.current;
      if (!r || !res || phaseRef.current !== "done") return;
      recordAttempt(r.case.id, { at: Date.now(), ms: res.ms, rating, mode: "smart", recMs: res.recMs });
      setCount((n) => n + 1);
      if (rating === "forgot") {
        setShowAlg(true);
        go("blocked"); // « blocked » sert ici de pause : on montre l'algo, puis on continue
        resultRef.current = null;
        return;
      }
      beginRep(drawRep(cfg, r.case.id));
    },
    [recordAttempt, beginRep, cfg],
  );

  const finish = useCallback(
    (at: number) => {
      const r = repRef.current!;
      const ms = at - t0.current;
      // Un smart cube envoie U2 comme deux quarts de tour : on compte l'algo de la même façon.
      const quarter = (ms: Move[]) => ms.reduce((n, m) => n + (m.amount === 2 ? 2 : 1), 0);
      const algMoves = quarter(parseAlg(r.alg).filter((m) => !"xyz".includes(m.family))) + (r.instance.preAuf ? 1 : 0) + (r.instance.postAuf ? 1 : 0);
      const target = settings.targetMs[cfg.setId] ?? 4000;
      const rating = autoRate(ms, target, movesRef.current, algMoves);
      const res: Result = { ms, moves: movesRef.current, recMs: Math.min(10_000, t0.current - readyAt.current), rating };
      resultRef.current = res;
      setResult(res);
      go("done");
      vibrate([30, 40, 30]);
      if (settings.smartAutoRate) commitTimer.current = window.setTimeout(() => commit(res.rating), AUTO_COMMIT_MS);
    },
    [settings.targetMs, settings.smartAutoRate, cfg.setId, commit],
  );

  // Réception des mouvements (le suivi d'état est déjà fait par le fournisseur de contexte)
  useEffect(() => {
    if (!cube) return;
    const off = cube.onMove(({ move, at }) => {
      switch (phaseRef.current) {
        case "scramble": {
          const g = guided.current;
          if (!g) return;
          g.feed(move);
          setTodo([...g.todo]);
          if (g.done) {
            readyAt.current = performance.now();
            go("ready");
            vibrate(25);
          }
          break;
        }
        case "ready": {
          t0.current = at;
          movesRef.current = 1;
          setStartAt(at);
          go("solving");
          if (goalReached(set.goal, tracker.state)) finish(at);
          break;
        }
        case "solving": {
          movesRef.current += 1;
          if (goalReached(set.goal, tracker.state)) finish(at);
          break;
        }
        default:
          break;
      }
    });
    const offState = cube.onState?.((s) => {
      if (!statesEqual(s, tracker.state)) {
        tracker.sync(s);
        if (phaseRef.current === "scramble" || phaseRef.current === "ready" || phaseRef.current === "blocked") beginRep(repRef.current);
      }
    });
    void cube.batteryLevel?.().then(setBattery);
    return () => {
      off();
      offState?.();
    };
  }, [cube, tracker, set.goal, finish, beginRep]);

  useEffect(() => () => window.clearTimeout(commitTimer.current), []);

  // Connexion perdue pendant la session
  useEffect(() => {
    if (!cube && status === "disconnected") window.clearTimeout(commitTimer.current);
  }, [cube, status]);

  if (!cube) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
        <ConnectPanel />
        <button className="btn" onClick={onExit}>
          ← Retour
        </button>
      </div>
    );
  }

  if (!rep) {
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <div>
          <p className="text-lg font-semibold">Aucun cas à travailler avec ces filtres.</p>
          <button className="btn btn-primary mt-4" onClick={onExit}>
            Modifier la sélection
          </button>
        </div>
      </div>
    );
  }

  const resync = () => {
    tracker.markSolved();
    beginRep(repRef.current);
  };
  const skip = () => beginRep(drawRep(cfg, rep.case.id));
  const target = settings.targetMs[cfg.setId] ?? 4000;

  return (
    <div className="flex h-full flex-col gap-3 px-4 pb-2 pt-3">
      <header className="flex items-center justify-between gap-2">
        <button className="btn !min-h-10" onClick={onExit}>
          ✕ Quitter
        </button>
        <div className="text-center">
          <div className="font-bold">
            {rep.case.name}
            {rep.case.nickname ? <span className="font-normal muted"> · {rep.case.nickname}</span> : null}
          </div>
          <div className="text-xs muted">
            {cube.name}
            {battery != null ? ` · 🔋 ${battery} %` : ""} · cas n° {count + 1}
          </div>
        </div>
        <button className="btn !min-h-10" onClick={skip} disabled={phase === "solving"}>
          Passer
        </button>
      </header>

      <div className="surface flex flex-1 flex-col items-center justify-center gap-4 rounded-3xl p-4 text-center">
        {phase === "blocked" && !showAlg && (
          <>
            <div className="text-xl font-bold">État du cube inconnu</div>
            <p className="max-w-sm text-sm muted">Le cube n'est pas dans un état que l'app peut retrouver. Résous-le complètement, puis appuie sur « Cube résolu ».</p>
            <button className="btn btn-primary" onClick={resync}>
              Cube résolu
            </button>
          </>
        )}

        {phase === "blocked" && showAlg && (
          <>
            <div className="text-xl font-bold text-red-400">Oublié — revois l'algo</div>
            <div className="rounded-2xl surface-2 p-4 text-xl">
              <AlgText alg={rep.alg} />
            </div>
            <div className="w-32">
              <CaseDiagram view={llView(rep.instance.state)} />
            </div>
            <button className="btn btn-primary !min-h-14 w-full max-w-xs" onClick={() => beginRep(drawRep(cfg, rep.case.id))}>
              Continuer
            </button>
          </>
        )}

        {phase === "scramble" && (
          <>
            <div className="text-xs font-semibold uppercase tracking-wide muted">
              Mélange ({todo.length} mouvement{todo.length > 1 ? "s" : ""})
            </div>
            <MoveSequence moves={todo.slice(0, 16)} active={0} size={todo.length > 12 ? "text-2xl" : "text-4xl"} />
            {todo.length > 16 && <div className="text-sm muted">… +{todo.length - 16} ensuite</div>}
            <p className="text-xs muted">Le premier mouvement en surbrillance est le suivant à jouer. Une erreur ? L'app te donne le mouvement correctif.</p>
          </>
        )}

        {phase === "ready" && (
          <>
            <div className="text-4xl font-extrabold text-emerald-400">Prêt</div>
            <p className="muted">Reconnais le cas et lance l'algo : le chrono démarre au premier mouvement.</p>
            {settings.showCaseInTrain && (
              <div className="w-32">
                <CaseDiagram view={llView(rep.instance.state)} />
              </div>
            )}
          </>
        )}

        {phase === "solving" && (
          <>
            <div className="timer-digits text-7xl font-extrabold sm:text-8xl">{(elapsed / 1000).toFixed(2)}</div>
            <div className="text-sm muted">{movesRef.current} mouvements</div>
          </>
        )}

        {phase === "done" && result && (
          <>
            <div className="timer-digits text-7xl font-extrabold sm:text-8xl">{(result.ms / 1000).toFixed(2)}</div>
            <div className="flex flex-wrap justify-center gap-x-4 text-sm muted">
              <span>{result.moves} mouvements</span>
              {result.recMs != null && <span>prise de décision {formatMs(result.recMs)}</span>}
              <span>objectif {formatMs(target)}</span>
            </div>
            {settings.smartAutoRate && (
              <div className="w-full max-w-xs">
                <div className="mb-1 text-sm font-semibold">Évaluation auto : {RATING_META[result.rating].label}</div>
                <div className="h-1.5 overflow-hidden rounded-full surface-2">
                  <div className="h-full origin-left bg-brand-500" style={{ animation: `fill ${AUTO_COMMIT_MS}ms linear forwards` }} />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="min-h-[4.5rem] space-y-2">
        {phase === "done" && result ? (
          <RatingBar onRate={commit} suggested={result.rating} />
        ) : (
          <div className="flex items-center justify-center gap-2">
            <button className="chip" aria-pressed={showAlg && phase !== "blocked"} onClick={() => setShowAlg((v) => !v)}>
              Voir l'algo
            </button>
            <button className="chip" onClick={resync}>
              Cube résolu
            </button>
            {cube.requestState && (
              <button className="chip" onClick={() => void cube.requestState?.()}>
                Resynchroniser
              </button>
            )}
            <button className="chip" onClick={() => void disconnect()}>
              Déconnecter
            </button>
          </div>
        )}
        {showAlg && phase !== "blocked" && phase !== "done" && (
          <div className="rounded-2xl surface-2 p-2 text-center">
            <AlgText alg={rep.alg} />
          </div>
        )}
        <VirtualPad />
      </div>
      <style>{`@keyframes fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}`}</style>
    </div>
  );
}
