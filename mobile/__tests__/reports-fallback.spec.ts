import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  report: vi.fn(),
  flushQueue: vi.fn(),
  getQueueStats: vi.fn(),
}));
vi.mock('react', () => ({
  useCallback: <T>(callback: T) => callback,
  useState: <T>(value: T) => [value, vi.fn()],
  useEffect: vi.fn(),
}));
vi.mock('../src/shared/api/client', () => ({ adminFetchReportSummary: m.report }));
vi.mock('../src/shared/utils/offlineQueue', () => ({
  flushQueue: m.flushQueue, getQueueStats: m.getQueueStats,
}));

import { setBannerHandler, showBanner } from '../src/shared/components/globalBannerBus';
import { useReportsData } from '../src/shared/hooks/useReportsData';

describe('report refresh and advisory notifications', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setBannerHandler(null);
    m.report.mockResolvedValue({ rows: [] });
    m.flushQueue.mockResolvedValue({ sent: 0, remaining: 0 });
  });

  it('still requests the report after a failed queue flush', async () => {
    m.flushQueue.mockRejectedValue(new Error('queue failed'));
    await useReportsData({ token: 'synthetic-test-session' }).fetchSummary();
    expect(m.report).toHaveBeenCalledWith('synthetic-test-session', { frequency: 'weekly', startDate: undefined, endDate: undefined });
  });

  it('still requests the report after retry statistics fail', async () => {
    m.flushQueue.mockResolvedValue({ sent: 0, remaining: 1 });
    m.getQueueStats.mockRejectedValue(new Error('stats failed'));
    await useReportsData({ token: 'synthetic-test-session' }).fetchSummary();
    expect(m.getQueueStats).toHaveBeenCalledOnce();
    expect(m.report).toHaveBeenCalledOnce();
  });

  it('isolates a throwing banner subscriber without losing report refresh', async () => {
    const handler = vi.fn(() => { throw new Error('notification failed'); });
    setBannerHandler(handler);
    m.flushQueue.mockResolvedValue({ sent: 1, remaining: 0 });
    await useReportsData({ token: 'synthetic-test-session' }).fetchSummary();
    expect(handler).toHaveBeenCalledWith({ type: 'info', message: 'Synced 1 offline visit before refresh.' });
    expect(m.report).toHaveBeenCalledOnce();
    expect(() => showBanner({ message: 'fixture' })).not.toThrow();
  });
});
