# Fusion CSM BetterStudy → Cadenflu — Partie Frontend

Complète `cadenflu` (Vite + React + TanStack Query + Zustand + Luxon). Aucun changement
d'architecture : TanStack Query pour l'état serveur, Zustand pour l'état UI local, tout en UTC
côté API et conversion Luxon à l'affichage. Dépend des nouveaux endpoints décrits dans
`fusion_csm_backend.md` (`/students`, `/tasks`, `/formations`).

## 1. Principe

Le CSM n'est pas une appli séparée : c'est une vue spécialisée de Cadenflu sur les `Client` de
type `apprenant` (`client_type` existe déjà dans `src/api/models.ts` / `src/utils/clientType.ts`).

- **Réutilisé tel quel** : `CalendarView`, `MultiCalendarPage`, `ClientsPage`, le pattern
  TanStack Query / Zustand, le refresh JWT, `src/utils/datetime.ts`.
- **Étendu** : `ClientDetailPage` (nouvel onglet suivi pédagogique).
- **Nouveau** : `TasksPage` (to-do list), badges de risque, types/alias liés au profil apprenant.

## 2. Lire `src/api/openapi.json` avant de coder

Avant d'écrire le moindre hook ou type pour `/students`, `/tasks`, `/formations` ou `/cron/*`,
lire `src/api/openapi.json` pour vérifier :
- les noms exacts des schémas générés côté backend (`StudentProfileRead`, `TaskRead`,
  `FormationRead`, etc.) — ne pas deviner ces noms, ils viennent du backend ;
- les champs réellement présents et leur nullabilité (ex. si `StudentProfile` est bien imbriqué
  dans la réponse `GET /students/{id}` ou renvoyé à part) ;
- si le fichier n'a pas encore été mis à jour côté backend pour ces endpoints, le signaler
  plutôt que d'inventer une shape — attendre la mise à jour avant de continuer.

Une fois `openapi.json` à jour, lancer `npm run sync:api` pour régénérer `src/api/types.ts`,
puis seulement écrire les alias dans `src/api/models.ts` (section 3 ci-dessous) en se basant
sur les types réellement générés, jamais sur une supposition.

## 3. Nouveaux types (`src/api/models.ts`)

À ajouter sur le même modèle que `ClientType` (alias nommés au-dessus des schémas générés
dans `src/api/types.ts` — ne jamais éditer `types.ts` à la main, toujours passer par
`npm run sync:api` après mise à jour de `src/api/openapi.json`) :

```ts
export type ProgressStatus =
  | 'bon_rythme' | 'a_surveiller' | 'distrait' | 'bloque' | 'suspendu' | 'diplome' | 'cloture'
export type LearnerStatus =
  | 'nouveau' | 'actif' | 'a_risque' | 'examen_prevu' | 'diplome' | 'suspendu' | 'cloture'
export type PaymentStatus = 'solde' | 'mensualise' | 'organisme' | 'impaye'
export type RiskColor = 'vert' | 'jaune' | 'rouge' // calculé côté backend, jamais recalculé ici

export type StudentProfile = components['schemas']['StudentProfileRead']
export type Task = components['schemas']['TaskRead']
export type TaskStatus = 'a_faire' | 'en_cours' | 'fait' | 'reporte'
```

## 4. Nouveaux fichiers utils

`src/utils/studentStatus.ts` (même pattern que `clientType.ts`) :
- `RISK_COLOR_BADGE_STYLES` (vert/jaune/rouge)
- `PROGRESS_STATUS_LABELS`, `LEARNER_STATUS_LABELS`
- Ne recalcule jamais `risk_color` côté frontend — toujours celui renvoyé par l'API.

## 5. Nouveaux hooks (`src/hooks/`)

- `useStudents.ts` — `useQuery(['students', filters])`, wrappe `GET /students`
- `useStudentProfile.ts` — `useQuery`/`useMutation` sur `GET/PATCH /students/{id}/profile`,
  invalide `['students']` après mutation
- `useTasks.ts` — `useQuery(['tasks', filters])` + mutations create/update, invalide `['tasks']`
- `useFormations.ts` — `useQuery(['formations'])`

## 6. Nouvelles/pages étendues (`src/pages/`)

### `TasksPage.tsx` (nouvelle)
To-do list : filtre priorité (urgent/pas urgent), étoiles, statut, date limite. Bouton
« Voir contact » navigue vers `ClientDetailPage` du `client_id` lié. Route à ajouter :
`/tasks`.

### `ClientDetailPage.tsx` (étendue)
Nouvel onglet « Suivi pédagogique », affiché uniquement si `client.client_type === 'apprenant'` :
- Formulaire `StudentProfile` (formation, catégorie, statuts, dates)
- Badge `risk_color` en tête de fiche
- Étapes à cocher (onboarding, examen blanc, examen final, fin de formation, témoignage)
- Notes (liste + ajout)

### `CalendarView.tsx` (pas de nouvelle page — filtre existant étendu)
« Mes RDV du jour » = `CalendarView` avec `date = aujourd'hui` + filtre optionnel
`client.client_type = apprenant`. Pas de nouvelle route, juste un préréglage de filtre sur la
route `/calendar/:date` existante.

### `ClientsPage.tsx` (inchangée, déjà filtrable)
Filtrée sur `client_type = apprenant`, elle devient de facto la liste des apprenants — ajouter
simplement la colonne badge `risk_color` dans le tableau.

## 7. Routes à ajouter

```
/tasks                   TasksPage — to-do list
```

Toutes les autres routes du CSM (fiches apprenant, RDV du jour) réutilisent des routes
existantes (`/clients/:id`, `/calendar/:date`) avec filtres/onglets en plus, pas de nouvelles
routes dédiées.

## 8. Points d'attention à respecter (repris de l'existant)

- Ne jamais appeler un sélecteur Zustand qui retourne un nouveau tableau à chaque rendu
  (cf. piège `visibleIds()` documenté sur `calendarStore`) — même règle pour un futur
  `taskStore` si état UI local nécessaire (ex. filtres de la to-do list non persistés côté API).
- Toujours UTC vers l'API, conversion Luxon à l'affichage (`followup_date`, `exam_date`,
  `due_date` inclus).
- Après changement du schéma backend (`StudentProfile`, `Task`, `Formation`), mettre à jour
  `src/api/openapi.json` puis `npm run sync:api`, puis ajouter les alias dans `models.ts`.

## 9. Phasage

| Phase | Contenu |
|---|---|
| P3 | Types `models.ts`, `studentStatus.ts`, onglet suivi pédagogique sur `ClientDetailPage` |
| P3 | `TasksPage`, `useTasks`, route `/tasks` |
| P4 | Filtre « RDV du jour apprenant » sur `CalendarView` existant |

## 10. Point ouvert

Dépend de la décision backend : si `StudentProfile` est une table séparée (recommandé), les
appels `GET /students/{id}` renverront `ClientRead & { profile: StudentProfile | null }` — à
confirmer côté schéma OpenAPI avant de générer les types.
