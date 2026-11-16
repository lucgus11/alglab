import { buildInstance, type CaseInstance } from "./algsets/caseState";
import type { AlgCase, AlgSet } from "./algsets/types";
import { caseWeight, median, weightedPick, type CaseStats, type Status } from "./srs";

export type Scope = "all" | "unknown" | "learning" | "mastered" | "due";

export interface CaseRecord {
  status: Status;
  stats?: CaseStats;
}

export interface TrainFilter {
  set: AlgSet;
  statuses: Status[];
  families?: string[];
  /** ne garder que les cas échus / jamais vus */
  dueOnly?: boolean;
  /** Restreindre à des ids précis (ex. entraînement ciblé sur un cas). */
  onlyIds?: string[];
}

export function eligibleCases(f: TrainFilter, records: Record<string, CaseRecord | undefined>, now = Date.now()): AlgCase[] {
  return f.set.cases.filter((c) => {
    if (f.onlyIds && !f.onlyIds.includes(c.id)) return false;
    if (f.families && f.families.length && !f.families.includes(c.family)) return false;
    const r = records[c.id];
    const status = r?.status ?? "todo";
    if (!f.statuses.includes(status)) return false;
    if (f.dueOnly) {
      const st = r?.stats;
      if (st && st.due > now) return false;
    }
    return true;
  });
}

export function pickNextCase(
  pool: AlgCase[],
  records: Record<string, CaseRecord | undefined>,
  avoidId?: string,
  now = Date.now(),
  mode: "smart" | "random" = "smart",
): AlgCase | null {
  if (pool.length === 0) return null;
  if (mode === "random") return weightedPick(pool, () => 1, (c) => c.id, avoidId);
  const times = pool.map((c) => records[c.id]?.stats?.avgMs).filter((v): v is number => v != null);
  const ctx = { now, medianMs: median(times) };
  return weightedPick(
    pool,
    (c) => caseWeight(records[c.id]?.stats, records[c.id]?.status ?? "todo", ctx),
    (c) => c.id,
    avoidId,
  );
}

const rndInt = (n: number) => Math.floor(Math.random() * n);

export interface Rep {
  case: AlgCase;
  /** Algo utilisé comme définition du cas pour ce tirage (celui préféré de l'utilisateur). */
  alg: string;
  instance: CaseInstance;
}

/**
 * Prépare une répétition : mélange = inverse de l'algo choisi, avec AUF aléatoires.
 *  - OLL : un AUF avant l'algo (le cas apparaît sous 4 orientations)
 *  - PLL : un AUF avant (orientation du cas) et un après (décalage à corriger)
 */
export function makeRep(set: AlgSet, c: AlgCase, alg: string): Rep {
  const pre = rndInt(4);
  const post = set.randomPostAUF ? rndInt(4) : 0;
  return { case: c, alg, instance: buildInstance(alg, pre, post) };
}
