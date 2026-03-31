import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import * as api from '../services/api.js';
import { useSocket } from '../hooks/useSocket.js'; // ADD THIS
import TripStatusFlow from "../components/TripStatusFlow.jsx";
import './SharedPages.css';

export default function ProviderBookings({ navigate }) {
  const { user } = useAuth();

  const isProvider = user?.role === 'provider' || user?.role === 'both';
  if (!isProvider) {
    return (
      <div className="narrow-wrap fade-up text-center" style={{paddingTop:80}}>
        <div style={{fontSize:64}}>🚫</div>
        <h2 className="heading mt-20" style={{fontSize:28}}>Access Denied</h2>
        <p className="text-muted mt-8">Only providers can view ride requests.</p>
        <button className="btn btn-primary btn-lg mt-32" onClick={() => navigate('dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const [myRides, setMyRides] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedRide, setSelectedRide] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [ridesLoading, setRidesLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMap, setActionMap] = useState([]);

  // FIXED: Use universal socket hook
  const { 
    socket, 
    connected, 
    notifications, 
    clearNotifications 
  } = useSocket(
    user?._id || user?.userId,
    'provider'
  );

  // Fetch rides function
  const fetchRides = async () => {
    try {
      const r = await api.getMyRides();
      setMyRides(r);
      if (r.length && !selectedRide) {
        loadBookings(r[0]._id);
        setSelectedRide(r[0]);
      } else if (selectedRide) {
        const updated = r.find(x => x._id === selectedRide._id);
        if (updated) setSelectedRide(updated);
      }
    } catch (e) {
      setError(e.message);
    }
  };

  // Initial load
  useEffect(() => {
    fetchRides().finally(() => setRidesLoading(false));
  }, []);

  // FIXED: Handle socket notifications
  useEffect(() => {
    if (notifications.length === 0) return;

    // Process new notifications
    notifications.forEach(notif => {
      if (notif.type === 'new-booking' || notif.notification?.type === 'BOOKING_REQUEST') {
        // Refresh bookings for the relevant ride
        const rideId = notif.data?.rideId || notif.booking?.ride?._id;
        if (rideId && selected === rideId) {
          loadBookings(rideId);
        }
        // Show toast/alert
        alert(`🎉 New booking request from ${notif.data?.seekerName || 'a seeker'}!`);
      }
    });

    // Clear processed notifications
    clearNotifications();
  }, [notifications, selected, clearNotifications]);

  const loadBookings = async (rideId) => {
    setSelected(rideId);
    setBookingsLoading(true);
    try {
      const data = await api.getBookingsForRide(rideId);
      setBookings(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setBookingsLoading(false);
    }
  };

  const respond = async (bookingId, status) => {
    setActionMap(m => ({ ...m, [bookingId]: { loading: true } }));
    try {
      await api.respondBooking(bookingId, status);
      setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status } : b));
      setActionMap(m => ({ ...m, [bookingId]: { done: true } }));
    } catch (e) {
      setActionMap(m => ({ ...m, [bookingId]: { error: e.message } }));
    }
  };

  const handleCancelRide = async (rideId, reason) => {
    try {
      await api.cancelRide(rideId, reason);
      if (socket && connected) {
        socket.emit('join-ride', rideId);
        socket.emit('provider-cancelled', {
          rideId: rideId,
          reason: reason || 'Provider cancelled',
          cancelledAt: new Date()
        });
      }
      await fetchRides();
      alert('Ride cancelled. All seekers have been notified.');
    } catch (e) {
      setError(e.message);
    }
  };

  // FIXED: Manual refresh button when socket is disconnected
  const manualRefresh = () => {
    if (selected) loadBookings(selected);
  };

  const pending = bookings.filter(b => b.status === 'pending');
  const resolved = bookings.filter(b => b.status !== 'pending');

  return (
    <div className="page-wrap fade-up">
      <p className="eyebrow mb-16">Provider</p>
      <h1 className="heading mb-8" style={{fontSize:30}}>Manage Booking Requests</h1>

      {error && <div className="alert alert-error mb-16">{error}</div>}

      {/* Notification banner for new bookings */}
      {notifications.length > 0 && (
        <div className="alert alert-success mb-16" style={{animation: 'slideIn 0.3s ease'}}>
          <strong>🎉 New booking request!</strong>
          <button 
            onClick={() => { clearNotifications(); manualRefresh(); }}
            className="btn btn-primary btn-sm ml-12"
          >
            View
          </button>
        </div>
      )}

      <div className="pb-layout">
        {/* Sidebar */}
        <div className="pb-sidebar">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Your Rides</span>
            </div>
            {ridesLoading ? (
              <div className="card-body sk-list">
                {[1,2].map(i => <div key={i} className="skeleton skeleton-text" />)}
              </div>
            ) : myRides.length === 0 ? (
              <div className="card-body">
                <p className="text-muted text-sm">No rides posted yet.</p>
                <button className="btn btn-primary btn-sm mt-12" onClick={() => navigate('create-ride')}>
                  Post a Ride
                </button>
              </div>
            ) : (
              <div className="pb-ride-list">
                {myRides.map(r => {
                  const dateStr = new Date(r.date).toLocaleDateString('en-IN',{day:'numeric',month:'short'});
                  const isCancelled = r.status === 'cancelled';
                  return (
                    <button 
                      key={r._id}
                      className={`pb-ride-item ${selected === r._id ? 'active' : ''} ${isCancelled ? 'cancelled' : ''}`}
                      onClick={() => { loadBookings(r._id); setSelectedRide(r); }}
                    >
                      <div className="pbr-date">{dateStr} · {r.time}</div>
                      <div className="pbr-seats text-dim text-xs">
                        {r.seatsAvailable} seats · ₹{r.costPerSeat}
                      </div>
                      <div className="pbr-seats text-dim text-xs" style={{marginTop:2, color: isCancelled ? '#f4a0a0' : 'inherit'}}>
                        Status: {r.status}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedRide && selectedRide.status !== 'cancelled' && (
            <div className="card mt-16">
              <div className="card-header"><span className="card-title">Trip Controls</span></div>
              <div className="card-body">
                <TripStatusFlow
                  ride={selectedRide}
                  onUpdate={() => {
                    fetchRides();
                    if (selected) loadBookings(selected);
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Bookings panel */}
        <div className="pb-main">
          {bookingsLoading ? (
            <div className="sk-list">
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{height:100, borderRadius:14}} />)}
            </div>
          ) : (
            <>
              <div className="pb-section-head mb-16">
                <h2 className="heading" style={{fontSize:18}}>Pending</h2>
                {pending.length > 0 && <span className="pending-badge">{pending.length}</span>}
              </div>

              {pending.length === 0 ? (
                <div className="empty-state" style={{padding:'32px 0'}}>
                  <div className="empty-icon">📭</div>
                  <div className="empty-title">No pending requests</div>
                  <div className="empty-sub">All caught up!</div>
                  {!connected && (
                    <p className="text-muted text-xs mt-8">
                      (Connect to internet for real-time updates)
                    </p>
                  )}
                </div>
              ) : (
                <div className="bk-list mb-32">
                  {pending.map(b => {
                    const am = actionMap[b._id] || {};
                    return (
                      <div key={b._id} className="bk-card card">
                        <div className="card-body">
                          <div className="seeker-row mb-16">
                            <div className="sk-ava">{b.seekerId?.name?.charAt(0) || 'S'}</div>
                            <div className="sk-info">
                              <div className="sk-name">{b.seekerId?.name || 'Seeker'}</div>
                              <div className="text-dim text-xs">{b.seekerId?.college}</div>
                              <div className="text-dim text-xs">
                                {new Date(b.createdAt).toLocaleString('en-IN',{hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'})}
                              </div>
                            </div>
                            <span className={`badge badge-${b.status}`}>{b.status}</span>
                          </div>
                          {am.error && <div className="alert alert-error mb-12">{am.error}</div>}
                          <div className="flex gap-10">
                            <button
                              className={`btn btn-success ${am.loading ? 'btn-loading' : ''}`}
                              onClick={() => respond(b._id,'accepted')} 
                              disabled={am.loading || am.done}
                            >
                              {!am.loading && '✓ Accept'}
                            </button>
                            <button 
                              className="btn btn-danger"
                              onClick={() => respond(b._id,'rejected')} 
                              disabled={am.loading || am.done}
                            >
                              ✕ Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {resolved.length > 0 && (
                <>
                  <h2 className="heading mb-16" style={{fontSize:18}}>Resolved</h2>
                  <div className="bk-list">
                    {resolved.map(b => (
                      <div key={b._id} className="bk-card card">
                        <div className="card-body">
                          <div className="seeker-row">
                            <div className="sk-ava resolved">{b.seekerId?.name?.charAt(0) || 'S'}</div>
                            <div className="sk-info">
                              <div className="sk-name">{b.seekerId?.name || 'Seeker'}</div>
                              {b.seekerId?.college && <div className="text-dim text-xs">{b.seekerId.college}</div>}
                            </div>
                            <span className={`badge badge-${b.status}`}>{b.status}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}