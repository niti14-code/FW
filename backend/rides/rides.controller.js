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
    
    // Role validation: Only 'provider' or 'both' can create rides
    if (!user || (user.role !== 'provider' && user.role !== 'both')) {
      return res.status(403).json({ 
        message: 'Access denied: Only providers can create rides',
        requiredRole: ['provider', 'both'],
        currentRole: user?.role || 'unknown'
      });
    }
    // 🚨 KYC CHECK (VERY IMPORTANT)
    if (user.kycStatus !== 'approved') {
     return res.status(403).json({
       message: 'KYC not approved. Please complete verification before creating rides.'
     });
}
    
    // FIX: Properly check if recurring
    const shouldRecur = isRecurring === true || isRecurring === 'true';
    
    const ride = new Ride({
      providerId: req.user.userId,
      pickup: {
        type: 'Point',
        coordinates: pickup.coordinates,
        address: pickup.address || '',   // human-readable name from frontend
      },
      drop: {
        type: 'Point',
        coordinates: drop.coordinates,
        address: drop.address || '',
      },
      date, 
      time, 
      seatsAvailable, 
      costPerSeat,
      isRecurring: shouldRecur,
      recurringPattern: shouldRecur ? recurringPattern : null
    });
    
    await ride.save();
    
    // Generate recurring instances if enabled
    let childRides = [];
    if (shouldRecur && recurringPattern) {
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
    
    const user = await User.findById(req.user.userId);
    
    // Role validation: Only 'seeker' or 'both' can search rides
    if (!user || (user.role !== 'seeker' && user.role !== 'both')) {
      return res.status(403).json({ 
        message: 'Access denied: Only seekers can search rides',
        requiredRole: ['seeker', 'both'],
        currentRole: user?.role || 'unknown'
      });
    }
    
    const query = {
      pickup: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(maxDistance)
        }
      },
      status: { $in: ['active', 'in-progress'] },
      seatsAvailable: { $gt: 0 }
    };
    
    // Exclude child recurring rides by default (only show parent or non-recurring)
    if (includeRecurring !== 'true') {
      query.$or = [
        { isRecurring: false },
        { isRecurring: true, parentRideId: null }
      ];
    }
    
    if (date) {
      // Search the full selected day regardless of time
      const searchDate = new Date(date);
      searchDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(searchDate.getTime() + 86400000);
      query.date = { $gte: searchDate, $lt: nextDay };
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
    
    const user = await User.findById(req.user.userId);
    
    // Role validation: Only 'provider' or 'both' can view their posted rides
    if (!user || (user.role !== 'provider' && user.role !== 'both')) {
      return res.status(403).json({ 
        message: 'Access denied: Only providers can view their posted rides',
        requiredRole: ['provider', 'both'],
        currentRole: user?.role || 'unknown'
      });
    }
    
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

    // ── Scheduled-time guard ──────────────────────────────────────
    if (ride.date && ride.time) {
      const [hours, minutes] = ride.time.split(':').map(Number);
      const scheduled = new Date(ride.date);
      scheduled.setHours(hours, minutes, 0, 0);
      const EARLY_WINDOW_MS = 15 * 60 * 1000;
      const now = new Date();
      if (now < scheduled - EARLY_WINDOW_MS) {
        const diffMins = Math.ceil((scheduled - now) / 60000);
        return res.status(400).json({
          message: `Ride is scheduled for ${ride.time}. You can start up to 15 minutes early. Please wait ${diffMins} more minute${diffMins !== 1 ? 's' : ''}.`,
          scheduledTime: scheduled.toISOString(),
          minutesUntilAllowed: diffMins,
        });
      }
    }
    // ─────────────────────────────────────────────────────────────
    
    // Check if there are accepted bookings
    const Booking = require('../bookings/bookings.model');
    const acceptedBookings = await Booking.countDocuments({
      rideId: ride._id,
      status: 'accepted'
    });
    
    if (acceptedBookings === 0) {
      return res.status(400).json({ message: 'No accepted bookings for this ride' });
    }
    
    // Require OTP verification before starting ride (seeker provides OTP to provider)
    if (!ride.isOtpVerified) {
      return res.status(400).json({ 
        message: 'OTP verification required before starting ride. Please request OTP from passengers and verify it first.',
        requiresOtp: true
      });
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
    
    res.json({ message: 'Ride started successfully', ride });
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
// ── PRE-RIDE SAFETY CHECKLIST ──────────────────────────────────────
exports.submitChecklist = async (req, res) => {
  try {
    const ride = await require('./rides.model').findOne({ _id: req.params.rideId, providerId: req.user.userId });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    ride.preRideChecklist = { ...req.body, completedAt: new Date() };
    await ride.save();
    res.json({ message: 'Checklist saved', ride });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── PASSENGER PICKED UP → in-progress ─────────────────────────────
exports.pickupPassenger = async (req, res) => {
  try {
    const ride = await require('./rides.model').findOne({ _id: req.params.rideId, providerId: req.user.userId });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'active' && ride.status !== 'in-progress')
      return res.status(400).json({ message: 'Ride cannot be updated' });

    // ── Scheduled-time guard ──────────────────────────────────────
    // Build the scheduled datetime from ride.date + ride.time (e.g. "10:35")
    if (ride.date && ride.time) {
      const [hours, minutes] = ride.time.split(':').map(Number);
      const scheduled = new Date(ride.date);
      scheduled.setHours(hours, minutes, 0, 0);

      // Allow a 15-minute early window (provider arriving slightly early is fine)
      const EARLY_WINDOW_MS = 15 * 60 * 1000;
      const now = new Date();

      if (now < scheduled - EARLY_WINDOW_MS) {
        const diffMins = Math.ceil((scheduled - now) / 60000);
        return res.status(400).json({
          message: `Ride is scheduled for ${ride.time}. You can start it up to 15 minutes before the scheduled time. Please wait ${diffMins} more minute${diffMins !== 1 ? 's' : ''}.`,
          scheduledTime: scheduled.toISOString(),
          minutesUntilAllowed: diffMins,
        });
      }
    }
    // ─────────────────────────────────────────────────────────────

    ride.status = 'in-progress';
    ride.passengerPickedUpAt = new Date();
    await ride.save();
    const io = req.app.get('io');
    if (io) io.to(`ride-${ride._id}`).emit('passengerPickedUp', { rideId: ride._id, status: 'in-progress' });
    res.json({ message: 'Passenger picked up — trip in progress', ride });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── PASSENGER DROPPED → completed ─────────────────────────────────
exports.dropPassenger = async (req, res) => {
  try {
    const Ride = require('./rides.model');
    const ride = await Ride.findOne({ _id: req.params.rideId, providerId: req.user.userId });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'in-progress')
      return res.status(400).json({ message: 'Ride is not in progress' });
    ride.status = 'completed';
    ride.passengerDroppedAt = new Date();
    ride.completedAt = new Date();
    await ride.save();
    const User = require('../users/users.model');
    const user = await User.findById(req.user.userId);
    if (user) { user.totalRides = (user.totalRides || 0) + 1; await user.save(); }
    const io = req.app.get('io');
    if (io) io.to(`ride-${ride._id}`).emit('passengerDropped', { rideId: ride._id, status: 'completed' });
    res.json({ message: 'Passenger dropped — trip completed', ride });
  } catch (err) { res.status(500).json({ message: err.message }); }
};


// ── REQUEST OTP FROM SEEKER ───────────────────────────────────────
exports.requestOtpFromSeeker = async (req, res) => {
  try {
    const { rideId } = req.params;
    const User = require('../users/users.model');
    
    const ride = await Ride.findOne({ _id: rideId, providerId: req.user.userId });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    
    if (ride.status !== 'active') {
      return res.status(400).json({ message: 'Can only request OTP for active rides' });
    }
    
    // Get accepted bookings to find seekers
    const Booking = require('../bookings/bookings.model');
    const acceptedBookings = await Booking.find({ 
      rideId: ride._id, 
      status: 'accepted' 
    }).populate('seekerId', 'name phone');
    
    if (acceptedBookings.length === 0) {
      return res.status(400).json({ message: 'No accepted bookings for this ride' });
    }
    
    // Generate OTP for this specific ride (not permanent)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Update ride with OTP
    ride.otp = otp;
    ride.otpGeneratedAt = new Date();
    ride.isOtpVerified = false;
    ride.otpVerifiedAt = null;
    await ride.save();
    
    // Send OTP to seekers (in real app, this would be SMS)
    const io = req.app.get('io');
    acceptedBookings.forEach(booking => {
      io.to(`user-${booking.seekerId._id}`).emit('otpRequested', {
        rideId: ride._id,
        otp: otp,
        providerName: req.user.name,
        pickupLocation: ride.pickup,
        message: `Provider requested OTP. Your OTP is: ${otp}`
      });
    });
    
    res.json({ 
      message: 'OTP sent to accepted passengers',
      otp: otp, // Only for development - remove in production
      otpGeneratedAt: ride.otpGeneratedAt,
      passengersNotified: acceptedBookings.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── VERIFY OTP FROM SEEKER ───────────────────────────────────────
exports.verifyOtpFromSeeker = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { otp } = req.body;
    
    const ride = await Ride.findOne({ _id: rideId, providerId: req.user.userId });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    
    if (!ride.otp) {
      return res.status(400).json({ message: 'No OTP requested for this ride' });
    }
    
    if (ride.isOtpVerified) {
      return res.status(400).json({ message: 'OTP already verified for this ride' });
    }
    
    // Check if OTP is expired (5 minutes)
    const otpAge = Date.now() - new Date(ride.otpGeneratedAt).getTime();
    if (otpAge > 5 * 60 * 1000) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new OTP.' });
    }
    
    if (ride.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    // Mark OTP as verified
    ride.isOtpVerified = true;
    ride.otpVerifiedAt = new Date();
    await ride.save();
    
    // Notify all parties
    const io = req.app.get('io');
    io.emit('otpVerified', {
      rideId: ride._id,
      verifiedAt: ride.otpVerifiedAt,
      message: 'OTP verified successfully. Ride can now start.'
    });
    
    res.json({ 
      message: 'OTP verified successfully! You can now start the ride.',
      verifiedAt: ride.otpVerifiedAt
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── VERIFY OTP FOR RIDE ───────────────────────────────────────────
exports.verifyOtp = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { otp } = req.body;
    const User = require('../users/users.model');
    
    const ride = await Ride.findOne({ _id: rideId, providerId: req.user.userId });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    
    // Get user's permanent OTP
    const user = await User.findById(req.user.userId);
    const permanentOtp = user.permanentOtp;
    
    if (!permanentOtp) {
      return res.status(400).json({ message: 'No permanent OTP set for this user' });
    }
    
    if (ride.isOtpVerified) {
      return res.status(400).json({ message: 'OTP already verified for this ride' });
    }
    
    // For permanent OTP, we don't check expiration - it's always valid
    if (permanentOtp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP. Use your permanent OTP.' });
    }
    
    // Mark OTP as verified
    ride.otp = permanentOtp;
    ride.isOtpVerified = true;
    ride.otpVerifiedAt = new Date();
    await ride.save();
    
    // Notify all parties
    const io = req.app.get('io');
    io.emit('otpVerified', {
      rideId: ride._id,
      verifiedAt: ride.otpVerifiedAt,
      message: 'Permanent OTP verified successfully. Ride can now start.'
    });
    
    res.json({ 
      message: 'Permanent OTP verified successfully! You can now start the ride.',
      verifiedAt: ride.otpVerifiedAt,
      isPermanentOtp: true
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET OTP STATUS ───────────────────────────────────────────
exports.getOtpStatus = async (req, res) => {
  try {
    const { rideId } = req.params;
    const User = require('../users/users.model');
    
    const ride = await Ride.findOne({ _id: rideId, providerId: req.user.userId })
      .select('otp otpGeneratedAt otpVerifiedAt isOtpVerified status');
    
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    
    // Get user's permanent OTP info
    const user = await User.findById(req.user.userId).select('permanentOtp permanentOtpSetAt');
    
    const response = {
      hasOtp: !!ride.otp,
      isOtpVerified: ride.isOtpVerified,
      otpGeneratedAt: ride.otpGeneratedAt,
      otpVerifiedAt: ride.otpVerifiedAt,
      status: ride.status,
      isPermanentOtp: !!user.permanentOtp,
      permanentOtpSetAt: user.permanentOtpSetAt
    };
    
    // For permanent OTP, no expiration check
    if (ride.otp && !ride.isOtpVerified && !user.permanentOtp) {
      const otpAge = Date.now() - new Date(ride.otpGeneratedAt).getTime();
      response.isExpired = otpAge > 5 * 60 * 1000;
    }
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── NO MATCH SUGGEST ───────────────────────────────────────────────
exports.noMatchSuggest = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    res.json({
      message: 'No rides found near your location',
      suggestions: [
        { action: 'subscribe_alert', label: 'Get notified when a ride is posted on this route', endpoint: 'POST /alerts' },
        { action: 'post_request',   label: 'Post a ride request so providers can see your need', endpoint: 'POST /alerts/ride-request' }
      ],
      searchedAt: new Date(), lat, lng
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
// ── GENERATE OTP (alias for requestOtpFromSeeker) ─────────────────
exports.generateOtp = async (req, res) => {
  // You can either call the existing function or implement new logic
  return exports.requestOtpFromSeeker(req, res);
};

// ── BACKFILL ADDRESSES for existing rides (run once from Postman) ──
// POST /api/ride/admin/backfill-addresses  (requires auth)
// Finds all rides with no pickup/drop address and reverse-geocodes them.
exports.backfillAddresses = async (req, res) => {
  try {
    const rides = await Ride.find({
      $or: [
        { 'pickup.address': { $in: [null, ''] } },
        { 'drop.address':   { $in: [null, ''] } },
      ]
    });

    if (rides.length === 0) {
      return res.json({ message: 'All rides already have addresses', updated: 0 });
    }

    async function geocode(lng, lat) {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
        const resp = await fetch(url, {
          headers: { 'Accept-Language': 'en', 'User-Agent': 'CampusRide/1.0' }
        });
        const d = await resp.json();
        const a = d.address || {};
        // Prefer the most specific name available
        return (
          a.amenity || a.building || a.neighbourhood || a.suburb ||
          a.village || a.city_district || a.city || a.town ||
          d.display_name?.split(',')[0] ||
          `${lat.toFixed(4)}°N ${lng.toFixed(4)}°E`
        );
      } catch {
        return `${lat.toFixed(4)}°N ${lng.toFixed(4)}°E`;
      }
    }

    let updated = 0;
    for (const ride of rides) {
      let changed = false;
      if (!ride.pickup.address?.trim() && ride.pickup.coordinates?.length === 2) {
        const [lng, lat] = ride.pickup.coordinates;
        ride.pickup.address = await geocode(lng, lat);
        changed = true;
        await new Promise(r => setTimeout(r, 1100)); // Nominatim: max 1 req/sec
      }
      if (!ride.drop.address?.trim() && ride.drop.coordinates?.length === 2) {
        const [lng, lat] = ride.drop.coordinates;
        ride.drop.address = await geocode(lng, lat);
        changed = true;
        await new Promise(r => setTimeout(r, 1100));
      }
      if (changed) {
        await ride.save();
        updated++;
        console.log(`✅ Ride ${ride._id}: "${ride.pickup.address}" → "${ride.drop.address}"`);
      }
    }

    res.json({ message: `Backfilled ${updated} ride(s)`, updated });
  } catch (err) {
    console.error('backfillAddresses error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/*const Ride = require('./rides.model');
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
    
    // Role validation: Only 'provider' or 'both' can create rides
    if (!user || (user.role !== 'provider' && user.role !== 'both')) {
      return res.status(403).json({ 
        message: 'Access denied: Only providers can create rides',
        requiredRole: ['provider', 'both'],
        currentRole: user?.role || 'unknown'
      });
    }
    // 🚨 KYC CHECK (VERY IMPORTANT)
    if (user.kycStatus !== 'approved') {
     return res.status(403).json({
       message: 'KYC not approved. Please complete verification before creating rides.'
     });
}
    
    // FIX: Properly check if recurring
    const shouldRecur = isRecurring === true || isRecurring === 'true';
    
    const ride = new Ride({
      providerId: req.user.userId,
      pickup: { type: 'Point', coordinates: pickup.coordinates },
      drop: { type: 'Point', coordinates: drop.coordinates },
      date, 
      time, 
      seatsAvailable, 
      costPerSeat,
      isRecurring: shouldRecur,
      recurringPattern: shouldRecur ? recurringPattern : null
    });
    
    await ride.save();
    
    // Generate recurring instances if enabled
    let childRides = [];
    if (shouldRecur && recurringPattern) {
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
    
    const user = await User.findById(req.user.userId);
    
    // Role validation: Only 'seeker' or 'both' can search rides
    if (!user || (user.role !== 'seeker' && user.role !== 'both')) {
      return res.status(403).json({ 
        message: 'Access denied: Only seekers can search rides',
        requiredRole: ['seeker', 'both'],
        currentRole: user?.role || 'unknown'
      });
    }
    
    const query = {
      pickup: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(maxDistance)
        }
      },
      status: { $in: ['active', 'in-progress'] },
      seatsAvailable: { $gt: 0 }
    };
    
    // Exclude child recurring rides by default (only show parent or non-recurring)
    if (includeRecurring !== 'true') {
      query.$or = [
        { isRecurring: false },
        { isRecurring: true, parentRideId: null }
      ];
    }
    
    if (date) {
      // Search the full selected day regardless of time
      const searchDate = new Date(date);
      searchDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(searchDate.getTime() + 86400000);
      query.date = { $gte: searchDate, $lt: nextDay };
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
    
    const user = await User.findById(req.user.userId);
    
    // Role validation: Only 'provider' or 'both' can view their posted rides
    if (!user || (user.role !== 'provider' && user.role !== 'both')) {
      return res.status(403).json({ 
        message: 'Access denied: Only providers can view their posted rides',
        requiredRole: ['provider', 'both'],
        currentRole: user?.role || 'unknown'
      });
    }
    
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
    
    // Require OTP verification before starting ride (seeker provides OTP to provider)
    if (!ride.isOtpVerified) {
      return res.status(400).json({ 
        message: 'OTP verification required before starting ride. Please request OTP from passengers and verify it first.',
        requiresOtp: true
      });
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
    
    res.json({ message: 'Ride started successfully', ride });
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
// ── PRE-RIDE SAFETY CHECKLIST ──────────────────────────────────────
exports.submitChecklist = async (req, res) => {
  try {
    const ride = await require('./rides.model').findOne({ _id: req.params.rideId, providerId: req.user.userId });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    ride.preRideChecklist = { ...req.body, completedAt: new Date() };
    await ride.save();
    res.json({ message: 'Checklist saved', ride });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── PASSENGER PICKED UP → in-progress ─────────────────────────────
exports.pickupPassenger = async (req, res) => {
  try {
    const ride = await require('./rides.model').findOne({ _id: req.params.rideId, providerId: req.user.userId });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'active' && ride.status !== 'in-progress')
      return res.status(400).json({ message: 'Ride cannot be updated' });
    ride.status = 'in-progress';
    ride.passengerPickedUpAt = new Date();
    await ride.save();
    const io = req.app.get('io');
    if (io) io.to(`ride-${ride._id}`).emit('passengerPickedUp', { rideId: ride._id, status: 'in-progress' });
    res.json({ message: 'Passenger picked up — trip in progress', ride });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── PASSENGER DROPPED → completed ─────────────────────────────────
exports.dropPassenger = async (req, res) => {
  try {
    const Ride = require('./rides.model');
    const ride = await Ride.findOne({ _id: req.params.rideId, providerId: req.user.userId });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'in-progress')
      return res.status(400).json({ message: 'Ride is not in progress' });
    ride.status = 'completed';
    ride.passengerDroppedAt = new Date();
    ride.completedAt = new Date();
    await ride.save();
    const User = require('../users/users.model');
    const user = await User.findById(req.user.userId);
    if (user) { user.totalRides = (user.totalRides || 0) + 1; await user.save(); }
    const io = req.app.get('io');
    if (io) io.to(`ride-${ride._id}`).emit('passengerDropped', { rideId: ride._id, status: 'completed' });
    res.json({ message: 'Passenger dropped — trip completed', ride });
  } catch (err) { res.status(500).json({ message: err.message }); }
};


// ── REQUEST OTP FROM SEEKER ───────────────────────────────────────
exports.requestOtpFromSeeker = async (req, res) => {
  try {
    const { rideId } = req.params;
    const User = require('../users/users.model');
    
    const ride = await Ride.findOne({ _id: rideId, providerId: req.user.userId });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    
    if (ride.status !== 'active') {
      return res.status(400).json({ message: 'Can only request OTP for active rides' });
    }
    
    // Get accepted bookings to find seekers
    const Booking = require('../bookings/bookings.model');
    const acceptedBookings = await Booking.find({ 
      rideId: ride._id, 
      status: 'accepted' 
    }).populate('seekerId', 'name phone');
    
    if (acceptedBookings.length === 0) {
      return res.status(400).json({ message: 'No accepted bookings for this ride' });
    }
    
    // Generate OTP for this specific ride (not permanent)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Update ride with OTP
    ride.otp = otp;
    ride.otpGeneratedAt = new Date();
    ride.isOtpVerified = false;
    ride.otpVerifiedAt = null;
    await ride.save();
    
    // Send OTP to seekers (in real app, this would be SMS)
    const io = req.app.get('io');
    acceptedBookings.forEach(booking => {
      io.to(`user-${booking.seekerId._id}`).emit('otpRequested', {
        rideId: ride._id,
        otp: otp,
        providerName: req.user.name,
        pickupLocation: ride.pickup,
        message: `Provider requested OTP. Your OTP is: ${otp}`
      });
    });
    
    res.json({ 
      message: 'OTP sent to accepted passengers',
      otp: otp, // Only for development - remove in production
      otpGeneratedAt: ride.otpGeneratedAt,
      passengersNotified: acceptedBookings.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── VERIFY OTP FROM SEEKER ───────────────────────────────────────
exports.verifyOtpFromSeeker = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { otp } = req.body;
    
    const ride = await Ride.findOne({ _id: rideId, providerId: req.user.userId });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    
    if (!ride.otp) {
      return res.status(400).json({ message: 'No OTP requested for this ride' });
    }
    
    if (ride.isOtpVerified) {
      return res.status(400).json({ message: 'OTP already verified for this ride' });
    }
    
    // Check if OTP is expired (5 minutes)
    const otpAge = Date.now() - new Date(ride.otpGeneratedAt).getTime();
    if (otpAge > 5 * 60 * 1000) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new OTP.' });
    }
    
    if (ride.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    // Mark OTP as verified
    ride.isOtpVerified = true;
    ride.otpVerifiedAt = new Date();
    await ride.save();
    
    // Notify all parties
    const io = req.app.get('io');
    io.emit('otpVerified', {
      rideId: ride._id,
      verifiedAt: ride.otpVerifiedAt,
      message: 'OTP verified successfully. Ride can now start.'
    });
    
    res.json({ 
      message: 'OTP verified successfully! You can now start the ride.',
      verifiedAt: ride.otpVerifiedAt
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── VERIFY OTP FOR RIDE ───────────────────────────────────────────
exports.verifyOtp = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { otp } = req.body;
    const User = require('../users/users.model');
    
    const ride = await Ride.findOne({ _id: rideId, providerId: req.user.userId });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    
    // Get user's permanent OTP
    const user = await User.findById(req.user.userId);
    const permanentOtp = user.permanentOtp;
    
    if (!permanentOtp) {
      return res.status(400).json({ message: 'No permanent OTP set for this user' });
    }
    
    if (ride.isOtpVerified) {
      return res.status(400).json({ message: 'OTP already verified for this ride' });
    }
    
    // For permanent OTP, we don't check expiration - it's always valid
    if (permanentOtp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP. Use your permanent OTP.' });
    }
    
    // Mark OTP as verified
    ride.otp = permanentOtp;
    ride.isOtpVerified = true;
    ride.otpVerifiedAt = new Date();
    await ride.save();
    
    // Notify all parties
    const io = req.app.get('io');
    io.emit('otpVerified', {
      rideId: ride._id,
      verifiedAt: ride.otpVerifiedAt,
      message: 'Permanent OTP verified successfully. Ride can now start.'
    });
    
    res.json({ 
      message: 'Permanent OTP verified successfully! You can now start the ride.',
      verifiedAt: ride.otpVerifiedAt,
      isPermanentOtp: true
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET OTP STATUS ───────────────────────────────────────────
exports.getOtpStatus = async (req, res) => {
  try {
    const { rideId } = req.params;
    const User = require('../users/users.model');
    
    const ride = await Ride.findOne({ _id: rideId, providerId: req.user.userId })
      .select('otp otpGeneratedAt otpVerifiedAt isOtpVerified status');
    
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    
    // Get user's permanent OTP info
    const user = await User.findById(req.user.userId).select('permanentOtp permanentOtpSetAt');
    
    const response = {
      hasOtp: !!ride.otp,
      isOtpVerified: ride.isOtpVerified,
      otpGeneratedAt: ride.otpGeneratedAt,
      otpVerifiedAt: ride.otpVerifiedAt,
      status: ride.status,
      isPermanentOtp: !!user.permanentOtp,
      permanentOtpSetAt: user.permanentOtpSetAt
    };
    
    // For permanent OTP, no expiration check
    if (ride.otp && !ride.isOtpVerified && !user.permanentOtp) {
      const otpAge = Date.now() - new Date(ride.otpGeneratedAt).getTime();
      response.isExpired = otpAge > 5 * 60 * 1000;
    }
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── NO MATCH SUGGEST ───────────────────────────────────────────────
exports.noMatchSuggest = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    res.json({
      message: 'No rides found near your location',
      suggestions: [
        { action: 'subscribe_alert', label: 'Get notified when a ride is posted on this route', endpoint: 'POST /alerts' },
        { action: 'post_request',   label: 'Post a ride request so providers can see your need', endpoint: 'POST /alerts/ride-request' }
      ],
      searchedAt: new Date(), lat, lng
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
// ── GENERATE OTP (alias for requestOtpFromSeeker) ─────────────────
exports.generateOtp = async (req, res) => {
  // You can either call the existing function or implement new logic
  return exports.requestOtpFromSeeker(req, res);
};*/