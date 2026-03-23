import { isDemoSessionActive, DEMO_EMAIL } from './auth';
import { createDemoVenue, getDemoVenue, listDemoReports, listDemoVenues, updateDemoVenue } from './demo-data';
import { getSupabaseOrThrow } from './supabase';
import type { AuditEventType, Box, BoxStatus, Deposit, Prize, Report, Venue } from './types';

export async function getCurrentUserEmail(): Promise<string | null> {
  if (await isDemoSessionActive()) {
    return DEMO_EMAIL;
  }
  const supabase = getSupabaseOrThrow();
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}

export async function listVenues(): Promise<Venue[]> {
  if (await isDemoSessionActive()) {
    return listDemoVenues();
  }
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data as Venue[];
}

export async function getVenue(id: string): Promise<Venue> {
  if (await isDemoSessionActive()) {
    return getDemoVenue(id);
  }
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase.from('venues').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Venue;
}

export async function createVenue(input: { name: string; address?: string; notes?: string }): Promise<Venue> {
  if (await isDemoSessionActive()) {
    return createDemoVenue(input);
  }
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from('venues')
    .insert({ name: input.name, address: input.address ?? null, notes: input.notes ?? null })
    .select('*')
    .single();
  if (error) throw error;

  await createAuditEvent({
    event_type: 'venue_created',
    venue_id: data.id,
    box_id: null,
    payload: { name: input.name },
  });

  return data as Venue;
}

export async function updateVenue(
  id: string,
  input: { name: string; address?: string | null; notes?: string | null }
): Promise<Venue> {
  if (await isDemoSessionActive()) {
    return updateDemoVenue(id, input);
  }
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from('venues')
    .update({ name: input.name, address: input.address ?? null, notes: input.notes ?? null })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Venue;
}

export async function getOrCreateBoxByVenueUpc(venueId: string, upc: string): Promise<Box> {
  const supabase = getSupabaseOrThrow();
  const { data: existing, error: selErr } = await supabase
    .from('boxes')
    .select('*')
    .eq('venue_id', venueId)
    .eq('upc', upc)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing as Box;

  const { data, error } = await supabase
    .from('boxes')
    .insert({ venue_id: venueId, upc, status: 'new' })
    .select('*')
    .single();
  if (error) throw error;

  await createAuditEvent({
    event_type: 'box_created',
    venue_id: venueId,
    box_id: data.id,
    payload: { upc },
  });

  return data as Box;
}

export async function getBox(boxId: string): Promise<Box> {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase.from('boxes').select('*').eq('id', boxId).single();
  if (error) throw error;
  return data as Box;
}

export async function listDeposits(boxId: string): Promise<Deposit[]> {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from('deposits')
    .select('*')
    .eq('box_id', boxId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Deposit[];
}

export async function listPrizes(boxId: string): Promise<Prize[]> {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from('prizes')
    .select('*')
    .eq('box_id', boxId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Prize[];
}

export async function listAuditEventsForBox(boxId: string) {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from('audit_events')
    .select('*')
    .eq('box_id', boxId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data as any[];
}

export async function addDeposit(boxId: string, venueId: string, amountDollars: number, note?: string) {
  const amount_cents = Math.round(amountDollars * 100);
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from('deposits')
    .insert({ box_id: boxId, amount_cents, note: note ?? null })
    .select('*')
    .single();
  if (error) throw error;

  await createAuditEvent({
    event_type: 'deposit_added',
    venue_id: venueId,
    box_id: boxId,
    payload: { amount_cents, note: note ?? null },
  });

  return data as Deposit;
}

export async function addPrize(boxId: string, venueId: string, amountDollars: number, note?: string) {
  const amount_cents = Math.round(amountDollars * 100);
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from('prizes')
    .insert({ box_id: boxId, amount_cents, note: note ?? null })
    .select('*')
    .single();
  if (error) throw error;

  await createAuditEvent({
    event_type: 'prize_added',
    venue_id: venueId,
    box_id: boxId,
    payload: { amount_cents, note: note ?? null },
  });

  return data as Prize;
}

export async function setBoxStatus(boxId: string, venueId: string, status: BoxStatus) {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from('boxes')
    .update({ status })
    .eq('id', boxId)
    .select('*')
    .single();
  if (error) throw error;

  const event_type: AuditEventType =
    status === 'live' ? 'box_set_live' : status === 'closed' ? 'box_closed' : 'box_reopened';

  await createAuditEvent({
    event_type,
    venue_id: venueId,
    box_id: boxId,
    payload: { status },
  });

  return data as Box;
}

export async function createAuditEvent(input: {
  event_type: AuditEventType;
  venue_id: string | null;
  box_id: string | null;
  payload: any;
}) {
  const actor_email = await getCurrentUserEmail();
  const supabase = getSupabaseOrThrow();
  const { error } = await supabase.from('audit_events').insert({
    event_type: input.event_type,
    venue_id: input.venue_id,
    box_id: input.box_id,
    actor_email,
    payload: input.payload ?? {},
  });
  if (error) throw error;
}

export async function createReportRow(input: {
  venue_id: string;
  box_id: string;
  type: 'closeout_pdf' | 'closeout_csv';
  storage_path: string;
  mime_type?: string;
}) {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from('reports')
    .insert({
      venue_id: input.venue_id,
      box_id: input.box_id,
      type: input.type,
      storage_bucket: 'reports',
      storage_path: input.storage_path,
      mime_type: input.mime_type ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Report;
}

export async function listReports(filters: { venueId?: string; from?: string; to?: string }): Promise<Report[]> {
  if (await isDemoSessionActive()) {
    return listDemoReports(filters);
  }
  const supabase = getSupabaseOrThrow();
  let q = supabase.from('reports').select('*').order('created_at', { ascending: false });
  if (filters.venueId) q = q.eq('venue_id', filters.venueId);
  if (filters.from) q = q.gte('created_at', filters.from);
  if (filters.to) q = q.lte('created_at', filters.to);
  const { data, error } = await q;
  if (error) throw error;
  return data as Report[];
}

export async function getSignedReportUrl(bucket: string, path: string, expiresSec = 60 * 60) {
  if (await isDemoSessionActive()) {
    return `https://example.com/${bucket}/${path}?expires=${expiresSec}`;
  }
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresSec);
  if (error) throw error;
  return data.signedUrl;
}
