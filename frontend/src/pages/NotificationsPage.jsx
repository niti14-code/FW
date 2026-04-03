import React, { useState, useEffect } from 'react';
import * as api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const NOTIF_TYPES = {
  booking_request:    { icon: '📬', color: '#6c63ff', label: 'New Request'       },
  booking_accepted:   { icon: '✅', color: '#2dd4a0', label: 'Booking Accepted'  },
  booking_rejected:   { icon: '❌', color: '#ff6b6b', label: 'Booking Rejected'  },
  booking_cancelled:  { icon: '🚫', color: '#ff8800', label: 'Booking Cancelled' },
  ride_pickup:        { icon: '🚗', color: '#f5a623', label: 'Pickup Confirmed'  },
  ride_in_progress:   { icon: '🛣️', color: '#f5a623', label: 'Ride In Progress'  },
  ride_drop:          { icon: '📍', color: '#2dd4a0', label: 'Dropped Off'       },
  ride_completed:     { icon: '🏁', color: '#2dd4a0', label: 'Ride Completed'    },
  ride_cancelled:     { icon: '❌', color: '#ff6b6b', label: 'Ride Cancelled'    },
  kyc_submitted:      { icon: '📋', color: '#888',    label: 'KYC Submitted'     },
  kyc_approved:       { icon: '🪪', color: '#2dd4a0', label: 'KYC Approved'      },
  kyc_rejected:       { icon: '🪪', color: '#ff6b6b', label: 'KYC Rejected'      },
  kyc_revoked:        { icon: '🪪', color: '#ff8800', label: 'KYC Update'        },
  account_removed:    { icon: '📢', color: '#ff4444', label: 'Account'           },
  alert_match:        { icon: '🔔', color: '#f5a623', label: 'Route Alert'       },
  incident_update:    { icon: '⚠️', color: '#ff8800', label: 'Incident Update'   },
  system:             { icon: '📢', color: '#555',    label: 'System'            },
};

