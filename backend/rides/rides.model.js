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
  status: { type: String, enum: ['active', 'completed', 'cancelled', 'in-progress'], default: 'active' },
  
  // RECURRING RIDES FIELDS
  isRecurring: { type: Boolean, default: false },
  recurringPattern: {
    frequency: { type: String, enum: ['daily', 'weekly', 'weekdays', 'weekends', 'custom'], default: null },
    daysOfWeek: [{ type: Number, min: 0, max: 6 }], // 0=Sunday, 6=Saturday
    endDate: { type: Date },
    occurrences: { type: Number }, // max number of occurrences
    currentOccurrence: { type: Number, default: 1 }
  },
  parentRideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', default: null }, // for child rides
  recurringGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', default: null }, // groups all recurring instances
  
}, { timestamps: true });

rideSchema.index({ pickup: '2dsphere' });
rideSchema.index({ recurringGroupId: 1 });
rideSchema.index({ parentRideId: 1 });

module.exports = mongoose.model('Ride', rideSchema);