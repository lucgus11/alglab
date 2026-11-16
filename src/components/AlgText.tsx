import { parseAlg, formatMove } from "@/core/cube/notation";

interface Props {
  alg: string;
  className?: string;
  /** Met en évidence les rotations / tranches. */
  highlight?: boolean;
}

/** Affiche un algo en monospace, avec les mouvements séparés (sans casse de ligne au milieu d'un mouvement). */
export function AlgText({ alg, className = "", highlight = true }: Props) {
  let tokens: string[];
  try {
    tokens = parseAlg(alg).map(formatMove);
  } catch {
    return <span className={`font-mono text-red-500 ${className}`}>{alg}</span>;
  }
  return (
    <span className={`font-mono leading-relaxed ${className}`}>
      {tokens.map((t, i) => (
        <span key={i} className={`inline-block whitespace-nowrap pr-[0.45em] ${highlight && /^[MESxyzudlrfb]/.test(t) ? "text-brand-400" : ""}`}>
          {t}
        </span>
      ))}
    </span>
  );
}
