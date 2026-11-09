/**
 * Las siete situaciones del recorrido. No son plazos ni una secuencia
 * obligatoria: la persona puede estar en dos a la vez y volver atrás.
 * Los capítulos completos de Laura se sustituyen en el CMS (tipo `laura`)
 * sin cambiar estos identificadores.
 */
export const CHAPTERS = [
  {
    id: 'dentro',
    number: 1,
    title: 'Sigo en la relación',
    subtitle: 'Dudar, sentir y mirar con más claridad, sin tener que decidir hoy.',
    book: 'Introducción y caps. II–VIII (pp. 17–19, 36–39, 41–76, 93–117, 119–142)',
  },
  {
    id: 'recien',
    number: 2,
    title: 'Acabo de terminar',
    subtitle: 'Las primeras horas después de la ruptura: nombrar la pérdida y no resolver en caliente.',
    book: 'Caps. IV y VIII–IX (pp. 54–56, 139–141, 147–150)',
  },
  {
    id: 'primeros',
    number: 3,
    title: 'Los primeros días',
    subtitle: 'Seguridad, lo básico y un plan si hace falta salir. Siempre disponible, sin costo.',
    book: 'Caps. VIII y X (pp. 139–141, 155–160)',
  },
  {
    id: 'distancia',
    number: 4,
    title: 'La distancia que elijo',
    subtitle: 'El contacto cero es una opción. Hablar por hijos, trámites o seguridad no es un retroceso.',
    book: 'Caps. VI, VIII y IX (pp. 100–101, 125–126, 149–152)',
  },
  {
    id: 'comprender',
    number: 5,
    title: 'Comprender lo que viví',
    subtitle: 'Duelo, culpa que pesa y patrones propios, sin culparte de lo que te hicieron.',
    book: 'Caps. III–VII (pp. 47–49, 60–66, 84–91, 106–117, 120–121, 147–148)',
  },
  {
    id: 'identidad',
    number: 6,
    title: 'Volver a mí',
    subtitle: 'Lo que dejaste de hacer, lo que te gusta y el cuidado que te debes.',
    book: 'Caps. II, IV, V y IX (pp. 31–32, 57–60, 79–83, 150–153)',
  },
  {
    id: 'futuro',
    number: 7,
    title: 'Lo que quiero después',
    subtitle: 'No negociables, banderas verdes y un amor que se elige, no que se sobrevive.',
    book: 'Caps. IV, V, VI y X (pp. 73–74, 77–81, 96–102, 156–160)',
  },
] as const;

export type ChapterId = (typeof CHAPTERS)[number]['id'];

export function chapterById(id: ChapterId) {
  return CHAPTERS.find((c) => c.id === id)!;
}
