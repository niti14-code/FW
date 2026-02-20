const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pickup: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  drop: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  seatsAvailable: { type: Number, required: true },
  costPerSeat: { type: Number, required: true },
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' }
}, { timestamps: true });

rideSchema.index({ pickup: '2dsphere' });

module.exports = mongoose.model('Ride', rideSchema);