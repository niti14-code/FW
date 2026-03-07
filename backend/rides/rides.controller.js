const Ride = require('./rides.model');
const User = require('../users/users.model');

// Helper: Generate recurring ride instances
const generateRecurringRides = async (baseRide, pattern) => {
  const rides = [];
  const startDate = new Date(baseRide.date);
  let currentDate = new Date(startDate);
  let occurrence = 1;
  
  const maxOccurrences = pattern.occurrences || 30; // default max
  const endDate = pattern.endDate || new Date(currentDate.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days default
  
  const recurringGroupId = baseRide._id;
  
  // Update base ride as parent
  baseRide.recurringGroupId = recurringGroupId;
  await baseRide.save();
  
  while (occurrence < maxOccurrences && currentDate <= endDate) {
    // Calculate next date based on frequency
    let nextDate = new Date(currentDate);
    
    switch (pattern.frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'weekdays':
        // Skip to next weekday
        do {
          nextDate.setDate(nextDate.getDate() + 1);
        } while (nextDate.getDay() === 0 || nextDate.getDay() === 6);
        break;
      case 'weekends':
        // Skip to next weekend day
        do {
          nextDate.setDate(nextDate.getDate() + 1);
        } while (nextDate.getDay() !== 0 && nextDate.getDay() !== 6);
        break;
      case 'custom':
        // Find next day in daysOfWeek array
        const currentDay = nextDate.getDay();
        const sortedDays = pattern.daysOfWeek.sort((a, b) => a - b);
        let nextDay = sortedDays.find(d => d > currentDay);
        if (nextDay === undefined) {
          nextDay = sortedDays[0]; // wrap to next week
          nextDate.setDate(nextDate.getDate() + (7 - currentDay + nextDay));
        } else {
          nextDate.setDate(nextDate.getDate() + (nextDay - currentDay));
        }
        break;
    }
    
    if (nextDate > endDate) break;
    
    occurrence++;
    
    const recurringRide = new Ride({
      providerId: baseRide.providerId,
      pickup: baseRide.pickup,
      drop: baseRide.drop,
      date: nextDate,
      time: baseRide.time,
      seatsAvailable: baseRide.seatsAvailable,
      costPerSeat: baseRide.costPerSeat,
      isRecurring: true,
      recurringPattern: pattern,
      parentRideId: baseRide._id,
      recurringGroupId: recurringGroupId,
      status: 'active'
    });
    
    rides.push(recurringRide);
    currentDate = nextDate;
  }
  
  if (rides.length > 0) {
    await Ride.insertMany(rides);
  }
  
  return rides;
};

exports.createRide = async (req, res) => {
  try {
    const { pickup, drop, date, time, seatsAvailable, costPerSeat, isRecurring, recurringPattern } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (user.role === 'seeker') return res.status(403).json({ message: 'Only providers can create rides' });
    
    const ride = new Ride({
      providerId: req.user.userId,
      pickup: { type: 'Point', coordinates: pickup.coordinates },
      drop: { type: 'Point', coordinates: drop.coordinates },
      date, time, seatsAvailable, costPerSeat,
      isRecurring: isRecurring || false,
      recurringPattern: isRecurring ? recurringPattern : null
    });
    
    await ride.save();
    
    // Generate recurring instances if enabled
    let childRides = [];
    if (isRecurring && recurringPattern) {
      childRides = await generateRecurringRides(ride, recurringPattern);
    }
    
    res.status(201).json({
      message: 'Ride created successfully',
      ride,
      recurringInstances: childRides.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.searchRides = async (req, res) => {
  try {
    const { lat, lng, maxDistance = 5000, date, includeRecurring } = req.query;
    
    const query = {
      pickup: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(maxDistance)
        }
      },
      status: 'active',
      seatsAvailable: { $gt: 0 }
    };
    
    // Exclude child recurring rides by default (only show parent or non-recurring)
    if (includeRecurring !== 'true') {
      query.$or = [
        { isRecurring: false },
        { isRecurring: true, parentRideId: null } // only parent recurring rides
      ];
    }
    
    if (date) {
      const searchDate = new Date(date);
      query.date = { $gte: searchDate, $lt: new Date(searchDate.getTime() + 86400000) };
    }
    
    const rides = await Ride.find(query).populate('providerId', 'name rating');
    res.json(rides);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id).populate('providerId', 'name phone rating');
    
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    
    // If recurring parent, get all instances
    let recurringInstances = [];
    if (ride.isRecurring && !ride.parentRideId) {
      recurringInstances = await Ride.find({ 
        recurringGroupId: ride.recurringGroupId,
        _id: { $ne: ride._id }
      }).sort({ date: 1 }).limit(10);
    }
    
    res.json({
      ride,
      recurringInstances: ride.isRecurring ? recurringInstances : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateRide = async (req, res) => {
  try {
    const { updateRecurringSeries, ...updates } = req.body;
    
    const ride = await Ride.findOne({ _id: req.params.id, providerId: req.user.userId });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    
    // If updating recurring series, update all future instances
    if (updateRecurringSeries && ride.recurringGroupId) {
      const updateData = {};
      if (updates.pickup) updateData.pickup = { type: 'Point', coordinates: updates.pickup.coordinates };
      if (updates.drop) updateData.drop = { type: 'Point', coordinates: updates.drop.coordinates };
      if (updates.time) updateData.time = updates.time;
      if (updates.seatsAvailable) updateData.seatsAvailable = updates.seatsAvailable;
      if (updates.costPerSeat) updateData.costPerSeat = updates.costPerSeat;
      
      await Ride.updateMany(
        { 
          recurringGroupId: ride.recurringGroupId,
          date: { $gte: ride.date }
        },
        updateData
      );
    }
    
    const updated = await Ride.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteRide = async (req, res) => {
  try {
    const { deleteSeries } = req.body;
    const ride = await Ride.findOne({ _id: req.params.id, providerId: req.user.userId });
    
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    
    // Delete entire recurring series
    if (deleteSeries && ride.recurringGroupId) {
      await Ride.deleteMany({ recurringGroupId: ride.recurringGroupId });
      return res.json({ message: 'Recurring ride series deleted' });
    }
    
    // Delete single ride
    await Ride.findByIdAndDelete(req.params.id);
    res.json({ message: 'Ride deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyRides = async (req, res) => {
  try {
    const { includeRecurring } = req.query;
    
    let query = { providerId: req.user.userId };
    
    // Exclude child recurring rides by default
    if (includeRecurring !== 'true') {
      query.$or = [
        { isRecurring: false },
        { isRecurring: true, parentRideId: null }
      ];
    }
    
    const rides = await Ride.find(query).sort({ createdAt: -1 });
    res.json(rides);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all recurring instances for a ride
exports.getRecurringInstances = async (req, res) => {
  try {
    const { rideId } = req.params;
    
    const ride = await Ride.findById(rideId);
    if (!ride || !ride.recurringGroupId) {
      return res.status(404).json({ message: 'Recurring ride not found' });
    }
    
    const instances = await Ride.find({ recurringGroupId: ride.recurringGroupId })
      .sort({ date: 1 })
      .populate('providerId', 'name rating');
    
    res.json(instances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Start ride (provider)
exports.startRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    
    const ride = await Ride.findOne({ _id: rideId, providerId: req.user.userId });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    
    if (ride.status !== 'active') {
      return res.status(400).json({ message: 'Ride cannot be started' });
    }
    
    // Check if there are accepted bookings
    const Booking = require('../bookings/bookings.model');
    const acceptedBookings = await Booking.countDocuments({
      rideId: ride._id,
      status: 'accepted'
    });
    
    if (acceptedBookings === 0) {
      return res.status(400).json({ message: 'No accepted bookings for this ride' });
    }
    
    ride.status = 'in-progress';
    ride.startedAt = new Date();
    await ride.save();
    
    // Notify all accepted seekers via socket
    const io = req.app.get('io');
    io.to(`ride-${rideId}`).emit('rideStarted', {
      rideId,
      status: 'in-progress',
      startedAt: ride.startedAt
    });
    
    res.json({ message: 'Ride started', ride });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Complete ride (provider)
exports.completeRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    
    const ride = await Ride.findOne({ _id: rideId, providerId: req.user.userId });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    
    if (ride.status !== 'in-progress') {
      return res.status(400).json({ message: 'Ride is not in progress' });
    }
    
    ride.status = 'completed';
    ride.completedAt = new Date();
    await ride.save();
    
    // Update provider stats
    const user = await User.findById(req.user.userId);
    user.totalRides = (user.totalRides || 0) + 1;
    await user.save();
    
    // Notify all participants
    const io = req.app.get('io');
    io.to(`ride-${rideId}`).emit('rideCompleted', {
      rideId,
      status: 'completed',
      completedAt: ride.completedAt
    });
    
    res.json({ message: 'Ride completed', ride });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cancel ride (provider or admin)
exports.cancelRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { reason } = req.body;
    
    const ride = await Ride.findOne({ 
      _id: rideId, 
      providerId: req.user.userId 
    });
    
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    
    if (ride.status === 'completed' || ride.status === 'cancelled') {
      return res.status(400).json({ message: 'Ride already finished' });
    }
    
    ride.status = 'cancelled';
    ride.cancelledAt = new Date();
    ride.cancelReason = reason;
    await ride.save();
    
    // Refund seats to all pending/accepted bookings
    const Booking = require('../bookings/bookings.model');
    const bookings = await Booking.find({ 
      rideId: ride._id,
      status: { $in: ['pending', 'accepted'] }
    });
    
    for (const booking of bookings) {
      booking.status = 'cancelled';
      await booking.save();
      
      // Notify seeker
      // TODO: Send notification
    }
    
    // Notify via socket
    const io = req.app.get('io');
    io.to(`ride-${rideId}`).emit('rideCancelled', {
      rideId,
      status: 'cancelled',
      reason
    });
    
    res.json({ message: 'Ride cancelled', ride });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get ride status with participants
exports.getRideStatus = async (req, res) => {
  try {
    const { rideId } = req.params;
    
    const ride = await Ride.findById(rideId)
      .populate('providerId', 'name phone rating');
    
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    
    // Get all bookings
    const Booking = require('../bookings/bookings.model');
    const bookings = await Booking.find({ rideId })
      .populate('seekerId', 'name phone rating');
    
    // Get tracking if active
    const Tracking = require('../tracking/tracking.model');
    const tracking = await Tracking.findOne({ rideId });
    
    res.json({
      ride,
      participants: {
        provider: ride.providerId,
        seekers: bookings.filter(b => b.status === 'accepted').map(b => b.seekerId)
      },
      bookings: bookings.map(b => ({
        id: b._id,
        status: b.status,
        seeker: b.seekerId,
        createdAt: b.createdAt
      })),
      tracking: tracking ? {
        status: tracking.status,
        lastLocation: tracking.locations[tracking.locations.length - 1],
        totalLocations: tracking.locations.length
      } : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};