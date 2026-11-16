/**
 * Simulateur de Rubik's Cube 3x3 à facettes (54 stickers).
 *
 * Les permutations sont calculées géométriquement (rotation de chaque sticker
 * autour d'un axe) plutôt qu'écrites à la main : aucune table à maintenir,
 * donc aucune erreur de transcription possible.
 *
 * Repère : x → droite (R), y → haut (U), z → devant (F).
 * Un état est un Uint8Array(54) : couleur (= face d'origine) de chaque slot.
 */
import { parseAlg, type Move } from "./notation";

export type CubeState = Uint8Array;
export type Vec = [number, number, number];

/** Ordre des faces = indices de couleur. */
export const FACES = ["U", "R", "F", "D", "L", "B"] as const;
export type FaceName = (typeof FACES)[number];
export const FACE_INDEX: Record<FaceName, number> = { U: 0, R: 1, F: 2, D: 3, L: 4, B: 5 };

const NORMALS: Vec[] = [
  [0, 1, 0], // U
  [1, 0, 0], // R
  [0, 0, 1], // F
  [0, -1, 0], // D
  [-1, 0, 0], // L
  [0, 0, -1], // B
];

interface Sticker {
  pos: Vec;
  normal: Vec;
  face: number;
}

const STICKERS: Sticker[] = [];
const SLOT = new Map<string, number>();
const key = (p: Vec, n: Vec) => `${p[0]},${p[1]},${p[2]}|${n[0]},${n[1]},${n[2]}`;

for (let f = 0; f < 6; f++) {
  const n = NORMALS[f]!;
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        const p: Vec = [x, y, z];
        // le sticker appartient à la face f si le cubie est sur cette face
        if (p[0] * n[0] + p[1] * n[1] + p[2] * n[2] !== 1) continue;
        SLOT.set(key(p, n), STICKERS.length);
        STICKERS.push({ pos: p, normal: n, face: f });
      }
}

export const STICKER_COUNT = STICKERS.length; // 54

/** Rotation de +90° (main droite) autour de l'axe donné. */
function rot(v: Vec, axis: 0 | 1 | 2): Vec {
  const [x, y, z] = v;
  if (axis === 0) return [x, -z, y];
  if (axis === 1) return [z, y, -x];
  return [-y, x, z];
}
function rotInv(v: Vec, axis: 0 | 1 | 2): Vec {
  const [x, y, z] = v;
  if (axis === 0) return [x, z, -y];
  if (axis === 1) return [-z, y, x];
  return [y, -x, z];
}

interface MoveDef {
  axis: 0 | 1 | 2;
  layers: number[];
  /** +1 : un quart de tour dans le sens de la notation = +90° autour de +axe. */
  sign: 1 | -1;
}

const DEFS: Record<string, MoveDef> = {
  U: { axis: 1, layers: [1], sign: -1 },
  D: { axis: 1, layers: [-1], sign: 1 },
  R: { axis: 0, layers: [1], sign: -1 },
  L: { axis: 0, layers: [-1], sign: 1 },
  F: { axis: 2, layers: [1], sign: -1 },
  B: { axis: 2, layers: [-1], sign: 1 },
  M: { axis: 0, layers: [0], sign: 1 },
  E: { axis: 1, layers: [0], sign: 1 },
  S: { axis: 2, layers: [0], sign: -1 },
  r: { axis: 0, layers: [0, 1], sign: -1 },
  l: { axis: 0, layers: [-1, 0], sign: 1 },
  u: { axis: 1, layers: [0, 1], sign: -1 },
  d: { axis: 1, layers: [-1, 0], sign: 1 },
  f: { axis: 2, layers: [0, 1], sign: -1 },
  b: { axis: 2, layers: [-1, 0], sign: 1 },
  x: { axis: 0, layers: [-1, 0, 1], sign: -1 },
  y: { axis: 1, layers: [-1, 0, 1], sign: -1 },
  z: { axis: 2, layers: [-1, 0, 1], sign: -1 },
};

