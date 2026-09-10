import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { databaseConfigured } from './db.js';
import { BUS_ROUTES, PASSENGER_SEATS } from './domain/buses.js';
import { bookingsRouter } from './routes/bookings.js';

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));
app.use(express.json({ limit: '20kb' }));

app.get('/health', (req, res) => {
  res.status(databaseConfigured ? 200 : 503).json({
    status: databaseConfigured ? 'ok' : 'degraded',
    service: 'booking-api',
    database: databaseConfigured ? 'configured' : 'not_configured',
  });
});

app.get('/api/buses', (req, res) => {
  res.json(BUS_ROUTES.map((bus) => ({
    ...bus,
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
