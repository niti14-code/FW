// ══════════════════════════════════════════════════════════════════
//  API SERVICE  —  frontend/src/services/api.js
//  Automatically detects local vs production environment
// ══════════════════════════════════════════════════════════════════

// Auto-detect environment
const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';

// Use Vite env var if available, otherwise auto-detect
const BASE = import.meta.env.VITE_API_URL || 
             (isLocalhost ? 'http://localhost:5000' : 'https://freewheel-fykp.onrender.com');

console.log('API Base URL:', BASE);

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

  try {
    const res  = await fetch(`${BASE}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = new Error(data.message || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data; // Attach full response for debugging
      throw err;
    }
    return data;
  } catch (error) {
    console.error('API Request Failed:', { path, error: error.message });
    throw error;
  }
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

export const noMatchSuggest = ({ lat, lng } = {}) =>
  request(`/ride/no-match-suggest?lat=${lat}&lng=${lng}`);

// ── Recurring ride instances
export const getRecurringInstances = (rideId) =>
  request(`/ride/recurring/${rideId}/instances`);

// ── Pre-ride checklist
export const submitChecklist = (rideId, checks) =>
  request(`/ride/${rideId}/checklist`, { method: 'POST', body: JSON.stringify(checks) });

// ── Trip status flow
export const pickupPassenger = (rideId) =>
  request(`/ride/${rideId}/pickup`, { method: 'POST' });

export const dropPassenger = (rideId) =>
  request(`/ride/${rideId}/drop`, { method: 'POST' });

export const startRide    = (rideId) =>
  request(`/ride/${rideId}/start`, { method: 'POST' });

export const completeRide = (rideId) =>
  request(`/ride/${rideId}/complete`, { method: 'POST' });

export const cancelRide   = (rideId, reason) =>
  request(`/ride/${rideId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) });

export const getRideStatus = (rideId) => request(`/ride/${rideId}/status`);

// ══════════════════════════════════════════════════════════════════
//  BOOKINGS  →  /booking
// ══════════════════════════════════════════════════════════════════
export const requestBooking = (rideId) =>
  request('/booking/request', { method: 'POST', body: JSON.stringify({ rideId }) });

export const respondBooking = (bookingId, status) =>
  request('/booking/respond', { method: 'PUT', body: JSON.stringify({ bookingId, status }) });

export const getMyBookings      = ()       => request('/booking/my');
export const getRideRequests    = ()       => request('/booking/requests');
export const getBookingsForRide = (rideId) => request(`/booking/ride/${rideId}`);

// ══════════════════════════════════════════════════════════════════
//  ALERTS (Route-based alert subscriptions)
// ══════════════════════════════════════════════════════════════════
export const createAlert = (body) =>
  request('/alerts', { method: 'POST', body: JSON.stringify(body) });

export const getMyAlerts = () => request('/alerts/my');

export const deleteAlert = (id) =>
  request(`/alerts/${id}`, { method: 'DELETE' });

export const checkAlertMatches = (id) =>
  request(`/alerts/${id}/check`);

// ══════════════════════════════════════════════════════════════════
//  INCIDENTS
// ══════════════════════════════════════════════════════════════════
export const reportIncident = (body) =>
  request('/incidents/report', { method: 'POST', body: JSON.stringify(body) });

export const addEvidence = (id, evidence) =>
  request(`/incidents/${id}/evidence`, { method: 'POST', body: JSON.stringify({ evidence }) });

export const getMyIncidents  = ()  => request('/incidents/my');
export const getAllIncidents  = ()  => request('/incidents/all');

export const exportIncident = (id) =>
  request(`/incidents/${id}/export`, { method: 'POST' });

// ══════════════════════════════════════════════════════════════════
//  ADMIN SETTINGS
// ══════════════════════════════════════════════════════════════════
export const getAdminSettings = ()           => request('/admin/settings');
export const setAdminSetting  = (key, value) =>
  request('/admin/settings', { method: 'POST', body: JSON.stringify({ key, value }) });

export const getAdminSetting = (key) => request(`/admin/settings/${key}`);

