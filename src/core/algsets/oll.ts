import type { AlgCase, AlgSet, FamilyDef } from "./types";

/**
 * Les 57 cas OLL (numérotation standard). algs[0] = algorithme de référence.
 * Chaque variante est vérifiée automatiquement par `npm run verify:algs`.
 */
type Row = [num: number, family: string, nickname: string | undefined, algs: string[], tags?: string[]];

const ROWS: Row[] = [
  // --- Points (aucune arête orientée) ---
  [1, "dot", "Runway", ["R U2 R2 F R F' U2 R' F R F'"]],
  [2, "dot", undefined, ["F R U R' U' F' f R U R' U' f'"], ["2look"]],
  [3, "dot", undefined, ["f R U R' U' f' U' F R U R' U' F'"]],
  [4, "dot", undefined, ["f R U R' U' f' U F R U R' U' F'"]],
  [17, "dot", "Diagonal", ["R U R' U R' F R F' U2 R' F R F'"]],
  [18, "dot", "Zamboni", ["R U2 R2 F R F' U2 M' U R U' r'"]],
  [19, "dot", "Bruno", ["M U R U R' U' M' R' F R F'", "r' R U R U R' U' M' R' F R F'"]],
  [20, "dot", "Checkers", ["M U R U R' U' M2 U R U' r'"]],

  // --- Carrés ---
  [5, "square", "Carré gauche", ["l' U2 L U L' U l"]],
  [6, "square", "Carré droit", ["r U2 R' U' R U' r'"]],

  // --- Petits éclairs ---
  [7, "small-lightning", "Éclair", ["r U R' U R U2 r'", "F R' F' R U2 R U2 R'"]],
  [8, "small-lightning", "Éclair inversé", ["l' U' L U' L' U2 l", "R U2 R' U2 R' F R F'"]],
  [11, "small-lightning", "Downstairs", ["r U R' U R' F R F' R U2 r'"]],
  [12, "small-lightning", "Upstairs", ["F R U R' U' F' U F R U R' U' F'"]],

  // --- Poissons ---
  [9, "fish", "Kite", ["R U R' U' R' F R2 U R' U' F'", "U R' U' R U' R' U R' F R F' U R"]],
  [10, "fish", "Anti-Kite", ["R U R' U R' F R F' R U2 R'"]],
  [35, "fish", "Fish Salad", ["R U2 R2 F R F' R U2 R'", "f R U R' U' f' R U R' U R U2 R'"]],
  [37, "fish", "Mounted Fish", ["F R U' R' U' R U R' F'"]],

  // --- Cavaliers ---
  [13, "knight", "Gun", ["F U R U' R2 F' R U R U' R'", "F U R U2 R' U' R U R' F'"]],
  [14, "knight", "Anti-Gun", ["R' F R U R' F' R F U' F'"]],
  [15, "knight", "Squeegee", ["r' U' r R' U' R U r' U r"]],
  [16, "knight", "Anti-Squeegee", ["r U r' R U R' U' r U' r'"]],

  // --- Croix : toutes les arêtes orientées (OCLL = 2-Look) ---
  [21, "cross", "H (Double Sune)", ["R U2 R' U' R U R' U' R U' R'", "U' R U R' U R U' R' U R U2 R'"], ["2look"]],
  [22, "cross", "Pi", ["R U2 R2 U' R2 U' R2 U2 R"], ["2look"]],
  [23, "cross", "U (Headlights)", ["R2 D R' U2 R D' R' U2 R'"], ["2look"]],
  [24, "cross", "T (Chameleon)", ["r U R' U' r' F R F'"], ["2look"]],
  [25, "cross", "L (Bowtie)", ["F' r U R' U' r' F R", "U' R' F R B' R' F' R B"], ["2look"]],
  [26, "cross", "Anti-Sune", ["R U2 R' U' R U' R'", "U' R' U' R U' R' U2 R"], ["2look"]],
  [27, "cross", "Sune", ["R U R' U R U2 R'"], ["2look"]],

  // --- Coins orientés ---
  [28, "corners", "Stealth", ["r U R' U' r' R U R U' R'", "r U R' U' M U R U' R'"]],
  [57, "corners", "Mummy (H)", ["R U R' U' M' U R U' r'", "R U R' U' r R' U R U' r'"]],

  // --- Awkward ---
  [29, "awkward", "Spotted Chameleon", ["R U R' U' R U' R' F' U' F R U R'", "U' M U R U R' U' R' F R F' M'"]],
  [30, "awkward", "Anti-Spotted Chameleon", ["F U R U2 R' U' R U2 R' U' F'"]],
  [41, "awkward", "Awkward Fish", ["R U R' U R U2 R' F R U R' U' F'"]],
  [42, "awkward", "Anti-Awkward Fish", ["R' U' R U' R' U2 R F R U R' U' F'", "R' U' R U F R U R' U' R' U R U' F'"]],

  // --- Formes en P ---
  [31, "p", undefined, ["R' U' F U R U' R' F' R"]],
  [32, "p", undefined, ["R U B' U' R' U R B R'"]],
  [43, "p", undefined, ["R' U' F' U F R", "U' f' L' U' L U f"]],
  [44, "p", undefined, ["F U R U' R' F'", "U2 f R U R' U' f'"], ["2look"]],

  // --- Formes en T ---
  [33, "t", undefined, ["R U R' U' R' F R F'"]],
  [45, "t", undefined, ["F R U R' U' F'", "f' U' L' U L f"], ["2look"]],

  // --- Formes en C ---
  [34, "c", "City", ["R U R2 U' R' F R U R U' F'"]],
  [46, "c", "Seeing Headlights", ["R' U' R' F R F' U R"]],

  // --- Formes en W ---
  [36, "w", undefined, ["R' U' R U' R' U R U R B' R' B"]],
  [38, "w", undefined, ["R U R' U R U' R' U' R' F R F'"]],

  // --- Grands éclairs ---
  [39, "big-lightning", "Fung", ["L F' L' U' L U F U' L'"]],
  [40, "big-lightning", "Anti-Fung", ["R' F R U R' U' F' U R"]],

  // --- Formes en L ---
  [47, "l", undefined, ["F' L' U' L U L' U' L U F", "R' U' R' F R F' R' F R F' U R"]],
  [48, "l", undefined, ["F R U R' U' R U R' U' F'"]],
  [49, "l", undefined, ["r U' r2 U r2 U r2 U' r", "U2 R B' R2 F R2 B R2 F' R"]],
  [50, "l", undefined, ["r' U r2 U' r2 U' r2 U r'", "L' B L2 F' L2 B' L2 F L'"]],

  // --- Lignes (I) ---
  [51, "i", "Bottlecap", ["F U R U' R' U R U' R' F'", "U2 f R U R' U' R U R' U' f'"]],
  [52, "i", "Rice Cooker", ["R U R' U R U' B U' B' R'", "R' U' R U' R' U F' U F R"]],
  [55, "i", "Highway", ["R U2 R2 U' R U' R' U2 F R F'"]],
  [56, "i", "Streetlights", ["r U r' U R U' R' U R U' R' r U' r'", "F R U R' U' R F' r U R' U' r'"]],

  // --- Formes en Z ---
  [53, "z", undefined, ["r' U' R U' R' U R U' R' U2 r"]],
  [54, "z", undefined, ["r U R' U R U' R' U R U2 r'"]],
];

