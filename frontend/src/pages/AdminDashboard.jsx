import React, { useState } from 'react';
import './AdminDashboard.css';

const MOCK_KYC = [
  { id:'1', name:'Arjun Sharma',  college:'IIT Bombay',  role:'provider', submitted:'2 hours ago', status:'pending' },
  { id:'2', name:'Priya Mehta',   college:'BITS Pilani', role:'seeker',   submitted:'5 hours ago', status:'pending' },
  { id:'3', name:'Rohan Gupta',   college:'IIT Delhi',   role:'both',     submitted:'1 day ago',   status:'approved' },
  { id:'4', name:'Sneha Patel',   college:'NIT Surat',   role:'provider', submitted:'2 days ago',  status:'rejected' },
  { id:'5', name:'Karan Verma',   college:'VIT Vellore', role:'seeker',   submitted:'3 days ago',  status:'pending' },
];
const MOCK_USERS = [
  { id:'1', name:'Arjun Sharma', email:'arjun@iitb.ac.in', role:'provider', rides:12, status:'active' },
  { id:'2', name:'Priya Mehta',  email:'priya@bits.ac.in',  role:'seeker',   rides:8,  status:'active' },
  { id:'3', name:'Rohan Gupta',  email:'rohan@iitd.ac.in',  role:'both',     rides:24, status:'active' },
  { id:'4', name:'Sneha Patel',  email:'sneha@nit.ac.in',   role:'provider', rides:3,  status:'suspended' },
  { id:'5', name:'Karan Verma',  email:'karan@vit.ac.in',   role:'seeker',   rides:0,  status:'active' },
];
const MOCK_INC = [
  { id:'1', type:'Late cancellation', user:'Arjun Sharma', ride:'IIT to Airport',  time:'2 hours ago', severity:'low' },
  { id:'2', type:'Safety complaint',  user:'Priya Mehta',  ride:'BITS to Station', time:'1 day ago',   severity:'high' },
  { id:'3', type:'Payment dispute',   user:'Karan Verma',  ride:'VIT to City',     time:'3 days ago',  severity:'medium' },
];

