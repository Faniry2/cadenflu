# Contexte Frontend — Cadenflu

> **Cadenflu** — système intelligent de gestion multi-agendas. Le nom marie *cadence* (le rythme maîtrisé d'un emploi du temps) et *flux/confluence* (la fusion de plusieurs agendas en une vue unifiée).

## 1. Vision du produit

Interface de **Cadenflu**, application **multi-agendas / multi-utilisateurs**. L'utilisateur visualise plusieurs agendas connectés dans une vue unifiée, crée des événements, reçoit en temps réel les alertes de conflit, consulte un tableau de bord centralisé et accepte des suggestions de créneaux.

Principe clé : le frontend **n'implémente aucune logique métier de conflit**. Il appelle le backend (source de vérité) et affiche les résultats. Aucun calcul de chevauchement ou de marge côté client.

## 2. Périmètre v1

- Authentification (login, refresh token transparent).
- Vue calendrier multi-agendas : jour / semaine / mois.
- Sélecteur d'agendas avec code couleur (afficher/masquer).
- Création & édition d'événements avec retour de conflits en direct.
- Affichage des alertes par sévérité (bloquant / avertissement / info).
- Affichage et acceptation des suggestions de créneaux.
- Tableau de bord centralisé.
- Partage d'agenda et gestion des rôles (owner / editor / viewer).
- Affichage en **heure locale** de l'utilisateur (données reçues en UTC).

## 3. Stack technique

| Composant | Choix recommandé |
|-----------|------------------|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Routing | React Router |
| État serveur | TanStack Query (cache, refetch, mutations) |
| État UI local | Zustand ou Context léger |
| Dates / fuseaux | Luxon (gestion robuste TZ/DST) |
| Composants calendrier | base custom ou FullCalendar / react-big-calendar |
| Styles | Tailwind CSS |
| Formulaires | React Hook Form + Zod (validation) |
| Client API | Types/clients générés depuis `openapi.json` via `openapi-typescript` |
| Tests | Vitest + Testing Library |

> Voir le skill `frontend-design` avant de styliser : éviter le rendu « template par défaut », soigner typographie et hiérarchie visuelle.

## 4. Architecture des écrans

```
/login                  → Authentification
/                       → Tableau de bord (par défaut)
/calendar               → Vue calendrier (jour/semaine/mois)
/calendar/:date         → Vue à une date donnée
/events/new             → Création d'événement (modal ou page)
/events/:id             → Détail / édition
/calendars              → Gestion des agendas
/calendars/:id/share    → Partage & permissions
/settings               → Préférences (fuseau, marge par défaut, heures ouvrables)
```

## 5. Composants principaux

### CalendarView
- Affiche les events agrégés de tous les agendas **visibles**.
- Code couleur par agenda.
- Bascule jour / semaine / mois.
- Les events récurrents arrivent déjà « déroulés » du backend sur la fenêtre demandée — le front ne calcule pas les occurrences.

### CalendarSelector
- Liste des agendas avec case afficher/masquer et pastille couleur.
- État de visibilité stocké côté UI ; influence le paramètre `calendar_ids` des requêtes.

### EventForm
- Champs : titre, agenda cible, début, fin, all-day, lieu, priorité, récurrence (RRULE simplifiée via UI : « tous les jours / semaines / mois »), participants, ressources.
- À la saisie : appel **`POST /events/check-conflicts`** (sans persistance, débauncé) pour afficher les conflits en direct.
- À la soumission : `POST /events` → affiche conflits + suggestions retournés.

### ConflictBanner
| Sévérité | Couleur | Comportement |
|----------|---------|--------------|
| `blocking` (overlap, resource_clash) | rouge | bloque ou demande confirmation forcée |
| `warning` (insufficient_buffer) | orange | autorise mais alerte |
| `info` (tight) | jaune | information non bloquante |

Affiche l'écart constaté (`observed_gap_min`) et l'événement en cause.

### SuggestionList
- Affiche les 2–3 créneaux alternatifs renvoyés par le backend.
- Un clic pré-remplit l'EventForm avec le créneau choisi.

## 6. Tableau de bord (Dashboard)

Données issues d'un appel unique `GET /dashboard?range=week`. Sections :

1. **Rendez-vous à venir** — liste chronologique multi-agendas, pastille couleur par agenda.
2. **Conflits détectés** — regroupés par sévérité, lien vers l'event concerné, bouton « voir suggestions ».
3. **Plages disponibles** — créneaux libres respectant la marge, sur la fenêtre courante.
4. **Statistiques** — taux d'occupation, nombre de conflits, durée moyenne entre RDV, agenda le plus chargé, **score de qualité de planification (0–100)** par jour.

Privilégier des visuels clairs : barres d'occupation, jauge de score, badges de conflit.

## 7. Gestion des fuseaux horaires (critique)

- **Toutes les dates reçues du backend sont en UTC.**
- Conversion en heure locale de l'utilisateur (`user.timezone`) **uniquement à l'affichage**, via Luxon.
- Tout envoi au backend se fait **en UTC**.
- Un event « toute la journée » (`all_day`) s'affiche sur la journée entière sans heure et ne déclenche pas d'alerte de marge.
- Attention au changement d'heure (DST) dans l'affichage des récurrences.

## 8. Flux de données & état

- **TanStack Query** pour tout l'état serveur : `useQuery` (events, dashboard, availability) et `useMutation` (create/update/delete) avec invalidation du cache calendrier après mutation.
- `check-conflicts` appelé en **debounce** (~400 ms) pendant la saisie pour ne pas saturer l'API.
- Refresh token géré par un intercepteur HTTP transparent ; rejouer la requête après renouvellement.
- Optimistic UI possible sur le déplacement d'event (drag & drop), avec rollback si le backend renvoie un `blocking`.

## 9. Permissions côté UI

- Masquer/désactiver les actions d'édition selon le rôle (`viewer` = lecture seule).
- Ne jamais se fier au front pour la sécurité : le backend revalide chaque action. Le masquage UI est du confort, pas une garantie.

## 10. Accessibilité & UX

- Contraste suffisant sur les codes couleur d'agenda (ne pas coder l'info uniquement par la couleur : ajouter libellé/icône pour les daltoniens).
- Navigation clavier dans le calendrier et les formulaires.
- États de chargement et messages d'erreur explicites sur chaque appel réseau.
- Feedback immédiat lors de la détection d'un conflit (le retour temps réel est le cœur de la valeur perçue).

