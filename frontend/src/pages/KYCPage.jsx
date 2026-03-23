import React, { useState } from 'react';
import './KYCPage.css';

const STEPS = ['Upload ID', 'Selfie Check', 'Review'];

export default function KYCPage({ navigate }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ studentId: null, license: null, selfie: null });
  const [preview, setPreview] = useState({ studentId: null, license: null, selfie: null });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFile = (key) => (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm(f => ({ ...f, [key]: file }));
    const reader = new FileReader();
    reader.onload = ev => setPreview(p => ({ ...p, [key]: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1800));
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) return (
    <div className="kyc-wrap fade-up">
      <div className="kyc-success">
        <div className="kyc-success-icon">🎉</div>
        <h2 className="heading mt-16">KYC Submitted!</h2>
        <p className="text-muted mt-8">Your documents are under admin review. You will be notified within 24 hours.</p>
        <div className="kyc-status-badge mt-24">Pending Review</div>
        <button className="btn btn-primary mt-24" onClick={() => navigate('dashboard')}>Back to Dashboard</button>
      </div>
    </div>
  );

  return (
    <div className="kyc-wrap fade-up">
      <p className="eyebrow mb-8">Verification</p>
      <h1 className="heading mb-4" style={{fontSize:28}}>KYC Verification</h1>
      <p className="text-muted mb-32 text-sm">Complete verification to unlock all features</p>

      <div className="kyc-steps mb-40">
        {STEPS.map((s, i) => (
          <div key={s} className={`kyc-step ${i === step ? 'active' : i < step ? 'done' : ''}`}>
            <div className="kyc-step-num">{i < step ? 'done' : i + 1}</div>
            <span className="kyc-step-label">{s}</span>
            {i < STEPS.length - 1 && <div className="kyc-step-line" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="kyc-card fade-up">
          <h3 className="heading mb-4" style={{fontSize:20}}>Upload Documents</h3>
          <p className="text-muted mb-24 text-sm">Upload your college ID and driving license</p>
          <div className="kyc-upload-grid">
            <div className="kyc-upload-box">
              <label className="kyc-upload-label" htmlFor="studentId">
                {preview.studentId
                  ? <img src={preview.studentId} alt="Student ID" className="kyc-preview-img" />
                  : <><div className="kyc-upload-icon">ID</div><div className="kyc-upload-text">College / Student ID</div><div className="kyc-upload-sub">JPG, PNG up to 5MB</div></>
                }
              </label>
              <input id="studentId" type="file" accept="image/*" onChange={handleFile('studentId')} hidden />
              {preview.studentId && <div className="kyc-check">Uploaded</div>}
            </div>
            <div className="kyc-upload-box">
              <label className="kyc-upload-label" htmlFor="license">
                {preview.license
                  ? <img src={preview.license} alt="License" className="kyc-preview-img" />
                  : <><div className="kyc-upload-icon">DL</div><div className="kyc-upload-text">Driving License</div><div className="kyc-upload-sub">JPG, PNG up to 5MB</div></>
                }
              </label>
              <input id="license" type="file" accept="image/*" onChange={handleFile('license')} hidden />
              {preview.license && <div className="kyc-check">Uploaded</div>}
            </div>
          </div>
          <button className="btn btn-primary btn-lg btn-full mt-32"
            disabled={!form.studentId || !form.license}
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
                : <><div className="kyc-upload-icon" style={{fontSize:40}}>CAM</div><div className="kyc-upload-text">Click to take or upload selfie</div><div className="kyc-upload-sub">Make sure your face is clearly visible</div></>
              }
            </label>
            <input id="selfie" type="file" accept="image/*" capture="user" onChange={handleFile('selfie')} hidden />
          </div>
          <div className="kyc-tips mt-24">
            {['Good lighting on your face', 'No sunglasses or mask', 'Plain background preferred'].map(t => (
              <div key={t} className="kyc-tip">+ {t}</div>
            ))}
          </div>
          <div className="flex gap-12 mt-32">
            <button className="btn btn-outline btn-lg" onClick={() => setStep(0)}>Back</button>
            <button className="btn btn-primary btn-lg flex-1" disabled={!form.selfie} onClick={() => setStep(2)}>Continue</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="kyc-card fade-up">
          <h3 className="heading mb-4" style={{fontSize:20}}>Review and Submit</h3>
          <p className="text-muted mb-24 text-sm">Confirm your documents before submitting</p>
          <div className="kyc-review-grid">
            {[
              { label: 'College ID', img: preview.studentId },
              { label: 'Driving License', img: preview.license },
              { label: 'Selfie', img: preview.selfie },
            ].map(item => (
              <div key={item.label} className="kyc-review-item">
                <div className="kyc-review-label">{item.label}</div>
                <img src={item.img} alt={item.label} className="kyc-review-img" />
                <div className="kyc-check">Ready</div>
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
