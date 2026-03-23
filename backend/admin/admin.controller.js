const User    = require('../users/users.model');
const Ride    = require('../rides/rides.model');
const Booking = require('../bookings/bookings.model');
const Incident = require('../incidents/incidents.model');

// ── Guard: only admin role ────────────────────────────────────────
function requireAdmin(req, res) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ message: 'Admin access required' });
    return false;
  }
  return true;
}

// ── GET /api/admin/stats ──────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalProviders,
      totalSeekers,
      totalRides,
      activeRides,
      completedRides,
      totalBookings,
      pendingKYC,
      openIncidents,
      highIncidents,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      User.countDocuments({ role: { $in: ['provider', 'both'] } }),
      User.countDocuments({ role: { $in: ['seeker',  'both'] } }),
      Ride.countDocuments(),
      Ride.countDocuments({ status: 'active' }),
      Ride.countDocuments({ status: 'completed' }),
      Booking.countDocuments(),
      User.countDocuments({ kycStatus: 'pending' }),
      Incident.countDocuments({ status: 'open' }),
      Incident.countDocuments({ severity: { $in: ['high', 'critical'] }, status: { $ne: 'resolved' } }),
    ]);

    res.json({
      totalUsers,
      totalProviders,
      totalSeekers,
      totalRides,
      activeRides,
      completedRides,
      totalBookings,
      pendingKYC,
      openIncidents,
      highIncidents,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/admin/users ──────────────────────────────────────────
exports.getUsers = async (req, res) => {
  try {
    const { search, role, kyc } = req.query;

    const filter = { role: { $ne: 'admin' } };
    if (role === 'provider') {
      // For KYC tab: fetch both 'provider' and 'both' roles since both need KYC
      filter.role = { $in: ['provider', 'both'] };
    } else if (role) {
      filter.role = role;
    }
    if (kyc)    filter.kycStatus = kyc;
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PUT /api/admin/users/:id/suspend ─────────────────────────────
exports.suspendUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Cannot suspend admin' });

    user.suspended = !user.suspended;
    await user.save();

    res.json({ message: user.suspended ? 'User suspended' : 'User reactivated', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/admin/rides ──────────────────────────────────────────
exports.getAllRides = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const rides = await Ride.find(filter)
      .populate('providerId', 'name email college')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Ride.countDocuments(filter);

    res.json({ rides, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── DELETE /api/admin/rides/:id ───────────────────────────────────
exports.deleteRide = async (req, res) => {
  try {
    const ride = await Ride.findByIdAndDelete(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    // Cancel all bookings for this ride
    await Booking.updateMany({ rideId: req.params.id }, { status: 'rejected' });
    res.json({ message: 'Ride deleted and bookings cancelled' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/admin/kyc ────────────────────────────────────────────
exports.getPendingKYC = async (req, res) => {
  try {
    const users = await User.find({ kycStatus: 'pending' })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PUT /api/admin/kyc/:userId ────────────────────────────────────
exports.reviewKYC = async (req, res) => {
  try {
    const { status } = req.body; // 'approved' | 'rejected'
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { kycStatus: status },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: `KYC ${status}`, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/admin/incidents ──────────────────────────────────────
exports.getAllIncidents = async (req, res) => {
  try {
    const incidents = await Incident.find()
      .populate('reportedBy', 'name email')
      .populate('rideId', 'date time pickup drop')
      .sort({ createdAt: -1 });
    res.json(incidents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PUT /api/admin/incidents/:id/status ──────────────────────────
exports.updateIncidentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!incident) return res.status(404).json({ message: 'Incident not found' });
    res.json({ message: 'Status updated', incident });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
/*const User = require('../users/users.model');
const Ride = require('../rides/rides.model');
const Booking = require('../bookings/bookings.model');
const Tracking = require('../tracking/tracking.model');
const Admin = require('./admin.model'); // ADD THIS IMPORT

// ==========================================
// DASHBOARD ANALYTICS
// ==========================================

exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      // User stats
      totalUsers: await User.countDocuments(),
      totalProviders: await User.countDocuments({ role: 'provider' }),
      totalSeekers: await User.countDocuments({ role: 'seeker' }),
      newUsersToday: await User.countDocuments({ createdAt: { $gte: today } }),
      
      // Verification stats
      pendingVerifications: await User.countDocuments({
        $or: [
          { 'verified.studentId': false },
          { 'verified.license': false }
        ]
      }),
      
      // Ride stats
      totalRides: await Ride.countDocuments(),
      activeRides: await Ride.countDocuments({ status: 'active' }),
      completedRides: await Ride.countDocuments({ status: 'completed' }),
      ridesToday: await Ride.countDocuments({ createdAt: { $gte: today } }),
      
      // Booking stats
      totalBookings: await Booking.countDocuments(),
      pendingBookings: await Booking.countDocuments({ status: 'pending' }),
      acceptedBookings: await Booking.countDocuments({ status: 'accepted' }),
      
      // Revenue estimate (sum of all completed ride earnings)
      totalRevenue: await Booking.aggregate([
        { $match: { status: 'accepted' } },
        {
          $lookup: {
            from: 'rides',
            localField: 'rideId',
            foreignField: '_id',
            as: 'ride'
          }
        },
        { $unwind: '$ride' },
        {
          $group: {
            _id: null,
            total: { $sum: '$ride.costPerSeat' }
          }
        }
      ]).then(result => result[0]?.total || 0)
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// USER MANAGEMENT
// ==========================================

exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search, verified } = req.query;
    
    let query = {};
    
    // Filters
    if (role) query.role = role;
    if (verified === 'true') {
      query['verified.studentId'] = true;
      query['verified.license'] = true;
    } else if (verified === 'false') {
      query.$or = [
        { 'verified.studentId': false },
        { 'verified.license': false }
      ];
    }
    
    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const count = await User.countDocuments(query);
    
    res.json({
      users,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalUsers: count
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get user's rides if provider
    let userRides = [];
    if (user.role === 'provider' || user.role === 'both') {
      userRides = await Ride.find({ providerId: user._id })
        .sort({ createdAt: -1 })
        .limit(10);
    }
    
    // Get user's bookings
    const userBookings = await Booking.find({ seekerId: user._id })
      .populate('rideId', 'pickup drop date time costPerSeat')
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json({
      user,
      rides: userRides,
      bookings: userBookings
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const updates = req.body;
    delete updates.password; // Prevent password change via this route
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    
    // Clean up related data
    await Ride.deleteMany({ providerId: req.params.id });
    await Booking.deleteMany({ seekerId: req.params.id });
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// VERIFICATION MANAGEMENT
// ==========================================

exports.getPendingVerifications = async (req, res) => {
  try {
    const { type = 'all' } = req.query; // all, studentId, license
    
    let query = {};
    
    if (type === 'studentId') {
      query['verified.studentId'] = false;
    } else if (type === 'license') {
      query['verified.license'] = false;
      query['role'] = { $in: ['provider', 'both'] };
    } else {
      query.$or = [
        { 'verified.studentId': false },
        { 
          'verified.license': false,
          'role': { $in: ['provider', 'both'] }
        }
      ];
    }
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyDocument = async (req, res) => {
  try {
    const { userId, docType, status, notes } = req.body;
    // docType: 'studentId', 'license', 'email'
    // status: 'approved', 'rejected'
    
    const update = {};
    update[`verified.${docType}`] = status === 'approved';
    
    const user = await User.findByIdAndUpdate(
      userId,
      update,
      { new: true }
    ).select('-password');
    
    // TODO: Send email notification to user
    
    res.json({
      message: `${docType} ${status}`,
      user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// RIDE MANAGEMENT
// ==========================================

exports.getAllRides = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, dateFrom, dateTo } = req.query;
    
    let query = {};
    
    if (status) query.status = status;
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(dateTo);
    }
    
    const rides = await Ride.find(query)
      .populate('providerId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const count = await Ride.countDocuments(query);
    
    res.json({
      rides,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalRides: count
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRideDetails = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('providerId', 'name email phone rating');
    
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }
    
    // Get bookings for this ride
    const bookings = await Booking.find({ rideId: ride._id })
      .populate('seekerId', 'name email phone');
    
    // Get tracking if active
    const tracking = await Tracking.findOne({ rideId: ride._id });
    
    res.json({
      ride,
      bookings,
      tracking
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.cancelRide = async (req, res) => {
  try {
    const { reason } = req.body;
    
    const ride = await Ride.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'cancelled',
        cancelledBy: 'admin',
        cancelReason: reason,
        cancelledAt: new Date()
      },
      { new: true }
    );
    
    // Notify all booked users
    const bookings = await Booking.find({ rideId: ride._id });
    for (const booking of bookings) {
      // TODO: Send notification
      booking.status = 'cancelled';
      await booking.save();
    }
    
    res.json({ message: 'Ride cancelled', ride });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// BOOKING MANAGEMENT
// ==========================================

exports.getAllBookings = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    
    let query = {};
    if (status) query.status = status;
    
    const bookings = await Booking.find(query)
      .populate('rideId', 'pickup drop date time costPerSeat')
      .populate('seekerId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const count = await Booking.countDocuments(query);
    
    res.json({
      bookings,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalBookings: count
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// REPORTS & ANALYTICS
// ==========================================

exports.getRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchStage = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }
    
    const revenue = await Booking.aggregate([
      { $match: { status: 'accepted', ...matchStage } },
      {
        $lookup: {
          from: 'rides',
          localField: 'rideId',
          foreignField: '_id',
          as: 'ride'
        }
      },
      { $unwind: '$ride' },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          totalRevenue: { $sum: '$ride.costPerSeat' },
          totalBookings: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } }
    ]);
    
    res.json(revenue);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPopularRoutes = async (req, res) => {
  try {
    const routes = await Ride.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: {
            pickup: '$pickup.coordinates',
            drop: '$drop.coordinates'
          },
          count: { $sum: 1 },
          avgCost: { $avg: '$costPerSeat' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    res.json(routes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// ADMIN REGISTRATION (One-time setup)
// ==========================================

exports.registerAdmin = async (req, res) => {
  try {
    const { name, email, password, phone, adminKey } = req.body;
    
    // Secret key to prevent unauthorized admin registration
    const SECRET_ADMIN_KEY = process.env.ADMIN_SECRET_KEY || 'freewheels-admin-2024';
    
    if (adminKey !== SECRET_ADMIN_KEY) {
      return res.status(403).json({ message: 'Invalid admin key' });
    }
    
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      // Update existing user to admin
      user.role = 'admin';
      await user.save();
      
      // Also create admin record
      let admin = await Admin.findOne({ userId: user._id });
      if (!admin) {
        admin = new Admin({
          userId: user._id,
          email: user.email,
          role: 'admin',
          permissions: ['users', 'rides', 'bookings', 'verifications', 'reports']
        });
        await admin.save();
      }
      
      return res.json({
        message: 'User updated to admin',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    }
    
    // Create new admin user
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      role: 'admin',
      college: 'Admin',
      verified: {
        email: true,
        studentId: true,
        license: true
      }
    });
    
    await user.save();
    
    // Create admin record
    const admin = new Admin({
      userId: user._id,
      email: user.email,
      role: 'admin',
      permissions: ['users', 'rides', 'bookings', 'verifications', 'reports']
    });
    await admin.save();
    
    // Generate token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      message: 'Admin registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// ── ADMIN SETTINGS (key-value store) ──────────────────────────────
const settingsStore = {}; // in-memory; replace with DB model if needed

exports.getSetting = async (req, res) => {
  try {
    const { key } = req.params;
    res.json({ key, value: settingsStore[key] ?? null });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.setSetting = async (req, res) => {
  try {
    const { key, value } = req.body;
    settingsStore[key] = value;
    res.json({ key, value });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getAllSettings = async (req, res) => {
  try {
    res.json(settingsStore);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ==========================================
// KYC MANAGEMENT
// ==========================================

// GET /api/admin/kyc/pending  — returns ALL users who submitted KYC
exports.getPendingKyc = async (req, res) => {
  try {
    // Return anyone with kycStatus pending (providers/both)
    const users = await User.find({
      kycStatus: { $in: ['pending', 'approved', 'rejected'] }
    })
    .select('-password')
    .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/kyc/:id/approved
exports.approveKyc = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.kycStatus = 'approved';
    await user.save();

    res.json({ message: 'KYC approved', kycStatus: 'approved' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/kyc/:id/rejected
exports.rejectKyc = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.kycStatus = 'rejected';
    await user.save();

    res.json({ message: 'KYC rejected', kycStatus: 'rejected' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/*const User = require('../users/users.model');
const Ride = require('../rides/rides.model');
const Booking = require('../bookings/bookings.model');
const Tracking = require('../tracking/tracking.model');
const Admin = require('./admin.model'); // ADD THIS IMPORT

// ==========================================
// DASHBOARD ANALYTICS
// ==========================================

exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      // User stats
      totalUsers: await User.countDocuments(),
      totalProviders: await User.countDocuments({ role: 'provider' }),
      totalSeekers: await User.countDocuments({ role: 'seeker' }),
      newUsersToday: await User.countDocuments({ createdAt: { $gte: today } }),
      
      // Verification stats
      pendingVerifications: await User.countDocuments({
        $or: [
          { 'verified.studentId': false },
          { 'verified.license': false }
        ]
      }),
      
      // Ride stats
      totalRides: await Ride.countDocuments(),
      activeRides: await Ride.countDocuments({ status: 'active' }),
      completedRides: await Ride.countDocuments({ status: 'completed' }),
      ridesToday: await Ride.countDocuments({ createdAt: { $gte: today } }),
      
      // Booking stats
      totalBookings: await Booking.countDocuments(),
      pendingBookings: await Booking.countDocuments({ status: 'pending' }),
      acceptedBookings: await Booking.countDocuments({ status: 'accepted' }),
      
      // Revenue estimate (sum of all completed ride earnings)
      totalRevenue: await Booking.aggregate([
        { $match: { status: 'accepted' } },
        {
          $lookup: {
            from: 'rides',
            localField: 'rideId',
            foreignField: '_id',
            as: 'ride'
          }
        },
        { $unwind: '$ride' },
        {
          $group: {
            _id: null,
            total: { $sum: '$ride.costPerSeat' }
          }
        }
      ]).then(result => result[0]?.total || 0)
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// USER MANAGEMENT
// ==========================================

exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search, verified } = req.query;
    
    let query = {};
    
    // Filters
    if (role) query.role = role;
    if (verified === 'true') {
      query['verified.studentId'] = true;
      query['verified.license'] = true;
    } else if (verified === 'false') {
      query.$or = [
        { 'verified.studentId': false },
        { 'verified.license': false }
      ];
    }
    
    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const count = await User.countDocuments(query);
    
    res.json({
      users,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalUsers: count
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get user's rides if provider
    let userRides = [];
    if (user.role === 'provider' || user.role === 'both') {
      userRides = await Ride.find({ providerId: user._id })
        .sort({ createdAt: -1 })
        .limit(10);
    }
    
    // Get user's bookings
    const userBookings = await Booking.find({ seekerId: user._id })
      .populate('rideId', 'pickup drop date time costPerSeat')
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json({
      user,
      rides: userRides,
      bookings: userBookings
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const updates = req.body;
    delete updates.password; // Prevent password change via this route
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    
    // Clean up related data
    await Ride.deleteMany({ providerId: req.params.id });
    await Booking.deleteMany({ seekerId: req.params.id });
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// VERIFICATION MANAGEMENT
// ==========================================

exports.getPendingVerifications = async (req, res) => {
  try {
    const { type = 'all' } = req.query; // all, studentId, license
    
    let query = {};
    
    if (type === 'studentId') {
      query['verified.studentId'] = false;
    } else if (type === 'license') {
      query['verified.license'] = false;
      query['role'] = { $in: ['provider', 'both'] };
    } else {
      query.$or = [
        { 'verified.studentId': false },
        { 
          'verified.license': false,
          'role': { $in: ['provider', 'both'] }
        }
      ];
    }
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyDocument = async (req, res) => {
  try {
    const { userId, docType, status, notes } = req.body;
    // docType: 'studentId', 'license', 'email'
    // status: 'approved', 'rejected'
    
    const update = {};
    update[`verified.${docType}`] = status === 'approved';
    
    const user = await User.findByIdAndUpdate(
      userId,
      update,
      { new: true }
    ).select('-password');
    
    // TODO: Send email notification to user
    
    res.json({
      message: `${docType} ${status}`,
      user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// RIDE MANAGEMENT
// ==========================================

exports.getAllRides = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, dateFrom, dateTo } = req.query;
    
    let query = {};
    
    if (status) query.status = status;
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(dateTo);
    }
    
    const rides = await Ride.find(query)
      .populate('providerId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const count = await Ride.countDocuments(query);
    
    res.json({
      rides,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalRides: count
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRideDetails = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('providerId', 'name email phone rating');
    
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }
    
    // Get bookings for this ride
    const bookings = await Booking.find({ rideId: ride._id })
      .populate('seekerId', 'name email phone');
    
    // Get tracking if active
    const tracking = await Tracking.findOne({ rideId: ride._id });
    
    res.json({
      ride,
      bookings,
      tracking
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.cancelRide = async (req, res) => {
  try {
    const { reason } = req.body;
    
    const ride = await Ride.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'cancelled',
        cancelledBy: 'admin',
        cancelReason: reason,
        cancelledAt: new Date()
      },
      { new: true }
    );
    
    // Notify all booked users
    const bookings = await Booking.find({ rideId: ride._id });
    for (const booking of bookings) {
      // TODO: Send notification
      booking.status = 'cancelled';
      await booking.save();
    }
    
    res.json({ message: 'Ride cancelled', ride });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// BOOKING MANAGEMENT
// ==========================================

exports.getAllBookings = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    
    let query = {};
    if (status) query.status = status;
    
    const bookings = await Booking.find(query)
      .populate('rideId', 'pickup drop date time costPerSeat')
      .populate('seekerId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const count = await Booking.countDocuments(query);
    
    res.json({
      bookings,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalBookings: count
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// REPORTS & ANALYTICS
// ==========================================

exports.getRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchStage = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }
    
    const revenue = await Booking.aggregate([
      { $match: { status: 'accepted', ...matchStage } },
      {
        $lookup: {
          from: 'rides',
          localField: 'rideId',
          foreignField: '_id',
          as: 'ride'
        }
      },
      { $unwind: '$ride' },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          totalRevenue: { $sum: '$ride.costPerSeat' },
          totalBookings: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } }
    ]);
    
    res.json(revenue);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPopularRoutes = async (req, res) => {
  try {
    const routes = await Ride.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: {
            pickup: '$pickup.coordinates',
            drop: '$drop.coordinates'
          },
          count: { $sum: 1 },
          avgCost: { $avg: '$costPerSeat' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    res.json(routes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// ADMIN REGISTRATION (One-time setup)
// ==========================================

exports.registerAdmin = async (req, res) => {
  try {
    const { name, email, password, phone, adminKey } = req.body;
    
    // Secret key to prevent unauthorized admin registration
    const SECRET_ADMIN_KEY = process.env.ADMIN_SECRET_KEY || 'freewheels-admin-2024';
    
    if (adminKey !== SECRET_ADMIN_KEY) {
      return res.status(403).json({ message: 'Invalid admin key' });
    }
    
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      // Update existing user to admin
      user.role = 'admin';
      await user.save();
      
      // Also create admin record
      let admin = await Admin.findOne({ userId: user._id });
      if (!admin) {
        admin = new Admin({
          userId: user._id,
          email: user.email,
          role: 'admin',
          permissions: ['users', 'rides', 'bookings', 'verifications', 'reports']
        });
        await admin.save();
      }
      
      return res.json({
        message: 'User updated to admin',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    }
    
    // Create new admin user
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      role: 'admin',
      college: 'Admin',
      verified: {
        email: true,
        studentId: true,
        license: true
      }
    });
    
    await user.save();
    
    // Create admin record
    const admin = new Admin({
      userId: user._id,
      email: user.email,
      role: 'admin',
      permissions: ['users', 'rides', 'bookings', 'verifications', 'reports']
    });
    await admin.save();
    
    // Generate token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      message: 'Admin registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// ── ADMIN SETTINGS (key-value store) ──────────────────────────────
const settingsStore = {}; // in-memory; replace with DB model if needed

exports.getSetting = async (req, res) => {
  try {
    const { key } = req.params;
    res.json({ key, value: settingsStore[key] ?? null });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.setSetting = async (req, res) => {
  try {
    const { key, value } = req.body;
    settingsStore[key] = value;
    res.json({ key, value });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getAllSettings = async (req, res) => {
  try {
    res.json(settingsStore);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ==========================================
// KYC MANAGEMENT (NEW CLEAN VERSION)
// ==========================================

// Get all pending KYC
exports.getPendingKyc = async (req, res) => {
  try {
    const users = await User.find({
      role: { $in: ['provider', 'both'] },
      kycStatus: 'pending'
    }).select('-password');

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Approve KYC
exports.approveKyc = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    user.kycStatus = 'approved';
    await user.save();

    res.json({ message: "KYC approved" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Reject KYC
exports.rejectKyc = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    user.kycStatus = 'rejected';
    await user.save();

    res.json({ message: "KYC rejected" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};*/