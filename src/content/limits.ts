export const CONTACT_MODALITIES = [
  { id: 'cero', label: 'Contacto cero voluntario', description: 'Elijo no tener contacto durante un tiempo para cuidarme.' },
  { id: 'minimo', label: 'Contacto mínimo', description: 'Mantengo el contacto imprescindible, breve y sin temas de la relación.' },
  { id: 'necesarios', label: 'Solo asuntos necesarios', description: 'Hablamos solo de crianza, asuntos legales, económicos o de trabajo.' },
  { id: 'redes', label: 'Límites con redes', description: 'Mi foco está en dejar de revisar sus publicaciones y perfiles.' },
  { id: 'proteccion', label: 'Plan de protección ante una relación dañina', description: 'Priorizo mi seguridad y la de las personas a mi cargo.' },
  { id: 'no-listo', label: 'No estoy listo', description: 'Todavía no quiero definir un límite. Está bien; puedo volver cuando quiera.' },
] as const;

export type ContactModalityId = (typeof CONTACT_MODALITIES)[number]['id'];

export const RULE_PRESETS = [
  'No escribir por impulso',
  'No llamar fuera de asuntos necesarios',
  'No revisar sus publicaciones',
  'No investigar su nueva relación',
  'No releer chats repetidamente',
  'No preguntar por mi expareja a terceros',
  'No buscar encuentros que puedan perjudicarme',
  'No revisar fotografías si me hacen daño',
  'Limitar las conversaciones a crianza, asuntos legales o económicos',
];

export interface LimitRule {
  id: string;
  text: string;
  why?: string;
  active: boolean;
  createdAt: string;
}

export interface LimitsState {
  modality: ContactModalityId | null;
  rules: LimitRule[];
}
