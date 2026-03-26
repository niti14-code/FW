import React, { useState, useEffect } from 'react';

/* ─── inline styles ──────────────────────────────────────────────── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');

  .ir-wrap {
    max-width: 680px; margin: 0 auto;
    padding: 44px 24px 100px;
    font-family: 'Sora', sans-serif;
    color: rgba(255,255,255,0.88);
  }

  .ir-eyebrow {
    font-size: 10px; font-weight: 700; letter-spacing: 0.2em;
    text-transform: uppercase; color: #ef4444; margin-bottom: 8px;
  }
  .ir-title {
    font-family: 'Instrument Serif', serif;
    font-size: 34px; font-weight: 400; margin: 0 0 8px;
    color: rgba(255,255,255,0.92);
  }
  .ir-sub { font-size: 13px; color: rgba(255,255,255,0.38); margin-bottom: 32px; }

  /* banner */
  .ir-banner {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 14px 16px; border-radius: 12px;
    font-size: 13px; font-weight: 500; margin-bottom: 18px;
    animation: ir-fade 0.2s ease;
  }
  @keyframes ir-fade { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
  .ir-banner-err { background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.25); color:#fca5a5; }
  .ir-banner-ok  { background:rgba(34,197,94,0.08); border:1px solid rgba(34,197,94,0.2); color:#86efac; }

  /* card */
  .ir-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 18px; padding: 24px; margin-bottom: 20px;
  }
  .ir-card-title {
    font-size: 15px; font-weight: 700; margin-bottom: 20px;
    color: rgba(255,255,255,0.9);
    display: flex; align-items: center; gap: 10px;
  }
  .ir-card-icon {
    width: 30px; height: 30px; border-radius: 8px;
    background: rgba(239,68,68,0.15);
    display: flex; align-items: center; justify-content: center;
    font-size: 14px;
  }

  /* field */
  .ir-field { margin-bottom: 16px; }
  .ir-label {
    display: block; font-size: 11px; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: rgba(255,255,255,0.38); margin-bottom: 7px;
  }
  .ir-input, .ir-select, .ir-textarea {
    width: 100%; box-sizing: border-box;
    padding: 11px 14px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    font-family: 'Sora', sans-serif; font-size: 13px;
    color: rgba(255,255,255,0.88);
    outline: none; transition: border-color 0.2s, box-shadow 0.2s;
  }
  .ir-input:focus, .ir-select:focus, .ir-textarea:focus {
    border-color: rgba(239,68,68,0.5);
    box-shadow: 0 0 0 3px rgba(239,68,68,0.08);
  }
  .ir-input::placeholder, .ir-textarea::placeholder { color: rgba(255,255,255,0.2); }
  .ir-select option { background: #1a1a2e; }
  .ir-textarea { resize: vertical; min-height: 100px; }
  .ir-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

  /* ride picker */
  .ir-ride-list { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
  .ir-ride-option {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 14px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px; cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .ir-ride-option:hover { border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.04); }
  .ir-ride-selected { border-color: rgba(239,68,68,0.5) !important; background: rgba(239,68,68,0.07) !important; }
  .ir-ride-check {
    width: 20px; height: 20px; border-radius: 50%;
    border: 1.5px solid rgba(255,255,255,0.15);
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700; color: #ef4444; flex-shrink: 0;
  }
  .ir-ride-selected .ir-ride-check { border-color: #ef4444; background: rgba(239,68,68,0.15); }
  .ir-ride-name { font-size: 13px; font-weight: 600; }
  .ir-ride-meta { font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 2px; }
  .ir-no-rides { font-size: 13px; color: rgba(255,255,255,0.3); padding: 12px 0; }

  /* severity chips */
  .ir-severity-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .ir-sev-chip {
    padding: 7px 16px; border-radius: 8px;
    font-size: 12px; font-weight: 700;
    cursor: pointer; transition: all 0.15s;
    border: 1.5px solid transparent;
  }
  .ir-sev-low     { background: rgba(34,197,94,0.1);  color: #86efac; border-color: rgba(34,197,94,0.2); }
  .ir-sev-medium  { background: rgba(245,158,11,0.1); color: #fcd34d; border-color: rgba(245,158,11,0.2); }
  .ir-sev-high    { background: rgba(239,68,68,0.1);  color: #fca5a5; border-color: rgba(239,68,68,0.2); }
  .ir-sev-critical{ background: rgba(220,38,38,0.15); color: #f87171; border-color: rgba(220,38,38,0.4); }
  .ir-sev-active  { transform: scale(1.05); filter: brightness(1.3); }

  /* type chips */
  .ir-type-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .ir-type-chip {
    padding: 7px 14px; border-radius: 8px;
    font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all 0.15s;
    background: rgba(255,255,255,0.05);
    border: 1.5px solid rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.5);
  }
  .ir-type-chip:hover { border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.8); }
  .ir-type-active {
    background: rgba(239,68,68,0.12) !important;
    border-color: rgba(239,68,68,0.35) !important;
    color: #fca5a5 !important;
  }

  /* submit btn */
  .ir-btn {
    width: 100%; padding: 13px;
    background: #ef4444; color: #fff;
    border: none; border-radius: 12px;
    font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 700;
    cursor: pointer; transition: background 0.2s, transform 0.15s;
    margin-top: 6px;
    box-shadow: 0 4px 16px rgba(239,68,68,0.25);
  }
  .ir-btn:hover:not(:disabled) { background: #dc2626; transform: translateY(-1px); }
  .ir-btn:disabled { opacity: 0.45; cursor: not-allowed; }

  /* incident history cards */
  .ir-inc-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px; padding: 18px 20px;
    margin-bottom: 12px; position: relative; overflow: hidden;
  }
  .ir-inc-card::before {
    content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
    background: linear-gradient(180deg, #ef4444, rgba(239,68,68,0.2));
    border-radius: 16px 0 0 16px;
    opacity: 0;
    transition: opacity 0.2s;
  }
  .ir-inc-card.exported::before { background: linear-gradient(180deg, #22c55e, rgba(34,197,94,0.2)); }
  .ir-inc-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
  .ir-inc-type { font-size: 14px; font-weight: 700; text-transform: capitalize; }
  .ir-inc-badge {
    font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; padding: 3px 10px; border-radius: 20px; flex-shrink: 0;
  }
  .ir-badge-open     { background: rgba(245,158,11,0.1); color: #fcd34d; border: 1px solid rgba(245,158,11,0.2); }
  .ir-badge-exported { background: rgba(34,197,94,0.1);  color: #86efac; border: 1px solid rgba(34,197,94,0.2); }
  .ir-badge-review   { background: rgba(99,102,241,0.1); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.2); }
  .ir-badge-resolved { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.1); }
  .ir-inc-desc { font-size: 13px; color: rgba(255,255,255,0.45); line-height: 1.6; margin-bottom: 10px; }
  .ir-ref { font-size: 11px; color: #86efac; font-weight: 600; margin-bottom: 10px; }
  .ir-inc-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .ir-action-btn {
    padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 600;
    cursor: pointer; transition: background 0.15s; border: 1px solid;
  }
  .ir-action-evid {
    background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.5);
  }
  .ir-action-evid:hover { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); }
  .ir-action-export {
    background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.2); color: #fca5a5;
  }
  .ir-action-export:hover { background: rgba(239,68,68,0.15); }
  .ir-evidence-box { margin-top: 12px; display: flex; gap: 8px; }
  .ir-evidence-input {
    flex: 1; padding: 9px 12px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px; font-family: 'Sora', sans-serif;
    font-size: 12px; color: rgba(255,255,255,0.8); outline: none;
  }
  .ir-evidence-submit {
    padding: 9px 16px; background: rgba(239,68,68,0.12);
    border: 1px solid rgba(239,68,68,0.25); border-radius: 8px;
    color: #fca5a5; font-size: 12px; font-weight: 700; cursor: pointer;
  }

  .ir-section-label {
    font-size: 11px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: rgba(255,255,255,0.25);
    margin: 0 0 14px;
  }
  .ir-tabs { display: flex; gap: 6px; margin-bottom: 28px;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px; padding: 5px; }
  .ir-tab {
    flex: 1; padding: 10px 0; border: none; border-radius: 9px;
    font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all 0.2s;
    background: transparent; color: rgba(255,255,255,0.35);
  }
  .ir-tab.active { background: #ef4444; color: #fff; box-shadow: 0 2px 12px rgba(239,68,68,0.3); }
`;

// FIXED: Import from api.js instead of duplicating
import { 
  API_BASE, 
  getToken, 
  apiFetch,
  getMyBookings,
  getRide 
} from '../services/api.js';

const TYPES = [
  { key: 'accident',      label: '🚨 Accident' },
  { key: 'harassment',    label: '⚠ Harassment' },
  { key: 'theft',         label: '💼 Theft' },
  { key: 'unsafe_driving',label: '🚗 Unsafe Driving' },
  { key: 'other',         label: '📋 Other' },
];

const SEVERITIES = [
  { key: 'low',      label: 'Low' },
  { key: 'medium',   label: 'Medium' },
  { key: 'high',     label: 'High' },
  { key: 'critical', label: '🚨 Critical' },
];

function badgeClass(status) {
  if (status === 'exported_to_authorities') return 'ir-badge-exported';
  if (status === 'under_review') return 'ir-badge-review';
  if (status === 'resolved') return 'ir-badge-resolved';
  return 'ir-badge-open';
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function IncidentReport({ navigate }) {
  const [tab, setTab] = useState('report');
  const [incidents, setIncidents] = useState([]);
  const [pastRides, setPastRides]     = useState([]);
  const [ridesLoading, setRidesLoading] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);

  const [form, setForm] = useState({
    type: 'other', description: '', severity: 'medium', rideDescription: '',
  });

  const [evidence, setEvidence]       = useState('');
  const [evidenceFor, setEvidenceFor] = useState(null);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [exportingId, setExportingId] = useState(null);

  function notify(type, msg) {
    if (type === 'err') setError(msg);
    else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 6000);
  }

  /* load my incidents */
  useEffect(() => {
    apiFetch('/incidents/my')
      .then(d => setIncidents(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  /* load past rides for the picker */
  useEffect(() => {
    if (tab !== 'report') return;
    setRidesLoading(true);
    
    // FIXED: Use only the correct endpoint, remove phantom routes
    (async () => {
      try {
        // FIXED: Use imported API function instead of raw fetch
        const data = await getMyBookings();
        const list = Array.isArray(data) ? data : (data.bookings || data.data || []);
        
        // Enrich with ride details if needed
        const enriched = await Promise.all(
          list.filter(b => b.status !== 'cancelled').map(async (b) => {
            const ride = b.rideId;
            if (!ride) return b;
            const prov = ride.providerId;
            if (prov && typeof prov === 'object' && prov.name) return b;
            const rideId = typeof ride === 'object' ? (ride._id || ride.id) : ride;
            if (!rideId) return b;
            
            try {
              // FIXED: Use imported API function with correct URL
              const rideData = await getRide(rideId);
              return { ...b, rideId: rideData.ride || rideData };
            } catch (_) {}
            return b;
          })
        );
        
        setPastRides(enriched);
        if (enriched.length === 0) {
          setRidesError('No past rides found. Describe the ride below instead.');
        }
      } catch (err) {
        setRidesError('Could not load your past rides. Please try again.');
      } finally {
        setRidesLoading(false);
      }
    })();
  }, [tab]);

  /* submit report */
  async function handleReport(e) {
    e.preventDefault();
    if (!form.description) return notify('err', 'Please describe what happened');
    setSubmitting(true);

    // Get location
    let location = undefined;
    try {
      location = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(
          p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => resolve(undefined),
          { timeout: 5000 }
        )
      );
    } catch (_) {}

    try {
      const payload = {
        type:            form.type,
        description:     form.description,
        severity:        form.severity,
        rideDescription: selectedRide?.label || form.rideDescription || undefined,
        rideId:          selectedRide?.rideId || undefined,
        location,
      };
      
      const res = await apiFetch('/incidents/report', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      setIncidents(prev => [res.incident, ...prev]);
      setForm({ type: 'other', description: '', severity: 'medium', rideDescription: '' });
      setSelectedRide(null);
      notify('ok', 'Incident reported. Our team will review it shortly.');
      setTab('history');
    } catch (err) {
      notify('err', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  /* add evidence */
  async function handleEvidence(id) {
    if (!evidence.trim()) return;
    try {
      await apiFetch(`/incidents/${id}/evidence`, {
        method: 'POST',
        body: JSON.stringify({ evidence: [evidence.trim()] }),
      });
      setEvidence('');
      setEvidenceFor(null);
      notify('ok', 'Evidence submitted.');
    } catch (err) {
      notify('err', err.message);
    }
  }

  /* export */
  async function handleExport(id) {
    setExportingId(id);
    try {
      const res = await apiFetch(`/incidents/${id}/export`, { method: 'POST' });
      setIncidents(prev => prev.map(i => i._id === id
        ? { ...i, status: 'exported_to_authorities', exportRef: res.exportRef }
        : i
      ));
      notify('ok', `Exported to authorities. Reference: ${res.exportRef}`);
    } catch (err) {
      notify('err', err.message);
    } finally {
      setExportingId(null);
    }
  }

  return (
    <>
      <style>{css}</style>
      <div className="ir-wrap">

        <p className="ir-eyebrow">Safety</p>
        <h1 className="ir-title">Incident Reports</h1>
        <p className="ir-sub">Report safety incidents. Your report is private and reviewed by our team.</p>

        {error   && <div className="ir-banner ir-banner-err">⚠ {error}</div>}
        {success && <div className="ir-banner ir-banner-ok">✓ {success}</div>}

        {/* Tabs */}
        <div className="ir-tabs">
          <button className={`ir-tab${tab === 'report' ? ' active' : ''}`} onClick={() => setTab('report')}>
            🚨 Report
          </button>
          <button className={`ir-tab${tab === 'history' ? ' active' : ''}`} onClick={() => setTab('history')}>
            📋 My Reports {incidents.length > 0 && `(${incidents.length})`}
          </button>
        </div>

        {/* ── Report Tab ── */}
        {tab === 'report' && (
          <div className="ir-card">
            <div className="ir-card-title">
              <div className="ir-card-icon">🚨</div>
              Report an Incident
            </div>

            <form onSubmit={handleReport}>

              {/* Ride picker */}
              <div className="ir-field">
                <label className="ir-label">Which ride? (optional)</label>
                {ridesLoading && <p className="ir-no-rides">Loading your past rides…</p>}
                {!ridesLoading && pastRides.length === 0 && (
                  <div>
                    <p className="ir-no-rides">No past rides found. Describe the ride below instead.</p>
                    <input className="ir-input" placeholder="e.g. RNS to Marathalli on 23 Mar, around 9am"
                      value={form.rideDescription}
                      onChange={e => setForm(f => ({ ...f, rideDescription: e.target.value }))} />
                  </div>
                )}
                {!ridesLoading && pastRides.length > 0 && (
                  <div className="ir-ride-list">
                    {pastRides.slice(0, 6).map((booking, i) => {
                      const ride    = booking.rideId || booking;
                      const prov    = ride.providerId;
                      const provName = prov && typeof prov === 'object' && prov.name
                        ? prov.name : 'Unknown Provider';
                      const rideDate = ride.date || booking.date;
                      const dateStr  = rideDate
                        ? new Date(rideDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                        : '';
                      const rideId   = typeof ride === 'object' ? (ride._id || ride.id) : ride;
                      const label    = `${provName}${dateStr ? ` · ${dateStr}` : ''}`;
                      const isSelected = selectedRide?.rideId === String(rideId);
                      return (
                        <div key={booking._id || i}
                          className={`ir-ride-option${isSelected ? ' ir-ride-selected' : ''}`}
                          onClick={() => setSelectedRide(isSelected ? null : {
                            rideId: rideId?.toString ? rideId.toString() : String(rideId),
                            label,
                          })}>
                          <div className="ir-ride-check">{isSelected ? '✓' : ''}</div>
                          <div>
                            <div className="ir-ride-name">{provName}</div>
                            <div className="ir-ride-meta">{dateStr || 'Recent ride'}</div>
                          </div>
                        </div>
                      );
                    })}
                    {/* Manual fallback if none match */}
                    <div style={{ marginTop: 8 }}>
                      <input className="ir-input" placeholder="Or describe the ride manually (optional)"
                        value={form.rideDescription}
                        onChange={e => setForm(f => ({ ...f, rideDescription: e.target.value }))} />
                    </div>
                  </div>
                )}
              </div>

              {/* Incident type */}
              <div className="ir-field">
                <label className="ir-label">Type of Incident *</label>
                <div className="ir-type-row">
                  {TYPES.map(t => (
                    <button key={t.key} type="button"
                      className={`ir-type-chip${form.type === t.key ? ' ir-type-active' : ''}`}
                      onClick={() => setForm(f => ({ ...f, type: t.key }))}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity */}
              <div className="ir-field">
                <label className="ir-label">Severity</label>
                <div className="ir-severity-row">
                  {SEVERITIES.map(s => (
                    <button key={s.key} type="button"
                      className={`ir-sev-chip ir-sev-${s.key}${form.severity === s.key ? ' ir-sev-active' : ''}`}
                      onClick={() => setForm(f => ({ ...f, severity: s.key }))}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="ir-field">
                <label className="ir-label">What happened? *</label>
                <textarea className="ir-textarea" rows={5}
                  placeholder="Describe the incident in detail. Include time, location, and any relevant details…"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <button className="ir-btn" type="submit" disabled={submitting}>
                {submitting ? 'Submitting…' : '🚨 Submit Report'}
              </button>
            </form>
          </div>
        )}

        {/* ── History Tab ── */}
        {tab === 'history' && (
          <div>
            <div className="ir-section-label">
              {incidents.length} report{incidents.length !== 1 ? 's' : ''}
            </div>

            {incidents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
                No reports yet.
              </div>
            ) : incidents.map(inc => (
              <div key={inc._id} className={`ir-inc-card${inc.status === 'exported_to_authorities' ? ' exported' : ''}`}>
                <div className="ir-inc-header">
                  <div>
                    <div className="ir-inc-type">{inc.type.replace(/_/g, ' ')}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>
                      {inc.severity?.toUpperCase()} &nbsp;·&nbsp;
                      {new Date(inc.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <span className={`ir-inc-badge ${badgeClass(inc.status)}`}>
                    {inc.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <p className="ir-inc-desc">{inc.description}</p>

                {inc.exportRef && (
                  <div className="ir-ref">📤 Ref: {inc.exportRef}</div>
                )}

                {inc.evidence?.length > 0 && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>
                    {inc.evidence.length} piece{inc.evidence.length !== 1 ? 's' : ''} of evidence attached
                  </div>
                )}

                <div className="ir-inc-actions">
                  <button className="ir-action-btn ir-action-evid"
                    onClick={() => setEvidenceFor(evidenceFor === inc._id ? null : inc._id)}>
                    {evidenceFor === inc._id ? 'Cancel' : '+ Add Evidence'}
                  </button>
                  {inc.status !== 'exported_to_authorities' && (
                    <button className="ir-action-btn ir-action-export"
                      disabled={exportingId === inc._id}
                      onClick={() => handleExport(inc._id)}>
                      {exportingId === inc._id ? 'Exporting…' : '📤 Export to Authorities'}
                    </button>
                  )}
                </div>

                {evidenceFor === inc._id && (
                  <div className="ir-evidence-box">
                    <input className="ir-evidence-input"
                      placeholder="Paste a URL, description, or file link…"
                      value={evidence}
                      onChange={e => setEvidence(e.target.value)} />
                    <button className="ir-evidence-submit" onClick={() => handleEvidence(inc._id)}>
                      Submit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </>
  );
}