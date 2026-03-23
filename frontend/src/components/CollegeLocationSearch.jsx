import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../services/api.js';
import './LocationSearch.css';

export default function CollegeLocationSearch({ value, onChange, placeholder, className }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimer = useRef(null);
  const inputRef = useRef(null);

  // Get Bangalore colleges only
  const getBangaloreColleges = useCallback(async (searchQuery) => {
    try {
      setLoading(true);
      console.log('Searching Bangalore colleges for:', searchQuery);
      
      // Use the fallback function to get Bangalore colleges
      const response = await api.searchLocation(searchQuery);
      console.log('College search response:', response);
      
      // Filter to only show Bangalore engineering colleges
      const collegeLocations = response.filter(location => 
        location.display_name.toLowerCase().includes('bangalore') &&
        (location.display_name.toLowerCase().includes('college') ||
         location.display_name.toLowerCase().includes('engineering') ||
         location.display_name.toLowerCase().includes('institute') ||
         location.display_name.toLowerCase().includes('university'))
      );
      
      console.log('Filtered Bangalore colleges:', collegeLocations);
      setSuggestions(collegeLocations);
    } catch (error) {
      console.error('College search failed:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useCallback((searchQuery) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    debounceTimer.current = setTimeout(() => {
      getBangaloreColleges(searchQuery);
      setShowSuggestions(true);
    }, 300);
  }, [getBangaloreColleges]);

  const handleSelect = (suggestion) => {
    setQuery(suggestion.label);
    onChange(suggestion.label, suggestion.lat, suggestion.lng);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setQuery(newValue);
    debouncedSearch(newValue);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleClickOutside = (e) => {
    if (inputRef.current && !inputRef.current.contains(e.target)) {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return (
    <div className={`location-search ${className || ''}`} ref={inputRef}>
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Search for pickup location..."}
        className="form-control"
        onFocus={() => query.length >= 2 && setShowSuggestions(true)}
      />
      
      {showSuggestions && (
        <div className="location-suggestions">
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <span>Loading colleges...</span>
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="suggestion-item"
                onClick={() => handleSelect(suggestion)}
              >
                <div className="suggestion-label">{suggestion.label}</div>
                <div className="suggestion-detail">{suggestion.display_name}</div>
              </div>
            ))
          ) : query.length >= 2 ? (
            <div className="empty-state">
              <div className="empty-icon">🏫</div>
              <div className="empty-text">No engineering colleges found</div>
              <div className="empty-subtext">Try searching for college names like "RV", "PES", "Ramaiah"</div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
