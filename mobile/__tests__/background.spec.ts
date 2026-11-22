import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  defineTask: vi.fn(),
  isTaskRegisteredAsync: vi.fn(),
  unregisterTaskAsync: vi.fn(),
  getItem: vi.fn(),
  flushQueue: vi.fn(),
  fetchTodayRoutes: vi.fn(),
}));
vi.mock('expo-task-manager', () => ({
  defineTask: m.defineTask, isTaskRegisteredAsync: m.isTaskRegisteredAsync,
}));
vi.mock('expo-background-fetch', () => ({
  BackgroundFetchResult: { NewData: 1, NoData: 2, Failed: 3 },
  BackgroundFetchStatus: { Restricted: 1, Denied: 2, Available: 3 },
  unregisterTaskAsync: m.unregisterTaskAsync,
}));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem: m.getItem } }));
vi.mock('../src/shared/utils/offlineQueue', () => ({ flushQueue: m.flushQueue }));
vi.mock('../src/shared/api/client', () => ({ fetchTodayRoutes: m.fetchTodayRoutes }));

import { unregisterBackgroundSync } from '../src/shared/background';

const [name, task] = m.defineTask.mock.calls[0] as [string, () => Promise<number>];

describe('background sync fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.getItem.mockResolvedValue('synthetic-token');
    m.flushQueue.mockResolvedValue({ sent: 1 });
    m.fetchTodayRoutes.mockResolvedValue({});
    m.isTaskRegisteredAsync.mockResolvedValue(true);
    m.unregisterTaskAsync.mockResolvedValue(undefined);
  });
  it('returns NoData and skips refresh when no session token exists', async () => {
    m.getItem.mockResolvedValue(null);
    await expect(task()).resolves.toBe(2);
    expect(m.flushQueue).not.toHaveBeenCalled();
    expect(m.fetchTodayRoutes).not.toHaveBeenCalled();
  });
  it('returns Failed when token storage lookup rejects', async () => {
    m.getItem.mockRejectedValue(new Error('storage'));
    await expect(task()).resolves.toBe(3);
    expect(m.flushQueue).not.toHaveBeenCalled();
  });
  it('refreshes routes after a queue flush failure and returns NoData', async () => {
    m.flushQueue.mockRejectedValue(new Error('queue'));
    await expect(task()).resolves.toBe(2);
    expect(m.fetchTodayRoutes).toHaveBeenCalledWith('synthetic-token');
  });
  it('keeps NewData after a successful flush and rejected route fetch', async () => {
    m.fetchTodayRoutes.mockRejectedValue(new Error('route'));
    await expect(task()).resolves.toBe(1);
  });
  it('keeps NewData if route fetch throws synchronously', async () => {
    m.fetchTodayRoutes.mockImplementationOnce(() => { throw new Error('route'); });
    await expect(task()).resolves.toBe(1);
  });
  it('does not reject when shutdown cleanup fails', async () => {
    m.unregisterTaskAsync.mockRejectedValue(new Error('cleanup'));
    await expect(unregisterBackgroundSync()).resolves.toBeUndefined();
    expect(m.unregisterTaskAsync).toHaveBeenCalledWith(name);
  });
  it('does not unregister if the registration lookup rejects', async () => {
    m.isTaskRegisteredAsync.mockRejectedValue(new Error('lookup'));
    await expect(unregisterBackgroundSync()).resolves.toBeUndefined();
    expect(m.unregisterTaskAsync).not.toHaveBeenCalled();
  });
});
