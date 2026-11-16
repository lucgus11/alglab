import type { Status } from "@/core/srs";
import { STATUS_LABEL } from "@/store/useStore";

export const STATUS_STYLE: Record<Status, { dot: string; bg: string; text: string }> = {
  todo: { dot: "bg-slate-400", bg: "bg-slate-500/15", text: "text-slate-500 dark:text-slate-300" },
  learning: { dot: "bg-amber-400", bg: "bg-amber-500/15", text: "text-amber-600 dark:text-amber-300" },
  mastered: { dot: "bg-emerald-400", bg: "bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-300" },
};

export function StatusBadge({ status, compact = false }: { status: Status; compact?: boolean }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      {!compact && STATUS_LABEL[status]}
    </span>
  );
}

const ORDER: Status[] = ["todo", "learning", "mastered"];

export function StatusPicker({ value, onChange }: { value: Status; onChange: (s: Status) => void }) {
  return (
    <div role="radiogroup" aria-label="Statut d'apprentissage" className="grid grid-cols-3 gap-1 rounded-2xl surface-2 p-1">
      {ORDER.map((s) => (
        <button
          key={s}
          role="radio"
          aria-checked={value === s}
          onClick={() => onChange(s)}
          className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-1.5 text-[13px] leading-tight font-semibold transition sm:text-sm ${
            value === s ? "bg-brand-600 text-white shadow" : "muted hover:bg-black/5 dark:hover:bg-white/5"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${STATUS_STYLE[s].dot}`} />
          {STATUS_LABEL[s]}
        </button>
      ))}
    </div>
  );
}
