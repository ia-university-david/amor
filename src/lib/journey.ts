import type { ChapterId } from '../content/chapters';
import { NECESSARY_CONTACT_IDS, type OnboardingAnswers } from '../content/onboarding';

export type ContactMode = 'dentro' | 'necesario' | 'voluntario' | 'sin-definir';

const ALL: ChapterId[] = ['dentro', 'recien', 'primeros', 'distancia', 'comprender', 'identidad', 'futuro'];

function unique(ids: ChapterId[]): ChapterId[] {
  const seen = new Set<ChapterId>();
  const out: ChapterId[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  for (const id of ALL) if (!seen.has(id)) out.push(id);
  return out;
}

function moveFront(ids: ChapterId[], id: ChapterId): ChapterId[] {
  return [id, ...ids.filter((x) => x !== id)];
}

export function hasNecessaryContact(answers: OnboardingAnswers): boolean {
  return (answers.contact ?? []).some((c) => NECESSARY_CONTACT_IDS.includes(c));
}

/**
 * How contact should be framed. Necessary contact (children, legal, work,
 * safety, living together) is never treated as a broken streak.
 */
export function contactMode(answers: OnboardingAnswers): ContactMode {
  const sit = answers.situation;
  if (sit === 'sigo-relacion' || sit === 'considerando') return 'dentro';
  if (hasNecessaryContact(answers)) return 'necesario';
  if (sit === 'reciente' || sit === 'semanas-meses' || sit === 'hace-mucho' || sit === 'separados-contacto') return 'voluntario';
  return 'sin-definir';
}

/**
 * Orders the seven chapters for this person's situation. The first item is
 * where Mi Camino says «Empieza aquí». Violence pulls the safety chapter
 * forward without hiding the chapter that matches the relationship status.
 */
export function orderedChapters(answers: OnboardingAnswers): ChapterId[] {
  const sit = answers.situation;
  const violence = (answers.circumstances ?? []).includes('violencia');
  let order: ChapterId[];

  if (sit === 'sigo-relacion' || sit === 'considerando') {
    order = ['dentro', 'comprender', 'identidad', 'futuro', 'primeros', 'distancia', 'recien'];
  } else if (sit === 'reciente') {
    order = ['recien', 'primeros', 'distancia', 'comprender', 'identidad', 'futuro', 'dentro'];
  } else if (sit === 'semanas-meses' || sit === 'separados-contacto') {
    order = ['distancia', 'comprender', 'identidad', 'futuro', 'primeros', 'recien', 'dentro'];
  } else if (sit === 'hace-mucho') {
    order = ['comprender', 'identidad', 'futuro', 'distancia', 'recien', 'primeros', 'dentro'];
  } else if (violence) {
    order = ['primeros', 'dentro', 'comprender', 'identidad', 'futuro', 'distancia', 'recien'];
  } else {
    order = ['comprender', 'dentro', 'identidad', 'futuro', 'distancia', 'primeros', 'recien'];
  }

  if (answers.need === 'identidad' || answers.need === 'autoestima' || answers.need === 'disfrutar') {
    order = moveFront(order, 'identidad');
  } else if (answers.need === 'decision' && (sit === 'sigo-relacion' || sit === 'considerando' || !sit)) {
    order = moveFront(order, 'dentro');
  } else if (answers.need === 'impulsos' && sit !== 'sigo-relacion' && sit !== 'considerando') {
    order = moveFront(order, sit === 'reciente' ? 'primeros' : 'distancia');
  }

  if (violence) {
    if (sit === 'sigo-relacion' || sit === 'considerando') {
      order = ['dentro', 'primeros', ...order.filter((id) => id !== 'dentro' && id !== 'primeros')];
    } else if (order[0] !== 'primeros') {
      order = moveFront(order, 'primeros');
    }
  }

  return unique(order);
}

export function primaryChapter(answers: OnboardingAnswers): ChapterId {
  return orderedChapters(answers)[0];
}
