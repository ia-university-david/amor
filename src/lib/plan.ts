import {
  NECESSARY_CONTACT_IDS,
  NEED_OPTIONS,
  labelOf,
  type OnboardingAnswers,
} from '../content/onboarding';
import type { PillarId } from '../content/program';
import type { ToolId } from '../content/tools';

export interface PlanActivity {
  title: string;
  description: string;
  minutes: number;
  to: string;
}

export interface InitialPlan {
  situationSummary: string;
  immediateNeed: string;
  firstGoal: string;
  tools: [ToolId, ToolId];
  firstActivity: PlanActivity;
  assistantNote: string;
  focusPillars: PillarId[];
  /** True when the person mentioned violence or threats: show safety resources. */
  showSafety: boolean;
  /** True when contact cannot simply stop (children, work, legal...). */
  necessaryContact: boolean;
}

const DEFAULT_GOAL =
  'Tu primer objetivo no es olvidarlo todo. Es sentir que puedes atravesar los momentos difíciles con más herramientas.';

function summarizeSituation(a: OnboardingAnswers, necessaryContact: boolean): string {
  const base: Record<string, string> = {
    reciente: 'Terminaste una relación hace poco y es normal que todo se sienta todavía muy cerca.',
    'semanas-meses': 'Han pasado semanas o meses desde la ruptura y hay cosas que todavía pesan.',
    'hace-mucho': 'La relación terminó hace tiempo, pero sigue afectándote. Eso no significa que estés haciendo algo mal.',
    'sigo-relacion': 'Sigues en una relación que te está haciendo daño y estás buscando claridad.',
    'separados-contacto': 'Están separados, pero el contacto continúa, y eso hace que cerrar etapas sea más complejo.',
    considerando: 'Estás considerando una separación y quieres pensar con calma antes de decidir.',
    diferente: 'Tu situación es particular, y este espacio se adapta a ella.',
  };
  let text = base[a.situation ?? ''] ?? 'Llegaste hasta aquí buscando un espacio para ti.';
  if (necessaryContact) {
    text += ' Además, necesitas mantener cierto contacto, así que trabajaremos con límites realistas, no con prohibiciones.';
  }
  return text;
}

function chooseGoal(a: OnboardingAnswers): string {
  const need = a.need;
  const diff = a.difficulty;
  if (a.situation === 'sigo-relacion' || a.situation === 'considerando' || need === 'decision') {
    return 'Tu primer objetivo no es decidir hoy. Es ver con más claridad lo que vives y lo que necesitas, a tu ritmo.';
  }
  if (need === 'impulsos' || diff === 'no-escribirle' || diff === 'no-redes' || diff === 'reconciliacion') {
    return DEFAULT_GOAL;
  }
  if (need === 'tranquilidad' || diff === 'dormir' || diff === 'concentrarme') {
    return 'Tu primer objetivo es encontrar pequeños momentos de calma en el día, aunque lo demás siga en movimiento.';
  }
  if (need === 'comprender' || diff === 'aceptar') {
    return 'Tu primer objetivo es entender mejor lo que te pasa, para que deje de sentirse tan confuso.';
  }
  if (need === 'limites' || diff === 'hijos') {
    return 'Tu primer objetivo es definir uno o dos límites que puedas sostener, sin exigirte perfección.';
  }
  if (need === 'identidad' || need === 'autoestima' || need === 'disfrutar' || diff === 'autoestima' || diff === 'culparme') {
    return 'Tu primer objetivo es reencontrarte con partes de ti que quedaron en pausa.';
  }
  return DEFAULT_GOAL;
}

function rankTools(a: OnboardingAnswers, necessaryContact: boolean): ToolId[] {
  const ranked: ToolId[] = [];
  const add = (...ids: ToolId[]) => ranked.push(...ids);
  const diff = a.difficulty;
  const need = a.need;

  if (diff === 'no-escribirle' || diff === 'no-redes' || diff === 'reconciliacion') add('pausa', 'limites');
  if (diff === 'hijos') add('limites', 'motivos');
  if (need === 'impulsos') add('pausa', 'respiracion');
  if (need === 'tranquilidad' || diff === 'dormir' || diff === 'concentrarme') add('respiracion', 'diario');
  if (need === 'comprender' || diff === 'dejar-recordar' || diff === 'aceptar') add('cerebro', 'escribir-sin-enviar');
  if (need === 'autoestima' || diff === 'autoestima' || diff === 'culparme') add('creencias', 'diario');
  if (diff === 'solo') add('soledad', 'diario');
  if (need === 'identidad' || need === 'disfrutar' || diff === 'rutinas') add('apego', 'soledad');
  if (need === 'limites' || necessaryContact) add('limites', 'motivos');
  if (need === 'decision') add('diario', 'cerebro');
  if (diff === 'celos') add('respiracion', 'creencias');
  add('pausa', 'respiracion', 'diario');

  return ranked.filter((id, i) => ranked.indexOf(id) === i);
}

