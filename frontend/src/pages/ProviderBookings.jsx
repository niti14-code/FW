import React, { useState, useEffect } from 'react';
import * as api from '../services/api.js';
import './SharedPages.css';

export default function ProviderBookings({ navigate }) {
  const [myRides,  setMyRides]  = useState([]);
  const [selected, setSelected] = useState(null);  // selected rideId
  const [bookings, setBookings] = useState([]);
  const [ridesLoading,   setRidesLoading]   = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [error,    setError]    = useState('');
  const [actionMap, setActionMap] = useState({}); // bookingId → {loading, done}

  // Load provider's rides
  useEffect(() => {
    api.getMyRides()
      .then(r => { setMyRides(r); if (r.length) loadBookings(r[0]._id); })
      .catch(e => setError(e.message))
      .finally(() => setRidesLoading(false));
  }, []);

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

  const pending  = bookings.filter(b => b.status === 'pending');
  const resolved = bookings.filter(b => b.status !== 'pending');

  return (
    <div className="page-wrap fade-up">
      <p className="eyebrow mb-16">Provider</p>
      <h1 className="heading mb-8" style={{fontSize:30}}>Manage Booking Requests</h1>
      <p className="text-muted mb-24 text-sm">Accept or reject incoming requests for your posted rides.</p>

      {/* Backend note */}
      <div className="alert alert-info mb-24">
        This page requires <code>GET /booking/ride/:rideId</code> and <code>GET /ride/my</code>.
        Add them using the snippets in <strong>README.md</strong>.
      </div>

      {error && <div className="alert alert-error mb-16">{error}</div>}

      <div className="pb-layout">
        {/* Ride selector sidebar */}
        <div className="pb-sidebar">
          <div className="card">
            <div className="card-header"><span className="card-title">Your Rides</span></div>
            {ridesLoading ? (
              <div className="card-body sk-list">
                {[1,2].map(i => <div key={i} className="skeleton skeleton-text" />)}
              </div>
            ) : myRides.length === 0 ? (
              <div className="card-body">
                <p className="text-muted text-sm">No rides posted yet.</p>
                <button className="btn btn-primary btn-sm mt-12" onClick={() => navigate('create-ride')}>Post a Ride</button>
              </div>
            ) : (
              <div className="pb-ride-list">
                {myRides.map(r => {
                  const dateStr = new Date(r.date).toLocaleDateString('en-IN',{day:'numeric',month:'short'});
                  return (
                    <button key={r._id}
                      className={`pb-ride-item ${selected === r._id ? 'active' : ''}`}
                      onClick={() => loadBookings(r._id)}>
                      <div className="pbr-date">{dateStr} · {r.time}</div>
                      <div className="pbr-seats text-dim text-xs">{r.seatsAvailable} seats · ₹{r.costPerSeat}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bookings panel */}
        <div className="pb-main">
          {bookingsLoading ? (
            <div className="sk-list">
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{height:100, borderRadius:14}} />)}
            </div>
          ) : (
            <>
              {/* Pending */}
              <div className="pb-section-head mb-16">
                <h2 className="heading" style={{fontSize:18}}>Pending</h2>
                {pending.length > 0 && (
                  <span className="pending-badge">{pending.length}</span>
                )}
              </div>

              {pending.length === 0 ? (
                <div className="empty-state" style={{padding:'32px 0'}}>
                  <div className="empty-icon">📭</div>
                  <div className="empty-title">No pending requests</div>
                  <div className="empty-sub">All caught up!</div>
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
                              onClick={() => respond(b._id,'accepted')} disabled={am.loading || am.done}>
                              {!am.loading && '✓ Accept'}
                            </button>
                            <button className="btn btn-danger"
                              onClick={() => respond(b._id,'rejected')} disabled={am.loading || am.done}>
                              ✕ Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Resolved */}
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
