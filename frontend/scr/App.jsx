import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';

// ==========================================
// CONTEXT & AUTH
// ==========================================
const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const res = await fetch('http://localhost:5000/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        logout();
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    setToken(token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

// ==========================================
// STYLES (CSS-in-JS)
// ==========================================
const GlobalStyles = () => (
  <style>{`
    :root {
      --bg: #0a0c10;
      --surface: #111318;
      --surface2: #1a1d26;
      --border: #252836;
      --accent: #f5a623;
      --accent2: #e8552e;
      --green: #2dd4a0;
      --text: #f0f0ef;
      --muted: #7a7e8e;
      --pill-bg: #1e2130;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'DM Sans', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      overflow-x: hidden;
    }

    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

    .page-container {
      animation: fadeIn 0.35s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Form Elements */
    .field { margin-bottom: 20px; }
    .field label {
      display: block; font-size: 12px; font-weight: 500;
      color: var(--muted); text-transform: uppercase; letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .field input, .field select {
      width: 100%; padding: 14px 16px;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 10px; color: var(--text);
      font-family: 'DM Sans', sans-serif; font-size: 15px;
      transition: border-color 0.2s;
      outline: none; appearance: none;
    }
    .field input:focus, .field select:focus { border-color: var(--accent); }
    .field input::placeholder { color: var(--muted); }
    .field select option { background: var(--surface2); }

    .btn-primary {
      width: 100%; padding: 16px;
      background: var(--accent);
      border: none; border-radius: 12px;
      color: #000; font-family: 'Syne', sans-serif;
      font-size: 15px; font-weight: 700;
      cursor: pointer; transition: all 0.2s;
      letter-spacing: 0.3px;
      margin-top: 8px;
    }
    .btn-primary:hover { 
      background: #f9bc52; 
      transform: translateY(-1px); 
      box-shadow: 0 8px 24px rgba(245,166,35,0.3); 
    }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .btn-secondary {
      padding: 10px 20px; border-radius: 8px;
      border: 1px solid var(--border); background: transparent;
      color: var(--text); font-family: 'DM Sans', sans-serif;
      font-size: 13px; cursor: pointer; transition: all 0.2s;
    }
    .btn-secondary:hover { border-color: var(--accent); color: var(--accent); }

    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

    @media (max-width: 768px) {
      .two-col { grid-template-columns: 1fr; }
    }

    /* Cards */
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 24px;
      margin-bottom: 20px;
    }

    .card-title {
      font-family: 'Syne', sans-serif;
      font-size: 18px; font-weight: 700;
      margin-bottom: 16px;
    }

    /* Status Badges */
    .badge {
      padding: 4px 12px; border-radius: 100px;
      font-size: 11px; font-weight: 600; letter-spacing: 0.5px;
      display: inline-block;
    }
    .badge-success { background: rgba(45,212,160,0.12); color: var(--green); }
    .badge-warning { background: rgba(245,166,35,0.12); color: var(--accent); }
    .badge-danger { background: rgba(232,85,46,0.12); color: var(--accent2); }

    /* Loading Spinner */
    .spinner {
      width: 20px; height: 20px;
      border: 2px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .error-message {
      background: rgba(232,85,46,0.1);
      border: 1px solid var(--accent2);
      color: var(--accent2);
      padding: 12px 16px;
      border-radius: 10px;
      margin-bottom: 20px;
      font-size: 14px;
    }

    .success-message {
      background: rgba(45,212,160,0.1);
      border: 1px solid var(--green);
      color: var(--green);
      padding: 12px 16px;
      border-radius: 10px;
      margin-bottom: 20px;
      font-size: 14px;
    }
  `}</style>
);

// ==========================================
// NAVIGATION
// ==========================================
const Navigation = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 40px',
    borderBottom: '1px solid var(--border)',
    position: 'sticky', top: 0, zIndex: 100,
    background: 'rgba(10,12,16,0.92)',
    backdropFilter: 'blur(16px)'
  };

  const logoStyle = {
    fontFamily: 'Syne, sans-serif',
    fontSize: '22px', fontWeight: 800,
    letterSpacing: '-0.5px',
    cursor: 'pointer'
  };

  const navTabsStyle = { display: 'flex', gap: '4px' };

  const navTabStyle = (active) => ({
    padding: '8px 20px', borderRadius: '100px',
    border: 'none', cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '13px', fontWeight: 500,
    transition: 'all 0.2s',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#000' : 'var(--muted)'
  });

  const isActive = (path) => location.pathname === path;

  return (
    <nav style={navStyle}>
      <div style={logoStyle} onClick={() => navigate('/')}>
        Free<span style={{ color: 'var(--accent)' }}>Wheels</span>
      </div>
      
      {user && (
        <div style={navTabsStyle}>
          <button 
            style={navTabStyle(isActive('/rides'))} 
            onClick={() => navigate('/rides')}
          >
            Rides
          </button>
          <button 
            style={navTabStyle(isActive('/bookings'))} 
            onClick={() => navigate('/bookings')}
          >
            Bookings
          </button>
          <button 
            style={navTabStyle(isActive('/profile'))} 
            onClick={() => navigate('/profile')}
          >
            Profile
          </button>
          <button 
            style={navTabStyle(false)} 
            onClick={logout}
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

// ==========================================
// LOGIN & REGISTER PAGE
// ==========================================
const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', phone: '', role: 'seeker', college: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/rides');
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const body = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData;

      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Something went wrong');
      
      login(data.token, data.user);
      navigate('/rides');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loginWrapStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    minHeight: 'calc(100vh - 65px)'
  };

  const loginLeftStyle = {
    padding: '80px 60px',
    display: 'flex', flexDirection: 'column', justifyContent: 'center',
    position: 'relative', overflow: 'hidden'
  };

  const loginRightStyle = {
    background: 'var(--surface)',
    borderLeft: '1px solid var(--border)',
    padding: '80px 60px',
    display: 'flex', flexDirection: 'column', justifyContent: 'center'
  };

  const eyebrowStyle = {
    fontSize: '11px', fontWeight: 500, letterSpacing: '2.5px',
    color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '20px',
    display: 'flex', alignItems: 'center', gap: '10px'
  };

  const headlineStyle = {
    fontFamily: 'Syne, sans-serif',
    fontSize: '52px', fontWeight: 800, lineHeight: 1.05,
    letterSpacing: '-1.5px', marginBottom: '20px'
  };

  const tabsToggleStyle = {
    display: 'flex', gap: 0,
    background: 'var(--surface2)',
    borderRadius: '12px', padding: '4px',
    marginBottom: '32px'
  };

  const toggleBtnStyle = (active) => ({
    flex: 1, padding: '10px', borderRadius: '8px',
    border: 'none', cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '14px', fontWeight: 500,
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#000' : 'var(--muted)',
    transition: 'all 0.2s'
  });

  const roleGridStyle = {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'
  };

  const roleCardStyle = (selected) => ({
    padding: '16px', borderRadius: '12px',
    border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
    cursor: 'pointer', transition: 'all 0.2s',
    textAlign: 'center',
    background: selected ? 'rgba(245,166,35,0.08)' : 'transparent'
  });

  return (
    <div className="page-container">
      <div style={loginWrapStyle}>
        <div style={loginLeftStyle}>
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse at 30% 50%, rgba(245,166,35,0.12) 0%, transparent 60%),
                        radial-gradient(ellipse at 80% 80%, rgba(232,85,46,0.08) 0%, transparent 50%)`,
            pointerEvents: 'none'
          }} />
          <div style={eyebrowStyle}>
            <span style={{ width: '24px', height: '1px', background: 'var(--accent)' }} />
            Campus Ride Network
          </div>
          <h1 style={headlineStyle}>
            Share the<br/>commute,<br/><em style={{ color: 'var(--accent)', fontStyle: 'normal' }}>split the cost.</em>
          </h1>
          <p style={{ fontSize: '16px', color: 'var(--muted)', lineHeight: 1.6, maxWidth: '380px' }}>
            The ride-sharing platform built exclusively for college students. Verified identities, shared campuses, real savings.
          </p>
          <div style={{ display: 'flex', gap: '40px', marginTop: '50px' }}>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '32px', fontWeight: 800, color: 'var(--accent)' }}>4.2K</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Active Riders</div>
            </div>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '32px', fontWeight: 800, color: 'var(--accent)' }}>₹180</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Avg. Saved/Month</div>
            </div>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '32px', fontWeight: 800, color: 'var(--accent)' }}>18+</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Colleges Covered</div>
            </div>
          </div>
        </div>

        <div style={loginRightStyle}>
          <div style={{ marginBottom: '36px' }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
              {isLogin ? 'Welcome back' : 'Create Account'}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--muted)' }}>
              {isLogin ? 'Sign in to your account' : 'Join the campus ride network'}
            </p>
          </div>

          <div style={tabsToggleStyle}>
            <button 
              style={toggleBtnStyle(isLogin)} 
              onClick={() => setIsLogin(true)}
            >
              Login
            </button>
            <button 
              style={toggleBtnStyle(!isLogin)} 
              onClick={() => setIsLogin(false)}
            >
              Register
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <div className="two-col">
                  <div className="field">
                    <label>Full Name</label>
                    <input 
                      type="text" 
                      placeholder="Your name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="field">
                    <label>College Email</label>
                    <input 
                      type="email" 
                      placeholder="you@college.edu"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="two-col">
                  <div className="field">
                    <label>Phone</label>
                    <input 
                      type="tel" 
                      placeholder="+91 9876543210"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      required
                    />
                  </div>
                  <div className="field">
                    <label>College / University</label>
                    <input 
                      type="text" 
                      placeholder="BITS Pilani, MIT, ..."
                      value={formData.college}
                      onChange={(e) => setFormData({...formData, college: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="field" style={{ marginBottom: '16px' }}>
                  <label>I am a</label>
                  <div style={roleGridStyle}>
                    <div 
                      style={roleCardStyle(formData.role === 'provider')} 
                      onClick={() => setFormData({...formData, role: 'provider'})}
                    >
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>🚗</div>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>Provider</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '3px' }}>I have a car & offer rides</div>
                    </div>
                    <div 
                      style={roleCardStyle(formData.role === 'seeker')} 
                      onClick={() => setFormData({...formData, role: 'seeker'})}
                    >
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎒</div>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>Seeker</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '3px' }}>I'm looking for rides</div>
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {isLogin && (
              <div className="field">
                <label>College Email</label>
                <input 
                  type="email" 
                  placeholder="you@college.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
            )}
            
            <div className="field">
              <label>Password</label>
              <input 
                type="password" 
                placeholder={isLogin ? "Enter password" : "Create a strong password"}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : (isLogin ? 'Sign In →' : 'Create Account →')}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--muted)' }}>
            {isLogin ? (
              <>New here? <a style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => setIsLogin(false)}>Create account</a></>
            ) : (
              <>Already have an account? <a style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => setIsLogin(true)}>Sign in</a></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// RIDES PAGE
// ==========================================
const RidesPage = () => {
  const [rides, setRides] = useState([]);
  const [myRides, setMyRides] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token, user } = useAuth();

  const [createForm, setCreateForm] = useState({
    pickup: { coordinates: [0, 0] },
    drop: { coordinates: [0, 0] },
    date: '',
    time: '',
    seatsAvailable: 2,
    costPerSeat: ''
  });

  useEffect(() => {
    fetchRides();
    if (user?.role === 'provider' || user?.role === 'both') {
      fetchMyRides();
    }
  }, []);

  const fetchRides = async () => {
    try {
      const res = await fetch('http://localhost:5000/ride/search?lat=12.9716&lng=77.5946&maxDistance=50000', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setRides(data);
    } catch (err) {
      setError('Failed to fetch rides');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRides = async () => {
    try {
      const res = await fetch('http://localhost:5000/ride/my', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMyRides(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateRide = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/ride/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(createForm)
      });
      
      if (!res.ok) throw new Error('Failed to create ride');
      
      setShowCreate(false);
      fetchMyRides();
      fetchRides();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBookRide = async (rideId) => {
    try {
      const res = await fetch('http://localhost:5000/booking/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rideId })
      });
      
      if (!res.ok) throw new Error('Failed to book ride');
      
      alert('Booking request sent!');
      fetchRides();
    } catch (err) {
      alert(err.message);
    }
  };

  const canCreateRide = user?.role === 'provider' || user?.role === 'both';

  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '2.5px', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Available Rides
          </div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '38px', fontWeight: 800 }}>Find a Ride</h1>
        </div>
        {canCreateRide && (
          <button className="btn-primary" style={{ width: 'auto', padding: '12px 24px' }} onClick={() => setShowCreate(true)}>
            + Offer a Ride
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {showCreate && (
        <div className="card" style={{ marginBottom: '32px' }}>
          <h3 className="card-title">Create New Ride</h3>
          <form onSubmit={handleCreateRide}>
            <div className="two-col">
              <div className="field">
                <label>Pickup Location (lat,lng)</label>
                <input 
                  type="text" 
                  placeholder="12.9716,77.5946"
                  onChange={(e) => {
                    const [lat, lng] = e.target.value.split(',').map(Number);
                    setCreateForm({...createForm, pickup: { coordinates: [lng, lat] }});
                  }}
                  required
                />
              </div>
              <div className="field">
                <label>Drop Location (lat,lng)</label>
                <input 
                  type="text" 
                  placeholder="12.9716,77.5946"
                  onChange={(e) => {
                    const [lat, lng] = e.target.value.split(',').map(Number);
                    setCreateForm({...createForm, drop: { coordinates: [lng, lat] }});
                  }}
                  required
                />
              </div>
            </div>
            <div className="two-col">
              <div className="field">
                <label>Date</label>
                <input 
                  type="date" 
                  value={createForm.date}
                  onChange={(e) => setCreateForm({...createForm, date: e.target.value})}
                  required
                />
              </div>
              <div className="field">
                <label>Time</label>
                <input 
                  type="time" 
                  value={createForm.time}
                  onChange={(e) => setCreateForm({...createForm, time: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="two-col">
              <div className="field">
                <label>Seats Available</label>
                <input 
                  type="number" 
                  min="1" 
                  max="8"
                  value={createForm.seatsAvailable}
                  onChange={(e) => setCreateForm({...createForm, seatsAvailable: parseInt(e.target.value)})}
                  required
                />
              </div>
              <div className="field">
                <label>Cost per Seat (₹)</label>
                <input 
                  type="number" 
                  value={createForm.costPerSeat}
                  onChange={(e) => setCreateForm({...createForm, costPerSeat: parseInt(e.target.value)})}
                  required
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ width: 'auto', flex: 1 }}>Post Ride</button>
            </div>
          </form>
        </div>
      )}

      {canCreateRide && myRides.length > 0 && (
        <>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '24px', marginBottom: '20px' }}>My Rides</h2>
          <div style={{ display: 'grid', gap: '16px', marginBottom: '40px' }}>
            {myRides.map(ride => (
              <RideCard key={ride._id} ride={ride} isOwner={true} />
            ))}
          </div>
        </>
      )}

      <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '24px', marginBottom: '20px' }}>Available Rides</h2>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner" style={{ width: '40px', height: '40px' }} />
        </div>
      ) : rides.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted)' }}>
          No rides available nearby. Check back later!
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {rides.map(ride => (
            <RideCard 
              key={ride._id} 
              ride={ride} 
              isOwner={false}
              onBook={() => handleBookRide(ride._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const RideCard = ({ ride, isOwner, onBook }) => {
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', { 
      day: 'numeric', month: 'short', year: 'numeric' 
    });
  };

  return (
    <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <span className={`badge ${ride.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
            {ride.status}
          </span>
          <span style={{ fontSize: '14px', color: 'var(--muted)' }}>
            {formatDate(ride.date)} · {ride.time}
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--green)' }} />
            <span>Pickup Location</span>
          </div>
          <div style={{ flex: 1, height: '2px', background: 'var(--border)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Drop Location</span>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent2)' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px', fontSize: '14px' }}>
          <span style={{ color: 'var(--muted)' }}>
            <strong style={{ color: 'var(--text)' }}>{ride.seatsAvailable}</strong> seats left
          </span>
          <span style={{ color: 'var(--muted)' }}>
            <strong style={{ color: 'var(--accent)' }}>₹{ride.costPerSeat}</strong> per seat
          </span>
          {ride.providerId && (
            <span style={{ color: 'var(--muted)' }}>
              by <strong style={{ color: 'var(--text)' }}>{ride.providerId.name}</strong>
              {ride.providerId.rating > 0 && ` ⭐ ${ride.providerId.rating}`}
            </span>
          )}
        </div>
      </div>

      {!isOwner && ride.seatsAvailable > 0 && (
        <button className="btn-primary" style={{ width: 'auto', marginLeft: '24px' }} onClick={onBook}>
          Book Now
        </button>
      )}
    </div>
  );
};

// ==========================================
// BOOKINGS PAGE
// ==========================================
const BookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('my');
  const [loading, setLoading] = useState(true);
  const { token, user } = useAuth();

  useEffect(() => {
    fetchBookings();
    if (user?.role === 'provider' || user?.role === 'both') {
      fetchRequests();
    }
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await fetch('http://localhost:5000/booking/my', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setBookings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch('http://localhost:5000/booking/requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRespond = async (bookingId, status) => {
    try {
      const res = await fetch('http://localhost:5000/booking/respond', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookingId, status })
      });
      
      if (!res.ok) throw new Error('Failed to respond');
      
      fetchRequests();
      fetchBookings();
    } catch (err) {
      alert(err.message);
    }
  };

  const isProvider = user?.role === 'provider' || user?.role === 'both';

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '2.5px', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '8px' }}>
          Manage Bookings
        </div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '38px', fontWeight: 800 }}>My Bookings</h1>
      </div>

      {isProvider && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
          <button 
            className="btn-secondary"
            style={{ 
              background: activeTab === 'my' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'my' ? '#000' : 'var(--text)',
              borderColor: activeTab === 'my' ? 'var(--accent)' : 'var(--border)'
            }}
            onClick={() => setActiveTab('my')}
          >
            My Bookings
          </button>
          <button 
            className="btn-secondary"
            style={{ 
              background: activeTab === 'requests' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'requests' ? '#000' : 'var(--text)',
              borderColor: activeTab === 'requests' ? 'var(--accent)' : 'var(--border)'
            }}
            onClick={() => setActiveTab('requests')}
          >
            Ride Requests {requests.filter(r => r.status === 'pending').length > 0 && `(${requests.filter(r => r.status === 'pending').length})`}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner" style={{ width: '40px', height: '40px' }} />
        </div>
      ) : activeTab === 'my' ? (
        bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted)' }}>
            No bookings yet. Browse rides to book one!
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {bookings.map(booking => (
              <BookingCard key={booking._id} booking={booking} type="my" />
            ))}
          </div>
        )
      ) : (
        requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted)' }}>
            No pending requests for your rides.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {requests.map(request => (
              <BookingCard 
                key={request._id} 
                booking={request} 
                type="request"
                onRespond={handleRespond}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
};

const BookingCard = ({ booking, type, onRespond }) => {
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', { 
      day: 'numeric', month: 'short', year: 'numeric' 
    });
  };

  const statusColors = {
    pending: 'badge-warning',
    accepted: 'badge-success',
    rejected: 'badge-danger'
  };

  const otherParty = type === 'my' ? booking.rideId?.providerId : booking.seekerId;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <span className={`badge ${statusColors[booking.status]}`}>
            {booking.status}
          </span>
          <div style={{ marginTop: '8px', fontSize: '14px', color: 'var(--muted)' }}>
            {type === 'my' ? 'Requested' : 'Received'} on {formatDate(booking.createdAt)}
          </div>
        </div>
        {otherParty && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 600 }}>{otherParty.name}</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{otherParty.college}</div>
            {otherParty.phone && <div style={{ fontSize: '13px', color: 'var(--accent)' }}>{otherParty.phone}</div>}
          </div>
        )}
      </div>

      {booking.rideId && (
        <div style={{ 
          background: 'var(--surface2)', 
          borderRadius: '12px', 
          padding: '16px',
          marginBottom: type === 'request' && booking.status === 'pending' ? '16px' : 0
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Ride Details</span>
            <span style={{ fontWeight: 600 }}>₹{booking.rideId.costPerSeat}</span>
          </div>
          <div style={{ fontSize: '14px' }}>
            {formatDate(booking.rideId.date)} · {booking.rideId.time}
          </div>
        </div>
      )}

      {type === 'request' && booking.status === 'pending' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
          <button 
            className="btn-primary" 
            style={{ background: 'var(--green)' }}
            onClick={() => onRespond(booking._id, 'accepted')}
          >
            Accept
          </button>
          <button 
            className="btn-secondary"
            style={{ borderColor: 'var(--accent2)', color: 'var(--accent2)' }}
            onClick={() => onRespond(booking._id, 'rejected')}
          >
            Decline
          </button>
        </div>
      )}
    </div>
  );
};

