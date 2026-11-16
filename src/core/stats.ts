import type { AlgCase, AlgSet } from "./algsets/types";
import type { CaseRecord } from "./trainer";
import type { Status } from "./srs";

export interface SetSummary {
  total: number;
  counts: Record<Status, number>;
  /** cas « en cours » ou « maîtrisés » dont la révision est due */
  due: number;
  practiced: number;
  avgMs: number | null;
  slowest: { c: AlgCase; ms: number }[];
}

export function summarize(set: AlgSet, records: Record<string, CaseRecord | undefined>, now = Date.now()): SetSummary {
  const counts: Record<Status, number> = { todo: 0, learning: 0, mastered: 0 };
  let due = 0;
  let practiced = 0;
  const times: { c: AlgCase; ms: number }[] = [];
  for (const c of set.cases) {
    const r = records[c.id];
    const status = r?.status ?? "todo";
    counts[status]++;
    const st = r?.stats;
    if (st && st.reps + st.lapses > 0) practiced++;
    if (status !== "todo" && (!st || st.due <= now)) due++;
    if (st?.avgMs != null) times.push({ c, ms: st.avgMs });
  }
  times.sort((a, b) => b.ms - a.ms);
  const avg = times.length ? times.reduce((s, t) => s + t.ms, 0) / times.length : null;
  return { total: set.cases.length, counts, due, practiced, avgMs: avg, slowest: times.slice(0, 5) };
}
