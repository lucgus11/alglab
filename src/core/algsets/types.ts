export type SetId = string;
export type CaseId = string;

export interface AlgVariant {
  /** Stable : `${caseId}:${index}` pour les algos intégrés, `custom:…` pour ceux de l'utilisateur. */
  id: string;
  alg: string;
  label?: string;
}

export interface FamilyDef {
  id: string;
  label: string;
  description?: string;
}

export interface AlgCase {
  id: CaseId;
  setId: SetId;
  /** Numéro officiel (OLL 1-57). */
  number?: number;
  /** Libellé principal : « OLL 27 », « T-perm »… */
  name: string;
  nickname?: string;
  family: string;
  /** algs[0] est l'algorithme de référence : il DÉFINIT le cas. */
  algs: AlgVariant[];
  /** « 2look » = cas déjà connus avec la méthode 2-Look. */
  tags: string[];
}

/**
 * Objectif à atteindre pour considérer un cas « résolu » :
 *  - "oll"    : dernier étage orienté (face U uniforme) et deux premières couches intactes
 *  - "solved" : cube entièrement résolu (à l'AUF près pour la validation de l'algo)
 * Pour ajouter COLL, ZBLL, etc. : étendre ce type + `goalReached` dans ./goals.ts.
 */
export type GoalId = "oll" | "solved";

export interface AlgSet {
  id: SetId;
  name: string;
  shortName: string;
  description: string;
  goal: GoalId;
  /** Familles, dans l'ordre d'affichage. */
  families: FamilyDef[];
  cases: AlgCase[];
  /** Applique un AUF final aléatoire au mélange (PLL : avant ET après). */
  randomPostAUF: boolean;
}
