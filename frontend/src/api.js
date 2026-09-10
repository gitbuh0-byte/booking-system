const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '');

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const error = new Error(data?.error || `Request failed with status ${res.status}`);
    error.status = res.status;
    error.payload = data;
    throw error;
  }

  return data;
}

export const api = {
  listBookings: (busId) =>
    request(`/api/bookings${busId ? `?bus_id=${encodeURIComponent(busId)}` : ''}`),

  createBooking: (booking) =>
    request('/api/bookings', { method: 'POST', body: booking }),

  cancelBooking: (id) =>
    request(`/api/bookings/${id}`, { method: 'DELETE' }),
};
