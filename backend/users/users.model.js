const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  phone:    { type: String, required: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['provider', 'seeker', 'both', 'admin'],
    required: true
  },
  college: {
    type: String,
    required: function () { return this.role !== 'admin'; }
  },

  // ── Ratings aggregate (updated by ratings controller) ──
  rating:        { type: Number, default: 0 },   // legacy field — keep for compat
  averageRating: { type: Number, default: 0 },
  totalRatings:  { type: Number, default: 0 },

  totalRides: { type: Number, default: 0 },
  suspended:  { type: Boolean, default: false }, // admin can suspend/reactivate users

  kycStatus: {
    type: String,
    enum: ['not_required', 'pending', 'approved', 'rejected'],
    default: 'not_required'
  },
  kycDocuments: {
    aadhar:         String,
    drivingLicense: String,
    collegeIdCard:  String
  },
  emergencyContact: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
/*const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  phone:    { type: String, required: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['provider', 'seeker', 'both', 'admin'],
    required: true
  },
  college: {
    type: String,
    required: function () { return this.role !== 'admin'; }
  },
  rating:     { type: Number, default: 0, min: 0, max: 5 },
  totalRides: { type: Number, default: 0 },

  // Legacy verified flags (kept for backward-compat)
  verified: {
    email:     { type: Boolean, default: false },
    studentId: { type: Boolean, default: false },
    license:   { type: Boolean, default: false }
  },

  // KYC
  kycStatus: {
    type: String,
    enum: ['not_required', 'pending', 'approved', 'rejected'],
    default: 'not_required'
  },
  kycDocuments: {
    aadhar:        { type: String, default: '' },
    drivingLicense:{ type: String, default: '' },
    collegeIdCard: { type: String, default: '' }
  },

  emergencyContact: { type: String, default: '' },

  permanentOtp:      { type: String },
  permanentOtpSetAt: { type: Date }

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

2ND UPDATE IS ABOVE */

/*const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['provider', 'seeker', 'both', 'admin'],  // Added 'admin'
    required: true 
  },
  college: { 
    type: String, 
    required: function() { 
      return this.role !== 'admin'; 
    } 
  },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  totalRides: { type: Number, default: 0 },
  verified: { 
    email: { type: Boolean, default: false },
    studentId: { type: Boolean, default: false },
    license: { type: Boolean, default: false }
  },
  // Permanent OTP for user (like Rapido/Uber/Ola)
  permanentOtp: { type: String },
  permanentOtpSetAt: { type: Date },
  emergencyContacts: [{
  name: { type: String },
  phone: { type: String },
  relation: { type: String }
}]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);*/