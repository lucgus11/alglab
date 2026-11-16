import { useCallback, useEffect, useRef, useState } from "react";
import { CaseDiagram } from "@/components/CaseDiagram";
import { AlgText } from "@/components/AlgText";
import { MoveSequence, RatingBar } from "./parts";
import { useRepQueue, type SessionConfig } from "./session";
import { llView } from "@/core/cube/sim";
import type { Rating } from "@/core/srs";
import { useStore } from "@/store/useStore";
import { useElapsed, useWakeLock, vibrate } from "@/hooks";

type Phase = "idle" | "holding" | "ready" | "running" | "rating" | "review";
const HOLD_MS = 250;

export default function ClassicSession({ cfg, onExit }: { cfg: SessionConfig; onExit: () => void }) {
  const { rep, next, count } = useRepQueue(cfg);
  const showCase = useStore((s) => s.settings.showCaseInTrain);
  const recordAttempt = useStore((s) => s.recordAttempt);

  const [phase, setPhase] = useState<Phase>("idle");
  const [startAt, setStartAt] = useState<number | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);
  const [peek, setPeek] = useState(showCase);
  const phaseRef = useRef<Phase>("idle");
  const holdTimer = useRef<number>(0);
  const startRef = useRef(0);

  const go = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  useWakeLock(true);
  const elapsed = useElapsed(phase === "running", startAt);

  const reset = useCallback(() => {
    window.clearTimeout(holdTimer.current);
    go("idle");
    setStartAt(null);
    setResult(null);
    setReveal(false);
    setPeek(useStore.getState().settings.showCaseInTrain);
  }, []);

  const press = useCallback(() => {
    const p = phaseRef.current;
    if (p === "idle") {
      go("holding");
      holdTimer.current = window.setTimeout(() => {
        if (phaseRef.current === "holding") {
          go("ready");
          vibrate(25);
        }
      }, HOLD_MS);
    } else if (p === "running") {
      const ms = performance.now() - startRef.current;
      setResult(ms);
      go("rating");
      vibrate([30, 40, 30]);
    }
  }, []);

  const release = useCallback(() => {
    const p = phaseRef.current;
    if (p === "holding") {
      window.clearTimeout(holdTimer.current);
      go("idle");
    } else if (p === "ready") {
      startRef.current = performance.now();
      setStartAt(startRef.current);
      go("running");
    }
  }, []);

  const rate = useCallback(
    (r: Rating) => {
      if (!rep || phaseRef.current !== "rating") return;
      recordAttempt(rep.case.id, { at: Date.now(), ms: result, rating: r, mode: "classic" });
      if (r === "forgot") {
        // On montre l'algo avant de passer au cas suivant.
        setReveal(true);
        go("review");
        return;
      }
      reset();
      next();
    },
    [rep, result, recordAttempt, reset, next],
  );

  const skip = useCallback(() => {
    reset();
    next();
  }, [reset, next]);

  // Clavier : espace = chrono, r = voir l'algo, n = passer, Échap = quitter
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (phaseRef.current === "review" && (e.code === "Space" || e.key === "Enter")) {
        e.preventDefault();
        if (!e.repeat) skip();
      } else if (e.code === "Space") {
        e.preventDefault();
        if (!e.repeat) press();
      } else if (e.key === "Escape") onExit();
      else if (e.key === "r" && phaseRef.current !== "running") setReveal((v) => !v);
      else if (e.key === "n" && phaseRef.current !== "running") skip();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        release();
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [press, release, skip, onExit]);

  if (!rep) {
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <div>
          <p className="text-lg font-semibold">Aucun cas à travailler avec ces filtres.</p>
          <p className="mt-1 text-sm muted">Change les statuts sélectionnés ou décoche « Révisions dues ».</p>
          <button className="btn btn-primary mt-4" onClick={onExit}>
            Modifier la sélection
          </button>
        </div>
      </div>
    );
  }

  const timerColor = phase === "holding" ? "text-red-500" : phase === "ready" ? "text-emerald-400" : "";
  const shown = phase === "running" ? elapsed : (result ?? 0);
  const label =
    phase === "idle" ? "Maintiens, puis relâche pour démarrer" : phase === "holding" ? "Maintiens…" : phase === "ready" ? "Relâche pour démarrer !" : phase === "running" ? "Touche pour arrêter" : "";

  return (
    <div className="flex h-full flex-col gap-3 px-4 pb-2 pt-3">
      <header className="flex items-center justify-between gap-2">
        <button className="btn !min-h-10" onClick={onExit}>
          ✕ Quitter
        </button>
        <div className="text-center">
          <div className="font-bold">{rep.case.name}{rep.case.nickname ? <span className="font-normal muted"> · {rep.case.nickname}</span> : null}</div>
          <div className="text-xs muted">Cas n° {count + 1}</div>
        </div>
        <button className="btn !min-h-10" onClick={skip} disabled={phase === "running"}>
          Passer
        </button>
      </header>

      {/* Mélange à appliquer */}
      <div className="surface rounded-3xl p-4 text-center">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide muted">Mélange — cube résolu, jaune dessus, vert devant</div>
        <MoveSequence moves={rep.instance.setupMoves} active={-1} size={rep.instance.setupMoves.length > 14 ? "text-2xl" : "text-3xl"} />
        <div className="mt-3 flex items-center justify-center gap-2">
          <button className="chip" aria-pressed={peek} onClick={() => setPeek((v) => !v)}>
            Voir le cas
          </button>
          <button className="chip" aria-pressed={reveal} onClick={() => setReveal((v) => !v)}>
            Voir l'algo (r)
          </button>
        </div>
        {(peek || phase === "rating") && (
          <div className="mx-auto mt-3 w-32">
            <CaseDiagram view={llView(rep.instance.state)} />
          </div>
        )}
        {reveal && (
          <div className="mt-3 rounded-2xl surface-2 p-3 text-lg">
            <AlgText alg={rep.alg} />
            {rep.instance.preAuf > 0 && <div className="mt-1 text-xs muted">Commence par un AUF (U) pour aligner le cas.</div>}
          </div>
        )}
      </div>

      {/* Zone de chrono : tout l'espace restant, utilisable d'une main */}
      <div
        className={`no-select surface grid min-h-40 flex-1 place-items-center rounded-3xl ${phase === "ready" ? "ring-4 ring-emerald-400" : phase === "holding" ? "ring-4 ring-red-500" : ""}`}
        onPointerDown={(e) => {
          if (phase === "rating" || phase === "review") return;
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          press();
        }}
        onPointerUp={release}
        onPointerCancel={release}
        role="button"
        tabIndex={0}
        aria-label="Zone de chronomètre : maintenir puis relâcher pour démarrer, toucher pour arrêter"
      >
        <div className="text-center">
          <div className={`timer-digits text-7xl font-extrabold sm:text-8xl ${timerColor}`}>{(shown / 1000).toFixed(2)}</div>
          <div className="mt-2 text-sm muted">{label || (phase === "rating" ? "Comment c'était ?" : phase === "review" ? "Revois l'algo, puis continue" : "")}</div>
        </div>
      </div>

      <div className="min-h-[4.5rem]">
        {phase === "rating" ? (
          <RatingBar onRate={rate} />
        ) : phase === "review" ? (
          <button className="btn btn-primary w-full !min-h-16 text-base" onClick={skip}>
            Continuer
          </button>
        ) : (
          <p className="pt-3 text-center text-xs muted">Espace : chrono · R : algo · N : passer · 1/2/3 : évaluation · Échap : quitter</p>
        )}
      </div>
    </div>
  );
}
