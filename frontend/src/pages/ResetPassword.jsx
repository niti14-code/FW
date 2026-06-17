import React, { useState } from 'react';
import * as api from '../services/api';
import './ResetPassword.css';

export default function ResetPassword({ token, navigate }) {

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();

    if(password !== confirm){
      return setError('Passwords do not match');
    }

    try {

      await api.resetPassword(token, password);

      setSuccess(true);

    } catch(err){

      setError(err.message);

    }
  };

  if (success) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-campus">Campus</span>
          <span className="brand-ride">Ride</span>
        </div>

        <h1 className="auth-title">Password Updated</h1>
        <p className="auth-subtitle">
          Your password has been reset successfully.
        </p>

        <button
          className="btn btn-primary auth-submit"
          onClick={() => navigate('login')}
        >
          Go to Login →
        </button>
      </div>
    </div>
  );
}

return (
  <div className="auth-shell">
    <div className="auth-card">

      <div className="auth-brand">
        <span className="brand-campus">Campus</span>
        <span className="brand-ride">Ride</span>
      </div>

      <h1 className="auth-title">Reset Password</h1>

      <p className="auth-subtitle">
        Enter your new password below
      </p>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="auth-form">

        <label className="auth-label">
          NEW PASSWORD
        </label>

        <input
          className="auth-input"
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <small className="password-hint">
          Password must be at least 8 characters long
        </small>

        <label className="auth-label">
          CONFIRM PASSWORD
        </label>

        <input
          className="auth-input"
          type="password"
          placeholder="Confirm Password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <button
          type="submit"
          className="btn btn-primary auth-submit"
        >
          Reset Password →
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <div className="auth-footer">
          Remember your password?
          <button
            type="button"
            className="link-btn"
            onClick={() => navigate('login')}
          >
            Sign In →
          </button>
        </div>

      </form>
    </div>
  </div>
);

  return (
    <div className="auth-shell">
      <form onSubmit={submit}>

        <h2>Reset Password</h2>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="Confirm Password"
          value={confirm}
          onChange={(e)=>setConfirm(e.target.value)}
        />

        <button type="submit">
          Reset Password
        </button>

      </form>
    </div>
  );
}