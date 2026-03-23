import React, { useState, useEffect } from 'react';
import * as api from '../services/api.js';
import LocationSearch from '../components/LocationSearch.jsx';

/* ─── inline styles ──────────────────────────────────────────────── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');

  .ra-wrap {
    max-width: 680px;
    margin: 0 auto;
    padding: 44px 24px 100px;
    font-family: 'Sora', sans-serif;
    color: rgba(255,255,255,0.88);
  }

  /* header */
  .ra-eyebrow {
    font-size: 10px; font-weight: 700; letter-spacing: 0.2em;
    text-transform: uppercase; color: #f59e0b; margin-bottom: 8px;
  }
  .ra-title {
    font-family: 'Instrument Serif', serif;
    font-size: 34px; font-weight: 400; margin: 0 0 8px;
    color: rgba(255,255,255,0.92);
  }
  .ra-sub { font-size: 13px; color: rgba(255,255,255,0.38); margin-bottom: 32px; }

  /* tabs */
  .ra-tabs {
    display: flex; gap: 6px; margin-bottom: 28px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px; padding: 5px;
  }
  .ra-tab {
    flex: 1; padding: 10px 0; border: none; border-radius: 9px;
    font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all 0.2s;
    background: transparent; color: rgba(255,255,255,0.35);
  }
  .ra-tab.active {
    background: #f59e0b; color: #1a0f00;
    box-shadow: 0 2px 12px rgba(245,158,11,0.35);
  }

  /* alert / success banners */
  .ra-banner {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 14px 16px; border-radius: 12px;
    font-size: 13px; font-weight: 500; margin-bottom: 18px;
    animation: ra-fade 0.2s ease;
  }
  @keyframes ra-fade { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
  .ra-banner-err  { background: rgba(239,68,68,0.1);  border: 1px solid rgba(239,68,68,0.25);  color: #fca5a5; }
  .ra-banner-ok   { background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.2);   color: #86efac; }

  /* card */
  .ra-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 18px; padding: 24px;
    margin-bottom: 20px;
  }
  .ra-card-title {
    font-size: 15px; font-weight: 700; margin-bottom: 20px;
    color: rgba(255,255,255,0.9);
    display: flex; align-items: center; gap: 8px;
  }
  .ra-card-title-icon {
    width: 28px; height: 28px; border-radius: 8px;
    background: rgba(245,158,11,0.15);
    display: flex; align-items: center; justify-content: center;
    font-size: 14px;
  }

  /* fields */
  .ra-field { margin-bottom: 16px; }
  .ra-label {
    display: block; font-size: 11px; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: rgba(255,255,255,0.38); margin-bottom: 7px;
  }
  .ra-input {
    width: 100%; box-sizing: border-box;
    padding: 11px 14px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    font-family: 'Sora', sans-serif; font-size: 13px;
    color: rgba(255,255,255,0.88);
    outline: none; transition: border-color 0.2s, box-shadow 0.2s;
  }
  .ra-input:focus {
    border-color: rgba(245,158,11,0.5);
    box-shadow: 0 0 0 3px rgba(245,158,11,0.1);
  }
  .ra-input::placeholder { color: rgba(255,255,255,0.2); }
  .ra-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

  /* radius row */
  .ra-radius-row {
    display: flex; align-items: center; gap: 10px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 10px; padding: 10px 14px;
  }
  .ra-radius-label { font-size: 12px; color: rgba(255,255,255,0.4); flex: 1; }
  .ra-radius-val {
    font-size: 13px; font-weight: 700; color: #f59e0b; min-width: 52px; text-align: right;
  }
  .ra-slider {
    width: 100px; accent-color: #f59e0b; cursor: pointer;
  }

  /* submit btn */
  .ra-btn {
    width: 100%; padding: 13px;
    background: #f59e0b; color: #1a0f00;
    border: none; border-radius: 12px;
    font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 700;
    cursor: pointer; transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    margin-top: 6px;
    box-shadow: 0 4px 16px rgba(245,158,11,0.25);
  }
  .ra-btn:hover:not(:disabled) {
    background: #d97706;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(245,158,11,0.35);
  }
  .ra-btn:disabled { opacity: 0.45; cursor: not-allowed; }

  /* active alerts list */
  .ra-alert-item {
    display: flex; align-items: center; gap: 14px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px; padding: 16px 18px;
    margin-bottom: 10px;
    transition: border-color 0.2s;
    position: relative; overflow: hidden;
  }
  .ra-alert-item::before {
    content: '';
    position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
    background: linear-gradient(180deg, #f59e0b, rgba(245,158,11,0.2));
  }
  .ra-alert-icon {
    width: 38px; height: 38px; border-radius: 10px;
    background: rgba(245,158,11,0.12);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; flex-shrink: 0;
  }
  .ra-alert-body { flex: 1; min-width: 0; }
  .ra-alert-name { font-size: 14px; font-weight: 700; margin-bottom: 3px; }
  .ra-alert-meta { font-size: 11px; color: rgba(255,255,255,0.3); }
  .ra-alert-del {
    padding: 6px 14px; border-radius: 8px;
    background: rgba(239,68,68,0.1);
    border: 1px solid rgba(239,68,68,0.2);
    color: #fca5a5; font-size: 12px; font-weight: 600;
    cursor: pointer; transition: background 0.15s; flex-shrink: 0;
  }
  .ra-alert-del:hover { background: rgba(239,68,68,0.2); }

  /* empty */
  .ra-empty {
    text-align: center; padding: 48px 20px;
    color: rgba(255,255,255,0.25); font-size: 13px;
  }
  .ra-empty-icon { font-size: 36px; margin-bottom: 10px; opacity: 0.4; }

  /* section heading */
  .ra-section-label {
    font-size: 11px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: rgba(255,255,255,0.25);
    margin: 24px 0 12px;
  }
`;

const API_BASE = import.meta.env?.VITE_API_URL || 'http://localhost:5000';

function getToken() {
  return localStorage.getItem('cr_token') || '';
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(opts.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || `Error ${res.status}`);
  return data;
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function RouteAlerts({ navigate }) {
  const [tab, setTab]     = useState('alerts');
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    name: '', pickup: null, drop: null,
    pickupRadius: 3000, dropRadius: 3000,
  });

  const [reqForm, setReqForm] = useState({
    pickup: null, drop: null, date: '', timeStart: '',
  });

  /* fetch alerts */
  useEffect(() => {
    apiFetch('/alerts/my')
      .then(d => setAlerts(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function notify(type, msg) {
    if (type === 'err') setError(msg);
    else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 5000);
  }

  /* create alert */
  async function handleSubscribe(e) {
    e.preventDefault();
    if (!form.pickup || !form.drop) return notify('err', 'Select both pickup and drop locations');
    setSubmitting(true);
    try {
      const res = await apiFetch('/alerts', {
        method: 'POST',
        body: JSON.stringify({
          name:         form.name || 'Route Alert',
          pickup:       { coordinates: [form.pickup.lng, form.pickup.lat] },
          drop:         { coordinates: [form.drop.lng,  form.drop.lat]  },
          pickupRadius: Number(form.pickupRadius),
          dropRadius:   Number(form.dropRadius),
        }),
      });
      setAlerts(a => [res.alert, ...a]);
      setForm({ name: '', pickup: null, drop: null, pickupRadius: 3000, dropRadius: 3000 });
      notify('ok', `Alert created! ${res.immediateMatches > 0 ? `${res.immediateMatches} matching rides found right now.` : "You'll be notified when rides match."}`);
    } catch (err) {
      notify('err', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  /* delete alert */
  async function handleDelete(id) {
    try {
      await apiFetch(`/alerts/${id}`, { method: 'DELETE' });
      setAlerts(a => a.filter(x => x._id !== id));
    } catch (err) {
      notify('err', err.message);
    }
  }

  /* post ride request */
  async function handlePostRequest(e) {
    e.preventDefault();
    if (!reqForm.pickup || !reqForm.drop) return notify('err', 'Select both pickup and drop locations');
    setSubmitting(true);
    try {
      await apiFetch('/alerts', {
        method: 'POST',
        body: JSON.stringify({
          name:   'Ride Request',
          pickup: { coordinates: [reqForm.pickup.lng, reqForm.pickup.lat] },
          drop:   { coordinates: [reqForm.drop.lng,  reqForm.drop.lat]  },
          date:   reqForm.date || undefined,
          timeRange: reqForm.timeStart ? { start: reqForm.timeStart, end: reqForm.timeStart } : undefined,
        }),
      });
      setReqForm({ pickup: null, drop: null, date: '', timeStart: '' });
      notify('ok', 'Ride request posted! Providers near your route will be notified.');
    } catch (err) {
      notify('err', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <style>{css}</style>
      <div className="ra-wrap">

        <p className="ra-eyebrow">Notifications</p>
        <h1 className="ra-title">Route Alerts</h1>
        <p className="ra-sub">Get notified when rides match your route, or post a request for providers to see.</p>

        {error   && <div className="ra-banner ra-banner-err">⚠ {error}</div>}
        {success && <div className="ra-banner ra-banner-ok">✓ {success}</div>}

        {/* Tabs */}
        <div className="ra-tabs">
          {[['alerts','🔔 My Alerts'], ['create','＋ New Alert'], ['request','🚗 Post Request']].map(([key, label]) => (
            <button key={key} className={`ra-tab${tab === key ? ' active' : ''}`}
              onClick={() => { setTab(key); setError(''); setSuccess(''); }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── My Alerts ── */}
        {tab === 'alerts' && (
          <div>
            {loading ? (
              <div className="ra-empty"><div className="ra-empty-icon">⏳</div>Loading your alerts…</div>
            ) : alerts.length === 0 ? (
              <div className="ra-empty">
                <div className="ra-empty-icon">🔔</div>
                No active alerts yet.<br/>Create one to get notified when rides match your route.
              </div>
            ) : (
              <>
                <div className="ra-section-label">{alerts.length} active alert{alerts.length !== 1 ? 's' : ''}</div>
                {alerts.map(a => (
                  <div key={a._id} className="ra-alert-item">
                    <div className="ra-alert-icon">🔔</div>
                    <div className="ra-alert-body">
                      <div className="ra-alert-name">{a.name || 'Route Alert'}</div>
                      <div className="ra-alert-meta">
                        Pickup radius: {(a.pickupRadius / 1000).toFixed(1)} km
                        &nbsp;·&nbsp;
                        Drop radius: {(a.dropRadius / 1000).toFixed(1)} km
                        {a.matchCount > 0 && ` · ${a.matchCount} match${a.matchCount !== 1 ? 'es' : ''} found`}
                      </div>
                    </div>
                    <button className="ra-alert-del" onClick={() => handleDelete(a._id)}>Delete</button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── Create Alert ── */}
        {tab === 'create' && (
          <div className="ra-card">
            <div className="ra-card-title">
              <div className="ra-card-title-icon">🔔</div>
              Create Route Alert
            </div>
            <form onSubmit={handleSubscribe}>
              <div className="ra-field">
                <label className="ra-label">Alert Name (optional)</label>
                <input className="ra-input" placeholder="e.g. Home to College"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="ra-field">
                <label className="ra-label">Pickup Location *</label>
                <LocationSearch placeholder="Search pickup location"
                  onLocationSelect={loc => setForm(f => ({ ...f, pickup: loc }))} />
              </div>
              <div className="ra-field">
                <label className="ra-label">Drop Location *</label>
                <LocationSearch placeholder="Search drop location"
                  onLocationSelect={loc => setForm(f => ({ ...f, drop: loc }))} />
              </div>
              <div className="ra-field">
                <label className="ra-label">Match Radius</label>
                <div className="ra-radius-row">
                  <span className="ra-radius-label">📍 Pickup</span>
                  <input type="range" className="ra-slider" min="500" max="10000" step="500"
                    value={form.pickupRadius} onChange={e => setForm(f => ({ ...f, pickupRadius: e.target.value }))} />
                  <span className="ra-radius-val">{(form.pickupRadius / 1000).toFixed(1)} km</span>
                </div>
                <div className="ra-radius-row" style={{ marginTop: 8 }}>
                  <span className="ra-radius-label">🏁 Drop</span>
                  <input type="range" className="ra-slider" min="500" max="10000" step="500"
                    value={form.dropRadius} onChange={e => setForm(f => ({ ...f, dropRadius: e.target.value }))} />
                  <span className="ra-radius-val">{(form.dropRadius / 1000).toFixed(1)} km</span>
                </div>
              </div>
              <button className="ra-btn" type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create Alert'}
              </button>
            </form>
          </div>
        )}

        {/* ── Post Request ── */}
        {tab === 'request' && (
          <div className="ra-card">
            <div className="ra-card-title">
              <div className="ra-card-title-icon">🚗</div>
              Post a Ride Request
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 20 }}>
              No rides found? Let providers near your route know you need a ride.
            </p>
            <form onSubmit={handlePostRequest}>
              <div className="ra-field">
                <label className="ra-label">Pickup Location *</label>
                <LocationSearch placeholder="Search pickup"
                  onLocationSelect={loc => setReqForm(f => ({ ...f, pickup: loc }))} />
              </div>
              <div className="ra-field">
                <label className="ra-label">Drop Location *</label>
                <LocationSearch placeholder="Search drop"
                  onLocationSelect={loc => setReqForm(f => ({ ...f, drop: loc }))} />
              </div>
              <div className="ra-grid2">
                <div className="ra-field">
                  <label className="ra-label">Date (optional)</label>
                  <input className="ra-input" type="date"
                    value={reqForm.date} onChange={e => setReqForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="ra-field">
                  <label className="ra-label">Preferred time</label>
                  <input className="ra-input" type="time"
                    value={reqForm.timeStart} onChange={e => setReqForm(f => ({ ...f, timeStart: e.target.value }))} />
                </div>
              </div>
              <button className="ra-btn" type="submit" disabled={submitting}>
                {submitting ? 'Posting…' : 'Post Ride Request'}
              </button>
            </form>
          </div>
        )}

      </div>
    </>
  );
}