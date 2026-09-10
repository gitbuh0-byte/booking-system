-- Upgrade databases created with the original room/desk schema.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS seat_number TEXT;

UPDATE bookings
SET seat_number = '1'
WHERE seat_number IS NULL;

ALTER TABLE bookings ALTER COLUMN seat_number SET NOT NULL;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS no_overlapping_bookings;

ALTER TABLE bookings
    ADD CONSTRAINT no_overlapping_bookings EXCLUDE USING gist (
        resource_id WITH =,
        seat_number WITH =,
        tstzrange(starts_at, ends_at) WITH &&
    );

CREATE INDEX IF NOT EXISTS idx_bookings_resource_seat_time
    ON bookings (resource_id, seat_number, starts_at, ends_at);