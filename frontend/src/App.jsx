import { useCallback, useEffect, useState } from 'react';
import BookingForm from './components/BookingForm.jsx';
import BookingList from './components/BookingList.jsx';
import { api } from './api.js';

export default function App() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await api.listBookings();
      setBookings(data);
      setLastUpdated(new Date());
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Bus booking home">
          <span className="brand-mark">BB</span>
          <span>Bus booking</span>
        </a>
        <div className="connection-state"><span className="status-dot" />Live availability</div>
      </header>

      <main className="page">
        <section className="intro">
          <div>
            <p className="eyebrow">Transit / Seat map</p>
            <h1>Your seat is waiting.</h1>
            <p className="subtitle">Choose a route, pick an open passenger seat, and keep your journey together from boarding to arrival.</p>
          </div>
          <div className="intro-meta">
            <span className="meta-label">{bookings.length} active {bookings.length === 1 ? 'booking' : 'bookings'}</span>
            <span className="meta-value">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Loading schedule'}</span>
          </div>
        </section>

        <section className="workspace">
          <BookingForm bookings={bookings} onBooked={refresh} />
          <BookingList bookings={bookings} onChanged={refresh} loading={loading} loadError={loadError} />
        </section>
      </main>

      <footer className="footer">Driver seat is reserved. All times shown in your local timezone.</footer>
    </div>
  );
}
