import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import LocationSearch from '../components/LocationSearch.jsx';
import CollegeLocationSearch from '../components/CollegeLocationSearch.jsx';
import * as api from '../services/api.js';
import RideCard from '../components/RideCard.jsx';
import './SearchRides.css';

export default function SearchRides({ navigate }) {
  const { user } = useAuth();

  // Time-based location configuration
  const getTimeBasedLocationConfig = () => {
    const currentHour = new Date().getHours();
    
    // Morning to Noon (12 AM - 12 PM): Drop should be colleges, pickup should be general (no colleges)
    if (currentHour >= 0 && currentHour < 12) {
      return {
        pickupIsCollege: false,
        dropIsCollege: true,
        message: "Drop locations has access only for colleges"
      };
    }
    
    // Afternoon to Midnight (12 PM - 12 AM): Pickup should be colleges
    if (currentHour >= 12 && currentHour < 24) {
      return {
        pickupIsCollege: true,
        dropIsCollege: false,
        message: "Pickup locations has access only for colleges"
      };
    }
    
    // This should never be reached, but keeping for safety
    return {
      pickupIsCollege: true,
      dropIsCollege: false,
      message: ""
    };
  };

  const [locationConfig, setLocationConfig] = useState(getTimeBasedLocationConfig());

  // Update location config every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setLocationConfig(getTimeBasedLocationConfig());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

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
  
  const [filters, setFilters] = useState({ 
    lat: '', 
    lng: '', 
    dropLat: '', 
    dropLng: '', 
    maxDistance: 5000, 
    date: '' 
  });
  
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [bookingMap, setBookingMap] = useState({});
  
  // ENHANCED: Smart suggestions state
  const [suggestions, setSuggestions] = useState({
    exactMatches: [],
    expandedDistance: [],
    expandedDate: [],
    message: '',
    showExpandOption: false
  });

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
    setSuggestions({ exactMatches: [], expandedDistance: [], expandedDate: [], message: '', showExpandOption: false });
    
    if (!filters.lat || !filters.lng) { 
      setError('Enter or detect your pickup location first'); 
      return; 
    }
    
    setLoading(true);
    
    try {
      console.log('Searching with filters:', filters);
      
      // 1. First try exact search
      const searchParams = {
        lat: parseFloat(filters.lat), 
        lng: parseFloat(filters.lng),
        maxDistance: parseInt(filters.maxDistance),
        date: filters.date || undefined,
      };
      
      if (filters.dropLat && filters.dropLng) {
        searchParams.dropLat = parseFloat(filters.dropLat);
        searchParams.dropLng = parseFloat(filters.dropLng);
      }
      
      const data = await api.searchRides(searchParams);
      
      console.log(`Found ${data.length} exact matches`);
      
      // 2. If few or no results, fetch smart suggestions
      if (!data || data.length < 3) {
        try {
          const nearbyData = await api.findNearbySuggestions({
            lat: filters.lat,
            lng: filters.lng,
            originalDistance: filters.maxDistance,
            date: filters.date,
            expandDistance: 'true',
            expandDate: 'true'
          });
          
          setSuggestions({
            exactMatches: data || [],
            expandedDistance: nearbyData.expandedDistance || [],
            expandedDate: nearbyData.expandedDate || [],
            message: nearbyData.message,
            showExpandOption: (nearbyData.expandedDistance?.length > 0 || nearbyData.expandedDate?.length > 0)
          });
          
          // If no exact matches but suggestions exist, show them
          if ((!data || data.length === 0) && nearbyData.showSuggestions) {
            // Don't set rides, let user choose to expand search
          }
        } catch (err) {
          console.log('Nearby suggestions error:', err);
        }
      }
      
      setRides(data);
      setSearched(true);
      setBookingMap({});
      
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // ENHANCED: Expand search to include suggested rides
  const expandSearch = () => {
    const allSuggestions = [
      ...suggestions.exactMatches,
      ...suggestions.expandedDistance,
      ...suggestions.expandedDate
    ];
    setRides(allSuggestions);
    setSuggestions(prev => ({ ...prev, showExpandOption: false }));
  };

  const book = async (rideId) => {
    setBookingMap(m => ({ ...m, [rideId]: { loading: true } }));
    try {
      await api.requestBooking(rideId);
      setBookingMap(m => ({ ...m, [rideId]: { status: 'pending' } }));
    } catch (err) {
      setBookingMap(m => ({ ...m, [rideId]: { error: err.message } }));
    }
  };

  const formatDistance = (meters) => {
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatDateDiff = (days) => {
    if (days === 0) return 'Same day';
    if (days === 1) return '1 day later';
    if (days === -1) return '1 day earlier';
    return `${Math.abs(days)} days ${days > 0 ? 'later' : 'earlier'}`;
  };

  return (
    <div className="page-wrap fade-up">
      <p className="eyebrow mb-16">Seeker</p>
      <h1 className="heading mb-8" style={{fontSize:30}}>Find a Ride</h1>
      <p className="text-muted mb-24 text-sm">Search rides from your pickup to your destination.</p>

      <form className="search-box card" onSubmit={doSearch}>
        <div className="card-header">
          <span className="card-title">Search Filters</span>
        </div>
        <div className="card-body">
          {locationConfig.message && (
            <div className="alert alert-info mb-16" style={{background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22c55e'}}>
              <span style={{marginRight: 8}}>🎓</span>
              {locationConfig.message}
            </div>
          )}
          {error && <div className="alert alert-error mb-16">{error}</div>}
          
          <div className="search-grid" style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 1fr' }}>
            
            {/* Pickup Location */}
            <div className="field" style={{marginBottom:0, gridColumn: '1 / -1'}}>
              <label>Pickup Location *</label>
              {locationConfig.pickupIsCollege ? (
                <CollegeLocationSearch
                  value={filters.lat && filters.lng ? `${filters.lat}, ${filters.lng}` : ''}
                  onChange={(label, lat, lng) => setFilters(f => ({ ...f, lat: lat.toString(), lng: lng.toString() }))}
                  placeholder="Search for college pickup location..."
                />
              ) : (
                <LocationSearch
                  value={filters.lat && filters.lng ? `${filters.lat}, ${filters.lng}` : ''}
                  onChange={(label, lat, lng) => setFilters(f => ({ ...f, lat: lat.toString(), lng: lng.toString() }))}
                  placeholder="Search for your pickup location..."
                  excludeColleges={true}
                />
              )}
            </div>
            
            {/* Drop Location */}
            <div className="field" style={{marginBottom:0, gridColumn: '1 / -1'}}>
              <label>Drop Location <span style={{color: 'rgba(255,255,255,0.4)', fontWeight: 400}}>(optional)</span></label>
              {locationConfig.dropIsCollege ? (
                <CollegeLocationSearch
                  value={filters.dropLat && filters.dropLng ? `${filters.dropLat}, ${filters.dropLng}` : ''}
                  onChange={(label, lat, lng) => setFilters(f => ({ ...f, dropLat: lat.toString(), dropLng: lng.toString() }))}
                  placeholder="Search for college destination..."
                />
              ) : (
                <LocationSearch
                  value={filters.dropLat && filters.dropLng ? `${filters.dropLat}, ${filters.dropLng}` : ''}
                  onChange={(label, lat, lng) => setFilters(f => ({ ...f, dropLat: lat.toString(), dropLng: lng.toString() }))}
                  placeholder="Search for your destination (optional)..."
                  excludeColleges={true}
                />
              )}
              <span style={{fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4, display: 'block'}}>
                Adding a destination helps find rides going your way
              </span>
            </div>
            
            {/* Max Distance */}
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
            
            {/* Date */}
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

          {/* ENHANCED: Smart Suggestions UI */}
          {rides.length === 0 && suggestions.showExpandOption && (
            <div style={{
              background: 'rgba(245,158,11,0.1)', 
              border: '1px solid rgba(245,158,11,0.3)', 
              borderRadius: 12, 
              padding: 20, 
              marginBottom: 24
            }}>
              <h4 style={{color: '#f59e0b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8}}>
                <span>💡</span> No exact matches found
              </h4>
              <p style={{color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 16}}>
                {suggestions.message}
              </p>
              
              {/* Show preview of expanded distance matches */}
              {suggestions.expandedDistance.length > 0 && (
                <div style={{marginBottom: 16}}>
                  <p style={{fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em'}}>
                    Within {formatDistance(Math.max(...suggestions.expandedDistance.map(r => r.actualDistance * 1000)))} of you:
                  </p>
                  {suggestions.expandedDistance.slice(0, 3).map(ride => (
                    <div key={ride._id} style={{
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: 8,
                      marginBottom: 8,
                      fontSize: 13
                    }}>
                      <span>{ride.pickup?.address || 'Unknown'} → {ride.drop?.address || 'Unknown'}</span>
                      <span style={{color: '#f59e0b', fontWeight: 600}}>{ride.actualDistance}km away</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Show preview of expanded date matches */}
              {suggestions.expandedDate.length > 0 && (
                <div style={{marginBottom: 16}}>
                  <p style={{fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em'}}>
                    Nearby dates:
                  </p>
                  {suggestions.expandedDate.slice(0, 3).map(ride => (
                    <div key={ride._id} style={{
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: 8,
                      marginBottom: 8,
                      fontSize: 13
                    }}>
                      <span>{ride.pickup?.address || 'Unknown'}</span>
                      <span style={{color: '#6c63ff', fontWeight: 600}}>
                        {new Date(ride.date).toLocaleDateString('en-IN', {day:'numeric', month:'short'})} 
                        ({formatDateDiff(ride.daysFromTarget)})
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button 
                className="btn btn-primary" 
                onClick={expandSearch}
                style={{width: '100%'}}
              >
                Show {suggestions.expandedDistance.length + suggestions.expandedDate.length} nearby options
              </button>
              
              <button 
                className="btn btn-ghost btn-sm mt-12" 
                onClick={() => navigate('route-alerts')}
                style={{width: '100%'}}
              >
                Or create an alert to get notified
              </button>
            </div>
          )}

          {/* No results and no suggestions */}
          {rides.length === 0 && !suggestions.showExpandOption && (
            <div>
              <div className="empty-state">
                <div className="empty-icon">🚗</div>
                <div className="empty-title">No rides nearby</div>
                <div className="empty-sub mt-8">Try a larger distance radius or different date.</div>
              </div>

              <div style={{background:'#1a1a2e', border:'1px solid #6c63ff44', borderRadius:12, padding:20, marginTop:20}}>
                <h4 style={{color:'#6c63ff', marginBottom:12}}>What you can do instead:</h4>
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #222'}}>
                  <span style={{color:'#ccc', fontSize:14}}>Get notified when rides match</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate('route-alerts')}>
                    Create Alert
                  </button>
                </div>
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0'}}>
                  <span style={{color:'#ccc', fontSize:14}}>Post a ride request</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate('route-alerts')}>
                    Post Request
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Results list */}
          {rides.length > 0 && (
            <div className="rides-stack">
              {rides.filter(ride => (ride.seatsAvailable ?? 0) > 0).map(ride => {
                const bm = bookingMap[ride._id];
                // Check if this is a suggested ride (not exact match)
                const isSuggested = suggestions.expandedDistance.some(r => r._id === ride._id) || 
                                   suggestions.expandedDate.some(r => r._id === ride._id);
                
                return (
                  <div key={ride._id}>
                    {isSuggested && (
                      <div style={{
                        padding: '6px 12px',
                        background: 'rgba(245,158,11,0.1)',
                        borderRadius: '8px 8px 0 0',
                        fontSize: 11,
                        color: '#f59e0b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <span>💡</span>
                        {suggestions.expandedDistance.find(r => r._id === ride._id)?.actualDistance && (
                          <span>{suggestions.expandedDistance.find(r => r._id === ride._id).actualDistance}km from your search</span>
                        )}
                        {suggestions.expandedDate.find(r => r._id === ride._id)?.daysFromTarget !== 0 && (
                          <span>{formatDateDiff(suggestions.expandedDate.find(r => r._id === ride._id).daysFromTarget)}</span>
                        )}
                      </div>
                    )}
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