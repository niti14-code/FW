import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import * as api from '../services/api.js';
import { useSocket } from '../hooks/useSocket.js';
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
  const [actionMap, setActionMap] = useState({});

  const { socket, connected, notifications, clearNotifications } = useSocket(
    user?._id || user?.userId,
    'provider'
  );

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

  useEffect(() => {
    fetchRides().finally(() => setRidesLoading(false));
  }, []);

  useEffect(() => {
    if (notifications.length === 0) return;
    notifications.forEach(notif => {
      if (notif.type === 'new-booking' || notif.notification?.type === 'BOOKING_REQUEST') {
        const rideId = notif.data?.rideId || notif.booking?.ride?._id;
        if (rideId && selected === rideId) loadBookings(rideId);
        alert(`🎉 New booking request from ${notif.data?.seekerName || 'a seeker'}!`);
      }
    });
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
          rideId,
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

  const manualRefresh = () => { if (selected) loadBookings(selected); };

  const pending  = bookings.filter(b => b.status === 'pending');
  const resolved = bookings.filter(b => b.status !== 'pending');

  const rideStatusColor = (s) => ({
    active: '#22c55e',
    cancelled: '#ef4444',
    completed: '#6366f1',
    'in-progress': '#f59e0b'
  }[s] || '#888');

  return (
    <div className="page-wrap fade-up">

      {/* ── Page header ── */}
      <div className="pb2-header">
        <div>
          <p className="eyebrow mb-4">Provider Dashboard</p>
          <h1 className="heading" style={{fontSize:28, marginBottom:4}}>Booking Requests</h1>
          <p className="text-muted text-sm">Manage incoming ride requests from seekers</p>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          {connected
            ? <span className="pb2-live-badge">● Live</span>
            : <span className="pb2-offline-badge">○ Offline</span>
          }
          <button className="btn btn-outline btn-sm" onClick={() => navigate('create-ride')}>
            + Post Ride
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error mb-16">{error}</div>}

      {notifications.length > 0 && (
        <div className="alert alert-success mb-16" style={{animation:'slideIn 0.3s ease'}}>
          <strong>🎉 New booking request!</strong>
          <button onClick={() => { clearNotifications(); manualRefresh(); }} className="btn btn-primary btn-sm ml-12">View</button>
        </div>
      )}

      <div className="pb2-layout">

        {/* ── Left sidebar: Rides list ── */}
        <aside className="pb2-sidebar">
          <div className="card">
            <div className="card-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <span className="card-title">Your Rides</span>
              {myRides.length > 0 && (
                <span className="text-muted text-xs">{myRides.length} ride{myRides.length !== 1 ? 's' : ''}</span>
              )}
            </div>

            {ridesLoading ? (
              <div className="card-body sk-list">
                {[1,2,3].map(i => <div key={i} className="skeleton skeleton-text" style={{marginBottom:8}} />)}
              </div>
            ) : myRides.length === 0 ? (
              <div className="card-body" style={{textAlign:'center', padding:'32px 20px'}}>
                <div style={{fontSize:40, marginBottom:12}}>🚗</div>
                <p className="text-muted text-sm mb-16">No rides posted yet.</p>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('create-ride')}>
                  Post a Ride
                </button>
              </div>
            ) : (
              <div className="pb2-ride-list">
                {myRides.map(r => {
                  const dateStr = new Date(r.date).toLocaleDateString('en-IN', {day:'numeric', month:'short'});
                  const isCancelled = r.status === 'cancelled';
                  const isSelected = selected === r._id;
                  return (
                    <button
                      key={r._id}
                      className={`pb2-ride-item${isSelected ? ' active' : ''}${isCancelled ? ' cancelled' : ''}`}
                      onClick={() => { loadBookings(r._id); setSelectedRide(r); }}
                    >
                      <div className="pb2-ride-top">
                        <span className="pb2-ride-date">{dateStr} · {r.time}</span>
                        <span className="pb2-status-dot" style={{background: rideStatusColor(r.status)}} />
                      </div>
                      <div className="pb2-ride-meta">
                        <span>💺 {r.seatsAvailable} seats</span>
                        <span>₹{r.costPerSeat}/seat</span>
                      </div>
                      <div className="pb2-ride-status-label" style={{color: rideStatusColor(r.status)}}>
                        {r.status}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Trip controls card */}
          {selectedRide && selectedRide.status !== 'cancelled' && (
            <div className="card mt-16">
              <div className="card-header"><span className="card-title">Trip Controls</span></div>
              <div className="card-body">
                <TripStatusFlow
                  ride={selectedRide}
                  onUpdate={() => { fetchRides(); if (selected) loadBookings(selected); }}
                />
              </div>
            </div>
          )}
        </aside>

        {/* ── Right main: Bookings panel ── */}
        <main className="pb2-main">

          {/* No ride selected yet */}
          {!selected && !bookingsLoading && (
            <div className="pb2-placeholder">
              <div style={{fontSize:56, marginBottom:20}}>📋</div>
              <h3 className="heading" style={{fontSize:20, marginBottom:8}}>Select a ride</h3>
              <p className="text-muted text-sm">Choose a ride from the panel on the left to see its booking requests.</p>
            </div>
          )}

          {/* Loading skeleton */}
          {bookingsLoading && (
            <div className="sk-list">
              {[1,2,3].map(i => (
                <div key={i} className="skeleton" style={{height:110, borderRadius:16, marginBottom:12}} />
              ))}
            </div>
          )}

          {/* Content */}
          {selected && !bookingsLoading && (
            <>
              {/* Stats + refresh bar */}
              <div className="pb2-stats-bar">
                <div className="pb2-stat-pill pb2-stat-pending">
                  <span className="pb2-stat-num">{pending.length}</span>
                  <span className="pb2-stat-label">Pending</span>
                </div>
                <div className="pb2-stat-pill pb2-stat-resolved">
                  <span className="pb2-stat-num">{resolved.length}</span>
                  <span className="pb2-stat-label">Resolved</span>
                </div>
                <div className="pb2-stat-pill pb2-stat-total">
                  <span className="pb2-stat-num">{bookings.length}</span>
                  <span className="pb2-stat-label">Total</span>
                </div>
                <button className="btn btn-outline btn-sm" style={{marginLeft:'auto'}} onClick={manualRefresh}>
                  ↻ Refresh
                </button>
              </div>

              {/* ── Pending requests ── */}
              <div className="pb2-section-header">
                <h2 className="heading" style={{fontSize:17}}>Pending Requests</h2>
                {pending.length > 0 && (
                  <span className="pb2-badge-count">{pending.length}</span>
                )}
              </div>

              {pending.length === 0 ? (
                <div className="pb2-empty-box">
                  <span style={{fontSize:32}}>📭</span>
                  <div>
                    <div className="pb2-empty-title">No pending requests</div>
                    <div className="pb2-empty-sub">All caught up for this ride!</div>
                  </div>
                </div>
              ) : (
                <div className="pb2-cards mb-32">
                  {pending.map(b => {
                    const am = actionMap[b._id] || {};
                    return (
                      <div key={b._id} className="pb2-bk-card">
                        <div className="pb2-bk-left">
                          <div className="pb2-bk-avatar">{b.seekerId?.name?.charAt(0) || 'S'}</div>
                          <div className="pb2-bk-info">
                            <div className="pb2-bk-name">{b.seekerId?.name || 'Seeker'}</div>
                            {b.seekerId?.college && (
                              <div className="pb2-bk-college">{b.seekerId.college}</div>
                            )}
                            <div className="pb2-bk-time">
                              Requested {new Date(b.createdAt).toLocaleString('en-IN', {
                                hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short'
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="pb2-bk-right">
                          <span className={`badge badge-${b.status}`}>{b.status}</span>
                          {am.error && (
                            <div className="alert alert-error mt-8" style={{fontSize:12, padding:'6px 10px'}}>
                              {am.error}
                            </div>
                          )}
                          {am.done ? (
                            <div className="pb2-done-label">✓ Action taken</div>
                          ) : (
                            <div className="pb2-bk-actions">
                              <button
                                className={`btn btn-success btn-sm${am.loading ? ' btn-loading' : ''}`}
                                onClick={() => respond(b._id, 'accepted')}
                                disabled={am.loading}
                              >
                                {!am.loading && '✓ Accept'}
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => respond(b._id, 'rejected')}
                                disabled={am.loading}
                              >
                                ✕ Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Resolved requests ── */}
              {resolved.length > 0 && (
                <>
                  <div className="pb2-section-header mt-8">
                    <h2 className="heading" style={{fontSize:17}}>Resolved</h2>
                    <span className="pb2-badge-count pb2-badge-resolved">{resolved.length}</span>
                  </div>
                  <div className="pb2-cards">
                    {resolved.map(b => (
                      <div key={b._id} className="pb2-bk-card pb2-bk-card-resolved">
                        <div className="pb2-bk-left">
                          <div className="pb2-bk-avatar pb2-bk-avatar-dim">
                            {b.seekerId?.name?.charAt(0) || 'S'}
                          </div>
                          <div className="pb2-bk-info">
                            <div className="pb2-bk-name">{b.seekerId?.name || 'Seeker'}</div>
                            {b.seekerId?.college && (
                              <div className="pb2-bk-college">{b.seekerId.college}</div>
                            )}
                          </div>
                        </div>
                        <span className={`badge badge-${b.status}`}>{b.status}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}