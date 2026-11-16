import type { AlgCase, AlgSet, FamilyDef } from "./types";

/**
 * Les 21 PLL. Aucun algo ne contient de rotation de cube (x y z) afin que le mélange
 * inverse affiché par l'entraîneur reste exécutable tel quel.
 */
type Row = [name: string, family: string, algs: string[], tags?: string[]];

const ROWS: Row[] = [
  // --- Arêtes seules ---
  ["Ua", "edges", ["R U' R U R U R U' R' U' R2", "M2 U M U2 M' U M2"], ["2look"]],
  ["Ub", "edges", ["R2 U R U R' U' R' U' R' U R'", "M2 U' M U2 M' U' M2"], ["2look"]],
  ["H", "edges", ["M2 U M2 U2 M2 U M2", "R2 U2 R U2 R2 U2 R2 U2 R U2 R2"], ["2look"]],
  ["Z", "edges", ["M' U' M2 U' M2 U' M' U2 M2"], ["2look"]],

  // --- Coins seuls ---
  ["Aa", "corners", ["R' F R' B2 R F' R' B2 R2"], ["2look"]],
  ["Ab", "corners", ["R2 B2 R F R' B2 R F' R"]],
  ["E", "corners", ["R B' R' F R B R' F' R B R' F R B' R' F'"]],

  // --- Échange de deux coins adjacents ---
  ["Ja", "adjacent", ["R' U L' U2 R U' R' U2 R L"]],
  ["Jb", "adjacent", ["R U R' F' R U R' U' R' F R2 U' R'"]],
  ["Ra", "adjacent", ["R U' R' U' R U R D R' U' R D' R' U2 R'"]],
  ["Rb", "adjacent", ["R' U2 R U2 R' F R U R' U' R' F' R2"]],
  ["T", "adjacent", ["R U R' U' R' F R2 U' R' U' R U R' F'"]],
  ["F", "adjacent", ["R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R"]],

  // --- Échange de deux coins diagonaux ---
  ["Y", "diagonal", ["F R U' R' U' R U R' F' R U R' U' R' F R F'"], ["2look"]],
  ["Na", "diagonal", ["R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'"]],
  ["Nb", "diagonal", ["R' U R U' R' F' U' F R U R' F R' F' R U' R"]],
  ["V", "diagonal", ["R' U R' U' R D' R' D R' U D' R2 U' R2 D R2"]],

  // --- G-perms ---
  ["Ga", "g", ["R2 U R' U R' U' R U' R2 D U' R' U R D'"]],
  ["Gb", "g", ["R' U' R U D' R2 U R' U R U' R U' R2 D"]],
  ["Gc", "g", ["R2 U' R U' R U R' U R2 D' U R U' R' D"]],
  ["Gd", "g", ["R U R' U' D R2 U' R U' R' U R' U R2 D'"]],
];

export const PLL_FAMILIES: FamilyDef[] = [
  { id: "edges", label: "Arêtes seules", description: "Les coins sont bien placés : permutation de 3 ou 4 arêtes" },
  { id: "corners", label: "Coins seuls", description: "Les arêtes sont bien placées : permutation des coins" },
  { id: "adjacent", label: "Échange adjacent", description: "Deux coins voisins échangés (+ deux arêtes)" },
  { id: "diagonal", label: "Échange diagonal", description: "Deux coins opposés échangés (+ deux arêtes)" },
  { id: "g", label: "G-perms", description: "Cycle de 3 coins et de 3 arêtes" },
];

const cases: AlgCase[] = ROWS.map(([name, family, algs, tags]) => {
  const id = `pll-${name.toLowerCase()}`;
  return {
    id,
    setId: "pll",
    name: `${name}-perm`,
    family,
    algs: algs.map((alg, i) => ({ id: `${id}:${i}`, alg })),
    tags: tags ?? [],
  };
});

export const PLL: AlgSet = {
  id: "pll",
  name: "PLL — Permutation du dernier étage",
  shortName: "PLL",
  description: "Les 21 cas pour permuter le dernier étage une fois orienté.",
  goal: "solved",
  families: PLL_FAMILIES,
  cases,
  randomPostAUF: true,
};
