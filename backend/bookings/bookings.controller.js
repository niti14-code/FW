// backend/bookings/bookings.controller.js - CORRECTED
const Booking = require('./bookings.model');
const Ride = require('../rides/rides.model');
const User = require('../users/users.model');

// ================= REQUEST BOOKING (Seeker) =================
exports.requestBooking = async (req, res) => {
  try {
    const { rideId } = req.body;
    const seekerId = req.user.userId;

    // Check if ride exists and is active
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }
    if (ride.status !== 'active') {
      return res.status(400).json({ message: 'Ride is not active' });
    }
    if (ride.seatsAvailable < 1) {
      return res.status(400).json({ message: 'No seats available' });
    }

    // Check if user already requested this ride
    const existingBooking = await Booking.findOne({ rideId, seekerId });
    if (existingBooking) {
      return res.status(400).json({ message: 'You already requested this ride' });
    }

    // Create booking
    const booking = new Booking({
      rideId,
      seekerId,
      status: 'pending'
    });

    await booking.save();

    // Decrease available seats
    ride.seatsAvailable -= 1;
    await ride.save();

    res.status(201).json({
      message: 'Booking requested successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= RESPOND TO BOOKING (Provider) =================
exports.respondBooking = async (req, res) => {
  try {
    const { bookingId, status } = req.body; // status: 'accepted' or 'rejected'
    const providerId = req.user.userId;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Use accepted or rejected' });
    }

    const booking = await Booking.findById(bookingId).populate('rideId');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify the provider owns this ride
    if (booking.rideId.providerId.toString() !== providerId) {
      return res.status(403).json({ message: 'Not authorized to respond to this booking' });
    }

    // If rejecting, restore the seat
    if (status === 'rejected' && booking.status !== 'rejected') {
      const ride = await Ride.findById(booking.rideId);
      ride.seatsAvailable += 1;
      await ride.save();
    }

    booking.status = status;
    await booking.save();

    res.json({
      message: `Booking ${status}`,
      booking
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= GET MY BOOKINGS (Seeker) =================
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ seekerId: req.user.userId })
      .populate('rideId', 'pickup drop date time costPerSeat status')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= GET RIDE REQUESTS (Provider) =================
exports.getRideRequests = async (req, res) => {
  try {
    const providerId = req.user.userId;

    // Get all rides by this provider
    const rides = await Ride.find({ providerId });
    const rideIds = rides.map(r => r._id);

    // Get all pending bookings for these rides
    const bookings = await Booking.find({ 
      rideId: { $in: rideIds },
      status: 'pending'
    })
    .populate('rideId', 'pickup drop date time')
    .populate('seekerId', 'name phone rating')
    .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= GET BOOKINGS FOR SPECIFIC RIDE =================
exports.getBookingsForRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const providerId = req.user.userId;

    // Verify provider owns this ride
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }
    if (ride.providerId.toString() !== providerId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const bookings = await Booking.find({ rideId })
      .populate('seekerId', 'name phone rating')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};