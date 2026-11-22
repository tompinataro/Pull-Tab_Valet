import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTodayRoutes } from '../data';
import { logRouteDiagnostic } from '../diagnostics';
import { requestMetrics } from '../routes/metrics';

vi.mock('../db', () => ({ hasDb: () => true, dbQuery: vi.fn().mockResolvedValue({ rows: [] }) }));

describe('Best-effort route diagnostics', () => {
  afterEach(() => vi.restoreAllMocks());

  it('retains the supplied message when the logger works', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    logRouteDiagnostic('synthetic route diagnostic');
    expect(log).toHaveBeenCalledWith('synthetic route diagnostic');
  });

  it('keeps an unassigned route response when the logger throws', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => { throw new TypeError('fixture'); });
    await expect(getTodayRoutes(7)).resolves.toEqual([]);
  });

  it('keeps response completion safe if metric labeling throws', () => {
    const response = Object.assign(new EventEmitter(), { statusCode: 200 });
    const request = { method: 'GET', get path() { throw new TypeError('fixture'); } };
    const next = vi.fn();
    requestMetrics(request as unknown as Parameters<typeof requestMetrics>[0],
      response as unknown as Parameters<typeof requestMetrics>[1], next);
    expect(next).toHaveBeenCalledOnce();
    expect(() => response.emit('finish')).not.toThrow();
  });
});
