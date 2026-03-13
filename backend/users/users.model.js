const mongoose = require('mongoose');

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

module.exports = mongoose.model('User', userSchema);