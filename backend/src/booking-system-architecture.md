# Booking System — Architecture

## 1. Scope

A small but real booking feature:
- Create a booking for a passenger seat on a Kenyan bus route with a start/end time.
- Reject bookings that overlap an existing one for the same resource (conflict check).
- List/view bookings.
- Keep the booking flow simple and direct for the demo.
- Deployed live: a frontend the user can click through, and a backend it talks to.

Deliberately out of scope: user accounts/OAuth, payments, recurring bookings, timezones beyond UTC. These are easy "if we had more time" talking points, not things to build now.

---

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React (Vite) | Fast to scaffold, deploys trivially as static files |
| Backend | Node.js + Express (or FastAPI if you prefer Python) | Minimal boilerplate, easy to reason about for a small API |
| Database | PostgreSQL (via Supabase or Neon free tier) | Real relational DB, supports the range-overlap query cleanly; SQLite is fine too if you want zero external deps |
| Auth | Static API key in a header | "Simple" per the brief — no need for JWT/OAuth complexity |
| Frontend hosting | Vercel or Netlify | Free, git-push-to-deploy |
| Backend hosting | Render or Railway | Free tier, git-push-to-deploy, supports long-running Node process |

Everything here has a generous free tier, so the whole thing costs $0 to run for a demo.

---

## 3. Data model

```sql
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    resource_id TEXT NOT NULL,       -- e.g. "room-a", "desk-3"
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    booked_by TEXT NOT NULL,         -- free-text name/email, no auth system needed
    created_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT valid_range CHECK (ends_at > starts_at)
);

CREATE INDEX idx_bookings_resource_time ON bookings (resource_id, starts_at, ends_at);
```

The index matters: every conflict check is a range query on `(resource_id, starts_at, ends_at)`, so this keeps it fast even as bookings grow.

---

## 4. Conflict-check logic (the "real logic" part)

Two time ranges `[A_start, A_end)` and `[B_start, B_end)` overlap if:

```
A_start < B_end  AND  A_end > B_start
```

So before inserting a new booking, run:

```sql
SELECT 1 FROM bookings
WHERE resource_id = $1
  AND starts_at < $3   -- new booking's ends_at
  AND ends_at   > $2   -- new booking's starts_at
LIMIT 1;
```

If this returns a row → reject with `409 Conflict`. If not → insert.

**Important detail to get right:** do the check-then-insert inside a single DB transaction (or use a unique constraint / exclusion constraint) to avoid a race condition where two requests slip past the check at the same time. Postgres has a purpose-built tool for this:

```sql
ALTER TABLE bookings ADD CONSTRAINT no_overlap
EXCLUDE USING gist (
  resource_id WITH =,
  tstzrange(starts_at, ends_at) WITH &&
);
```

This requires the `btree_gist` extension but makes the conflict check *database-enforced*, not just application-enforced — a nice detail if you want to show depth.

---

## 5. API design

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/bookings?bus_id=bus-101` | none | List bookings, optionally filtered by bus |
| `POST` | `/api/bookings` | none | Create booking; 409 on conflict |
| `DELETE` | `/api/bookings/:id` | none | Cancel a booking |

`POST /api/bookings` request/response:

```json
// Request
{
  "bus_id": "bus-101",
  "seat_number": "7",
  "starts_at": "2026-09-10T09:00:00Z",
  "ends_at": "2026-09-10T10:00:00Z",
  "booked_by": "jane@example.com"
}

// 201 Created
{ "id": 42, "resource_id": "room-a", "starts_at": "...", "ends_at": "...", "booked_by": "..." }

// 409 Conflict
{ "error": "This resource is already booked for part of that time range." }
```

---

## 6. Frontend

Minimal, three views:
1. **Booking form** — resource, date/time range, name → calls `POST /api/bookings`, shows the conflict error inline if it comes back.
2. **Bookings list** — calls `GET /api/bookings`, grouped by resource, with a cancel button (calls `DELETE`).
3. Direct create and cancel actions for the demo; deployment access controls can be added later if needed.

---

## 7. Deployment architecture

```
┌─────────────────┐        HTTPS         ┌──────────────────┐        ┌──────────────┐
│  React frontend   │ ───────────────────► │  Express backend  │ ─────► │  PostgreSQL   │
│  (Vercel/Netlify) │ ◄─────────────────── │  (Render/Railway) │ ◄───── │ (Neon/Supabase)│
└─────────────────┘     JSON over REST    └──────────────────┘        └──────────────┘
```

- Frontend build (`npm run build`) auto-deploys on git push to Vercel/Netlify.
- Backend auto-deploys on git push to Render/Railway; env vars (`DATABASE_URL`, `CORS_ORIGIN`) set in their dashboard, never committed.
- CORS on the backend restricted to the deployed frontend origin.
- Database migrations run once via a `migrate.sql` script or a tiny migration tool (e.g. `node-pg-migrate`) — even one file is enough to show you thought about schema management.

---

## 8. Suggested repo structure

```
booking-system/
├── backend/
│   ├── src/
│   │   ├── index.js          # Express app entry
│   │   ├── db.js             # pg pool setup
│   │   ├── routes/bookings.js
│   │   ├── middleware/
│   │   └── lib/conflictCheck.js
│   ├── migrations/001_init.sql
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/BookingForm.jsx
│   │   ├── components/BookingList.jsx
│   │   └── api.js            # fetch wrapper for the booking REST API
│   └── package.json
└── README.md
```

---

## 9. What this demonstrates (useful to call out if this is an evaluated task)

- **Real logic**: conflict detection isn't a trivial CRUD op — it's a range-overlap query with a race-condition-safe DB constraint.
- **Storage**: relational schema with a constraint that encodes a business rule at the DB layer, not just in application code.
- **Input handling**: validation (`ends_at > starts_at`), structured error responses, proper HTTP status codes (401/409).
- **Access**: intentionally open for this small demo; the database remains the source of truth for booking rules.
- **Deployment**: two independently deployed, communicating services — not a single localhost demo.

---

## 10. Fast path to build this

1. Scaffold backend, write the `bookings` table + exclusion constraint.
2. Implement `POST`/`GET`/`DELETE` with validation and conflict handling.
3. Deploy backend first, confirm with `curl`.
4. Scaffold frontend, point it at the deployed backend URL.
5. Deploy frontend.
6. Test the conflict case end-to-end (book the same slot twice).

This order matters: get the backend live and curl-able before touching the frontend, so you're never debugging two moving deploys at once.
