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
        <a className="brand" href="/" aria-label="my kenyan bus routes ticketing system home">
          <span>my kenyan bus routes ticketing system</span>
        </a>
      </header>

      <main className="page">
        <section className="workspace">
          <BookingForm bookings={bookings} onBooked={refresh} />
          <div className="booking-column">
            <BookingList bookings={bookings} onChanged={refresh} loading={loading} loadError={loadError} />
          </div>
        </section>
      </main>

    </div>
  );
}
