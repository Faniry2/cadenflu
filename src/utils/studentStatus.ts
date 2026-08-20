import type { LearnerStatus, ProgressStatus, PaymentStatus, StudentCategory } from '../api/models'

// risk_color est renvoyé par le backend en texte libre (calculé côté serveur, jamais recalculé ici).
// On ne type donc pas de valeur "inconnue" comme une erreur : le badge retombe sur un style neutre.
export const RISK_COLOR_BADGE_STYLES: Record<string, string> = {
  vert: 'bg-green-100 text-green-700',
  jaune: 'bg-amber-100 text-amber-700',
  rouge: 'bg-red-100 text-red-700',
}
export const RISK_COLOR_FALLBACK_STYLE = 'bg-gray-100 text-gray-400'

export const LEARNER_STATUS_LABELS: Record<LearnerStatus, string> = {
  nouveau: 'Nouveau',
  actif: 'Actif',
  a_risque: 'À risque',
  examen_prevu: 'Examen prévu',
  diplome: 'Diplômé',
  suspendu: 'Suspendu',
  cloture: 'Clôturé',
}

export const PROGRESS_STATUS_LABELS: Record<ProgressStatus, string> = {
  bon_rythme: 'Bon rythme',
  a_surveiller: 'À surveiller',
  distrait: 'Distrait',
  bloque: 'Bloqué',
  suspendu: 'Suspendu',
  diplome: 'Diplômé',
  cloture: 'Clôturé',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  solde: 'Soldé',
  mensualise: 'Mensualisé',
  organisme: 'Pris en charge (organisme)',
  impaye: 'Impayé',
}

export const STUDENT_CATEGORY_LABELS: Record<StudentCategory, string> = {
  compta: 'Comptabilité',
  rh: 'RH',
  bf: 'BF',
  formation_courte: 'Formation courte',
}

export const LEARNER_STATUS_OPTIONS = Object.entries(LEARNER_STATUS_LABELS).map(
  ([value, label]) => ({ value: value as LearnerStatus, label })
)
export const PROGRESS_STATUS_OPTIONS = Object.entries(PROGRESS_STATUS_LABELS).map(
  ([value, label]) => ({ value: value as ProgressStatus, label })
)
export const PAYMENT_STATUS_OPTIONS = Object.entries(PAYMENT_STATUS_LABELS).map(
  ([value, label]) => ({ value: value as PaymentStatus, label })
)
export const STUDENT_CATEGORY_OPTIONS = Object.entries(STUDENT_CATEGORY_LABELS).map(
  ([value, label]) => ({ value: value as StudentCategory, label })
)
