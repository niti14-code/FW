import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { validateCollegeEmail, getDomainsForCollege } from '../data/collegeDomains.js';
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
  const [kycDocs,   setKycDocs] = useState({ aadhar: null, license: null, collegeId: null });
  const [vehicleNumber, setVehicleNumber] = useState('');
  //const [vehicleType, setVehicleType] = useState('');
  const [vehicleNumberError, setVehicleNumberError] = useState('');
  const [emergencyContact, setEmergency] = useState('');
  const [role, setRole] = useState('');
  const [adminKey, setAdminKey] = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const isProvider = form.role === 'provider' || form.role === 'both';

  // Live email-domain validation (only for non-admin roles)
  const emailValidation = useMemo(() => {
    if (form.role === 'admin') return { valid: true, message: '' };
    if (!form.email || !form.college) return { valid: true, message: '' };
    return validateCollegeEmail(form.email, form.college);
  }, [form.email, form.college, form.role]);

  // Hint text: show expected domain when college is filled
  const domainHint = useMemo(() => {
    if (form.role === 'admin' || !form.college) return null;
    const domains = getDomainsForCollege(form.college);
    return domains.length > 0 ? `Use your @${domains[0]} college email` : 'Use your official college email (not Gmail/Yahoo)';
  }, [form.college, form.role]);

  const validate = () => {
    if (!form.name.trim())    return 'Name is required';
    if (!form.email.trim())   return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(form.email)) return 'Enter a valid email';
    if (form.role !== 'admin') {
      if (!form.college.trim()) return 'College name is required';
      const { valid, message } = validateCollegeEmail(form.email, form.college);
      if (!valid && message) return message;
    }
    if (form.password.length < 6) return 'Password must be at least 6 characters';
    if (form.password !== confirmPass) return 'Passwords do not match';
    if (!form.phone.trim())   return 'Phone number is required';
    if (form.role === 'admin' && adminKey !== 'freewheel') {
      return 'Invalid admin key';
    }
    /*if (isProvider && !vehicleType) {
      return 'Select vehicle service type (car or bike)';
    }*/
    if (isProvider && vehicleNumber) {
      const vnRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/;
      if (!vnRegex.test(vehicleNumber.toUpperCase())) {
        return 'Enter a valid vehicle number (e.g. KA01AB1234)';
      }
    }
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
        adminKey,
        emergencyContact,
        //vehicleType:    isProvider ? vehicleType : '',
        aadhar:         kycDocs.aadhar       ? kycDocs.aadhar.name       : '',
        drivingLicense: kycDocs.license      ? kycDocs.license.name      : '',
        collegeIdCard:  kycDocs.collegeId    ? kycDocs.collegeId.name    : '',
        vehicleNumber:  vehicleNumber        ? vehicleNumber.toUpperCase() : '',
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
            {domainHint && !form.email && (
              <p className="field-hint-msg">💡 {domainHint}</p>
            )}
            {form.email && form.role !== 'admin' && form.college && (
              emailValidation.valid
                ? <p className="field-success-msg">✓ Valid college email</p>
                : <p className="field-error-msg">⚠ {emailValidation.message}</p>
            )}
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
                  onClick={() => {
                    setForm(f => ({ ...f, role: r.value }));
                    if (r.value === 'admin') setKycDocs({ aadhar: null, license: null, collegeId: null });
                  }}>
                  <span className="rc-r-icon">{r.icon}</span>
                  <span className="rc-r-title">{r.title}</span>
                  <span className="rc-r-desc">{r.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Admin key */}
          {form.role === 'admin' && (
            <div className="field">
              <label>Admin Key</label>
              <div className="input-wrap">
                <span className="input-icon">🔑</span>
                <input
                  className="input"
                  type="password"
                  placeholder="Enter admin key"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Password */}
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

          {/* KYC Documents — hidden for admin */}
          {form.role !== 'admin' && (
            <div className="kyc-docs-section">
              <div className="kyc-docs-header">
                <span className="kyc-docs-icon">📋</span>
                <div>
                  <div className="kyc-docs-title">KYC Documents Required</div>
                  <div className="kyc-docs-sub">
                    {isProvider
                      ? 'Upload Aadhar, College ID, Driving License, and your vehicle number'
                      : 'Upload Aadhar and College ID for identity verification'}
                  </div>
                </div>
                <span className="badge badge-pending" style={{marginLeft:'auto',fontSize:11}}>Pending</span>
              </div>

              <div className="kyc-docs-grid">

                {/* Aadhar — all roles */}
                <div className="field">
                  <label>🪪 Aadhar Card *</label>
                  <input type="file" className="input kyc-file-input" accept="image/*,.pdf"
                    onChange={e => setKycDocs(prev => ({ ...prev, aadhar: e.target.files[0] }))} />
                  {kycDocs.aadhar && <p className="field-success-msg">✓ {kycDocs.aadhar.name}</p>}
                </div>

                {/* College ID — all roles */}
                <div className="field">
                  <label>🎓 College ID Card *</label>
                  <input type="file" className="input kyc-file-input" accept="image/*,.pdf"
                    onChange={e => setKycDocs(prev => ({ ...prev, collegeId: e.target.files[0] }))} />
                  {kycDocs.collegeId && <p className="field-success-msg">✓ {kycDocs.collegeId.name}</p>}
                </div>

                {/* Driving License — provider & both only */}
                {isProvider && (
                  <div className="field">
                    <label>🚗 Driving License *</label>
                    <input type="file" className="input kyc-file-input" accept="image/*,.pdf"
                      onChange={e => setKycDocs(prev => ({ ...prev, license: e.target.files[0] }))} />
                    {kycDocs.license && <p className="field-success-msg">✓ {kycDocs.license.name}</p>}
                  </div>
                )}

                

                {isProvider && (
                  <div className="field" style={{ gridColumn: '1 / -1' }}>
                    <label>🔢 Vehicle Registration Number *</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. KA01AB1234"
                      maxLength={12}
                      value={vehicleNumber}
                      onChange={e => {
                        const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                        setVehicleNumber(val);
                        setVehicleNumberError('');
                      }}
                    />
                    {vehicleNumberError && (
                      <p className="field-error-msg">{vehicleNumberError}</p>
                    )}
                    <p className="field-hint-msg">Format: State + District + Series + Number (e.g. KA01AB1234)</p>
                  </div>
                )}

              </div>
              <p className="kyc-docs-note">
                Your account will be activated once admin approves your documents.
              </p>
            </div>
          )}

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
