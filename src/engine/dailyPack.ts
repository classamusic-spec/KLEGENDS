/**
 * Daily Discovery Pack rules. One free pack per local calendar day; the
 * allowance does not accumulate and nothing is lost for taking a break.
 *
 * In the local prototype the device clock and timezone decide the day. The
 * Milestone 2 backend must evaluate this with server time and a stored
 * player timezone so changing the device clock cannot mint extra packs.
 */
const MINUTE_MS = 60_000;

/** Local calendar day ("YYYY-MM-DD") for an instant and a UTC offset in minutes. */
export const localDayKey = (nowIso: string, utcOffsetMinutes: number): string =>
  new Date(Date.parse(nowIso) + utcOffsetMinutes * MINUTE_MS).toISOString().slice(0, 10);

/** The next local midnight after `nowIso`, expressed as a UTC ISO timestamp. */
export const nextLocalMidnight = (nowIso: string, utcOffsetMinutes: number): string => {
  const local = new Date(Date.parse(nowIso) + utcOffsetMinutes * MINUTE_MS);
  const midnightLocalMs = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1);
  return new Date(midnightLocalMs - utcOffsetMinutes * MINUTE_MS).toISOString();
};

export type DailyPackStatus =
  | { readonly state: 'available' }
  | { readonly state: 'claimed'; readonly nextAvailableAt: string };

export const dailyPackStatus = (
  claim: { readonly lastClaimDay?: string },
  nowIso: string,
  utcOffsetMinutes: number,
): DailyPackStatus => {
  if (claim.lastClaimDay !== localDayKey(nowIso, utcOffsetMinutes)) return { state: 'available' };
  return { state: 'claimed', nextAvailableAt: nextLocalMidnight(nowIso, utcOffsetMinutes) };
};
