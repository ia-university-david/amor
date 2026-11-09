export type PillarId = 1 | 2 | 3 | 4 | 5;

export interface Pillar {
  id: PillarId;
  title: string;
  description: string;
}

export const PILLARS: Pillar[] = [
  { id: 1, title: 'Comprender lo que siento', description: 'Nombrar las emociones y lo que realmente se perdió, sin juzgarte.' },
  { id: 2, title: 'Entender por qué mi cerebro sigue buscando a esa persona', description: 'Qué pasa en el cuerpo y en la mente después de una ruptura, explicado con sencillez.' },
  { id: 3, title: 'Recuperar la capacidad de decidir antes de actuar por impulso', description: 'Herramientas para crear un espacio entre lo que sientes y lo que haces.' },
  { id: 4, title: 'Reconstruir autoestima, límites e identidad', description: 'Volver a ti: tus creencias, tus límites, tus gustos y tu tiempo.' },
  { id: 5, title: 'Relacionarme de forma más libre y consciente', description: 'Amar eligiendo compartir, no desde la sensación de no poder vivir sin el otro.' },
];

export type ModuleKind = 'ejercicio' | 'lectura' | 'herramienta';

export interface ProgramModule {
  id: string;
  pillar: PillarId;
  title: string;
  summary: string;
  kind: ModuleKind;
  minutes: number;
  /** 'laura-pendiente': theme from Laura Rojas' book; authorized text not yet delivered. */
  source: 'original' | 'laura-pendiente';
  exerciseId?: string;
  to?: string;
}

export const MODULES: ProgramModule[] = [
  { id: 'reconocer-patrones', pillar: 1, title: 'Reconocer patrones en la relación', summary: 'Cómo identificar dinámicas que se repiten y lo que provocan en ti.', kind: 'lectura', minutes: 8, source: 'laura-pendiente' },
  { id: 'senales-alerta', pillar: 1, title: 'Señales de alerta', summary: 'Señales que vale la pena observar en una relación, sin etiquetar a nadie.', kind: 'lectura', minutes: 6, source: 'laura-pendiente' },
  { id: 'que-perdi', pillar: 1, title: '¿Qué perdí realmente?', summary: 'Distinguir la pérdida de la persona de otras pérdidas que llegan con ella.', kind: 'ejercicio', minutes: 10, source: 'original', exerciseId: 'que-perdi' },
  { id: 'apego', pillar: 1, title: 'Preguntas sobre el apego', summary: 'Cinco preguntas para distinguir lo que extrañas de lo que necesitas.', kind: 'ejercicio', minutes: 8, source: 'original', exerciseId: 'apego' },

  { id: 'cerebro', pillar: 2, title: 'Tu cerebro después de una ruptura', summary: '15 temas breves sobre recompensa, recuerdos, rumiación, hábitos y recuperación.', kind: 'herramienta', minutes: 3, source: 'original', to: '/app/cerebro' },
  { id: 'ciclo-control', pillar: 2, title: 'El ciclo de control y manipulación', summary: 'Por qué algunas relaciones alternan tensión, conflicto y reconciliación.', kind: 'lectura', minutes: 8, source: 'laura-pendiente' },

  { id: 'pausa-practica', pillar: 3, title: 'Practicar la pausa', summary: 'Conoce la pausa antes de necesitarla: impulso, intensidad, necesidad y alternativa.', kind: 'herramienta', minutes: 4, source: 'original', to: '/app/pausa' },
  { id: 'conciencia', pillar: 3, title: 'Prácticas de atención y agencia', summary: 'Atención plena, respiración cómoda, pensamientos, valores, autocompasión y decisiones propias.', kind: 'ejercicio', minutes: 10, source: 'original', exerciseId: 'conciencia' },
  { id: 'mis-limites', pillar: 3, title: 'Definir mis límites de contacto', summary: 'Elige una modalidad de contacto y reglas que te cuiden.', kind: 'herramienta', minutes: 5, source: 'original', to: '/app/limites' },

  { id: 'perdida-identidad', pillar: 4, title: 'Pérdida de identidad', summary: 'Cuando la relación cambió quién eras, y cómo empezar a recuperarte.', kind: 'lectura', minutes: 8, source: 'laura-pendiente' },
  { id: 'creencias-limites', pillar: 4, title: 'Creencias limitantes y límites sanos', summary: 'Las ideas que sostienen el dolor y cómo poner límites con claridad.', kind: 'lectura', minutes: 8, source: 'laura-pendiente' },
  { id: 'creencias', pillar: 4, title: 'Revisar un pensamiento', summary: 'Pensamiento, emoción, evidencia a favor y en contra, y una alternativa equilibrada.', kind: 'ejercicio', minutes: 10, source: 'original', exerciseId: 'creencias' },
  { id: 'amor-propio', pillar: 4, title: 'Amor propio', summary: 'Técnicas para tratarte con el mismo cuidado que darías a alguien que quieres.', kind: 'lectura', minutes: 7, source: 'laura-pendiente' },
  { id: 'soledad', pillar: 4, title: 'Estar a solas sin sentirte abandonado', summary: 'Un programa progresivo para reconstruir tu tiempo propio.', kind: 'ejercicio', minutes: 12, source: 'original', exerciseId: 'soledad' },

  { id: 'autonomia', pillar: 5, title: 'Autonomía emocional', summary: 'Sostenerte sin dejar de necesitar a otros.', kind: 'lectura', minutes: 7, source: 'laura-pendiente' },
  { id: 'amor-autonomia', pillar: 5, title: 'Amor y autonomía', summary: 'Elegir compartir frente a sentir que no puedes vivir sin alguien.', kind: 'ejercicio', minutes: 8, source: 'original', exerciseId: 'amor-autonomia' },
  { id: 'relaciones-futuras', pillar: 5, title: 'Relaciones futuras', summary: 'Cómo reconocer lo que quieres y lo que no en tus próximos vínculos.', kind: 'lectura', minutes: 7, source: 'laura-pendiente' },
];

