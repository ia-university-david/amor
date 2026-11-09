import { detectCrisis, normalizeText } from '../crisis';
import type { AssistantContext, AssistantProvider, AssistantReply, AssistantTopic, ChatMessage } from './types';

type Suggestion = { label: string; to: string };

const S = {
  pausa: { label: 'Abrir la pausa', to: '/app/pausa' },
  respirar: { label: 'Respirar dos minutos', to: '/app/pausa?herramienta=respiracion' },
  escribir: { label: 'Escribir sin enviar', to: '/app/espacio?seccion=sin-enviar' },
  diario: { label: 'Escribir en mi diario', to: '/app/espacio?seccion=diario' },
  cerebro: { label: 'Entender mi cerebro', to: '/app/cerebro' },
  rumiacion: { label: 'Sobre la rumiación', to: '/app/cerebro/rumiacion' },
  creencias: { label: 'Revisar un pensamiento', to: '/app/camino/ejercicio/creencias' },
  soledad: { label: 'Estar a solas sin sentirme abandonado', to: '/app/camino/ejercicio/soledad' },
  limites: { label: 'Mis límites', to: '/app/limites' },
  avances: { label: 'Ver mis pequeños avances', to: '/app' },
  conectar: { label: 'Conectar con alguien', to: '/app/pausa?herramienta=conectar' },
} satisfies Record<string, Suggestion>;

export const TOPIC_LABELS: Record<AssistantTopic, string> = {
  impulso: 'Tengo ganas de escribirle',
  tristeza: 'Me siento triste',
  pensamientos: 'No puedo dejar de pensar',
  entender: 'Quiero entender lo que me pasa',
  mejor: 'Hoy me siento mejor',
  culpa: 'Me siento culpable',
  soledad: 'Me siento solo o sola',
  celos: 'Siento celos',
  dormir: 'No puedo dormir',
  limites: 'Quiero poner límites',
};

const TOPIC_REPLIES: Record<AssistantTopic, { text: string; suggestions: Suggestion[] }> = {
  impulso: {
    text: 'Gracias por contármelo. Las ganas de escribirle son muy comunes y notarlas ya es un paso. Puedes sentir el impulso sin actuar inmediatamente. ¿Te gustaría hacer una pausa breve antes de decidir?',
    suggestions: [S.pausa, S.escribir],
  },
  tristeza: {
    text: 'La tristeza tiene sentido cuando algo importante termina. No necesitas apurarla. ¿Quieres contarme qué la trae hoy, o prefieres algo que te acompañe un momento?',
    suggestions: [S.respirar, S.diario],
  },
  pensamientos: {
    text: 'Cuando la mente da vueltas, pensar más no siempre trae más claridad. Una pregunta que ayuda: ¿esto que pienso me acerca a una decisión o me deja igual? Si te deja igual, cambiar de actividad unos minutos puede ayudar.',
    suggestions: [S.rumiacion, S.respirar],
  },
  entender: {
    text: 'Querer entender es una buena señal. Muchas de las cosas que sientes después de una ruptura tienen explicación: recompensa, hábitos, recuerdos asociados. ¿Por dónde te gustaría empezar?',
    suggestions: [S.cerebro],
  },
  mejor: {
    text: 'Me alegra que hoy te sientas mejor. Vale la pena notar qué ayudó, para tenerlo cerca en días más difíciles. ¿Qué crees que hizo la diferencia?',
    suggestions: [S.diario, S.avances],
  },
  culpa: {
    text: 'La culpa aparece a menudo después de una ruptura, incluso cuando no todo dependía de ti. Hiciste lo que pudiste con lo que sabías en ese momento. ¿Quieres mirar ese pensamiento con más calma?',
    suggestions: [S.creencias, S.diario],
  },
  soledad: {
    text: 'Sentirte a solas puede doler mucho. Estar a solas y sentirse abandonado no son lo mismo, aunque a veces lleguen juntos. ¿Hay alguien con quien te gustaría hablar hoy?',
    suggestions: [S.conectar, S.soledad],
  },
  celos: {
    text: 'Los celos suelen mezclar miedo, tristeza y comparación. Sentirlos no te define. Si aparecen por algo que viste en redes, alejarte un rato de la pantalla puede bajar la intensidad.',
    suggestions: [S.respirar, S.limites],
  },
  dormir: {
    text: 'Las noches pueden ser el momento más difícil. Algo breve y repetido antes de dormir —una respiración cómoda, dejar el teléfono lejos, escribir dos líneas— a veces ayuda. Si el insomnio se mantiene, vale la pena consultarlo con un profesional de la salud.',
    suggestions: [S.respirar, S.diario],
  },
  limites: {
    text: 'Poner límites es una forma de cuidarte, no de castigar a nadie. Puedes empezar por uno solo, el que sientas más posible de sostener.',
    suggestions: [S.limites],
  },
};

