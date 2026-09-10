# Booking desk

A small full-stack Kenyan bus seat booking system. Choose a route, select an
available passenger seat, and reserve it on one of three fixed fleet schedules.
Routes include Nairobi-Mombasa, Nairobi-Kisumu, Nairobi-Nakuru,
Nairobi-Eldoret, Nairobi-Malindi, and Nairobi-Nanyuki.

## Stack

- React and Vite frontend
- Node.js and Express API
- PostgreSQL with a GiST exclusion constraint for overlap protection

## Run locally

### 1. Connect Supabase

In Supabase, open your project and choose **Connect**. Copy the **Session
pooler** URI, then paste it into `backend/.env` as `DATABASE_URL`. The Session
pooler is a good local-development choice because it works reliably when your
network does not support direct IPv6 database connections.

```env
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
CORS_ORIGIN=http://localhost:5173
PORT=8080
```

Replace `<password>` and the other placeholders with the values from Supabase.
If the password contains characters such as `@`, `#`, `/`, or `:`, URL-encode
those characters in the connection string. Do not commit `backend/.env`.

Without `DATABASE_URL`, seat selection is visible but bookings cannot be
persisted.

The API can start without a database so the frontend remains available, but
booking endpoints return `503 Database is not configured` until
`DATABASE_URL` is set and the migration has run.

```bash
cd backend
npm install
npm run migrate
npm run dev
```

`npm run migrate` applies the seat schema and the database-level overlap
constraint. A successful health check reports `database: "connected"`.

The API runs at `http://localhost:8080`. Check it with:

```bash
curl http://localhost:8080/health
```

### 2. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`, choose a Kenyan route and passenger seat, then create or
remove bookings directly in the app. The driver's seat is never selectable;
each bus has 34 passenger seats.

### Live route panel

The app shows live route status and an Open in Google Maps directions link
without requiring any API key.

## API

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/bookings` | None | List all bookings |
| GET | `/api/buses` | None | List supported routes and passenger seats |
| GET | `/api/bookings?bus_id=bus-101` | None | Filter by bus |
| POST | `/api/bookings` | None | Create a booking |
| DELETE | `/api/bookings/:id` | None | Remove a booking |

Each route has a fixed boarding and arrival time returned by `/api/buses`;
passengers choose the travel date and seat, not custom times.

Create a booking with ISO 8601 timestamps:

```json
{
  "bus_id": "bus-101",
  "seat_number": "7",
  "starts_at": "2026-09-10T09:00:00Z",
  "ends_at": "2026-09-10T10:00:00Z",
  "booked_by": "jane@example.com"
}
```

An overlapping request for the same bus and seat returns `409 Conflict`. The
API performs a friendly range check inside a transaction, and PostgreSQL's
`no_overlapping_bookings` exclusion constraint is the final guard against
concurrent writes.

## Deployment

Deploy `backend` as a Node service on Render or Railway and set `DATABASE_URL`,
`CORS_ORIGIN`, and the platform-provided `PORT`. Run the migration
once against the production database. Deploy `frontend` as a Vite site on
Vercel or Netlify with `VITE_API_URL` set to the backend URL.