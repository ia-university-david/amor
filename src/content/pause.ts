export const URGE_ACTIONS = [
  { id: 'escribirle', label: 'Escribirle' },
  { id: 'llamarle', label: 'Llamarle' },
  { id: 'redes', label: 'Revisar sus redes' },
  { id: 'fotos', label: 'Ver fotografías' },
  { id: 'conversaciones', label: 'Revisar conversaciones antiguas' },
  { id: 'preguntar', label: 'Preguntar por esa persona' },
  { id: 'encuentro', label: 'Buscar un encuentro' },
  { id: 'otra', label: 'Otra cosa' },
] as const;

export const URGE_NEEDS = [
  { id: 'voz', label: 'Escuchar su voz' },
  { id: 'me-extrana', label: 'Saber si me extraña' },
  { id: 'importo', label: 'Sentir que todavía le importo' },
  { id: 'respuesta', label: 'Obtener una respuesta' },
  { id: 'perdon', label: 'Pedir perdón' },
  { id: 'reclamar', label: 'Reclamar algo' },
  { id: 'seguridad', label: 'Recuperar seguridad' },
  { id: 'ansiedad', label: 'Reducir la ansiedad' },
  { id: 'practico', label: 'Resolver un asunto práctico' },
  { id: 'no-se', label: 'No lo sé' },
] as const;

export const STRATEGIES = [
  { id: 'pausa-guiada', label: 'Pausa guiada', description: 'Un temporizador de 2, 5 o 10 minutos para dejar pasar la ola.', icon: 'clock' },
  { id: 'respiracion', label: 'Respiración', description: 'Respiración cómoda y voluntaria, o un anclaje con los sentidos si respirar te incomoda.', icon: 'wind' },
  { id: 'escribir', label: 'Escribir sin enviar', description: 'Escríbelo aquí. Se guarda cifrado y no se envía a nadie.', icon: 'pen' },
  { id: 'motivos', label: 'Revisar mis motivos', description: 'Tus límites y los recordatorios que escribiste para ti.', icon: 'shield' },
  { id: 'conectar', label: 'Conectar con alguien', description: 'Llama o escribe a una persona de confianza.', icon: 'users' },
  { id: 'asistente', label: 'Hablar con el asistente', description: 'Un espacio de conversación con IA de acompañamiento.', icon: 'chat' },
] as const;

export const DIFFICULT_TYPES = [
  { id: 'envie-mensaje', label: 'Envié un mensaje' },
  { id: 'llamada', label: 'Hice una llamada' },
  { id: 'respondi', label: 'Respondí un mensaje no necesario' },
  { id: 'redes', label: 'Revisé sus redes' },
  { id: 'busque-info', label: 'Busqué información' },
  { id: 'nos-vimos', label: 'Nos vimos' },
  { id: 'hablamos-relacion', label: 'Volvimos a hablar de la relación' },
  { id: 'otro', label: 'Otro evento' },
  { id: 'necesario', label: 'Fue un contacto necesario' },
] as const;

export const AFTER_FEELINGS = [
  { id: 'alivio', label: 'Sentí alivio' },
  { id: 'peor', label: 'Me sentí peor' },
  { id: 'confusion', label: 'Me quedé con más preguntas' },
  { id: 'culpa', label: 'Sentí culpa' },
  { id: 'igual', label: 'Me sentí igual' },
  { id: 'mezcla', label: 'Una mezcla de todo' },
] as const;

export const NOW_NEEDS = [
  { id: 'calma', label: 'Calmarme un poco' },
  { id: 'hablar', label: 'Hablar con alguien' },
  { id: 'entender', label: 'Entender qué pasó' },
  { id: 'plan', label: 'Preparar las próximas horas' },
  { id: 'descansar', label: 'Descansar' },
] as const;

export const TRIGGERS = [
  { id: 'noche', label: 'La noche o la hora de dormir' },
  { id: 'soledad', label: 'Estar a solas' },
  { id: 'recuerdo', label: 'Un recuerdo, canción, foto o lugar' },
  { id: 'redes', label: 'Algo que vi en redes' },
  { id: 'mensaje', label: 'Un mensaje suyo' },
  { id: 'alcohol', label: 'Después de beber' },
  { id: 'fecha', label: 'Una fecha especial' },
  { id: 'aburrimiento', label: 'Aburrimiento' },
  { id: 'discusion', label: 'Una discusión o mal momento' },
  { id: 'otro', label: 'Otro' },
] as const;

export type UrgeActionId = (typeof URGE_ACTIONS)[number]['id'];
export type UrgeNeedId = (typeof URGE_NEEDS)[number]['id'];
export type StrategyId = (typeof STRATEGIES)[number]['id'];
export type DifficultTypeId = (typeof DIFFICULT_TYPES)[number]['id'];
export type TriggerId = (typeof TRIGGERS)[number]['id'];
export type AfterFeelingId = (typeof AFTER_FEELINGS)[number]['id'];
export type NowNeedId = (typeof NOW_NEEDS)[number]['id'];

export const NEED_EXPLANATIONS: Partial<Record<UrgeNeedId, string>> = {
  voz: 'Su voz puede haberse convertido en una señal de calma o de hogar. Es comprensible extrañarla. A veces, lo que buscas es esa sensación de calma, y puedes encontrar otras formas de acercarte a ella ahora.',
  'me-extrana': 'Querer saber si te extraña suele esconder una pregunta más profunda: si fuiste importante. Tu valor no depende de su respuesta, y esa respuesta rara vez trae la tranquilidad que esperas.',
  importo: 'Buscar señales de que todavía le importas es muy humano. Recuerda que un mensaje o una respuesta no siempre dan la seguridad que buscas, y a veces dejan más preguntas.',
  respuesta: 'Necesitar una explicación es natural. Algunas preguntas no tienen una respuesta que alivie, o la otra persona no puede darla. Puedes construir tu propio cierre, aunque lleve tiempo.',
  perdon: 'Querer pedir perdón puede venir de la culpa o del deseo de reparar. Vale la pena preguntarte si este es el momento, o si primero necesitas perdonarte a ti.',
  reclamar: 'La rabia también es información: puede estar señalando algo que no estuvo bien. Expresarla aquí, sin enviarla, puede ayudarte a ordenar lo que sientes antes de decidir.',
  seguridad: 'Cuando algo se rompe, es normal buscar lo conocido para sentirte a salvo. Hay otras fuentes de seguridad: tus rutinas, tus personas de confianza, tu propio cuerpo.',
  ansiedad: 'La ansiedad empuja a actuar rápido para que pase. Muchas veces baja sola si le das unos minutos. Puedes intentarlo ahora.',
  practico: 'Si es un asunto práctico real, puedes atenderlo. Te puede ayudar escribir antes lo estrictamente necesario y dejar fuera lo emocional.',
  'no-se': 'No saber qué necesitas también está bien. A veces el impulso llega antes que las palabras. Darte una pausa puede ayudarte a descubrirlo.',
};

export const URGE_EXPLANATION =
  'Cuando una relación ha sido importante, tu cerebro puede seguir asociando a esa persona con alivio, expectativa y recompensa. Por eso el impulso puede sentirse muy intenso. Sentirlo no significa que tengas que actuar ahora.';
