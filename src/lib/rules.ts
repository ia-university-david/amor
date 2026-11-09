export const RULE_GROUPS = [
  { id: 'comunicacion', label: 'Comunicación' },
  { id: 'redes', label: 'Redes' },
  { id: 'recuerdos', label: 'Recuerdos' },
  { id: 'encuentros', label: 'Encuentros' },
  { id: 'necesario', label: 'Cuando el contacto es necesario' },
] as const;

export type RuleGroupId = (typeof RULE_GROUPS)[number]['id'];

export interface RuleDef {
  id: string;
  group: RuleGroupId;
  text: string;
  /** Shown on the card, above the rule. Original wording. */
  lead: string;
}

export const RULE_CATALOG: RuleDef[] = [
  { id: 'escribir-impulso', group: 'comunicacion', lead: 'Antes de abrir el chat', text: 'No escribir por impulso' },
  { id: 'llamar', group: 'comunicacion', lead: 'Si aparece la urgencia de oír su voz', text: 'No llamar fuera de asuntos necesarios' },
  { id: 'redes', group: 'redes', lead: 'Cuando el pulgar va solo', text: 'No revisar sus publicaciones' },
  { id: 'investigar', group: 'redes', lead: 'La curiosidad que duele después', text: 'No investigar su nueva relación' },
  { id: 'en-linea', group: 'redes', lead: 'Esa lucecita no te debe el día', text: 'No mirar si está en línea' },
  { id: 'chats', group: 'recuerdos', lead: 'Releer no cambia lo que pasó', text: 'No releer chats repetidamente' },
  { id: 'fotos', group: 'recuerdos', lead: 'Si hoy te hacen daño', text: 'No revisar fotografías si me hacen daño' },
  { id: 'terceros', group: 'encuentros', lead: 'Pedir noticias también es contacto', text: 'No preguntar por mi expareja a terceros' },
  { id: 'encuentros', group: 'encuentros', lead: 'Un encuentro «casual» también cuenta', text: 'No buscar encuentros que puedan perjudicarme' },
  { id: 'lugares', group: 'encuentros', lead: 'Puedes volver cuando tú elijas', text: 'No volver a lugares compartidos si hoy me hacen daño' },
  {
    id: 'asuntos',
    group: 'necesario',
    lead: 'Crianza, trámites, trabajo o seguridad',
    text: 'Limitar las conversaciones a lo necesario, sin reabrir la relación',
  },
];

export function ruleById(id: string): RuleDef | undefined {
  return RULE_CATALOG.find((r) => r.id === id);
}

export function toggleRule(selected: readonly string[], id: string): string[] {
  return selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
}

export function setGroup(selected: readonly string[], group: RuleGroupId, on: boolean): string[] {
  const ids = RULE_CATALOG.filter((r) => r.group === group).map((r) => r.id);
  if (on) return [...selected, ...ids.filter((id) => !selected.includes(id))];
  return selected.filter((id) => !ids.includes(id));
}

export function groupFullySelected(selected: readonly string[], group: RuleGroupId): boolean {
  const ids = RULE_CATALOG.filter((r) => r.group === group).map((r) => r.id);
  return ids.length > 0 && ids.every((id) => selected.includes(id));
}

/** Card stack: keep the ones marked true, in catalog order. */
export function keptFromCards(decisions: readonly { id: string; keep: boolean }[]): string[] {
  const keep = new Set(decisions.filter((d) => d.keep).map((d) => d.id));
  return RULE_CATALOG.map((r) => r.id).filter((id) => keep.has(id));
}

export function rulesInGroup(group: RuleGroupId): RuleDef[] {
  return RULE_CATALOG.filter((r) => r.group === group);
}
