import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import './AuthPages.css';

const ROLES = [
  { value:'seeker',   icon:'🎒', title:'Seeker',   desc:'I need rides' },
  { value:'provider', icon:'🚗', title:'Provider', desc:'I offer rides' },
  { value:'both',     icon:'🔄', title:'Both',     desc:'Flexible' },
  { value:'admin',    icon:'🛠️', title:'Admin',   desc:'Manage platform' },
];

export default function RegisterPage({ navigate }) {
  const { registerUser } = useAuth();
  const [form,      setForm]    = useState({ name:'', email:'', password:'', phone:'', college:'', role:'seeker' });
  const [error,     setError]   = useState('');
  const [loading,   setLoading] = useState(false);
  const [showPass,  setShowPass]= useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmPass, setConfirmPass] = useState('');
  const [kycDocs,     setKycDocs]     = useState({ aadhar: null, license: null, collegeId: null });
  const [emergencyContact, setEmergency] = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    if (!form.name.trim())    return 'Name is required';
    if (!form.email.trim())   return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(form.email)) return 'Enter a valid email';
    if (form.password.length < 6) return 'Password must be at least 6 characters';
    if (form.password !== confirmPass) return 'Passwords do not match';
    if (!form.phone.trim())   return 'Phone number is required';
    if (!form.college.trim()) return 'College name is required';
    return null;
  };

  const submit = async e => {
    e.preventDefault();
    setError('');
    const v = validate();
    if (v) { setError(v); return; }
    setLoading(true);
    try {
      await registerUser({
        ...form,
        emergencyContact,
        // Pass filenames so backend stores them in kycDocuments
        aadhar:         kycDocs.aadhar    ? kycDocs.aadhar.name    : '',
        drivingLicense: kycDocs.license   ? kycDocs.license.name   : '',
        collegeIdCard:  kycDocs.collegeId ? kycDocs.collegeId.name : '',
      });
      navigate('dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      {/* Left panel */}
      <div className="auth-brand-panel">
        <div className="abp-inner">
          <div className="abp-logo">Campus<span>Ride</span></div>
          <h1 className="abp-headline display">
            Join your<br/>campus<br/><em>ride network.</em>
          </h1>
          <p className="abp-sub">Verified accounts, real students, zero hassle.</p>
          <div className="abp-steps">
            {[
              { n:'1', t:'Create account' },
              { n:'2', t:'Upload KYC docs' },
              { n:'3', t:'Get verified & ride' },
            ].map(s => (
              <div key={s.n} className="abp-step">
                <div className="abp-step-n">{s.n}</div>
                <span style={{fontSize:14, fontWeight:500}}>{s.t}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="abp-glow" />
      </div>

      {/* Right form */}
      <div className="auth-form-panel">
        <form className="auth-form fade-up" onSubmit={submit} noValidate>
          <div className="af-header">
            <h2 className="heading" style={{fontSize:26}}>Create account</h2>
            <p className="text-muted mt-8 text-sm">Join thousands of campus commuters</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="grid-2">
            <div className="field">
              <label>Full Name</label>
              <input className="input" placeholder="Arjun Sharma"
                value={form.name} onChange={set('name')} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input className="input" type="tel" placeholder="+91 9876543210"
                value={form.phone} onChange={set('phone')} />
            </div>
          </div>

          <div className="field">
            <label>College Email</label>
            <input className="input" type="email" placeholder="you@college.edu"
              value={form.email} onChange={set('email')} />
          </div>

          <div className="grid-2">
            <div className="field">
              <label>College / University</label>
              <input className="input" placeholder="IIT Bombay, BITS Pilani…"
                value={form.college} onChange={set('college')} />
            </div>
            <div className="field">
              <label>Emergency Contact</label>
              <input className="input" type="tel" placeholder="+91 9876543211"
                value={emergencyContact} onChange={e => setEmergency(e.target.value)} />
            </div>
          </div>

          {/* Role selector */}
          <div className="field">
            <label>I want to</label>
            <div className="role-grid">
              {ROLES.map(r => (
                <button key={r.value} type="button"
                  className={`role-card ${form.role === r.value ? 'selected' : ''}`}
                  onClick={() => setForm(f => ({ ...f, role: r.value }))}>
                  <span className="rc-r-icon">{r.icon}</span>
                  <span className="rc-r-title">{r.title}</span>
                  <span className="rc-r-desc">{r.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Password with show/hide */}
          <div className="field">
            <label>Password</label>
            <div className="input-wrap">
              <span className="input-icon">🔒</span>
              <input
                className="input input-with-toggle"
                type={showPass ? 'text' : 'password'}
                placeholder="Min. 6 characters"
                value={form.password} onChange={set('password')}
              />
              <button type="button" className="show-pass-btn"
                onClick={() => setShowPass(s => !s)} tabIndex={-1}
                title={showPass ? 'Hide' : 'Show'}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div className="field">
            <label>Confirm Password</label>
            <div className="input-wrap">
              <span className="input-icon">🔒</span>
              <input
                className="input input-with-toggle"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Re-enter password"
                value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
              />
              <button type="button" className="show-pass-btn"
                onClick={() => setShowConfirm(s => !s)} tabIndex={-1}
                title={showConfirm ? 'Hide' : 'Show'}>
                {showConfirm ? '🙈' : '👁️'}
              </button>
            </div>
            {confirmPass && form.password !== confirmPass && (
              <p className="field-error-msg">Passwords do not match</p>
            )}
            {confirmPass && form.password === confirmPass && confirmPass.length >= 6 && (
              <p className="field-success-msg">✓ Passwords match</p>
            )}
          </div>

          {/* KYC Documents */}
          <div className="kyc-docs-section">
            <div className="kyc-docs-header">
              <span className="kyc-docs-icon">📋</span>
              <div>
                <div className="kyc-docs-title">KYC Documents Required</div>
                <div className="kyc-docs-sub">Upload for identity verification — reviewed within 24 hrs</div>
              </div>
              <span className="badge badge-pending" style={{marginLeft:'auto',fontSize:11}}>Pending</span>
            </div>
            <div className="kyc-docs-grid">
              {[
                { key:'aadhar',    label:'Aadhar Card *',    icon:'🪪' },
                { key:'license',   label:'Driving License *', icon:'🚗' },
                { key:'collegeId', label:'College ID Card *', icon:'🎓' },
              ].map(d => (
                <div key={d.key} className="field">
                  <label>{d.icon} {d.label}</label>
                  <input type="file" className="input kyc-file-input" accept="image/*,.pdf"
                    onChange={e => setKycDocs(prev => ({ ...prev, [d.key]: e.target.files[0] }))} />
                  {kycDocs[d.key] && (
                    <p className="field-success-msg">✓ {kycDocs[d.key].name}</p>
                  )}
                </div>
              ))}
            </div>
            <p className="kyc-docs-note">
              Your account will be activated once admin approves your documents.
            </p>
          </div>

          <button type="submit"
            className={`btn btn-primary btn-lg btn-full mt-8 ${loading ? 'btn-loading' : ''}`}
            disabled={loading}>
            {!loading && 'Create Account →'}
          </button>

          <p className="text-center text-muted text-sm mt-16">
            Already have an account?{' '}
            <button type="button" className="link-btn" onClick={() => navigate('login')}>
              Sign in
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