const ACTIVITIES: Record<ToolId, PlanActivity> = {
  pausa: {
    title: 'Prepara tu próxima pausa',
    description: 'Recorre la pausa una vez, sin urgencia, para que la conozcas antes de necesitarla.',
    minutes: 3,
    to: '/app/pausa',
  },
  respiracion: {
    title: 'Dos minutos para ti',
    description: 'Una pausa guiada con respiración cómoda o, si lo prefieres, con los cinco sentidos.',
    minutes: 2,
    to: '/app/pausa?herramienta=respiracion',
  },
  'escribir-sin-enviar': {
    title: 'Escribe sin enviar',
    description: 'Tres o cuatro líneas de lo que te gustaría decir. Se queda aquí, cifrado.',
    minutes: 4,
    to: '/app/espacio?seccion=sin-enviar',
  },
  motivos: {
    title: 'Escribe un motivo para ti',
    description: 'Una frase que quieras leer cuando el impulso sea fuerte.',
    minutes: 2,
    to: '/app/espacio?seccion=recordatorios',
  },
  limites: {
    title: 'Elige un límite para esta semana',
    description: 'Solo uno, el que sientas más posible de sostener.',
    minutes: 4,
    to: '/app/limites',
  },
  cerebro: {
    title: 'Un minuto para comprender tu cerebro',
    description: 'Por qué deseamos contactar aunque sepamos que puede hacernos daño.',
    minutes: 4,
    to: '/app/cerebro/deseo-de-contactar',
  },
  diario: {
    title: 'Tres líneas sobre hoy',
    description: 'Cómo llegas hoy, sin tener que explicarlo todo.',
    minutes: 3,
    to: '/app/espacio?seccion=diario',
  },
  creencias: {
    title: 'Mira un pensamiento de cerca',
    description: 'Elige un pensamiento que pesa y empieza solo por nombrarlo.',
    minutes: 4,
    to: '/app/camino/ejercicio/creencias',
  },
  soledad: {
    title: 'Planea un momento solo para ti',
    description: 'Algo pequeño que quieras hacer esta semana sin compañía.',
    minutes: 3,
    to: '/app/camino/ejercicio/soledad',
  },
  apego: {
    title: 'Una pregunta: ¿qué temo perder realmente?',
    description: 'Una sola respuesta, sin necesidad de resolverlo todo.',
    minutes: 3,
    to: '/app/camino/ejercicio/apego',
  },
  'hoy-dificil': {
    title: 'Cuenta lo que pasó',
    description: 'Sin juicios, para entender qué buscabas en ese momento.',
    minutes: 4,
    to: '/app/dificil',
  },
  conectar: {
    title: 'Elige a una persona de confianza',
    description: 'Guarda su contacto para tenerlo cerca en momentos difíciles.',
    minutes: 2,
    to: '/app/perfil#contactos',
  },
};

function focusPillars(a: OnboardingAnswers): PillarId[] {
  const order: PillarId[] = [];
  const need = a.need;
  if (need === 'impulsos') order.push(3, 2);
  if (need === 'comprender' || need === 'tranquilidad') order.push(1, 2);
  if (need === 'limites') order.push(4, 3);
  if (need === 'identidad' || need === 'autoestima' || need === 'disfrutar') order.push(4, 5);
  if (need === 'decision' || a.situation === 'sigo-relacion' || a.situation === 'considerando') order.push(1, 4);
  order.push(1, 2, 3, 4, 5);
  return order.filter((p, i) => order.indexOf(p) === i);
}

export function generatePlan(answers: OnboardingAnswers): InitialPlan {
  const necessaryContact = (answers.contact ?? []).some((c) => NECESSARY_CONTACT_IDS.includes(c));
  const showSafety = (answers.circumstances ?? []).includes('violencia');
  const ranked = rankTools(answers, necessaryContact);
  const tools: [ToolId, ToolId] = [ranked[0], ranked[1]];
  const needLabel = labelOf(NEED_OPTIONS, answers.need);

  return {
    situationSummary: summarizeSituation(answers, necessaryContact),
    immediateNeed: needLabel
      ? `Lo que más necesitas ahora: ${needLabel.charAt(0).toLowerCase()}${needLabel.slice(1)}.`
      : 'Lo que más necesitas ahora lo iremos descubriendo juntos, sin prisa.',
    firstGoal: chooseGoal(answers),
    tools,
    firstActivity: ACTIVITIES[tools[0]],
    assistantNote:
      'Si quieres hablar, el asistente está disponible. Es una inteligencia artificial de acompañamiento, no una persona ni un terapeuta.',
    focusPillars: focusPillars(answers),
    showSafety,
    necessaryContact,
  };
}
