# Product/Engineering Spec (Audit Log + Offline Sync)

This document defines the minimum behaviors and acceptance criteria for **audit logging** and **offline-first sync**.

## 0. Scope

**In scope (v0):**
- Audit log event model and recording rules
- Offline edits queueing + sync protocol expectations
- Conflict handling policy (initial)

**Out of scope (v0):**
- Admin dashboards and advanced analytics
- Full-text search of audit history
- Cross-organization data portability (unless explicitly required)

## 1. Definitions

- **Entity**: a record in the domain model (e.g., Vehicle, Ticket, Customer — update as real model emerges).
- **Audit Event**: an immutable record describing a meaningful change or action.
- **Actor**: user/service performing an action.
- **Client**: mobile/web app instance; may be offline.
- **Sync**: process of reconciling client local state with server state.
- **Tombstone**: marker indicating a delete (used to sync deletions).

## 2. Audit Log

### 2.1 When to record events

Record an audit event for:
- Create / update / delete of any user-facing entity
- Authentication / authorization relevant actions (optional for v0; clarify)
- Sync conflict outcomes (e.g., "local update rejected", "merged")

### 2.2 Required fields (minimum)

Each audit event MUST contain:
- `event_id` (globally unique; UUID/ULID)
- `event_type` (e.g., `entity.created`, `entity.updated`, `entity.deleted`, `sync.conflict`)
- `entity_type`
- `entity_id`
- `actor_id` (or `actor_type` + `actor_id`)
- `occurred_at` (server-received timestamp)
- `client_occurred_at` (optional; client time for UX display, may be skewed)
- `client_id` / `device_id` (optional but recommended)
- `metadata` (free-form JSON for context)

For updates, strongly recommended:
- `changed_fields` (list)
- either `before`/`after` snapshots (bounded), or a patch/diff representation

### 2.3 Immutability + corrections

- Audit events are **append-only**.
- If something must be corrected, write a **new** event that references the prior `event_id` (e.g., `event.corrected`).

### 2.4 Ordering + querying

- Server stores events in a deterministic order (e.g., by `occurred_at`, then `event_id`).
- Queries must support:
  - by `entity_type + entity_id`
  - by time range
  - pagination

## 3. Offline Sync

### 3.1 Local-first behavior

- The client SHOULD allow viewing cached data when offline.
- The client SHOULD allow creating/editing entities offline when safe.
- Offline edits are written to a **local outbox** and applied optimistically to local state.

### 3.2 Identity / IDs

- Client-generated IDs MUST be globally unique (UUID/ULID).
- Client MUST be able to retry safely without creating duplicates.

### 3.3 Sync model (high level)

A simple model that works well:

- **Outbox push**: client sends queued operations/events to server.
- **Inbox pull**: client fetches server changes since a cursor.

Server SHOULD expose:
- a **cursor-based** delta endpoint (monotonic cursor)
- idempotent write endpoints (accept `operation_id` / `event_id`)

### 3.4 Conflict handling (initial policy)

Pick one of these (defaulting to the simplest workable rule until overridden):

- **LWW (Last Write Wins)** based on server-received time, with audit entries describing overwrites.
- **Merge rules** per-field for specific entities (more complex, better UX).

For v0, default:
- Use **LWW** at the entity level unless a field-level merge is explicitly required.
- When a conflict occurs, the server MUST:
  - choose a winner deterministically
  - record an audit event describing the outcome

### 3.5 Deletes

- Deletes are represented as **tombstones** so they replicate to offline clients.
- Client MUST not resurrect deleted entities unless an explicit "restore" action exists.

### 3.6 Retries, backoff, and idempotency

- Client retries failed sync with exponential backoff.
- Server endpoints handling writes MUST be idempotent.
- Duplicate submissions of the same operation MUST NOT create duplicate entities or duplicate audit events.

### 3.7 Edge cases

- Clock skew: client time is advisory only.
- Partial failure: batch uploads can partially succeed; client reconciles per-operation.
- Large backlog: sync supports pagination and chunked uploads.

## 4. Acceptance Criteria (v0)

Audit log:
- [ ] Every create/update/delete produces an audit event.
- [ ] Events are queryable by entity id and paginated.
- [ ] Events are append-only (no mutation).

Offline sync:
- [ ] User can make changes offline; changes appear locally immediately.
- [ ] When connectivity returns, queued changes sync automatically.
- [ ] Conflicts resolve deterministically (LWW by default) and produce an audit event.
- [ ] Retries are safe (idempotent) and do not duplicate records.

