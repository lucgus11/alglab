import { invertMoves, simplifyMoves, type Move } from "../cube/notation";
import { SOLVED, applyMove, cloneState, isSolved, type CubeState } from "../cube/sim";

/**
 * Suit l'état du cube à partir des mouvements reçus du smart cube.
 * `history` = mouvements depuis le dernier état « résolu » connu : son inverse ramène le cube
 * à l'état résolu, ce qui permet de calculer un mélange vers n'importe quel cas, même si le cube
 * n'est pas résolu (ex. après un OLL où l'on a utilisé une autre variante).
 */
export class CubeTracker {
  state: CubeState = cloneState(SOLVED as CubeState);
  history: Move[] = [];
  /** false si l'état vient d'une resynchronisation d'un état non résolu (chemin inconnu). */
  pathKnown = true;

  apply(m: Move): void {
    this.state = applyMove(this.state, m);
    if (this.pathKnown) this.history = simplifyMoves([...this.history, m]);
    if (isSolved(this.state)) this.markSolved();
  }

  markSolved(): void {
    this.state = cloneState(SOLVED as CubeState);
    this.history = [];
    this.pathKnown = true;
  }

  /** Resynchronisation depuis le matériel. */
  sync(s: CubeState): void {
    this.state = s;
    if (isSolved(s)) this.markSolved();
    else {
      this.history = [];
      this.pathKnown = false;
    }
  }

  /** Chemin pour revenir à « résolu » (vide si inconnu). */
  pathToSolved(): Move[] {
    return this.pathKnown ? invertMoves(this.history) : [];
  }
}

/**
 * Mélange guidé : maintient la liste des mouvements restants. Si l'utilisateur dévie, l'inverse de
 * son mouvement est ajouté en tête (correction), puis la liste est simplifiée.
 */
export class GuidedPath {
  todo: Move[];
  constructor(path: Move[]) {
    this.todo = simplifyMoves(path);
  }

  feed(m: Move): void {
    const inv = invertMoves([m])[0]!;
    this.todo = simplifyMoves([inv, ...this.todo]);
  }

  get done(): boolean {
    return this.todo.length === 0;
  }

  /** Vrai si le prochain mouvement attendu est une correction (pas dans le chemin initial). */
  next(): Move | undefined {
    return this.todo[0];
  }
}
