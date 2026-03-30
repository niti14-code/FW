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

  // Ratings aggregate (updated by ratings controller)
  rating:        { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  totalRatings:  { type: Number, default: 0 },

  totalRides: { type: Number, default: 0 },
  suspended:  { type: Boolean, default: false },

  // KYC fields - updated for new flow
  kycStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'not_submitted', 'not_required'],
    default: 'not_submitted'
  },
  kycDocuments: {
    aadhar:         String,
    drivingLicense: String,
    collegeIdCard:  String,
    selfie:         String      // Added for selfie verification
  },
  kycSubmittedAt:   { type: Date },      // Added: track submission time
  kycVerifiedAt:    { type: Date },      // Added: track verification time
  kycRemarks:       { type: String },    // Added: admin rejection reason
  
  emergencyContact: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);