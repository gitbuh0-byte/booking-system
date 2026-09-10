import { Router } from 'express';
import { databaseConfigured, pool } from '../db.js';
import { findBus, PASSENGER_SEAT_COUNT } from '../domain/buses.js';
import { findConflict } from '../lib/conflictCheck.js';

export const bookingsRouter = Router();

const bookingFields = ['bus_id', 'seat_number', 'starts_at', 'ends_at', 'booked_by'];

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function requireDatabase(req, res, next) {
  if (!databaseConfigured) {
    return res.status(503).json({
      error: 'Booking storage is not connected. Add your Supabase DATABASE_URL to backend/.env, run npm run migrate, then restart the app.',
    });
  }

  return next();
}

// GET /api/bookings?bus_id=bus-101
// Public read — no API key required, matches "respond to input" for a
// lightweight demo where anyone can view availability.
bookingsRouter.get('/', requireDatabase, async (req, res) => {
  const busId = cleanText(req.query.bus_id);

  try {
    const { rows } = busId
      ? await pool.query(
          `SELECT id, resource_id AS bus_id, seat_number, starts_at, ends_at, booked_by, created_at
           FROM bookings WHERE resource_id = $1 ORDER BY starts_at ASC`,
          [busId]
        )
      : await pool.query(
          `SELECT id, resource_id AS bus_id, seat_number, starts_at, ends_at, booked_by, created_at
           FROM bookings ORDER BY starts_at ASC, resource_id ASC, seat_number ASC`
        );

    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch bookings.' });
  }
});

// POST /api/bookings
// Validates input, checks for a conflicting booking, and inserts if clear.
bookingsRouter.post('/', requireDatabase, async (req, res) => {
  const body = req.body ?? {};
  const bus_id = cleanText(body.bus_id);
  const seat_number = cleanText(body.seat_number);
  const starts_at = cleanText(body.starts_at);
  const ends_at = cleanText(body.ends_at);
  const booked_by = cleanText(body.booked_by);

  if (bookingFields.some((field) => !cleanText(body[field]))) {
    return res.status(400).json({
      error: 'bus_id, seat_number, starts_at, ends_at, and booked_by are all required.',
    });
  }

  if (bus_id.length > 120 || seat_number.length > 10 || booked_by.length > 160) {
    return res.status(400).json({ error: 'Bus, seat, and name fields are too long.' });
  }

  if (!findBus(bus_id)) {
    return res.status(400).json({ error: 'Choose a supported bus route.' });
  }

  if (!/^\d+$/.test(seat_number) || Number(seat_number) < 1 || Number(seat_number) > PASSENGER_SEAT_COUNT) {
    return res.status(400).json({ error: 'Choose a valid passenger seat.' });
  }

  const start = new Date(starts_at);
  const end = new Date(ends_at);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return res.status(400).json({ error: 'starts_at and ends_at must be valid ISO 8601 timestamps.' });
  }

  if (end <= start) {
    return res.status(400).json({ error: 'ends_at must be after starts_at.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const conflict = await findConflict(client, {
      resourceId: bus_id,
      seatNumber: seat_number,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
    });

    if (conflict) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: `Seat ${seat_number} on this bus is already booked for part of that time range.`,
        conflicting_booking: conflict,
      });
    }

    const { rows } = await client.query(
        `INSERT INTO bookings (resource_id, seat_number, starts_at, ends_at, booked_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, resource_id AS bus_id, seat_number, starts_at, ends_at, booked_by, created_at`,
      [bus_id, seat_number, start.toISOString(), end.toISOString(), booked_by]
    );

    await client.query('COMMIT');
    return res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');

    // 23P01 = exclusion_violation. Belt-and-braces catch in case two
    // requests raced past the application-level check above at the same
    // instant — the database constraint is the final word.
    if (err.code === '23P01') {
      return res.status(409).json({
        error: `Seat ${seat_number} on this bus is already booked for part of that time range.`,
      });
    }

    console.error(err);
    return res.status(500).json({ error: 'Failed to create booking.' });
  } finally {
    client.release();
  }
});

// DELETE /api/bookings/:id
// Removes a booking by id.
bookingsRouter.delete('/:id', requireDatabase, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'id must be an integer.' });
  }

  try {
    const { rowCount } = await pool.query('DELETE FROM bookings WHERE id = $1', [id]);

    if (rowCount === 0) {
      return res.status(404).json({ error: `No booking with id ${id}.` });
    }

    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to cancel booking.' });
  }
});
