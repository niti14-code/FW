// backend/notifications/notifications.model.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userType: {
    type: String,
    enum: ['seeker', 'provider', 'admin'],
    required: true
  },
  
  type: {
    type: String,
    enum: [
      'BOOKING_REQUEST',
      'BOOKING_CONFIRMED',
      'BOOKING_CANCELLED',
      'URGENT_AVAILABILITY',
      'ROUTE_MATCH'
    ],
    required: true
  },
  
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  channels: [{
    type: String,
    enum: ['push', 'email', 'sms', 'in_app', 'socket']
  }],
  
  readAt: {
    type: Date,
    default: null
  },
  
  priority: {
    type: String,
    enum: ['critical', 'high', 'normal', 'low'],
    default: 'normal'
  },
  
  expiresAt: {
    type: Date,
    default: null
  }
  
}, { 
  timestamps: true 
});

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1 });

module.exports = mongoose.model('Notification', notificationSchema);