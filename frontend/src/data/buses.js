export const FLEETS = [
  { id: 'morning', label: 'Morning fleet', detail: 'Early departure', boardingTime: '06:30', arrivalTime: '13:00' },
  { id: 'noon', label: 'Noon fleet', detail: 'Midday departure', boardingTime: '12:00', arrivalTime: '18:30' },
  { id: 'night', label: 'Night fleet', detail: 'Overnight departure', boardingTime: '20:00', arrivalTime: '05:00', arrivesNextDay: true },
];

export const BUSES = [
  { id: 'bus-101', fleetId: 'morning', label: 'Nairobi - Mombasa', destination: 'Nairobi CBD - Mombasa' },
  { id: 'bus-505', fleetId: 'morning', label: 'Nairobi - Malindi', destination: 'Nairobi CBD - Malindi' },
  { id: 'bus-202', fleetId: 'noon', label: 'Nairobi - Kisumu', destination: 'Nairobi CBD - Kisumu' },
  { id: 'bus-404', fleetId: 'noon', label: 'Nairobi - Eldoret', destination: 'Nairobi CBD - Eldoret' },
  { id: 'bus-303', fleetId: 'night', label: 'Nairobi - Nakuru', destination: 'Nairobi CBD - Nakuru' },
  { id: 'bus-606', fleetId: 'night', label: 'Nairobi - Nanyuki', destination: 'Nairobi CBD - Nanyuki' },
];

export function getFleet(fleetId) {
  return FLEETS.find((fleet) => fleet.id === fleetId) ?? FLEETS[0];
}
