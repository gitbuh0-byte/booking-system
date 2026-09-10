import { useMemo, useState } from 'react';
import { api } from '../api.js';

export const BUSES = [
  { id: 'bus-101', label: 'Nairobi - Mombasa', destination: 'Nairobi CBD - Mombasa' },
  { id: 'bus-202', label: 'Nairobi - Kisumu', destination: 'Nairobi CBD - Kisumu' },
  { id: 'bus-303', label: 'Nairobi - Nakuru', destination: 'Nairobi CBD - Nakuru' },
  { id: 'bus-404', label: 'Nairobi - Eldoret', destination: 'Nairobi CBD - Eldoret' },
  { id: 'bus-505', label: 'Nairobi - Malindi', destination: 'Nairobi CBD - Malindi' },
  { id: 'bus-606', label: 'Nairobi - Nanyuki', destination: 'Nairobi CBD - Nanyuki' },
];

const PASSENGER_SEATS = Array.from({ length: 34 }, (_, index) => String(index + 1));
const emptyForm = {
  bus_id: BUSES[0].id,
  seat_number: '',
  date: new Date().toISOString().slice(0, 10),
  startTime: '',
  endTime: '',
  booked_by: '',
};

function overlaps(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

export default function BookingForm({ bookings, onBooked }) {
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  const selectedRange = useMemo(() => {
    if (!form.date || !form.startTime || !form.endTime) return null;
    const start = new Date(`${form.date}T${form.startTime}`);
    const end = new Date(`${form.date}T${form.endTime}`);
    return Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) ? null : { start, end };
  }, [form.date, form.startTime, form.endTime]);

  function update(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
      seat_number: field === 'bus_id' || field === 'date' ? '' : current.seat_number,
    }));
  }

  function isBooked(seatNumber) {
    if (!selectedRange) return false;
    return bookings.some((booking) => {
      if (booking.bus_id !== form.bus_id || String(booking.seat_number) !== seatNumber) return false;
      const start = new Date(booking.starts_at);
      const end = new Date(booking.ends_at);
      return start.toDateString() === selectedRange.start.toDateString()
        && overlaps(selectedRange.start, selectedRange.end, start, end);
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.seat_number) {
      setStatus({ state: 'error', message: 'Choose an available passenger seat.' });
      return;
    }
    if (!form.date || !form.startTime || !form.endTime || !form.booked_by.trim()) {
      setStatus({ state: 'error', message: 'Fill in every field.' });
      return;
    }

    const startsAt = new Date(`${form.date}T${form.startTime}`);
    const endsAt = new Date(`${form.date}T${form.endTime}`);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      setStatus({ state: 'error', message: 'Choose an arrival time after boarding.' });
      return;
    }
    if (isBooked(form.seat_number)) {
      setStatus({ state: 'error', message: `Seat ${form.seat_number} is already booked for that time.` });
      return;
    }

    setStatus({ state: 'loading', message: '' });
    try {
      await api.createBooking({
        bus_id: form.bus_id,
        seat_number: form.seat_number,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        booked_by: form.booked_by.trim(),
      });
      setStatus({ state: 'success', message: `Seat ${form.seat_number} is booked.` });
      setForm((current) => ({ ...emptyForm, bus_id: current.bus_id, date: current.date }));
      onBooked?.();
    } catch (error) {
      setStatus({ state: 'error', message: error.message });
    }
  }

  return (
    <form className="panel booking-form" onSubmit={handleSubmit}>
      <div className="panel-heading">
        <div><p className="eyebrow">New reservation</p><h2>Choose your seat</h2></div>
        <span className="panel-index">01</span>
      </div>

      <label className="field">
        <span>Bus route</span>
        <select value={form.bus_id} onChange={(event) => update('bus_id', event.target.value)}>
          {BUSES.map((bus) => <option key={bus.id} value={bus.id}>{bus.label} / {bus.destination}</option>)}
        </select>
      </label>

      <div className="seat-map-label"><span>Passenger seats</span><span className="seat-hint">Driver seat unavailable</span></div>
      <div className="seat-map" aria-label="Bus seat map">
        <div className="bus-cabin">
          <div className="driver-seat" aria-label="Driver seat, unavailable"><span>DRIVER</span><strong>--</strong></div>
        </div>
        <div className="seat-grid">
          {PASSENGER_SEATS.map((seat) => {
            const booked = isBooked(seat);
            const selected = form.seat_number === seat;
            return (
              <button
                className={`seat ${booked ? 'seat--booked' : ''} ${selected ? 'seat--selected' : ''}`}
                disabled={booked}
                key={seat}
                onClick={() => update('seat_number', seat)}
                type="button"
                aria-label={`Seat ${seat}${booked ? ', booked' : ''}`}
              >{seat}</button>
            );
          })}
        </div>
      </div>
      <div className="seat-legend"><span><i className="legend-swatch legend-swatch--open" />Available</span><span><i className="legend-swatch legend-swatch--selected" />Selected</span><span><i className="legend-swatch legend-swatch--booked" />Booked</span></div>
      <p className="selected-seat" aria-live="polite">
        {form.seat_number ? `Seat ${form.seat_number} selected` : 'Select a passenger seat to continue'}
      </p>

      <div className="field-row">
        <label className="field"><span>Date</span><input type="date" value={form.date} onChange={(event) => update('date', event.target.value)} /></label>
        <label className="field"><span>Your name</span><input type="text" placeholder="Name or email" value={form.booked_by} onChange={(event) => update('booked_by', event.target.value)} /></label>
      </div>
      <div className="field-row">
        <label className="field"><span>Boarding time</span><input type="time" value={form.startTime} onChange={(event) => update('startTime', event.target.value)} /></label>
        <label className="field"><span>Arrival time</span><input type="time" value={form.endTime} onChange={(event) => update('endTime', event.target.value)} /></label>
      </div>

      <button className="primary-button" type="submit" disabled={status.state === 'loading'}>
        <span>{status.state === 'loading' ? 'Saving ticket' : 'Book seat'}</span><span aria-hidden="true">-&gt;</span>
      </button>
      {status.state !== 'idle' && status.state !== 'loading' && <p className={`status status-${status.state}`} role="status">{status.message}</p>}
    </form>
  );
}
