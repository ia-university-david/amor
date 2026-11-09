export type BlogStatus = 'pendiente-migracion' | 'pendiente-revision' | 'publicado' | 'borrador';

export interface BlogPost {
  slug: string;
  title: string;
  category: string;
  readingMinutes: number | null;
  summary: string;
  /** Markdown. Empty until the original article is migrated from the previous site. */
  body: string;
  author: string;
  status: BlogStatus;
  publishedAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
}

export const TEAM_AUTHOR = 'Equipo Amor Tóxico';
export const SITE_AUTHOR = 'Laura Rojas';

/**
 * The first four posts exist on the previous amortoxico.com: their URLs,
 * titles and categories are kept, and their body stays empty until the real
 * text is migrated. The rest are original educational pieces by the team,
 * pending professional review, and never attributed to Laura Rojas.
 */
export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'te-convertiste-en-otra-persona',
    title: '¿Te convertiste en otra persona? Señales de que tu relación está cambiando quién eres',
    category: 'Identidad',
    readingMinutes: 8,
    summary: 'Sobre las señales de que una relación puede estar cambiando quién eres.',
    body: '',
    author: SITE_AUTHOR,
    status: 'pendiente-migracion',
  },
  {
    slug: 'como-identificar-relacion-toxica',
    title: '¿Cómo identificar si estás en una relación tóxica?',
    category: 'Relaciones',
    readingMinutes: 5,
    summary: 'Sobre cómo reconocer si una relación te está haciendo daño.',
    body: '',
    author: SITE_AUTHOR,
    status: 'pendiente-migracion',
  },
  {
    slug: 'contacto-cero-guia-completa',
    title: 'Contacto Cero: la guía completa para sanar',
    category: 'Sanación',
    readingMinutes: 7,
    summary: 'Sobre el contacto cero como herramienta para sanar después de una relación.',
    body: '',
    author: SITE_AUTHOR,
    status: 'pendiente-migracion',
  },
  {
    slug: 'amor-propio-despues-relacion-toxica',
    title: 'Amor propio después de una relación tóxica',
    category: 'Amor propio',
    readingMinutes: null,
    summary: 'Sobre cómo reconstruir el amor propio después de una relación que te hizo daño.',
    body: '',
    author: SITE_AUTHOR,
    status: 'pendiente-migracion',
  },
  {
    slug: 'ganas-de-escribirle',
    title: 'Cuando sientes ganas de escribirle: qué está pasando y qué puedes hacer',
    category: 'Impulsos',
    readingMinutes: 5,
    summary: 'Las ganas de contactar a la expareja son muy comunes. Una forma de darte unos minutos antes de decidir.',
    author: TEAM_AUTHOR,
    status: 'pendiente-revision',
    publishedAt: '2026-11-09',
    body: `Después de una ruptura, muchas personas sienten de pronto unas ganas enormes de escribir, llamar o revisar las redes de su expareja. A veces llegan con una canción, una fecha o simplemente en una noche en la que todo se siente más grande.

Sentir ese impulso **no significa que tengas que actuar**, ni que hayas retrocedido. Significa que algo importante terminó y que una parte de ti sigue orientada hacia esa persona.

## Qué suele haber detrás

Las ganas de contactar casi nunca son solo ganas de hablar. Muchas veces buscan algo más:

- Calmar una angustia que aparece de golpe.
- Comprobar si la otra persona también sufre.
- Pedir una explicación, o darla.
- Sentir, aunque sea un momento, que la relación no terminó del todo.

Ponerle nombre a lo que buscas ayuda a decidir con más calma si escribir te acerca a eso o no.

## Una pausa de pocos minutos

No necesitas decidir ahora. Puedes darte un espacio corto entre lo que sientes y lo que haces:

1. **Nombra el impulso.** "Tengo ganas de escribirle." Decirlo ya baja un poco la urgencia.
2. **Mide la intensidad** de 0 a 10. Los impulsos suelen subir, llegar a un punto y bajar.
3. **Pregúntate qué necesitas** de verdad en este momento.
4. **Haz algo distinto durante unos minutos**: respirar a tu ritmo, caminar, escribir el mensaje sin enviarlo, hablar con alguien de confianza.
5. **Vuelve a medir.** Si después de la pausa decides escribir, que sea una decisión tuya y no solo del impulso.

## Si hay contacto necesario

Si compartes hijos, trabajo o trámites, el contacto no siempre puede desaparecer. En ese caso puede ayudar acordar contigo qué temas sí y cuáles no, por qué canal y en qué horario. Ese contacto necesario no es un retroceso.

## Cuándo pedir ayuda

Si las ganas de contactar vienen con miedo, amenazas o la sensación de no estar a salvo, tu seguridad es lo primero: llama al número de emergencias de tu país o busca a alguien de confianza. Si el malestar se mantiene durante semanas o te impide funcionar en tu día a día, vale la pena consultarlo con un profesional de la salud mental.

*Este artículo es educativo, está pendiente de revisión profesional y no sustituye la atención de un profesional.*`,
  },
  {
    slug: 'por-que-las-noches-son-mas-dificiles',
    title: 'Por qué las noches se sienten más difíciles después de una ruptura',
    category: 'Bienestar',
    readingMinutes: 4,
    summary: 'Cansancio, silencio y rutinas que cambian: algunas razones por las que la noche pesa más, y pequeñas ideas para ese momento.',
    author: TEAM_AUTHOR,
    status: 'pendiente-revision',
    publishedAt: '2026-11-09',
    body: `Mucha gente nota que el día se sostiene más o menos bien y que, al llegar la noche, todo cambia: vuelven los recuerdos, las preguntas y las ganas de revisar el teléfono.

No hay una sola explicación, y cada persona es distinta, pero hay algunas cosas que suelen coincidir.

## Algunas razones frecuentes

- **Hay menos distracciones.** Durante el día el trabajo, las tareas o la gente ocupan la atención. De noche queda más espacio para pensar.
- **El cansancio pesa.** Cuando estamos agotados, suele costar más regular las emociones y frenar un impulso.
- **Las rutinas compartidas.** Si la noche era el momento de hablar o de estar juntos, ese hueco se nota más.
- **El teléfono está a mano.** Y con él, las redes, las fotos y los chats.

## Ideas pequeñas para la noche

No hace falta una rutina perfecta. Algo breve y repetido puede ayudar:

- Deja el teléfono lejos de la cama, o silencia ciertas notificaciones por la noche.
- Escribe dos o tres líneas sobre cómo te sientes, sin enviarlas a nadie.
- Prueba una respiración cómoda, a tu ritmo, durante dos minutos.
- Prepara de día un mensaje para ti de noche: "Si estás leyendo esto, es normal que duela. Mañana se verá distinto."

## Si no puedes dormir durante varios días

Si el insomnio se mantiene o te sientes cada vez peor, consulta con un profesional de la salud. Y si en algún momento sientes que no estás a salvo, llama al número de emergencias de tu país.

*Este artículo es educativo, está pendiente de revisión profesional y no sustituye la atención de un profesional.*`,
  },
  {
    slug: 'limites-cuando-hay-contacto-necesario',
    title: 'Poner límites cuando el contacto es necesario',
    category: 'Límites',
    readingMinutes: 5,
    summary: 'Hijos, trabajo o trámites: cómo cuidar tus límites cuando el contacto no puede desaparecer.',
    author: TEAM_AUTHOR,
    status: 'pendiente-revision',
    publishedAt: '2026-11-09',
    body: `No todas las rupturas permiten dejar de hablar por completo. Si compartes hijos, un trabajo, una casa o algún trámite, el "contacto cero" puede no ser posible ni deseable. Eso no significa que no puedas cuidarte.

## Límites que dependen de ti

Un límite no es una regla para la otra persona: es una decisión sobre lo que **tú** vas a hacer. Por ejemplo:

- "Hablo solo de los temas de los niños."
- "Respondo los mensajes en un horario que yo elijo."
- "Si la conversación se vuelve ofensiva, la termino y la retomo otro día."
- "Prefiero escribir antes que llamar."

## Algunas ideas prácticas

- **Elige un canal.** Un solo medio para lo necesario ayuda a que el resto de tus espacios sigan siendo tuyos.
- **Prepara frases cortas.** Tener respuestas breves pensadas de antemano reduce la tensión del momento.
- **Separa el tema de la emoción.** Puedes sentir mucho y aun así responder solo a lo que hay que resolver.
- **Registra lo que ayudó.** Notar qué te funcionó te da más recursos para la próxima vez.

## El contacto necesario no es un retroceso

Hablar con alguien porque hay hijos o asuntos en común no borra lo que has avanzado. En la app, este tipo de contacto nunca cuenta como un "reinicio" de tu proceso.

## Si hay miedo o violencia

Si el contacto incluye amenazas, control o sientes miedo, tu seguridad es lo primero. Llama al número de emergencias de tu país si estás en peligro y busca orientación especializada y legal en tu localidad.

*Este artículo es educativo, está pendiente de revisión profesional y no sustituye la atención de un profesional ni el asesoramiento legal.*`,
  },
];

export const BLOG_STATUS_NOTICE: Record<BlogStatus, string | null> = {
  'pendiente-migracion': 'Contenido pendiente de migración. El texto completo de este artículo se está trasladando desde el sitio anterior y aparecerá aquí tal como fue publicado.',
  'pendiente-revision': 'Artículo educativo original del equipo, pendiente de revisión profesional.',
  publicado: null,
  borrador: 'Borrador.',
};
