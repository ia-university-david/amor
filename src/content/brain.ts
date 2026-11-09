export interface BrainTopic {
  id: string;
  n: number;
  title: string;
  summary: string;
  body: string[];
  example: string;
  /** Explicit note when a comparison is a metaphor rather than a literal finding. */
  metaphor?: string;
  evidence: {
    text: string;
    refs: string[];
  };
}

export const BRAIN_MODULE_NOTICE =
  'Contenido educativo en lenguaje sencillo, pendiente de revisión profesional. No es un diagnóstico ni sustituye la atención de un profesional de la salud mental.';

export const BRAIN_TOPICS: BrainTopic[] = [
  {
    id: 'recompensa-apego',
    n: 1,
    title: 'Recompensa, motivación y apego romántico',
    summary: 'Por qué una persona puede convertirse en algo que tu cerebro “busca”.',
    body: [
      'El cerebro tiene sistemas que nos empujan a buscar aquello que, en el pasado, nos hizo sentir bien o seguros. Estos sistemas de recompensa y motivación participan en cosas tan distintas como comer, aprender o vincularnos con otras personas.',
      'Cuando una relación es importante, la otra persona puede quedar muy asociada a esas sensaciones de calma, placer o pertenencia. Por eso, cuando la relación termina, una parte de ti puede seguir orientada hacia ella, aunque otra parte sepa que no te hace bien.',
    ],
    example: 'Es parecido a cuando cambias de casa y, durante semanas, tus pies te llevan por costumbre hacia la calle de antes.',
    metaphor: 'La comparación con una mudanza es una metáfora para entender la idea, no una descripción literal de cómo funciona el cerebro.',
    evidence: {
      text: 'Un estudio pequeño con resonancia magnética (15 personas) encontró activación de regiones asociadas con recompensa y motivación al ver la foto de la expareja. Muestra asociaciones, no causas, y no se puede generalizar a todas las personas.',
      refs: ['fisher-2010'],
    },
  },
  {
    id: 'dopamina-anticipacion',
    n: 2,
    title: 'Dopamina y anticipación',
    summary: 'La dopamina no es “la sustancia de la felicidad”.',
    body: [
      'Se suele decir que la dopamina es la “química de la felicidad”, pero eso no es preciso. La dopamina participa sobre todo en la motivación, en el aprendizaje y en la anticipación de una posible recompensa: en el “quiero” más que en el “disfruto”.',
      'Por eso la espera de un mensaje, la posibilidad de una respuesta o la incertidumbre pueden sentirse tan intensas. No es que algo esté mal en ti: es un sistema que aprendió a esperar algo de esa persona.',
    ],
    example: 'Mirar el teléfono una y otra vez “por si acaso” es un ejemplo cotidiano de anticipación.',
    evidence: {
      text: 'Explicación general basada en la literatura sobre motivación y aprendizaje. No es posible medir ni calcular tu nivel de dopamina a partir de lo que sientes, y esta app nunca lo hará.',
      refs: [],
    },
  },
  {
    id: 'deseo-de-contactar',
    n: 3,
    title: 'Por qué deseamos contactar aunque sepamos que hará daño',
    summary: 'Saber algo y sentir algo pasan por caminos distintos.',
    body: [
      'Puedes saber con claridad que escribirle no te ayudará y, aun así, sentir un deseo enorme de hacerlo. Esto ocurre porque la parte que razona y la parte que busca alivio no siempre van al mismo ritmo.',
      'El impulso suele prometer alivio inmediato: “si me responde, me voy a calmar”. A veces pasa; muchas otras, la calma dura poco y deja más preguntas. Crear una pausa entre el impulso y la acción te devuelve la posibilidad de elegir.',
    ],
    example: 'Es como querer rascarte una picadura: sabes que irrita más, pero la urgencia del momento es real.',
    metaphor: 'Algunos estudios usan la palabra “adicción” para describir patrones de búsqueda tras el rechazo amoroso. Es una comparación útil, pero una ruptura no es literalmente una adicción a una droga.',
    evidence: {
      text: 'En el estudio de Fisher y colaboradores se activaron regiones también implicadas en el deseo intenso (craving). Es un estudio pequeño y sus autores lo plantean como una posible explicación, no como una prueba definitiva.',
      refs: ['fisher-2010'],
    },
  },
  {
    id: 'recuerdos-asociaciones',
    n: 4,
    title: 'Recuerdos y asociaciones emocionales',
    summary: 'La memoria guarda emociones junto con los hechos.',
    body: [
      'Los recuerdos no se guardan como una película neutral: vienen con emociones, olores, lugares y sensaciones. Por eso un recuerdo puede volver con la misma fuerza emocional que tuvo.',
      'Con el tiempo, y a medida que vives nuevas experiencias en los mismos lugares o con las mismas canciones, esas asociaciones pueden ir perdiendo intensidad. No se borran, pero dejan de dominar.',
    ],
    example: 'Un perfume en la calle puede llevarte, en un segundo, a una tarde concreta de hace años.',
    evidence: {
      text: 'Explicación general sobre memoria emocional. Referencias específicas pendientes de revisión profesional.',
      refs: [],
    },
  },
  {
    id: 'cancion-foto-lugar',
    n: 5,
    title: 'Por qué una canción, una foto o un lugar activan tristeza',
    summary: 'Los recordatorios funcionan como señales que encienden recuerdos.',
    body: [
      'Una canción, una foto o un lugar pueden funcionar como señales que activan recuerdos y emociones asociadas, incluso cuando no estabas pensando en esa persona.',
      'No hace falta evitarlo todo para siempre. Algunas personas prefieren guardar ciertas fotos por un tiempo; otras eligen exponerse poco a poco. Lo importante es que lo decidas tú, a tu ritmo.',
    ],
    example: 'Entrar al supermercado donde solían ir juntos y sentir un nudo en el estómago sin saber bien por qué.',
    evidence: {
      text: 'Explicación general sobre aprendizaje asociativo. Referencias específicas pendientes de revisión profesional.',
      refs: [],
    },
  },
  {
    id: 'rumiacion',
    n: 6,
    title: 'Rumiación: cuando la mente da vueltas',
    summary: 'Pensar mucho no siempre es lo mismo que comprender.',
    body: [
      'La rumiación es darle vueltas una y otra vez a lo mismo: qué pasó, qué dijo, qué habría pasado si… Suele sentirse como “intentar entender”, pero a menudo no lleva a ninguna conclusión nueva y aumenta el malestar.',
      'Una forma de notarla es preguntarte: “¿esto que estoy pensando me acerca a una decisión o solo me deja igual o peor?”. Si es lo segundo, cambiar de actividad unos minutos puede ayudar más que seguir pensando.',
    ],
    example: 'Releer la última conversación por décima vez buscando una frase que lo explique todo.',
    evidence: {
      text: 'Un ensayo con personas recién separadas encontró que la escritura expresiva no ayudó, e incluso se asoció con peor evolución, en quienes estaban muy centrados en buscar un significado. Sugiere que dar vueltas a lo mismo no siempre ayuda; no significa que escribir sea dañino en general.',
      refs: ['sbarra-2013'],
    },
  },
  {
    id: 'idealizacion',
    n: 7,
    title: 'Idealización y memoria selectiva',
    summary: 'Cuando extrañamos, a veces recordamos solo una parte.',
    body: [
      'Después de una ruptura es común recordar sobre todo los mejores momentos y dejar en segundo plano los que dolieron. No es que te engañes a propósito: la nostalgia tiende a seleccionar.',
      'Recordar lo bueno no está mal. Lo útil es tener también presente el cuadro completo, especialmente cuando estás a punto de tomar una decisión.',
    ],
    example: 'Recordar el viaje perfecto y olvidar las semanas de silencio que vinieron después.',
    evidence: {
      text: 'Explicación general. Referencias específicas pendientes de revisión profesional.',
      refs: [],
    },
  },
  {
    id: 'cuerpo-estres',
    n: 8,
    title: 'Respuestas corporales ante el estrés',
    summary: 'La tristeza y la ansiedad también se sienten en el cuerpo.',
    body: [
      'Ante una situación que el cuerpo vive como amenaza o pérdida, pueden aparecer cambios en el sueño, el apetito, la tensión muscular, la respiración o el ritmo cardiaco. Son respuestas habituales del organismo ante el estrés.',
      'Cuidar lo básico —dormir lo que puedas, comer algo, moverte un poco— no resuelve la tristeza, pero da al cuerpo un suelo más firme. Si los síntomas son intensos o duran mucho, vale la pena consultar a un profesional de la salud.',
    ],
    example: 'Despertarte a las 4 de la mañana con el corazón acelerado pensando en esa persona.',
    evidence: {
      text: 'Explicación general sobre la respuesta de estrés. No hacemos cálculos ni interpretaciones biológicas individuales.',
      refs: [],
    },
  },
  {
    id: 'habitos',
    n: 9,
    title: 'Hábitos y aprendizaje emocional',
    summary: 'Muchos impulsos son costumbres aprendidas.',
    body: [
      'Durante una relación se forman muchos hábitos: escribir al despertar, llamar al salir del trabajo, contar lo que pasó en el día. Cuando la relación termina, el hábito puede seguir apareciendo aunque ya no tenga a quién dirigirse.',
      'Los hábitos cambian mejor cuando se reemplazan que cuando solo se suprimen. Pensar qué harás en ese momento concreto suele funcionar mejor que solo decirte “no lo hagas”.',
    ],
    example: 'Sacar el teléfono a las 22:00, la hora en que solían hablar, sin haberlo decidido.',
    evidence: {
      text: 'Explicación general sobre formación de hábitos. Referencias específicas pendientes de revisión profesional.',
      refs: [],
    },
  },
  {
    id: 'autorregulacion',
    n: 10,
    title: 'Autorregulación y posponer decisiones',
    summary: 'Un impulso intenso suele bajar si le das tiempo.',
    body: [
      'Las emociones intensas tienden a subir, llegar a un punto alto y luego bajar, aunque no hagas nada para que pasen. Esperar unos minutos antes de actuar no significa reprimir lo que sientes: significa decidir cuando estés en un lugar más tranquilo.',
      'Posponer no es prohibirte para siempre. Puedes decirte: “si dentro de 20 minutos sigo queriendo hacerlo, lo pensaré de nuevo”. Muchas veces, la decisión cambia.',
    ],
    example: 'Escribir el mensaje en las notas del teléfono, esperar, y releerlo una hora después.',
    metaphor: 'La imagen de la “ola” que sube y baja es una metáfora útil, no una medida exacta: cada persona y cada momento son distintos.',
    evidence: {
      text: 'Explicación general sobre regulación emocional. Referencias específicas pendientes de revisión profesional.',
      refs: [],
    },
  },
  {
    id: 'identidad-compartida',
    n: 11,
    title: 'Identidad compartida y reconstrucción',
    summary: '“¿Quién soy sin esta relación?” es una pregunta frecuente.',
    body: [
      'En una relación, parte de nuestra identidad se vuelve compartida: planes, amistades, gustos, rutinas. Cuando termina, es normal sentir que una parte de ti se fue con ella.',
      'Reconstruir no es volver a ser exactamente quien eras antes, sino integrar lo vivido y recuperar lo que es tuyo. Volver a ti también es una forma de sanar.',
    ],
    example: 'No saber qué película elegir porque durante años la elegían entre dos.',
    evidence: {
      text: 'En un estudio de 8 semanas, una menor recuperación del sentido de “quién soy” después de una ruptura se asoció con menor bienestar. Es una asociación: no prueba causa y efecto.',
      refs: ['mason-2012'],
    },
  },
  {
    id: 'autocompasion',
    n: 12,
    title: 'Autocompasión',
    summary: 'Tratarte con la amabilidad que darías a alguien que quieres.',
    body: [
      'La autocompasión no es lástima ni conformismo. Incluye tratarte con amabilidad, recordar que sufrir por una pérdida es parte de la experiencia humana, y mirar lo que sientes sin exagerarlo ni negarlo.',
      'Muchas personas se hablan con mucha dureza después de una ruptura. Cambiar el tono —no el contenido— puede marcar una diferencia.',
    ],
    example: 'En lugar de “qué tonta/o fui”, probar con “hice lo que pude con lo que sabía entonces”.',
    evidence: {
      text: 'En un estudio con 109 personas en proceso de divorcio, mostrar más autocompasión se asoció con menos malestar intrusivo hasta 9 meses después. Es correlacional y sus autores piden replicarlo.',
      refs: ['sbarra-2012'],
    },
  },
  {
    id: 'estilos-apego',
    n: 13,
    title: 'Apego ansioso, evitativo y seguro',
    summary: 'Formas de vincularnos, no etiquetas ni diagnósticos.',
    body: [
      'La psicología describe distintos estilos de apego. De forma muy simplificada: en el estilo ansioso predomina el miedo a ser abandonado; en el evitativo, la incomodidad con la cercanía; en el seguro, cierta confianza en que se puede estar cerca sin perderse.',
      'Estos estilos no son categorías fijas ni diagnósticos: pueden variar según la relación y cambiar con el tiempo. Tampoco todo apego es un problema: el apego seguro y la interdependencia sana son parte normal de querer a alguien.',
    ],
    example: 'Sentir mucha inquietud cuando la otra persona tarda en responder puede reflejar un momento ansioso, no una forma de ser definitiva.',
    evidence: {
      text: 'Descripción simplificada de la teoría del apego en adultos. Esta app no evalúa ni asigna estilos de apego. Referencias específicas pendientes de revisión profesional.',
      refs: [],
    },
  },
  {
    id: 'experiencias-nuevas',
    n: 14,
    title: 'Construir experiencias nuevas',
    summary: 'Lo nuevo no reemplaza lo vivido, pero amplía tu mapa.',
    body: [
      'Cada experiencia nueva —un lugar, una actividad, una conversación— crea recuerdos que no están asociados a la relación anterior. Poco a poco, tu vida cotidiana deja de estar organizada alrededor de una ausencia.',
      'No hace falta que sean experiencias grandes. Lo pequeño y repetido suele tener más efecto que un gran cambio aislado.',
    ],
    example: 'Volver a la cafetería de siempre, esta vez con una amiga, y crear una tarde distinta allí.',
    evidence: {
      text: 'Explicación general. Referencias específicas pendientes de revisión profesional.',
      refs: [],
    },
  },
  {
    id: 'sin-calendario',
    n: 15,
    title: 'La recuperación no sigue un calendario universal',
    summary: 'No existen 21, 30, 60 ni 90 días mágicos.',
    body: [
      'A veces se dice que en un número concreto de días “se supera” una ruptura. No hay evidencia de que exista un calendario universal: cada historia, cada persona y cada contexto son distintos.',
      'La recuperación tampoco es una línea recta. Habrá días mejores y días más difíciles, y un día difícil no borra lo que has aprendido. Esta app no te pondrá plazos.',
    ],
    example: 'Sentirte bien una semana y, de repente, muy triste en una fecha especial. Es parte del proceso, no un retroceso.',
    evidence: {
      text: 'Los estudios con personas separadas muestran trayectorias muy diferentes entre personas. No hay base para prometer plazos.',
      refs: ['sbarra-2012', 'mason-2012'],
    },
  },
];
