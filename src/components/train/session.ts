import { useCallback, useState } from "react";
import { getSet } from "@/core/algsets";
import { makeRep, eligibleCases, pickNextCase, type Rep } from "@/core/trainer";
import type { Status } from "@/core/srs";
import { preferredVariant, useStore } from "@/store/useStore";

export interface SessionConfig {
  setId: string;
  statuses: Status[];
  dueOnly: boolean;
  onlyIds?: string[];
  selection: "smart" | "random";
  mode: "classic" | "smart";
}

export function drawRep(cfg: SessionConfig, avoidId?: string): Rep | null {
  const set = getSet(cfg.setId);
  if (!set) return null;
  const { records, preferred, custom } = useStore.getState();
  const pool = eligibleCases({ set, statuses: cfg.statuses, dueOnly: cfg.dueOnly, onlyIds: cfg.onlyIds }, records);
  const c = pickNextCase(pool, records, avoidId, Date.now(), cfg.selection);
  if (!c) return null;
  return makeRep(set, c, preferredVariant(c, preferred, custom).alg);
}

/** File de répétitions : tire un cas selon la répétition espacée (ou au hasard). */
export function useRepQueue(cfg: SessionConfig) {
  const [rep, setRep] = useState<Rep | null>(() => drawRep(cfg));
  const [count, setCount] = useState(0);
  const next = useCallback(() => {
    setRep((cur) => drawRep(cfg, cur?.case.id));
    setCount((n) => n + 1);
  }, [cfg]);
  return { rep, next, count };
}