export const OLL_FAMILIES: FamilyDef[] = [
  { id: "dot", label: "Points", description: "Aucune arête orientée (seul le centre est jaune)" },
  { id: "square", label: "Carrés", description: "Un carré 2×2 jaune en haut" },
  { id: "small-lightning", label: "Petits éclairs" },
  { id: "fish", label: "Poissons" },
  { id: "knight", label: "Cavaliers" },
  { id: "cross", label: "Croix (OCLL)", description: "Les 4 arêtes sont orientées : 2-Look, orientation des coins" },
  { id: "corners", label: "Coins orientés", description: "Les 4 coins sont orientés" },
  { id: "awkward", label: "Awkward" },
  { id: "p", label: "Formes en P" },
  { id: "t", label: "Formes en T" },
  { id: "c", label: "Formes en C" },
  { id: "w", label: "Formes en W" },
  { id: "big-lightning", label: "Grands éclairs" },
  { id: "l", label: "Formes en L" },
  { id: "i", label: "Lignes (I)" },
  { id: "z", label: "Formes en Z" },
];

const cases: AlgCase[] = ROWS.map(([num, family, nickname, algs, tags]) => {
  const id = `oll-${num}`;
  return {
    id,
    setId: "oll",
    number: num,
    name: `OLL ${num}`,
    nickname,
    family,
    algs: algs.map((alg, i) => ({ id: `${id}:${i}`, alg })),
    tags: tags ?? [],
  };
}).sort((a, b) => a.number! - b.number!);

export const OLL: AlgSet = {
  id: "oll",
  name: "OLL — Orientation du dernier étage",
  shortName: "OLL",
  description: "Les 57 cas pour orienter tout le dernier étage en un seul algorithme.",
  goal: "oll",
  families: OLL_FAMILIES,
  cases,
  randomPostAUF: false,
};
