import { useEffect, useMemo, useState } from 'react';
import { BUSES, getFleet } from '../data/buses.js';

const LOCATIONS = {
  'bus-101': { departure: 'Nairobi CBD', arrival: 'Mombasa', from: 'Nairobi, Kenya', to: 'Mombasa, Kenya', distance: '485 km' },
  'bus-505': { departure: 'Nairobi CBD', arrival: 'Malindi', from: 'Nairobi, Kenya', to: 'Malindi, Kenya', distance: '575 km' },
  'bus-202': { departure: 'Nairobi CBD', arrival: 'Kisumu', from: 'Nairobi, Kenya', to: 'Kisumu, Kenya', distance: '345 km' },
  'bus-404': { departure: 'Nairobi CBD', arrival: 'Eldoret', from: 'Nairobi, Kenya', to: 'Eldoret, Kenya', distance: '315 km' },
  'bus-303': { departure: 'Nairobi CBD', arrival: 'Nakuru', from: 'Nairobi, Kenya', to: 'Nakuru, Kenya', distance: '160 km' },
  'bus-606': { departure: 'Nairobi CBD', arrival: 'Nanyuki', from: 'Nairobi, Kenya', to: 'Nanyuki, Kenya', distance: '200 km' },
};

function getTripStatus(bus) {
  const now = new Date();
  const [hours, minutes] = bus.boardingTime.split(':').map(Number);
  const departure = new Date();
  departure.setHours(hours, minutes, 0, 0);
  const [arrivalHours, arrivalMinutes] = bus.arrivalTime.split(':').map(Number);
  const arrival = new Date();
  arrival.setHours(arrivalHours, arrivalMinutes, 0, 0);
  if (bus.arrivesNextDay || arrival <= departure) arrival.setDate(arrival.getDate() + 1);
  if (now < departure) return { label: 'Boarding soon', time: departure - now };
  if (now < arrival) return { label: 'In transit', time: arrival - now };
  return { label: 'Arrived', time: 0 };
}

function formatCountdown(milliseconds) {
  if (!milliseconds) return 'Complete';
  const totalMinutes = Math.ceil(milliseconds / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export default function RouteMap() {
  const [selectedBusId, setSelectedBusId] = useState(BUSES[0].id);
  const [now, setNow] = useState(new Date());
  const selectedBus = BUSES.find((bus) => bus.id === selectedBusId) ?? BUSES[0];
  const selectedFleet = getFleet(selectedBus.fleetId);
  const scheduledBus = { ...selectedBus, ...selectedFleet, boardingTime: selectedFleet.boardingTime, arrivalTime: selectedFleet.arrivalTime, arrivesNextDay: selectedFleet.arrivesNextDay };
  const location = LOCATIONS[selectedBus.id];
  const trip = useMemo(() => getTripStatus(scheduledBus), [selectedBus, selectedFleet, now]);
  const mapUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(location.from)}&destination=${encodeURIComponent(location.to)}`;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="route-panel panel" aria-label="Live route map">
      <div className="route-panel-heading">
        <div><p className="eyebrow">Live route tracking</p><h2>Where your bus is going</h2></div>
        <span className="live-pill"><span className="status-dot" />Live</span>
      </div>
      <div className="route-controls">
        {BUSES.map((bus) => <button className={bus.id === selectedBus.id ? 'route-chip route-chip--active' : 'route-chip'} key={bus.id} type="button" onClick={() => setSelectedBusId(bus.id)}>{bus.label}</button>)}
      </div>
      <div className="route-meta">
        <div><span className="route-meta-label">Departure</span><strong>{location.departure}</strong><span>{selectedBus.boardingTime}</span></div>
        <div><span className="route-meta-label">Arrival</span><strong>{location.arrival}</strong><span>{selectedBus.arrivalTime}{selectedBus.arrivesNextDay ? ' +1' : ''}</span></div>
        <div><span className="route-meta-label">Live status</span><strong>{trip.label}</strong><span>{trip.label === 'Arrived' ? 'Ready for next trip' : formatCountdown(trip.time)}</span></div>
        <div><span className="route-meta-label">Distance</span><strong>{location.distance}</strong><span>Road route</span></div>
      </div>
    </section>
  );
}
