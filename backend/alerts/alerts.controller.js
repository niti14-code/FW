const Alert = require('./alerts.model');
const Ride = require('../rides/rides.model');
const User = require('../users/users.model');

// Create new alert
exports.createAlert = async (req, res) => {
  try {
    const { 
      pickup, drop, pickupRadius, dropRadius,
      date, timeRange, recurringDays,
      notifyEmail, notifyPush, name 
    } = req.body;
    
    const alert = new Alert({
      userId: req.user.userId,
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
    const alerts = await Alert.find({ userId: req.user.userId })
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
      { _id: req.params.id, userId: req.user.userId },
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
      userId: req.user.userId 
    });
    
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json({ message: 'Alert deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Check for matches (internal function)
const checkForMatches = async (alert) => {
  const query = {
    status: 'active',
    seatsAvailable: { $gt: 0 },
    pickup: {
      $near: {
        $geometry: alert.pickup,
        $maxDistance: alert.pickupRadius
      }
    },
    drop: {
      $near: {
        $geometry: alert.drop,
        $maxDistance: alert.dropRadius
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
    // Future rides only
    query.date = { $gte: new Date() };
  }
  
  const matches = await Ride.find(query)
    .populate('providerId', 'name rating')
    .limit(10);
  
  return matches;
};

// Manual check for matches
exports.checkAlertMatches = async (req, res) => {
  try {
    const alert = await Alert.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId 
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