export default function AdminDashboard({ navigate }) {
  const [tab,   setTab]   = useState('overview');
  const [kyc,   setKyc]   = useState(MOCK_KYC);
  const [users, setUsers] = useState(MOCK_USERS);
  const [search,setSearch]= useState('');

  const pendingKYC = kyc.filter(k=>k.status==='pending').length;
  const highInc    = MOCK_INC.filter(i=>i.severity==='high').length;

  const handleKYC  = (id,a) => setKyc(p=>p.map(k=>k.id===id?{...k,status:a}:k));
  const handleUser = (id,a) => setUsers(p=>p.map(u=>u.id===id?{...u,status:a==='suspend'?'suspended':'active'}:u));

  const fKyc   = kyc.filter(k=>k.name.toLowerCase().includes(search.toLowerCase()));
  const fUsers = users.filter(u=>u.name.toLowerCase().includes(search.toLowerCase()));

  const TABS=[
    {key:'overview', label:'Overview'},
    {key:'kyc',      label:'KYC Review'+(pendingKYC?' ('+pendingKYC+')':'')},
    {key:'users',    label:'Users'},
    {key:'incidents',label:'Incidents'},
  ];

  return (
    <div className="admin-wrap fade-up">
      <div className="admin-header">
        <div>
          <p className="eyebrow mb-4">Admin Panel</p>
          <h1 className="heading" style={{fontSize:28}}>Dashboard</h1>
        </div>
        <button className="btn btn-outline btn-sm" onClick={()=>navigate('dashboard')}>Exit Admin</button>
      </div>

      <div className="admin-stats">
        {[
          {label:'Total Users',    value:users.length,                                cls:'text-accent'},
          {label:'Active Riders',  value:users.filter(u=>u.status==='active').length, cls:'text-green'},
          {label:'Pending KYC',    value:pendingKYC,                                  cls:'text-yellow'},
          {label:'High Incidents', value:highInc,                                     cls:'text-red'},
        ].map(s=>(
          <div key={s.label} className="admin-stat-card">
            <div className={'admin-stat-value '+s.cls}>{s.value}</div>
            <div className="admin-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="admin-tabs">
        {TABS.map(t=>(
          <button key={t.key} className={'admin-tab'+(tab===t.key?' active':'')} onClick={()=>setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {(tab==='kyc'||tab==='users')&&(
        <div className="admin-search mb-24">
          <input className="input" placeholder="Search by name..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      )}

      {tab==='overview'&&(
        <div className="admin-overview">
          <div className="admin-card">
            <div className="admin-card-title">Recent Activity</div>
            {[
              {icon:'👤',text:'New user registered: Arjun Sharma',    time:'2m ago'},
              {icon:'📋',text:'KYC submitted by Priya Mehta',         time:'5m ago'},
              {icon:'🚗',text:'New ride posted: IIT to Airport',      time:'12m ago'},
              {icon:'📬',text:'Booking accepted by Rohan Gupta',      time:'1h ago'},
              {icon:'⚠️',text:'Safety complaint by Priya Mehta',      time:'1d ago'},
            ].map((a,i)=>(
              <div key={i} className="admin-activity-item">
                <span className="admin-activity-icon">{a.icon}</span>
                <span className="admin-activity-text">{a.text}</span>
                <span className="admin-activity-time">{a.time}</span>
              </div>
            ))}
          </div>
          <div className="admin-card">
            <div className="admin-card-title">Platform Health</div>
            {[
              {label:'KYC Approval Rate',    value:67,color:'var(--green)'},
              {label:'Booking Success Rate', value:82,color:'var(--accent)'},
              {label:'User Satisfaction',    value:91,color:'#4fa3e0'},
              {label:'Incident Resolution',  value:74,color:'var(--red)'},
            ].map(m=>(
              <div key={m.label} className="admin-metric">
                <div className="admin-metric-row">
                  <span className="admin-metric-label">{m.label}</span>
                  <span className="admin-metric-pct">{m.value}%</span>
                </div>
                <div className="admin-metric-bar">
                  <div className="admin-metric-fill" style={{width:m.value+'%',background:m.color}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==='kyc'&&(
        <div className="admin-list">
          {fKyc.map(k=>(
            <div key={k.id} className="admin-list-item">
              <div className="admin-user-info">
                <div className="admin-avatar">{k.name.charAt(0)}</div>
                <div>
                  <div className="admin-user-name">{k.name}</div>
                  <div className="admin-user-meta">{k.college} · {k.role} · {k.submitted}</div>
                </div>
              </div>
              <div className="admin-item-actions">
                <span className={'badge badge-'+(k.status==='approved'?'accepted':k.status==='rejected'?'rejected':'pending')}>{k.status}</span>
                {k.status==='pending'&&<>
                  <button className="btn btn-success btn-sm" onClick={()=>handleKYC(k.id,'approved')}>Approve</button>
                  <button className="btn btn-danger btn-sm"  onClick={()=>handleKYC(k.id,'rejected')}>Reject</button>
                </>}
              </div>
            </div>
          ))}
          {fKyc.length===0&&<div className="empty-state"><div className="empty-title">No results</div></div>}
        </div>
      )}

      {tab==='users'&&(
        <div className="admin-list">
          {fUsers.map(u=>(
            <div key={u.id} className="admin-list-item">
              <div className="admin-user-info">
                <div className="admin-avatar">{u.name.charAt(0)}</div>
                <div>
                  <div className="admin-user-name">{u.name}</div>
                  <div className="admin-user-meta">{u.email} · {u.role} · {u.rides} rides</div>
                </div>
              </div>
              <div className="admin-item-actions">
                <span className={'badge '+(u.status==='active'?'badge-accepted':'badge-rejected')}>{u.status}</span>
                {u.status==='active'
                  ?<button className="btn btn-danger btn-sm"  onClick={()=>handleUser(u.id,'suspend')}>Suspend</button>
                  :<button className="btn btn-success btn-sm" onClick={()=>handleUser(u.id,'activate')}>Activate</button>
                }
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==='incidents'&&(
        <div className="admin-list">
          {MOCK_INC.map(inc=>(
            <div key={inc.id} className="admin-list-item">
              <div className="admin-user-info">
                <div className={'admin-sev-dot sev-'+inc.severity}/>
                <div>
                  <div className="admin-user-name">{inc.type}</div>
                  <div className="admin-user-meta">{inc.user} · {inc.ride} · {inc.time}</div>
                </div>
              </div>
              <div className="admin-item-actions">
                <span className={'sev-badge sev-badge-'+inc.severity}>{inc.severity}</span>
                <button className="btn btn-outline btn-sm">Investigate</button>
                <button className="btn btn-outline btn-sm">Export</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
