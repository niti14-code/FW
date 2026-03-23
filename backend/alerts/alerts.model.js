const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  pickup: {
    type:        { type: String, default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  drop: {
    type:        { type: String, default: 'Point' },
    coordinates: { type: [Number], required: true },
  },

  pickupRadius: { type: Number, default: 5000 }, // metres
  dropRadius:   { type: Number, default: 5000 },

  // Time preferences
  date:      { type: Date },
  timeRange: {
    start: { type: String },
    end:   { type: String },
  },
  recurringDays: [{ type: Number, min: 0, max: 6 }],

  // Settings
  isActive:    { type: Boolean, default: true },
  notifyEmail: { type: Boolean, default: true },
  notifyPush:  { type: Boolean, default: true },

  // Stats
  lastNotified: { type: Date },
  matchCount:   { type: Number, default: 0 },

  name: { type: String, trim: true },

}, { timestamps: true }); // ← was missing, caused createdAt issues

alertSchema.index({ userId:   1 });
alertSchema.index({ pickup:   '2dsphere' });
alertSchema.index({ isActive: 1 });

module.exports = mongoose.model('Alert', alertSchema);