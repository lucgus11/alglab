import { useEffect, useRef, useState } from "react";

interface Props {
  /** Mélange appliqué depuis l'état résolu (setup). */
  setup: string;
  /** Algorithme animé. */
  alg: string;
  stickering?: "full" | "OLL" | "PLL" | "LL";
  className?: string;
}

const F2L_DIM_EDGES = "DDDD----DDDD";
const MASKS = {
  OLL: "EDGES:DDDDOOOODDDD,CORNERS:DDDDOOOO,CENTERS:------",
  PLL: `EDGES:${F2L_DIM_EDGES},CORNERS:DDDD----,CENTERS:------`,
  LL: `EDGES:${F2L_DIM_EDGES},CORNERS:DDDD----,CENTERS:------`,
} as const;

/**
 * Cube 3D animé (cubing.js/twisty). Chargé à la demande pour ne pas alourdir le démarrage ;
 * il est précaché par le service worker, donc disponible hors-ligne.
 */
export default function TwistyView({ setup, alg, stickering = "full", className = "" }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    let el: HTMLElement | null = null;
    setState("loading");
    import("cubing/twisty")
      .then(({ TwistyPlayer }) => {
        if (cancelled || !host.current) return;
        const dark = document.documentElement.classList.contains("dark");
        const player = new TwistyPlayer({
          puzzle: "3x3x3",
          alg,
          // z2 : jaune dessus, vert devant (comme les diagrammes 2D). Le dernier étage est alors la
          // couche « D » du modèle de cubing, d'où le masque personnalisé ci-dessous.
          experimentalSetupAlg: `z2 ${setup}`,
          experimentalSetupAnchor: "start",
          visualization: "3D",
          background: "none",
          controlPanel: "bottom-row",
          hintFacelets: "none",
          backView: "none",
          colorScheme: dark ? "dark" : "light",
          viewerLink: "none",
          cameraLatitude: 30,
          cameraLongitude: 25,
          tempoScale: 1.2,
        });
        if (stickering !== "full") player.experimentalStickeringMaskOrbits = MASKS[stickering];
        el = player;
        host.current.replaceChildren(player);
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
      el?.remove();
    };
  }, [setup, alg, stickering]);

  return (
    <div className={`relative ${className}`}>
      <div ref={host} className="h-full w-full" />
      {state === "loading" && <div className="absolute inset-0 grid place-items-center text-sm muted">Chargement du cube 3D…</div>}
      {state === "error" && <div className="absolute inset-0 grid place-items-center p-4 text-center text-sm muted">Cube 3D indisponible sur cet appareil (WebGL requis).</div>}
    </div>
  );
}
