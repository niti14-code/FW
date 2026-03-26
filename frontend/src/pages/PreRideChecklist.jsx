import React, { useState } from 'react';
import * as api from '../services/api.js';

const CHECKS = [
  { key:'vehicleInspected',  label:'Vehicle inspected (tyres, fuel, lights)' },
  { key:'emergencyKitReady', label:'Emergency kit ready (first aid, torch)' },
  { key:'routeConfirmed',    label:'Route confirmed with passenger' },
  { key:'contactsNotified',  label:'Emergency contacts notified' },
];

export default function PreRideChecklist({ rideId, onComplete, onCancel }) {
  const [checks, setChecks] = useState({
    vehicleInspected:false, emergencyKitReady:false,
    routeConfirmed:false, contactsNotified:false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggle = k => setChecks(c => ({ ...c, [k]: !c[k] }));
  const allDone = Object.values(checks).every(Boolean);

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      await api.submitChecklist(rideId, checks);
      if (onComplete) onComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{background:'#1a1a2e', border:'1px solid #333', borderRadius:10, padding:16}}>
      <h4 style={{color:'#fff', marginBottom:12}}>Pre-Ride Safety Checklist</h4>
      <p style={{color:'#888', fontSize:12, marginBottom:16}}>
        All items must be checked before you can pick up the passenger
      </p>
      
      {CHECKS.map(c => (
        <label key={c.key} style={{display:'flex', alignItems:'center', gap:10, marginBottom:12, cursor:'pointer'}}>
          <input 
            type="checkbox" 
            checked={checks[c.key]} 
            onChange={() => toggle(c.key)}
            style={{width:18, height:18, accentColor:'#6c63ff'}} 
          />
          <span style={{color: checks[c.key] ? '#a0f4a0' : '#aaa', fontSize:14}}>
            {checks[c.key] && '✓ '}{c.label}
          </span>
        </label>
      ))}
      
      {error && <div className="alert alert-error mt-8">{error}</div>}
      
      <div style={{display:'flex', gap:10, marginTop:16}}>
        {onCancel && (
          <button 
            className="btn btn-secondary" 
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
        )}
        <button 
          className="btn btn-primary btn-full" 
          onClick={submit} 
          disabled={!allDone || loading}
          style={{flex:1}}
        >
          {loading ? 'Saving...' : allDone ? '✅ Confirm & Proceed' : `Complete ${4 - Object.values(checks).filter(Boolean).length} more items`}
        </button>
      </div>
    </div>
  );
}