// ==========================================
// PROFILE PAGE
// ==========================================
const ProfilePage = () => {
  const { user, token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('http://localhost:5000/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setProfile(data);
      setFormData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      setProfile(data);
      setEditing(false);
    } catch (err) {
      alert('Failed to update profile');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}><div className="spinner" style={{ width: '40px', height: '40px' }} /></div>;

  return (
    <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '2.5px', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '8px' }}>
          Account Settings
        </div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '38px', fontWeight: 800 }}>My Profile</h1>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', fontWeight: 800, fontFamily: 'Syne, sans-serif',
            color: '#000'
          }}>
            {profile?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{profile?.name}</div>
            <div style={{ color: 'var(--muted)', marginTop: '4px' }}>{profile?.email}</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <span className="badge badge-warning" style={{ textTransform: 'capitalize' }}>{profile?.role}</span>
              {profile?.rating > 0 && <span className="badge badge-success">⭐ {profile?.rating}</span>}
            </div>
          </div>
        </div>

        {editing ? (
          <form onSubmit={handleUpdate}>
            <div className="two-col">
              <div className="field">
                <label>Name</label>
                <input 
                  type="text" 
                  value={formData.name || ''}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="field">
                <label>Phone</label>
                <input 
                  type="tel" 
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>
            <div className="field">
              <label>College</label>
              <input 
                type="text" 
                value={formData.college || ''}
                onChange={(e) => setFormData({...formData, college: e.target.value})}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ width: 'auto', flex: 1 }}>Save Changes</button>
            </div>
          </form>
        ) : (
          <div>
            <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--muted)' }}>Phone</span>
                <span>{profile?.phone}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--muted)' }}>College</span>
                <span>{profile?.college}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--muted)' }}>Total Rides</span>
                <span>{profile?.totalRides || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                <span style={{ color: 'var(--muted)' }}>Member Since</span>
                <span>{new Date(profile?.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <button className="btn-secondary" onClick={() => setEditing(true)}>Edit Profile</button>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: '24px' }}>
        <h3 className="card-title">Verification Status</h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--surface2)', borderRadius: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>✉️</span>
              <span>Email Verified</span>
            </div>
            <span className={`badge ${profile?.verified?.email ? 'badge-success' : 'badge-warning'}`}>
              {profile?.verified?.email ? 'Verified' : 'Pending'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--surface2)', borderRadius: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>🎓</span>
              <span>Student ID</span>
            </div>
            <span className={`badge ${profile?.verified?.studentId ? 'badge-success' : 'badge-warning'}`}>
              {profile?.verified?.studentId ? 'Verified' : 'Pending'}
            </span>
          </div>
          {(profile?.role === 'provider' || profile?.role === 'both') && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--surface2)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>🚗</span>
                <span>Driving License</span>
              </div>
              <span className={`badge ${profile?.verified?.license ? 'badge-success' : 'badge-warning'}`}>
                {profile?.verified?.license ? 'Verified' : 'Pending'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// PROTECTED ROUTE
// ==========================================
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}><div className="spinner" style={{ width: '40px', height: '40px' }} /></div>;
  
  if (!user) return <Navigate to="/" replace />;
  
  return children;
};

// ==========================================
// MAIN APP
// ==========================================
const App = () => {
  return (
    <AuthProvider>
      <Router>
        <GlobalStyles />
        <Navigation />
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/rides" element={<ProtectedRoute><RidesPage /></ProtectedRoute>} />
          <Route path="/bookings" element={<ProtectedRoute><BookingsPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;