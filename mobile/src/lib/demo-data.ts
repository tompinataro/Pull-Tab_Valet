import type { Report, Venue } from './types';

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
