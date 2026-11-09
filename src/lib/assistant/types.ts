import type { CrisisResult } from '../crisis';

export type AssistantTopic =
  | 'impulso'
  | 'tristeza'
  | 'pensamientos'
  | 'entender'
  | 'mejor'
  | 'culpa'
  | 'soledad'
  | 'celos'
  | 'dormir'
  | 'limites';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  at: string;
  topic?: AssistantTopic;
  suggestions?: { label: string; to: string }[];
}

export interface AssistantContext {
  /** Consent to analyze sensitive free text (locally or remotely). */
  aiSensitiveConsent: boolean;
  /** Consent to keep conversation history between sessions. */
  memoryConsent: boolean;
  name?: string;
}

export interface AssistantReply {
  text: string;
  suggestions?: { label: string; to: string }[];
  crisis?: CrisisResult;
  provider: 'local' | 'remote';
}

export interface AssistantProvider {
  readonly id: 'local' | 'remote';
  reply(history: ChatMessage[], ctx: AssistantContext): Promise<AssistantReply>;
}
