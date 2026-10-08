import { answerQuestion, createRound, currentQuestionId, isRoundComplete, nextQuestion, scoreRound, type TriviaQuestion } from './trivia';
import { TRIVIA } from '@/content/trivia';
import { hasPassage } from '@/content/scripture';

const bank: TriviaQuestion[] = ['a', 'b', 'c', 'd'].map((id) => ({
  id,
  prompt: `Question ${id}`,
  choices: [
    { id: 'right', text: 'Right' },
    { id: 'wrong', text: 'Wrong' },
  ],
  correctChoiceId: 'right',
  explanation: '',
  source: { book: 'GEN', chapter: 9, verseStart: 13 },
}));

const play = (round: ReturnType<typeof createRound>, choices: string[]) =>
  choices.reduce((r, choice) => nextQuestion(answerQuestion(r, bank, currentQuestionId(r)!, choice)), round);

describe('trivia rounds', () => {
  it('builds the same round for the same seed, with distinct questions', () => {
    const a = createRound(bank, 7, 3);
    const b = createRound(bank, 7, 3);
    expect(a.questionIds).toEqual(b.questionIds);
    expect(new Set(a.questionIds).size).toBe(3);
    expect(createRound(bank, 7, 10).questionIds).toHaveLength(4);
  });

  it('scores correct answers only', () => {
    const round = play(createRound(bank, 1, 4), ['right', 'wrong', 'right', 'right']);
    expect(isRoundComplete(round)).toBe(true);
    expect(scoreRound(round, bank)).toEqual({ correct: 3, answered: 4, total: 4 });
  });

  it('treats the first answer as final', () => {
    const round = createRound(bank, 2, 2);
    const id = currentQuestionId(round)!;
    const answered = answerQuestion(round, bank, id, 'wrong');
    expect(answerQuestion(answered, bank, id, 'right')).toBe(answered);
    expect(scoreRound(answered, bank).correct).toBe(0);
  });

  it('ignores answers to other questions and unknown choices', () => {
    const round = createRound(bank, 3, 3);
    const other = round.questionIds[1]!;
    expect(answerQuestion(round, bank, other, 'right')).toBe(round);
    expect(answerQuestion(round, bank, currentQuestionId(round)!, 'nope')).toBe(round);
  });

  it('cannot advance past an unanswered question', () => {
    const round = createRound(bank, 4, 2);
    expect(nextQuestion(round)).toBe(round);
  });
});

describe('trivia content', () => {
  it('has unique ids, valid answers and a quoted source for every question', () => {
    expect(new Set(TRIVIA.map((q) => q.id)).size).toBe(TRIVIA.length);
    for (const q of TRIVIA) {
      expect(q.choices.some((c) => c.id === q.correctChoiceId)).toBe(true);
      expect(new Set(q.choices.map((c) => c.id)).size).toBe(q.choices.length);
      expect(hasPassage(q.source)).toBe(true);
    }
  });
});
