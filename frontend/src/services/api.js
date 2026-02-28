// ══════════════════════════════════════════════════════════════════
//  API SERVICE  —  frontend/src/services/api.js
//  Base URL: https://freewheel-fykp.onrender.com
// ══════════════════════════════════════════════════════════════════

const BASE = 'https://freewheel-fykp.onrender.com';

// ── Token / User helpers ──────────────────────────────────────────
export const getToken   = ()  => localStorage.getItem('cr_token');
export const setToken   = (t) => localStorage.setItem('cr_token', t);
export const removeToken= ()  => localStorage.removeItem('cr_token');

export const getUser    = ()  => JSON.parse(localStorage.getItem('cr_user') || 'null');
export const setUser    = (u) => localStorage.setItem('cr_user', JSON.stringify(u));
export const removeUser = ()  => localStorage.removeItem('cr_user');

// ── Base fetch wrapper ────────────────────────────────────────────
const request = async (path, options = {}) => {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res  = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
};

// ══════════════════════════════════════════════════════════════════
//  AUTH  →  /auth
// ══════════════════════════════════════════════════════════════════
export const register = (body) =>
  request('/auth/register', { method: 'POST', body: JSON.stringify(body) });

export const login = (body) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify(body) });

export const getMe = () => request('/auth/me');

// ══════════════════════════════════════════════════════════════════
//  USERS  →  /users
// ══════════════════════════════════════════════════════════════════
export const getProfile    = ()     => request('/users/profile');
export const updateProfile = (body) =>
  request('/users/profile', { method: 'PUT', body: JSON.stringify(body) });

// ══════════════════════════════════════════════════════════════════
//  RIDES  →  /ride
// ══════════════════════════════════════════════════════════════════
export const createRide = (body) =>
  request('/ride/create', { method: 'POST', body: JSON.stringify(body) });

export const searchRides = ({ lat, lng, maxDistance = 5000, date } = {}) => {
  const p = new URLSearchParams({ lat, lng, maxDistance });
  if (date) p.append('date', date);
  return request(`/ride/search?${p}`);
};

export const getMyRides  = ()     => request('/ride/my');
export const getRide     = (id)   => request(`/ride/${id}`);
export const updateRide  = (id, body) =>
  request(`/ride/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteRide  = (id)   =>
  request(`/ride/${id}`, { method: 'DELETE' });

// ══════════════════════════════════════════════════════════════════
//  BOOKINGS  →  /booking
// ══════════════════════════════════════════════════════════════════
export const requestBooking = (rideId) =>
  request('/booking/request', { method: 'POST', body: JSON.stringify({ rideId }) });

export const respondBooking = (bookingId, status) =>
  request('/booking/respond', { method: 'PUT', body: JSON.stringify({ bookingId, status }) });

export const getMyBookings      = ()       => request('/booking/my');
export const getBookingsForRide = (rideId) => request(`/booking/ride/${rideId}`);