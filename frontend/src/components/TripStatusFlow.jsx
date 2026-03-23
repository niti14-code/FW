import React, { useState, useEffect } from 'react';
import OtpVerification from './OtpVerification.jsx';
import * as api from '../services/api.js';
import './TripStatusFlow.css';

export default function TripStatusFlow({ ride, onUpdate }) {
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpStatus, setOtpStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (ride?._id) {
      fetchOtpStatus();
    }
  }, [ride?._id]);

  const fetchOtpStatus = async () => {
    try {
      const status = await api.getOtpStatus(ride._id);
      setOtpStatus(status);
    } catch (error) {
      console.error('Failed to fetch OTP status:', error);
    }
  };

  const handleRequestOtp = async () => {
    setIsLoading(true);
    try {
      const response = await api.requestOtpFromSeeker(ride._id);
      alert(`OTP requested from passengers\nOTP: ${response.otp}\nSent to ${response.passengersNotified} passengers`);
      await fetchOtpStatus(); // Refresh status
      onUpdate();
    } catch (error) {
      alert(error.message || 'Failed to request OTP from passengers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateOtp = async () => {
    setIsLoading(true);
    try {
      const response = await api.generateOtp(ride._id);
      if (response.isPermanentOtp) {
        alert(`Your permanent OTP: ${response.otp}\nSent to ${response.passengersNotified} passengers`);
      } else {
        alert(`New permanent OTP created: ${response.otp}\nSent to ${response.passengersNotified} passengers\nThis OTP will be used for all your future rides!`);
      }
      await fetchOtpStatus(); // Refresh status
      onUpdate();
    } catch (error) {
      alert(error.message || 'Failed to generate OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartRide = async () => {
    setIsLoading(true);
    try {
      const response = await api.startRide(ride._id);
      alert(response.message);
      onUpdate();
    } catch (error) {
      if (error.message?.includes('OTP')) {
        setShowOtpModal(true);
      } else {
        alert(error.message || 'Failed to start ride');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerified = (verificationData) => {
    setShowOtpModal(false);
    setOtpStatus(prev => ({ ...prev, isOtpVerified: true }));
    alert('OTP verified successfully! You can now start the ride.');
    onUpdate();
  };

  const canRequestOtp = ride?.status === 'active' && !otpStatus?.hasOtp;
  const canGenerateOtp = ride?.status === 'active' && !otpStatus?.hasOtp;
  const canStartRide = ride?.status === 'active' && otpStatus?.isOtpVerified;
  const isRideInProgress = ride?.status === 'in-progress';

  return (
    <div className="trip-status-flow">
      <div className="tsf-header">
        <h4>🚗 Trip Controls</h4>
        <div className={`tsf-status ${ride?.status}`}>
          Status: <span className="capitalize">{ride?.status}</span>
        </div>
      </div>

      <div className="tsf-actions">
        {/* OTP Status Display */}
        {otpStatus && (
          <div className="otp-status-card">
            <div className="otp-status-header">
              <span className="otp-status-title">🔐 OTP Verification</span>
              <div className={`otp-status-badge ${otpStatus.isOtpVerified ? 'verified' : 'pending'}`}>
                {otpStatus.isOtpVerified ? '✅ Verified' : '⏳ Pending'}
              </div>
            </div>
            
            {otpStatus.hasOtp && (
              <div className="otp-details">
                <div className="otp-detail-item">
                  <span className="otp-label">Generated:</span>
                  <span className="otp-value">
                    {new Date(otpStatus.otpGeneratedAt).toLocaleTimeString()}
                  </span>
                </div>
                
                {otpStatus.isOtpVerified && (
                  <div className="otp-detail-item">
                    <span className="otp-label">Verified:</span>
                    <span className="otp-value success">
                      {new Date(otpStatus.otpVerifiedAt).toLocaleTimeString()}
                    </span>
                  </div>
                )}
                
                {otpStatus.isExpired && (
                  <div className="otp-expired-notice">
                    ⏰ OTP has expired. Please generate a new one.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-buttons">
          {canRequestOtp && (
            <button 
              className="btn btn-primary btn-lg"
              onClick={handleRequestOtp}
              disabled={isLoading}
            >
              {isLoading ? '🔄 Requesting...' : '📱 Request OTP from Passengers'}
            </button>
          )}

          {canGenerateOtp && (
            <button 
              className="btn btn-warning btn-lg"
              onClick={handleGenerateOtp}
              disabled={isLoading}
            >
              {isLoading ? '🔄 Generating...' : '🔐 Generate Your OTP'}
            </button>
          )}

          {canStartRide && (
            <button 
              className="btn btn-success btn-lg"
              onClick={handleStartRide}
              disabled={isLoading}
            >
              {isLoading ? '🔄 Starting...' : '🚀 Start Ride'}
            </button>
          )}

          {isRideInProgress && (
            <div className="ride-active-notice">
              <div className="active-indicator">🚗</div>
              <div className="active-text">
                <strong>Ride in Progress</strong>
                <small>Started at {new Date(ride.startedAt).toLocaleTimeString()}</small>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        {ride?.status === 'active' && (
          <div className="otp-instructions">
            <h5>📋 How to Start Your Ride:</h5>
            <ol>
              <li><strong>Request OTP from passengers</strong> - They will receive a unique code</li>
              <li><strong>Ask passengers for OTP</strong> when they arrive at pickup</li>
              <li><strong>Enter OTP to verify</strong> - Confirms passenger identity</li>
              <li><strong>Start the ride</strong> - Only possible after OTP verification</li>
            </ol>
            <div className="security-note">
              🔒 This ensures passenger safety and prevents unauthorized ride starts
            </div>
          </div>
        )}
      </div>

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <OtpVerification
          rideId={ride._id}
          onVerificationComplete={handleOtpVerified}
          onClose={() => setShowOtpModal(false)}
          isPermanentOtp={otpStatus?.isPermanentOtp}
        />
      )}
    </div>
  );
}
