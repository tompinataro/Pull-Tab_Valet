import type { AuditEvent, Box, BoxStatus, Deposit, Prize, Report, Venue } from './types';

const now = new Date().toISOString();

let demoVenues: Venue[] = [
  {
    id: 'demo-venue-1',
    name: 'Lucky Lantern Lounge',
    address: '412 Cedar Ave, St. Paul, MN',
    notes: 'High traffic weekend route.',
    created_at: now,
    updated_at: now,
  },
  {
    id: 'demo-venue-2',
    name: 'North Star Tavern',
    address: '85 Rice St, St. Paul, MN',
    notes: 'Tuesday pull-tab restock.',
    created_at: now,
    updated_at: now,
  },
  {
    id: 'demo-venue-3',
    name: 'Gopher Social Club',
    address: '190 Summit Ave, St. Paul, MN',
    notes: 'Add promo signage next visit.',
    created_at: now,
    updated_at: now,
  },
];

const demoReports: Report[] = [
  {
    id: 'demo-report-1',
    venue_id: 'demo-venue-1',
    box_id: 'demo-box-1',
    type: 'closeout_pdf',
    storage_bucket: 'reports',
    storage_path: 'demo/lucky-lantern-closeout.pdf',
    mime_type: 'application/pdf',
    created_at: now,
  },
  {
    id: 'demo-report-2',
    venue_id: 'demo-venue-2',
    box_id: 'demo-box-2',
    type: 'closeout_csv',
    storage_bucket: 'reports',
    storage_path: 'demo/north-star-audit.csv',
    mime_type: 'text/csv',
    created_at: now,
  },
];

let demoBoxes: Box[] = [
  {
    id: 'demo-box-1',
    venue_id: 'demo-venue-1',
    upc: '012345678905',
    status: 'live',
    created_at: now,
    updated_at: now,
  },
  {
    id: 'demo-box-2',
    venue_id: 'demo-venue-2',
    upc: '123456789012',
    status: 'new',
    created_at: now,
    updated_at: now,
  },
];

let demoDeposits: Deposit[] = [
  {
    id: 'demo-deposit-1',
    box_id: 'demo-box-1',
    amount_cents: 24000,
    note: 'Weekend pull',
    created_at: now,
  },
];

let demoPrizes: Prize[] = [
  {
    id: 'demo-prize-1',
    box_id: 'demo-box-1',
    amount_cents: 9000,
    note: 'Payout batch',
    created_at: now,
  },
];

let demoAuditEvents: AuditEvent[] = [
  {
    id: 'demo-audit-1',
    event_type: 'box_created',
    venue_id: 'demo-venue-1',
    box_id: 'demo-box-1',
    actor_email: 'demo@example.com',
    payload: { upc: '012345678905' },
    created_at: now,
  },
];

function nextId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function touchVenue(id: string) {
  const venue = demoVenues.find((item) => item.id === id);
  if (!venue) return;
  venue.updated_at = new Date().toISOString();
}

function addDemoAuditEvent(input: {
  event_type: AuditEvent['event_type'];
  venue_id: string | null;
  box_id: string | null;
  payload: any;
  actor_email?: string | null;
}) {
  const event: AuditEvent = {
    id: nextId('demo-audit'),
    event_type: input.event_type,
    venue_id: input.venue_id,
    box_id: input.box_id,
    actor_email: input.actor_email ?? 'demo@example.com',
    payload: input.payload ?? {},
    created_at: new Date().toISOString(),
  };
  demoAuditEvents = [event, ...demoAuditEvents];
  if (input.venue_id) touchVenue(input.venue_id);
  return event;
}

export function listDemoVenues() {
  return [...demoVenues].sort((a, b) => a.name.localeCompare(b.name));
}

export function getDemoVenue(id: string) {
  const venue = demoVenues.find((item) => item.id === id);
  if (!venue) {
    throw new Error('Demo venue not found.');
  }
  return venue;
}