export default function NotificationsPage({ navigate }) {
  const { user } = useAuth();
  const isProvider = user?.role === 'provider' || user?.role === 'both';
  const isSeeker   = user?.role === 'seeker'   || user?.role === 'both';

  const [tab,       setTab]       = useState('all');
  const [bookings,  setBookings]  = useState([]);
  const [myRides,   setMyRides]   = useState([]);
  const [requests,  setRequests]  = useState([]);
  const [alerts,    setAlerts]    = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [serverInbox, setServerInbox] = useState([]);

  useEffect(() => {
    api.getNotifications().then((d) => setServerInbox(Array.isArray(d) ? d : [])).catch(() => setServerInbox([]));
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (isSeeker) {
          const d = await api.getMyBookings();
          setBookings(d || []);
        }
        if (isProvider) {
          const r = await api.getRideRequests();
          setRequests(r || []);
          const m = await api.getMyRides();
          setMyRides(m || []);
        }
        const al  = await api.getMyAlerts();   setAlerts(al   || []);
        const inc = await api.getMyIncidents();setIncidents(inc|| []);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff  = Date.now() - new Date(dateStr);
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)   return 'Just now';
    if (mins < 60)  return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const buildNotifications = () => {
    const notifs = [];

    serverInbox.forEach((n) => {
      notifs.push({
        id: `inbox-${n._id}`,
        type: n.type || 'system',
        role: 'system',
        title: n.title || 'CampusRide',
        body: n.body || '',
        time: n.createdAt,
      });
    });

  

    // ── SEEKER NOTIFICATIONS ─────────────────────────────────────
    bookings.forEach(b => {
      const ride   = b.rideId;
      if (!ride) return;
      const pickup = ride.pickup?.label?.split(',')[0] || 'Pickup';
      const drop   = ride.drop?.label?.split(',')[0]   || 'Drop';
      const date   = ride.date ? new Date(ride.date).toLocaleDateString('en-IN', { day:'numeric', month:'short' }) : '';
      const rideId = ride._id?.toString().slice(-6).toUpperCase();

      // 1. Booking accepted
      if (b.status === 'accepted') {
        notifs.push({
          id: `ba-${b._id}`, type: 'booking_accepted',
          rideId: ride._id,
          title: '✅ Booking Confirmed!',
          role: 'seeker',
          body: `Ride #${rideId}: ${pickup} → ${drop} on ${date} at ${ride.time}. Your seat is confirmed!`,
          time:  b.createdAt,
          action: () => navigate('my-bookings'), actionLabel: 'View Booking'
        });
      }

      // 2. Booking rejected
      if (b.status === 'rejected') {
        notifs.push({
          id: `br-${b._id}`, type: 'booking_rejected',
          rideId: ride._id,
          title: '❌ Booking Declined',
          role: 'seeker',
          body: `Ride #${rideId}: ${pickup} → ${drop} on ${date} was declined by the provider. Search for another ride.`,
          time:  b.createdAt,
          action: () => navigate('search-rides'), actionLabel: 'Find Another Ride'
        });
      }

      // 3. Provider has started — pickup confirmed
      if (ride.status === 'in-progress' && b.status === 'accepted') {
        notifs.push({
          id: `rp-${ride._id}`, type: 'ride_pickup',
          rideId: ride._id,
          title: '🚗 Ride Has Started — Pickup Confirmed',
          role: 'seeker',
          body: `Ride #${rideId}: Your provider has picked you up. Travelling from ${pickup} to ${drop}.`,
          time: ride.startedAt ,
          action: () => navigate('my-bookings'), actionLabel: 'Track Ride'
        });

        notifs.push({
          id: `ri-${ride._id}`, type: 'ride_in_progress',
          rideId: ride._id,
          title: '🛣️ You are now on your way!',
          role: 'seeker',
          body: `Ride #${rideId} is in progress. Estimated arrival at ${drop}. Stay safe!`,
          time: ride.startedAt ,
          action: () => navigate('my-bookings'), actionLabel: 'View Status'
        });
      }

      // 4. Ride completed — dropped off
      if (ride.status === 'completed') {
        notifs.push({
          id: `rd-${ride._id}`, type: 'ride_drop',
          rideId: ride._id,
          title: '📍 You Have Been Dropped Off',
          role: 'seeker',
          body: `Ride #${rideId}: Successfully reached ${drop} from ${pickup} on ${date}.`,
          time: ride.completedAt,
          action: () => navigate('my-bookings'), actionLabel: 'View Ride'
        });

        notifs.push({
          id: `rc-${ride._id}`, type: 'ride_completed',
          rideId: ride._id,
          title: '🏁 Ride Complete — Rate Your Experience',
          role: 'seeker',
          body: `Ride #${rideId}: ${pickup} → ${drop} on ${date} is complete. How was your ride? Rate your provider!`,
          time: ride.completedAt || ride.updatedAt,
          action: () => navigate('ratings'), actionLabel: '⭐ Rate Now'
        });
      }

      // 5. Ride cancelled
      if (ride.status === 'cancelled') {
        notifs.push({
          id: `rcan-${ride._id}`, type: 'ride_cancelled',
          rideId: ride._id,
          title: '🚫 Ride Cancelled',
          role: 'seeker',

          body: `Ride #${rideId}: ${pickup} → ${drop} on ${date} was cancelled. Please search for another ride.`,
          time:  ride.updatedAt || ride.createdAt,
          action: () => navigate('search-rides'), actionLabel: 'Find Ride'
        });
      }
    });

    // ── PROVIDER NOTIFICATIONS ───────────────────────────────────
    requests.forEach(b => {
      if (b.status === 'pending') {
        const seeker = b.seekerId;
        notifs.push({
          id: `req-${b._id}`, type: 'booking_request',
          rideId: b.rideId?._id || b.rideId,
          title: '📬 New Booking Request',
          role: 'provider',
          body: `${seeker?.name || 'A student'} from ${seeker?.college || 'college'} wants to join your ride. Accept or reject now.`,
          time: b.createdAt,
          action: () => navigate('provider-bookings'), actionLabel: 'Respond Now'
        });
      }
    });

    myRides.forEach(ride => {
      const pickup = ride.pickup?.label?.split(',')[0] || 'Pickup';
      const drop   = ride.drop?.label?.split(',')[0]   || 'Drop';
      const rideId = ride._id?.toString().slice(-6).toUpperCase();

      if (ride.status === 'completed') {
        notifs.push({
          id: `prc-${ride._id}`, type: 'ride_completed',
        
          title: 'provider_completed Ride',
          role: 'provider',
          rideId: ride._id,
          body: `Ride #${rideId}: ${pickup} → ${drop} completed successfully. Your earnings have been recorded.`,
          time: ride.completedAt || ride.updatedAt,
          action: () => navigate('provider-bookings'), actionLabel: 'View Trip'
        });
      }
    });



    // ── KYC NOTIFICATIONS ────────────────────────────────────────
    const kycStatus = user?.kycData?.status;
    if (kycStatus === 'pending') {
      notifs.push({
        id: 'kyc-pending', type: 'kyc_submitted',
        title: '📋 KYC Documents Submitted',
        role: 'system',
        body: 'Your documents are under review by admin. This usually takes up to 24 hours.',
        time: user?.kycData?.submittedAt,
        action: () => navigate('kyc'), actionLabel: 'View Status'
      });
    }
    if (kycStatus === 'approved') {
      notifs.push({
        id: 'kyc-approved', type: 'kyc_approved',
        title: '🪪 KYC Verified — Full Access Granted!',
        role: 'system',
        body: 'Your identity has been verified. You now have full access to all features.',
        time: user?.kycData?.reviewedAt,
        action: () => navigate('dashboard'), actionLabel: 'Go to Dashboard'
      });
    }
    if (kycStatus === 'rejected') {
      notifs.push({
        id: 'kyc-rejected', type: 'kyc_rejected',
        title: '🪪 KYC Rejected — Action Required',
        role: 'system',
        body: `Reason: ${user?.kycData?.rejectReason || 'Documents unclear'}. Please resubmit with clear photos.`,
        time: user?.kycData?.reviewedAt,
        action: () => navigate('kyc'), actionLabel: 'Resubmit Now'
      });
    }

    // ── ROUTE ALERT NOTIFICATIONS ────────────────────────────────
    alerts.forEach(a => {
      const from = a.from?.label?.split(',')[0] || 'your area';
      const to   = a.to?.label?.split(',')[0]   || 'destination';
      notifs.push({
        id: `al-${a._id}`, type: 'alert_match',
        title: '🔔 Route Alert Active',
        role: 'system',
        body: `Alert set for ${from} → ${to}. You will be notified when a matching ride is posted.`,
        time: a.createdAt,
        action: () => navigate('route-alerts'), actionLabel: 'Manage Alerts'
      });
    });

    // ── INCIDENT NOTIFICATIONS ───────────────────────────────────
    incidents.forEach(inc => {
      const statusLabel = inc.status?.replace(/_/g, ' ') || 'open';
      notifs.push({
        id: `inc-${inc._id}`, type: 'incident_update',
        title: `⚠️ Incident Report: ${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}`,
        role: 'system',
        body: `"${inc.subject || inc.type}" — Your report is ${statusLabel}. Reference: #${inc._id?.slice(-8).toUpperCase()}`,
        time: inc.updatedAt || inc.createdAt,
        action: () => navigate('incident-report'), actionLabel: 'View Report'
      });
    });

// GROUP BY RIDE
const rideGroups = {};

notifs.forEach(n => {
  const rideKey = n.rideId ? n.rideId : `global-${n.id}`;
  if (!rideGroups[rideKey]) {
    rideGroups[rideKey] = [];
  }
  rideGroups[rideKey].push(n);
});

// ORDER (FLOW OF EVENTS)
const ORDER = {
  booking_request: 0,
  booking_accepted: 1,
  booking_rejected: 1,

  ride_pickup: 2,
  ride_in_progress: 3,

  ride_drop: 4,

  ride_completed: 5,
  ride_cancelled: 5
};

// ROLE PRIORITY (Provider should come first)
const ROLE_PRIORITY = {
  provider: 2,
  seeker: 1,
  system: 0
};

// SORT INSIDE EACH RIDE GROUP
Object.values(rideGroups).forEach(group => {
  group.sort((a, b) => {
    const o1 = ORDER[a.type] ?? -1;
    const o2 = ORDER[b.type] ?? -1;

    // 1. Stage priority (completed > pickup)
    if (o1 !== o2) return o2 - o1;

    // 2. Role priority (provider first)
    const r1 = ROLE_PRIORITY[a.role] ?? 0;
    const r2 = ROLE_PRIORITY[b.role] ?? 0;
    if (r1 !== r2) return r2 - r1;

    // 3. Latest time
    return new Date(b.time || 0) - new Date(a.time || 0);
  });
});

// SORT GROUPS (LATEST RIDE FIRST)
const sortedGroups = Object.values(rideGroups).sort((a, b) => {
  const t1 = Math.max(...a.map(x => new Date(x.time || 0).getTime()));
  const t2 = Math.max(...b.map(x => new Date(x.time || 0).getTime()));
  return t2 - t1;
});

// FINAL LIST
return sortedGroups.flat();
}


  const allNotifs = buildNotifications();

  const TABS = [
    { key: 'all',      label: 'All',       filter: () => true },
    { key: 'bookings', label: 'Bookings',  filter: n => n.type.includes('booking') },
    { key: 'rides',    label: 'Rides',     filter: n => n.type.includes('ride') || n.type.includes('pickup') || n.type.includes('drop') },
    { key: 'kyc',      label: 'KYC',       filter: n => n.type.includes('kyc') || n.type === 'kyc_revoked' },
    { key: 'alerts',   label: 'Alerts',    filter: n => n.type === 'alert_match' },
    { key: 'incidents',label: 'Incidents', filter: n => n.type.includes('incident') },
  ];

  const current = TABS.find(t => t.key === tab);
  const filtered = allNotifs.filter(current?.filter || (() => true));

  return (
    <div className="page-wrap fade-up">
      <p className="eyebrow mb-8">Activity</p>
      <h1 className="heading mb-4" style={{ fontSize:28, color:'#fff' }}>Notifications</h1>
      <p className="text-muted mb-20 text-sm">All your ride updates, bookings, KYC and alert activity.</p>

      {/* Tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:24, overflowX:'auto', paddingBottom:4 }}>
        {TABS.map(t => {
          const count = allNotifs.filter(t.filter).length;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding:'8px 14px', borderRadius:99, border:'none', cursor:'pointer', whiteSpace:'nowrap',
                fontWeight:600, fontSize:13,
                background: tab === t.key ? '#f5a623' : '#111318',
                color: tab === t.key ? '#000' : '#888' }}>
              {t.label}
              {count > 0 && (
                <span style={{ marginLeft:5, background: tab === t.key ? 'rgba(0,0,0,0.2)' : '#1e2028',
                  color: tab === t.key ? '#000' : '#aaa', padding:'1px 6px', borderRadius:99, fontSize:11 }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading && (
        <div>{[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:100, borderRadius:12, marginBottom:10 }} />)}</div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="empty-state" style={{ paddingTop:40 }}>
          <div className="empty-icon">🔔</div>
          <div className="empty-title" style={{ color:'#fff' }}>No notifications yet</div>
          <div className="empty-sub mt-8">
            {tab === 'bookings'  ? 'No booking activity. Search for a ride to get started.' :
             tab === 'rides'     ? 'No ride updates yet. Your pickup, in-progress and drop alerts will appear here.' :
             tab === 'kyc'       ? 'Complete KYC to see verification status here.' :
             tab === 'alerts'    ? 'Set a route alert to get notified about matching rides.' :
             tab === 'incidents' ? 'No incident reports filed.' :
             'Your activity will appear here as you use the app.'}
          </div>
          {tab === 'alerts'   && <button className="btn btn-primary mt-16" onClick={() => navigate('route-alerts')}>Set Route Alert</button>}
          {tab === 'kyc'      && <button className="btn btn-primary mt-16" onClick={() => navigate('kyc')}>Complete KYC</button>}
          {tab === 'bookings' && <button className="btn btn-primary mt-16" onClick={() => navigate('search-rides')}>Find a Ride</button>}
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {filtered.map(n => {
          const meta = NOTIF_TYPES[n.type] || NOTIF_TYPES.system;
          return (
            <div key={n.id} style={{
              background:'#111318',
              border:'1px solid #1e2028',
              borderLeft:`3px solid ${meta.color}`,
              borderRadius:12, padding:'16px 18px',
              display:'flex', gap:14, alignItems:'flex-start'
            }}>
              <div style={{
                width:42, height:42, borderRadius:'50%',
                background:`${meta.color}20`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:20, flexShrink:0
              }}>
                {meta.icon}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4, gap:8 }}>
                  <div style={{ color:'#fff', fontWeight:700, fontSize:14 }}>{n.title}</div>
                  <div style={{ color:'#555', fontSize:11, whiteSpace:'nowrap', flexShrink:0 }}>{timeAgo(n.time)}</div>
                </div>
                <div style={{ color:'#888', fontSize:13, lineHeight:1.6, marginBottom: n.action ? 12 : 0 }}>
                  {n.body}
                </div>
                {n.action && (
                  <button onClick={n.action} style={{
                    background:'transparent',
                    border:`1px solid ${meta.color}`,
                    borderRadius:6, color:meta.color,
                    fontSize:12, fontWeight:600,
                    padding:'5px 12px', cursor:'pointer'
                  }}>
                    {n.actionLabel} →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

