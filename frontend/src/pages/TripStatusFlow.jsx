import React, { useState } from 'react';
import * as api from '../services/api.js';
import PreRideChecklist from './PreRideChecklist.jsx';

export default function TripStatusFlow({ ride, onUpdate }) {
  const [step, setStep] = useState(
    ride.status === 'completed' ? 'done' :
    ride.status === 'in-progress' ? 'in_progress' : 'active'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checklistDone, setChecklistDone] = useState(false);

  const pickup = async () => {
    setLoading(true); setError('');
    try {
      await api.pickupPassenger(ride._id);
      setStep('in_progress');
      if (onUpdate) onUpdate();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const drop = async () => {
    setLoading(true); setError('');
    try {
      await api.dropPassenger(ride._id);
      setStep('done');
      if (onUpdate) onUpdate();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  if (step === 'done') return (
    <div style={{background:'#1e3a1e', border:'1px solid #2e5a2e', borderRadius:10, padding:14, color:'#a0f4a0', textAlign:'center', fontSize:14}}>
      Trip Completed
    </div>
  );

  return (
    <div>
      {error && <div className="alert alert-error mb-8">{error}</div>}

      {step === 'active' && (
        <div>
          {!checklistDone && (
            <PreRideChecklist
              rideId={ride._id}
              onComplete={() => setChecklistDone(true)}
            />
          )}
          {checklistDone && (
            <div>
              <div style={{background:'#1e3a1e', border:'1px solid #2e5a2e', borderRadius:8, padding:10, color:'#a0f4a0', fontSize:13, marginBottom:10, textAlign:'center'}}>
                Checklist complete — ready to pick up passenger
              </div>
              <button className="btn btn-primary btn-full" onClick={pickup} disabled={loading}>
                {loading ? 'Updating...' : 'Confirm Passenger Picked Up'}
              </button>
            </div>
          )}
        </div>
      )}

      {step === 'in_progress' && (
        <div>
          <div style={{background:'#1a2a3a', border:'1px solid #2a4a6a', borderRadius:8, padding:10, color:'#a0c4f4', fontSize:13, marginBottom:10, textAlign:'center'}}>
            Trip in progress
          </div>
          <button className="btn btn-success btn-full" onClick={drop} disabled={loading}>
            {loading ? 'Updating...' : 'Passenger Dropped - Complete Trip'}
          </button>
        </div>
      )}
    </div>
  );
}