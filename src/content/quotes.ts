import type { ChapterId } from './chapters';

/**
 * Citas breves y literales del libro, con página, para la pieza
 * «Lo que Laura escribió». No las dice el asistente. Publicarlas tal cual
 * sigue pendiente de la aprobación de Laura Rojas.
 */
export interface LauraQuote {
  id: string;
  text: string;
  page: number;
  situations: (ChapterId | 'impulso' | 'culpa' | 'noche')[];
}

export const QUOTE_NOTICE =
  'Cita breve de Amor tóxico, de Laura Rojas. Pendiente de su aprobación para publicarse tal cual. El asistente no habla en su nombre.';

export const LAURA_QUOTES: LauraQuote[] = [
  {
    id: 'desaparecer',
    text: 'empezamos a desaparecer gradualmente, a renunciar a nosotros mismos',
    page: 17,
    situations: ['dentro', 'identidad'],
  },
  {
    id: 'cuerpo',
    text: 'Escucha a tu cuerpo, no a tus argumentos',
    page: 45,
    situations: ['dentro', 'impulso'],
  },
  {
    id: 'ruptura',
    text: 'Una ruptura no es necesariamente un fracaso',
    page: 56,
    situations: ['recien', 'primeros', 'comprender'],
  },
  {
    id: 'amor-propio',
    text: 'El amor propio es una conversación íntima y honesta con nosotros mismos, no con los demás.',
    page: 57,
    situations: ['identidad'],
  },
  {
    id: 'aprende',
    text: 'cuando uno no gana, aprende.',
    page: 47,
    situations: ['comprender', 'culpa', 'distancia'],
  },
  {
    id: 'mascara',
    text: 'Amarnos y priorizarnos no es egoísmo, es regla básica de supervivencia.',
    page: 102,
    situations: ['futuro', 'identidad', 'dentro'],
  },
  {
    id: 'perdon',
    text: 'perdonar y olvidar son dos cosas muy distintas',
    page: 153,
    situations: ['identidad', 'futuro'],
  },
  {
    id: 'ilusion',
    text: 'La ilusión del amor ideal es un enemigo tremendo de hombres y mujeres por igual.',
    page: 31,
    situations: ['comprender', 'futuro'],
  },
];

export function quoteFor(situation: LauraQuote['situations'][number], day = new Date()): LauraQuote {
  const matches = LAURA_QUOTES.filter((q) => q.situations.includes(situation));
  const pool = matches.length ? matches : LAURA_QUOTES;
  const index = Math.abs(day.getDate() + situation.length) % pool.length;
  return pool[index];
}
