/**
 * Typed results for domain operations. Domain and engine functions never throw
 * for expected business failures; they return a `DomainError` with a stable
 * code so the service layer can map it to UI copy or an HTTP status later.
 */
export type DomainErrorCode =
  | 'GRANT_NOT_FOUND'
  | 'GRANT_NOT_OWNED'
  | 'PACK_DEFINITION_NOT_FOUND'
  | 'EDITION_NOT_FOUND'
  | 'OPENING_NOT_FOUND'
  | 'DAILY_PACK_NOT_AVAILABLE'
  | 'QUEST_NOT_FOUND'
  | 'QUEST_NOT_COMPLETE'
  | 'INVALID_PROGRESS';

export interface DomainError {
  readonly code: DomainErrorCode;
  readonly message: string;
}

export type Result<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: DomainError };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });

export const fail = <T = never>(code: DomainErrorCode, message: string): Result<T> => ({
  ok: false,
  error: { code, message },
});
