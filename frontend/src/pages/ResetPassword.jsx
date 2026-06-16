import React, { useState } from 'react';
import * as api from '../services/api';

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

  if(success){
    return (
      <div className="auth-shell">
        <div className="card">
          <h2>Password Reset Successful</h2>

          <button
            className="btn btn-primary"
            onClick={() => navigate('login')}
          >
            Login
          </button>
        </div>
      </div>
    );
  }

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