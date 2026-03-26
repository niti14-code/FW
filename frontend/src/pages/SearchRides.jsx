import React, { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import LocationSearch from '../components/LocationSearch.jsx';
import * as api from '../services/api.js';
import RideCard from '../components/RideCard.jsx';
import './SearchRides.css';

export default function SearchRides({ navigate }) {
  const { user } = useAuth();

  // Role validation: Only 'seeker' or 'both' can search rides
  const isSeeker = user?.role === 'seeker' || user?.role === 'both';
  if (!isSeeker) {
    return (
      <div className="narrow-wrap fade-up text-center" style={{paddingTop:80}}>
        <div style={{fontSize:64}}>🚫</div>
        <h2 className="heading mt-20" style={{fontSize:28}}>Access Denied</h2>
        <p className="text-muted mt-8">Only seekers can search for rides. Your current role: <strong>{user?.role || 'unknown'}</strong></p>
        <button className="btn btn-primary btn-lg mt-32" onClick={() => navigate('dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }
  const [filters,  setFilters]  = useState({ lat:'', lng:'', maxDistance:5000, date:'' });
  const [rides,    setRides]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);
  const [error,    setError]    = useState('');
  const [bookingMap, setBookingMap] = useState({});
  const [noMatchSuggestions, setNoMatchSuggestions] = useState(null);

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
    setNoMatchSuggestions(null);
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
      // If no rides found, fetch suggestions
      if (!data || data.length === 0) {
        try {
          const suggestions = await api.noMatchSuggest({ lat: filters.lat, lng: filters.lng });
          setNoMatchSuggestions(suggestions);
        } catch {}
      }
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

      <form className="search-box card" onSubmit={doSearch}>
        <div className="card-header">
          <span className="card-title">Search Filters</span>
        </div>
        <div className="card-body">
          {error && <div className="alert alert-error mb-16">{error}</div>}
          <div className="search-grid">
            <div className="field" style={{marginBottom:0, gridColumn: '1 / -1'}}>
              <label>Your Location</label>
              <LocationSearch
                value={filters.lat && filters.lng ? `${filters.lat}, ${filters.lng}` : ''}
                onChange={(label, lat, lng) => setFilters(f => ({ ...f, lat: lat.toString(), lng: lng.toString() }))}
                placeholder="Search for your current location..."
              />
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
            <button type="submit" className={`btn btn-primary ${loading ? 'btn-loading' : ''}`} disabled={loading}>
              {!loading && '🔍 Search Rides'}
            </button>
          </div>
        </div>
      </form>

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
            <div>
              <div className="empty-state">
                <div className="empty-icon">🚗</div>
                <div className="empty-title">No rides nearby</div>
                <div className="empty-sub mt-8">Try a larger distance radius or different date.</div>
              </div>

              {/* No-match suggestions */}
              {noMatchSuggestions && (
                <div style={{background:'#1a1a2e', border:'1px solid #6c63ff44', borderRadius:12, padding:20, marginTop:20}}>
                  <h4 style={{color:'#6c63ff', marginBottom:12}}>What you can do instead:</h4>
                  {noMatchSuggestions.suggestions?.map((s, i) => (
                    <div key={i} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #222'}}>
                      <span style={{color:'#ccc', fontSize:14}}>{s.label}</span>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(s.action === 'subscribe_alert' ? 'route-alerts' : 'route-alerts')}>
                        {s.action === 'subscribe_alert' ? 'Subscribe' : 'Post Request'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rides-stack">
              {rides.filter(ride => (ride.seatsAvailable ?? 0) > 0).map(ride => {
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
