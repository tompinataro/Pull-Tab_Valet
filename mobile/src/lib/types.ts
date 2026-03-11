export type Venue = {
  id: string;
  name: string;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BoxStatus = 'new' | 'live' | 'closed';

export type Box = {
  id: string;
  venue_id: string;
  upc: string;
  status: BoxStatus;
  created_at: string;
  updated_at: string;
};

export type Deposit = {
  id: string;
  box_id: string;
  amount_cents: number;
  note: string | null;
  created_at: string;
};

export type Prize = {
  id: string;
  box_id: string;
  amount_cents: number;
  note: string | null;
  created_at: string;
};

export type AuditEventType =
  | 'venue_created'
  | 'box_created'
  | 'box_set_live'
  | 'deposit_added'
  | 'prize_added'
  | 'box_closed'
  | 'box_reopened';

export type AuditEvent = {
  id: string;
  event_type: AuditEventType;
  venue_id: string | null;
  box_id: string | null;
  actor_email: string | null;
  payload: any;
  created_at: string;
};

export type ReportType = 'closeout_pdf' | 'closeout_csv';

export type Report = {
  id: string;
  venue_id: string;
  box_id: string;
  type: ReportType;
  storage_bucket: string;
  storage_path: string;
  mime_type: string | null;
  created_at: string;
};
