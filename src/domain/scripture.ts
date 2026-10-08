/**
 * Scripture references. Text itself lives in src/content/scripture (a
 * public-domain translation); domain objects only ever point at references so
 * story text is never duplicated across cards or editions.
 */
export const BOOKS = {
  GEN: 'Genesis', EXO: 'Exodus', LEV: 'Leviticus', NUM: 'Numbers', DEU: 'Deuteronomy',
  JOS: 'Joshua', JDG: 'Judges', RUT: 'Ruth', '1SA': '1 Samuel', '2SA': '2 Samuel',
  '1KI': '1 Kings', '2KI': '2 Kings', '1CH': '1 Chronicles', '2CH': '2 Chronicles',
  EZR: 'Ezra', NEH: 'Nehemiah', EST: 'Esther', JOB: 'Job', PSA: 'Psalms', PRO: 'Proverbs',
  ECC: 'Ecclesiastes', SNG: 'Song of Songs', ISA: 'Isaiah', JER: 'Jeremiah',
  LAM: 'Lamentations', EZK: 'Ezekiel', DAN: 'Daniel', HOS: 'Hosea', JOL: 'Joel',
  AMO: 'Amos', OBA: 'Obadiah', JON: 'Jonah', MIC: 'Micah', NAM: 'Nahum', HAB: 'Habakkuk',
  ZEP: 'Zephaniah', HAG: 'Haggai', ZEC: 'Zechariah', MAL: 'Malachi',
  MAT: 'Matthew', MRK: 'Mark', LUK: 'Luke', JHN: 'John', ACT: 'Acts', ROM: 'Romans',
  '1CO': '1 Corinthians', '2CO': '2 Corinthians', GAL: 'Galatians', EPH: 'Ephesians',
  PHP: 'Philippians', COL: 'Colossians', '1TH': '1 Thessalonians', '2TH': '2 Thessalonians',
  '1TI': '1 Timothy', '2TI': '2 Timothy', TIT: 'Titus', PHM: 'Philemon', HEB: 'Hebrews',
  JAS: 'James', '1PE': '1 Peter', '2PE': '2 Peter', '1JN': '1 John', '2JN': '2 John',
  '3JN': '3 John', JUD: 'Jude', REV: 'Revelation',
} as const;

export type BookId = keyof typeof BOOKS;

export interface ScriptureReference {
  readonly book: BookId;
  readonly chapter: number;
  /** Omitted for whole-chapter references. */
  readonly verseStart?: number;
  /** Inclusive; omitted for single verses. */
  readonly verseEnd?: number;
}

/** Book name, singular for a single psalm ("Psalm 23", but "Psalms" for the book). */
const bookName = (ref: ScriptureReference): string =>
  ref.book === 'PSA' ? 'Psalm' : BOOKS[ref.book];

/** "1 Samuel 17", "1 Samuel 17:45", "Exodus 14:21–22". */
export const formatReference = (ref: ScriptureReference): string => {
  const base = `${bookName(ref)} ${ref.chapter}`;
  if (ref.verseStart === undefined) return base;
  if (ref.verseEnd === undefined || ref.verseEnd === ref.verseStart) return `${base}:${ref.verseStart}`;
  return `${base}:${ref.verseStart}–${ref.verseEnd}`;
};

/** Stable key for a single verse, matching the content store (e.g. "1SA 17:45"). */
export const verseKey = (book: BookId, chapter: number, verse: number): string =>
  `${book} ${chapter}:${verse}`;

/** Expands a reference into individual verse keys. Whole-chapter references expand to nothing. */
export const verseKeysFor = (ref: ScriptureReference): string[] => {
  if (ref.verseStart === undefined) return [];
  const end = ref.verseEnd ?? ref.verseStart;
  const keys: string[] = [];
  for (let v = ref.verseStart; v <= end; v++) keys.push(verseKey(ref.book, ref.chapter, v));
  return keys;
};
