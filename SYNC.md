# SYNC.md — Synchro Backend ↔ Frontend

Ce fichier existe pour pallier le fait qu'un subagent (ou une nouvelle session) démarre à froid : il ne contient QUE l'état du contrat API entre les deux repos et les tâches inter-repo en cours — pas un résumé de conversation.

Repos : `/Users/admin/Sites/cadenflu_backend` (ce repo) et `/Users/admin/sites/cadenflu` (frontend, copie identique de ce fichier).

**Règle** : dès qu'un changement de schéma Pydantic exposé (champ ajouté/renommé/supprimé, type changé, nouvel endpoint) est fait côté backend, ajouter une entrée dans "Contrat API en cours" ici (et dans la copie frontend). Une fois le frontend synchronisé (`npm run sync:api` + `src/api/models.ts` à jour), déplacer l'entrée en "Résolu" ou la supprimer.

## Contrat API en cours

_Aucun contrat en cours pour le moment._

## Tâches inter-repo en cours

_Aucune tâche croisée en cours pour le moment._

## Historique récent (résolu)

### Réglages de rappel de suivi par statut de progression (CSM)

`GET`/`PUT /students/reminder-settings` — seuil de l'alerte `stale_followup`, configurable par `progress_status`, scope par owner. Contrat conforme à ce qui a été esquissé (voir schémas `ReminderSettingItem` / `ReminderSettingsRead` / `ReminderSettingWrite` / `ReminderSettingsUpdate` côté backend, aucune déviation de nommage).

Frontend :
- `src/api/openapi.json` re-synchronisé depuis le backend (`npm run sync:api`) ; `src/api/models.ts` expose `ReminderSettingItem`, `ReminderSettingsResponse`, `ReminderSettingUpdate`, `ReminderSettingsUpdateRequest` en alias des schémas générés (plus de types saisis à la main).
- `students.getReminderSettings()` / `students.updateReminderSettings()` dans `src/api/endpoints.ts`.
- Hooks `useReminderSettings()` (query) / `useUpdateReminderSettings()` (mutation, invalide `['students', 'reminder-settings']`) dans `src/hooks/useReminderSettings.ts`.
- UI : `src/components/ReminderSettingsSection.tsx`, intégré dans `SettingsPage` (`src/pages/SettingsPage.tsx`) — un input par statut de progression (labels réutilisés depuis `PROGRESS_STATUS_OPTIONS` dans `src/utils/studentStatus.ts`), badge « Par défaut » / « Personnalisé », le PUT n'envoie que les entrées modifiées.
- Vérifié en direct contre le backend réel (`GET`/`PUT` testés via curl, réponse conforme octet pour octet au contrat) ainsi qu'à l'écran (page `/settings` sans erreur de rendu).
