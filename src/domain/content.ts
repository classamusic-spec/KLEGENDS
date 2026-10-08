/**
 * Editorial metadata shared by all publishable content. Mirrors the planned
 * Kingdom Legends Studio workflow: Draft → Biblical Editorial Review →
 * Artwork Review → Quality Assurance → Published. Identifiers are stable
 * forever once published so player inventories never break.
 */
export type ContentStatus = 'draft' | 'editorial_review' | 'art_review' | 'qa' | 'published';

export interface EditorialMeta {
  readonly status: ContentStatus;
  /** Monotonic revision number, bumped on every edit. */
  readonly revision: number;
  /** True while artwork is a temporary procedural placeholder. */
  readonly placeholderArt: boolean;
}

/**
 * How a piece of narrative text relates to Scripture. Quoted Scripture,
 * faithful summaries, and artistic dramatization are always distinguished in
 * the UI.
 */
export type NarrativeKind = 'scripture_summary' | 'dramatization';
