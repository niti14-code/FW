// ══════════════════════════════════════════════════════════════════
//  API SERVICE  —  frontend/src/services/api.js
//
//  All HTTP calls to the CampusRide backend.
//  In dev:  Vite proxies /api/* → http://localhost:5000/*
//  In prod: /api/* → backend via root server.js proxy
//
//  Backend routes:
//    /auth/register   /auth/login   /auth/me
//    /ride/create     /ride/search  /ride/:id  /ride/my
//    /booking/request /booking/respond /booking/my /booking/ride/:rideId
// ══════════════════════════════════════════════════════════════════

const BASE = '/api';   // proxied to backend in both dev and prod

// ── Token / User helpers ──────────────────────────────────────────
export const getToken  = ()  => localStorage.getItem('cr_token');
export const setToken  = (t) => localStorage.setItem('cr_token', t);
export const removeToken = () => localStorage.removeItem('cr_token');

export const getUser   = ()  => JSON.parse(localStorage.getItem('cr_user') || 'null');
export const setUser   = (u) => localStorage.setItem('cr_user', JSON.stringify(u));
export const removeUser= ()  => localStorage.removeItem('cr_user');

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

/**
 * POST /auth/register
 * @param {{ name, email, password, phone, role, college }} body
 * @returns {{ token, user: { id, name, email, role, college } }}
 */
export const register = (body) =>
  request('/auth/register', { method: 'POST', body: JSON.stringify(body) });

/**
 * POST /auth/login
 * @param {{ email, password }} body
 * @returns {{ token, user: { id, name, email, role, college } }}
 */
export const login = (body) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify(body) });

/**
 * GET /auth/me  [requires token]
 * @returns {User}  full user object without password
 */
export const getMe = () => request('/auth/me');

// ══════════════════════════════════════════════════════════════════
//  RIDES  →  /ride
// ══════════════════════════════════════════════════════════════════

/**
 * POST /ride/create  [provider only]
 * @param {{
 *   pickup: { coordinates: [lng, lat] },
 *   drop:   { coordinates: [lng, lat] },
 *   date: string, time: string,
 *   seatsAvailable: number, costPerSeat: number
 * }} body
 */
export const createRide = (body) =>
  request('/ride/create', { method: 'POST', body: JSON.stringify(body) });

/**
 * GET /ride/search?lat&lng&maxDistance&date
 * @returns {Ride[]} with providerId populated { name, rating }
 */
export const searchRides = ({ lat, lng, maxDistance = 5000, date } = {}) => {
  const p = new URLSearchParams({ lat, lng, maxDistance });
  if (date) p.append('date', date);
  return request(`/ride/search?${p}`);
};

/**
 * GET /ride/my  [provider — returns their posted rides]
 * NOTE: needs backend addition — see README.md
 */
export const getMyRides = () => request('/ride/my');

/**
 * GET /ride/:id  [all auth users]
 * @returns {Ride} with providerId { name, phone, rating }
 */
export const getRide = (id) => request(`/ride/${id}`);

/**
 * PUT /ride/:id  [owner only]
 */
export const updateRide = (id, body) =>
  request(`/ride/${id}`, { method: 'PUT', body: JSON.stringify(body) });

/**
 * DELETE /ride/:id  [owner only]
 */
export const deleteRide = (id) =>
  request(`/ride/${id}`, { method: 'DELETE' });

// ══════════════════════════════════════════════════════════════════
//  BOOKINGS  →  /booking
// ══════════════════════════════════════════════════════════════════

/**
 * POST /booking/request  [seeker only]
 * @param {string} rideId
 * @returns {{ rideId, seekerId, status: 'pending' }}
 */
export const requestBooking = (rideId) =>
  request('/booking/request', { method: 'POST', body: JSON.stringify({ rideId }) });

/**
 * PUT /booking/respond  [provider only]
 * @param {string} bookingId
 * @param {'accepted'|'rejected'} status
 */
export const respondBooking = (bookingId, status) =>
  request('/booking/respond', { method: 'PUT', body: JSON.stringify({ bookingId, status }) });

/**
 * GET /booking/my  [seeker — own bookings]
 * NOTE: needs backend addition — see README.md
 */
export const getMyBookings = () => request('/booking/my');

/**
 * GET /booking/ride/:rideId  [provider — bookings for their ride]
 * NOTE: needs backend addition — see README.md
 */
export const getBookingsForRide = (rideId) => request(`/booking/ride/${rideId}`);
