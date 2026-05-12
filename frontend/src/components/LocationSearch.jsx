import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../services/api.js';
import './LocationSearch.css';

export default function LocationSearch({ 
  value, 
  onChange, 
  placeholder = 'Search for a location...',
  onLocationSelect,
  className = ''
}) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceTimer = useRef(null);

  // Debounced search
  const debouncedSearch = useCallback(async (searchQuery) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setLoading(true);
    try {
      const results = await api.searchLocation(searchQuery);
      setSuggestions(results);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Search failed:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (searchQuery) => {
    setQuery(searchQuery);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => debouncedSearch(searchQuery), 300);
  };

  const handleSelect = (location) => {
    const displayText = location.label || location.display_name?.split(',').slice(0, 2).join(',').trim() || 'Selected Location';
    setQuery(displayText);
    setShowSuggestions(false);
    setSuggestions([]);
    if (onChange)         onChange(displayText, location.lat, location.lng);
    if (onLocationSelect) onLocationSelect({ ...location, label: displayText });
  };

  // Tap 📍 → detect GPS → reverse geocode → fill address directly, no popup
  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setGeoLoading(true);
    setQuery('Detecting your location…');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const address = await api.reverseGeocode(latitude, longitude);
          const label = address.label || address.display_name || 'My Location';
          setQuery(label);
          if (onChange)         onChange(label, latitude, longitude);
          if (onLocationSelect) onLocationSelect({ label, display_name: address.display_name, lat: latitude, lng: longitude });
        } catch {
          setQuery('My Location');
          if (onChange) onChange('My Location', latitude, longitude);
        } finally {
          setGeoLoading(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setQuery('');
        setGeoLoading(false);
        alert('Could not get your location. Please search manually.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  return (
    <div className={`location-search ${className}`}>
      <div className="location-input-wrapper">
        <input
          ref={inputRef}
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
              <div className="loading-spinner"></div>
              <span>Searching locations...</span>
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => {
              const mainLabel = suggestion.label || suggestion.display_name?.split(',')[0];
              const subLabel  = suggestion.display_name;
              return (
                <div key={index} className="suggestion-item" onClick={() => handleSelect(suggestion)}>
                  <div className="suggestion-icon">📍</div>
                  <div className="suggestion-body">
                    <div className="suggestion-main">{mainLabel}</div>
                    {subLabel && subLabel !== mainLabel && (
                      <div className="suggestion-sub">{subLabel}</div>
                    )}
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