/** PERMS[family][k-1] : destination de chaque slot après k quarts de tour (k = 1..3). */
const PERMS: Record<string, Uint8Array[]> = {};

for (const [fam, def] of Object.entries(DEFS)) {
  const one = new Uint8Array(STICKER_COUNT);
  for (let i = 0; i < STICKER_COUNT; i++) {
    const s = STICKERS[i]!;
    if (!def.layers.includes(s.pos[def.axis])) {
      one[i] = i;
      continue;
    }
    const f = def.sign === 1 ? rot : rotInv;
    const dest = SLOT.get(key(f(s.pos, def.axis), f(s.normal, def.axis)));
    if (dest === undefined) throw new Error("Permutation invalide");
    one[i] = dest;
  }
  const two = new Uint8Array(STICKER_COUNT);
  const three = new Uint8Array(STICKER_COUNT);
  for (let i = 0; i < STICKER_COUNT; i++) {
    two[i] = one[one[i]!]!;
    three[i] = one[two[i]!]!;
  }
  PERMS[fam] = [one, two, three];
}

export function solvedState(): CubeState {
  const s = new Uint8Array(STICKER_COUNT);
  for (let i = 0; i < STICKER_COUNT; i++) s[i] = STICKERS[i]!.face;
  return s;
}

export const SOLVED: Readonly<CubeState> = solvedState();

export function cloneState(s: CubeState): CubeState {
  return new Uint8Array(s);
}

function permFor(m: Move): Uint8Array {
  const p = PERMS[m.family];
  if (!p) throw new Error(`Famille inconnue : ${m.family}`);
  return p[m.amount === 1 ? 0 : m.amount === 2 ? 1 : 2]!;
}

/** Applique un mouvement et retourne un NOUVEL état. */
export function applyMove(state: CubeState, m: Move): CubeState {
  const perm = permFor(m);
  const next = new Uint8Array(STICKER_COUNT);
  for (let i = 0; i < STICKER_COUNT; i++) next[perm[i]!] = state[i]!;
  return next;
}

export function applyMoves(state: CubeState, moves: Move[]): CubeState {
  let s = state;
  for (const m of moves) s = applyMove(s, m);
  return s;
}

export function applyAlg(state: CubeState, alg: string): CubeState {
  return applyMoves(state, parseAlg(alg));
}

