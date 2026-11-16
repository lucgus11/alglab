import type { Move } from "../cube/notation";
import type { CubeState } from "../cube/sim";

/**
 * Abstraction d'un smart cube. Pour ajouter un nouveau matériel (MoYu, QiYi, Rubik's Connect…),
 * il suffit d'implémenter `SmartCube` et de l'enregistrer dans `drivers.ts`.
 */
export interface SmartMoveEvent {
  /** Quart de tour (face uniquement : U D L R F B). */
  move: Move;
  /** performance.now() à la réception (même horloge que le chrono de l'app). */
  at: number;
}

export interface SmartCube {
  readonly name: string;
  readonly driverId: string;
  /** Abonnement aux mouvements. Retourne la fonction de désabonnement. */
  onMove(cb: (e: SmartMoveEvent) => void): () => void;
  /** Abonnement à une resynchronisation d'état complet (facelets) lorsque le matériel le permet. */
  onState?(cb: (s: CubeState) => void): () => void;
  onDisconnect(cb: () => void): () => void;
  /** Demande l'état courant (si supporté). */
  requestState?(): Promise<void>;
  /** Remet l'état interne du cube à « résolu » (si supporté). */
  resetToSolved?(): Promise<void>;
  batteryLevel?(): Promise<number | null>;
  disconnect(): Promise<void>;
}

export interface SmartDriver {
  id: string;
  label: string;
  hint: string;
  /** Disponible dans ce navigateur ? */
  supported(): boolean;
  connect(): Promise<SmartCube>;
}

export type FaceMove = Move & { family: "U" | "R" | "F" | "D" | "L" | "B" };
