import { lazy, Suspense, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { buildInstance, getCase, getSet, goalReachedLenient, referenceView } from "@/core/algsets";
import type { AlgCase, AlgSet } from "@/core/algsets";
import { aufMoves, formatMoves, hasRotations, invertAlgString, moveCount, parseAlg } from "@/core/cube/notation";
import { applyMoves } from "@/core/cube/sim";
import { formatMs } from "@/core/srs";
import { preferredVariant, statusOf, useStore, variantsOf } from "@/store/useStore";
import { CaseDiagram } from "@/components/CaseDiagram";
import { AlgText } from "@/components/AlgText";
import { StatusPicker } from "@/components/StatusBadge";

const TwistyView = lazy(() => import("@/components/TwistyView"));

type Validation = { ok: true; alg: string; note?: string } | { ok: false; error: string };

/** Vérifie par simulation qu'un algo saisi résout bien CE cas (avec AUF initial éventuel). */
function validateCustom(set: AlgSet, c: AlgCase, text: string): Validation {
  let moves;
  try {
    moves = parseAlg(text);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Notation invalide" };
  }
  if (moves.length === 0) return { ok: false, error: "Algorithme vide." };
  if (hasRotations(moves)) return { ok: false, error: "Les rotations (x y z) ne sont pas supportées : utilise des mouvements larges (r, l, f…) ou M / E / S." };
  const start = buildInstance(c.algs[0]!.alg).state;
  for (let k = 0; k < 4; k++) {
    const full = [...aufMoves(k), ...moves];
    if (goalReachedLenient(set.goal, applyMoves(start, full))) {
      return k === 0
        ? { ok: true, alg: formatMoves(moves) }
        : { ok: true, alg: formatMoves(full), note: `Cet algo résout le cas depuis une autre orientation : un AUF initial a été ajouté (${formatMoves(aufMoves(k))}).` };
    }
  }
  return { ok: false, error: `Cet algo ne résout pas ${c.name} (le dernier étage ${set.goal === "oll" ? "n'est pas orienté" : "n'est pas résolu"} ou les deux premières couches sont cassées).` };
}

export default function CaseDetail() {
  const { caseId = "" } = useParams();
  const navigate = useNavigate();
  const c = getCase(caseId);
  const set = c ? getSet(c.setId) : undefined;

  const records = useStore((s) => s.records);
  const preferred = useStore((s) => s.preferred);
  const custom = useStore((s) => s.custom);
  const notes = useStore((s) => s.notes);
  const recog = useStore((s) => s.recog[caseId]);
  const { setStatus, setPreferred, addCustomAlg, removeCustomAlg, setNote, resetCaseStats } = useStore.getState();
  const [draft, setDraft] = useState("");
  const [label, setLabel] = useState("");
  const [msg, setMsg] = useState<{ kind: "error" | "info"; text: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const idx = set && c ? set.cases.findIndex((x) => x.id === c.id) : -1;
  const setup = useMemo(() => (c ? invertAlgString(c.algs[0]!.alg) : ""), [c]);

  if (!c || !set) {
    return (
      <div className="p-8 text-center">
        <p className="muted">Cas introuvable.</p>
        <Link to="/library" className="btn btn-primary mt-4">
          Retour à la bibliothèque
        </Link>
      </div>
    );
  }

  const variants = variantsOf(c, custom);
  const pref = preferredVariant(c, preferred, custom);
  const status = statusOf(records, c.id);
  const stats = records[c.id]?.stats;
  const played = preview ?? pref.alg;
  const prev = idx > 0 ? set.cases[idx - 1] : undefined;
  const next = idx < set.cases.length - 1 ? set.cases[idx + 1] : undefined;

  const onAdd = () => {
    const v = validateCustom(set, c, draft);
    if (!v.ok) return setMsg({ kind: "error", text: v.error });
    addCustomAlg(c.id, v.alg, label.trim() || undefined);
    setDraft("");
    setLabel("");
    setMsg(v.note ? { kind: "info", text: v.note } : null);
  };

  return (
    <div className="mx-auto max-w-5xl pb-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button className="btn !min-h-10" onClick={() => navigate(`/library/${set.id}`)}>
          ← {set.shortName}
        </button>
        <div className="flex gap-2">
          <button className="btn !min-h-10" disabled={!prev} onClick={() => prev && navigate(`/case/${prev.id}`, { replace: true })} aria-label="Cas précédent">
            ‹
          </button>
          <button className="btn !min-h-10" disabled={!next} onClick={() => next && navigate(`/case/${next.id}`, { replace: true })} aria-label="Cas suivant">
            ›
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <section className="surface rounded-3xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-extrabold">{c.name}</h1>
                <p className="text-sm muted">
                  {set.families.find((f) => f.id === c.family)?.label}
                  {c.nickname ? ` · ${c.nickname}` : ""}
                </p>
              </div>
              <div className="w-28 shrink-0">
                <CaseDiagram view={referenceView(c)} title={c.name} />
              </div>
            </div>
            <div className="mt-4">
              <StatusPicker value={status} onChange={(s) => setStatus([c.id], s)} />
            </div>
          </section>

          <section className="surface overflow-hidden rounded-3xl">
            <div className="aspect-square w-full sm:aspect-[4/3]">
              <Suspense fallback={<div className="grid h-full place-items-center text-sm muted">Chargement…</div>}>
                <TwistyView setup={setup} alg={played} stickering={set.id === "oll" ? "OLL" : set.id === "pll" ? "PLL" : "full"} className="h-full w-full" />
              </Suspense>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-2">
            <Link to={`/train?set=${set.id}&case=${c.id}`} className="btn btn-primary">
              S'entraîner
            </Link>
            <Link to={`/recognition?set=${set.id}&case=${c.id}`} className="btn">
              Reconnaissance
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <section className="surface rounded-3xl p-5">
            <h2 className="mb-3 font-bold">Algorithmes</h2>
            <ul className="space-y-2" role="radiogroup" aria-label="Algorithme préféré">
              {variants.map((v) => {
                const isPref = v.id === pref.id;
                const isCustom = v.id.startsWith("custom:");
                const n = moveCount(parseAlg(v.alg));
                return (
                  <li key={v.id} className={`rounded-2xl border p-3 ${isPref ? "border-brand-500 bg-brand-500/10" : "border-[var(--border)]"}`}>
                    <div className="flex items-start gap-3">
                      <button role="radio" aria-checked={isPref} aria-label="Choisir comme algorithme préféré" onClick={() => setPreferred(c.id, v.id)} className={`mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${isPref ? "border-brand-500" : "border-slate-400"}`}>
                        {isPref && <span className="h-3 w-3 rounded-full bg-brand-500" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <AlgText alg={v.alg} className="text-[15px]" />
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs muted">
                          <span>{n} mouvements</span>
                          {isCustom && <span>{v.label}</span>}
                          {isPref && <span className="font-semibold text-brand-400">Préféré</span>}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <button className="chip" aria-pressed={preview === v.alg} onClick={() => setPreview(preview === v.alg ? null : v.alg)}>
                          ▶ 3D
                        </button>
                        {isCustom && (
                          <button className="chip" onClick={() => removeCustomAlg(c.id, v.id)} aria-label="Supprimer cet algorithme">
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <details className="mt-4 rounded-2xl surface-2 p-3">
              <summary className="cursor-pointer font-semibold">Ajouter mon propre algorithme</summary>
              <div className="mt-3 space-y-2">
                <input className="input font-mono" value={draft} onChange={(e) => { setDraft(e.target.value); setMsg(null); }} placeholder="R U R' U R U2 R'" autoCapitalize="off" autoCorrect="off" spellCheck={false} aria-label="Algorithme" />
                <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nom (facultatif)" aria-label="Nom de l'algorithme" />
                <button className="btn btn-primary w-full" disabled={!draft.trim()} onClick={onAdd}>
                  Vérifier et ajouter
                </button>
                {msg && <p className={`text-sm ${msg.kind === "error" ? "text-red-500" : "text-emerald-500"}`}>{msg.text}</p>}
                <p className="text-xs muted">L'algo est simulé : il doit résoudre exactement ce cas sans casser les deux premières couches.</p>
              </div>
            </details>
          </section>

          <section className="surface rounded-3xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Statistiques</h2>
              {stats && (
                <button className="text-xs muted underline" onClick={() => resetCaseStats(c.id)}>
                  Réinitialiser
                </button>
              )}
            </div>
            {!stats ? (
              <p className="text-sm muted">Pas encore pratiqué.</p>
            ) : (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="Meilleur" value={formatMs(stats.best)} />
                <Stat label="Moyenne" value={formatMs(stats.avgMs)} />
                <Stat label="Essais" value={String(stats.history.length)} />
                <Stat label="Oublis" value={String(stats.lapses)} />
                <Stat label="Série « facile »" value={String(stats.streak)} />
                <Stat label="Prochaine révision" value={stats.due <= Date.now() ? "maintenant" : new Date(stats.due).toLocaleDateString("fr-BE", { day: "numeric", month: "short" })} />
              </dl>
            )}
            {recog && (
              <p className="mt-3 text-sm muted">
                Reconnaissance : {Math.round((recog.correct / recog.seen) * 100)} % de réussite sur {recog.seen} essais{recog.avgMs ? `, ${formatMs(recog.avgMs)} en moyenne` : ""}.
              </p>
            )}
            {stats && stats.history.length > 0 && (
              <div className="mt-4 flex items-end gap-1" aria-label="Derniers temps">
                {stats.history.slice(-20).map((a, i) => {
                  const max = Math.max(...stats.history.slice(-20).map((x) => x.ms ?? 0), 1);
                  const h = a.ms ? Math.max(8, (a.ms / max) * 48) : 8;
                  const col = a.rating === "easy" ? "bg-emerald-400" : a.rating === "hesitate" ? "bg-amber-400" : "bg-red-400";
                  return <div key={i} className={`w-full rounded-sm ${col}`} style={{ height: h }} title={`${formatMs(a.ms)} — ${a.rating}`} />;
                })}
              </div>
            )}
          </section>

          <section className="surface rounded-3xl p-5">
            <h2 className="mb-2 font-bold">Notes</h2>
            <textarea className="input min-h-24" placeholder="Astuces de reconnaissance, doigté, pièges…" value={notes[c.id] ?? ""} onChange={(e) => setNote(c.id, e.target.value)} />
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl surface-2 p-3">
      <dt className="text-xs muted">{label}</dt>
      <dd className="text-lg font-bold">{value}</dd>
    </div>
  );
}
