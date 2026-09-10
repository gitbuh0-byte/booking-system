import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { databaseConfigured, pool } from './db.js';
import { BUS_ROUTES, FLEETS, PASSENGER_SEATS } from './domain/buses.js';
import { bookingsRouter } from './routes/bookings.js';

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));
app.use(express.json({ limit: '20kb' }));

app.get('/health', async (req, res) => {
  if (!databaseConfigured) {
    return res.status(503).json({ status: 'degraded', service: 'booking-api', database: 'not_configured' });
  }

  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok', service: 'booking-api', database: 'connected' });
  } catch (error) {
    console.error('Database health check failed:', error.message);
    return res.status(503).json({ status: 'degraded', service: 'booking-api', database: 'unreachable' });
  }
});

app.get('/api/buses', (req, res) => {
  res.json(BUS_ROUTES.map((bus) => ({
    ...bus,
    fleet: FLEETS.find((fleet) => fleet.id === bus.fleet_id) ?? null,
    driver_seat: null,
    passenger_seats: PASSENGER_SEATS,
  })));
});

app.use('/api/bookings', bookingsRouter);

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Request body must be valid JSON.' });
  }

  console.error(err);
  return res.status(500).json({ error: 'Unexpected server error.' });
});

const port = Number(process.env.PORT) || 8080;

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Booking API listening on port ${port}`);
  });
}

export { app };
