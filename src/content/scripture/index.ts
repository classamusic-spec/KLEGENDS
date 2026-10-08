import { BSB_VERSES } from './bsb.generated';
import { formatReference, verseKeysFor, type ScriptureReference } from '@/domain/scripture';

export const TRANSLATION = {
  id: 'BSB',
  name: 'Berean Standard Bible',
  attribution:
    'Scripture quotations are from the Berean Standard Bible (BSB), dedicated to the public domain by BSB Publishing, LLC.',
} as const;

export interface PassageVerse {
  readonly number: number;
  readonly text: string;
}

export interface Passage {
  readonly reference: ScriptureReference;
  readonly label: string;
  readonly verses: readonly PassageVerse[];
  /** The excerpt begins inside a sentence or quotation that started earlier. */
  readonly continuesBefore: boolean;
  /** The excerpt ends inside a sentence or quotation that continues later. */
  readonly continuesAfter: boolean;
}

const OPEN_QUOTE = '“';
const CLOSE_QUOTE = '”';

/**
 * Detects excerpt boundaries that fall mid-sentence or mid-quotation, so the
 * UI can mark them with an ellipsis. Verse text itself is never altered.
 */
const continuation = (text: string): { before: boolean; after: boolean } => {
  let depth = 0;
  let before = /^[a-z]/.test(text);
  for (const char of text) {
    if (char === OPEN_QUOTE) depth++;
    else if (char === CLOSE_QUOTE) {
      if (depth === 0) before = true;
      else depth--;
    }
  }
  const after = depth > 0 || /[,;:—]$/.test(text.trim());
  return { before, after };
};

/** Returns the verbatim passage, or undefined if any verse is missing from the store. */
export const getPassage = (reference: ScriptureReference): Passage | undefined => {
  const keys = verseKeysFor(reference);
  if (keys.length === 0) return undefined;
  const verses: PassageVerse[] = [];
  for (const key of keys) {
    const text = BSB_VERSES[key];
    if (text === undefined) return undefined;
    verses.push({ number: Number(key.split(':')[1]), text });
  }
  const joined = verses.map((v) => v.text).join(' ');
  const { before, after } = continuation(joined);
  return { reference, label: formatReference(reference), verses, continuesBefore: before, continuesAfter: after };
};

/** Single-paragraph rendering with ellipses marking continuation. */
export const passageText = (passage: Passage): string =>
  `${passage.continuesBefore ? '… ' : ''}${passage.verses.map((v) => v.text).join(' ')}${
    passage.continuesAfter ? ' …' : ''
  }`;

export const hasPassage = (reference: ScriptureReference): boolean => getPassage(reference) !== undefined;
