import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getCase } from "@/core/algsets";
import type { AlgCase, AlgVariant } from "@/core/algsets";
import { applyAttempt, suggestStatus, type Attempt, type CaseStats, type Status } from "@/core/srs";
import type { CaseRecord } from "@/core/trainer";

export type ThemeSetting = "system" | "light" | "dark";
export type DiagramStyle = "auto" | "colors" | "mono";

export interface Settings {
  theme: ThemeSetting;
  diagramStyle: DiagramStyle;
  /** Temps cible par set (ms) : sert à la notation automatique du smart cube. */
  targetMs: Record<string, number>;
  autoPromote: boolean;
  /** Notation automatique en mode smart cube (aucun contact avec l'écran). */
  smartAutoRate: boolean;
  /** Reconnaissance : durée d'affichage (ms) et nombre de choix. */
  recognitionMs: number;
  recognitionChoices: number;
  /** Afficher le dessin du cas pendant l'entraînement (sinon : mélange seul). */
  showCaseInTrain: boolean;
  haptics: boolean;
  /** Mode gaucher : zone de chrono et boutons inversés. */
  leftHanded: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  diagramStyle: "auto",
  targetMs: { oll: 4000, pll: 3500 },
  autoPromote: true,
  smartAutoRate: true,
  recognitionMs: 1500,
  recognitionChoices: 6,
  showCaseInTrain: false,
  haptics: true,
  leftHanded: false,
};

interface Data {
  records: Record<string, CaseRecord>;
  preferred: Record<string, string>;
  custom: Record<string, AlgVariant[]>;
  notes: Record<string, string>;
  settings: Settings;
  onboarded: boolean;
}

