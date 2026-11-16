import { Link } from "react-router-dom";
import { ALL_SETS } from "@/core/algsets";
import { summarize } from "@/core/stats";
import { formatMs } from "@/core/srs";
import { useStore } from "@/store/useStore";
import { useInstallPrompt } from "@/pwa";
import { CaseDiagram } from "@/components/CaseDiagram";
import { referenceView } from "@/core/algsets";

function Onboarding() {
  const done = useStore((s) => s.completeOnboarding);
  const setStatus = useStore((s) => s.setStatus);
  const twoLook = ALL_SETS.flatMap((s) => s.cases).filter((c) => c.tags.includes("2look"));
  return (
    <section className="surface rounded-3xl p-5">
      <h2 className="text-lg font-bold">Bienvenue 👋</h2>
      <p className="mt-1 text-sm muted">
        Tu maîtrises déjà le 2-Look OLL et PLL ? On peut marquer d'emblée les {twoLook.length} cas dont tu connais déjà l'algorithme comme « Maîtrisés », pour te concentrer sur le reste.
        Tu pourras tout modifier cas par cas dans la bibliothèque.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          className="btn btn-primary flex-1"
          onClick={() => {
            setStatus(twoLook.map((c) => c.id), "mastered");
            done();
          }}
        >
          Oui, marquer mes cas 2-Look
        </button>
        <button className="btn flex-1" onClick={done}>
          Non, partir de zéro
        </button>
      </div>
    </section>
  );
}

export default function Home() {
  const records = useStore((s) => s.records);
  const onboarded = useStore((s) => s.onboarded);
  const { canInstall, install, installed, isIOS } = useInstallPrompt();
  const now = Date.now();
  const summaries = ALL_SETS.map((set) => ({ set, sum: summarize(set, records, now) }));
  const totalDue = summaries.reduce((a, s) => a + s.sum.due, 0);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 pb-4">
      <header className="flex items-center justify-between sm:hidden">
        <div className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
          <img src="/favicon.svg" alt="" className="h-9 w-9" />
          AlgLab
        </div>
      </header>

      {!onboarded && <Onboarding />}

      <section className="surface flex items-center justify-between gap-4 rounded-3xl p-5">
        <div>
          <div className="text-sm muted">À réviser maintenant</div>
          <div className="text-4xl font-extrabold">{totalDue}</div>
        </div>
        <Link to={`/train?due=1`} className="btn btn-primary min-h-14 px-6 text-base">
          Lancer la révision
        </Link>
      </section>

      {summaries.map(({ set, sum }) => {
        const pct = (n: number) => `${(n / sum.total) * 100}%`;
        return (
          <section key={set.id} className="surface rounded-3xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">{set.shortName}</h2>
                <p className="text-sm muted">{set.description}</p>
              </div>
              <div className="text-right text-sm">
                <div className="font-bold">
                  {sum.counts.mastered}/{sum.total}
                </div>
                <div className="muted">maîtrisés</div>
              </div>
            </div>

            <div className="mt-4 flex h-3 overflow-hidden rounded-full surface-2" role="img" aria-label={`${sum.counts.mastered} maîtrisés, ${sum.counts.learning} en cours, ${sum.counts.todo} à apprendre`}>
              <div className="bg-emerald-400" style={{ width: pct(sum.counts.mastered) }} />
              <div className="bg-amber-400" style={{ width: pct(sum.counts.learning) }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs muted">
              <span>🟢 {sum.counts.mastered} maîtrisés</span>
              <span>🟡 {sum.counts.learning} en cours</span>
              <span>⚪ {sum.counts.todo} à apprendre</span>
              <span>⏱ moyenne {formatMs(sum.avgMs)}</span>
            </div>

            {sum.slowest.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide muted">Les plus lents</div>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {sum.slowest.map(({ c, ms }) => (
                    <Link key={c.id} to={`/case/${c.id}`} className="surface-2 flex w-24 shrink-0 flex-col items-center gap-1 rounded-2xl p-2">
                      <CaseDiagram view={referenceView(c)} size={64} />
                      <div className="text-xs font-bold">{c.name.replace("-perm", "")}</div>
                      <div className="text-[11px] muted">{formatMs(ms)}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link to={`/library/${set.id}`} className="btn">
                Voir les cas
              </Link>
              <Link to={`/train?set=${set.id}`} className="btn btn-primary">
                S'entraîner
              </Link>
            </div>
          </section>
        );
      })}

      {!installed && (canInstall || isIOS) && (
        <section className="surface rounded-3xl p-5">
          <h2 className="font-bold">Installer l'application</h2>
          {canInstall ? (
            <>
              <p className="mt-1 text-sm muted">Ajoute AlgLab à ton écran d'accueil : plein écran, hors-ligne, lancement instantané.</p>
              <button className="btn btn-primary mt-3 w-full" onClick={() => void install()}>
                Installer
              </button>
            </>
          ) : (
            <p className="mt-1 text-sm muted">Sur iPhone / iPad : bouton Partager, puis « Sur l'écran d'accueil ».</p>
          )}
        </section>
      )}
    </div>
  );
}
