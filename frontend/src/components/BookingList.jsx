import { useState } from 'react';
import { BUSES, getFleet } from '../data/buses.js';
import { api } from '../api.js';

function formatRange(startsAt, endsAt) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(start);
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time.format(start)}–${time.format(end)}`;
}

export default function BookingList({ bookings, onChanged, loading, loadError }) {
  const [expandedBus, setExpandedBus] = useState(null);

  async function handleCancel(id) {
    try { await api.cancelBooking(id); onChanged?.(); } catch (error) { onChanged?.(error); }
  }

  if (loading) return <div className="panel list-panel"><div className="loading-state"><span className="loader" />Loading seat chart</div></div>;
  if (loadError) return <div className="panel list-panel"><p className="status status-error">{loadError}</p></div>;

  return (
    <div className="panel list-panel">
      <div className="panel-heading panel-heading--list"><div><h2>Booked seats</h2></div></div>
      {BUSES.map((bus) => {
        const entries = bookings.filter((booking) => booking.bus_id === bus.id).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
        return (
          <div className="resource-block" key={bus.id}>
            <div className="resource-header"><div><h3 className="resource-name">{bus.label}</h3><span className="bus-destination">{getFleet(bus.fleetId).label} · {bus.destination}</span></div><button className="count-button" type="button" onClick={() => setExpandedBus(expandedBus === bus.id ? null : bus.id)} aria-expanded={expandedBus === bus.id}>{entries.length} {entries.length === 1 ? 'seat' : 'seats'}</button></div>
            {entries.length === 0 ? <p className="muted">No seats booked yet</p> : expandedBus === bus.id ? (
              <ul className="entry-list">{entries.map((booking) => (
                <li className="entry-row" key={booking.id}>
                  <div className="entry-who"><span className="seat-badge">{booking.seat_number}</span>{booking.booked_by}</div>
                  <span className="entry-when">{formatRange(booking.starts_at, booking.ends_at)}</span>
                  <button type="button" className="link-button" onClick={() => handleCancel(booking.id)} title="Remove booking">Remove</button>
                </li>
              ))}</ul>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
