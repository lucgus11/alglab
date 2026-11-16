import { memo } from "react";
import type { LLView } from "@/core/cube/sim";
import { FACE_COLORS } from "@/core/colors";
import { useStore, type DiagramStyle } from "@/store/useStore";

interface Props {
  view: LLView;
  size?: number | string;
  /** "all" = 4 côtés ; "two" = haut + devant + droite (reconnaissance 2-sided). */
  sides?: "all" | "two";
  style?: DiagramStyle;
  className?: string;
  title?: string;
}

const C = 20; // cellule
const G = 2; // espace
const T = 7; // épaisseur d'un autocollant latéral
const P = 2; // marge
const OFF = P + T + G;
const SIZE = OFF * 2 + 3 * C + 2 * G;

/** Diagramme « vue de dessus » : face U 3×3 entourée des autocollants latéraux du dernier étage. */
function CaseDiagramBase({ view, size = "100%", sides = "all", style, className, title }: Props) {
  const globalStyle = useStore((s) => s.settings.diagramStyle);
  const requested = style ?? globalStyle;
  // « auto » : jaune/gris tant que le dernier étage n'est pas orienté (OLL), couleurs réelles ensuite (PLL).
  const st = requested === "auto" ? (view.top.every((c) => c === 0) ? "colors" : "mono") : requested;
  const dark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const grayTop = dark ? "#334155" : "#94a3b8";
  const grayEdge = dark ? "#1e293b" : "#cbd5e1";

  const fillTop = (c: number) => (st === "colors" ? FACE_COLORS[c]! : c === 0 ? FACE_COLORS[0]! : grayTop);
  const fillSide = (c: number) => (st === "colors" ? FACE_COLORS[c]! : c === 0 ? FACE_COLORS[0]! : grayEdge);

  const rects: React.ReactNode[] = [];
  view.top.forEach((c, i) => {
    rects.push(<rect key={`t${i}`} x={OFF + (i % 3) * (C + G)} y={OFF + Math.floor(i / 3) * (C + G)} width={C} height={C} rx={3} fill={fillTop(c)} />);
  });
  const show = (k: "back" | "left") => sides === "all" || (k !== "back" && k !== "left");
  if (show("back")) {
    view.back.forEach((c, i) => rects.push(<rect key={`b${i}`} x={OFF + i * (C + G)} y={P} width={C} height={T} rx={2} fill={fillSide(c)} />));
  }
  view.front.forEach((c, i) => rects.push(<rect key={`f${i}`} x={OFF + i * (C + G)} y={SIZE - P - T} width={C} height={T} rx={2} fill={fillSide(c)} />));
  if (show("left")) {
    view.left.forEach((c, i) => rects.push(<rect key={`l${i}`} x={P} y={OFF + i * (C + G)} width={T} height={C} rx={2} fill={fillSide(c)} />));
  }
  view.right.forEach((c, i) => rects.push(<rect key={`r${i}`} x={SIZE - P - T} y={OFF + i * (C + G)} width={T} height={C} rx={2} fill={fillSide(c)} />));

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={size} height={size} className={className} role="img" aria-label={title ?? "Cas du dernier étage"}>
      {title ? <title>{title}</title> : null}
      <rect x={OFF - G} y={OFF - G} width={3 * C + 4 * G} height={3 * C + 4 * G} rx={5} fill={dark ? "#0b1020" : "#0f172a"} opacity={0.9} />
      {rects}
    </svg>
  );
}

export const CaseDiagram = memo(CaseDiagramBase);
