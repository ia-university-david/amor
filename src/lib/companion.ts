import type { ContactMode } from './journey';
import type { SituationId } from '../content/onboarding';

export type DayPart = 'madrugada' | 'manana' | 'tarde' | 'noche';

export function dayPart(date: Date): DayPart {
  const h = date.getHours();
  if (h < 5) return 'madrugada';
  if (h < 12) return 'manana';
  if (h < 19) return 'tarde';
  return 'noche';
}

export interface CompanionInput {
  name?: string;
  now?: Date;
  situation?: SituationId;
  contactMode?: ContactMode;
  /** True when several of the person's own records cluster at night. */
  nightPattern?: boolean;
}

export interface CompanionLine {
  title: string;
  body: string;
  suggestion: { label: string; to: string };
}

/**
 * A greeting that knows the hour and the person's situation.
 * It accompanies; it does not diagnose or set a deadline.
 */
export function companionLine(input: CompanionInput): CompanionLine {
  const now = input.now ?? new Date();
  const part = dayPart(now);
  const who = input.name?.trim() ? input.name.trim() : '';
  const hello = who ? `${who}, ` : '';

  if (input.nightPattern && (part === 'noche' || part === 'madrugada')) {
    return {
      title: `${hello}la noche se te hace larga a menudo`.replace(/^./, (c) => c.toUpperCase()),
      body: 'En varios de tus registros el impulso llega de noche. No tienes que resolverlo ahora. Puedes dejar el teléfono un poco lejos y escribir aquí lo que dirías.',
      suggestion: { label: 'Escribir sin enviar', to: '/app/espacio?seccion=sin-enviar' },
    };
  }

  if (input.contactMode === 'necesario') {
    return {
      title: part === 'manana' ? 'Hoy puedes hablar de lo necesario y cerrar después' : 'El contacto necesario también se puede acotar',
      body: 'Si hoy toca escribir por tus hijos, un trámite o el trabajo, puedes preparar dos frases y parar ahí. Eso no reinicia nada de lo que ya aprendiste.',
      suggestion: { label: 'Preparar la conversación', to: '/app/camino/ejercicio/preparar' },
    };
  }

  if (input.situation === 'sigo-relacion' || input.situation === 'considerando' || input.contactMode === 'dentro') {
    const byPart: Record<DayPart, string> = {
      madrugada: 'Si estás despierto a esta hora, no tienes que decidir nada. Solo notar cómo está tu cuerpo.',
      manana: 'Hoy no hace falta saber si te quedas o te vas. Sí puedes anotar un hecho, uno solo.',
      tarde: 'Si la tarde se pone tensa, puedes pausar la conversación. Resolver en caliente casi nunca ayuda.',
      noche: 'De noche las discusiones pesan más. Puedes dejar para mañana lo que quieras decir.',
    };
    return {
      title: who ? `${who}, no tienes que decidir hoy` : 'No tienes que decidir hoy',
      body: byPart[part],
      suggestion: { label: 'Escucharme un momento', to: '/app/camino/ejercicio/escuchar-me' },
    };
  }

  if (part === 'madrugada') {
    return {
      title: who ? `${who}, es muy tarde` : 'Es muy tarde',
      body: 'A esta hora el impulso suele hablar más fuerte que el día. Puedes contarlo aquí y dejar el mensaje sin enviar.',
      suggestion: { label: 'Un check-in breve', to: '/app/checkin' },
    };
  }
  if (part === 'noche') {
    return {
      title: who ? `${who}, ¿cómo llegas a esta noche?` : '¿Cómo llegas a esta noche?',
      body: 'No hace falta que estés bien. Si vuelven las ganas de escribir, puedes nombrarlas antes de actuar.',
      suggestion: { label: 'Necesito una pausa', to: '/app/pausa' },
    };
  }
  if (part === 'manana') {
    return {
      title: who ? `Buenos días, ${who}` : 'Buenos días',
      body: 'Un minuto para notar cómo amaneciste ya es suficiente. El resto del día puede ir por partes.',
      suggestion: { label: 'Anotar cómo estoy', to: '/app/checkin' },
    };
  }
  return {
    title: who ? `${who}, ¿qué necesitas esta tarde?` : '¿Qué necesitas esta tarde?',
    body: 'Puedes elegir una sola cosa: una pausa, una página de tu camino o no hacer nada todavía.',
    suggestion: { label: 'Ver mi camino', to: '/app/camino' },
  };
}
