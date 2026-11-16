import type { AlgCase, AlgSet, SetId } from "./types";
import { OLL } from "./oll";
import { PLL } from "./pll";

/**
 * Registre des sets d'algorithmes.
 * Pour ajouter COLL, ZBLL, F2L avancés… : créer `coll.ts` (même forme que oll.ts),
 * l'ajouter ci-dessous. Tout le reste de l'application (bibliothèque, entraîneur,
 * statistiques, reconnaissance) s'adapte automatiquement.
 */
export const ALL_SETS: AlgSet[] = [OLL, PLL];

const SET_BY_ID = new Map<SetId, AlgSet>(ALL_SETS.map((s) => [s.id, s]));
const CASE_BY_ID = new Map<string, AlgCase>(ALL_SETS.flatMap((s) => s.cases).map((c) => [c.id, c]));

export function getSet(id: SetId): AlgSet | undefined {
  return SET_BY_ID.get(id);
}

export function getCase(id: string): AlgCase | undefined {
  return CASE_BY_ID.get(id);
}

export function casesOfFamily(set: AlgSet, familyId: string): AlgCase[] {
  return set.cases.filter((c) => c.family === familyId);
}

export * from "./types";
export { goalReached, goalReachedLenient } from "./goals";
export { buildInstance, referenceView } from "./caseState";
