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
