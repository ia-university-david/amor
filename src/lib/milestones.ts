export interface MilestoneInput {
  exercisesDone: number;
  pauses: number;
  checkIns: number;
  difficultMoments: number;
  rules: number;
  unsent: number;
  identityNotes: number;
}

export interface Milestone {
  id: string;
  title: string;
  detail: string;
  reached: boolean;
}

/**
 * Milestones celebrate care, not streaks. A counter reset cannot un-reach them:
 * none of these flags depend on the day count.
 */
export function milestones(input: MilestoneInput): Milestone[] {
  return [
    {
      id: 'pausa',
      title: 'Te diste una pausa',
      detail: 'Paraste antes de actuar por impulso, aunque fuera una sola vez.',
      reached: input.pauses > 0,
    },
    {
      id: 'checkin',
      title: 'Te detuviste a mirar cómo estabas',
      detail: 'Un check-in cuenta, sostuvieras el límite o el día fuera difícil.',
      reached: input.checkIns > 0,
    },
    {
      id: 'honesto',
      title: 'Contaste un momento difícil',
      detail: 'Nombrarlo no te quita lo que ya habías avanzado.',
      reached: input.difficultMoments > 0,
    },
    {
      id: 'ejercicios',
      title: 'Completaste tres ejercicios',
      detail: 'Tres veces elegiste mirarte con calma. Eso se queda.',
      reached: input.exercisesDone >= 3,
    },
    {
      id: 'regla',
      title: 'Elegiste un límite',
      detail: 'Uno solo, el que sí puedes sostener.',
      reached: input.rules > 0,
    },
    {
      id: 'carta',
      title: 'Escribiste sin enviar',
      detail: 'Pusiste en palabras lo que no tenía que salir del teléfono.',
      reached: input.unsent > 0,
    },
    {
      id: 'identidad',
      title: 'Nombraste algo que es tuyo',
      detail: 'Un gusto, un miedo o algo que habías dejado de hacer.',
      reached: input.identityNotes > 0,
    },
  ];
}

export function reachedMilestones(input: MilestoneInput): Milestone[] {
  return milestones(input).filter((m) => m.reached);
}
