import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import LocationSearch from '../components/LocationSearch.jsx';
import CollegeLocationSearch from '../components/CollegeLocationSearch.jsx';
import * as api from '../services/api.js';
import './CreateRide.css';

const COLLEGE_PRESETS = [
  { label: 'RV College of Engineering', lat: 12.9215, lng: 77.4958 },
  { label: 'BMS College of Engineering', lat: 12.9611, lng: 77.5908 },
  { label: 'PES University', lat: 12.9345, lng: 77.5366 },
  { label: 'MS Ramaiah Institute', lat: 13.0163, lng: 77.5770 },
  { label: 'Bangalore Institute of Technology', lat: 12.9539, lng: 77.6007 }
];

const CITY_PRESETS = [
  { label: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { label: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { label: 'Delhi', lat: 28.6139, lng: 77.2090 },
  { label: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { label: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { label: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { label: 'Pune', lat: 18.5204, lng: 73.8567 },
  { label: 'Jaipur', lat: 26.9124, lng: 75.7873 },
  { label: 'Lucknow', lat: 26.8467, lng: 80.9462 },
  { label: 'Indore', lat: 22.7196, lng: 75.8577 }
];

const EMPTY = { pickupLabel:'', pickupLat:'', pickupLng:'', dropLabel:'', dropLat:'', dropLng:'', date:'', time:'', seatsAvailable:2, costPerSeat:'' };

export default function CreateRide({ navigate }) {
  const { user } = useAuth();
  const [form,    setForm]    = useState(EMPTY);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const isProvider = user?.role === 'provider' || user?.role === 'both';
  if (!isProvider) {
    return (
      <div className="narrow-wrap fade-up text-center" style={{paddingTop:80}}>
        <div style={{fontSize:64}}>🚫</div>
        <h2 className="heading mt-20" style={{fontSize:28}}>Access Denied</h2>
        <p className="text-muted mt-8">Only providers can create rides. Your current role: <strong>{user?.role || 'unknown'}</strong></p>
        <button className="btn btn-primary btn-lg mt-32" onClick={() => navigate('dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const applyPreset = (which, p) => {
    const key = which === 'pickup';
    setForm(f => ({
      ...f,
      [key ? 'pickupLabel' : 'dropLabel']: p.label,
      [key ? 'pickupLat'   : 'dropLat']:   p.lat,
      [key ? 'pickupLng'   : 'dropLng']:   p.lng,
    }));
  };

  const geoLocate = (which) => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const isPickup = which === 'pickup';
        setForm(f => ({
          ...f,
          [isPickup ? 'pickupLabel':'dropLabel']: 'My Location',
          [isPickup ? 'pickupLat'  :'dropLat']:   coords.latitude,
          [isPickup ? 'pickupLng'  :'dropLng']:   coords.longitude,
        }));
      },
      () => setError('Could not get location')
    );
  };

  const validate = () => {
    if (!form.pickupLat || !form.pickupLng) return 'Set pickup coordinates';
    if (!form.dropLat   || !form.dropLng)   return 'Set drop coordinates';
    if (!form.date) return 'Date is required';
    if (!form.time) return 'Time is required';
    if (!form.costPerSeat || Number(form.costPerSeat) <= 0) return 'Enter a valid cost per seat';
    if (new Date(`${form.date}T${form.time}`) < new Date()) return 'Date/time must be in the future';
    return null;
    // College validation removed — partial string matching was rejecting valid locations
    // typed in slightly different ways. Location is already constrained by LocationSearch.
  };

  const submit = async e => {
    e.preventDefault();
    setError('');
    const v = validate();
    if (v) { setError(v); return; }
    setLoading(true);
    try {
      const ride = await api.createRide({
        // CHANGE: send address string so location names are saved in the DB
        // and shown in ride cards & details instead of raw coordinates.
        pickup: {
          coordinates: [parseFloat(form.pickupLng), parseFloat(form.pickupLat)],
          address:     form.pickupLabel,
        },
        drop: {
          coordinates: [parseFloat(form.dropLng), parseFloat(form.dropLat)],
          address:     form.dropLabel,
        },
        date: new Date(`${form.date}T${form.time}`).toISOString(),
        time: form.time,
        seatsAvailable: Number(form.seatsAvailable),
        costPerSeat:    Number(form.costPerSeat),
      });
      setSuccess(ride);
    } catch (err) {
      setError(err.message || 'Failed to create ride');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="narrow-wrap fade-up text-center" style={{paddingTop:80}}>
      <div style={{fontSize:64}}>🎉</div>
      <h2 className="heading mt-20" style={{fontSize:28}}>Ride Posted!</h2>
      <p className="text-muted mt-8">Your ride is live. Seekers near your pickup can now find and book it.</p>
      <div className="flex-center gap-12 mt-32">
        <button className="btn btn-primary btn-lg" onClick={() => navigate('provider-bookings')}>
          View Requests
        </button>
        <button className="btn btn-secondary" onClick={() => { setSuccess(null); setForm(EMPTY); }}>
          Post Another
        </button>
      </div>
    </div>
  );

  const maxEarnings = (form.seatsAvailable * (Number(form.costPerSeat) || 0));

  return (
    <div className="narrow-wrap fade-up">
      <p className="eyebrow mb-16">Provider</p>
      <h1 className="heading mb-8" style={{fontSize:30}}>Offer a Ride</h1>
      <p className="text-muted mb-28 text-sm">Set your route. Seekers near your pickup will find your ride.</p>

      <form onSubmit={submit}>
        {error && <div className="alert alert-error mb-20">{error}</div>}

        {/* ── Pickup ── */}
        <div className="loc-section">
          <div className="ls-head">
            <span className="ls-dot green" /><span className="ls-label">Pickup Point</span>
          </div>
          <div className="field">
            <label>Pickup Location ✶</label>
            <LocationSearch
              value={form.pickupLabel}
              onChange={(label, lat, lng) => setForm(f => ({ ...f, pickupLabel: label, pickupLat: lat.toString(), pickupLng: lng.toString() }))}
              placeholder="Search for pickup location..."
              className="mb-12"
            />
          </div>
          <div className="preset-row">
            {COLLEGE_PRESETS.slice(0,5).map(p => (
              <button key={p.label} type="button" className="preset-chip" onClick={() => applyPreset('pickup', p)}>{p.label}</button>
            ))}
          </div>
        </div>

        {/* ── Drop ── */}
        <div className="loc-section">
          <div className="ls-head">
            <span className="ls-dot red" /><span className="ls-label">Drop Point</span>
          </div>
          <div className="field">
            <label>Drop Location ✶</label>
            <LocationSearch
              value={form.dropLabel}
              onChange={(label, lat, lng) => setForm(f => ({ ...f, dropLabel: label, dropLat: lat.toString(), dropLng: lng.toString() }))}
              placeholder="Search for drop location..."
              className="mb-12"
            />
          </div>
          <div className="preset-row">
            {CITY_PRESETS.slice(0,5).map(p => (
              <button key={p.label} type="button" className="preset-chip" onClick={() => applyPreset('drop', p)}>{p.label}</button>
            ))}
          </div>
        </div>

        {/* ── Date / Time / Cost ── */}
        <div className="grid-3 mb-20">
          <div className="field" style={{marginBottom:0}}>
            <label>Date ✶</label>
            <input className="input" type="date" min={new Date().toISOString().split('T')[0]} value={form.date} onChange={set('date')} required />
          </div>
          <div className="field" style={{marginBottom:0}}>
            <label>Time ✶</label>
            <input className="input" type="time" value={form.time} onChange={set('time')} required />
          </div>
          <div className="field" style={{marginBottom:0}}>
            <label>Cost/Seat ₹ ✶</label>
            <input className="input" type="number" min="1" placeholder="350" value={form.costPerSeat} onChange={set('costPerSeat')} required />
          </div>
        </div>

        {/* ── Seats ── */}
        <div className="field mb-20">
          <label>Available Seats ✶</label>
          <div className="seat-grid">
            {[1,2,3,4].map(n => (
              <button key={n} type="button"
                className={`seat-btn ${form.seatsAvailable === n ? 'sel' : ''}`}
                onClick={() => setForm(f => ({...f, seatsAvailable: n}))}>
                {n} {n===1?'seat':'seats'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Earnings preview ── */}
        {maxEarnings > 0 && (
          <div className="earn-card mb-20">
            <div>
              <div className="earn-label">Max earnings if fully booked</div>
              <div className="earn-formula text-dim text-xs">{form.seatsAvailable} seat{form.seatsAvailable>1?'s':''} × ₹{form.costPerSeat}</div>
            </div>
            <div className="earn-amount">₹{maxEarnings}</div>
          </div>
        )}

        <button type="submit" className={`btn btn-primary btn-lg btn-full ${loading ? 'btn-loading' : ''}`} disabled={loading}>
          {!loading && '🚗 Post Ride'}
        </button>
      </form>
    </div>
  );
}