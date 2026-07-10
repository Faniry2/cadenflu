# Addendum Frontend — Recadrage Cadenflu (freelances multi-clients full remote)

> Ce document **complète** `CONTEXT_FRONTEND.md`. En cas de divergence, cet addendum fait foi pour tout ce qui touche la cible, la notion de Client et le dashboard. Le reste du contexte frontend (stack, OpenAPI source de vérité, fuseaux, TanStack Query) reste valable tel quel.

## 1. Recadrage de la cible

Cadenflu cible les **freelances multi-clients en full remote** (cas type : assistante virtuelle).

Conséquences sur l'UI :
- **Pas de notion de trajet/lieu physique** mis en avant : on ne montre pas de carte ni de temps de déplacement.
- **Le client est une dimension visuelle de premier plan**, à côté de l'agenda.
- **Le suivi du temps et des forfaits par client** devient un écran/section aussi important que le calendrier.
- **Multi-fuseaux assumé** : l'affichage doit gérer plusieurs fuseaux simultanément (freelance + clients).
- L'utilisatrice type est **solo** : pas de mise en avant du partage/collaboration en v1.

## 2. Le client comme objet de premier plan

Nouvelle entité `Client` à refléter dans l'UI (récupérée via `/clients`, types issus de `openapi.json`).

- Chaque client a une **couleur** et un **fuseau horaire** propres.
- Lors de la création d'un événement (`EventForm`), ajouter :
  - un **sélecteur de client** (en plus de l'agenda cible),
  - un toggle **facturable** (`billable`).
- Les events sont colorés/étiquetés par client dans le calendrier, pas seulement par agenda.

## 3. Nouveaux écrans / sections

```
/clients                 → Liste des clients (couleur, fuseau, forfait, statut)
/clients/:id             → Détail client : heures du mois, consommation forfait, montant estimé
/reports                 → Récap temps par client (vue mensuelle)
```

### ClientCard / liste clients
- Affiche nom, pastille couleur, fuseau, et **consommation du forfait** (ex. barre « 12h / 20h »).
- Badge d'alerte si le forfait est proche du quota ou dépassé.

### EventForm (ajouts)
- Sélecteur de client (couleur reprise du client).
- Toggle « facturable ».
- Affichage de l'heure de l'événement **dans le fuseau du client** en complément du fuseau local (voir section 5).

## 4. Dashboard — réorientation

Le dashboard met en avant la dimension client, en plus des sections existantes :

1. **Heures par client** ce mois-ci, avec barre de consommation vs forfait.
2. **Montant estimé** par client (si taux renseigné).
3. **Alertes de forfait** (proche du quota / dépassé).
4. Sections conservées : rendez-vous à venir, conflits détectés, plages disponibles, score de planification.

Privilégier des visuels parlants : barres de consommation de forfait, totaux d'heures, badges d'alerte par client.

## 5. Multi-fuseaux — au cœur de l'expérience

C'est un argument différenciant pour du full remote multi-pays.

- Afficher chaque rendez-vous avec **double heure** quand le client est dans un autre fuseau : « 15:00 (vous) · 09:00 (client NY) ».
- Le fuseau de la freelance et celui de chaque client viennent du backend (`user.timezone`, `client.timezone`).
- Toute la conversion d'affichage se fait avec **Luxon** ; les données restent en UTC (rappel : voir contexte principal).
- Éviter toute ambiguïté : ne jamais afficher une heure sans indiquer implicitement ou explicitement le fuseau de référence.

## 6. Marge de sécurité — message UI révisé

- Les alertes de marge ne parlent plus de « trajet » mais de **temps de respiration entre deux clients** (changement de contexte).
- Possibilité d'afficher une alerte plus marquée quand deux rendez-vous **clients différents** s'enchaînent sans marge, vs deux tâches d'un même client.

## 7. Priorités v1 révisées (front)

1. Auth + structure de navigation.
2. Vue calendrier multi-agendas (events colorés par **client**).
3. Gestion des **clients** (liste + détail).
4. EventForm avec client + facturable + double fuseau.
5. **Dashboard orienté client** (heures, forfaits, alertes).
6. Conflits / suggestions / disponibilités.

Le partage d'agenda et les rôles multi-utilisateurs passent en post-v1.

> Rappel transverse : le contrat API reste piloté par `openapi.json`. Les nouvelles entités (Client, time-summary, reports) doivent être régénérées dans `types.ts` dès que le backend les expose.
