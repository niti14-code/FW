import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import * as api from '../services/api.js';
import RideTracker from './RideTracker.jsx';
import './SharedPages.css';

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

    // Socket listener for OTP requests from providers
    const socket = window.socket;
    if (socket) {
      const handleOtpRequested = (data) => {
        alert(`📱 OTP Requested!\n\nRide ID: ${data.rideId}\nYour OTP: ${data.otp}\nProvider: ${data.providerName}\n\nPlease share this OTP with your provider when they arrive.`);
      };

      socket.on('otpRequested', handleOtpRequested);
      socket.on('otpVerified', (data) => {
        alert(`✅ OTP Verified!\n\nRide ID: ${data.rideId}\nStatus: ${data.message}`);
      });

      return () => {
        socket.off('otpRequested', handleOtpRequested);
        socket.off('otpVerified');
      };
    }
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
        {bookings.map(b => {
          const ride = b.rideId;
          if (!ride) return null;
          const dateStr = new Date(ride.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
          const pickup  = ride.pickupLabel || coordStr(ride.pickup?.coordinates);
          const drop    = ride.dropLabel   || coordStr(ride.drop?.coordinates);
          const statusBadge = getRideStatusBadge(b);
          const canTrack = b.status === 'accepted' && ride.status !== 'cancelled';
          const trackLabel = ride.status === 'in-progress' ? '🚗 Track Live Ride'
                           : ride.status === 'completed'   ? '📋 View Trip Summary'
                           : '🗺️ Track Ride';
          return (
            <div key={b._id} className="bk-card card">
              <div className="card-header">
                <span className="card-title">Booking #{b._id.slice(-6).toUpperCase()}</span>
                <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
                  <span className={`badge badge-${b.status}`}>{bookingIcon[b.status]} {b.status}</span>
                  {statusBadge && <span style={{fontSize:12,color:statusBadge.color,fontWeight:600}}>{statusBadge.label}</span>}
                </div>
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
                {canTrack && (
                  <button className="btn btn-primary btn-full mt-16"
                    onClick={() => setTracking(b)}
                    style={{background:'linear-gradient(135deg,#6c63ff,#4a90e2)'}}>
                    {trackLabel}
                  </button>
                )}
                {b.status === 'rejected' && (
                  <div className="alert alert-error mt-16">Booking rejected. Try searching for another ride.</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {tracking && <RideTracker booking={tracking} onClose={() => setTracking(null)} />}
    </div>
  );
}
function coordStr(c) { return c?.length ? `${c[1].toFixed(3)}°N, ${c[0].toFixed(3)}°E` : 'Location'; }
