import React, { useState, useEffect } from 'react';
import * as api from '../services/api.js';
import './SharedPages.css';

export default function MyBookings({ navigate }) {
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    api.getMyBookings()
      .then(setBookings)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const statusIcon = { pending:'⏳', accepted:'✅', rejected:'❌' };

  return (
    <div className="page-wrap fade-up">
      <p className="eyebrow mb-16">Seeker</p>
      <h1 className="heading mb-8" style={{fontSize:30}}>My Bookings</h1>
      <p className="text-muted mb-24 text-sm">All your ride booking requests and their current status.</p>

      {/* Backend note */}
      <div className="alert alert-info mb-24">
        This page requires <code>GET /booking/my</code> on the backend.
        Add it using the snippet in <strong>README.md</strong> (included in the project).
      </div>

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
          <button className="btn btn-primary mt-24" onClick={() => navigate('search-rides')}>
            Find a Ride →
          </button>
        </div>
      )}

      <div className="bk-list">
        {bookings.map(b => {
          const ride = b.rideId;
          if (!ride) return null;
          const dateStr = new Date(ride.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
          const pickup  = ride.pickupLabel || coordStr(ride.pickup?.coordinates);
          const drop    = ride.dropLabel   || coordStr(ride.drop?.coordinates);
          return (
            <div key={b._id} className="bk-card card">
              <div className="card-header">
                <span className="card-title">Booking #{b._id.slice(-6).toUpperCase()}</span>
                <span className={`badge badge-${b.status}`}>
                  {statusIcon[b.status]} {b.status}
                </span>
              </div>
              <div className="card-body">
                <div className="bk-route mb-16">
                  <div className="bk-stop"><span className="bk-dot green" /><span>{pickup}</span></div>
                  <span className="bk-arr">→</span>
                  <div className="bk-stop"><span className="bk-dot red" /><span>{drop}</span></div>
                </div>
                <div className="grid-2">
                  <div className="text-dim text-xs">DATE<div className="text-muted font-700 mt-4">{dateStr}</div></div>
                  <div className="text-dim text-xs">TIME<div className="text-muted font-700 mt-4">{ride.time}</div></div>
                  <div className="text-dim text-xs">COST<div className="text-accent font-700 mt-4">₹{ride.costPerSeat}/seat</div></div>
                  <div className="text-dim text-xs">BOOKED ON<div className="text-muted font-700 mt-4">{new Date(b.createdAt).toLocaleDateString('en-IN')}</div></div>
                </div>
                {b.status === 'accepted' && (
                  <div className="alert alert-success mt-16">
                    ✅ Confirmed! Meet the provider at the pickup point.
                  </div>
                )}
                {b.status === 'rejected' && (
                  <div className="alert alert-error mt-16">
                    This booking was rejected. Try searching for another ride.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function coordStr(c) { return c?.length ? `${c[1].toFixed(3)}°N, ${c[0].toFixed(3)}°E` : 'Location'; }
