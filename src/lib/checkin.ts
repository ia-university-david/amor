import { resetCounter, type NoContactCounter } from './noContact';
import type { ModuleProgress } from './progress';

/** A difficult moment is not a moral failure. Necessary contact is care. */
export type MomentKind = 'sostuve' | 'dificil' | 'necesario';

export const MOMENT_OPTIONS: { id: MomentKind; label: string; hint: string }[] = [
  {
    id: 'sostuve',
    label: 'Sostuve lo que elegí',
    hint: 'Sentí el impulso y, por ahora, no actué sobre él.',
  },
  {
    id: 'dificil',
    label: 'Fue un momento difícil',
    hint: 'Escribí, llamé, revisé o hice algo que ahora me pesa. Contarlo no borra lo aprendido.',
  },
  {
    id: 'necesario',
    label: 'Fue un contacto necesario',
    hint: 'Hijos, un trámite, el trabajo o tu seguridad. Eso no es un retroceso.',
  },
];

export const CHECKIN_EMOTIONS = [
  { id: 'tristeza', label: 'Tristeza' },
  { id: 'nostalgia', label: 'Nostalgia' },
  { id: 'ansiedad', label: 'Ansiedad' },
  { id: 'rabia', label: 'Rabia' },
  { id: 'calma', label: 'Calma' },
  { id: 'alivio', label: 'Alivio' },
  { id: 'culpa', label: 'Culpa' },
  { id: 'confusion', label: 'Confusión' },
  { id: 'esperanza', label: 'Esperanza' },
  { id: 'otra', label: 'Otra' },
] as const;

export type CheckInEmotion = (typeof CHECKIN_EMOTIONS)[number]['id'];

export interface CheckInDraft {
  kind: MomentKind | null;
  intensity: number;
  emotion: CheckInEmotion | null;
  note: string;
  dictated: boolean;
  confirmReset: boolean;
}

export const EMPTY_CHECKIN: CheckInDraft = {
  kind: null,
  intensity: 5,
  emotion: null,
  note: '',
  dictated: false,
  confirmReset: false,
};

export function intensityWord(n: number): string {
  const v = Math.max(0, Math.min(10, Math.round(n)));
  if (v <= 2) return 'Suave';
  if (v <= 4) return 'Presente';
  if (v <= 7) return 'Fuerte';
  return 'Muy fuerte';
}

export function canSaveCheckIn(draft: CheckInDraft): boolean {
  return draft.kind !== null && draft.emotion !== null && draft.intensity >= 0 && draft.intensity <= 10;
}

export interface CloseCopy {
  title: string;
  body: string;
}

/** Closing line after a check-in. Never calls the moment a relapse. */
export function compassionateClose(draft: Pick<CheckInDraft, 'kind' | 'emotion' | 'intensity'>): CloseCopy {
  if (draft.kind === 'necesario') {
    return {
      title: 'Eso no es un retroceso.',
      body: 'Hablar por tus hijos, por un trámite o porque tu seguridad lo pide es una forma de cuidarte. Si usas el contador, se queda como está. Lo que ya recorriste en Mi Camino también.',
    };
  }
  if (draft.kind === 'sostuve') {
    return {
      title: 'Estás aquí.',
      body:
        draft.intensity >= 7
          ? 'El impulso fue fuerte y aun así te detuviste a mirarlo. No tienes que hacerlo perfecto para que cuente.'
          : 'Notar el impulso y elegir otra cosa, aunque sea por hoy, es un cuidado concreto. Puedes seguir sin exigirte una racha.',
    };
  }
  if (draft.kind === 'dificil' && draft.emotion === 'culpa') {
    return {
      title: 'La culpa puede sentarse. No tiene que mandar.',
      body: 'Un momento difícil no borra lo que ya aprendiste. Lo que otra persona hizo no es tu culpa. Lo que sí puedes elegir es cómo te cuidas a partir de este momento.',
    };
  }
  return {
    title: 'Está bien.',
    body: 'Un momento difícil no es una línea que te devuelve al principio. Puedes contarlo, respirar y seguir. El contador, si lo usas, solo se reinicia cuando tú lo confirmas.',
  };
}

export interface SettleResult {
  progress: ModuleProgress;
  counter: NoContactCounter;
  resetApplied: boolean;
}

/**
 * Applies a check-in to the counter. Completed exercises stay untouched:
 * the same progress map is returned, whether or not the counter restarts.
 * Necessary contact never restarts it, even if someone confirms by mistake.
 */
export function settleMoment(input: {
  progress: ModuleProgress;
  counter: NoContactCounter;
  kind: MomentKind;
  confirmReset: boolean;
  now?: Date;
  note?: string;
}): SettleResult {
  const resetApplied = input.kind === 'dificil' && input.confirmReset && input.counter.enabled;
  if (!resetApplied) {
    return { progress: input.progress, counter: input.counter, resetApplied: false };
  }
  return {
    progress: input.progress,
    counter: resetCounter(input.counter, { confirmed: true, now: input.now, note: input.note }),
    resetApplied: true,
  };
}
