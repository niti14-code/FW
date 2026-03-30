const Alert = require('./alerts.model');
const Ride = require('../rides/rides.model');
const User = require('../users/users.model');
const Notification = require('../notifications/notifications.model');

// Create new alert
exports.createAlert = async (req, res) => {
  try {
    const { 
      pickup, drop, pickupRadius, dropRadius,
      date, timeRange, recurringDays,
      notifyEmail, notifyPush, name 
    } = req.body;
    
    const alert = new Alert({
      userId: req.user.userId|| req.user.id,
      pickup: { type: 'Point', coordinates: pickup.coordinates },
      drop: { type: 'Point', coordinates: drop.coordinates },
      pickupRadius: pickupRadius || 5000,
      dropRadius: dropRadius || 5000,
      date,
      timeRange,
      recurringDays,
      notifyEmail: notifyEmail !== false,
      notifyPush: notifyPush !== false,
      name
    });
    
    await alert.save();
    
    // Check for immediate matches
    const matches = await checkForMatches(alert);
    
    res.status(201).json({
      message: 'Alert created successfully',
      alert,
      immediateMatches: matches.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user's alerts
exports.getMyAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({ userId: req.user.userId|| req.user.id })
      .sort({ createdAt: -1 });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update alert
exports.updateAlert = async (req, res) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId|| req.user.id },
      req.body,
      { new: true }
    );
    
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete alert
exports.deleteAlert = async (req, res) => {
  try {
    const alert = await Alert.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user.userId|| req.user.id 
    });
    
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json({ message: 'Alert deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Check for matches (internal function) - FIXED
const checkForMatches = async (alert) => {
  try {
    // Use $geoNear for pickup (primary) and $geoWithin for drop (secondary)
    // OR use $and with distance calculation
    
    // Option 1: Use pickup as primary geo search, filter drop by manual distance
    const query = {
      status: 'active',
      seatsAvailable: { $gt: 0 },
      pickup: {
        $near: {
          $geometry: alert.pickup,
          $maxDistance: alert.pickupRadius
        }
      }
    };
    
    // Date filter
    if (alert.date) {
      const searchDate = new Date(alert.date);
      query.date = { 
        $gte: searchDate, 
        $lt: new Date(searchDate.getTime() + 86400000) 
      };
    } else {
      query.date = { $gte: new Date() };
    }
    
    // First get rides near pickup
    let rides = await Ride.find(query)
      .populate('providerId', 'name rating')
      .limit(50);
    
    // Manually filter by drop distance (since we can't use two $near)
    rides = rides.filter(ride => {
      if (!ride.drop || !ride.drop.coordinates) return false;
      
      const dropLng = ride.drop.coordinates[0];
      const dropLat = ride.drop.coordinates[1];
      const alertDropLng = alert.drop.coordinates[0];
      const alertDropLat = alert.drop.coordinates[1];
      
      // Calculate distance using Haversine formula
      const distance = calculateDistance(dropLat, dropLng, alertDropLng, alertDropLng);
      return distance <= alert.dropRadius;
    });
    
    // Time range filter if specified
    if (alert.timeRange && alert.timeRange.start && alert.timeRange.end) {
      rides = rides.filter(ride => {
        return ride.time >= alert.timeRange.start && ride.time <= alert.timeRange.end;
      });
    }
    
    return rides;
  } catch (error) {
    console.error('Error in checkForMatches:', error);
    throw error;
  }
};

// Helper: Calculate distance between two points in meters (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

// Manual check for matches
exports.checkAlertMatches = async (req, res) => {
  try {
    const alert = await Alert.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId|| req.user.id 
    });
    
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    
    const matches = await checkForMatches(alert);
    
    // Update last notified
    alert.lastNotified = new Date();
    alert.matchCount += matches.length;
    await alert.save();
    
    res.json({
      alert,
      matches
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Background job: Check all active alerts (call this periodically)
exports.processAllAlerts = async () => {
  try {
    const activeAlerts = await Alert.find({ isActive: true });
    
    for (const alert of activeAlerts) {
      // Skip if notified in last hour
      if (alert.lastNotified && 
          (new Date() - alert.lastNotified) < 3600000) {
        continue;
      }
      
      const matches = await checkForMatches(alert);
      
      if (matches.length > 0) {
        // TODO: Send notification to user
        console.log(`Found ${matches.length} matches for alert ${alert._id}`);
        
        alert.lastNotified = new Date();
        alert.matchCount += matches.length;
        await alert.save();
      }
    }
    
    return { processed: activeAlerts.length };
  } catch (error) {
    console.error('Alert processing error:', error);
    throw error;
  }
};

// NEW: Check for low availability and notify matching alerts
exports.checkLowAvailabilityAndNotify = async (ride, remainingSeats) => {
  try {
    if (remainingSeats > 2) return; // Only notify when 2 or fewer seats left
    
    // Find all active alerts that match this ride's route
    const matchingAlerts = await Alert.find({
      isActive: true,
      $and: [
        {
          pickup: {
            $near: {
              $geometry: ride.pickup,
              $maxDistance: 10000 // 10km radius for alert matching
            }
          }
        },
        {
          date: {
            $gte: new Date(ride.date.setHours(0,0,0,0)),
            $lt: new Date(ride.date.setHours(23,59,59,999))
          }
        }
      ]
    }).populate('userId', 'name email fcmToken');
    
    // Filter by drop distance manually
    const alertsToNotify = matchingAlerts.filter(alert => {
      if (!alert.drop || !alert.drop.coordinates) return false;
      const distance = calculateDistance(
        ride.drop.coordinates[1], ride.drop.coordinates[0],
        alert.drop.coordinates[1], alert.drop.coordinates[0]
      );
      return distance <= alert.dropRadius;
    });
    
    // Create urgent notifications for each matching alert
    const notifications = [];
    for (const alert of alertsToNotify) {
      const notification = new Notification({
        userId: alert.userId._id,
        userType: alert.userId.role === 'provider' ? 'provider' : 'seeker',
        type: 'URGENT_AVAILABILITY',
        title: `Only ${remainingSeats} seat${remainingSeats > 1 ? 's' : ''} left! 🔥`,
        body: `Hurry! Ride from ${ride.pickup.name || 'pickup'} to ${ride.drop.name || 'drop'} has only ${remainingSeats} seat${remainingSeats > 1 ? 's' : ''} remaining. Book now!`,
        data: {
          rideId: ride._id,
          remainingSeats,
          urgency: 'critical',
          pickup: ride.pickup,
          drop: ride.drop
        },
        priority: 'critical',
        channels: alert.notifyPush ? ['push', 'in_app'] : ['in_app'],
        expiresAt: new Date(Date.now() + 3600000) // Expires in 1 hour
      });
      
      await notification.save();
      notifications.push(notification);
      
      // Send real-time socket notification if user is online
      const io = global.io;
      if (io) {
        io.to(`user-${alert.userId._id}`).emit('urgent-availability', {
          notification: notification.toObject(),
          ride: {
            _id: ride._id,
            pickup: ride.pickup,
            drop: ride.drop,
            date: ride.date,
            time: ride.time,
            price: ride.price,
            seatsAvailable: remainingSeats,
            provider: ride.providerId
          }
        });
      }
    }
    
    console.log(`[URGENT] Sent ${notifications.length} low availability notifications for ride ${ride._id}`);
    return notifications;
  } catch (error) {
    console.error('Error in checkLowAvailabilityAndNotify:', error);
    throw error;
  }
};