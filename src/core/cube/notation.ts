/**
 * Notation Singmaster : parsing, inversion, formatage et simplification.
 * Supporte : U D L R F B, larges (r / Rw), tranches M E S, rotations x y z,
 * puissances (2, '), et groupes entre parenthèses avec répétition : (R U R' U')3
 */

export interface Move {
  /** U D L R F B | u d l r f b (larges) | M E S | x y z */
  family: string;
  /** Quarts de tour : 1, 2 ou -1 (horaire = 1). */
  amount: 1 | 2 | -1;
}

const FAMILIES = new Set("UDLRFBudlrfbMESxyz".split(""));
const TOKEN_RE = /^([URFDLB]w?|[urfdlb]|[MESxyz])(\d*)('?)$/;

function normAmount(n: number): Move["amount"] | 0 {
  const m = ((n % 4) + 4) % 4;
  return m === 0 ? 0 : m === 1 ? 1 : m === 2 ? 2 : -1;
}

export class NotationError extends Error {}

export function parseAlg(input: string): Move[] {
  const s = input.replace(/[’‘`´]/g, "'").replace(/\s+/g, " ").trim();
  let i = 0;

  const readCount = (): number => {
    let digits = "";
    while (i < s.length && /\d/.test(s[i]!)) digits += s[i++];
    let prime = false;
    if (s[i] === "'") {
      prime = true;
      i++;
    }
    const n = digits ? parseInt(digits, 10) : 1;
    return prime ? -n : n;
  };

  const parseSeq = (closing: boolean): Move[] => {
    const out: Move[] = [];
    while (i < s.length) {
      const c = s[i]!;
      if (c === " ") {
        i++;
        continue;
      }
      if (c === ")") {
        if (!closing) throw new NotationError("Parenthèse fermante inattendue");
        return out;
      }
      if (c === "(") {
        i++;
        const inner = parseSeq(true);
        if (s[i] !== ")") throw new NotationError("Parenthèse non fermée");
        i++;
        const k = readCount();
        const times = Math.abs(k);
        const seq = k < 0 ? invertMoves(inner) : inner;
        for (let t = 0; t < times; t++) out.push(...seq);
        continue;
      }
      let tok = "";
      while (i < s.length && s[i] !== " " && s[i] !== "(" && s[i] !== ")") tok += s[i++];
      const m = TOKEN_RE.exec(tok);
      if (!m) throw new NotationError(`Mouvement invalide : « ${tok} »`);
      let fam = m[1]!;
      if (fam.length === 2) fam = fam[0]!.toLowerCase(); // Rw -> r
      if (!FAMILIES.has(fam)) throw new NotationError(`Mouvement invalide : « ${tok} »`);
      const n = (m[2] ? parseInt(m[2], 10) : 1) * (m[3] ? -1 : 1);
      const amount = normAmount(n);
      if (amount !== 0) out.push({ family: fam, amount });
    }
    if (closing) throw new NotationError("Parenthèse non fermée");
    return out;
  };

  return parseSeq(false);
}

export function invertMoves(moves: Move[]): Move[] {
  return [...moves].reverse().map((m) => ({
    family: m.family,
    amount: (m.amount === 2 ? 2 : (-m.amount as 1 | -1)) as Move["amount"],
  }));
}

/** Fusionne les mouvements consécutifs de même famille (U U' disparaît, U U = U2…). */
export function simplifyMoves(moves: Move[]): Move[] {
  const stack: Move[] = [];
  for (const m of moves) {
    const top = stack[stack.length - 1];
    if (top && top.family === m.family) {
      stack.pop();
      const sum = normAmount(top.amount + m.amount);
      if (sum !== 0) stack.push({ family: m.family, amount: sum });
    } else {
      stack.push({ ...m });
    }
  }
  return stack;
}

export function formatMoves(moves: Move[]): string {
  return moves.map(formatMove).join(" ");
}

export function formatMove(m: Move): string {
  return m.family + (m.amount === 2 ? "2" : m.amount === -1 ? "'" : "");
}

export function invertAlgString(alg: string): string {
  return formatMoves(invertMoves(parseAlg(alg)));
}

/** Texte « propre » : parenthèses développées, apostrophes normalisées. */
export function cleanAlgString(alg: string): string {
  return formatMoves(parseAlg(alg));
}

export function hasRotations(moves: Move[]): boolean {
  return moves.some((m) => "xyz".includes(m.family));
}

/** Nombre de mouvements en métrique « face + tranche » (rotations exclues). */
export function moveCount(moves: Move[]): number {
  return moves.filter((m) => !"xyz".includes(m.family)).length;
}

export function aufMoves(k: number): Move[] {
  const n = normAmount(k);
  return n === 0 ? [] : [{ family: "U", amount: n }];
}

export function isValidAlg(alg: string): boolean {
  try {
    return parseAlg(alg).length > 0;
  } catch {
    return false;
  }
}
