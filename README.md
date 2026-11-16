# AlgLab — Entraîneur OLL & PLL (PWA)

PWA rapide, responsive et **100 % hors-ligne** pour apprendre, réviser et chronométrer les **57 OLL** et **21 PLL**
du Rubik's Cube 3x3. React 19 · TypeScript strict · Tailwind v4 · Vite · `cubing` (3D) · zustand.

## Démarrer

```bash
npm install
npm run dev          # http://localhost:5173  (service worker désactivé en dev)
npm run verify:algs  # simule les 78 cas et tous leurs algos (doit afficher ✔)
npm run build && npm run preview   # teste la vraie PWA (installable, hors-ligne)
```

## Déployer

**GitHub** : `git init && git add . && git commit -m "AlgLab" && git remote add origin <url> && git push -u origin main`
(la CI `.github/workflows/ci.yml` vérifie les algos et le build à chaque push).

**Vercel** : « Add New → Project » → importe le dépôt. Rien à configurer : `vercel.json` fournit le build Vite,
le fallback SPA et les en-têtes de cache (le service worker n'est jamais mis en cache).

## Fonctionnalités

| | |
|---|---|
| Bibliothèque | 57 OLL / 21 PLL par familles, recherche, filtres, sélection multiple, statut *À apprendre / En cours / Maîtrisé* |
| Algos | plusieurs variantes par cas, choix du préféré, **ajout de ses propres algos** (validés par simulation) |
| Cube 3D | animation de l'algo (cubing.js), jaune dessus / vert devant, stickering OLL/PLL |
| Entraînement classique | mélange inverse avec AUF aléatoires, chrono (espace / zone tactile large), auto-évaluation Facile / Hésitation / Oublié (touches 1-2-3) |
| Smart cube | Bluetooth : **GAN Gen2/3/4 (`gan-web-bluetooth`)**, GoCube / Rubik's Connect / GiiKER (`cubing`), + cube virtuel clavier pour tester. Mélange **guidé** avec correction des erreurs, chrono au 1er mouvement, arrêt automatique, notation auto |
| Répétition espacée | SM-2 adapté + tirage pondéré (cas lents, oubliés, en retard, jamais vus) |
| Reconnaissance | haut + 2 faces affichés N ms, puis choix du cas ; les cas ratés reviennent plus souvent |
| Données | 100 % locales (localStorage), export / import JSON |

## Architecture

```
src/core/cube/       notation (parse/inverse/simplify) + simulateur 54 facettes (permutations calculées géométriquement)
src/core/algsets/    oll.ts, pll.ts, registre index.ts, objectifs (goals.ts), génération de cas
src/core/srs.ts      répétition espacée      src/core/trainer.ts   sélection + mélanges
src/core/smart/      SmartCube (interface), drivers GAN / cubing / virtuel, suivi d'état, mélange guidé
src/pages, src/components, src/store (zustand + persist)
scripts/verify-algs.ts
```

### Ajouter un set (COLL, ZBLL, F2L…)
1. Créer `src/core/algsets/coll.ts` (même forme que `oll.ts`), choisir un `goal`.
2. Si nouvel objectif : l'ajouter à `GoalId` et à `goalReached` dans `goals.ts`.
3. L'ajouter à `ALL_SETS` dans `algsets/index.ts`. Bibliothèque, entraîneur, stats, reconnaissance et smart cube s'adaptent seuls.
4. Étendre `scripts/verify-algs.ts` avec les contrôles du nouveau set.

### Ajouter un smart cube
Implémenter `SmartCube` (`src/core/smart/types.ts`) et l'ajouter à `SMART_DRIVERS` dans `drivers.ts`.

## Qualité des algorithmes
`npm run verify:algs` simule chaque algo : deux premières couches préservées, cas orienté/résolu, 57 cas OLL et
21 PLL **tous distincts**, cohérence des familles, équivalences croisées. Une variante qui échoue casse la CI.

## Limites connues
- Web Bluetooth : Chrome / Edge (desktop, Android). Pas sur Safari iOS (utiliser un navigateur compatible comme Bluefy).
- Le suivi smart cube suppose que le cube envoie ses mouvements dans le repère de ses centres (cas des GAN / GoCube).
  « Resynchroniser » (GAN) relit l'état réel ; « Cube résolu » recale manuellement.
- Je n'ai pas pu tester avec un vrai smart cube : le flux complet est testé avec le cube virtuel.
- Les algos sont des algos courants (sans rotation x/y/z) ; ajoute les tiens depuis la fiche d'un cas.
