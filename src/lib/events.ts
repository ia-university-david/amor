import type {
  AfterFeelingId,
  DifficultTypeId,
  NowNeedId,
  StrategyId,
  TriggerId,
  UrgeActionId,
  UrgeNeedId,
} from '../content/pause';
import type { EmotionId } from '../content/onboarding';

export interface PauseEvent {
  kind: 'pausa';
  id: string;
  at: string;
  action?: UrgeActionId;
  need?: UrgeNeedId;
  initialIntensity: number;
  finalIntensity?: number;
  strategy?: StrategyId;
  trigger?: TriggerId;
  contactHappened?: boolean;
  learning?: string;
}

export interface DifficultEvent {
  kind: 'dificil';
  id: string;
  at: string;
  type: DifficultTypeId;
  seeking?: string;
  intensity?: number;
  emotion?: EmotionId;
  trigger?: TriggerId;
  after?: AfterFeelingId;
  needNow?: NowNeedId;
  reflection?: string;
  nextStrategy?: string;
  counterReset: boolean;
}

export type UrgeEvent = PauseEvent | DifficultEvent;
