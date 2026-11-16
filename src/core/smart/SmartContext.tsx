import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CubeTracker } from "./tracker";
import { SMART_DRIVERS } from "./drivers";
import type { SmartCube } from "./types";

type Status = "disconnected" | "connecting" | "connected";

interface Ctx {
  cube: SmartCube | null;
  status: Status;
  error: string | null;
  /** Suivi d'état partagé (survit aux changements de page). */
  tracker: CubeTracker;
  connect: (driverId: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

const SmartCtx = createContext<Ctx | null>(null);

export function SmartProvider({ children }: { children: ReactNode }) {
  const [cube, setCube] = useState<SmartCube | null>(null);
  const [status, setStatus] = useState<Status>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const tracker = useMemo(() => new CubeTracker(), []);
  const offs = useRef<Array<() => void>>([]);

  const cleanup = useCallback(() => {
    offs.current.forEach((f) => f());
    offs.current = [];
  }, []);

  const disconnect = useCallback(async () => {
    const c = cube;
    cleanup();
    setCube(null);
    setStatus("disconnected");
    try {
      await c?.disconnect();
    } catch {
      /* déjà déconnecté */
    }
  }, [cube, cleanup]);

  const connect = useCallback(
    async (driverId: string) => {
      const driver = SMART_DRIVERS.find((d) => d.id === driverId);
      if (!driver) return;
      setError(null);
      setStatus("connecting");
      try {
        cleanup();
        const c = await driver.connect();
        tracker.markSolved();
        offs.current.push(c.onDisconnect(() => {
          setCube(null);
          setStatus("disconnected");
        }));
        offs.current.push(c.onMove(({ move }) => tracker.apply(move)));
        setCube(c);
        setStatus("connected");
        void c.requestState?.();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // L'annulation du sélecteur Bluetooth n'est pas une vraie erreur.
        setError(/cancel|chosen|NotFound|aborted/i.test(msg) ? "Connexion annulée." : `Connexion impossible : ${msg}`);
        setStatus("disconnected");
      }
    },
    [cleanup, tracker],
  );

  useEffect(() => () => cleanup(), [cleanup]);

  const value = useMemo<Ctx>(() => ({ cube, status, error, tracker, connect, disconnect }), [cube, status, error, tracker, connect, disconnect]);
  return <SmartCtx.Provider value={value}>{children}</SmartCtx.Provider>;
}

export function useSmart(): Ctx {
  const c = useContext(SmartCtx);
  if (!c) throw new Error("useSmart doit être utilisé dans <SmartProvider>");
  return c;
}
