import React from 'react';
import './RideCard.css';

/**
 * Reusable RideCard component
 * Props:
 *   ride          — Ride object from backend
 *   onBook(id)    — called when seeker clicks Book
 *   onView(id)    — called when View Details clicked
 *   onDelete(id)  — called when provider deletes (owner only)
 *   isOwner       — bool, show delete button
 *   bookingStatus — 'pending'|'accepted'|'rejected' — hides Book btn
 */
export default function RideCard({ ride, onBook, onView, onDelete, isOwner, bookingStatus }) {
  const dateStr = ride.date
    ? new Date(ride.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
    : '—';

  const pickup = ride.pickupLabel || coordStr(ride.pickup?.coordinates);
  const drop   = ride.dropLabel   || coordStr(ride.drop?.coordinates);

  const statusClass = {
    active: 'badge-active', completed: 'badge-completed', cancelled: 'badge-rejected'
  }[ride.status] || 'badge-active';

  return (
    <article className="rc fade-up">
      {/* ── Route row ─────────────────────────── */}
      <div className="rc-top">
        <div className="rc-route">
          <div className="rc-stop">
            <span className="rc-dot green" />
            <span className="rc-place">{pickup}</span>
          </div>
          <div className="rc-connector">
            <div className="rc-line" />
            <span className="rc-arrow">›</span>
          </div>
          <div className="rc-stop">
            <span className="rc-dot red" />
            <span className="rc-place">{drop}</span>
          </div>
        </div>
        <span className={`badge ${statusClass}`}>{ride.status || 'active'}</span>
      </div>

      {/* ── Meta chips ────────────────────────── */}
      <div className="rc-chips">
        <span className="rc-chip">📅 {dateStr}</span>
        <span className="rc-chip">🕐 {ride.time}</span>
        <span className="rc-chip">💺 {ride.seatsAvailable} seat{ride.seatsAvailable !== 1 ? 's' : ''}</span>
        <span className="rc-chip accent">₹{ride.costPerSeat}<span className="text-dim text-xs">/seat</span></span>
      </div>

      {/* ── Provider ──────────────────────────── */}
      {ride.providerId && !isOwner && (
        <div className="rc-provider">
          <div className="rc-ava">{ride.providerId.name?.charAt(0) || 'P'}</div>
          <div>
            <div className="rc-pname">{ride.providerId.name}</div>
            {ride.providerId.rating > 0 && (
              <div className="text-dim text-xs">⭐ {ride.providerId.rating.toFixed(1)}</div>
            )}
          </div>
        </div>
      )}

      {/* ── Actions ───────────────────────────── */}
      <div className="rc-actions">
        {onView && (
          <button className="btn btn-ghost btn-sm" onClick={() => onView(ride._id)}>
            Details
          </button>
        )}

        {!bookingStatus && onBook && ride.seatsAvailable > 0 && !isOwner && (
          <button className="btn btn-primary btn-sm" onClick={() => onBook(ride._id)}>
            Book Seat →
          </button>
        )}

        {bookingStatus && (
          <span className={`badge badge-${bookingStatus}`}>
            {{ pending:'⏳ Pending', accepted:'✓ Accepted', rejected:'✗ Rejected' }[bookingStatus] || bookingStatus}
          </span>
        )}

        {ride.seatsAvailable === 0 && !bookingStatus && (
          <span className="badge badge-rejected">Full</span>
        )}

        {isOwner && onDelete && (
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(ride._id)}>
            Delete
          </button>
        )}
      </div>
    </article>
  );
}

function coordStr(coords) {
  if (!coords?.length) return 'Location';
  return `${Number(coords[1]).toFixed(4)}°N ${Number(coords[0]).toFixed(4)}°E`;
}