export function createDemoVenue(input: { name: string; address?: string; notes?: string }) {
  const venue: Venue = {
    id: `demo-venue-${Date.now()}`,
    name: input.name,
    address: input.address ?? null,
    notes: input.notes ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  demoVenues = [venue, ...demoVenues];
  return venue;
}

export function updateDemoVenue(id: string, input: { name: string; address?: string | null; notes?: string | null }) {
  const venue = getDemoVenue(id);
  const updated: Venue = {
    ...venue,
    name: input.name,
    address: input.address ?? null,
    notes: input.notes ?? null,
    updated_at: new Date().toISOString(),
  };

  demoVenues = demoVenues.map((item) => (item.id === id ? updated : item));
  return updated;
}

export function listDemoReports(filters: { venueId?: string }) {
  if (!filters.venueId) return [...demoReports];
  return demoReports.filter((report) => report.venue_id === filters.venueId);
}

export function getOrCreateDemoBoxByVenueUpc(venueId: string, upc: string) {
  const existing = demoBoxes.find((item) => item.venue_id === venueId && item.upc === upc);
  if (existing) return existing;

  const box: Box = {
    id: nextId('demo-box'),
    venue_id: venueId,
    upc,
    status: 'new',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  demoBoxes = [box, ...demoBoxes];
  addDemoAuditEvent({
    event_type: 'box_created',
    venue_id: venueId,
    box_id: box.id,
    payload: { upc },
  });
  return box;
}

export function getDemoBox(id: string) {
  const box = demoBoxes.find((item) => item.id === id);
  if (!box) {
    throw new Error('Demo box not found.');
  }
  return box;
}

export function listDemoDeposits(boxId: string) {
  return demoDeposits
    .filter((item) => item.box_id === boxId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function listDemoPrizes(boxId: string) {
  return demoPrizes
    .filter((item) => item.box_id === boxId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function listDemoAuditEventsForBox(boxId: string) {
  return demoAuditEvents
    .filter((item) => item.box_id === boxId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function addDemoDeposit(boxId: string, venueId: string, amount_cents: number, note?: string) {
  const deposit: Deposit = {
    id: nextId('demo-deposit'),
    box_id: boxId,
    amount_cents,
    note: note ?? null,
    created_at: new Date().toISOString(),
  };
  demoDeposits = [deposit, ...demoDeposits];
  addDemoAuditEvent({
    event_type: 'deposit_added',
    venue_id: venueId,
    box_id: boxId,
    payload: { amount_cents, note: note ?? null },
  });
  return deposit;
}

export function addDemoPrize(boxId: string, venueId: string, amount_cents: number, note?: string) {
  const prize: Prize = {
    id: nextId('demo-prize'),
    box_id: boxId,
    amount_cents,
    note: note ?? null,
    created_at: new Date().toISOString(),
  };
  demoPrizes = [prize, ...demoPrizes];
  addDemoAuditEvent({
    event_type: 'prize_added',
    venue_id: venueId,
    box_id: boxId,
    payload: { amount_cents, note: note ?? null },
  });
  return prize;
}

export function setDemoBoxStatus(boxId: string, venueId: string, status: BoxStatus) {
  const box = getDemoBox(boxId);
  const updated: Box = {
    ...box,
    status,
    updated_at: new Date().toISOString(),
  };
  demoBoxes = demoBoxes.map((item) => (item.id === boxId ? updated : item));

  const event_type: AuditEvent['event_type'] =
    status === 'live' ? 'box_set_live' : status === 'closed' ? 'box_closed' : 'box_reopened';

  addDemoAuditEvent({
    event_type,
    venue_id: venueId,
    box_id: boxId,
    payload: { status },
  });
  return updated;
}

export function createDemoReportRow(input: {
  venue_id: string;
  box_id: string;
  type: 'closeout_pdf' | 'closeout_csv';
  storage_path: string;
  mime_type?: string;
}) {
  const report: Report = {
    id: nextId('demo-report'),
    venue_id: input.venue_id,
    box_id: input.box_id,
    type: input.type,
    storage_bucket: 'reports',
    storage_path: input.storage_path,
    mime_type: input.mime_type ?? null,
    created_at: new Date().toISOString(),
  };
  demoReports.unshift(report);
  return report;
}
