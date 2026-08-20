# Backend — Population de la table `formations`

Source de vérité reçue : `betterstudy_formations_csm_modules_examens.xlsm`, onglet
« Toutes formations » (13 formations), avec en complément les onglets « Synthèse
catégories », « Sources » et « Notes CSM ».

Extraction déjà faite → `formations_extracted.json` (13 entrées, normalisées). **À valider
avant migration/seed**, voir section 3.

## 1. Écart avec le modèle `Formation` initialement proposé

Le modèle défini dans `fusion_csm_backend.md` était trop simple :

```
id, code, name, category, access_duration_months, exam_type, exam_provider,
has_exam_blank, has_final_exam
```

Le fichier source contient des infos plus riches et surtout **beaucoup de champs texte libre
non structurés** (période d'examen très variable d'une formation à l'autre, prix en fourchette,
détail des modules). Forcer ça dans des enums/booléens (`exam_type`, `has_exam_blank`,
`has_final_exam`) perdrait de l'information utile à la CSM et serait peu fiable (ex. seul le
DAC mentionne explicitement "examen blanc" dans le texte — pas les autres formations, alors
qu'on ne sait pas si c'est une vraie absence ou juste un oubli de rédaction).

**Modèle `Formation` révisé, à valider :**

| Champ | Type | Source (colonne xlsm) |
|---|---|---|
| id | PK | — |
| code | string, unique | absent du fichier → généré (section 2) |
| name | string | `Formation` |
| category | enum: compta, rh, bf | `cRAN`, normalisé |
| secondary_category | enum, nullable | seulement pour les formations mixtes (`COMPTA / RH`) |
| training_duration_text | string | `Durée de formation` |
| study_hours_text | string | `Temps d'étude` (garder en texte : valeurs "À confirmer") |
| access_duration_text | string | `Durée d'accès plateforme` (texte brut, conservé) |
| access_duration_months | int, nullable | parsé depuis la colonne ci-dessus quand c'est un nombre de mois |
| price_text | string | `Prix annoncé` (fourchettes/mentions "Dès", pas un decimal fiable) |
| certification_name | string | `Diplôme / certificat reçu` |
| exam_info_text | text | `Date / période d'examen` (texte libre, très variable) |
| module_count_text | string | `Nombre de modules` |
| modules_detail | text | `Détail modules / programme` |
| csm_note | text | `À noter pour CSM` — **affiché en priorité dans l'UI**, guide direct pour la CSM |
| source_url | string | `Source officielle` |

Champs abandonnés du modèle initial : `exam_type`, `exam_provider`, `has_exam_blank`,
`has_final_exam` — remplacés par `exam_info_text` (texte libre) et `certification_name`, plus
fidèles à la donnée réelle. Si un filtrage structuré est vraiment nécessaire plus tard
(ex. filtrer les formations avec examen fédéral), on pourra dériver `is_federal_exam: bool`
depuis `category == 'bf'` sans nouveau champ.

## 2. Décisions à valider avant migration

1. **Génération des `code`** — absents du fichier source. Codes proposés (dérivés des sigles
   dans les noms) :

   | code | name |
   |---|---|
   | DAC | Diplôme d'Aide-comptable |
   | DC | Diplôme de Comptable |
   | DSC | Diplôme de Spécialiste en comptabilité |
   | BF_FINANCE_COMPTA | Brevet fédéral de Spécialiste en finance et comptabilité |
   | TVA | Certificat de Spécialiste TVA |
   | SAL_ASS_SOC | Gestion des Salaires et Assurances sociales |
   | FISC_DIRECTE | Fiscalité directe avec Certificat |
   | COMPTA_ANALYTIQUE | Comptabilité analytique d'exploitation |
   | RH_HRSE | Certificat de Gestionnaire RH HRSE |
   | PAYROLL_HRSE | Certificat de Spécialiste Payroll HRSE |
   | RH_PAYROLL_HRSE | Gestionnaire RH avec spécialisation Payroll HRSE |
   | COMPTA_RH_HRSE | Gestionnaire comptable et RH HRSE (mixte) |
   | BF_RH | Brevet fédéral de Spécialiste RH |

   → À confirmer ou remplacer par une convention de codes officielle si BetterStudy en a une.

