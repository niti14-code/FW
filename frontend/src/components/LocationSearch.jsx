import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as api from '../services/api.js';
import './LocationSearch.css';

export default function LocationSearch({
  placeholder = 'Search for a location...',
  onChange,
  onLocationSelect,
  className = ''
}) {
  const [query, setQuery]               = useState('');
  const [suggestions, setSuggestions]   = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [geoLoading, setGeoLoading]     = useState(false);

  const suggestionsRef = useRef(null);
  const debounceTimer  = useRef(null);

  // ── Debounced search ──────────────────────────────────────────
  const debouncedSearch = useCallback(async (q) => {
    if (q.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    setLoading(true);
    try {
      const results = await api.searchLocation(q);
      setSuggestions(results);
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (val) => {
    setQuery(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => debouncedSearch(val), 300);
  };

  // ── Select from dropdown ──────────────────────────────────────
  const handleSelect = (location) => {
    const label = location.label || location.display_name?.split(',').slice(0, 2).join(',').trim() || 'Selected Location';
    setQuery(label);
    setShowSuggestions(false);
    setSuggestions([]);
    onChange?.(label, location.lat, location.lng);
    onLocationSelect?.({ ...location, label });
  };

  // ── GPS detect ────────────────────────────────────────────────
  const handleGeolocation = () => {
    if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
    setGeoLoading(true);
    setQuery('Detecting your location…');

    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const address = await api.reverseGeocode(latitude, longitude);
          const label = address.label || address.display_name || 'My Location';
          setQuery(label);
          onChange?.(label, latitude, longitude);
          onLocationSelect?.({ label, display_name: address.display_name, lat: latitude, lng: longitude });
        } catch {
          setQuery('My Location');
          onChange?.('My Location', latitude, longitude);
        } finally {
          setGeoLoading(false);
        }
      },
      () => {
        setQuery('');
        setGeoLoading(false);
        alert('Could not get your location. Please search manually.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // ── Close on outside click ────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      clearTimeout(debounceTimer.current);
    };
  }, []);

  return (
    <div className={`location-search ${className}`}>
      <div className="location-input-wrapper">
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={placeholder}
          className="location-input"
          onFocus={() => query.length >= 2 && setShowSuggestions(true)}
        />
        <button
          type="button"
          onClick={handleGeolocation}
          className={`geo-button ${geoLoading ? 'geo-loading' : ''}`}
          title="Use my current location"
          disabled={geoLoading}
        >
          {geoLoading ? '⟳' : '📍'}
        </button>
        {loading && <div className="search-spinner">⟳</div>}
      </div>

      {showSuggestions && (
        <div className="location-suggestions" ref={suggestionsRef}>
          {loading ? (
            <div className="suggestion-loading">
              <div className="loading-spinner" />
              <span>Searching locations...</span>
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((s, i) => {
              const main = s.label || s.display_name?.split(',')[0];
              const sub  = s.display_name;
              return (
                <div key={i} className="suggestion-item" onClick={() => handleSelect(s)}>
                  <div className="suggestion-icon">📍</div>
                  <div className="suggestion-body">
                    <div className="suggestion-main">{main}</div>
                    {sub && sub !== main && <div className="suggestion-sub">{sub}</div>}
                  </div>
                </div>
              );
            })
          ) : query.length >= 2 ? (
            <div className="suggestion-empty">
              <div className="suggestion-empty-icon">🔍</div>
              <span>No results for "{query}"</span>
              <small>Try: area name, college, landmark, or full address</small>
            </div>
          ) : (
            <div className="suggestion-empty">
              <span>Type an area, college, or landmark</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
