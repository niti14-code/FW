const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Proxy for location search (avoids CORS issues in frontend)
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=in`,
      {
        headers: {
          'User-Agent': 'CampusRide/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Nominatim API failed');
    }

    const data = await response.json();
    const results = data.map(place => ({
      display_name: place.display_name,
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
      label: place.display_name.split(',')[0]
    }));

    res.json(results);
  } catch (error) {
    console.error('Location search error:', error);
    res.status(500).json({ message: 'Location search failed' });
  }
});

// Proxy for reverse geocode (avoids CORS issues in frontend)
router.get('/reverse', auth, async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ message: 'lat and lng required' });
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      {
        headers: {
          'User-Agent': 'CampusRide/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Nominatim reverse geocode failed');
    }

    const data = await response.json();
    const address = data.address || {};
    const name = address.neighbourhood || address.suburb || address.village || 
                 address.city_district || address.city || address.town || 
                 data.display_name?.split(',')[0] || 'Unknown Location';

    res.json({
      display_name: data.display_name,
      label: name,
      lat: parseFloat(lat),
      lng: parseFloat(lng)
    });
  } catch (error) {
    console.error('Reverse geocode error:', error);
    res.status(500).json({ message: 'Reverse geocode failed' });
  }
});

module.exports = router;