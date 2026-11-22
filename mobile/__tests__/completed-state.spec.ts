import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  multiRemove: vi.fn(),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({ default: store }));

import { ensureToday, syncServerTruth } from '../src/shared/utils/completed';

describe('completed-state persistence fallbacks', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    store.getItem.mockResolvedValue(new Date().toISOString().slice(0, 10));
    store.multiRemove.mockResolvedValue(undefined);
    store.setItem.mockResolvedValue(undefined);
  });

  it('does not clear or mark the day when its cached timestamp cannot be read', async () => {
    store.getItem.mockRejectedValueOnce(new Error('read'));
    await expect(ensureToday()).resolves.toBeUndefined();
    expect(store.multiRemove).not.toHaveBeenCalled();
    expect(store.setItem).not.toHaveBeenCalled();
  });

  it('does not mark rollover complete if clearing prior state fails', async () => {
    store.getItem.mockResolvedValueOnce('2000-01-01');
    store.multiRemove.mockRejectedValueOnce(new Error('remove'));
    await expect(ensureToday()).resolves.toBeUndefined();
    expect(store.multiRemove).toHaveBeenCalledWith(['completed_visits_v1', 'inprogress_visits_v1']);
    expect(store.setItem).not.toHaveBeenCalled();
  });

  it('deduplicates and caches both sets in order on success', async () => {
    await expect(syncServerTruth([8, 8], [9, 9, 10])).resolves.toBeUndefined();
    expect(store.setItem.mock.calls).toEqual([
      ['completed_visits_v1', '[8]'],
      ['inprogress_visits_v1', '[9,10]'],
    ]);
  });

  it('does not write the second set when the first write fails', async () => {
    store.setItem.mockRejectedValueOnce(new Error('first write'));
    await expect(syncServerTruth([8], [9])).resolves.toBeUndefined();
    expect(store.setItem.mock.calls).toEqual([['completed_visits_v1', '[8]']]);
  });

  it('keeps original best-effort behavior if the second write fails', async () => {
    store.setItem.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('second write'));
    await expect(syncServerTruth([8], [9])).resolves.toBeUndefined();
    expect(store.setItem.mock.calls).toEqual([
      ['completed_visits_v1', '[8]'],
      ['inprogress_visits_v1', '[9]'],
    ]);
  });
});
