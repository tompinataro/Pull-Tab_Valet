import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRouteListData } from '../src/shared/hooks/useRouteListData';

const h = vi.hoisted(() => ({
  states: [] as ReturnType<typeof vi.fn>[],
  routes: vi.fn(),
  flush: vi.fn(),
  stats: vi.fn(),
  ensure: vi.fn(),
  prune: vi.fn(),
  persist: vi.fn(),
  completed: vi.fn(),
  progress: vi.fn(),
  banner: vi.fn(),
}));
vi.mock('react', () => ({
  useCallback: <T>(callback: T) => callback,
  useState: <T>(value: T) => {
    const setter = vi.fn();
    h.states.push(setter);
    return [value, setter];
  },
  useEffect: vi.fn(),
}));
vi.mock('react-native', () => ({ AppState: {}, Linking: {}, Platform: { OS: 'web' } }));
vi.mock('../src/shared/api/client', () => ({ fetchTodayRoutes: h.routes, resetMyVisitState: vi.fn() }));
vi.mock('../src/shared/utils/offlineQueue', () => ({ flushQueue: h.flush, getQueueStats: h.stats }));
vi.mock('../src/shared/utils/completed', () => ({
  ensureToday: h.ensure, pruneToIds: h.prune, syncServerTruth: h.persist,
  getCompleted: h.completed, getInProgress: h.progress,
}));
vi.mock('../src/shared/components/globalBannerBus', () => ({ showBanner: h.banner }));

describe('route list shown independently from local state hydration', () => {
  const route = { id: 7, clientName: 'Synthetic client', completedToday: true };
  const fixtureError = new Error('synthetic fixture failure');
  beforeEach(() => {
    vi.resetAllMocks();
    h.states.length = 0;
    h.routes.mockResolvedValue({ routes: [route] });
    h.stats.mockResolvedValue({ pending: 0, maxAttempts: 0 });
    h.completed.mockResolvedValue(new Set());
    h.progress.mockResolvedValue(new Set());
  });

  it.each(['ensure', 'prune'] as const)('%s failure keeps the fetched route, leaves flags alone and finishes loading', async stage => {
    h[stage].mockRejectedValueOnce(fixtureError);
    await useRouteListData('synthetic-session').load();
    const [setRoutes, setLoading, , setError, setCompleted, setProgress] = h.states;
    expect(setRoutes).toHaveBeenCalledExactlyOnceWith([route]);
    expect(setLoading.mock.calls).toEqual([[true], [false]]);
    expect(setError.mock.calls).toEqual([[null]]);
    expect(setCompleted).not.toHaveBeenCalled();
    expect(setProgress).not.toHaveBeenCalled();
    expect(h.persist).not.toHaveBeenCalled();
    expect(h.banner).not.toHaveBeenCalled();
    expect(h.prune).toHaveBeenCalledTimes(stage === 'prune' ? 1 : 0);
  });

  it('successful route plus local work still writes and shows server flags', async () => {
    await useRouteListData('synthetic-session').load();
    expect(h.prune).toHaveBeenCalledExactlyOnceWith([7]);
    expect(h.persist).toHaveBeenCalledExactlyOnceWith([7], []);
    expect(h.states[4]).toHaveBeenCalledExactlyOnceWith(new Set([7]));
    expect(h.states[5]).toHaveBeenCalledExactlyOnceWith(new Set());
    expect(h.states[1]).toHaveBeenLastCalledWith(false);
  });

  it('a failed local server-truth cache write keeps freshly fetched flags visible', async () => {
    h.persist.mockRejectedValueOnce(fixtureError);
    await useRouteListData('synthetic-session').load();
    expect(h.states[4]).toHaveBeenCalledExactlyOnceWith(new Set([7]));
    expect(h.states[3].mock.calls).toEqual([[null]]);
    expect(h.states[1]).toHaveBeenLastCalledWith(false);
  });

  it('a primary fetch failure preserves the existing visible route error and cleanup', async () => {
    h.routes.mockRejectedValueOnce(fixtureError);
    await useRouteListData('synthetic-session').load();
    expect(h.states[0]).not.toHaveBeenCalled();
    expect(h.states[3].mock.calls).toEqual([[null], [fixtureError.message]]);
    expect(h.banner).toHaveBeenCalledExactlyOnceWith({ type: 'error', message: fixtureError.message });
    expect(h.ensure).not.toHaveBeenCalled();
    expect(h.states[1]).toHaveBeenLastCalledWith(false);
  });
});
