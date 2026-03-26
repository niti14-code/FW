import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import * as api from '../services/api.js';
import RideTracker from './RideTracker.jsx';
import './SharedPages.css';

// ── Shared geocode cache (same logic as RideCard / RideDetail) ──────
const geoCache = new Map();
async function reverseGeocode([lng, lat]) {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geoCache.has(key)) return geoCache.get(key);
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const d = await r.json();
    const a = d.address || {};
    const name = a.amenity || a.building || a.neighbourhood || a.suburb ||
      a.village || a.city_district || a.city || a.town ||
      d.display_name?.split(',')[0] ||
      `${lat.toFixed(4)}°N ${lng.toFixed(4)}°E`;
    geoCache.set(key, name);
    return name;
  } catch {
    return `${lat.toFixed(4)}°N ${lng.toFixed(4)}°E`;
  }
}

function useLocationName(locationField) {
  const [name, setName] = useState('');
  useEffect(() => {
    if (!locationField) return;
    if (locationField.address?.trim()) { setName(locationField.address.trim()); return; }
    if (locationField.coordinates?.length === 2) {
      setName('…');
      reverseGeocode(locationField.coordinates).then(setName);
    }
  }, [locationField]);
  return name;
}
// ────────────────────────────────────────────────────────────────────

export default function MyBookings({ navigate }) {
  const { user } = useAuth();

  // Role validation: Only 'seeker' or 'both' can view their bookings
  const isSeeker = user?.role === 'seeker' || user?.role === 'both';
  if (!isSeeker) {
    return (
      <div className="narrow-wrap fade-up text-center" style={{paddingTop:80}}>
        <div style={{fontSize:64}}>🚫</div>
        <h2 className="heading mt-20" style={{fontSize:28}}>Access Denied</h2>
        <p className="text-muted mt-8">Only seekers can view their bookings. Your current role: <strong>{user?.role || 'unknown'}</strong></p>
        <button className="btn btn-primary btn-lg mt-32" onClick={() => navigate('dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [tracking, setTracking] = useState(null);

  useEffect(() => {
    api.getMyBookings()
      .then(setBookings)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));


  }, []);

  const bookingIcon = { pending:'⏳', accepted:'✅', rejected:'❌' };

  const getRideStatusBadge = (b) => {
    if (b.status !== 'accepted') return null;
    const s = b.rideId?.status;
    if (s === 'in-progress') return { label:'🚗 In Progress', color:'#ffd700' };
    if (s === 'completed')   return { label:'🎉 Completed',   color:'#a0f4a0' };
    if (s === 'cancelled')   return { label:'❌ Cancelled',   color:'#f4a0a0' };
    return null;
  };

  return (
    <div className="page-wrap fade-up">
      <p className="eyebrow mb-16">Seeker</p>
      <h1 className="heading mb-8" style={{fontSize:30}}>My Bookings</h1>
      <p className="text-muted mb-24 text-sm">Track your rides in real time.</p>

      {loading && (
        <div className="sk-list">
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{height:120, borderRadius:16}} />)}
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}
      {!loading && !error && bookings.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div className="empty-title">No bookings yet</div>
          <div className="empty-sub mt-8">Search for a ride and book a seat to get started.</div>
          <button className="btn btn-primary mt-24" onClick={() => navigate('search-rides')}>Find a Ride →</button>
        </div>
      )}

      <div className="bk-list">
        {bookings.map(b => (
          <BookingCard
            key={b._id}
            b={b}
            getRideStatusBadge={getRideStatusBadge}
            bookingIcon={bookingIcon}
            onTrack={() => setTracking(b)}
          />
        ))}
      </div>
      {tracking && <RideTracker booking={tracking} onClose={() => setTracking(null)} />}
    </div>
  );
}

// Sub-component so useLocationName hook runs per booking card
function BookingCard({ b, getRideStatusBadge, bookingIcon, onTrack }) {
  const ride = b.rideId;
  const pickupName = useLocationName(ride?.pickup);
  const dropName   = useLocationName(ride?.drop);

  if (!ride) return null;

  const dateStr = new Date(ride.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
  const statusBadge = getRideStatusBadge(b);
  const canTrack = b.status === 'accepted' && ride.status !== 'cancelled';
  const trackLabel = ride.status === 'in-progress' ? '🚗 Track Live Ride'
                   : ride.status === 'completed'   ? '📋 View Trip Summary'
                   : '🗺️ Track Ride';

  return (
    <div className="bk-card card">
      <div className="card-header">
        <span className="card-title">Booking #{b._id.slice(-6).toUpperCase()}</span>
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
          <span className={`badge badge-${b.status}`}>{bookingIcon[b.status]} {b.status}</span>
          {statusBadge && <span style={{fontSize:12,color:statusBadge.color,fontWeight:600}}>{statusBadge.label}</span>}
        </div>
      </div>
      <div className="card-body">
        <div className="bk-route mb-16">
          <div className="bk-stop">
            <span className="bk-dot green" />
            <span style={{fontStyle: pickupName === '…' ? 'italic' : 'normal', opacity: pickupName === '…' ? 0.4 : 1}}>
              {pickupName || '…'}
            </span>
          </div>
          <span className="bk-arr">→</span>
          <div className="bk-stop">
            <span className="bk-dot red" />
            <span style={{fontStyle: dropName === '…' ? 'italic' : 'normal', opacity: dropName === '…' ? 0.4 : 1}}>
              {dropName || '…'}
            </span>
          </div>
        </div>
        <div className="grid-2">
          <div className="text-dim text-xs">DATE<div className="text-muted font-700 mt-4">{dateStr}</div></div>
          <div className="text-dim text-xs">TIME<div className="text-muted font-700 mt-4">{ride.time}</div></div>
          <div className="text-dim text-xs">COST<div className="text-accent font-700 mt-4">₹{ride.costPerSeat}/seat</div></div>
          <div className="text-dim text-xs">BOOKED ON<div className="text-muted font-700 mt-4">{new Date(b.createdAt).toLocaleDateString('en-IN')}</div></div>
        </div>
        {canTrack && (
          <button className="btn btn-primary btn-full mt-16"
            onClick={onTrack}
            style={{background:'linear-gradient(135deg,#6c63ff,#4a90e2)'}}>
            {trackLabel}
          </button>
        )}
        {b.status === 'rejected' && (
          <div className="alert alert-error mt-16">Booking rejected. Try searching for another ride.</div>
        )}
      </div>
    </div>
  )};