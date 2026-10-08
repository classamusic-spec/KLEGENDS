import type { TxContext } from './packTransactions';
import type { GameDatabase } from './database';
import { grantEditions, type GrantedItem } from './inventory';
import type { QuestId } from '@/domain/cards';
import type { RewardLedgerEntry } from '@/domain/player';
import type { PlayerQuestProgress, QuestDefinition, QuestStep } from '@/domain/quests';
import { fail, ok, type Result } from '@/domain/result';

export type QuestEvent =
  | { readonly type: 'ANSWER'; readonly stepId: string; readonly choiceId: string }
  | { readonly type: 'COLLECT'; readonly stepId: string; readonly itemId: string }
  | { readonly type: 'NEXT' }
  | { readonly type: 'BACK' };

export const startQuest = (quest: QuestDefinition, now: string): PlayerQuestProgress => ({
  questId: quest.id,
  status: 'in_progress',
  stepIndex: 0,
  answers: {},
  collected: {},
  startedAt: now,
});

export const currentStep = (quest: QuestDefinition, progress: PlayerQuestProgress): QuestStep | undefined =>
  quest.steps[progress.stepIndex];

/** Whether a single step's requirements are met. Any answer satisfies a question: learning is never gated on being right. */
export const isStepSatisfied = (step: QuestStep, progress: PlayerQuestProgress): boolean => {
  switch (step.kind) {
    case 'question':
      return progress.answers[step.id] !== undefined;
    case 'discovery':
      return (progress.collected[step.id]?.length ?? 0) >= step.required;
    default:
      return true;
  }
};

export const canAdvance = (quest: QuestDefinition, progress: PlayerQuestProgress): boolean => {
  const step = currentStep(quest, progress);
  return step !== undefined && isStepSatisfied(step, progress);
};

/**
 * Pure quest runtime. Invalid events return the same progress object, so the
 * UI can dispatch freely and compare by reference.
 */
export const questReducer = (
  quest: QuestDefinition,
  progress: PlayerQuestProgress,
  event: QuestEvent,
): PlayerQuestProgress => {
  if (progress.status === 'completed') return progress;
  const step = currentStep(quest, progress);

  switch (event.type) {
    case 'ANSWER': {
      if (step?.kind !== 'question' || step.id !== event.stepId) return progress;
      if (progress.answers[step.id]) return progress; // first answer is final; feedback shows the source
      if (!step.choices.some((c) => c.id === event.choiceId)) return progress;
      return {
        ...progress,
        answers: { ...progress.answers, [step.id]: { choiceId: event.choiceId, correct: event.choiceId === step.correctChoiceId } },
      };
    }
    case 'COLLECT': {
      if (step?.kind !== 'discovery' || step.id !== event.stepId) return progress;
      const current = progress.collected[step.id] ?? [];
      if (current.includes(event.itemId) || current.length >= step.required) return progress;
      return { ...progress, collected: { ...progress.collected, [step.id]: [...current, event.itemId] } };
    }
    case 'NEXT':
      if (!canAdvance(quest, progress)) return progress;
      return { ...progress, stepIndex: progress.stepIndex + 1 };
    case 'BACK':
      if (progress.stepIndex === 0) return progress;
      return { ...progress, stepIndex: Math.min(progress.stepIndex, quest.steps.length) - 1 };
  }
};

/** True once every step is satisfied and the player has advanced past the last one. */
export const isQuestReadyToComplete = (quest: QuestDefinition, progress: PlayerQuestProgress): boolean =>
  progress.questId === quest.id &&
  progress.stepIndex >= quest.steps.length &&
  quest.steps.every((step) => isStepSatisfied(step, progress));

export interface QuestCompletion {
  readonly xpAwarded: number;
  readonly cards: readonly GrantedItem[];
  readonly alreadyCompleted: boolean;
}

/** Persists in-progress state so a quest can be resumed. Completed quests are immutable. */
export const saveQuestProgress = (db: GameDatabase, progress: PlayerQuestProgress): GameDatabase => {
  const existing = db.questProgress[progress.questId];
  if (existing?.status === 'completed') return db;
  return { ...db, questProgress: { ...db.questProgress, [progress.questId]: { ...progress, status: 'in_progress' } } };
};

/**
 * Validates the submitted progress and grants quest rewards exactly once.
 * Repeat calls return `alreadyCompleted: true` and grant nothing.
 */
export const completeQuest = (
  db: GameDatabase,
  ctx: TxContext,
  questId: QuestId,
  progress: PlayerQuestProgress,
): Result<{ db: GameDatabase; completion: QuestCompletion }> => {
  const quest = ctx.catalog.quest(questId);
  if (!quest) return fail('QUEST_NOT_FOUND', `Unknown quest ${questId}`);
  if (db.questProgress[questId]?.status === 'completed') {
    return ok({ db, completion: { xpAwarded: 0, cards: [], alreadyCompleted: true } });
  }
  if (!isQuestReadyToComplete(quest, progress)) {
    return fail('QUEST_NOT_COMPLETE', 'The quest has unfinished steps.');
  }

  const cardRewards: { editionId: string; cardId: string }[] = [];
  let xp = 0;
  for (const reward of quest.rewards) {
    if (reward.kind === 'xp') xp += reward.amount;
    else {
      const edition = ctx.catalog.edition(reward.editionId);
      if (!edition) return fail('EDITION_NOT_FOUND', `Unknown edition ${reward.editionId}`);
      cardRewards.push({ editionId: edition.id, cardId: edition.cardId });
    }
  }

  const { inventory, granted } = grantEditions(db.inventory, cardRewards, ctx.now);
  const entry = (e: Omit<RewardLedgerEntry, 'id' | 'playerId' | 'at'>): RewardLedgerEntry => ({
    id: ctx.ids.next('ledger'),
    playerId: db.player.id,
    at: ctx.now,
    ...e,
  });
  const ledger: RewardLedgerEntry[] = [
    entry({ kind: 'quest_completed', source: 'quest', sourceId: questId, questId }),
    ...granted.map((g) => entry({ kind: 'card_granted', source: 'quest', sourceId: questId, editionId: g.editionId, questId })),
    ...(xp > 0 ? [entry({ kind: 'xp_awarded', source: 'quest', sourceId: questId, amount: xp, questId })] : []),
  ];

  return ok({
    completion: { xpAwarded: xp, cards: granted, alreadyCompleted: false },
    db: {
      ...db,
      inventory,
      player: { ...db.player, journeyXp: db.player.journeyXp + xp },
      ledger: [...db.ledger, ...ledger],
      questProgress: {
        ...db.questProgress,
        [questId]: { ...progress, status: 'completed', stepIndex: quest.steps.length, completedAt: ctx.now },
      },
    },
  });
};
