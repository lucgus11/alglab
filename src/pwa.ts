import { useEffect, useState, useCallback } from "react";
import { registerSW } from "virtual:pwa-register";

type Listener = () => void;
const listeners = new Set<Listener>();
let offlineReady = false;
let needRefresh = false;
let updateSW: ((reload?: boolean) => Promise<void>) | null = null;

const notify = () => listeners.forEach((l) => l());

/** À appeler une fois au démarrage (production uniquement : en dev le SW est désactivé). */
export function initPWA() {
  if (!("serviceWorker" in navigator)) return;
  updateSW = registerSW({
    immediate: true,
    onOfflineReady() {
      offlineReady = true;
      notify();
    },
    onNeedRefresh() {
      needRefresh = true;
      notify();
    },
    onRegisteredSW(_url, reg) {
      // Vérifie les mises à jour toutes les heures si l'app reste ouverte.
      if (reg) setInterval(() => void reg.update(), 60 * 60 * 1000);
    },
  });
  // Demande un stockage persistant pour que la progression ne soit pas purgée par le navigateur.
  void navigator.storage?.persist?.();
}

export function usePWAStatus() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return {
    offlineReady,
    needRefresh,
    dismiss: () => {
      offlineReady = false;
      needRefresh = false;
      notify();
    },
    update: () => void updateSW?.(true),
  };
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Bouton « Installer l'application » (Chrome / Edge / Android). iOS : instructions manuelles. */
export function useInstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(window.matchMedia("(display-mode: standalone)").matches);
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  const install = useCallback(async () => {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    setEvt(null);
  }, [evt]);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return { canInstall: !!evt, install, installed, isIOS };
}
