export const BUS_ROUTES = [
  { id: 'bus-101', label: 'Nairobi - Mombasa', destination: 'Nairobi CBD - Mombasa' },
  { id: 'bus-202', label: 'Nairobi - Kisumu', destination: 'Nairobi CBD - Kisumu' },
  { id: 'bus-303', label: 'Nairobi - Nakuru', destination: 'Nairobi CBD - Nakuru' },
  { id: 'bus-404', label: 'Nairobi - Eldoret', destination: 'Nairobi CBD - Eldoret' },
  { id: 'bus-505', label: 'Nairobi - Malindi', destination: 'Nairobi CBD - Malindi' },
  { id: 'bus-606', label: 'Nairobi - Nanyuki', destination: 'Nairobi CBD - Nanyuki' },
];

export const PASSENGER_SEAT_COUNT = 34;
export const PASSENGER_SEATS = Array.from(
  { length: PASSENGER_SEAT_COUNT },
  (_, index) => String(index + 1)
);

export function findBus(busId) {
  return BUS_ROUTES.find((bus) => bus.id === busId) ?? null;
}
