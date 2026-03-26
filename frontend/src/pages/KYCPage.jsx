import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import * as api from '../services/api.js';
import './KYCPage.css';

const STEPS = ['Upload ID', 'Selfie Check', 'Review'];

export default function KYCPage({ navigate }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ 
    aadhar: null, 
    collegeId: null, 
    license: null, 
    selfie: null 
  });
  const [preview, setPreview] = useState({ 
    aadhar: null, 
    collegeId: null, 
    license: null, 
    selfie: null 
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [kycStatus, setKycStatus] = useState(null);

  const isProvider = user?.role === 'provider' || user?.role === 'both';
  const isSeeker = user?.role === 'seeker' || user?.role === 'both';

  // Fetch existing KYC status on load
  useEffect(() => {
    fetchKycStatus();
  }, []);

  const fetchKycStatus = async () => {
    try {
      const status = await api.getKycStatus();
      setKycStatus(status);
      
      // If already submitted, show submitted view
      if (status.kycStatus === 'pending' || status.kycStatus === 'approved' || status.kycStatus === 'rejected') {
        setSubmitted(true);
        // Pre-fill previews if documents exist
        if (status.documents) {
          setPreview({
            aadhar: status.documents.aadhar,
            collegeId: status.documents.collegeIdCard,
            license: status.documents.drivingLicense,
            selfie: status.documents.selfie
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch KYC status:', err);
    }
  };

  const handleFile = (key) => async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed');
      return;
    }

    setError('');
    setForm(f => ({ ...f, [key]: file }));

    // Create preview
    const reader = new FileReader();
    reader.onload = ev => setPreview(p => ({ ...p, [key]: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const uploadFiles = async () => {
    const uploads = {};
    
    // Upload all files and get base64 URLs (or upload to cloud)
    for (const [key, file] of Object.entries(form)) {
      if (file && key !== 'license' || (key === 'license' && isProvider)) {
        uploads[key] = preview[key]; // base64 data URL
      }
    }
    
    return uploads;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      // Upload files
      const uploads = await uploadFiles();

      // Submit KYC
      const payload = {
        aadharUrl: uploads.aadhar,
        collegeIdCardUrl: uploads.collegeId,
        selfieUrl: uploads.selfie
      };

      // Add license only for providers
      if (isProvider) {
        payload.drivingLicenseUrl = uploads.license;
      }

      const result = await api.submitKyc(payload);
      
      setKycStatus({
        kycStatus: 'pending',
        documents: {
          aadhar: uploads.aadhar,
          collegeIdCard: uploads.collegeId,
          drivingLicense: uploads.license,
          selfie: uploads.selfie
        }
      });
      
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to submit KYC');
    } finally {
      setLoading(false);
    }
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    const colors = {
      not_submitted: '#888',
      pending: '#ffc107',
      approved: '#28a745',
      rejected: '#dc3545'
    };
    
    return (
      <div className="kyc-status-badge" style={{background: colors[status] || '#888'}}>
        {status?.replace('_', ' ').toUpperCase()}
      </div>
    );
  };

  // Submitted view - show documents and status
  if (submitted && kycStatus) {
    return (
      <div className="kyc-wrap fade-up">
        <div className="kyc-success">
          <div className="kyc-success-icon">
            {kycStatus.kycStatus === 'approved' ? '✅' : 
             kycStatus.kycStatus === 'rejected' ? '❌' : '⏳'}
          </div>
          <h2 className="heading mt-16">
            {kycStatus.kycStatus === 'approved' ? 'KYC Approved!' :
             kycStatus.kycStatus === 'rejected' ? 'KYC Rejected' :
             'KYC Submitted!'}
          </h2>
          <p className="text-muted mt-8">
            {kycStatus.kycStatus === 'approved' ? 'Your documents have been verified. You can now offer rides.' :
             kycStatus.kycStatus === 'rejected' ? 'Your documents were rejected. Please resubmit.' :
             'Your documents are under admin review. You will be notified within 24 hours.'}
          </p>
          
          <StatusBadge status={kycStatus.kycStatus} />
          
          {/* Display submitted documents */}
          <div className="kyc-submitted-docs mt-24">
            <h4 className="mb-16">Submitted Documents</h4>
            <div className="kyc-docs-grid">
              {kycStatus.documents?.aadhar && (
                <div className="kyc-doc-item">
                  <div className="kyc-doc-label">Aadhar Card</div>
                  <img src={kycStatus.documents.aadhar} alt="Aadhar" className="kyc-doc-img" />
                </div>
              )}
              {kycStatus.documents?.collegeIdCard && (
                <div className="kyc-doc-item">
                  <div className="kyc-doc-label">College ID</div>
                  <img src={kycStatus.documents.collegeIdCard} alt="College ID" className="kyc-doc-img" />
                </div>
              )}
              {isProvider && kycStatus.documents?.drivingLicense && (
                <div className="kyc-doc-item">
                  <div className="kyc-doc-label">Driving License</div>
                  <img src={kycStatus.documents.drivingLicense} alt="License" className="kyc-doc-img" />
                </div>
              )}
              {kycStatus.documents?.selfie && (
                <div className="kyc-doc-item">
                  <div className="kyc-doc-label">Selfie</div>
                  <img src={kycStatus.documents.selfie} alt="Selfie" className="kyc-doc-img" />
                </div>
              )}
            </div>
          </div>

          {kycStatus.kycStatus === 'rejected' && (
            <button className="btn btn-primary mt-24" onClick={() => {
              setSubmitted(false);
              setStep(0);
            }}>
              Resubmit KYC
            </button>
          )}
          
          <button className="btn btn-outline mt-16" onClick={() => navigate('dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // KYC submission form
  return (
    <div className="kyc-wrap fade-up">
      <p className="eyebrow mb-8">Verification</p>
      <h1 className="heading mb-4" style={{fontSize:28}}>KYC Verification</h1>
      <p className="text-muted mb-32 text-sm">
        {isProvider 
          ? 'Complete verification with Aadhar, College ID, and Driving License to offer rides' 
          : 'Complete verification with Aadhar and College ID to book rides'}
      </p>

      <div className="kyc-steps mb-40">
        {STEPS.map((s, i) => (
          <div key={s} className={`kyc-step ${i === step ? 'active' : i < step ? 'done' : ''}`}>
            <div className="kyc-step-num">{i < step ? '✓' : i + 1}</div>
            <span className="kyc-step-label">{s}</span>
            {i < STEPS.length - 1 && <div className="kyc-step-line" />}
          </div>
        ))}
      </div>

      {error && <div className="alert alert-error mb-16">{error}</div>}

      {step === 0 && (
        <div className="kyc-card fade-up">
          <h3 className="heading mb-4" style={{fontSize:20}}>Upload Documents</h3>
          <p className="text-muted mb-24 text-sm">
            {isProvider 
              ? 'Upload your Aadhar, College ID, and Driving License' 
              : 'Upload your Aadhar and College ID'}
          </p>
          
          <div className="kyc-upload-grid">
            {/* Aadhar - Required for all */}
            <div className="kyc-upload-box">
              <label className="kyc-upload-label" htmlFor="aadhar">
                {preview.aadhar
                  ? <img src={preview.aadhar} alt="Aadhar" className="kyc-preview-img" />
                  : <><div className="kyc-upload-icon">🆔</div><div className="kyc-upload-text">Aadhar Card</div><div className="kyc-upload-sub">Required • JPG, PNG up to 5MB</div></>
                }
              </label>
              <input id="aadhar" type="file" accept="image/*" onChange={handleFile('aadhar')} hidden />
              {preview.aadhar && <div className="kyc-check">✓ Uploaded</div>}
            </div>

            {/* College ID - Required for all */}
            <div className="kyc-upload-box">
              <label className="kyc-upload-label" htmlFor="collegeId">
                {preview.collegeId
                  ? <img src={preview.collegeId} alt="College ID" className="kyc-preview-img" />
                  : <><div className="kyc-upload-icon">🎓</div><div className="kyc-upload-text">College / Student ID</div><div className="kyc-upload-sub">Required • JPG, PNG up to 5MB</div></>
                }
              </label>
              <input id="collegeId" type="file" accept="image/*" onChange={handleFile('collegeId')} hidden />
              {preview.collegeId && <div className="kyc-check">✓ Uploaded</div>}
            </div>

            {/* Driving License - Only for providers */}
            {isProvider && (
              <div className="kyc-upload-box">
                <label className="kyc-upload-label" htmlFor="license">
                  {preview.license
                    ? <img src={preview.license} alt="License" className="kyc-preview-img" />
                    : <><div className="kyc-upload-icon">🚗</div><div className="kyc-upload-text">Driving License</div><div className="kyc-upload-sub">Required for providers • JPG, PNG up to 5MB</div></>
                  }
                </label>
                <input id="license" type="file" accept="image/*" onChange={handleFile('license')} hidden />
                {preview.license && <div className="kyc-check">✓ Uploaded</div>}
              </div>
            )}
          </div>
          
          <button className="btn btn-primary btn-lg btn-full mt-32"
            disabled={!preview.aadhar || !preview.collegeId || (isProvider && !preview.license)}
            onClick={() => setStep(1)}>
            Continue
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="kyc-card fade-up">
          <h3 className="heading mb-4" style={{fontSize:20}}>Selfie Verification</h3>
          <p className="text-muted mb-24 text-sm">Take a clear selfie to verify your identity</p>
          <div className="kyc-selfie-box">
            <label className="kyc-upload-label kyc-selfie-label" htmlFor="selfie">
              {preview.selfie
                ? <img src={preview.selfie} alt="Selfie" className="kyc-selfie-img" />
                : <><div className="kyc-upload-icon" style={{fontSize:40}}>📷</div><div className="kyc-upload-text">Click to take or upload selfie</div><div className="kyc-upload-sub">Make sure your face is clearly visible</div></>
              }
            </label>
            <input id="selfie" type="file" accept="image/*" capture="user" onChange={handleFile('selfie')} hidden />
          </div>
          <div className="kyc-tips mt-24">
            {['Good lighting on your face', 'No sunglasses or mask', 'Plain background preferred'].map(t => (
              <div key={t} className="kyc-tip">✓ {t}</div>
            ))}
          </div>
          <div className="flex gap-12 mt-32">
            <button className="btn btn-outline btn-lg" onClick={() => setStep(0)}>Back</button>
            <button className="btn btn-primary btn-lg flex-1" disabled={!preview.selfie} onClick={() => setStep(2)}>Continue</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="kyc-card fade-up">
          <h3 className="heading mb-4" style={{fontSize:20}}>Review and Submit</h3>
          <p className="text-muted mb-24 text-sm">Confirm your documents before submitting</p>
          <div className="kyc-review-grid">
            {[
              { label: 'Aadhar Card', img: preview.aadhar, required: true },
              { label: 'College ID', img: preview.collegeId, required: true },
              ...(isProvider ? [{ label: 'Driving License', img: preview.license, required: true }] : []),
              { label: 'Selfie', img: preview.selfie, required: true },
            ].map(item => (
              <div key={item.label} className={`kyc-review-item ${!item.img ? 'missing' : ''}`}>
                <div className="kyc-review-label">{item.label} {item.required && '*'}</div>
                <img src={item.img} alt={item.label} className="kyc-review-img" />
                <div className="kyc-check">{item.img ? '✓ Ready' : 'Missing'}</div>
              </div>
            ))}
          </div>
          <div className="alert alert-info mt-24">
            Documents will be reviewed by admin within 24 hours. Your profile will be activated upon approval.
          </div>
          <div className="flex gap-12 mt-24">
            <button className="btn btn-outline btn-lg" onClick={() => setStep(1)}>Back</button>
            <button className={`btn btn-primary btn-lg flex-1 ${loading ? 'btn-loading' : ''}`}
              disabled={loading} onClick={handleSubmit}>
              {!loading && 'Submit for Review'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}