## 11. Contrat API — source de vérité : `openapi.json`

**Le contrat API n'est jamais décrit ni recopié à la main.** La source de vérité unique est la spec **OpenAPI générée automatiquement par le backend FastAPI**, dérivée du vrai code (routes + schémas Pydantic). Tout document rédigé manuellement se périmerait au premier changement de route ; on s'appuie donc exclusivement sur la spec générée.

### Récupérer la spec

- Backend lancé : disponible sur `http://localhost:8000/openapi.json` (et UI interactive sur `/docs`).
- Sans lancer le serveur : export via le script backend `scripts/export_openapi.py` (`app.openapi()`), qui écrit `openapi.json`.

Le fichier `openapi.json` est **commité dans le repo front** (ex. `src/api/openapi.json`) et mis à jour à chaque évolution du backend.

### Générer le client TypeScript typé

À partir de la spec, on génère des types qui correspondent **exactement** au backend, sans recopie :

```bash
npx openapi-typescript src/api/openapi.json -o src/api/types.ts
```

Ces types alimentent les appels TanStack Query : payloads d'entrée et schémas de réponse sont typés à la compilation, donc toute divergence avec le backend est détectée par TypeScript avant l'exécution.

### Workflow de synchronisation

1. Le backend ajoute/modifie une route → la spec OpenAPI change automatiquement.
2. Mettre à jour `openapi.json` dans le repo front (copie depuis `/openapi.json` ou export).
3. Regénérer `types.ts` avec `openapi-typescript`.
4. Le compilateur TypeScript signale les appels devenus incompatibles → corriger.

> Cette étape est idéalement automatisée (script npm, ex. `npm run sync:api`) ou intégrée à la CI pour empêcher toute dérive entre front et backend.

### Endpoints principaux (rappel indicatif — la spec fait foi)

```
POST /events/check-conflicts   → { conflicts: [...] }            (sans persistance)
POST /events                   → { event, conflicts, suggestions }
GET  /events?from=&to=&calendar_ids=
GET  /availability?from=&to=&duration=&calendar_ids=
GET  /suggestions?event_id=
GET  /dashboard?range=week
```

Cette liste n'est qu'un repère : en cas de doute, c'est toujours `openapi.json` / `/docs` qui prime.

Le front affiche, le backend décide. Toute règle de marge, de chevauchement ou de score provient du serveur.
