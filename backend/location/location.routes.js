const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Proxy for location search (avoids CORS issues in frontend)
/*router.get('/search', auth, async (req, res) => {
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
});*/
router.get('/search', auth, async (req, res) => {
  try {

    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json([]);
    }

    const response = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8`
    );

    if (!response.ok) {
      throw new Error('Photon API failed');
    }

    const data = await response.json();

    const results = data.features.map(place => ({

      display_name: [
        place.properties.name,
        place.properties.street,
        place.properties.city,
        place.properties.state,
        place.properties.country
      ]
        .filter(Boolean)
        .join(', '),

      lat: Number(place.geometry.coordinates[1].toFixed(3)),

      lng: Number(place.geometry.coordinates[0].toFixed(3)),

      label:
        place.properties.name ||
        place.properties.street ||
        place.properties.city ||
        'Unknown Location'

    }));

    res.json(results);

  } catch (error) {

    console.error('Location search error:', error);

    res.status(500).json({
      message: 'Location search failed'
    });

  }
});

// Proxy for reverse geocode (avoids CORS issues in frontend)
router.get('/reverse', auth, async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ message: 'lat and lng required' });
    }

    // zoom=18 gives the most granular address detail (building/house level)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
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

    // Build full address like: "2, Venkatreddy Layout, Vallabha Nagar, Bikasipura, Bengaluru, Karnataka 560062"
    const parts = [];

    // 1. House/building number + road/street
    if (address.house_number && address.road) {
      parts.push(`${address.house_number}, ${address.road}`);
    } else if (address.house_number) {
      parts.push(address.house_number);
    } else if (address.road) {
      parts.push(address.road);
    } else if (address.pedestrian) {
      parts.push(address.pedestrian);
    } else if (address.footway) {
      parts.push(address.footway);
    } else if (address.path) {
      parts.push(address.path);
    }

    // 2. Named locality / layout / colony
    if (address.neighbourhood)   parts.push(address.neighbourhood);
    if (address.quarter)         parts.push(address.quarter);
    if (address.allotments)      parts.push(address.allotments);

    // 3. Suburb / area
    if (address.suburb)          parts.push(address.suburb);
    if (address.village)         parts.push(address.village);
    if (address.city_district)   parts.push(address.city_district);

    // 4. City
    const city = address.city || address.town || address.municipality;
    if (city) parts.push(city);

    // 5. State + Pincode
    if (address.state)           parts.push(address.state);
    if (address.postcode)        parts.push(address.postcode);

    // If we got nothing useful, fall back to Nominatim's own display_name
    const label = parts.length > 0
      ? parts.join(', ')
      : data.display_name || 'Unknown Location';

    res.json({
      display_name: data.display_name,
      label,
      lat: parseFloat(lat),
      lng: parseFloat(lng)
    });
  } catch (error) {
    console.error('Reverse geocode error:', error);
    res.status(500).json({ message: 'Reverse geocode failed' });
  }
});

router.get('/reverse', auth, async (req, res) => {
  try {
    const { lat, lng } = req.query;

    const response = await fetch(
      `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`
    );

    const data = await response.json();

    const place = data.features?.[0];

    if (!place) {
      return res.json({
        display_name: 'Current Location'
      });
    }
     const address = [
      place.properties.name,
      place.properties.street,
      place.properties.city,
      place.properties.state
    ]
      .filter(Boolean)
      .join(', ');

    res.json({
      display_name: address
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: 'Reverse geocode failed'
    });
  }
});

module.exports = router;