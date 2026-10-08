import type { ScriptureReference } from '@/domain/scripture';

/**
 * Scripture trivia rounds (Challenges). Pure and deterministic: a round is
 * built from a question bank and a seed, answers are final once given, and
 * the score is derived from the answers — never stored separately.
 */
export interface TriviaChoice {
  readonly id: string;
  readonly text: string;
}

export interface TriviaQuestion {
  readonly id: string;
  readonly prompt: string;
  readonly choices: readonly TriviaChoice[];
  readonly correctChoiceId: string;
  readonly explanation: string;
  readonly source: ScriptureReference;
}

export interface TriviaRound {
  readonly questionIds: readonly string[];
  /** questionId → chosen choiceId. */
  readonly answers: Readonly<Record<string, string>>;
  /** Position of the current question; equals questionIds.length when finished. */
  readonly index: number;
}

export interface TriviaScore {
  readonly correct: number;
  readonly answered: number;
  readonly total: number;
}

/** Small deterministic PRNG (mulberry32) so rounds are reproducible in tests. */
const prng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Picks `size` distinct questions in a seed-determined order. */
export const createRound = (bank: readonly TriviaQuestion[], seed: number, size: number): TriviaRound => {
  const random = prng(seed);
  const ids = bank.map((q) => q.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = ids[i]!;
    ids[i] = ids[j]!;
    ids[j] = tmp;
  }
  return { questionIds: ids.slice(0, Math.max(0, Math.min(size, ids.length))), answers: {}, index: 0 };
};

export const currentQuestionId = (round: TriviaRound): string | undefined => round.questionIds[round.index];

export const isRoundComplete = (round: TriviaRound): boolean => round.index >= round.questionIds.length;

/** Records an answer to the current question. The first answer is final; invalid answers are ignored. */
export const answerQuestion = (
  round: TriviaRound,
  bank: readonly TriviaQuestion[],
  questionId: string,
  choiceId: string,
): TriviaRound => {
  if (currentQuestionId(round) !== questionId || round.answers[questionId] !== undefined) return round;
  const question = bank.find((q) => q.id === questionId);
  if (!question || !question.choices.some((c) => c.id === choiceId)) return round;
  return { ...round, answers: { ...round.answers, [questionId]: choiceId } };
};

/** Moves past the current question once it has been answered. */
export const nextQuestion = (round: TriviaRound): TriviaRound => {
  const id = currentQuestionId(round);
  if (id === undefined || round.answers[id] === undefined) return round;
  return { ...round, index: round.index + 1 };
};

export const scoreRound = (round: TriviaRound, bank: readonly TriviaQuestion[]): TriviaScore => {
  let correct = 0;
  let answered = 0;
  for (const id of round.questionIds) {
    const choice = round.answers[id];
    if (choice === undefined) continue;
    answered++;
    if (bank.find((q) => q.id === id)?.correctChoiceId === choice) correct++;
  }
  return { correct, answered, total: round.questionIds.length };
};
