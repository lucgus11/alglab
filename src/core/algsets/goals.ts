import { isF2LSolved, isLLOriented, isSolved, isSolvedUpToAUF, type CubeState } from "../cube/sim";
import type { GoalId } from "./types";

/**
 * Condition « le cas est résolu ».
 *  - strict : utilisé pendant l'entraînement (le chrono s'arrête à cet instant)
 *  - lenient : utilisée pour VALIDER un algo (un AUF final est toléré)
 */
export function goalReached(goal: GoalId, s: CubeState): boolean {
  switch (goal) {
    case "oll":
      return isF2LSolved(s) && isLLOriented(s);
    case "solved":
      return isSolved(s);
  }
}

export function goalReachedLenient(goal: GoalId, s: CubeState): boolean {
  switch (goal) {
    case "oll":
      return isF2LSolved(s) && isLLOriented(s);
    case "solved":
      return isSolvedUpToAUF(s);
  }
}
