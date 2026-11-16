/**
 * Vérifie TOUS les algorithmes de la base de données par simulation.
 *
 *   npm run verify:algs
 *
 * Contrôles :
 *  1. Notation valide, sans rotation de cube (x y z)
 *  2. L'algo de référence préserve les deux premières couches
 *  3. Chaque variante résout le MÊME cas que l'algo de référence
 *  4. OLL : 57 cas distincts (à la rotation de U près) ; PLL : 21 cas distincts (à l'AUF près)
 *  5. Cohérence de famille : arêtes orientées (OLL), structure de permutation (PLL)
 */
import { parseAlg, hasRotations, moveCount } from "../src/core/cube/notation";
import {
  SOLVED,
  applyAlg,
  applyMoves,
  isF2LSolved,
  isLLOriented,
  llView,
  stateKey,
  stickerInfo,
  turnU,
  STICKER_COUNT,
  type CubeState,
} from "../src/core/cube/sim";
import { ALL_SETS, buildInstance, goalReached, goalReachedLenient, type AlgSet } from "../src/core/algsets";

let failures = 0;
const fail = (msg: string) => {
  failures++;
  console.log(`  ✗ ${msg}`);
};

// --------------------------------------------------------------------------
// Analyse pièce par pièce du dernier étage
// --------------------------------------------------------------------------
type PosKey = string;
interface LLPieces {
  corners: PosKey[];
  edges: PosKey[];
  /** couleurs des stickers de chaque position, triées */
  identity: (s: CubeState, pos: PosKey) => string;
  topColor: (s: CubeState, pos: PosKey) => number;
}

function buildLLPieces(): LLPieces {
  const slotsByPos = new Map<PosKey, number[]>();
  for (let i = 0; i < STICKER_COUNT; i++) {
    const st = stickerInfo(i);
    if (st.pos[1] !== 1) continue;
    const k = st.pos.join(",");
    slotsByPos.set(k, [...(slotsByPos.get(k) ?? []), i]);
  }
  const corners: PosKey[] = [];
  const edges: PosKey[] = [];
  for (const [k, slots] of slotsByPos) {
    if (slots.length === 3) corners.push(k);
    else if (slots.length === 2) edges.push(k);
  }
  const order = (a: PosKey, b: PosKey) => a.localeCompare(b);
  corners.sort(order);
  edges.sort(order);
  return {
    corners,
    edges,
    identity: (s, pos) =>
      slotsByPos
        .get(pos)!
        .map((i) => s[i]!)
        .sort((a, b) => a - b)
        .join(""),
    topColor: (s, pos) => s[slotsByPos.get(pos)!.find((i) => stickerInfo(i).face === 0)!]!,
  };
}
const LL = buildLLPieces();

/** Permutation « la pièce en position p vient de la position q ». */
function pieceCycles(s: CubeState, positions: PosKey[]): { cycles: number[]; swapped: PosKey[][] } {
  const home = new Map<string, PosKey>();
  for (const p of positions) home.set(LL.identity(SOLVED as CubeState, p), p);
  const sitting = new Map<PosKey, PosKey>();
  for (const p of positions) sitting.set(p, home.get(LL.identity(s, p)) ?? "?");
  const seen = new Set<PosKey>();
  const cycles: number[] = [];
  const swapped: PosKey[][] = [];
  for (const p of positions) {
    if (seen.has(p)) continue;
    const cyc: PosKey[] = [];
    let cur = p;
    while (!seen.has(cur)) {
      seen.add(cur);
      cyc.push(cur);
      cur = sitting.get(cur)!;
    }
    if (cyc.length > 1) {
      cycles.push(cyc.length);
      swapped.push(cyc);
    }
  }
  return { cycles: cycles.sort((a, b) => b - a), swapped };
}

const adjacent = (a: PosKey, b: PosKey) => {
  const [ax, , az] = a.split(",").map(Number);
  const [bx, , bz] = b.split(",").map(Number);
  return ax === bx || az === bz;
};

// --------------------------------------------------------------------------
// OLL
// --------------------------------------------------------------------------
function ollKey(s: CubeState): string {
  let best = "";
  for (let k = 0; k < 4; k++) {
    const v = llView(turnU(s, k));
    const key = [...v.top, ...v.front, ...v.right, ...v.back, ...v.left].map((c) => (c === 0 ? 1 : 0)).join("");
    if (best === "" || key < best) best = key;
  }
  return best;
}

function ascii(s: CubeState): string {
  const v = llView(s);
  const m = (c: number) => (c === 0 ? "■" : "·");
  const rows: string[] = [];
  rows.push("   " + v.back.map(m).join(""));
  for (let r = 0; r < 3; r++) rows.push(m(v.left[r]!) + " " + v.top.slice(r * 3, r * 3 + 3).map(m).join("") + " " + m(v.right[r]!));
  rows.push("   " + v.front.map(m).join(""));
  return rows.join("\n");
}

