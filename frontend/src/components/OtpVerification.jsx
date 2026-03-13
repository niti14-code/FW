import React, { useState, useEffect } from 'react';
import './OtpVerification.css';

export default function OtpVerification({ rideId, onVerificationComplete, onClose, isPermanentOtp = false }) {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(isPermanentOtp ? null : 300); // No timer for permanent OTP

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/ride/${rideId}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp })
      });
      
      const data = await response.json();
      
      if (response.message) {
        setError(data.message);
      } else {
        onVerificationComplete(data);
        onClose();
      }
    } catch (error) {
      setError('Failed to verify OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="otp-overlay">
      <div className="otp-modal">
        <div className="otp-header">
          <h3>🔐 Verify OTP</h3>
          <button className="otp-close" onClick={onClose}>×</button>
        </div>
        
        <div className="otp-body">
          <p className="otp-instruction">
            {isPermanentOtp 
              ? 'Please enter your permanent OTP (same for all rides)'
              : 'Please enter the 6-digit OTP sent to your phone'
            }
          </p>
          
          {timeLeft > 0 && (
            <div className="otp-timer">
              <span className={`timer-digit ${timeLeft <= 60 ? 'warning' : ''}`}>
                ⏰ {formatTime(timeLeft)}
              </span>
              <small>Time remaining</small>
            </div>
          )}
          
          {!isPermanentOtp && timeLeft === 0 && (
            <div className="otp-expired">
              ⏰ OTP has expired. Please request a new OTP.
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="otp-form">
            <div className="otp-input-group">
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                className="otp-input"
                disabled={isLoading}
              />
              <button 
                type="submit" 
                className={`otp-submit ${isLoading ? 'loading' : ''}`}
                disabled={isLoading}
              >
                {isLoading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </div>
            
            {error && <div className="otp-error">{error}</div>}
          </form>
          
          <div className="otp-actions">
            {!isPermanentOtp && (
              <button 
                type="button" 
                className="otp-resend"
                onClick={() => window.location.reload()}
                disabled={timeLeft > 240} // Prevent spam - only allow resend after 1 minute
              >
                📲 Resend OTP
              </button>
            )}
            <button type="button" className="otp-cancel" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
