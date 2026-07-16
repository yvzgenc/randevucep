// ─── Business type definitions ────────────────────────────────────────────────
// Single source of truth. Add new types here — the rest of the app adapts.

import {
  Scissors,
  Sparkles,
  Stethoscope,
  Brain,
  BookOpen,
  PawPrint,
  Briefcase,
  type LucideIcon,
} from 'lucide-react'

export const BUSINESS_TYPES = [
  'barber',
  'beauty_salon',
  'dental_clinic',
  'psychology',
  'education',
  'veterinary',
  'consulting',
] as const

export type BusinessType = (typeof BUSINESS_TYPES)[number]

// ─── Per-type labels ──────────────────────────────────────────────────────────

interface BusinessTypeConfig {
  /** Display name shown in onboarding / settings */
  label: string
  /** Icon used as a visual indicator — render via <Icon icon={cfg.icon} /> */
  icon: LucideIcon
  /** What "services" are called for this business type */
  servicesLabel: string
  /** Singular form of a single service */
  serviceLabel: string
  /** What "staff" are called */
  staffLabel: string
  /** Singular staff member */
  staffMemberLabel: string
  /** What "appointments" are called */
  appointmentsLabel: string
  /** Placeholder for service name input */
  serviceNamePlaceholder: string
  /** Placeholder for staff name input */
  staffNamePlaceholder: string
  /** Placeholder for staff title input */
  staffTitlePlaceholder: string
}

const CONFIG: Record<BusinessType, BusinessTypeConfig> = {
  barber: {
    label:                  'Berber',
    icon:                   Scissors,
    servicesLabel:          'Hizmetler',
    serviceLabel:           'Hizmet',
    staffLabel:             'Berberler',
    staffMemberLabel:       'Berber',
    appointmentsLabel:      'Randevular',
    serviceNamePlaceholder: 'Saç Kesimi',
    staffNamePlaceholder:   'Ahmet Usta',
    staffTitlePlaceholder:  'Berber',
  },
  beauty_salon: {
    label:                  'Güzellik Salonu',
    icon:                   Sparkles,
    servicesLabel:          'Hizmetler',
    serviceLabel:           'Hizmet',
    staffLabel:             'Personel',
    staffMemberLabel:       'Uzman',
    appointmentsLabel:      'Randevular',
    serviceNamePlaceholder: 'Saç Boyama',
    staffNamePlaceholder:   'Ayşe Hanım',
    staffTitlePlaceholder:  'Kuaför',
  },
  dental_clinic: {
    label:                  'Diş Kliniği',
    icon:                   Stethoscope,
    servicesLabel:          'Tedaviler',
    serviceLabel:           'Tedavi',
    staffLabel:             'Doktorlar',
    staffMemberLabel:       'Doktor',
    appointmentsLabel:      'Randevular',
    serviceNamePlaceholder: 'Diş Kontrolü',
    staffNamePlaceholder:   'Dr. Mehmet Yılmaz',
    staffTitlePlaceholder:  'Diş Hekimi',
  },
  psychology: {
    label:                  'Psikoloji / Terapi',
    icon:                   Brain,
    servicesLabel:          'Seans Türleri',
    serviceLabel:           'Seans',
    staffLabel:             'Terapistler',
    staffMemberLabel:       'Terapist',
    appointmentsLabel:      'Seanslar',
    serviceNamePlaceholder: 'Bireysel Terapi',
    staffNamePlaceholder:   'Uzm. Psk. Fatma Kaya',
    staffTitlePlaceholder:  'Psikolog',
  },
  education: {
    label:                  'Eğitim / Kurs',
    icon:                   BookOpen,
    servicesLabel:          'Kurslar',
    serviceLabel:           'Kurs',
    staffLabel:             'Eğitmenler',
    staffMemberLabel:       'Eğitmen',
    appointmentsLabel:      'Dersler',
    serviceNamePlaceholder: 'İngilizce Dersi',
    staffNamePlaceholder:   'Hasan Hoca',
    staffTitlePlaceholder:  'Öğretmen',
  },
  veterinary: {
    label:                  'Veteriner',
    icon:                   PawPrint,
    servicesLabel:          'Hizmetler',
    serviceLabel:           'Hizmet',
    staffLabel:             'Veterinerler',
    staffMemberLabel:       'Veteriner',
    appointmentsLabel:      'Muayeneler',
    serviceNamePlaceholder: 'Genel Muayene',
    staffNamePlaceholder:   'Dr. Zeynep Aydın',
    staffTitlePlaceholder:  'Veteriner Hekim',
  },
  consulting: {
    label:                  'Danışmanlık',
    icon:                   Briefcase,
    servicesLabel:          'Hizmetler',
    serviceLabel:           'Hizmet',
    staffLabel:             'Danışmanlar',
    staffMemberLabel:       'Danışman',
    appointmentsLabel:      'Görüşmeler',
    serviceNamePlaceholder: 'Stratejik Danışmanlık',
    staffNamePlaceholder:   'Ali Bey',
    staffTitlePlaceholder:  'Kıdemli Danışman',
  },
}

// ─── Public helpers ───────────────────────────────────────────────────────────

/** Safely coerce a raw string to BusinessType, falling back to beauty_salon. */
export function toBusinessType(raw: string | null | undefined): BusinessType {
  if (raw && (BUSINESS_TYPES as readonly string[]).includes(raw)) {
    return raw as BusinessType
  }
  return 'beauty_salon'
}

/** Get full config for a given business type. */
export function getBusinessTypeConfig(
  type: string | null | undefined,
): BusinessTypeConfig {
  return CONFIG[toBusinessType(type)]
}
