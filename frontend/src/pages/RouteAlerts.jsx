import React, { useState, useEffect } from 'react';
import * as api from '../services/api.js';

export default function RouteAlerts({ navigate }) {
  const [tab, setTab] = useState('subscriptions');
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ 
    name: '', 
    pickupLat: '', 
    pickupLng: '', 
    dropLat: '', 
    dropLng: '', 
    pickupRadius: 5000, 
    dropRadius: 5000 
  });
  const [reqForm, setReqForm] = useState({ 
    pickupLat: '', 
    pickupLng: '', 
    dropLat: '', 
    dropLng: '', 
    date: '', 
    timeStart: '', 
    timeEnd: '' 
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    api.getMyAlerts()
      .then(d => setAlerts(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setR = k => e => setReqForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubscribe = async (e) => {
    e.preventDefault();
    setError(''); 
    setSuccess('');
    if (!form.pickupLat || !form.dropLat) return setError('Coordinates are required');
    setActionLoading(true);
    try {
      const res = await api.createAlert({
        name: form.name,
        pickup: { coordinates: [parseFloat(form.pickupLng), parseFloat(form.pickupLat)] },
        drop:   { coordinates: [parseFloat(form.dropLng),   parseFloat(form.dropLat)] },
        pickupRadius: Number(form.pickupRadius),
        dropRadius:   Number(form.dropRadius),
      });
      setAlerts(a => [res.alert, ...a]);
      setSuccess('Alert created! You will be notified when rides match your route.');
      setForm({ name: '', pickupLat: '', pickupLng: '', dropLat: '', dropLng: '', pickupRadius: 5000, dropRadius: 5000 });
    } catch (err) {
      setError(err.message || 'Failed to create alert');
    } finally { 
      setActionLoading(false); 
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteAlert(id);
      setAlerts(a => a.filter(x => x._id !== id));
    } catch (err) { 
      setError(err.message); 
    }
  };

  const handlePostRequest = async (e) => {
    e.preventDefault();
    setError(''); 
    setSuccess('');
    setActionLoading(true);
    try {
      await api.createAlert({
        name: 'Ride Request',
        pickup: { coordinates: [parseFloat(reqForm.pickupLng), parseFloat(reqForm.pickupLat)] },
        drop:   { coordinates: [parseFloat(reqForm.dropLng),   parseFloat(reqForm.dropLat)] },
        date: reqForm.date,
        timeRange: { start: reqForm.timeStart, end: reqForm.timeEnd },
      });
      setSuccess('Ride request posted! Providers near your route will see it.');
      setReqForm({ pickupLat: '', pickupLng: '', dropLat: '', dropLng: '', date: '', timeStart: '', timeEnd: '' });
    } catch (err) {
      setError(err.message || 'Failed to post request');
    } finally { 
      setActionLoading(false); 
    }
  };

  return (
    <div className="narrow-wrap fade-up">
      <h1 className="heading mb-4" style={{ fontSize: 28 }}>Route Alerts</h1>
      <p className="text-muted mb-24 text-sm">Subscribe to alerts for your route, or post a ride request when no rides are found.</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['subscriptions', 'request'].map(t => (
          <button 
            key={t} 
            onClick={() => { setTab(t); setError(''); setSuccess(''); }}
            style={{ 
              padding: '8px 18px', 
              borderRadius: 8, 
              border: 'none', 
              cursor: 'pointer', 
              fontWeight: 600,
              background: tab === t ? '#6c63ff' : '#222', 
              color: tab === t ? '#fff' : '#aaa' 
            }}
          >
            {t === 'subscriptions' ? 'My Alerts' : 'Post Request'}
          </button>
        ))}
      </div>

      {error   && <div className="alert alert-error mb-16">{error}</div>}
      {success && (
        <div 
          className="alert alert-success mb-16" 
          style={{ 
            background: '#1e3a1e', 
            color: '#a0f4a0', 
            border: '1px solid #2e5a2e', 
            borderRadius: 8, 
            padding: 12 
          }}
        >
          {success}
        </div>
      )}

      {tab === 'subscriptions' && (
        <div>
          <div style={{ 
            background: '#1a1a2e', 
            border: '1px solid #333', 
            borderRadius: 12, 
            padding: 20, 
            marginBottom: 20 
          }}>
            <h3 style={{ color: '#fff', marginBottom: 16, fontSize: 16 }}>Create Route Alert</h3>
            <form onSubmit={handleSubscribe}>
              <div className="field">
                <label>Alert Name</label>
                <input 
                  className="input" 
                  placeholder="e.g. Home to College" 
                  value={form.name} 
                  onChange={set('name')} 
                />
              </div>
              <div className="grid-2">
                <div className="field">
                  <label>Pickup Lat</label>
                  <input 
                    className="input" 
                    type="number" 
                    step="any" 
                    value={form.pickupLat} 
                    onChange={set('pickupLat')} 
                    required 
                  />
                </div>
                <div className="field">
                  <label>Pickup Lng</label>
                  <input 
                    className="input" 
                    type="number" 
                    step="any" 
                    value={form.pickupLng} 
                    onChange={set('pickupLng')} 
                    required 
                  />
                </div>
              </div>
              <div className="grid-2">
                <div className="field">
                  <label>Drop Lat</label>
                  <input 
                    className="input" 
                    type="number" 
                    step="any" 
                    value={form.dropLat} 
                    onChange={set('dropLat')} 
                    required 
                  />
                </div>
                <div className="field">
                  <label>Drop Lng</label>
                  <input 
                    className="input" 
                    type="number" 
                    step="any" 
                    value={form.dropLng} 
                    onChange={set('dropLng')} 
                    required 
                  />
                </div>
              </div>
              <button 
                type="submit" 
                className="btn btn-primary btn-full" 
                disabled={actionLoading}
              >
                {actionLoading ? 'Creating...' : 'Create Alert'}
              </button>
            </form>
          </div>

          {loading ? (
            <p className="text-muted">Loading...</p>
          ) : alerts.length === 0 ? (
            <p className="text-muted text-sm">No active alerts yet.</p>
          ) : (
            <div>
              <h4 style={{ color: '#fff', marginBottom: 12 }}>Active Alerts</h4>
              {alerts.map(a => (
                <div 
                  key={a._id} 
                  style={{ 
                    background: '#1a1a2e', 
                    border: '1px solid #333', 
                    borderRadius: 10, 
                    padding: 16, 
                    marginBottom: 10, 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center' 
                  }}
                >
                  <div>
                    <div style={{ color: '#fff', fontWeight: 600 }}>{a.name || 'Route Alert'}</div>
                    <div style={{ color: '#888', fontSize: 12 }}>
                      Radius: {a.pickupRadius}m pickup / {a.dropRadius}m drop
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(a._id)}
                    style={{ 
                      padding: '6px 12px', 
                      borderRadius: 6, 
                      background: '#3a1a1a', 
                      color: '#f87272', 
                      border: '1px solid #5a2a2a', 
                      cursor: 'pointer', 
                      fontSize: 12 
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'request' && (
        <div style={{ 
          background: '#1a1a2e', 
          border: '1px solid #333', 
          borderRadius: 12, 
          padding: 20 
        }}>
          <h3 style={{ color: '#fff', marginBottom: 4, fontSize: 16 }}>Post a Ride Request</h3>
          <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
            No rides found? Let providers know your route.
          </p>
          <form onSubmit={handlePostRequest}>
            <div className="grid-2">
              <div className="field">
                <label>Pickup Lat</label>
                <input 
                  className="input" 
                  type="number" 
                  step="any" 
                  value={reqForm.pickupLat} 
                  onChange={setR('pickupLat')} 
                  required 
                />
              </div>
              <div className="field">
                <label>Pickup Lng</label>
                <input 
                  className="input" 
                  type="number" 
                  step="any" 
                  value={reqForm.pickupLng} 
                  onChange={setR('pickupLng')} 
                  required 
                />
              </div>
            </div>
            <div className="grid-2">
              <div className="field">
                <label>Drop Lat</label>
                <input 
                  className="input" 
                  type="number" 
                  step="any" 
                  value={reqForm.dropLat} 
                  onChange={setR('dropLat')} 
                  required 
                />
              </div>
              <div className="field">
                <label>Drop Lng</label>
                <input 
                  className="input" 
                  type="number" 
                  step="any" 
                  value={reqForm.dropLng} 
                  onChange={setR('dropLng')} 
                  required 
                />
              </div>
            </div>
            <div className="grid-2">
              <div className="field">
                <label>Date</label>
                <input 
                  className="input" 
                  type="date" 
                  value={reqForm.date} 
                  onChange={setR('date')} 
                />
              </div>
              <div className="field">
                <label>Preferred Time (from)</label>
                <input 
                  className="input" 
                  type="time" 
                  value={reqForm.timeStart} 
                  onChange={setR('timeStart')} 
                />
              </div>
            </div>
            <button 
              type="submit" 
              className="btn btn-primary btn-full" 
              disabled={actionLoading}
            >
              {actionLoading ? 'Posting...' : 'Post Ride Request'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}