const KEYWORDS: [AssistantTopic, RegExp][] = [
  ['impulso', /\b(escribirle|escribir le|llamarle|llamarlo|llamarla|mensaje|whats|buscarlo|buscarla|verlo|verla|contactar)/],
  ['celos', /\b(celos|celosa|celoso|nueva pareja|esta con otra|esta con otro)/],
  ['dormir', /\b(dormir|insomnio|duermo|desvelo)/],
  ['culpa', /\b(culpa|culpable|mi error|arruine)/],
  ['soledad', /\b(me siento sol[oa]|estoy sol[oa]|soledad|nadie me)/],
  ['pensamientos', /\b(no puedo dejar de pensar|pienso todo el tiempo|vueltas|obsesion|pensando en)/],
  ['entender', /\b(entender|por que me pasa|porque me pasa|cerebro|no entiendo)/],
  ['limites', /\b(limite|limites|contacto cero)/],
  ['mejor', /\b(mejor|bien hoy|tranquila|tranquilo)\b/],
  ['tristeza', /\b(triste|tristeza|llorar|lloro|extrano|vacio)/],
];

const IDENTITY_QUESTION = /\b(eres (laura|una persona|humano|humana|real|terapeuta|psicolog)|hablo con (laura|una persona|alguien real))/;

const IDENTITY_REPLY =
  'Soy un asistente de inteligencia artificial de acompañamiento. No soy Laura Rojas, ni una persona, ni un terapeuta. Puedo ayudarte a ordenar lo que sientes y a encontrar herramientas, pero no reemplazo la ayuda profesional.';

export function classifyTopic(text: string): AssistantTopic | null {
  const t = normalizeText(text);
  for (const [topic, re] of KEYWORDS) {
    if (topic === 'mejor' && /\bno\b.{0,20}\b(mejor|bien|tranquil)/.test(t)) continue;
    if (re.test(t)) return topic;
  }
  return null;
}

/** Pure, offline reply used by the guided assistant. */
export function localReply(last: ChatMessage, ctx: AssistantContext): AssistantReply {
  const crisis = detectCrisis(last.text);
  if (crisis.detected) {
    return {
      text: 'Lo que cuentas es importante y quiero que estés a salvo. Antes de seguir, mira estos recursos.',
      crisis,
      provider: 'local',
    };
  }

  if (last.topic) {
    const r = TOPIC_REPLIES[last.topic];
    return { text: r.text, suggestions: r.suggestions, provider: 'local' };
  }

  if (!ctx.aiSensitiveConsent) {
    return {
      text: 'Gracias por escribirlo. Como no has activado el análisis de texto sensible, no voy a interpretar lo que escribes; solo lo reviso para detectar si estás en peligro. Puedes elegir un tema abajo o activar el análisis en Perfil cuando quieras.',
      provider: 'local',
    };
  }

  const normalized = normalizeText(last.text);
  if (IDENTITY_QUESTION.test(normalized)) return { text: IDENTITY_REPLY, provider: 'local' };

  const topic = classifyTopic(last.text);
  if (topic) {
    const r = TOPIC_REPLIES[topic];
    return { text: r.text, suggestions: r.suggestions, provider: 'local' };
  }

  return {
    text: 'Te leo. Lo que sientes merece ser escuchado. ¿Qué te ayudaría más ahora: entender lo que te pasa, calmarte un poco o pensar en un próximo paso?',
    suggestions: [S.respirar, S.cerebro, S.diario],
    provider: 'local',
  };
}

export const localProvider: AssistantProvider = {
  id: 'local',
  async reply(history: ChatMessage[], ctx: AssistantContext) {
    const last = [...history].reverse().find((m) => m.role === 'user');
    if (!last) {
      return {
        text: `Hola${ctx.name ? `, ${ctx.name}` : ''}. Soy un asistente de IA de acompañamiento. No soy Laura Rojas ni un terapeuta. ¿Sobre qué te gustaría hablar?`,
        provider: 'local',
      };
    }
    return localReply(last, ctx);
  },
};

export const SUGGESTIONS = S;

export function topicSuggestions(topic: AssistantTopic): Suggestion[] {
  return TOPIC_REPLIES[topic].suggestions;
}
