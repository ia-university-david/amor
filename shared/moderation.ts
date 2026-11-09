import { detectCrisis, normalizeText, type CrisisResult } from './crisis';

/**
 * Automatic pre-moderation for the anonymous community. It never labels a
 * person (neither the author nor anyone they mention); it only decides whether
 * a message is published right away or held for a human moderator.
 */
export type ModerationFlag = 'crisis' | 'insulto' | 'odio' | 'datos-personales' | 'enlace' | 'acoso' | 'spam';

export interface ModerationResult {
  crisis: CrisisResult;
  flags: ModerationFlag[];
  action: 'publish' | 'hold';
}

const INSULTS = [
  /\b(idiota|imbecil|estupid[oa]|pendej[oa]|gilipollas|subnormal|retrasad[oa])s?\b/,
  /\b(puta|puto|perra|zorra|malparid[oa]|hijueputa|hijo de puta|hija de puta|cabron|cabrona)s?\b/,
  /\b(callate|largate|das asco|me das asco|eres una basura|eres basura)\b/,
];

const HATE = [/\b(maricon|sudaca|negrata|travelo)s?\b/];

const HARASSMENT = [
  /\b(te voy a (buscar|encontrar)|se donde vives|te estoy vigilando)\b/,
  /\b(deberias (morirte|matarte)|ojala te mueras|matate)\b/,
];

const SPAM = [/\b(gana dinero|criptomoneda|inversion garantizada|haz clic aqui|promocion exclusiva)\b/];

// Personal data is checked on the raw text: phone numbers, emails, handles.
const PHONE = /(?:\+?\d[\s.-]?){8,}/;
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]{2,}/;
const HANDLE = /(^|\s)@[a-z0-9_.]{3,}/i;
const URL_RE = /\b(https?:\/\/|www\.)\S+/i;

export function assessCommunityText(text: string): ModerationResult {
  const normalized = normalizeText(text);
  const crisis = detectCrisis(text);
  const flags: ModerationFlag[] = [];
  if (crisis.detected) flags.push('crisis');
  if (INSULTS.some((re) => re.test(normalized))) flags.push('insulto');
  if (HATE.some((re) => re.test(normalized))) flags.push('odio');
  if (HARASSMENT.some((re) => re.test(normalized))) flags.push('acoso');
  if (SPAM.some((re) => re.test(normalized))) flags.push('spam');
  if (PHONE.test(text) || EMAIL.test(text) || HANDLE.test(text)) flags.push('datos-personales');
  if (URL_RE.test(text)) flags.push('enlace');
  return { crisis, flags, action: flags.length ? 'hold' : 'publish' };
}

export const FLAG_LABELS: Record<ModerationFlag, string> = {
  crisis: 'Posible situación de riesgo',
  insulto: 'Lenguaje ofensivo',
  odio: 'Lenguaje de odio',
  'datos-personales': 'Datos personales (teléfono, correo, usuario)',
  enlace: 'Enlace externo',
  acoso: 'Posible acoso o amenaza',
  spam: 'Posible publicidad',
};

/** Open reports needed to hide a message automatically until a moderator reviews it. */
export const AUTO_HIDE_REPORTS = 3;

export const REACTIONS = {
  abrazo: 'Te mando un abrazo',
  'te-leo': 'Te leo',
  fuerza: 'Mucha fuerza',
  'me-pasa': 'A mí también me pasa',
} as const;
export type ReactionKind = keyof typeof REACTIONS;

const ADJECTIVES = ['sereno', 'valiente', 'tranquila', 'luminoso', 'paciente', 'serena', 'amable', 'firme', 'nueva', 'despierto', 'curiosa', 'libre'];
const NOUNS = ['Lucero', 'Río', 'Brisa', 'Faro', 'Raíz', 'Aurora', 'Nube', 'Puerto', 'Semilla', 'Camino', 'Luna', 'Roble', 'Marea', 'Alba'];

/** Random pseudonym that never contains the person's name or email. */
export function generatePseudonym(random: () => number = Math.random): string {
  const n = NOUNS[Math.floor(random() * NOUNS.length)];
  const a = ADJECTIVES[Math.floor(random() * ADJECTIVES.length)];
  const num = 10 + Math.floor(random() * 90);
  return `${n} ${a} ${num}`;
}

export const DEFAULT_ROOMS = [
  { id: 'primeros-dias', name: 'Primeros días', description: 'Para cuando todo es reciente y cuesta ordenar lo que sientes.' },
  { id: 'contacto-cero', name: 'Contacto cero', description: 'Sostener los límites que elegiste, con sus días buenos y difíciles.' },
  { id: 'noches-dificiles', name: 'Noches difíciles', description: 'Compañía para los momentos en que la noche se hace larga.' },
  { id: 'reconstruirme', name: 'Reconstruirme', description: 'Volver a tus gustos, tus vínculos y tus proyectos.' },
  { id: 'pequenos-avances', name: 'Pequeños avances', description: 'Compartir lo que te ayudó, por pequeño que parezca.' },
];
