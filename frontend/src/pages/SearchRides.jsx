import React, { useState, useCallback } from 'react';
import * as api from '../services/api.js';
import RideCard from '../components/RideCard.jsx';
import './SearchRides.css';

export default function SearchRides({ navigate }) {
  const [filters,  setFilters]  = useState({ lat:'', lng:'', maxDistance:5000, date:'' });
  const [rides,    setRides]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);
  const [error,    setError]    = useState('');
  const [bookingMap, setBookingMap] = useState({}); // rideId → { loading, status, error }

  const set = k => e => setFilters(f => ({ ...f, [k]: e.target.value }));

  const geoLocate = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setFilters(f => ({ ...f, lat: coords.latitude, lng: coords.longitude })),
      () => setError('Could not detect location. Enter manually.')
    );
  };

  const doSearch = useCallback(async e => {
    e?.preventDefault();
    setError('');
    if (!filters.lat || !filters.lng) { setError('Enter or detect your location first'); return; }
    setLoading(true);
    try {
      const data = await api.searchRides({
        lat: filters.lat, lng: filters.lng,
        maxDistance: filters.maxDistance,
        date: filters.date || undefined,
      });
      setRides(data);
      setSearched(true);
      setBookingMap({});
    } catch (err) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const book = async (rideId) => {
    setBookingMap(m => ({ ...m, [rideId]: { loading: true } }));
    try {
      await api.requestBooking(rideId);
      setBookingMap(m => ({ ...m, [rideId]: { status: 'pending' } }));
    } catch (err) {
      setBookingMap(m => ({ ...m, [rideId]: { error: err.message } }));
    }
  };

  return (
    <div className="page-wrap fade-up">
      <p className="eyebrow mb-16">Seeker</p>
      <h1 className="heading mb-8" style={{fontSize:30}}>Find a Ride</h1>
      <p className="text-muted mb-24 text-sm">Search rides near your location using geo-proximity matching.</p>

      {/* Search form */}
      <form className="search-box card" onSubmit={doSearch}>
        <div className="card-header">
          <span className="card-title">Search Filters</span>
        </div>
        <div className="card-body">
          {error && <div className="alert alert-error mb-16">{error}</div>}
          <div className="search-grid">
            <div className="field" style={{marginBottom:0}}>
              <label>Your Latitude ✶</label>
              <input className="input" type="number" step="any" placeholder="19.1334"
                value={filters.lat} onChange={set('lat')} />
            </div>
            <div className="field" style={{marginBottom:0}}>
              <label>Your Longitude ✶</label>
              <input className="input" type="number" step="any" placeholder="72.9133"
                value={filters.lng} onChange={set('lng')} />
            </div>
            <div className="field" style={{marginBottom:0}}>
              <label>Max Distance</label>
              <select className="input" value={filters.maxDistance} onChange={set('maxDistance')}>
                <option value={1000}>1 km</option>
                <option value={3000}>3 km</option>
                <option value={5000}>5 km</option>
                <option value={10000}>10 km</option>
                <option value={25000}>25 km</option>
                <option value={50000}>50 km</option>
              </select>
            </div>
            <div className="field" style={{marginBottom:0}}>
              <label>Date (optional)</label>
              <input className="input" type="date" min={new Date().toISOString().split('T')[0]}
                value={filters.date} onChange={set('date')} />
            </div>
          </div>
          <div className="search-actions">
            <button type="button" className="btn btn-ghost" onClick={geoLocate}>
              📍 Detect Location
            </button>
            <button type="submit" className={`btn btn-primary ${loading ? 'btn-loading' : ''}`} disabled={loading}>
              {!loading && '🔍 Search Rides'}
            </button>
          </div>
        </div>
      </form>

      {/* Results */}
      {searched && (
        <div className="mt-32">
          <div className="flex-between mb-16">
            <h2 className="heading" style={{fontSize:18}}>
              {rides.length} ride{rides.length !== 1 ? 's' : ''} found
            </h2>
            {filters.date && (
              <span className="text-muted text-sm">
                on {new Date(filters.date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
              </span>
            )}
          </div>

          {rides.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🚗</div>
              <div className="empty-title">No rides nearby</div>
              <div className="empty-sub mt-8">Try a larger distance radius or different date.</div>
            </div>
          ) : (
            <div className="rides-stack">
              {rides.map(ride => {
                const bm = bookingMap[ride._id];
                return (
                  <div key={ride._id}>
                    <RideCard
                      ride={ride}
                      onView={id => navigate('ride-detail', { rideId: id })}
                      onBook={bm?.status ? null : book}
                      bookingStatus={bm?.status}
                    />
                    {bm?.error && (
                      <div className="alert alert-error mt-8">{bm.error}</div>
                    )}
                    {bm?.status === 'pending' && (
                      <div className="alert alert-success mt-8">
                        Booking request sent! Waiting for the provider to accept.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
