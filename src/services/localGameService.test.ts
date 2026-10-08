import { GameServiceError } from './gameService';
import { createMemoryStore } from './keyValueStore';
import { DATABASE_STORAGE_KEY, LocalGameService } from './localGameService';
import { catalog } from '@/content';
import { sequentialIds } from '@/engine/database';

const NOW = new Date('2026-10-08T15:00:00.000Z');

const makeService = (storage = createMemoryStore(), seed = 0) =>
  new LocalGameService({ storage, catalog, ids: sequentialIds(seed), now: () => NOW });

describe('LocalGameService', () => {
  it('creates and persists a fresh profile on first load', async () => {
    const storage = createMemoryStore();
    const db = await makeService(storage).load();
    expect(db.player.id).toMatch(/^player_/);
    expect(storage.dump()[DATABASE_STORAGE_KEY]).toBeDefined();
  });

  it('awards cards exactly once even across an app restart mid-reveal', async () => {
    const storage = createMemoryStore();
    const first = makeService(storage);
    const grant = await first.claimDailyPack();
    const opening = await first.openPack(grant.id);
    await first.recordRevealProgress(opening.id, 2);

    // Simulate the app being killed and relaunched.
    const relaunched = makeService(storage, 1000);
    const db = await relaunched.load();
    expect(db.packOpenings[opening.id]?.revealedCount).toBe(2);
    const again = await relaunched.openPack(grant.id);
    expect(again.id).toBe(opening.id);
    expect(again.items).toEqual(opening.items);
    expect(again.revealedCount).toBe(2);
    const copies = Object.values((await relaunched.load()).inventory).reduce((s, e) => s + e.copies, 0);
    expect(copies).toBe(5);
  });

  it('serializes concurrent open requests for the same grant', async () => {
    const service = makeService();
    const grant = await service.claimDailyPack();
    const [a, b] = await Promise.all([service.openPack(grant.id), service.openPack(grant.id)]);
    expect(a.id).toBe(b.id);
    const db = await service.load();
    expect(Object.values(db.inventory).reduce((s, e) => s + e.copies, 0)).toBe(5);
  });

  it('surfaces simulated network failures without changing state, then recovers', async () => {
    const service = makeService();
    const grant = await service.claimDailyPack();
    service.prototype.failNextRequest();
    await expect(service.openPack(grant.id)).rejects.toMatchObject({ code: 'NETWORK' });
    expect((await service.load()).packGrants[grant.id]?.status).toBe('available');
    const opening = await service.openPack(grant.id);
    expect(opening.items).toHaveLength(5);
  });

  it('keeps the previous state when persistence fails', async () => {
    const storage = createMemoryStore();
    const service = makeService(storage);
    await service.load();
    storage.setItem = async () => {
      throw new Error('disk full');
    };
    await expect(service.claimDailyPack()).rejects.toBeInstanceOf(GameServiceError);
    expect((await service.load()).dailyClaim.lastClaimDay).toBeUndefined();
  });

  it('rejects a second daily claim on the same day with a domain error', async () => {
    const service = makeService();
    await service.claimDailyPack();
    await expect(service.claimDailyPack()).rejects.toMatchObject({ code: 'DAILY_PACK_NOT_AVAILABLE' });
  });

  it('starts fresh when stored data is corrupt', async () => {
    const storage = createMemoryStore({ [DATABASE_STORAGE_KEY]: '{not json' });
    const db = await makeService(storage).load();
    expect(db.inventory).toEqual({});
  });

  it('resets prototype data on request', async () => {
    const service = makeService();
    const grant = await service.claimDailyPack();
    await service.openPack(grant.id);
    await service.prototype.reset();
    expect((await service.load()).inventory).toEqual({});
  });
});
