import { dailyPackStatus, localDayKey, nextLocalMidnight } from './dailyPack';

describe('local day boundaries', () => {
  it('computes the local calendar day for an offset', () => {
    expect(localDayKey('2026-10-08T23:30:00.000Z', 0)).toBe('2026-10-08');
    expect(localDayKey('2026-10-08T23:30:00.000Z', 120)).toBe('2026-10-09');
    expect(localDayKey('2026-10-09T03:00:00.000Z', -300)).toBe('2026-10-08');
  });

  it('finds the next local midnight in UTC', () => {
    expect(nextLocalMidnight('2026-10-08T15:00:00.000Z', 0)).toBe('2026-10-09T00:00:00.000Z');
    expect(nextLocalMidnight('2026-10-08T15:00:00.000Z', -300)).toBe('2026-10-09T05:00:00.000Z');
    expect(nextLocalMidnight('2026-12-31T22:00:00.000Z', 0)).toBe('2027-01-01T00:00:00.000Z');
  });

  it('reports availability and the next reset', () => {
    expect(dailyPackStatus({}, '2026-10-08T15:00:00.000Z', 0)).toEqual({ state: 'available' });
    expect(dailyPackStatus({ lastClaimDay: '2026-10-08' }, '2026-10-08T15:00:00.000Z', 0)).toEqual({
      state: 'claimed',
      nextAvailableAt: '2026-10-09T00:00:00.000Z',
    });
    expect(dailyPackStatus({ lastClaimDay: '2026-10-07' }, '2026-10-08T15:00:00.000Z', 0).state).toBe('available');
  });
});
