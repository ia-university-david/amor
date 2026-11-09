import type { CrisisResult } from '../crisis';
import type { AssistantMode } from './modes';

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
  | 'limites'
  | 'decidir'
  | 'dudar';

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
  mode?: AssistantMode;
  /** Summary the person chose to keep (memory consent), stored encrypted on the device. */
  memorySummary?: string;
}

export interface AssistantReply {
  text: string;
  suggestions?: { label: string; to: string }[];
  crisis?: CrisisResult;
  provider: 'local' | 'remote' | 'safety';
  /** Short explanation shown when the remote assistant was not available. */
  notice?: string;
}

export interface ReplyOptions {
  onDelta?: (textSoFar: string) => void;
  signal?: AbortSignal;
}

export interface AssistantProvider {
  readonly id: 'local' | 'remote';
  reply(history: ChatMessage[], ctx: AssistantContext, opts?: ReplyOptions): Promise<AssistantReply>;
}
