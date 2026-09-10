import { BUSES } from './BookingForm.jsx';
import { api } from '../api.js';

function formatRange(startsAt, endsAt) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(start);
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time.format(start)}–${time.format(end)}`;
}

export default function BookingList({ bookings, onChanged, loading, loadError }) {
  async function handleCancel(id) {
    try { await api.cancelBooking(id); onChanged?.(); } catch (error) { onChanged?.(error); }
  }

  if (loading) return <div className="panel list-panel"><div className="loading-state"><span className="loader" />Loading seat chart</div></div>;
  if (loadError) return <div className="panel list-panel"><p className="status status-error">{loadError}</p></div>;

  return (
    <div className="panel list-panel">
      <div className="panel-heading panel-heading--list"><div><p className="eyebrow">Live manifest</p><h2>Booked seats</h2></div><span className="panel-index">02</span></div>
      {BUSES.map((bus) => {
        const entries = bookings.filter((booking) => booking.bus_id === bus.id).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
        return (
          <div className="resource-block" key={bus.id}>
            <div className="resource-header"><div><h3 className="resource-name">{bus.label}</h3><span className="bus-destination">{bus.destination}</span></div><span className="resource-id">{entries.length} {entries.length === 1 ? 'seat' : 'seats'}</span></div>
            {entries.length === 0 ? <p className="muted">No seats booked yet</p> : (
              <ul className="entry-list">{entries.map((booking) => (
                <li className="entry-row" key={booking.id}>
                  <div className="entry-who"><span className="seat-badge">{booking.seat_number}</span>{booking.booked_by}</div>
                  <span className="entry-when">{formatRange(booking.starts_at, booking.ends_at)}</span>
                  <button type="button" className="link-button" onClick={() => handleCancel(booking.id)} title="Remove booking">Remove</button>
                </li>
              ))}</ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
