/**
 * Plans and feature flags shared by client and server.
 *
 * Safety tools are never behind a paywall: the pause, crisis resources,
 * "Hoy fue difícil", limits, trusted contacts and the guided assistant are
 * free for everyone, with or without an account.
 */
export type PlanId = 'free' | 'premium';

export const ALWAYS_FREE = [
  'Necesito una pausa y todas sus herramientas',
  'Recursos de seguridad y números de emergencia',
  'Hoy fue difícil',
  'Contacto cero y límites',
  'Contactos de confianza',
  'Asistente guiado sin conexión',
] as const;

export interface Entitlements {
  /** Conversations per day with the AI model (the guided assistant is unlimited). */
  assistantDailyMessages: number;
  /** Days of history shown in the progress charts. */
  insightsHistoryDays: number;
  weeklyReflectionHistory: boolean;
  authorMedia: boolean;
  encryptedBackup: boolean;
  community: boolean;
}

export const ENTITLEMENTS: Record<PlanId, Entitlements> = {
  free: {
    assistantDailyMessages: 15,
    insightsHistoryDays: 30,
    weeklyReflectionHistory: true,
    authorMedia: false,
    encryptedBackup: true,
    community: true,
  },
  premium: {
    assistantDailyMessages: 150,
    insightsHistoryDays: 3650,
    weeklyReflectionHistory: true,
    authorMedia: true,
    encryptedBackup: true,
    community: true,
  },
};

export interface PlanConfig {
  id: PlanId;
  name: string;
  tagline: string;
  /** Display price, e.g. "USD 6,99 / mes". Empty for free. */
  priceLabel: string;
  /** Stripe price keys this plan can be bought with (resolved to price ids on the server). */
  priceKeys: ('monthly' | 'yearly')[];
  features: string[];
  highlighted?: boolean;
}

export const DEFAULT_PLANS: PlanConfig[] = [
  {
    id: 'free',
    name: 'Gratis',
    tagline: 'Todo lo esencial para acompañarte, siempre.',
    priceLabel: 'Gratis',
    priceKeys: [],
    features: [
      ...ALWAYS_FREE,
      'Mi Camino y Tu cerebro después de una ruptura',
      'Mi Espacio cifrado en tu dispositivo',
      'Comunidad moderada',
      `Hasta ${ENTITLEMENTS.free.assistantDailyMessages} mensajes al día con la IA`,
    ],
  },
  {
    id: 'premium',
    name: 'Acompañamiento completo',
    tagline: 'Más tiempo con la IA y todo el material de la autora cuando esté disponible.',
    priceLabel: 'Precio por definir',
    priceKeys: ['monthly', 'yearly'],
    features: [
      'Todo lo del plan gratuito',
      `Hasta ${ENTITLEMENTS.premium.assistantDailyMessages} mensajes al día con la IA`,
      'Historial completo de tus avances',
      'Audios, videos y ejercicios autorizados de la autora (cuando se publiquen)',
    ],
    highlighted: true,
  },
];

export function entitlementsFor(plan: string | null | undefined): Entitlements {
  return plan === 'premium' ? ENTITLEMENTS.premium : ENTITLEMENTS.free;
}

/** Subscription states that grant premium. */
export function isPremiumStatus(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing' || status === 'past_due';
}
