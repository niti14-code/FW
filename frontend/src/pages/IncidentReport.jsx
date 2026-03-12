import React, { useState } from 'react';
import * as api from '../services/api.js';

const INCIDENT_TYPES = [
  { value: 'accident', label: 'Accident', icon: '🚑' },
  { value: 'harassment', label: 'Harassment', icon: '🚨' },
  { value: 'theft', label: 'Theft', icon: '💰' },
  { value: 'unsafe_driving', label: 'Unsafe Driving', icon: '⚠️' },
  { value: 'other', label: 'Other', icon: '📝' }
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', color: '#4ade80' },
  { value: 'medium', label: 'Medium', color: '#fbbf24' },
  { value: 'high', label: 'High', color: '#fb923c' },
  { value: 'critical', label: 'Critical', color: '#f87171' }
];

export default function IncidentReport({ navigate }) {
  const [form, setForm] = useState({
    rideId: '',
    type: '',
    description: '',
    severity: 'medium'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    
    if (!form.type || !form.description) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await api.reportIncident(form);
      setSuccess(true);
      setForm({ rideId: '', type: '', description: '', severity: 'medium' });
    } catch (err) {
      setError(err.message || 'Failed to report incident');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="narrow-wrap fade-up text-center" style={{ paddingTop: 80 }}>
      <div style={{ fontSize: 64 }}>✅</div>
      <h2 className="heading mt-20" style={{ fontSize: 28 }}>Report Submitted</h2>
      <p className="text-muted mt-8">Thank you for reporting. Our team will review this shortly.</p>
      <div className="flex-center gap-12 mt-32">
        <button className="btn btn-primary btn-lg" onClick={() => navigate('dashboard')}>
          Back to Dashboard
        </button>
        <button className="btn btn-secondary" onClick={() => setSuccess(false)}>
          Report Another
        </button>
      </div>
    </div>
  );

  return (
    <div className="narrow-wrap fade-up">
      <p className="eyebrow mb-8">Safety</p>
      <h1 className="heading mb-4" style={{ fontSize: 28 }}>Report an Incident</h1>
      <p className="text-muted mb-32 text-sm">Report safety incidents or concerns. All reports are confidential.</p>

      {error && <div className="alert alert-error mb-16">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field mb-20">
          <label>Ride ID <span className="text-dim">(optional)</span></label>
          <input 
            className="input" 
            placeholder="Enter ride ID if related to a specific ride"
            value={form.rideId} 
            onChange={set('rideId')} 
          />
        </div>

        <div className="field mb-20">
          <label>Incident Type ✶</label>
          <div className="type-grid">
            {INCIDENT_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                className={`type-card ${form.type === t.value ? 'selected' : ''}`}
                onClick={() => setForm(f => ({ ...f, type: t.value }))}
              >
                <span className="type-icon">{t.icon}</span>
                <span className="type-label">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="field mb-20">
          <label>Severity ✶</label>
          <div className="severity-row">
            {SEVERITY_LEVELS.map(s => (
              <button
                key={s.value}
                type="button"
                className={`severity-btn ${form.severity === s.value ? 'selected' : ''}`}
                style={{ 
                  borderColor: form.severity === s.value ? s.color : undefined,
                  background: form.severity === s.value ? `${s.color}22` : undefined 
                }}
                onClick={() => setForm(f => ({ ...f, severity: s.value }))}
              >
                <span 
                  className="severity-dot" 
                  style={{ background: s.color }}
                />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field mb-24">
          <label>Description ✶</label>
          <textarea
            className="input"
            rows={5}
            placeholder="Please describe what happened in detail..."
            value={form.description}
            onChange={set('description')}
            required
          />
        </div>

        <button
          type="submit"
          className={`btn btn-primary btn-lg btn-full ${loading ? 'btn-loading' : ''}`}
          disabled={loading}
        >
          {!loading && '🚨 Submit Report'}
        </button>

        <p className="text-center text-muted text-sm mt-16">
          In case of immediate danger, please call emergency services: <strong>112</strong>
        </p>
      </form>
    </div>
  );
}