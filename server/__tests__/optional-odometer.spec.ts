import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createVisitsRouter } from '../routes/visits';

const deps = vi.hoisted(() => ({ query: vi.fn(), save: vi.fn() }));
vi.mock('../db', () => ({ hasDb: () => true, dbQuery: deps.query }));
vi.mock('../data', () => ({ saveVisit: deps.save, getTodayRoutes: vi.fn(), getVisit: vi.fn() }));

describe('optional odometer at the actual visit submit handler', () => {
  const core = { synthetic: true };
  const body = { odometerReading: '12.5 miles', checkOutTs: '2026-11-21T23:30:00-06:00' };
  beforeEach(() => {
    deps.query.mockReset().mockResolvedValue({ rows: [] });
    deps.save.mockReset().mockResolvedValue(core);
  });

  async function submit(data: typeof body | object = body) {
    const inert = vi.fn();
    const router = createVisitsRouter(inert, inert);
    const route = router.stack.find(layer => layer.route?.path === '/visits/:id/submit').route;
    const handler = route.stack[route.stack.length - 1].handle;
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await handler({ params: { id: '73' }, user: { id: 18 }, body: data }, response);
    return response;
  }

  it.each(['yes', 'no'])('supplemental write failure=%s does not change the successful visit result', async failure => {
    if (failure === 'yes') deps.query.mockImplementation(async (sql: string) => {
      if (sql.includes('insert into daily_start_odometer')) throw new Error('fixture optional write');
      return { rows: [] };
    });
    const res = await submit();
    expect(deps.save).toHaveBeenCalledExactlyOnceWith(73, body);
    expect(deps.query).toHaveBeenCalledWith(expect.stringContaining('on conflict (user_id, date) do nothing'), [18, '2026-11-22', 12.5]);
    expect(deps.query).toHaveBeenCalledWith(expect.stringContaining("values ($1, $2, $3, 'completed')"), expect.arrayContaining([73, 18]));
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledExactlyOnceWith({ ok: true, id: 73, idempotent: false, result: core });
  });

  it('skips optional insertion without a reading and does not swallow a primary visit failure', async () => {
    await submit({});
    expect(deps.query.mock.calls.some(([sql]) => sql.includes('insert into daily_start_odometer'))).toBe(false);
    deps.query.mockClear();
    deps.save.mockRejectedValueOnce(new Error('fixture primary failure'));
    const res = await submit();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'fixture primary failure' });
    expect(deps.query.mock.calls.some(([sql]) => sql.includes('insert into'))).toBe(false);
  });
});