export type ExerciseStep =
  | { type: 'info'; title?: string; text: string }
  | { type: 'text'; id: string; prompt: string; help?: string }
  | { type: 'choice'; id: string; prompt: string; options: string[]; allowOther?: boolean }
  | { type: 'multi'; id: string; prompt: string; options: string[] }
  | { type: 'scale'; id: string; prompt: string; min: number; max: number; minLabel: string; maxLabel: string }
  | { type: 'rate-list'; id: string; prompt: string; items: { id: string; label: string; help: string }[]; levels: string[] };

export interface Exercise {
  id: string;
  title: string;
  intro: string;
  steps: ExerciseStep[];
  closing: string;
}

export const BELIEF_SEEDS = [
  'Sin esa persona nunca volveré a ser feliz',
  'Si me dejó, significa que no valgo',
  'Nunca encontraré a alguien más',
  'Necesito una explicación para poder seguir',
  'Si realmente me quisiera, cambiaría',
  'Después de tantos años, empezar de nuevo es imposible',
];

export const EXERCISES: Record<string, Exercise> = {
  apego: {
    id: 'apego',
    title: 'Preguntas sobre el apego',
    intro:
      'Apegarnos a quienes queremos es humano. El apego seguro y la interdependencia sana son parte normal de las relaciones. Estas preguntas no buscan calificar lo que sientes, solo ayudarte a mirarlo con más claridad.',
    steps: [
      { type: 'text', id: 'necesito', prompt: '¿Siento que necesito a esta persona para estar bien?', help: 'Puedes responder con matices: “en algunos momentos”, “cuando estoy a solas”…' },
      { type: 'text', id: 'temo-perder', prompt: '¿Qué temo perder realmente?' },
      { type: 'text', id: 'persona-o-rutina', prompt: '¿Extraño a la persona, o la seguridad y la rutina que había a su alrededor?' },
      { type: 'text', id: 'deje-cultivar', prompt: '¿Qué partes de mi vida dejé de cultivar?' },
      { type: 'text', id: 'recuperar', prompt: '¿Qué puedo recuperar sin negar que fue importante?' },
    ],
    closing: 'Reconocer lo que fue importante y lo que quieres recuperar puede convivir. No necesitas elegir entre una cosa y otra.',
  },
  'que-perdi': {
    id: 'que-perdi',
    title: '¿Qué perdí realmente?',
    intro:
      'Cuando termina una relación no solo se pierde a una persona. También pueden irse costumbres, planes y certezas. Separar esas pérdidas ayuda a ver cuáles puedes atender por otros caminos.',
    steps: [
      {
        type: 'rate-list',
        id: 'perdidas',
        prompt: '¿Cuánto pesa hoy cada una de estas pérdidas?',
        levels: ['Nada', 'Poco', 'Bastante', 'Mucho'],
        items: [
          { id: 'compania', label: 'Pérdida de compañía', help: 'Tener a alguien con quien compartir el día.' },
          { id: 'costumbres', label: 'Pérdida de costumbres', help: 'Rutinas, lugares, rituales compartidos.' },
          { id: 'miedo-solo', label: 'Miedo a estar solo', help: 'La inquietud de no tener a nadie cerca.' },
          { id: 'proyecto', label: 'Pérdida del proyecto de vida', help: 'Planes que tenían juntos.' },
          { id: 'economia', label: 'Inseguridad económica', help: 'Cambios en ingresos, vivienda o gastos.' },
          { id: 'futuro', label: 'Nostalgia por el futuro imaginado', help: 'Lo que pensabas que iba a pasar y no pasará.' },
        ],
      },
      { type: 'text', id: 'mas-pesa', prompt: '¿Cuál de estas pérdidas pesa más hoy? ¿Qué crees que necesitarías para cuidarla?' },
      { type: 'text', id: 'otros-caminos', prompt: '¿Hay alguna parte que puedas reconstruir por otros caminos (amistades, rutinas, planes propios)?' },
    ],
    closing: 'Ponerle nombre a cada pérdida no la hace desaparecer, pero sí la vuelve más manejable.',
  },
  creencias: {
    id: 'creencias',
    title: 'Revisar un pensamiento',
    intro:
      'Algunos pensamientos aparecen con mucha fuerza después de una ruptura y se sienten como verdades. Este ejercicio no busca “pensar en positivo”, sino mirar el pensamiento con más equilibrio.',
    steps: [
      { type: 'choice', id: 'pensamiento', prompt: '¿Qué pensamiento quieres revisar?', options: BELIEF_SEEDS, allowOther: true },
      { type: 'text', id: 'emocion', prompt: '¿Qué emoción aparece cuando lo piensas?' },
      { type: 'scale', id: 'intensidad-inicial', prompt: '¿Cuánto crees en este pensamiento ahora mismo?', min: 0, max: 10, minLabel: 'Nada', maxLabel: 'Totalmente' },
      { type: 'text', id: 'a-favor', prompt: '¿Qué hechos parecen apoyar este pensamiento?', help: 'Hechos concretos, no interpretaciones.' },
      { type: 'text', id: 'en-contra', prompt: '¿Qué hechos no encajan con él?', help: 'Piensa en otros momentos de tu vida, en lo que dirían personas que te conocen bien.' },
      { type: 'text', id: 'alternativa', prompt: 'Escribe una versión más equilibrada del pensamiento.', help: 'Por ejemplo: “Ahora me cuesta imaginar ser feliz, pero ya he atravesado momentos difíciles antes.”' },
      { type: 'scale', id: 'intensidad-final', prompt: 'Después de revisarlo, ¿cuánto crees en el pensamiento original?', min: 0, max: 10, minLabel: 'Nada', maxLabel: 'Totalmente' },
    ],
    closing: 'Si el pensamiento sigue teniendo fuerza, está bien. Revisarlo varias veces suele ser parte del proceso.',
  },
  soledad: {
    id: 'soledad',
    title: 'Estar a solas sin sentirte abandonado',
    intro: 'Un programa en cinco pasos. Puedes hacerlo de una vez o volver a él a lo largo de varias semanas.',
    steps: [
      { type: 'info', title: '1. Estar a solas no es lo mismo que sentirse abandonado', text: 'Estar a solas es una circunstancia. Sentirse abandonado es una emoción que a veces aparece con ella, pero no siempre. Con práctica, el tiempo propio puede volver a sentirse como un lugar seguro.' },
      { type: 'text', id: 'momentos', prompt: '¿En qué momentos estar a solas se siente más difícil?' },
      { type: 'info', title: '2. Recuperar vínculos', text: 'Es común que durante una relación algunas amistades o familiares hayan quedado lejos. Retomar el contacto puede empezar con un saludo, sin explicaciones.' },
      { type: 'text', id: 'vinculo', prompt: '¿A quién podrías escribirle esta semana, solo para saludar?' },
      { type: 'info', title: '3. Actividades individuales', text: 'Elegir algo que hagas contigo, sin esperar a nadie: caminar, cocinar algo nuevo, ir a un lugar que te guste.' },
      { type: 'text', id: 'actividad', prompt: '¿Qué actividad de 20 o 30 minutos te gustaría hacer contigo esta semana?' },
      { type: 'info', title: '4. Rutinas propias', text: 'Las rutinas dan estructura a días que pueden sentirse vacíos. No hace falta que sean perfectas.' },
      { type: 'text', id: 'rutina', prompt: '¿Qué pequeña rutina quieres sostener? (Una hora para dormir, un paseo, un desayuno sin pantalla…)' },
      { type: 'info', title: '5. Tus necesidades de compañía son legítimas', text: 'Querer compañía no es debilidad. La meta no es no necesitar a nadie, sino que tu bienestar no dependa de una sola persona.' },
      { type: 'text', id: 'compania', prompt: '¿Qué tipo de compañía necesitas hoy y quién podría dártela?' },
    ],
    closing: 'Cada paso que das cuenta, aunque sea pequeño.',
  },
  'amor-autonomia': {
    id: 'amor-autonomia',
    title: 'Amor y autonomía',
    intro: 'Hay una diferencia entre elegir compartir la vida con alguien y sentir que no puedes vivir sin esa persona. Ambas pueden aparecer en una misma relación.',
    steps: [
      {
        type: 'multi',
        id: 'frases',
        prompt: '¿Cuáles de estas frases se parecen a lo que has sentido?',
        options: [
          'Disfruto compartir tiempo, y también disfruto mi tiempo propio.',
          'Si no me escribe, siento que algo malo va a pasar.',
          'Puedo decir lo que no me gusta sin miedo a perder la relación.',
          'Dejé de hacer cosas que me gustaban para evitar conflictos.',
          'Tengo amistades y proyectos propios.',
          'Siento que sin esa persona no sabría quién soy.',
        ],
      },
      { type: 'info', text: 'Las frases que hablan de elección suelen acompañar vínculos más libres. Las que hablan de miedo o de perderte a ti suelen señalar lugares donde vale la pena cuidarte. No es un diagnóstico: es un mapa.' },
      { type: 'text', id: 'compartir', prompt: '¿Qué te gustaría elegir compartir en una relación futura?' },
      { type: 'text', id: 'conservar', prompt: '¿Qué quieres conservar como tuyo, pase lo que pase?' },
    ],
    closing: 'Amar a alguien no debería significar abandonarte a ti mismo.',
  },
  conciencia: {
    id: 'conciencia',
    title: 'Prácticas de atención y agencia',
    intro: 'Seis prácticas breves, sin ningún componente religioso ni místico. Puedes hacer solo una.',
    steps: [
      { type: 'info', title: 'Atención plena', text: 'Durante un minuto, observa lo que hay a tu alrededor: tres sonidos, dos colores, una sensación en tu cuerpo. No tienes que cambiar nada, solo notarlo.' },
      { type: 'info', title: 'Respiración cómoda y voluntaria', text: 'Si te resulta agradable, respira un poco más lento de lo habitual, sin forzar. Si centrarte en la respiración te incomoda, apoya los pies en el suelo y nota el contacto.' },
      { type: 'text', id: 'pensamiento', prompt: 'Identificar pensamientos: ¿qué pensamiento se repite hoy?', help: 'Puedes escribirlo empezando con “Estoy teniendo el pensamiento de que…”. Ayuda a verlo como un pensamiento, no como un hecho.' },
      { type: 'multi', id: 'valores', prompt: 'Valores: ¿qué es importante para ti, más allá de esta relación?', options: ['Honestidad', 'Cuidado', 'Libertad', 'Aprender', 'Familia', 'Amistad', 'Creatividad', 'Salud', 'Justicia', 'Calma', 'Humor', 'Trabajo con sentido'] },
      { type: 'text', id: 'autocompasion', prompt: 'Autocompasión: ¿qué le dirías a alguien que quieres si estuviera pasando por lo mismo?' },
      { type: 'text', id: 'agencia', prompt: 'Agencia: ¿qué pequeña decisión depende de ti hoy?' },
    ],
    closing: 'Hoy no necesitas resolver toda tu vida. Solo encontrar un próximo paso.',
  },
};
