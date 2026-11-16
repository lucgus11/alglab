import { useEffect, type ReactNode } from "react";
import type { Move } from "@/core/cube/notation";
import { formatMove } from "@/core/cube/notation";
import type { Rating } from "@/core/srs";
import { useStore } from "@/store/useStore";
import { SMART_DRIVERS, VirtualCube } from "@/core/smart/drivers";
import { useSmart } from "@/core/smart/SmartContext";

export const RATING_META: Record<Rating, { label: string; key: string; cls: string }> = {
  easy: { label: "Facile", key: "1", cls: "bg-emerald-600 text-white border-emerald-600" },
  hesitate: { label: "Hésitation", key: "2", cls: "bg-amber-500 text-black border-amber-500" },
  forgot: { label: "Oublié", key: "3", cls: "bg-red-600 text-white border-red-600" },
};

export function RatingBar({ onRate, suggested, disabled }: { onRate: (r: Rating) => void; suggested?: Rating; disabled?: boolean }) {
  const left = useStore((s) => s.settings.leftHanded);
  const order: Rating[] = left ? ["forgot", "hesitate", "easy"] : ["easy", "hesitate", "forgot"];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (disabled) return;
      const r = (Object.keys(RATING_META) as Rating[]).find((k) => RATING_META[k].key === e.key);
      if (r) {
        e.preventDefault();
        onRate(r);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onRate, disabled]);

  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Auto-évaluation">
      {order.map((r) => (
        <button
          key={r}
          disabled={disabled}
          onClick={() => onRate(r)}
          className={`btn !min-h-16 flex-col !gap-0 text-base ${RATING_META[r].cls} ${suggested === r ? "ring-4 ring-white/70 dark:ring-white/50" : "opacity-90"}`}
        >
          {RATING_META[r].label}
          <span className="text-[11px] font-medium opacity-80">touche {RATING_META[r].key}</span>
        </button>
      ))}
    </div>
  );
}

/** Mélange à appliquer : mouvements séparés et lisibles. */
export function MoveSequence({ moves, active = 0, size = "text-3xl" }: { moves: Move[]; active?: number; size?: string }) {
  return (
    <div className={`flex flex-wrap justify-center gap-x-3 gap-y-1 font-mono font-bold leading-tight ${size}`} aria-label="Mélange">
      {moves.map((m, i) => (
        <span key={i} className={i < active ? "opacity-30 line-through" : i === active ? "rounded-lg bg-brand-600 px-1.5 text-white" : ""}>
          {formatMove(m)}
        </span>
      ))}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`surface rounded-3xl p-5 ${className}`}>{children}</div>;
}

/** Choix du matériel + connexion. */
export function ConnectPanel() {
  const { status, error, connect } = useSmart();
  return (
    <Card className="mx-auto w-full max-w-md">
      <h2 className="text-lg font-bold">Connecter un smart cube</h2>
      <p className="mt-1 text-sm muted">
        Les mouvements sont détectés automatiquement : le chrono démarre au premier mouvement et s'arrête tout seul à la résolution du cas, sans toucher l'écran.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {SMART_DRIVERS.map((d) => {
          const ok = d.supported();
          return (
            <button key={d.id} className={`btn !h-auto flex-col !items-start !gap-0 py-3 text-left ${d.id === "gan" ? "btn-primary" : ""}`} disabled={!ok || status === "connecting"} onClick={() => void connect(d.id)}>
              <span>{d.label}</span>
              <span className="text-xs font-normal opacity-80">{ok ? d.hint : "Web Bluetooth indisponible sur ce navigateur (utilise Chrome ou Edge ; sur iPhone, un navigateur compatible comme Bluefy)."}</span>
            </button>
          );
        })}
      </div>
      {status === "connecting" && <p className="mt-3 text-sm muted">Connexion…</p>}
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      <p className="mt-4 text-xs muted">
        Tiens le cube avec le jaune dessus et le vert devant au moment de la connexion, et assure-toi qu'il est résolu (ou utilise « Cube résolu » ensuite).
      </p>
    </Card>
  );
}

/** Boutons de test du cube virtuel (utiles sur mobile / sans clavier). */
export function VirtualPad() {
  const { cube } = useSmart();
  if (!(cube instanceof VirtualCube)) return null;
  const faces = ["U", "R", "F", "D", "L", "B"];
  return (
    <div className="grid grid-cols-6 gap-1" aria-label="Cube virtuel">
      {faces.map((f) => (
        <div key={f} className="flex flex-col gap-1">
          <button className="btn !min-h-10 !px-0 font-mono" onClick={() => cube.push(f)}>
            {f}
          </button>
          <button className="btn !min-h-10 !px-0 font-mono" onClick={() => cube.push(f + "'")}>
            {f}'
          </button>
        </div>
      ))}
    </div>
  );
}
