import { useRef, useState } from "react";
import { ALL_SETS } from "@/core/algsets";
import { useStore, type ThemeSetting } from "@/store/useStore";
import { useInstallPrompt } from "@/pwa";

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <div className="font-semibold">{title}</div>
        {hint && <div className="text-xs muted">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-8 w-14 rounded-full transition ${checked ? "bg-brand-600" : "bg-slate-400/50"}`}>
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${checked ? "left-7" : "left-1"}`} />
    </button>
  );
}

export default function Settings() {
  const s = useStore((x) => x.settings);
  const update = useStore((x) => x.updateSettings);
  const exportData = useStore((x) => x.exportData);
  const importData = useStore((x) => x.importData);
  const resetAll = useStore((x) => x.resetAll);
  const { canInstall, install, installed, isIOS } = useInstallPrompt();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const doExport = () => {
    const blob = new Blob([exportData()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `alglab-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMsg("Sauvegarde exportée.");
  };

  const doImport = async (file: File) => {
    const r = importData(await file.text());
    setMsg(r.ok ? "Sauvegarde importée." : r.error);
  };

  const themes: { id: ThemeSetting; label: string }[] = [
    { id: "system", label: "Auto" },
    { id: "light", label: "Clair" },
    { id: "dark", label: "Sombre" },
  ];

  return (
    <div className="mx-auto max-w-xl space-y-4 pb-4">
      <h1 className="text-2xl font-extrabold">Réglages</h1>

      <section className="surface divide-y divide-[var(--border)] rounded-3xl px-5 py-2">
        <Row title="Thème">
          <div className="grid grid-cols-3 gap-1 rounded-xl surface-2 p-1">
            {themes.map((t) => (
              <button key={t.id} className={`min-h-9 rounded-lg px-3 text-sm font-semibold ${s.theme === t.id ? "bg-brand-600 text-white" : "muted"}`} onClick={() => update({ theme: t.id })}>
                {t.label}
              </button>
            ))}
          </div>
        </Row>
        <Row title="Style des diagrammes" hint="Auto : jaune/gris pour l'OLL, couleurs pour le PLL">
          <div className="grid grid-cols-3 gap-1 rounded-xl surface-2 p-1">
            {([["auto", "Auto"], ["colors", "Couleurs"], ["mono", "Jaune"]] as const).map(([id, label]) => (
              <button key={id} className={`min-h-9 rounded-lg px-2 text-sm font-semibold ${s.diagramStyle === id ? "bg-brand-600 text-white" : "muted"}`} onClick={() => update({ diagramStyle: id })}>
                {label}
              </button>
            ))}
          </div>
        </Row>
        <Row title="Mode gaucher" hint="Inverse l'ordre des boutons d'évaluation">
          <Toggle label="Mode gaucher" checked={s.leftHanded} onChange={(v) => update({ leftHanded: v })} />
        </Row>
        <Row title="Vibrations" hint="Retour haptique sur mobile">
          <Toggle label="Vibrations" checked={s.haptics} onChange={(v) => update({ haptics: v })} />
        </Row>
      </section>

      <section className="surface divide-y divide-[var(--border)] rounded-3xl px-5 py-2">
        <h2 className="py-2 font-bold">Entraînement</h2>
        <Row title="Montrer le cas pendant l'entraînement" hint="Sinon : mélange seul (plus réaliste)">
          <Toggle label="Montrer le cas" checked={s.showCaseInTrain} onChange={(v) => update({ showCaseInTrain: v })} />
        </Row>
        <Row title="Statut automatique" hint="« En cours » dès le 1er essai ; « Maîtrisé » après 5 « Facile » d'affilée">
          <Toggle label="Statut automatique" checked={s.autoPromote} onChange={(v) => update({ autoPromote: v })} />
        </Row>
        <Row title="Notation auto (smart cube)" hint="Évalue selon temps et nombre de mouvements, sans toucher l'écran">
          <Toggle label="Notation automatique" checked={s.smartAutoRate} onChange={(v) => update({ smartAutoRate: v })} />
        </Row>
        {ALL_SETS.map((set) => (
          <Row key={set.id} title={`Temps cible ${set.shortName}`} hint="Au-delà : « Hésitation » en notation auto">
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0.5}
                max={30}
                step={0.5}
                className="input !w-20 text-center"
                value={(s.targetMs[set.id] ?? 4000) / 1000}
                onChange={(e) => update({ targetMs: { ...s.targetMs, [set.id]: Math.max(500, Number(e.target.value) * 1000) } })}
                aria-label={`Temps cible ${set.shortName} en secondes`}
              />
              <span className="muted">s</span>
            </div>
          </Row>
        ))}
      </section>

      <section className="surface rounded-3xl p-5">
        <h2 className="mb-1 font-bold">Application</h2>
        {installed ? (
          <p className="text-sm text-emerald-500">✓ Installée sur cet appareil.</p>
        ) : canInstall ? (
          <button className="btn btn-primary w-full" onClick={() => void install()}>
            Installer l'application
          </button>
        ) : (
          <p className="text-sm muted">{isIOS ? "iPhone / iPad : Partager → « Sur l'écran d'accueil »." : "Utilise le menu du navigateur → « Installer l'application »."}</p>
        )}
        <p className="mt-2 text-xs muted">Toutes tes données restent sur cet appareil (aucun compte, aucun serveur).</p>
      </section>

      <section className="surface space-y-2 rounded-3xl p-5">
        <h2 className="font-bold">Données</h2>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn" onClick={doExport}>
            Exporter
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Importer
          </button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void doImport(f); e.target.value = ""; }} />
        <button
          className="btn w-full !text-red-500"
          onClick={() => {
            if (confirm("Effacer toute ta progression, tes temps et tes algos personnalisés ? Cette action est irréversible.")) {
              resetAll();
              setMsg("Données réinitialisées.");
            }
          }}
        >
          Tout réinitialiser
        </button>
        {msg && <p className="text-sm muted" role="status">{msg}</p>}
      </section>

      <p className="pb-2 text-center text-xs muted">AlgLab · 57 OLL + 21 PLL, chaque algorithme vérifié par simulation.</p>
    </div>
  );
}
