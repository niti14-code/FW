import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../services/api.js';
import './LocationSearch.css';

export default function LocationSearch({ 
  value, 
  onChange, 
  placeholder = 'Search for a location...',
  onLocationSelect,
  className = '',
  excludeColleges = false
}) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceTimer = useRef(null);

  // Debounced search function
  const debouncedSearch = useCallback(async (searchQuery) => {
    console.log('Searching for:', searchQuery);
    
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    try {
      const results = await api.searchLocation(searchQuery);
      console.log('Search results:', results);
      
      // Filter out colleges if excludeColleges is true
      const filteredResults = excludeColleges 
        ? results.filter(location => {
            const isCollege = location.display_name && (
              location.display_name.toLowerCase().includes('college') ||
              location.display_name.toLowerCase().includes('university') ||
              location.display_name.toLowerCase().includes('institute') ||
              location.display_name.toLowerCase().includes('medical') ||
              location.display_name.toLowerCase().includes('engineering') ||
              location.display_name.toLowerCase().includes('dental') ||
              location.display_name.toLowerCase().includes('pharmacy') ||
              location.display_name.toLowerCase().includes('law') ||
              location.display_name.toLowerCase().includes('architecture') ||
              location.display_name.toLowerCase().includes('nursing') ||
              location.display_name.toLowerCase().includes('management') ||
              location.display_name.toLowerCase().includes('arts') ||
              location.display_name.toLowerCase().includes('science') ||
              location.display_name.toLowerCase().includes('commerce') ||
              location.label.toLowerCase().includes('college') ||
              location.label.toLowerCase().includes('university') ||
              location.label.toLowerCase().includes('institute') ||
              location.label.toLowerCase().includes('medical') ||
              location.label.toLowerCase().includes('engineering') ||
              location.label.toLowerCase().includes('dental') ||
              location.label.toLowerCase().includes('pharmacy') ||
              location.label.toLowerCase().includes('law') ||
              location.label.toLowerCase().includes('architecture') ||
              location.label.toLowerCase().includes('nursing') ||
              location.label.toLowerCase().includes('management') ||
              location.label.toLowerCase().includes('arts') ||
              location.label.toLowerCase().includes('science') ||
              location.label.toLowerCase().includes('commerce')
            );
            return !isCollege;
          })
        : results;
      
      setSuggestions(filteredResults);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Search failed:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [excludeColleges]);

  // Handle search with debouncing
  const handleSearch = (searchQuery) => {
    setQuery(searchQuery);
    
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Set new timer (300ms delay - more responsive)
    debounceTimer.current = setTimeout(() => {
      debouncedSearch(searchQuery);
    }, 300);
  };

  // Handle location selection
  const handleSelect = (location) => {
    console.log('Location selected:', location);
    console.log('Label:', location.label);
    console.log('Lat:', location.lat);
    console.log('Lng:', location.lng);
    console.log('Display name:', location.display_name);
    
    setQuery(location.label);
    setShowSuggestions(false);
    setSuggestions([]);
    
    if (onChange) {
      console.log('Calling onChange with:', location.label, location.lat, location.lng);
      onChange(location.label, location.lat, location.lng);
    }
    if (onLocationSelect) {
      console.log('Calling onLocationSelect with:', location);
      onLocationSelect(location);
    }
  };

  // Handle geolocation
  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const address = await api.reverseGeocode(latitude, longitude);
          setQuery(address.label);
          
          if (onChange) {
            onChange(address.label, latitude, longitude);
          }
          if (onLocationSelect) {
            onLocationSelect({
              label: address.label,
              display_name: address.display_name,
              lat: latitude,
              lng: longitude
            });
          }
        } catch (error) {
          setQuery('My Location');
          if (onChange) {
            onChange('My Location', latitude, longitude);
          }
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Could not get your location. Please search manually.');
      }
    );
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
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
          className="geo-button"
          title="Use my current location"
        >
          📍
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
            suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="suggestion-item"
                onClick={() => handleSelect(suggestion)}
              >
                <div className="suggestion-text">{suggestion.display_name}</div>
              </div>
            ))
          ) : query.length >= 2 ? (
            <div className="suggestion-empty">
              <span>No locations found</span>
              <small>Try searching for a different location</small>
            </div>
          ) : (
            <div className="suggestion-empty">
              <span>Type at least 2 characters to search</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
