import React, { useState, useEffect } from 'react';

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
    const name = a.neighbourhood || a.suburb || a.village || a.city_district ||
      a.city || a.town || d.display_name?.split(',')[0] ||
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

export default function RideCard({ ride, onView, onBook, bookingStatus }) {
  const pickupName = useLocationName(ride.pickup);
  const dropName   = useLocationName(ride.drop);
  const provider   = ride.providerId;
  const provName   = typeof provider === 'object' ? (provider?.name || 'Provider') : 'Provider';
  const provRating = typeof provider === 'object' ? provider?.rating : null;
  const dateStr    = ride.date
    ? new Date(ride.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  const isLoading  = v => !v || v === '…';

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="card-body" style={{ padding: '20px 22px' }}>

        {/* Route row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: isLoading(pickupName) ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.88)', fontStyle: isLoading(pickupName) ? 'italic' : 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {pickupName || '…'}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>→</span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: isLoading(dropName) ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.88)', fontStyle: isLoading(dropName) ? 'italic' : 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {dropName || '…'}
            </span>
          </div>
          <span className={`badge badge-${ride.status || 'active'}`} style={{ flexShrink: 0, marginLeft: 12 }}>
            {ride.status || 'active'}
          </span>
        </div>

        {/* Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {[{ icon: '📅', val: dateStr }, { icon: '🕐', val: ride.time || '—' }, { icon: '💺', val: `${ride.seatsAvailable} seat${ride.seatsAvailable !== 1 ? 's' : ''}` }].map(c => (
            <span key={c.icon} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
              {c.icon} {c.val}
            </span>
          ))}
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 20, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>
            ₹{ride.costPerSeat}/seat
          </span>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 14 }} />

        {/* Provider + actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#1a0f00', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {provName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{provName}</div>
              {provRating > 0 && <div style={{ fontSize: 11, color: '#f59e0b' }}>★ {provRating.toFixed(1)}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => onView?.(ride._id)}>Details</button>
            {bookingStatus === 'pending'
              ? <span className="badge badge-pending" style={{ padding: '6px 12px', fontSize: 12 }}>Requested</span>
              : <button className="btn btn-primary btn-sm" onClick={() => onBook?.(ride._id)} disabled={!onBook || (ride.seatsAvailable ?? 0) === 0}>Book Seat →</button>
            }
          </div>
        </div>

      </div>
    </div>
  );
}