interface Actions {
  setStatus: (ids: string[], status: Status) => void;
  recordAttempt: (caseId: string, attempt: Attempt) => void;
  recordRecognition: (caseId: string, correct: boolean, ms: number) => void;
  setPreferred: (caseId: string, algId: string) => void;
  addCustomAlg: (caseId: string, alg: string, label?: string) => string;
  removeCustomAlg: (caseId: string, algId: string) => void;
  setNote: (caseId: string, note: string) => void;
  resetCaseStats: (caseId: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  completeOnboarding: () => void;
  exportData: () => string;
  importData: (json: string) => { ok: true } | { ok: false; error: string };
  resetAll: () => void;
}

export type Store = Data & Actions;

const emptyData = (): Data => ({
  records: {},
  preferred: {},
  custom: {},
  notes: {},
  settings: { ...DEFAULT_SETTINGS },
  onboarded: false,
});

/** Stats de reconnaissance (séparées pour ne pas polluer la répétition espacée de l'exécution). */
export interface RecogStats {
  seen: number;
  correct: number;
  avgMs: number | null;
}

type PersistShape = Data & { recog: Record<string, RecogStats> };

interface StoreWithRecog extends Store {
  recog: Record<string, RecogStats>;
}

export const useStore = create<StoreWithRecog>()(
  persist(
    (set, get) => ({
      ...emptyData(),
      recog: {},

      setStatus: (ids, status) =>
        set((s) => {
          const records = { ...s.records };
          for (const id of ids) records[id] = { ...records[id], status };
          return { records };
        }),

      recordAttempt: (caseId, attempt) =>
        set((s) => {
          const prev = s.records[caseId];
          const stats: CaseStats = applyAttempt(prev?.stats, attempt);
          const status = s.settings.autoPromote ? suggestStatus(prev?.status ?? "todo", stats, attempt.rating) : (prev?.status ?? "todo");
          return { records: { ...s.records, [caseId]: { status, stats } } };
        }),

      recordRecognition: (caseId, correct, ms) =>
        set((s) => {
          const p = s.recog[caseId] ?? { seen: 0, correct: 0, avgMs: null };
          const next: RecogStats = {
            seen: p.seen + 1,
            correct: p.correct + (correct ? 1 : 0),
            avgMs: correct ? (p.avgMs == null ? ms : p.avgMs * 0.7 + ms * 0.3) : p.avgMs,
          };
          return { recog: { ...s.recog, [caseId]: next } };
        }),

      setPreferred: (caseId, algId) => set((s) => ({ preferred: { ...s.preferred, [caseId]: algId } })),

      addCustomAlg: (caseId, alg, label) => {
        const id = `custom:${caseId}:${Date.now().toString(36)}`;
        set((s) => ({
          custom: { ...s.custom, [caseId]: [...(s.custom[caseId] ?? []), { id, alg, label: label || "Mon algo" }] },
          preferred: { ...s.preferred, [caseId]: id },
        }));
        return id;
      },

      removeCustomAlg: (caseId, algId) =>
        set((s) => {
          const preferred = { ...s.preferred };
          if (preferred[caseId] === algId) delete preferred[caseId];
          return { custom: { ...s.custom, [caseId]: (s.custom[caseId] ?? []).filter((a) => a.id !== algId) }, preferred };
        }),

      setNote: (caseId, note) => set((s) => ({ notes: { ...s.notes, [caseId]: note } })),

      resetCaseStats: (caseId) =>
        set((s) => {
          const records = { ...s.records };
          const r = records[caseId];
          if (r) records[caseId] = { status: r.status };
          return { records };
        }),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      completeOnboarding: () => set({ onboarded: true }),

      exportData: () => {
        const s = get();
        const payload: PersistShape & { app: string; version: number; exportedAt: string } = {
          app: "alglab",
          version: 1,
          exportedAt: new Date().toISOString(),
          records: s.records,
          preferred: s.preferred,
          custom: s.custom,
          notes: s.notes,
          settings: s.settings,
          onboarded: s.onboarded,
          recog: s.recog,
        };
        return JSON.stringify(payload, null, 2);
      },

      importData: (json) => {
        try {
          const d = JSON.parse(json) as Partial<PersistShape> & { app?: string };
          if (d.app !== "alglab" || typeof d.records !== "object") return { ok: false, error: "Fichier non reconnu (pas une sauvegarde AlgLab)." };
          set({
            records: d.records ?? {},
            preferred: d.preferred ?? {},
            custom: d.custom ?? {},
            notes: d.notes ?? {},
            settings: { ...DEFAULT_SETTINGS, ...(d.settings ?? {}) },
            onboarded: d.onboarded ?? true,
            recog: d.recog ?? {},
          });
          return { ok: true };
        } catch {
          return { ok: false, error: "Fichier JSON invalide." };
        }
      },

      resetAll: () => set({ ...emptyData(), onboarded: true, recog: {} }),
    }),
    {
      name: "alglab:v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        records: s.records,
        preferred: s.preferred,
        custom: s.custom,
        notes: s.notes,
        settings: s.settings,
        onboarded: s.onboarded,
        recog: s.recog,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<StoreWithRecog>;
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) } };
      },
    },
  ),
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Toutes les variantes (intégrées + perso) d'un cas. */
export function variantsOf(c: AlgCase, custom: Record<string, AlgVariant[]>): AlgVariant[] {
  return [...c.algs, ...(custom[c.id] ?? [])];
}

/** Variante préférée (ou la première). */
export function preferredVariant(c: AlgCase, preferred: Record<string, string>, custom: Record<string, AlgVariant[]>): AlgVariant {
  const all = variantsOf(c, custom);
  return all.find((a) => a.id === preferred[c.id]) ?? all[0]!;
}

export function statusOf(records: Record<string, CaseRecord>, id: string): Status {
  return records[id]?.status ?? "todo";
}

export function caseById(id: string): AlgCase | undefined {
  return getCase(id);
}

export const STATUS_LABEL: Record<Status, string> = {
  todo: "À apprendre",
  learning: "En cours",
  mastered: "Maîtrisé",
};