export function statesEqual(a: CubeState, b: CubeState): boolean {
  for (let i = 0; i < STICKER_COUNT; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function stateKey(s: CubeState): string {
  let out = "";
  for (let i = 0; i < STICKER_COUNT; i++) out += s[i];
  return out;
}

// ---------------------------------------------------------------------------
// Prédicats
// ---------------------------------------------------------------------------

const U_MOVE: Move = { family: "U", amount: 1 };

/** Les deux premières couches (hors dernier étage) sont résolues. */
export function isF2LSolved(s: CubeState): boolean {
  for (let i = 0; i < STICKER_COUNT; i++) {
    if (STICKERS[i]!.pos[1] <= 0 && s[i] !== STICKERS[i]!.face) return false;
  }
  return true;
}

/** Tous les autocollants de la face U ont la couleur U. */
export function isLLOriented(s: CubeState): boolean {
  for (let i = 0; i < STICKER_COUNT; i++) {
    const st = STICKERS[i]!;
    if (st.face === 0 && s[i] !== 0) return false;
  }
  return true;
}

export function isSolved(s: CubeState): boolean {
  for (let i = 0; i < STICKER_COUNT; i++) if (s[i] !== STICKERS[i]!.face) return false;
  return true;
}

/** Résolu, à un AUF (tour de la face U) près. */
export function isSolvedUpToAUF(s: CubeState): boolean {
  let cur = s;
  for (let k = 0; k < 4; k++) {
    if (isSolved(cur)) return true;
    cur = applyMove(cur, U_MOVE);
  }
  return false;
}

/** Résout-on l'état en appliquant un U^k au début ? Retourne k (0..3) ou -1. */
export function preAUFToSolve(s: CubeState, solved: (s: CubeState) => boolean): number {
  let cur = s;
  for (let k = 0; k < 4; k++) {
    if (solved(cur)) return k;
    cur = applyMove(cur, U_MOVE);
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Vue « dernier étage » (pour l'affichage 2D)
// ---------------------------------------------------------------------------

export interface LLView {
  /** 9 stickers de la face U, ligne par ligne (arrière → avant, gauche → droite). */
  top: number[];
  /** Rangée haute de chaque face latérale (gauche → droite vue de l'extérieur du cube, de dessus). */
  front: number[];
  back: number[];
  /** Rangées de haut en bas dans la vue de dessus (arrière → avant). */
  right: number[];
  left: number[];
}

export function llView(s: CubeState): LLView {
  const at = (p: Vec, n: Vec) => s[SLOT.get(key(p, n))!]!;
  const top: number[] = [];
  for (let z = -1; z <= 1; z++) for (let x = -1; x <= 1; x++) top.push(at([x, 1, z], [0, 1, 0]));
  const front: number[] = [];
  const back: number[] = [];
  for (let x = -1; x <= 1; x++) {
    front.push(at([x, 1, 1], [0, 0, 1]));
    back.push(at([x, 1, -1], [0, 0, -1]));
  }
  const right: number[] = [];
  const left: number[] = [];
  for (let z = -1; z <= 1; z++) {
    right.push(at([1, 1, z], [1, 0, 0]));
    left.push(at([-1, 1, z], [-1, 0, 0]));
  }
  return { top, front, back, right, left };
}

/** Pour la vue isométrique avant-droite : rangées hautes des faces F (gauche→droite) et R (avant→arrière vu de face). */
export function llViewFR(s: CubeState): { top: number[]; front: number[]; right: number[] } {
  const v = llView(s);
  // Face R vue de l'extérieur : de gauche (avant) à droite (arrière)
  return { top: v.top, front: v.front, right: [...v.right].reverse() };
}

/** Signature textuelle d'un état restreint à des stickers. */
export function viewSignature(view: number[]): string {
  return view.join("");
}

export function turnU(s: CubeState, k: number): CubeState {
  const n = ((k % 4) + 4) % 4;
  let cur = s;
  for (let i = 0; i < n; i++) cur = applyMove(cur, U_MOVE);
  return cur;
}

/** Exposé pour les scripts de vérification (analyse pièce par pièce). */
export function stickerInfo(i: number): Readonly<Sticker> {
  return STICKERS[i]!;
}

// ---------------------------------------------------------------------------
// Format Kociemba (URFDLB, 9 facelets par face) — utilisé par les smart cubes
// ---------------------------------------------------------------------------

const KOCIEMBA_POS: Array<(row: number, col: number) => Vec> = [
  (r, c) => [c - 1, 1, r - 1], // U
  (r, c) => [1, 1 - r, 1 - c], // R
  (r, c) => [c - 1, 1 - r, 1], // F
  (r, c) => [c - 1, -1, 1 - r], // D
  (r, c) => [-1, 1 - r, c - 1], // L
  (r, c) => [1 - c, 1 - r, -1], // B
];

/** « UUUUUUUUURRRRRRRRRFFFF… » → état. Retourne null si la chaîne est invalide. */
export function stateFromFacelets(facelets: string): CubeState | null {
  if (facelets.length !== 54) return null;
  const s = new Uint8Array(STICKER_COUNT);
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 9; i++) {
      const idx = FACES.indexOf(facelets[f * 9 + i] as FaceName);
      if (idx < 0) return null;
      const slot = SLOT.get(key(KOCIEMBA_POS[f]!(Math.floor(i / 3), i % 3), NORMALS[f]!));
      if (slot === undefined) return null;
      s[slot] = idx;
    }
  }
  return s;
}

export function stateToFacelets(s: CubeState): string {
  let out = "";
  for (let f = 0; f < 6; f++)
    for (let i = 0; i < 9; i++) out += FACES[s[SLOT.get(key(KOCIEMBA_POS[f]!(Math.floor(i / 3), i % 3), NORMALS[f]!))!]!];
  return out;
}
