import { useMemo, useState } from 'react';
import { api } from '../api.js';
import { BUSES, FLEETS, getFleet } from '../data/buses.js';

const PASSENGER_SEATS = Array.from({ length: 34 }, (_, index) => String(index + 1));
const emptyForm = {
  fleet_id: FLEETS[0].id,
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
  const [receipt, setReceipt] = useState(null);
  const [receiptDownloaded, setReceiptDownloaded] = useState(false);

  const selectedFleet = getFleet(form.fleet_id);
  const selectedBus = BUSES.find((bus) => bus.id === form.bus_id) ?? BUSES[0];

  function getSchedule() {
    const start = new Date(`${form.date}T${selectedFleet.boardingTime}`);
    const end = new Date(`${form.date}T${selectedFleet.arrivalTime}`);
    if (selectedFleet.arrivesNextDay) end.setDate(end.getDate() + 1);
    return { start, end };
  }

  const selectedRange = useMemo(() => {
    if (!form.date) return null;
    const { start, end } = getSchedule();
    return Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) ? null : { start, end };
  }, [form.date, selectedFleet]);

  function fleetIsFull(fleetId) {
    const bus = BUSES.find((item) => item.id === form.bus_id) ?? BUSES[0];
    const fleet = getFleet(bus.fleetId);
    const { start, end } = getScheduleForFleet(fleet);
    if (end <= new Date()) return false;

    const bookedSeats = bookings.filter((booking) => {
      if (booking.bus_id !== bus.id) return false;
      const bookingStart = new Date(booking.starts_at);
      const bookingEnd = new Date(booking.ends_at);
      return overlaps(start, end, bookingStart, bookingEnd);
    });

    return new Set(bookedSeats.map((booking) => booking.seat_number)).size >= PASSENGER_SEATS.length;
  }

  function getScheduleForFleet(fleet) {
    const start = new Date(`${form.date}T${fleet.boardingTime}`);
    const end = new Date(`${form.date}T${fleet.arrivalTime}`);
    if (fleet.arrivesNextDay) end.setDate(end.getDate() + 1);
    return { start, end };
  }

  function update(field, value) {
    setForm((current) => {
      if (field === 'fleet_id') {
        const firstBusForFleet = BUSES.find((bus) => bus.fleetId === value) ?? BUSES[0];
        return {
          ...current,
          fleet_id: value,
          bus_id: firstBusForFleet.id,
          seat_number: '',
        };
      }

      if (field === 'bus_id') {
        const selectedRoute = BUSES.find((bus) => bus.id === value) ?? BUSES[0];
        return {
          ...current,
          bus_id: value,
          fleet_id: selectedRoute.fleetId,
          seat_number: '',
        };
      }

      return {
        ...current,
        [field]: value,
      };
    });
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
    if (!form.date || !form.booked_by.trim()) {
      setStatus({ state: 'error', message: 'Fill in every field.' });
      return;
    }

    if (fleetIsFull(form.fleet_id)) {
      setStatus({ state: 'error', message: `${selectedBus.label} is fully booked until arrival.` });
      return;
    }

    const { start: startsAt, end: endsAt } = getSchedule();
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      setStatus({ state: 'error', message: 'This route has an invalid fixed schedule.' });
      return;
    }
    if (isBooked(form.seat_number)) {
      setStatus({ state: 'error', message: `Seat ${form.seat_number} is already booked for that time.` });
      return;
    }

    setStatus({ state: 'loading', message: '' });
    try {
      const booking = await api.createBooking({
        bus_id: form.bus_id,
        seat_number: form.seat_number,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        booked_by: form.booked_by.trim(),
      });
      setReceipt(booking);
      setReceiptDownloaded(false);
      setStatus({ state: 'idle', message: '' });
      setForm((current) => ({ ...emptyForm, fleet_id: current.fleet_id, bus_id: current.bus_id, date: current.date }));
      onBooked?.();
    } catch (error) {
      setStatus({ state: 'error', message: error.message });
    }
  }

  function downloadReceipt() {
    if (!receipt || receiptDownloaded) return;
    const bus = BUSES.find((item) => item.id === receipt.bus_id) ?? selectedBus;
    const receiptLines = [
      'BUS BOOKING RECEIPT',
      '-------------------',
      `Route: ${bus.label}`,
      `Journey: ${bus.destination}`,
      `Date: ${new Date(receipt.starts_at).toLocaleDateString()}`,
      `Boarding: ${new Date(receipt.starts_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
      `Arrival: ${new Date(receipt.ends_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
      `Seat: ${receipt.seat_number}`,
      `Passenger: ${receipt.booked_by}`,
      `Booking ID: ${receipt.id}`,
    ];

    const escapePdfText = (value) => value
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[^\x20-\x7E]/g, '?');
    const commands = [
      'BT',
      '/F1 18 Tf',
      '50 760 Td',
      `(${escapePdfText(receiptLines[0])}) Tj`,
      '/F1 11 Tf',
      ...receiptLines.slice(1).map((line) => `0 -28 Td (${escapePdfText(line)}) Tj`),
      'ET',
    ].join('\n');
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
      `<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `bus-booking-${receipt.id}.pdf`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
      link.remove();
    }, 1000);
    setReceiptDownloaded(true);
  }

  return (
    <form className="panel booking-form" onSubmit={handleSubmit}>
      <div className="panel-heading">
        <div><h2>Choose your seat</h2></div>
      </div>

      <label className="field">
        <span>Fleet schedule</span>
        <select value={form.fleet_id} onChange={(event) => update('fleet_id', event.target.value)}>
          {FLEETS.map((fleet) => {
            const full = fleetIsFull(fleet.id);
            const scheduleLabel = full
              ? `FULL - departs ${fleet.boardingTime}, arrives ${fleet.arrivalTime}`
              : `${fleet.boardingTime} - ${fleet.arrivalTime}`;
            return <option disabled={full} key={fleet.id} value={fleet.id}>{fleet.label} {scheduleLabel}</option>;
          })}
        </select>
      </label>

      <label className="field">
        <span>Bus route</span>
        <select value={form.bus_id} onChange={(event) => update('bus_id', event.target.value)}>
          {BUSES.map((bus) => {
            return <option key={bus.id} value={bus.id}>{bus.label}</option>;
          })}
        </select>
      </label>

      <div className="seat-map-label"><span>Passenger seats</span><span className="seat-hint">Driver seat unavailable</span></div>
      <div className="seat-map" aria-label="Bus seat map">
        <div className="bus-cabin">
          <div className="driver-seat" aria-label="Driver seat, unavailable"><span>DRIVER</span><strong>--</strong></div>
        </div>
        <div className="seat-grid">
          {PASSENGER_SEATS.map((seat, index) => {
            const booked = isBooked(seat);
            const selected = form.seat_number === seat;
            const gridColumn = (index % 4) < 2 ? (index % 4) + 1 : (index % 4) + 2;
            return (
              <button
                className={`seat ${booked ? 'seat--booked' : ''} ${selected ? 'seat--selected' : ''}`}
                disabled={booked}
                key={seat}
                onClick={() => update('seat_number', seat)}
                style={{ gridColumn }}
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
      <div className="fixed-schedule" aria-label="Fixed route schedule">
        <span><small>BOARDING</small><strong>{selectedFleet.boardingTime}</strong></span>
        <span className="schedule-arrow">-&gt;</span>
        <span><small>ARRIVAL</small><strong>{selectedFleet.arrivalTime}{selectedFleet.arrivesNextDay ? ' +1' : ''}</strong></span>
      </div>
      {fleetIsFull(form.fleet_id) && <p className="fleet-full-status" role="status">{selectedFleet.label} departure is full ({selectedFleet.boardingTime}). New bookings open after arrival at {selectedFleet.arrivalTime}.</p>}

      <button className="primary-button" type="submit" disabled={status.state === 'loading'}>
        <span>{status.state === 'loading' ? 'Saving ticket' : 'Book seat'}</span><span aria-hidden="true">-&gt;</span>
      </button>
      <button className="receipt-button" type="button" onClick={downloadReceipt} disabled={!receipt || receiptDownloaded || status.state === 'loading'}>
        <span aria-hidden="true">↓</span> {receiptDownloaded ? 'Receipt downloaded' : 'Download receipt'}
      </button>
      {status.state === 'error' && <p className={`status status-${status.state}`} role="status">{status.message}</p>}
    </form>
  );
}
