import React, { useState, useEffect } from 'react';

/* ─── Inline styles (drop your RatingsPage.css import if you use this) ─── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');

  .rp-wrap {
    max-width: 720px;
    margin: 0 auto;
    padding: 48px 24px 100px;
    font-family: 'Sora', sans-serif;
    color: var(--text, #1a1a2e);
  }

  /* ── Header ── */
  .rp-eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--accent, #7c3aed);
    margin-bottom: 10px;
  }
  .rp-title {
    font-family: 'Instrument Serif', serif;
    font-size: 38px;
    font-weight: 400;
    line-height: 1.15;
    color: var(--text, #1a1a2e);
    margin: 0 0 8px;
  }
  .rp-sub {
    font-size: 14px;
    color: var(--text2, #64748b);
    margin-bottom: 40px;
  }

  /* ── Summary card ── */
  .rp-summary {
    display: flex;
    gap: 36px;
    align-items: center;
    background: var(--surface, #fff);
    border: 1.5px solid var(--border, #e2e8f0);
    border-radius: 24px;
    padding: 32px 36px;
    margin-bottom: 36px;
    box-shadow: 0 4px 24px rgba(124,58,237,0.06);
  }
  .rp-avg-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 110px;
  }
  .rp-big-num {
    font-family: 'Instrument Serif', serif;
    font-size: 64px;
    font-weight: 400;
    color: var(--accent, #7c3aed);
    line-height: 1;
    margin-bottom: 8px;
  }
  .rp-review-count {
    font-size: 12px;
    color: var(--text2, #64748b);
    margin-top: 8px;
  }
  .rp-dist {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  .rp-dist-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .rp-dist-label {
    font-size: 12px;
    color: var(--text2, #64748b);
    width: 38px;
    text-align: right;
    flex-shrink: 0;
  }
  .rp-dist-bar {
    flex: 1;
    height: 7px;
    background: var(--bg2, #f1f5f9);
    border-radius: 100px;
    overflow: hidden;
  }
  .rp-dist-fill {
    height: 100%;
    background: linear-gradient(90deg, #7c3aed, #a78bfa);
    border-radius: 100px;
    transition: width 0.6s cubic-bezier(0.34,1.56,0.64,1);
  }
  .rp-dist-count {
    font-size: 12px;
    color: var(--text2, #64748b);
    width: 18px;
  }

  /* ── Stars ── */
  .rp-stars {
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .rp-star {
    line-height: 1;
    transition: transform 0.12s;
    color: #d4d4d8;
  }
  .rp-star.filled { color: #f59e0b; }
  .rp-star.clickable { cursor: pointer; }
  .rp-star.clickable:hover { transform: scale(1.2); }

  /* ── Alert ── */
  .rp-alert {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #f0fdf4;
    border: 1.5px solid #86efac;
    color: #166534;
    border-radius: 14px;
    padding: 14px 18px;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 28px;
  }
  .rp-alert-error {
    background: #fef2f2;
    border-color: #fca5a5;
    color: #991b1b;
  }

  /* ── Write review button ── */
  .rp-btn-write {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--accent, #7c3aed);
    color: #fff;
    border: none;
    border-radius: 14px;
    padding: 14px 26px;
    font-family: 'Sora', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: 36px;
    transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 4px 16px rgba(124,58,237,0.25);
  }
  .rp-btn-write:hover {
    background: #6d28d9;
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(124,58,237,0.3);
  }

  /* ── Form ── */
  .rp-form {
    background: var(--surface, #fff);
    border: 1.5px solid var(--border, #e2e8f0);
    border-radius: 20px;
    padding: 32px;
    margin-bottom: 36px;
    box-shadow: 0 4px 24px rgba(124,58,237,0.06);
    animation: rp-slide-in 0.25s ease;
  }
  @keyframes rp-slide-in {
    from { opacity: 0; transform: translateY(-10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .rp-form-title {
    font-family: 'Instrument Serif', serif;
    font-size: 22px;
    margin: 0 0 24px;
  }
  .rp-field { margin-bottom: 18px; }
  .rp-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text2, #64748b);
    margin-bottom: 8px;
  }
  .rp-input {
    width: 100%;
    box-sizing: border-box;
    padding: 12px 16px;
    border: 1.5px solid var(--border, #3a3a4a);
    border-radius: 12px;
    font-family: 'Sora', sans-serif;
    font-size: 14px;
    color: inherit;
    background: transparent;
    transition: border-color 0.2s, box-shadow 0.2s;
    outline: none;
  }
  .rp-input:focus {
    border-color: var(--accent, #f59e0b);
    box-shadow: 0 0 0 3px rgba(245,158,11,0.15);
    background: rgba(255,255,255,0.04);
  }
  .rp-input::placeholder { color: rgba(255,255,255,0.25); }
  .rp-textarea { resize: vertical; min-height: 90px; }
  .rp-form-actions {
    display: flex;
    gap: 12px;
    margin-top: 20px;
  }
  .rp-btn-cancel {
    padding: 12px 22px;
    border: 1.5px solid var(--border, #e2e8f0);
    border-radius: 12px;
    background: transparent;
    font-family: 'Sora', sans-serif;
    font-size: 14px;
    font-weight: 500;
    color: var(--text2, #64748b);
    cursor: pointer;
    transition: background 0.15s;
  }
  .rp-btn-cancel:hover { background: var(--bg2, #f1f5f9); }
  .rp-btn-submit {
    flex: 1;
    padding: 12px 22px;
    border: none;
    border-radius: 12px;
    background: var(--accent, #7c3aed);
    color: #fff;
    font-family: 'Sora', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s, opacity 0.15s;
  }
  .rp-btn-submit:disabled { opacity: 0.45; cursor: not-allowed; }
  .rp-btn-submit:not(:disabled):hover { background: #6d28d9; }
  .rp-btn-submit.loading { opacity: 0.7; pointer-events: none; }

  /* ── List ── */
  .rp-section-title {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text2, #64748b);
    margin-bottom: 18px;
  }
  .rp-list { display: flex; flex-direction: column; gap: 14px; }
  .rp-card {
    background: var(--surface, #fff);
    border: 1.5px solid var(--border, #e2e8f0);
    border-radius: 18px;
    padding: 22px 24px;
    transition: box-shadow 0.2s, transform 0.15s;
    animation: rp-fade-up 0.35s ease both;
  }
  .rp-card:hover {
    box-shadow: 0 8px 28px rgba(124,58,237,0.09);
    transform: translateY(-2px);
  }
  @keyframes rp-fade-up {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .rp-card-new { border-color: #a78bfa; background: #faf5ff; }
  .rp-card-header { display: flex; align-items: flex-start; gap: 14px; }
  .rp-avatar {
    width: 44px; height: 44px;
    border-radius: 50%;
    background: linear-gradient(135deg, #7c3aed, #a78bfa);
    color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .rp-card-meta { flex: 1; }
  .rp-card-name { font-size: 15px; font-weight: 600; margin-bottom: 3px; }
  .rp-card-sub { font-size: 12px; color: var(--text2, #64748b); }
  .rp-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
  .rp-card-date { font-size: 11px; color: var(--text2, #94a3b8); }
  .rp-comment { font-size: 14px; font-family: 'Instrument Serif', serif; font-style: italic; color: var(--text2, #475569); line-height: 1.65; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border, #f1f5f9); }
  .rp-empty { text-align: center; padding: 60px 20px; color: var(--text2, #94a3b8); }
  .rp-empty-icon { font-size: 48px; margin-bottom: 12px; }
  .rp-loading { text-align: center; padding: 60px 20px; color: var(--text2, #94a3b8); font-size: 14px; }
  .rp-new-badge {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: #7c3aed;
    background: #ede9fe; border-radius: 6px; padding: 2px 8px;
  }

  @media (max-width: 600px) {
    .rp-summary { flex-direction: column; align-items: flex-start; gap: 24px; }
    .rp-big-num { font-size: 52px; }
    .rp-title { font-size: 30px; }
  }
`;

/* ─── Config ──────────────────────────────────────────────────────────────── */
const API_BASE = import.meta.env?.VITE_API_URL || 'http://localhost:5000';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function Stars({ value, onChange, size = 20 }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="rp-stars">
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          className={`rp-star${i <= (hover || value) ? ' filled' : ''}${onChange ? ' clickable' : ''}`}
          style={{ fontSize: size }}
          onMouseEnter={() => onChange && setHover(i)}
          onMouseLeave={() => onChange && setHover(0)}
          onClick={() => onChange && onChange(i)}
        >
          {i <= (hover || value) ? '★' : '☆'}
        </span>
      ))}
    </div>
  );
}

function Avatar({ name }) {
  return (
    <div className="rp-avatar">
      {(name || '?').trim().charAt(0).toUpperCase()}
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ─── Main Component ──────────────────────────────────────────────────────── */
export default function RatingsPage({ userId, authToken }) {
  // userId    = the profile being viewed (whose ratings to show)
  // authToken = JWT passed as prop (optional — falls back to localStorage)

  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ providerName: '', rideNote: '', rating: 0, comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [newlyAdded, setNewlyAdded] = useState(null);

  // Resolve token from prop or localStorage
  function getToken() {
    if (authToken) return authToken;
    return localStorage.getItem('cr_token') || '';
  }

  /* ── Fetch ratings ── */
  useEffect(() => {
    if (!userId) return;
    fetchRatings();
  }, [userId]);

  async function fetchRatings() {
    setLoading(true);
    setFetchError('');
    try {
      const res = await fetch(`${API_BASE}/api/ratings/${userId}`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setRatings(data);
    } catch (err) {
      setFetchError('Could not load ratings. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  /* ── Submit rating ── */
  async function handleSubmit() {
    if (!form.rating) return;

    const token = getToken();
    const payload = {
      reviewedUser: userId,
      rating: form.rating,
      comment: [form.rideNote ? `Route: ${form.rideNote}` : '', form.comment].filter(Boolean).join(' — ') || undefined,
    };

    // Debug — visible in console so you can confirm what's sent
    console.log('[RatingsPage] Submitting payload:', payload);
    console.log('[RatingsPage] Token present:', !!token);
    console.log('[RatingsPage] userId prop value:', userId);

    if (!userId) {
      setSubmitError('Missing user ID — make sure the userId prop is passed to <RatingsPage>');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    // Optimistic update — add card immediately so user sees result
    const optimistic = {
      _id: `optimistic-${Date.now()}`,
      reviewer: { name: form.providerName || 'You' },
      rating: form.rating,
      comment: form.comment,
      rideNote: form.rideNote,
      createdAt: new Date().toISOString(),
      _optimistic: true,
    };
    setRatings(prev => [optimistic, ...prev]);
    setNewlyAdded(optimistic._id);

    try {
      const res = await fetch(`${API_BASE}/api/ratings/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errMsg = 'Submission failed';
        try {
          const errData = await res.json();
          errMsg = errData.message || errData.error || `Server error ${res.status}`;
        } catch (_) {}
        throw new Error(errMsg);
      }

      // Replace optimistic entry with real data from server
      await fetchRatings();
      setShowForm(false);
      setForm({ providerName: '', rideNote: '', rating: 0, comment: '' });
    } catch (err) {
      setSubmitError(err.message);
      // Roll back optimistic update
      setRatings(prev => prev.filter(r => r._id !== optimistic._id));
      setNewlyAdded(null);
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Derived stats ── */
  const avg = ratings.length
    ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
    : '—';
  const dist = [5, 4, 3, 2, 1].map(n => ({
    n,
    count: ratings.filter(r => r.rating === n).length,
  }));

  /* ── Render ── */
  return (
    <>
      <style>{css}</style>
      <div className="rp-wrap">

        {/* Header */}
        <p className="rp-eyebrow">Community Trust</p>
        <h1 className="rp-title">Ratings & Reviews</h1>
        <p className="rp-sub">Verified feedback from co-passengers on shared rides</p>

        {/* Summary */}
        <div className="rp-summary">
          <div className="rp-avg-block">
            <div className="rp-big-num">{avg}</div>
            <Stars value={Math.round(Number(avg)) || 0} size={22} />
            <div className="rp-review-count">{ratings.length} review{ratings.length !== 1 ? 's' : ''}</div>
          </div>
          <div className="rp-dist">
            {dist.map(d => (
              <div key={d.n} className="rp-dist-row">
                <span className="rp-dist-label">{d.n} ★</span>
                <div className="rp-dist-bar">
                  <div
                    className="rp-dist-fill"
                    style={{ width: ratings.length ? (d.count / ratings.length * 100) + '%' : '0%' }}
                  />
                </div>
                <span className="rp-dist-count">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Errors */}
        {fetchError && (
          <div className="rp-alert rp-alert-error" style={{ marginBottom: 24 }}>
            ⚠ {fetchError}
          </div>
        )}

        {/* Review form toggle */}
        {!showForm && (
          <button className="rp-btn-write" onClick={() => { setShowForm(true); setSubmitError(''); }}>
            ✦ Write a Review
          </button>
        )}

        {/* Review form */}
        {showForm && (
          <div className="rp-form">
            <div className="rp-form-title">Share your experience</div>

            <div className="rp-field">
              <label className="rp-label">Provider / Driver Name</label>
              <input
                className="rp-input"
                placeholder="e.g. Rohan Gupta"
                value={form.providerName}
                onChange={e => setForm(f => ({ ...f, providerName: e.target.value }))}
              />
            </div>

            <div className="rp-field">
              <label className="rp-label">Ride / Trip (optional)</label>
              <input
                className="rp-input"
                placeholder="e.g. IIT Delhi to Airport"
                value={form.rideNote}
                onChange={e => setForm(f => ({ ...f, rideNote: e.target.value }))}
              />
            </div>

            <div className="rp-field">
              <label className="rp-label">Your Rating <span style={{ color: '#ef4444' }}>*</span></label>
              <Stars value={form.rating} onChange={v => setForm(f => ({ ...f, rating: v }))} size={34} />
            </div>

            <div className="rp-field">
              <label className="rp-label">Comment (optional)</label>
              <textarea
                className="rp-input rp-textarea"
                placeholder="How was your ride?"
                value={form.comment}
                onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
              />
            </div>

            {submitError && (
              <div className="rp-alert rp-alert-error" style={{ marginBottom: 16 }}>
                ⚠ {submitError}
              </div>
            )}

            <div className="rp-form-actions">
              <button className="rp-btn-cancel" onClick={() => { setShowForm(false); setSubmitError(''); }}>
                Cancel
              </button>
              <button
                className={`rp-btn-submit${submitting ? ' loading' : ''}`}
                disabled={!form.rating || submitting}
                onClick={handleSubmit}
              >
                {submitting ? 'Submitting…' : 'Submit Review'}
              </button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="rp-section-title">
          {ratings.length > 0 ? `All reviews (${ratings.length})` : 'Reviews'}
        </div>

        {loading ? (
          <div className="rp-loading">Loading reviews…</div>
        ) : ratings.length === 0 ? (
          <div className="rp-empty">
            <div className="rp-empty-icon">✦</div>
            <div>No reviews yet. Be the first to share your experience!</div>
          </div>
        ) : (
          <div className="rp-list">
            {ratings.map((r, i) => {
              const name = r.reviewer?.name || r.reviewer || 'Anonymous';
              const isNew = r._id === newlyAdded;
              return (
                <div
                  key={r._id}
                  className={`rp-card${isNew ? ' rp-card-new' : ''}`}
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <div className="rp-card-header">
                    <Avatar name={name} />
                    <div className="rp-card-meta">
                      <div className="rp-card-name">
                        {name}
                        {isNew && <span className="rp-new-badge" style={{ marginLeft: 10 }}>✦ New</span>}
                      </div>
                      <div className="rp-card-sub">
                        {r.rideNote ||
                          (r.comment?.startsWith('Route:')
                            ? r.comment.split(' — ')[0].replace('Route: ', '')
                            : 'Shared Ride')}
                      </div>
                    </div>
                    <div className="rp-card-right">
                      <Stars value={r.rating} size={15} />
                      <div className="rp-card-date">{formatDate(r.createdAt)}</div>
                    </div>
                  </div>
                  {r.comment && <p className="rp-comment">"{r.comment}"</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}