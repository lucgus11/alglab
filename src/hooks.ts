import { useEffect, useRef, useState } from "react";
import { useStore } from "@/store/useStore";

/** Applique le thème (clair / sombre / système) sur <html> et la balise theme-color. */
export function useTheme() {
  const theme = useStore((s) => s.settings.theme);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && mq.matches);
      document.documentElement.classList.toggle("dark", dark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0b1020" : "#f6f7fb");
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
}

/** Empêche la mise en veille de l'écran pendant l'entraînement (si supporté). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
        if (cancelled) void lock.release();
      } catch {
        /* refusé : sans importance */
      }
    };
    void acquire();
    const onVis = () => document.visibilityState === "visible" && void acquire();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      void lock?.release();
    };
  }, [active]);
}

export function vibrate(pattern: number | number[]) {
  if (useStore.getState().settings.haptics && "vibrate" in navigator) navigator.vibrate(pattern);
}

/** Affiche un temps qui s'écoule (rafraîchi par requestAnimationFrame) tant que `running`. */
export function useElapsed(running: boolean, startAt: number | null): number {
  const [ms, setMs] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    if (!running || startAt == null) return;
    const tick = () => {
      setMs(performance.now() - startAt);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [running, startAt]);
  return running ? ms : 0;
}

export function useQuery(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}
