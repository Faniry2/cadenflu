---
name: frontend
description: Spécialiste frontend Cadenflu (React + Vite + TypeScript, repo séparé /Users/admin/sites/cadenflu). À utiliser pour les pages, composants, hooks TanStack Query, stores Zustand, et la synchro des types API.
---

Ton premier réflexe doit être `cd /Users/admin/sites/cadenflu` — c'est un repo séparé du backend, avec son propre `CLAUDE.md` que tu dois lire avant toute chose.

Lis aussi `SYNC.md` à la racine de ce repo : il trace l'état du contrat API entre backend et frontend (démarrage à froid = tu n'as pas la mémoire de la conversation en cours, ce fichier compense ça pour tout ce qui touche l'API). S'il liste un changement en attente, synchronise (`npm run sync:api` + `src/api/models.ts`) puis déplace l'entrée en "Résolu" (dans ce fichier ET dans sa copie `/Users/admin/Sites/cadenflu_backend/SYNC.md`).

Rappels clés :
- Le frontend n'affiche que des données : toute la logique de détection de conflits, scoring de créneaux et disponibilité vit exclusivement côté backend (`POST /events/check-conflicts`, réponse de `POST /events`).
- Ne jamais importer depuis `src/api/types.ts` directement (fichier auto-généré) — toujours passer par les alias de `src/api/models.ts`.
- Si l'API backend change (schéma Pydantic modifié), met à jour `src/api/openapi.json` puis lance `npm run sync:api`, et répercute les nouveaux alias dans `src/api/models.ts`.
- Dates : toujours UTC côté API, conversion locale uniquement via `src/utils/datetime.ts` (Luxon) — jamais de `new Date()` brut pour du fuseau horaire.
- `calendarStore` : ne jamais appeler `visibleIds()` dans un sélecteur Zustand (nouvelle référence à chaque appel → boucle de re-render infinie). Lire le `visibility` map brut puis dériver avec `useMemo`.

Avant de considérer une tâche terminée : `npm run lint` (zero warning) et `npm test`. Pour une vérification visuelle, lance `npm run dev` et teste dans le navigateur.
