# SYNC.md — Synchro Backend ↔ Frontend

Ce fichier existe pour pallier le fait qu'un subagent (ou une nouvelle session) démarre à froid : il ne contient QUE l'état du contrat API entre les deux repos et les tâches inter-repo en cours — pas un résumé de conversation.

Repos : `/Users/admin/Sites/cadenflu_backend` (ce repo) et `/Users/admin/sites/cadenflu` (frontend, copie identique de ce fichier).

**Règle** : dès qu'un changement de schéma Pydantic exposé (champ ajouté/renommé/supprimé, type changé, nouvel endpoint) est fait côté backend, ajouter une entrée dans "Contrat API en cours" ici (et dans la copie frontend). Une fois le frontend synchronisé (`npm run sync:api` + `src/api/models.ts` à jour), déplacer l'entrée en "Résolu" ou la supprimer.

## Contrat API en cours

_Aucun contrat en cours pour le moment._

## Tâches inter-repo en cours

_Aucune tâche croisée en cours pour le moment._

## Historique récent (résolu)

### Déploiement Docker + Traefik (VPS Ubuntu)

Pas de changement de contrat API. Fichiers de déploiement ajoutés dans les deux repos.

Backend (`cadenflu_backend`) : `Dockerfile` (multi-stage python:3.12-slim, non-root, HEALTHCHECK sur `/health`), `docker-entrypoint.sh` (`alembic upgrade head` puis `exec uvicorn`), `.dockerignore`, `.env.example` mis à jour. `app/config.py` : `redis_url` supprimé (inutilisé), ajout `cors_origins` (CSV) + property `cors_origins_list`. `app/main.py` : CORS = `settings.cors_origins_list` ; `/health` fait un `SELECT 1` et renvoie 503 si DB injoignable. Orchestration dans `deploy/` (`compose.yml`, `Makefile`, `.env.example`, `README.md`) → à copier dans `/opt/cadenflu/` sur le VPS.

Frontend (`cadenflu`) : `Dockerfile` (multi-stage node:22-alpine → nginx:alpine, `VITE_API_URL` en `ARG` de build = `https://api.sopape.com`), `nginx.conf` (fallback SPA, gzip, cache long sur `/assets/`, `no-cache` sur `index.html`), `.dockerignore`. Fix TS pré-existant qui cassait `npm run build` : `renotify` retiré de `sendNotification()` dans `src/hooks/useEventReminders.ts` (propriété absente de `NotificationOptions`, valeur `false` = défaut, no-op).

Domaines : `api.sopape.com` (backend), `cadenflu.sopape.com` (frontend). Postgres natif hôte via `host.docker.internal`. Scheduler CSM in-process → `UVICORN_WORKERS=1`. Détails et choix : `deploy/README.md`.

### Réglages de rappel de suivi par statut de progression (CSM)

`GET`/`PUT /students/reminder-settings` — seuil de l'alerte `stale_followup`, configurable par `progress_status`, scope par owner. Contrat conforme à ce qui a été esquissé (voir schémas `ReminderSettingItem` / `ReminderSettingsRead` / `ReminderSettingWrite` / `ReminderSettingsUpdate` côté backend, aucune déviation de nommage).

Backend : endpoints `GET`/`PUT /students/reminder-settings` (auth `get_current_user`, scope `owner_id = current_user.id`) dans `app/routers/students.py`. Migration `alembic/versions/0011_progress_reminder_settings.py` (revise `0010_alerts_task_link`), modèle `app.models.progress_reminder_setting.ProgressReminderSetting`. Défauts + logique de fusion (pure, testable) dans `app.services.student_progress` (`DEFAULT_FOLLOWUP_REMINDER_DAYS`, `resolve_followup_reminder_days`, `resolve_followup_reminder_settings`). `generate_followup_alerts` (app/services/alerts.py) résout le seuil par profil ; la constante globale `STALE_FOLLOWUP_THRESHOLD_DAYS` a été supprimée.

Frontend : `src/api/openapi.json` re-synchronisé (`npm run sync:api`) ; `src/api/models.ts` expose `ReminderSettingItem`, `ReminderSettingsResponse`, `ReminderSettingUpdate`, `ReminderSettingsUpdateRequest`. `students.getReminderSettings()` / `updateReminderSettings()` dans `src/api/endpoints.ts`. Hooks `useReminderSettings()` / `useUpdateReminderSettings()` dans `src/hooks/useReminderSettings.ts`. UI `src/components/ReminderSettingsSection.tsx`, montée dans `SettingsPage.tsx`. Vérifié en direct contre le backend réel (curl) et à l'écran (`/settings`).
