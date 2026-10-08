import type { EditionId, QuestId } from './cards';
import type { EditorialMeta, NarrativeKind } from './content';
import type { ScriptureReference } from './scripture';

export type CampaignId = string;
export type StepId = string;

export interface CampaignDefinition {
  readonly id: CampaignId;
  readonly title: string;
  readonly subtitle: string;
  readonly summary: string;
  readonly questIds: readonly QuestId[];
  /** Campaigns that are designed but not yet playable are shown honestly as such. */
  readonly availability: 'available' | 'in_development';
  /** Normalized position on the Ancient Atlas (0–1). */
  readonly atlasPosition: { readonly x: number; readonly y: number };
  readonly region: string;
}

export interface NarrativeStep {
  readonly kind: 'narrative';
  readonly id: StepId;
  readonly title: string;
  readonly body: string;
  /** Dramatization is labeled in the UI so it is never mistaken for Scripture. */
  readonly narrativeKind: NarrativeKind;
  readonly sceneKey: string;
}

export interface ScriptureStep {
  readonly kind: 'scripture';
  readonly id: StepId;
  readonly title: string;
  readonly passage: ScriptureReference;
  readonly lead?: string;
}

export interface DiscoveryStep {
  readonly kind: 'discovery';
  readonly id: StepId;
  readonly title: string;
  readonly prompt: string;
  readonly itemLabel: string;
  readonly required: number;
  readonly available: number;
  readonly source: ScriptureReference;
}

export interface QuestionChoice {
  readonly id: string;
  readonly text: string;
}

export interface QuestionStep {
  readonly kind: 'question';
  readonly id: StepId;
  readonly prompt: string;
  readonly choices: readonly QuestionChoice[];
  readonly correctChoiceId: string;
  readonly explanation: string;
  readonly source: ScriptureReference;
}

export interface ReflectionStep {
  readonly kind: 'reflection';
  readonly id: StepId;
  readonly title: string;
  readonly prompt: string;
}

export type QuestStep = NarrativeStep | ScriptureStep | DiscoveryStep | QuestionStep | ReflectionStep;

export type QuestReward =
  | { readonly kind: 'card'; readonly editionId: EditionId }
  | { readonly kind: 'xp'; readonly amount: number };

export interface QuestDefinition {
  readonly id: QuestId;
  readonly campaignId: CampaignId;
  readonly chapterLabel: string;
  readonly title: string;
  readonly subtitle: string;
  readonly passage: ScriptureReference;
  readonly estimatedMinutes: number;
  readonly steps: readonly QuestStep[];
  readonly rewards: readonly QuestReward[];
  readonly editorial: EditorialMeta;
}

export interface QuestAnswer {
  readonly choiceId: string;
  readonly correct: boolean;
}

/** Persisted player progress through a quest. */
export interface PlayerQuestProgress {
  readonly questId: QuestId;
  readonly status: 'in_progress' | 'completed';
  readonly stepIndex: number;
  readonly answers: Readonly<Record<StepId, QuestAnswer>>;
  readonly collected: Readonly<Record<StepId, readonly string[]>>;
  readonly startedAt: string;
  readonly completedAt?: string;
}
