export const ASSISTANT_MODES = ['impulso', 'tristeza', 'rumiacion', 'entender', 'hablar'] as const;
export type AssistantMode = (typeof ASSISTANT_MODES)[number];

export const MODE_LABELS: Record<AssistantMode, string> = {
  impulso: 'Tengo un impulso',
  tristeza: 'Estoy triste',
  rumiacion: 'No paro de pensar',
  entender: 'Quiero entender',
  hablar: 'Solo quiero hablar',
};
