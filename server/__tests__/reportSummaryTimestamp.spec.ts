import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildReportRows } from '../data';
import { buildSummary } from '../reports/summary';

vi.mock('../data', () => ({ buildReportRows: vi.fn() }));
vi.mock('../db', () => ({ hasDb: () => false, dbQuery: vi.fn(() => { throw new Error('Unexpected DB use'); }) }));

const rangeStart = new Date('2026-02-03T00:00:00Z');
const rangeEnd = new Date('2026-02-04T00:00:00Z');
const checkIn = '2026-02-03T12:00:00.000Z';
const checkOut = '2026-02-03T12:40:00.000Z';

function mockRow(visitTime: unknown, payload: Record<string, unknown>, createdAt: unknown = null) {
  vi.mocked(buildReportRows).mockResolvedValue([{
    tech_id: 1,
    tech_name: 'Fixture Tech',
    route_name: null,
    client_name: 'Fixture Stop',
    address: '',
    visit_time: visitTime,
    created_at: createdAt,
    payload,
  }] as unknown as Awaited<ReturnType<typeof buildReportRows>>);
}

describe('Summary timestamp precedence and fallbacks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('prefers the recorded visit checkout over payload checkout', async () => {
    mockRow(new Date(checkOut), { checkInTs: checkIn, checkOutTs: '2026-02-03T13:00:00Z' });
    const data = (await buildSummary(rangeStart, rangeEnd))[0];
    expect(data).toMatchObject({ checkInTs: checkIn, checkOutTs: checkOut, durationMinutes: 40, mileageDelta: 0 });
  });

  it('uses payload checkout and created-at fallback when preferred values are unusable', async () => {
    mockRow('invalid date', { checkInTs: 'bad input', checkOutTs: Date.parse(checkOut) }, checkIn);
    const data = (await buildSummary(rangeStart, rangeEnd))[0];
    expect(data).toMatchObject({ checkInTs: checkIn, checkOutTs: checkOut, durationMinutes: 40 });
  });

  it('still falls back when timestamp coercion throws', async () => {
    const invalid = { [Symbol.toPrimitive]() { throw new TypeError('fixture'); } };
    mockRow(invalid, { checkInTs: invalid, checkOutTs: checkOut }, checkIn);
    const data = (await buildSummary(rangeStart, rangeEnd))[0];
    expect(data).toMatchObject({ checkInTs: checkIn, checkOutTs: checkOut, durationMinutes: 40 });
  });

  it('omits a row when neither checkout candidate can be interpreted', async () => {
    mockRow('bad database date', { checkInTs: checkIn, checkOutTs: 'bad payload date' });
    expect(await buildSummary(rangeStart, rangeEnd)).toEqual([]);
  });
});
