export const FLEETS = [
  { id: 'morning', label: 'Morning fleet', detail: 'Early departure', boarding_time: '06:30', arrival_time: '13:00' },
  { id: 'noon', label: 'Noon fleet', detail: 'Midday departure', boarding_time: '12:00', arrival_time: '18:30' },
  { id: 'night', label: 'Night fleet', detail: 'Overnight departure', boarding_time: '20:00', arrival_time: '05:00', arrives_next_day: true },
];

export const BUS_ROUTES = [
  { id: 'bus-101', fleet_id: 'morning', label: 'Nairobi - Mombasa', destination: 'Nairobi CBD - Mombasa' },
  { id: 'bus-505', fleet_id: 'morning', label: 'Nairobi - Malindi', destination: 'Nairobi CBD - Malindi' },
  { id: 'bus-202', fleet_id: 'noon', label: 'Nairobi - Kisumu', destination: 'Nairobi CBD - Kisumu' },
  { id: 'bus-404', fleet_id: 'noon', label: 'Nairobi - Eldoret', destination: 'Nairobi CBD - Eldoret' },
  { id: 'bus-303', fleet_id: 'night', label: 'Nairobi - Nakuru', destination: 'Nairobi CBD - Nakuru' },
  { id: 'bus-606', fleet_id: 'night', label: 'Nairobi - Nanyuki', destination: 'Nairobi CBD - Nanyuki' },
];

export const PASSENGER_SEAT_COUNT = 34;
export const PASSENGER_SEATS = Array.from(
  { length: PASSENGER_SEAT_COUNT },
  (_, index) => String(index + 1)
);

export function findBus(busId) {
  return BUS_ROUTES.find((bus) => bus.id === busId) ?? null;
}
