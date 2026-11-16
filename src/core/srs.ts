/**
 * Répétition espacée adaptée à l'entraînement d'algorithmes.
 *
 * Deux composantes :
 *  1. Un planning façon SM-2 (facilité, intervalle, échéance) mis à jour par l'auto-évaluation.
 *  2. Un POIDS de tirage : un cas ressort plus souvent s'il est en retard, lent par rapport à
 *     ta médiane, récemment oublié/hésité, ou jamais pratiqué.
 */

export type Rating = "easy" | "hesitate" | "forgot";
export type Status = "todo" | "learning" | "mastered";

export interface Attempt {
  /** timestamp ms */
  at: number;
  /** durée de l'exécution en ms (null si non chronométré) */
  ms: number | null;
  rating: Rating;
  /** "classic" | "smart" */
  mode: "classic" | "smart";
  /** Smart cube : délai « prêt → premier mouvement » (reconnaissance), en ms. */
  recMs?: number | null;
}

export interface CaseStats {
  /** Facteur de facilité SM-2 (1.3 – 3.0). */
  ease: number;
  /** Intervalle courant en jours. */
  intervalDays: number;
  /** Prochaine échéance (ms epoch). 0 = jamais planifié. */
  due: number;
  reps: number;
  lapses: number;
  /** Série de « Facile » consécutifs. */
  streak: number;
  best: number | null;
  /** Moyenne glissante exponentielle des temps (ms). */
  avgMs: number | null;
  /** Derniers essais (bornés). */
  history: Attempt[];
}

export const MAX_HISTORY = 40;
const DAY = 86_400_000;

export function newStats(): CaseStats {
  return { ease: 2.5, intervalDays: 0, due: 0, reps: 0, lapses: 0, streak: 0, best: null, avgMs: null, history: [] };
}

const QUALITY: Record<Rating, number> = { easy: 5, hesitate: 3, forgot: 1 };

export function applyAttempt(prev: CaseStats | undefined, attempt: Attempt): CaseStats {
  const s: CaseStats = prev ? { ...prev, history: [...prev.history] } : newStats();
  const q = QUALITY[attempt.rating];

  if (attempt.rating === "forgot") {
    s.lapses += 1;
    s.reps = 0;
    s.streak = 0;
    s.intervalDays = 0;
    s.due = attempt.at + 10 * 60_000; // revient dans 10 minutes
  } else {
    s.reps += 1;
    s.streak = attempt.rating === "easy" ? s.streak + 1 : 0;
    if (attempt.rating === "hesitate") {
      s.intervalDays = Math.max(0.5, s.intervalDays * 0.6);
    } else if (s.reps === 1) s.intervalDays = 1;
    else if (s.reps === 2) s.intervalDays = 3;
    else s.intervalDays = Math.min(180, Math.round(s.intervalDays * s.ease * 10) / 10);
    s.due = attempt.at + s.intervalDays * DAY;
  }
  s.ease = Math.min(3, Math.max(1.3, s.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))));

  if (attempt.ms != null && attempt.rating !== "forgot") {
    s.avgMs = s.avgMs == null ? attempt.ms : s.avgMs * 0.7 + attempt.ms * 0.3;
    s.best = s.best == null ? attempt.ms : Math.min(s.best, attempt.ms);
  }
  s.history.push(attempt);
  if (s.history.length > MAX_HISTORY) s.history.splice(0, s.history.length - MAX_HISTORY);
  return s;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const v = [...values].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m]! : (v[m - 1]! + v[m]!) / 2;
}

export interface WeightContext {
  now: number;
  /** médiane des temps moyens de tous les cas pratiqués du set (ms) */
  medianMs: number | null;
}

/** Poids de tirage ≥ 0.05. Plus il est grand, plus le cas a de chances de sortir. */
export function caseWeight(stats: CaseStats | undefined, status: Status, ctx: WeightContext): number {
  if (!stats || stats.reps + stats.lapses === 0) {
    // Jamais pratiqué : prioritaire si « en cours », normal si « à apprendre »
    return status === "learning" ? 6 : status === "todo" ? 3 : 1.5;
  }
  let w = 1;

  // 1. Retard par rapport à l'échéance
  const overdueDays = (ctx.now - stats.due) / DAY;
  if (overdueDays > 0) w += Math.min(8, 1.5 + overdueDays * 1.2);
  else w *= Math.max(0.12, 1 - Math.min(1, -overdueDays / Math.max(1, stats.intervalDays)) * 0.85);

  // 2. Lenteur relative
  if (stats.avgMs != null && ctx.medianMs) {
    const ratio = stats.avgMs / ctx.medianMs;
    if (ratio > 1) w *= Math.min(3.5, 1 + (ratio - 1) * 1.5);
    else w *= Math.max(0.6, 0.6 + ratio * 0.4);
  }

  // 3. Erreurs récentes (6 derniers essais)
  const recent = stats.history.slice(-6);
  const forgot = recent.filter((a) => a.rating === "forgot").length;
  const hes = recent.filter((a) => a.rating === "hesitate").length;
  w *= 1 + forgot * 1.2 + hes * 0.4;

  // 4. Statut
  if (status === "learning") w *= 1.6;
  if (status === "mastered") w *= 0.55;

  return Math.max(0.05, w);
}

/** Tirage pondéré. `avoid` : id à éviter (pas deux fois le même cas d'affilée). */
export function weightedPick<T>(items: T[], weight: (t: T) => number, id: (t: T) => string, avoid?: string, rnd = Math.random): T | null {
  const pool = items.length > 1 && avoid ? items.filter((i) => id(i) !== avoid) : items;
  if (pool.length === 0) return null;
  const ws = pool.map(weight);
  const total = ws.reduce((a, b) => a + b, 0);
  let r = rnd() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= ws[i]!;
    if (r <= 0) return pool[i]!;
  }
  return pool[pool.length - 1]!;
}

/** Statut suggéré après une tentative (promotion / rétrogradation automatique). */
export function suggestStatus(status: Status, stats: CaseStats, rating: Rating): Status {
  if (rating === "forgot") return status === "mastered" ? "learning" : status === "todo" ? "learning" : status;
  if (status === "todo") return "learning";
  if (status === "learning" && stats.streak >= 5 && stats.reps >= 5) return "mastered";
  return status;
}

/** Notation automatique (smart cube) à partir du temps et du nombre de mouvements. */
export function autoRate(ms: number, targetMs: number, movesPlayed: number, algMoves: number): Rating {
  const ratio = algMoves > 0 ? movesPlayed / algMoves : 1;
  if (ms > targetMs * 4 || ratio > 3) return "forgot";
  if (ms > targetMs || ratio > 1.6) return "hesitate";
  return "easy";
}

export function formatMs(ms: number | null | undefined): string {
  if (ms == null) return "—";
  return (ms / 1000).toFixed(2) + " s";
}
