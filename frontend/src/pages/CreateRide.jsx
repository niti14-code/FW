import React, { useState } from 'react';
import * as api from '../services/api.js';
import './CreateRide.css';

const PRESETS = [
  { label:'IIT Bombay',     lat:19.1334, lng:72.9133 },
  { label:'IIT Delhi',      lat:28.5459, lng:77.1926 },
  { label:'BITS Pilani',    lat:28.3671, lng:73.0676 },
  { label:'NIT Jaipur',     lat:26.8557, lng:75.8062 },
  { label:'VIT Vellore',    lat:12.9698, lng:79.1559 },
  { label:'Mumbai Airport', lat:19.0896, lng:72.8656 },
  { label:'Delhi Airport',  lat:28.5562, lng:77.1000 },
  { label:'Jaipur Airport', lat:26.8242, lng:75.8122 },
];

const EMPTY = { pickupLabel:'', pickupLat:'', pickupLng:'', dropLabel:'', dropLat:'', dropLng:'', date:'', time:'', seatsAvailable:2, costPerSeat:'' };

export default function CreateRide({ navigate }) {
  const [form,    setForm]    = useState(EMPTY);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

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
  };

  const submit = async e => {
    e.preventDefault();
    setError('');
    const v = validate();
    if (v) { setError(v); return; }
    setLoading(true);
    try {
      const ride = await api.createRide({
        pickup: { coordinates: [parseFloat(form.pickupLng), parseFloat(form.pickupLat)] },
        drop:   { coordinates: [parseFloat(form.dropLng),   parseFloat(form.dropLat)] },
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
            <label>Location name <span className="text-dim text-xs">(optional label)</span></label>
            <input className="input" placeholder="e.g. IIT Bombay Main Gate" value={form.pickupLabel} onChange={set('pickupLabel')} />
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Latitude ✶</label>
              <input className="input" type="number" step="any" placeholder="19.1334" value={form.pickupLat} onChange={set('pickupLat')} required />
            </div>
            <div className="field">
              <label>Longitude ✶</label>
              <input className="input" type="number" step="any" placeholder="72.9133" value={form.pickupLng} onChange={set('pickupLng')} required />
            </div>
          </div>
          <div className="preset-row">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => geoLocate('pickup')}>📍 My Location</button>
            {PRESETS.slice(0,5).map(p => (
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
            <label>Location name <span className="text-dim text-xs">(optional label)</span></label>
            <input className="input" placeholder="e.g. Mumbai Airport T2" value={form.dropLabel} onChange={set('dropLabel')} />
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Latitude ✶</label>
              <input className="input" type="number" step="any" placeholder="19.0896" value={form.dropLat} onChange={set('dropLat')} required />
            </div>
            <div className="field">
              <label>Longitude ✶</label>
              <input className="input" type="number" step="any" placeholder="72.8656" value={form.dropLng} onChange={set('dropLng')} required />
            </div>
          </div>
          <div className="preset-row">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => geoLocate('drop')}>📍 My Location</button>
            {PRESETS.slice(5).map(p => (
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