2. **Formation mixte `COMPTA_RH_HRSE`** — catégorie source `COMPTA / RH`. Proposition :
   `category = compta` (primaire) + `secondary_category = rh`. Impact : elle doit apparaître
   dans les deux filtres (compta et RH) côté frontend/reporting, pas seulement compta.

3. **`access_duration_months` non numérique** — 2 cas où le texte source n'est pas un nombre
   de mois exploitable :
   - `PAYROLL_HRSE` → "À confirmer"
   - `BF_RH` → "Aussi longtemps que nécessaire selon page"

   Proposition : `access_duration_months = NULL`, `access_duration_text` garde la valeur brute
   affichable. Pas de valeur par défaut inventée.

4. **Champs "À confirmer" dans le fichier source** (ex. `study_hours_text` de
   `COMPTA_ANALYTIQUE`, `access_duration_text`/`study_hours_text` de `PAYROLL_HRSE`) — importés
   tels quels en texte ("À confirmer"), pas de valeur inventée. Pourra être corrigé plus tard
   en réimportant une version à jour du fichier source (upsert par `code`).

## 3. Fichier d'extraction préparé

`formations_extracted.json` (13 entrées) a déjà été généré à partir du fichier source, avec le
mapping ci-dessus appliqué. Format d'une entrée :

```json
{
  "code": "DAC",
  "name": "Diplôme d'Aide-comptable -DAC",
  "category": "compta",
  "secondary_category": null,
  "training_duration_text": "5 à 12 mois",
  "study_hours_text": "250 heures",
  "access_duration_text": "18 mois",
  "access_duration_months": 18,
  "price_text": "Dès CHF 4'497.-",
  "certification_name": "Diplôme d'Aide-comptable",
  "exam_info_text": "Quand l'apprenant est prêt, sur rendez-vous; Genève ou à distance; ...",
  "module_count_text": "5 modules + examen final",
  "modules_detail": "Modules A à E : concepts fondamentaux; ...",
  "csm_note": "Formation d'entrée en comptabilité. Très adaptée aux débutants/reconversion.",
  "source_url": "https://betterstudy.ch/formation-comptabilite/diplome-aide-comptable/"
}
```

**À relire avant seed** : les 13 codes/catégories proposés (section 2, point 1-2), en
particulier `COMPTA_RH_HRSE` (mixte) et les 2 cas `access_duration_months = null`.

## 4. Étapes une fois le mapping validé

1. Migration Alembic : créer/ajuster `formations` avec les champs de la section 1
   (`alembic revision --autogenerate -m "extend formations table"`).
2. Script de seed idempotent `app/scripts/seed_formations.py` :
   - lit `formations_extracted.json` (ou directement le xlsm si on préfère réimporter sans
     étape JSON intermédiaire — à trancher selon si le fichier source sera fourni à nouveau
     pour des mises à jour) ;
   - **upsert par `code`** (clé métier unique), pas d'insert brut, pour pouvoir relancer le
     script si le fichier source évolue ;
   - log des lignes ignorées/en erreur (code dupliqué, catégorie invalide) sans faire échouer
     tout le script ;
   - commande d'exécution : `python -m app.scripts.seed_formations formations_extracted.json`.
3. Mettre à jour `src/api/openapi.json` (cf. règle de synchro backend/frontend déjà en place)
   si le schéma `FormationRead` change côté API.

## 5. Onglets non exploités du fichier source

- **Synthèse catégories** — recoupe les comptes par catégorie (8 compta, 4 RH, 2 BF), cohérent
  avec l'extraction. Sert de vérification, pas de données supplémentaires à importer.
- **Sources** — liste des URLs déjà reprises dans `source_url`.
- **Notes CSM** — 4 notes générales (proactivité CSM, infos à confirmer, précaution brevet
  fédéral, formations mixtes). Pas des données `Formation` — plutôt à intégrer comme contenu
  d'aide/documentation dans l'interface CSM (ex. tooltip ou page d'aide), pas dans la table.
