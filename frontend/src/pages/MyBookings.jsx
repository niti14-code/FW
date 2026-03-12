import React, { useState, useEffect } from 'react';
import * as api from '../services/api.js';
import './SharedPages.css';

export default function MyBookings({ navigate }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getMyBookings()
      .then(data => setBookings(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { class: 'badge-pending', label: 'Pending' },
      accepted: { class: 'badge-accepted', label: 'Accepted' },
      rejected: { class: 'badge-rejected', label: 'Rejected' },
      cancelled: { class: 'badge-rejected', label: 'Cancelled' }
    };
    return statusMap[status] || { class: 'badge-pending', label: status };
  };

  if (loading) return (
    <div className="page-wrap fade-up">
      <div className="sk-list">
        {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 14, marginBottom: 16 }} />)}
      </div>
    </div>
  );

  if (error) return (
    <div className="page-wrap fade-up">
      <div className="alert alert-error">{error}</div>
    </div>
  );

  return (
    <div className="page-wrap fade-up">
      <p className="eyebrow mb-16">Seeker</p>
      <h1 className="heading mb-8" style={{ fontSize: 30 }}>My Bookings</h1>
      <p className="text-muted mb-24 text-sm">Track your ride requests and bookings</p>

      {bookings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div className="empty-title">No bookings yet</div>
          <div className="empty-sub mt-8">Find a ride and book your first trip!</div>
          <button className="btn btn-primary mt-24" onClick={() => navigate('search-rides')}>
            Search Rides
          </button>
        </div>
      ) : (
        <div className="bk-list">
          {bookings.map(booking => {
            const ride = booking.rideId;
            const status = getStatusBadge(booking.status);
            return (
              <div key={booking._id} className="bk-card card">
                <div className="card-body">
                  <div className="flex-between mb-12">
                    <span className={`badge ${status.class}`}>{status.label}</span>
                    <span className="text-dim text-xs">
                      {new Date(booking.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  
                  {ride ? (
                    <>
                      <div className="rd-route mb-16">
                        <div className="rd-stop">
                          <div className="rd-dot green" />
                          <div className="rd-loc text-sm">
                            {ride.pickup?.coordinates ? 
                              `${ride.pickup.coordinates[1].toFixed(4)}°N, ${ride.pickup.coordinates[0].toFixed(4)}°E` 
                              : 'Pickup location'}
                          </div>
                        </div>
                        <div className="rd-connector" />
                        <div className="rd-stop">
                          <div className="rd-dot red" />
                          <div className="rd-loc text-sm">
                            {ride.drop?.coordinates ? 
                              `${ride.drop.coordinates[1].toFixed(4)}°N, ${ride.drop.coordinates[0].toFixed(4)}°E` 
                              : 'Drop location'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-between text-sm">
                        <span className="text-dim">
                          {new Date(ride.date).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short'
                          })} · {ride.time}
                        </span>
                        <span className="text-accent font-600">₹{ride.costPerSeat}</span>
                      </div>

                      {ride.providerId && (
                        <div className="mt-12 pt-12" style={{ borderTop: '1px solid #333' }}>
                          <div className="text-dim text-xs mb-4">Provider</div>
                          <div className="flex-between">
                            <span>{ride.providerId.name}</span>
                            <span className="text-dim text-xs">📞 {ride.providerId.phone}</span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-muted text-sm">Ride details unavailable</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}