import { aufMoves, formatMoves, invertMoves, parseAlg, simplifyMoves, type Move } from "../cube/notation";
import { SOLVED, applyMoves, llView, type CubeState, type LLView } from "../cube/sim";
import type { AlgCase } from "./types";

export interface CaseInstance {
  /** Mélange à appliquer sur un cube RÉSOLU (= inverse de l'algo + AUF éventuels). */
  setup: string;
  setupMoves: Move[];
  /** État du cube après ce mélange. */
  state: CubeState;
  /** AUF avant l'algo (nombre de quarts de tour U appliqués en fin de mélange). */
  preAuf: number;
  /** AUF appliqué avant l'inverse (PLL) : à corriger APRÈS l'algo. */
  postAuf: number;
}

/** Instance déterministe d'un algo : inverse(alg) + AUF. */
export function buildInstance(alg: string, preAuf = 0, postAuf = 0): CaseInstance {
  const moves = simplifyMoves([...aufMoves(postAuf), ...invertMoves(parseAlg(alg)), ...aufMoves(preAuf)]);
  return {
    setup: formatMoves(moves),
    setupMoves: moves,
    state: applyMoves(SOLVED as CubeState, moves),
    preAuf,
    postAuf,
  };
}

const viewCache = new Map<string, LLView>();

/** Vue 2D de référence d'un cas (algo de référence, sans AUF). Mise en cache. */
export function referenceView(c: AlgCase): LLView {
  let v = viewCache.get(c.id);
  if (!v) {
    v = llView(buildInstance(c.algs[0]!.alg).state);
    viewCache.set(c.id, v);
  }
  return v;
}
