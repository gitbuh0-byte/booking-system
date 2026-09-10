-- Enables using bus and seat equality columns inside a GIST exclusion constraint.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS bookings (
    id          SERIAL PRIMARY KEY,
    resource_id TEXT        NOT NULL, -- internal storage for the public bus_id
    seat_number TEXT        NOT NULL,
    starts_at   TIMESTAMPTZ NOT NULL,
    ends_at     TIMESTAMPTZ NOT NULL,
    booked_by   TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT valid_range CHECK (ends_at > starts_at),

    -- Belt-and-braces: the database itself refuses two overlapping bookings
    -- for the same resource, even under concurrent requests. This is the
    -- real backstop; the application-level check in conflictCheck.js exists
    -- to return a friendly 409 instead of a raw constraint-violation error.
    CONSTRAINT no_overlapping_bookings EXCLUDE USING gist (
        resource_id WITH =,
        seat_number WITH =,
        tstzrange(starts_at, ends_at) WITH &&
    )
);

CREATE INDEX IF NOT EXISTS idx_bookings_resource_time
    ON bookings (resource_id, seat_number, starts_at, ends_at);