function checkOLL(set: AlgSet) {
  console.log(`\n=== ${set.name} — ${set.cases.length} cas ===`);
  const keys = new Map<string, string>();
  const familyCount = new Map<string, number>();
  for (const c of set.cases) {
    familyCount.set(c.family, (familyCount.get(c.family) ?? 0) + 1);
    const inst = buildInstance(c.algs[0]!.alg);
    const s = inst.state;
    const label = `${c.name}`;
    if (!isF2LSolved(s)) fail(`${label}: l'algo de référence ne préserve pas F2L`);
    if (isLLOriented(s)) fail(`${label}: le cas est déjà orienté`);

    const key = ollKey(s);
    const prev = keys.get(key);
    if (prev) fail(`${label}: identique à ${prev} (cas dupliqué)`);
    else keys.set(key, label);

    // Cohérence de famille
    const edgesOriented = LL.edges.filter((p) => LL.topColor(s, p) === 0).length;
    const cornersOriented = LL.corners.filter((p) => LL.topColor(s, p) === 0).length;
    const expectEdges: Record<string, number> = { dot: 0, cross: 4 };
    const exp = expectEdges[c.family];
    if (exp !== undefined && edgesOriented !== exp) fail(`${label}: famille « ${c.family} » mais ${edgesOriented} arêtes orientées`);
    if (c.family === "corners" && cornersOriented !== 4) fail(`${label}: famille « corners » mais ${cornersOriented} coins orientés`);
    if (exp === undefined && c.family !== "corners" && edgesOriented !== 2) fail(`${label}: famille « ${c.family} » mais ${edgesOriented} arêtes orientées (2 attendues)`);

    // Variantes
    c.algs.forEach((v, i) => {
      let moves;
      try {
        moves = parseAlg(v.alg);
      } catch (e) {
        fail(`${label} variante ${i}: notation invalide (${(e as Error).message})`);
        return;
      }
      if (hasRotations(moves)) fail(`${label} variante ${i}: contient une rotation de cube`);
      const after = applyMoves(s, moves);
      if (!goalReached(set.goal, after)) {
        let hint = "";
        for (let k = 1; k < 4; k++) if (goalReached(set.goal, applyMoves(turnU(s, k), moves))) hint = ` (fonctionne après un AUF de ${k} × U)`;
        fail(`${label} variante ${i} « ${v.alg} » n'oriente pas ce cas${isF2LSolved(after) ? "" : " (casse F2L)"}${hint}`);
      }
      if (i === 0 && moveCount(moves) > 20) fail(`${label}: algo de référence très long`);
    });
  }
  console.log(`  cas distincts : ${keys.size}/${set.cases.length}`);
  if (set.cases.length !== 57) fail(`${set.cases.length} cas au lieu de 57`);
  if (keys.size !== 57) fail(`${keys.size} cas distincts au lieu de 57`);
  const numbers = new Set(set.cases.map((c) => c.number));
  for (let n = 1; n <= 57; n++) if (!numbers.has(n)) fail(`OLL ${n} manquant`);
  console.log("  familles : " + [...familyCount].map(([f, n]) => `${f}=${n}`).join(", "));
}

// --------------------------------------------------------------------------
// PLL
// --------------------------------------------------------------------------
function pllKey(alg: string): string {
  let best = "";
  for (let a = 0; a < 4; a++)
    for (let b = 0; b < 4; b++) {
      const k = stateKey(buildInstance(alg, a, b).state);
      if (best === "" || k < best) best = k;
    }
  return best;
}

