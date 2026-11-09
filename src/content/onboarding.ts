export interface Option<T extends string = string> {
  id: T;
  label: string;
}

export const IDENTITY_OPTIONS = [
  { id: 'hombre', label: 'Hombre' },
  { id: 'mujer', label: 'Mujer' },
  { id: 'no-binario', label: 'No binario' },
  { id: 'otra', label: 'Otra identidad' },
  { id: 'prefiero-no', label: 'Prefiero no responder' },
] as const satisfies readonly Option[];

export const SITUATION_OPTIONS = [
  { id: 'reciente', label: 'Acabo de terminar una relación' },
  { id: 'semanas-meses', label: 'Terminamos hace semanas o meses' },
  { id: 'hace-mucho', label: 'Terminamos hace mucho y todavía me afecta' },
  { id: 'sigo-relacion', label: 'Sigo en una relación que me hace daño' },
  { id: 'separados-contacto', label: 'Estamos separados, pero seguimos en contacto' },
  { id: 'considerando', label: 'Estoy considerando una separación' },
  { id: 'diferente', label: 'Tengo una situación diferente' },
] as const satisfies readonly Option[];

export const DURATION_OPTIONS = [
  { id: 'meses', label: 'Meses' },
  { id: 'anios', label: 'Años' },
  { id: 'fecha', label: 'Sé la fecha aproximada de inicio' },
  { id: 'prefiero-no', label: 'Prefiero no decirlo' },
] as const satisfies readonly Option[];

export const BREAKUP_DATE_OPTIONS = [
  { id: 'exacta', label: 'Sé la fecha exacta' },
  { id: 'aproximada', label: 'Sé la fecha aproximada' },
  { id: 'desconocida', label: 'No la sé o prefiero no ponerla' },
] as const satisfies readonly Option[];

export const CIRCUMSTANCE_OPTIONS = [
  { id: 'infidelidad', label: 'Infidelidad' },
  { id: 'mentiras', label: 'Mentiras' },
  { id: 'comunicacion', label: 'Falta de comunicación' },
  { id: 'distanciamiento', label: 'Distanciamiento emocional' },
  { id: 'conflictos', label: 'Conflictos constantes' },
  { id: 'control', label: 'Conductas de control' },
  { id: 'manipulacion', label: 'Manipulación' },
  { id: 'irrespeto', label: 'Falta de respeto' },
  { id: 'violencia', label: 'Violencia o amenazas' },
  { id: 'proyectos', label: 'Diferencias de proyectos' },
  { id: 'dejo-de-querer', label: 'Uno de los dos dejó de querer continuar' },
  { id: 'mutuo', label: 'Mutuo acuerdo' },
  { id: 'no-claro', label: 'Todavía no tengo claro qué pasó' },
  { id: 'otro', label: 'Otro' },
] as const satisfies readonly Option[];

export const CONTACT_OPTIONS = [
  { id: 'no', label: 'No' },
  { id: 'a-veces', label: 'A veces' },
  { id: 'diario', label: 'Todos los días' },
  { id: 'vivimos-juntos', label: 'Vivimos juntos' },
  { id: 'hijos', label: 'Tenemos hijos' },
  { id: 'trabajo', label: 'Trabajamos juntos' },
  { id: 'legal-economico', label: 'Asuntos legales o económicos' },
  { id: 'otros-motivos', label: 'Necesito mantener contacto por otros motivos' },
] as const satisfies readonly Option[];

export const EMOTION_OPTIONS = [
  { id: 'ansiedad', label: 'Ansiedad' },
  { id: 'tristeza', label: 'Tristeza' },
  { id: 'rabia', label: 'Rabia' },
  { id: 'culpa', label: 'Culpa' },
  { id: 'verguenza', label: 'Vergüenza' },
  { id: 'nostalgia', label: 'Nostalgia' },
  { id: 'miedo', label: 'Miedo' },
  { id: 'confusion', label: 'Confusión' },
  { id: 'alivio', label: 'Alivio' },
  { id: 'esperanza', label: 'Esperanza' },
  { id: 'soledad', label: 'Soledad' },
  { id: 'celos', label: 'Celos' },
  { id: 'vacio', label: 'Vacío emocional' },
  { id: 'no-se', label: 'No sé identificarlo' },
] as const satisfies readonly Option[];

export const DIFFICULTY_OPTIONS = [
  { id: 'no-escribirle', label: 'No escribirle' },
  { id: 'no-redes', label: 'No revisar sus redes' },
  { id: 'dormir', label: 'Dormir' },
  { id: 'dejar-recordar', label: 'Dejar de recordar' },
  { id: 'aceptar', label: 'Aceptar lo ocurrido' },
  { id: 'autoestima', label: 'Recuperar mi autoestima' },
  { id: 'culparme', label: 'Dejar de culparme' },
  { id: 'celos', label: 'Manejar los celos' },
  { id: 'solo', label: 'Sentirme bien estando solo' },
  { id: 'concentrarme', label: 'Concentrarme' },
  { id: 'rutinas', label: 'Recuperar mis rutinas' },
  { id: 'hijos', label: 'Tener contacto por los hijos' },
  { id: 'reconciliacion', label: 'Dejar de imaginar una reconciliación' },
  { id: 'otra', label: 'Otra' },
] as const satisfies readonly Option[];

export const NEED_OPTIONS = [
  { id: 'tranquilidad', label: 'Tener tranquilidad' },
  { id: 'impulsos', label: 'Manejar mis impulsos' },
  { id: 'comprender', label: 'Comprender lo que me pasa' },
  { id: 'limites', label: 'Aprender a poner límites' },
  { id: 'identidad', label: 'Recuperar mi identidad' },
  { id: 'autoestima', label: 'Mejorar mi autoestima' },
  { id: 'decision', label: 'Tomar una decisión informada' },
  { id: 'disfrutar', label: 'Volver a disfrutar mi vida' },
] as const satisfies readonly Option[];

export type IdentityId = (typeof IDENTITY_OPTIONS)[number]['id'];
export type SituationId = (typeof SITUATION_OPTIONS)[number]['id'];
export type DurationMode = (typeof DURATION_OPTIONS)[number]['id'];
export type BreakupDateMode = (typeof BREAKUP_DATE_OPTIONS)[number]['id'];
export type CircumstanceId = (typeof CIRCUMSTANCE_OPTIONS)[number]['id'];
export type ContactId = (typeof CONTACT_OPTIONS)[number]['id'];
export type EmotionId = (typeof EMOTION_OPTIONS)[number]['id'];
export type DifficultyId = (typeof DIFFICULTY_OPTIONS)[number]['id'];
export type NeedId = (typeof NEED_OPTIONS)[number]['id'];

export interface OnboardingAnswers {
  identity?: IdentityId;
  situation?: SituationId;
  duration?: { mode: DurationMode; value?: string };
  breakup?: { mode: BreakupDateMode; date?: string };
  circumstances?: CircumstanceId[];
  circumstancesNote?: string;
  contact?: ContactId[];
  emotions?: EmotionId[];
  difficulty?: DifficultyId;
  need?: NeedId;
}

export const NECESSARY_CONTACT_IDS: readonly ContactId[] = [
  'vivimos-juntos', 'hijos', 'trabajo', 'legal-economico', 'otros-motivos',
];

export function labelOf<T extends string>(options: readonly Option<T>[], id: T | undefined): string | undefined {
  return options.find((o) => o.id === id)?.label;
}
