import type { TriviaQuestion } from '@/engine/trivia';

/**
 * Scripture trivia bank (Challenges). Every question is answered by a verse
 * quoted in the app (BSB), shown after answering. DRAFT: awaiting editorial
 * review.
 */
export const TRIVIA: readonly TriviaQuestion[] = [
  {
    id: 'covenant-sign',
    prompt: 'What did God set in the clouds as a sign of His covenant with the earth?',
    choices: [
      { id: 'rainbow', text: 'A rainbow' },
      { id: 'star', text: 'A bright star' },
      { id: 'cloud', text: 'A pillar of cloud' },
    ],
    correctChoiceId: 'rainbow',
    explanation: 'God said, “I have set My rainbow in the clouds.”',
    source: { book: 'GEN', chapter: 9, verseStart: 13 },
  },
  {
    id: 'sea-divided',
    prompt: 'When Moses stretched out his hand over the sea, what happened to the waters?',
    choices: [
      { id: 'divided', text: 'They were divided' },
      { id: 'calm', text: 'They became perfectly still' },
      { id: 'rose', text: 'They rose and flooded the camp' },
    ],
    correctChoiceId: 'divided',
    explanation: 'The LORD drove back the sea with a strong east wind, and the waters were divided.',
    source: { book: 'EXO', chapter: 14, verseStart: 21 },
  },
  {
    id: 'joshua-command',
    prompt: 'What did God command Joshua to be?',
    choices: [
      { id: 'strong', text: 'Strong and courageous' },
      { id: 'quiet', text: 'Quiet and patient' },
      { id: 'wealthy', text: 'Wealthy and powerful' },
    ],
    correctChoiceId: 'strong',
    explanation: '“Have I not commanded you to be strong and courageous?”',
    source: { book: 'JOS', chapter: 1, verseStart: 9 },
  },
  {
    id: 'ruth-promise',
    prompt: 'What did Ruth promise Naomi?',
    choices: [
      { id: 'go', text: '“Wherever you go, I will go”' },
      { id: 'return', text: '“I will return to my own people”' },
      { id: 'wait', text: '“I will wait for you here”' },
    ],
    correctChoiceId: 'go',
    explanation: 'Ruth chose Naomi’s people and Naomi’s God as her own.',
    source: { book: 'RUT', chapter: 1, verseStart: 16 },
  },
  {
    id: 'lord-sees',
    prompt: 'According to 1 Samuel 16:7, what does the LORD look at?',
    choices: [
      { id: 'heart', text: 'The heart' },
      { id: 'height', text: 'Height and strength' },
      { id: 'family', text: 'A person’s family name' },
    ],
    correctChoiceId: 'heart',
    explanation: '“Man sees the outward appearance, but the LORD sees the heart.”',
    source: { book: '1SA', chapter: 16, verseStart: 7 },
  },
  {
    id: 'goliath-home',
    prompt: 'Which city was Goliath from?',
    choices: [
      { id: 'gath', text: 'Gath' },
      { id: 'jericho', text: 'Jericho' },
      { id: 'bethlehem', text: 'Bethlehem' },
    ],
    correctChoiceId: 'gath',
    explanation: 'Goliath was a champion of the Philistines from Gath.',
    source: { book: '1SA', chapter: 17, verseStart: 4 },
  },
  {
    id: 'five-stones',
    prompt: 'How many smooth stones did David choose from the brook?',
    choices: [
      { id: 'three', text: 'Three' },
      { id: 'five', text: 'Five' },
      { id: 'seven', text: 'Seven' },
    ],
    correctChoiceId: 'five',
    explanation: 'David selected five smooth stones and put them in his shepherd’s bag.',
    source: { book: '1SA', chapter: 17, verseStart: 40 },
  },
  {
    id: 'david-reign',
    prompt: 'How many years did David reign?',
    choices: [
      { id: 'twelve', text: 'Twelve years' },
      { id: 'forty', text: 'Forty years' },
      { id: 'seventy', text: 'Seventy years' },
    ],
    correctChoiceId: 'forty',
    explanation: 'David became king at thirty and reigned forty years.',
    source: { book: '2SA', chapter: 5, verseStart: 4 },
  },
  {
    id: 'shepherd-psalm',
    prompt: 'Complete the verse: “The LORD is my ___; I shall not want.”',
    choices: [
      { id: 'king', text: 'king' },
      { id: 'shepherd', text: 'shepherd' },
      { id: 'song', text: 'song' },
    ],
    correctChoiceId: 'shepherd',
    explanation: 'Psalm 23 begins, “The LORD is my shepherd; I shall not want.”',
    source: { book: 'PSA', chapter: 23, verseStart: 1 },
  },
  {
    id: 'carmel-fire',
    prompt: 'What fell on Mount Carmel after Elijah prayed?',
    choices: [
      { id: 'fire', text: 'The fire of the LORD' },
      { id: 'rain', text: 'A heavy rain' },
      { id: 'manna', text: 'Bread from heaven' },
    ],
    correctChoiceId: 'fire',
    explanation: 'The fire of the LORD fell and consumed the sacrifice.',
    source: { book: '1KI', chapter: 18, verseStart: 38 },
  },
  {
    id: 'lions-den',
    prompt: 'How did God protect Daniel in the lions’ den?',
    choices: [
      { id: 'angel', text: 'He sent His angel and shut the lions’ mouths' },
      { id: 'sleep', text: 'He made the lions fall asleep' },
      { id: 'door', text: 'He opened a door in the den' },
    ],
    correctChoiceId: 'angel',
    explanation: '“My God sent His angel and shut the mouths of the lions.”',
    source: { book: 'DAN', chapter: 6, verseStart: 22 },
  },
  {
    id: 'such-a-time',
    prompt: 'Mordecai wondered whether Esther had come to the kingdom for…',
    choices: [
      { id: 'time', text: '…such a time as this' },
      { id: 'wealth', text: '…great wealth and honor' },
      { id: 'peace', text: '…a long and peaceful reign' },
    ],
    correctChoiceId: 'time',
    explanation: '“Who knows if perhaps you have come to the kingdom for such a time as this?”',
    source: { book: 'EST', chapter: 4, verseStart: 14 },
  },
];