function checkPLL(set: AlgSet) {
  console.log(`\n=== ${set.name} — ${set.cases.length} cas ===`);
  const keys = new Map<string, string>();
  for (const c of set.cases) {
    const label = c.name;
    const s = buildInstance(c.algs[0]!.alg).state;
    if (!isF2LSolved(s)) fail(`${label}: l'algo de référence ne préserve pas F2L`);
    if (!isLLOriented(s)) fail(`${label}: le dernier étage n'est pas orienté (l'algo doit être un PLL)`);

    const key = pllKey(c.algs[0]!.alg);
    const prev = keys.get(key);
    if (prev) fail(`${label}: identique à ${prev}`);
    else keys.set(key, label);

    // Structure de permutation : on retire l'éventuel AUF intégré à l'algo
    // (on garde la combinaison d'AUF qui déplace le moins de pièces).
    // À déplacement minimal égal, plusieurs AUF sont possibles (ex. G-perm : 3+3 ou 2+4) :
    // la famille est cohérente si AU MOINS UN de ces candidats a la structure attendue.
    interface Cand { cs: string; es: string; kind: string; displaced: number }
    const cands: Cand[] = [];
    for (let a = 0; a < 4; a++)
      for (let b = 0; b < 4; b++) {
        const st = buildInstance(c.algs[0]!.alg, a, b).state;
        const cp = pieceCycles(st, LL.corners);
        const ep = pieceCycles(st, LL.edges);
        cands.push({
          cs: cp.cycles.join("+") || "id",
          es: ep.cycles.join("+") || "id",
          kind: cp.swapped[0] && cp.swapped[0].length === 2 ? (adjacent(cp.swapped[0][0]!, cp.swapped[0][1]!) ? "adj" : "diag") : "-",
          displaced: cp.cycles.concat(ep.cycles).reduce((x, y) => x + y, 0),
        });
      }
    const minD = Math.min(...cands.map((x) => x.displaced));
    const best = cands.filter((x) => x.displaced === minD);
    const matches = (x: Cand): boolean => {
      switch (c.family) {
        case "edges":
          return x.cs === "id" && (x.es === "3" || x.es === "2+2");
        case "corners":
          return x.es === "id" && (x.cs === "3" || x.cs === "2+2");
        case "adjacent":
          return x.cs === "2" && x.es === "2" && x.kind === "adj";
        case "diagonal":
          return x.cs === "2" && x.es === "2" && x.kind === "diag";
        case "g":
          return x.cs === "3" && x.es === "3";
        default:
          return false;
      }
    };
    const ok = best.some(matches);
    const shown = best.find(matches) ?? best[0]!;
    if (!ok) fail(`${label}: famille « ${c.family} » incohérente (coins ${shown.cs}, arêtes ${shown.es}, échange ${shown.kind})`);
    console.log(`  ${label.padEnd(8)} coins ${shown.cs.padEnd(4)} arêtes ${shown.es.padEnd(4)} échange ${shown.kind.padEnd(4)}  (${moveCount(parseAlg(c.algs[0]!.alg))} mvts)`);

    c.algs.forEach((v, i) => {
      let moves;
      try {
        moves = parseAlg(v.alg);
      } catch (e) {
        fail(`${label} variante ${i}: notation invalide (${(e as Error).message})`);
        return;
      }
      if (hasRotations(moves)) fail(`${label} variante ${i}: contient une rotation de cube`);
      const after = applyMoves(s, moves);
      if (!goalReachedLenient(set.goal, after)) fail(`${label} variante ${i} « ${v.alg} » ne résout pas ce cas`);
    });
  }
  console.log(`  cas distincts : ${keys.size}/${set.cases.length}`);
  if (set.cases.length !== 21) fail(`${set.cases.length} cas au lieu de 21`);
  if (keys.size !== 21) fail(`${keys.size} cas distincts au lieu de 21`);
}

// --------------------------------------------------------------------------
for (const set of ALL_SETS) {
  if (set.id === "oll") checkOLL(set);
  else if (set.id === "pll") checkPLL(set);
}

if (process.argv.includes("--ascii")) {
  const oll = ALL_SETS.find((s) => s.id === "oll")!;
  for (const c of oll.cases) console.log(`\n${c.name} [${c.family}] ${c.nickname ?? ""}\n${ascii(buildInstance(c.algs[0]!.alg).state)}`);
}

// Équivalence croisée de quelques algos connus sous deux formes (contrôle de la notation M/slice)
const cross: [string, string, string][] = [
  ["Ua (M)", "M2 U M U2 M' U M2", "R U' R U R U R U' R' U' R2"],
  ["Ub (M)", "M2 U' M U2 M' U' M2", "R2 U R U R' U' R' U' R' U R'"],
  ["Aa (sans rotation)", "R' F R' B2 R F' R' B2 R2", "x R' U R' D2 R U' R' D2 R2 x'"],
  ["Ab (sans rotation)", "R2 B2 R F R' B2 R F' R", "x R2 D2 R U R' D2 R U' R x'"],
];
console.log("\n=== Équivalences croisées (même permutation exacte) ===");
for (const [name, a, b] of cross) {
  const same = stateKey(applyAlg(SOLVED as CubeState, a)) === stateKey(applyAlg(SOLVED as CubeState, b));
  console.log(`  ${same ? "✓" : "≠"} ${name}`);
  if (!same) failures++;
}
// Équivalence à l'AUF près avec des formes de référence connues (contenant des rotations)
const classCross: [string, string, string][] = [["Ja (forme x)", "R' U L' U2 R U' R' U2 R L", "x R2 F R F' R U2 r' U r U2 x'"]];
for (const [name, a, b] of classCross) {
  const same = pllKey(a) === pllKey(b);
  console.log(`  ${same ? "✓" : "≠"} ${name} (à l'AUF près)`);
  if (!same) failures++;
}

console.log(failures === 0 ? "\n✔ Tous les algorithmes sont valides." : `\n✘ ${failures} problème(s) détecté(s).`);
process.exit(failures === 0 ? 0 : 1);
