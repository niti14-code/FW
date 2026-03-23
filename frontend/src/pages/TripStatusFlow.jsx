import React, { useState, useEffect } from 'react';
import * as api from '../services/api.js';
import PreRideChecklist from './PreRideChecklist.jsx';

/**
 * Returns { allowed: bool, minutesUntil: number }
 * Pickup is allowed from 15 minutes BEFORE the scheduled time.
 */
function canStartRide(ride) {
  if (!ride?.date || !ride?.time) return { allowed: true, minutesUntil: 0 };

  const [hours, minutes] = ride.time.split(':').map(Number);
  const scheduled = new Date(ride.date);
  scheduled.setHours(hours, minutes, 0, 0);

  const EARLY_WINDOW_MS = 15 * 60 * 1000;
  const now = Date.now();
  const diff = scheduled.getTime() - EARLY_WINDOW_MS - now;

  if (diff <= 0) return { allowed: true, minutesUntil: 0 };
  return { allowed: false, minutesUntil: Math.ceil(diff / 60000) };
}

function formatScheduledTime(ride) {
  if (!ride?.date || !ride?.time) return '';
  const [h, m] = ride.time.split(':').map(Number);
  const d = new Date(ride.date);
  d.setHours(h, m, 0, 0);
  return d.toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export default function TripStatusFlow({ ride, onUpdate }) {
  const [step, setStep] = useState(
    ride.status === 'completed'  ? 'done'        :
    ride.status === 'in-progress'? 'in_progress' : 'active'
  );
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [checklistDone,setChecklistDone]= useState(
    !!(ride.preRideChecklist?.completedAt)
  );

  // Re-check every 30 s so the button unlocks automatically when the time arrives
  const [timeCheck, setTimeCheck] = useState(() => canStartRide(ride));
  useEffect(() => {
    if (step !== 'active') return;
    const id = setInterval(() => setTimeCheck(canStartRide(ride)), 30_000);
    return () => clearInterval(id);
  }, [step, ride]);

  const pickup = async () => {
    // Double-check on frontend before hitting API
    const check = canStartRide(ride);
    if (!check.allowed) {
      setError(
        `Ride is scheduled for ${formatScheduledTime(ride)}. ` +
        `You can start up to 15 minutes early. ` +
        `Please wait ${check.minutesUntil} more minute${check.minutesUntil !== 1 ? 's' : ''}.`
      );
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.pickupPassenger(ride._id);
      setStep('in_progress');
      if (onUpdate) onUpdate();
    } catch (err) {
      // Show the server's descriptive message directly (it includes scheduled time + wait time)
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const drop = async () => {
    setLoading(true);
    setError('');
    try {
      await api.dropPassenger(ride._id);
      setStep('done');
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Completed ─────────────────────────────────────────────────── */
  if (step === 'done') return (
    <div style={{
      background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
      borderRadius: 10, padding: 14, color: '#86efac', textAlign: 'center', fontSize: 14,
    }}>
      ✓ Trip Completed
    </div>
  );

  /* ── Active (pre-pickup) ────────────────────────────────────────── */
  if (step === 'active') {
    return (
      <div>
        {error && (
          <div style={{
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 10, padding: '12px 14px', color: '#fcd34d', fontSize: 13,
            marginBottom: 10, display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <span>🕐</span>
            <span>{error}</span>
          </div>
        )}

        {/* Scheduled time reminder */}
        {!timeCheck.allowed && (
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, padding: '10px 14px', fontSize: 13,
            color: 'rgba(255,255,255,0.45)', marginBottom: 10,
          }}>
            📅 Scheduled: <strong style={{ color: 'rgba(255,255,255,0.75)' }}>{formatScheduledTime(ride)}</strong>
            <br />
            <span style={{ fontSize: 12, marginTop: 3, display: 'inline-block' }}>
              You can start up to 15 minutes early · {timeCheck.minutesUntil} min{timeCheck.minutesUntil !== 1 ? 's' : ''} remaining
            </span>
          </div>
        )}

        {!checklistDone && (
          <PreRideChecklist
            rideId={ride._id}
            onComplete={() => setChecklistDone(true)}
          />
        )}

        {checklistDone && (
          <div>
            <div style={{
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 8, padding: 10, color: '#86efac', fontSize: 13,
              marginBottom: 10, textAlign: 'center',
            }}>
              ✓ Checklist complete — ready to pick up passenger
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={pickup}
              disabled={loading || !timeCheck.allowed}
              style={!timeCheck.allowed ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
            >
              {loading ? 'Updating…' :
               !timeCheck.allowed
                 ? `⏳ Available in ${timeCheck.minutesUntil} min`
                 : 'Confirm Passenger Picked Up'}
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ── In progress (post-pickup, pre-drop) ────────────────────────── */
  return (
    <div>
      {error && <div className="alert alert-error mb-8">{error}</div>}
      <div style={{
        background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 8, padding: 10, color: '#a5b4fc', fontSize: 13,
        marginBottom: 10, textAlign: 'center',
      }}>
        🚗 Trip in progress
      </div>
      <button className="btn btn-success btn-full" onClick={drop} disabled={loading}>
        {loading ? 'Updating…' : 'Passenger Dropped — Complete Trip'}
      </button>
    </div>
  );
}