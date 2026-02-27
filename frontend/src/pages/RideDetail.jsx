import React, { useState, useEffect } from 'react';
import * as api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import './RideDetail.css';

export default function RideDetail({ navigate, rideId }) {
  const { user } = useAuth();
  const [ride,    setRide]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [booking, setBooking] = useState({ loading:false, status:null, error:'' });

  useEffect(() => {
    if (!rideId) { setError('No ride ID'); setLoading(false); return; }
    api.getRide(rideId)
      .then(r => setRide(r))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [rideId]);

  const handleBook = async () => {
    setBooking({ loading:true, status:null, error:'' });
    try {
      await api.requestBooking(rideId);
      setBooking({ loading:false, status:'pending', error:'' });
    } catch (e) {
      setBooking({ loading:false, status:null, error: e.message });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this ride? This cannot be undone.')) return;
    try {
      await api.deleteRide(rideId);
      navigate('dashboard');
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return (
    <div className="narrow-wrap">
      <div className="skeleton" style={{height:300, borderRadius:16}} />
    </div>
  );
  if (error) return (
    <div className="narrow-wrap">
      <div className="alert alert-error">{error}</div>
      <button className="btn btn-ghost btn-sm mt-16" onClick={() => navigate('search-rides')}>← Back</button>
    </div>
  );
  if (!ride) return null;

  const isOwner  = ride.providerId?._id === user?.id || ride.providerId === user?.id;
  const isSeeker = user?.role === 'seeker' || user?.role === 'both';
  const dateStr  = new Date(ride.date).toLocaleDateString('en-IN',{ weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const pickup   = ride.pickupLabel || coordStr(ride.pickup?.coordinates);
  const drop     = ride.dropLabel   || coordStr(ride.drop?.coordinates);

  return (
    <div className="narrow-wrap fade-up">
      <button className="btn btn-ghost btn-sm mb-24" onClick={() => navigate('search-rides')}>
        ← Back to results
      </button>

      <div className="card">
        {/* Header */}
        <div className="card-header">
          <span className="card-title">Ride Details</span>
          <span className={`badge badge-${ride.status || 'active'}`}>{ride.status || 'active'}</span>
        </div>

        <div className="card-body">
          {/* Route */}
          <div className="rd-route mb-24">
            <div className="rd-stop">
              <div className="rd-dot green" />
              <div>
                <div className="text-dim text-xs mb-6">PICKUP</div>
                <div className="rd-loc">{pickup}</div>
              </div>
            </div>
            <div className="rd-connector" />
            <div className="rd-stop">
              <div className="rd-dot red" />
              <div>
                <div className="text-dim text-xs mb-6">DROP</div>
                <div className="rd-loc">{drop}</div>
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid-2 mb-24">
            {[
              { icon:'📅', label:'Date',        val: dateStr },
              { icon:'🕐', label:'Time',        val: ride.time },
              { icon:'💺', label:'Seats Left',  val: `${ride.seatsAvailable} available` },
              { icon:'₹',  label:'Cost / Seat', val: `₹${ride.costPerSeat}`, accent: true },
            ].map(item => (
              <div key={item.label} className="info-box">
                <div className="text-dim text-xs mb-6">{item.icon} {item.label}</div>
                <div className={`info-val ${item.accent ? 'text-accent' : ''}`}>{item.val}</div>
              </div>
            ))}
          </div>

          {/* Provider */}
          {ride.providerId && (
            <div className="provider-box mb-24">
              <div className="prov-ava">{ride.providerId.name?.charAt(0) || 'P'}</div>
              <div>
                <div className="prov-name">{ride.providerId.name}</div>
                {ride.providerId.phone && <div className="text-muted text-sm mt-4">📞 {ride.providerId.phone}</div>}
                {ride.providerId.rating > 0 && <div className="text-muted text-sm mt-4">⭐ {ride.providerId.rating}</div>}
              </div>
            </div>
          )}

          {/* Action section */}
          {booking.error && <div className="alert alert-error mb-16">{booking.error}</div>}
          {booking.status === 'pending' && (
            <div className="alert alert-success mb-16">
              Booking request sent! The provider will accept or reject shortly.
            </div>
          )}

          <div className="flex gap-12 flex-wrap">
            {isSeeker && !isOwner && !booking.status && ride.seatsAvailable > 0 && (
              <button
                className={`btn btn-primary btn-lg ${booking.loading ? 'btn-loading' : ''}`}
                onClick={handleBook} disabled={booking.loading}>
                {!booking.loading && '🎫 Book This Seat'}
              </button>
            )}
            {ride.seatsAvailable === 0 && !booking.status && (
              <span className="badge badge-rejected" style={{fontSize:13, padding:'8px 14px'}}>No seats available</span>
            )}
            {isOwner && (
              <button className="btn btn-danger" onClick={handleDelete}>Delete Ride</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function coordStr(coords) {
  if (!coords?.length) return 'Location';
  return `${Number(coords[1]).toFixed(4)}°N, ${Number(coords[0]).toFixed(4)}°E`;
}
