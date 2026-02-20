const Ride = require('./rides.model');
const User = require('../users/users.model');

exports.createRide = async (req, res) => {
  try {
    const { pickup, drop, date, time, seatsAvailable, costPerSeat } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (user.role === 'seeker') return res.status(403).json({ message: 'Only providers can create rides' });
    
    const ride = new Ride({
      providerId: req.user.userId,
      pickup: { type: 'Point', coordinates: pickup.coordinates },
      drop: { type: 'Point', coordinates: drop.coordinates },
      date, time, seatsAvailable, costPerSeat
    });
    
    await ride.save();
    res.status(201).json(ride);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.searchRides = async (req, res) => {
  try {
    const { lat, lng, maxDistance = 5000, date } = req.query;
    
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
    console.log('=== DEBUG getRide ===');
    console.log('req.params:', req.params);
    console.log('req.params.id:', req.params.id);
    console.log('req.user:', req.user);
    console.log('Full URL:', req.originalUrl);
    
    const ride = await Ride.findById(req.params.id).populate('providerId', 'name phone rating');
    
    console.log('Ride found:', ride);
    console.log('====================');
    
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    res.json(ride);
  } catch (error) {
    console.log('Error in getRide:', error.message);
    res.status(500).json({ message: error.message });
  }
};

exports.updateRide = async (req, res) => {
  try {
    const ride = await Ride.findOne({ _id: req.params.id, providerId: req.user.userId });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    
    const updated = await Ride.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteRide = async (req, res) => {
  try {
    const ride = await Ride.findOneAndDelete({ _id: req.params.id, providerId: req.user.userId });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    res.json({ message: 'Ride deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Get my rides (for provider)
exports.getMyRides = async (req, res) => {
  try {
    const rides = await Ride.find({ providerId: req.user.userId })
      .sort({ createdAt: -1 });
    
    res.json(rides);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

