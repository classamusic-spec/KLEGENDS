import { FIXTURE_QUEST, fixtureCatalog } from './__fixtures__/fixtureCatalog';
import { createInitialDatabase, sequentialIds } from './database';
import {
  canAdvance,
  completeQuest,
  isQuestReadyToComplete,
  questReducer,
  saveQuestProgress,
  startQuest,
  type QuestEvent,
} from './questEngine';
import type { PlayerQuestProgress } from '@/domain/quests';

const NOW = '2026-10-08T15:00:00.000Z';
const ctx = () => ({ now: NOW, ids: sequentialIds(), catalog: fixtureCatalog, utcOffsetMinutes: 0 });

const play = (events: QuestEvent[], start = startQuest(FIXTURE_QUEST, NOW)): PlayerQuestProgress =>
  events.reduce((p, e) => questReducer(FIXTURE_QUEST, p, e), start);

const FULL_RUN: QuestEvent[] = [
  { type: 'NEXT' },
  { type: 'ANSWER', stepId: 'q1', choiceId: 'a' },
  { type: 'NEXT' },
  { type: 'COLLECT', stepId: 'stones', itemId: 's1' },
  { type: 'COLLECT', stepId: 'stones', itemId: 's2' },
  { type: 'NEXT' },
  { type: 'NEXT' },
];

describe('quest runtime', () => {
  it('requires an answer before leaving a question, but any answer is accepted', () => {
    let p = play([{ type: 'NEXT' }]);
    expect(p.stepIndex).toBe(1);
    expect(canAdvance(FIXTURE_QUEST, p)).toBe(false);
    expect(play([{ type: 'NEXT' }], p)).toBe(p);
    p = play([{ type: 'ANSWER', stepId: 'q1', choiceId: 'a' }], p);
    expect(p.answers.q1).toEqual({ choiceId: 'a', correct: false });
    expect(canAdvance(FIXTURE_QUEST, p)).toBe(true);
  });

  it('keeps the first answer final and scores correctness', () => {
    const p = play([{ type: 'NEXT' }, { type: 'ANSWER', stepId: 'q1', choiceId: 'b' }, { type: 'ANSWER', stepId: 'q1', choiceId: 'a' }]);
    expect(p.answers.q1).toEqual({ choiceId: 'b', correct: true });
  });

  it('ignores answers for other steps or unknown choices', () => {
    const p = play([{ type: 'NEXT' }]);
    expect(play([{ type: 'ANSWER', stepId: 'other', choiceId: 'a' }], p)).toBe(p);
    expect(play([{ type: 'ANSWER', stepId: 'q1', choiceId: 'zzz' }], p)).toBe(p);
  });

  it('requires the discovery items and ignores duplicates or extras', () => {
    let p = play([{ type: 'NEXT' }, { type: 'ANSWER', stepId: 'q1', choiceId: 'b' }, { type: 'NEXT' }]);
    p = play([{ type: 'COLLECT', stepId: 'stones', itemId: 's1' }, { type: 'COLLECT', stepId: 'stones', itemId: 's1' }], p);
    expect(p.collected.stones).toEqual(['s1']);
    expect(canAdvance(FIXTURE_QUEST, p)).toBe(false);
    p = play([{ type: 'COLLECT', stepId: 'stones', itemId: 's2' }, { type: 'COLLECT', stepId: 'stones', itemId: 's3' }], p);
    expect(p.collected.stones).toEqual(['s1', 's2']);
    expect(canAdvance(FIXTURE_QUEST, p)).toBe(true);
  });

  it('becomes ready to complete only after the final step', () => {
    const p = play(FULL_RUN);
    expect(p.stepIndex).toBe(4);
    expect(isQuestReadyToComplete(FIXTURE_QUEST, p)).toBe(true);
    expect(isQuestReadyToComplete(FIXTURE_QUEST, play(FULL_RUN.slice(0, -1)))).toBe(false);
  });

  it('allows stepping back without losing answers', () => {
    const p = play([{ type: 'NEXT' }, { type: 'ANSWER', stepId: 'q1', choiceId: 'b' }, { type: 'NEXT' }, { type: 'BACK' }]);
    expect(p.stepIndex).toBe(1);
    expect(p.answers.q1?.correct).toBe(true);
  });
});

describe('quest completion', () => {
  it('grants the card and XP exactly once', () => {
    const db = createInitialDatabase({ playerId: 'p1', now: NOW });
    const first = completeQuest(db, ctx(), 'fixture-quest', play(FULL_RUN));
    if (!first.ok) throw new Error(first.error.code);
    expect(first.value.completion.alreadyCompleted).toBe(false);
    expect(first.value.completion.xpAwarded).toBe(150);
    expect(first.value.db.player.journeyXp).toBe(150);
    expect(first.value.db.inventory['reward/standard']?.copies).toBe(1);
    expect(first.value.db.questProgress['fixture-quest']?.status).toBe('completed');

    const second = completeQuest(first.value.db, ctx(), 'fixture-quest', play(FULL_RUN));
    if (!second.ok) throw new Error(second.error.code);
    expect(second.value.completion.alreadyCompleted).toBe(true);
    expect(second.value.db).toBe(first.value.db);
  });

  it('rejects incomplete progress', () => {
    const db = createInitialDatabase({ playerId: 'p1', now: NOW });
    const result = completeQuest(db, ctx(), 'fixture-quest', play(FULL_RUN.slice(0, 3)));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('QUEST_NOT_COMPLETE');
  });

  it('rejects unknown quests', () => {
    const db = createInitialDatabase({ playerId: 'p1', now: NOW });
    expect(completeQuest(db, ctx(), 'missing', play(FULL_RUN)).ok).toBe(false);
  });

  it('saves in-progress state but never overwrites a completed quest', () => {
    const db = createInitialDatabase({ playerId: 'p1', now: NOW });
    const saved = saveQuestProgress(db, play([{ type: 'NEXT' }]));
    expect(saved.questProgress['fixture-quest']?.stepIndex).toBe(1);
    const done = completeQuest(saved, ctx(), 'fixture-quest', play(FULL_RUN));
    if (!done.ok) throw new Error(done.error.code);
    expect(saveQuestProgress(done.value.db, play([]))).toBe(done.value.db);
  });
});
