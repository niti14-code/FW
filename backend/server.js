const express = require('express');
const mongoose = require("mongoose");
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const http = require("http");
const socketIo = require("socket.io");


dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// ==========================================
// 1. CORS
// ==========================================
const allowedOrigins = [
  'https://fw-mq8p.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      console.log('❌ CORS blocked:', origin);
      return callback(new Error('CORS policy violation'), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ==========================================
// 2. BODY PARSERS
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// 3. LOGGING
// ==========================================
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ==========================================
// 4. SOCKET.IO
// ==========================================
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ['websocket', 'polling']
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  socket.on("join-ride", (rideId) => {
    socket.join(`ride-${rideId}`);
  });

  // CHAT MESSAGE EVENT
  socket.on("send-message", async (data) => {
    try {
      const Chat = require('./chat/chat.model');

      const { rideId, senderId, message } = data;

      const chat = new Chat({
        rideId,
        sender: senderId,
        message
      });

      await chat.save();

      io.to(`ride-${rideId}`).emit("receive-message", {
        rideId,
        senderId,
        message,
        createdAt: chat.createdAt
      });

    } catch (error) {
      console.error("Chat error:", error.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected:", socket.id);
  });
});

// ==========================================
// 5. ROUTES - EXPLICIT MOUNTING
// ==========================================

app.get('/', (req, res) => {
  res.json({ message: 'FreeWheels API is running!', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected' });
});

// Import auth middleware
const auth = require('./middleware/auth');

// Import models
const User = require('./users/users.model');
const Ride = require('./rides/rides.model');
const Booking = require('./bookings/bookings.model');

// --- AUTH ROUTES ---
app.post('/auth/register', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    const { name, email, password, phone, role, college } = req.body;
    
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    user = new User({
      name, email, password: hashedPassword, phone, role, 
      college: role === 'admin' ? undefined : college
    });
    
    await user.save();
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, college: user.college, phone: user.phone }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, college: user.college, phone: user.phone }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/auth/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- USER ROUTES ---
app.get('/users/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/users/profile', auth, async (req, res) => {
  try {
    const updates = req.body;
    delete updates.password;
    const user = await User.findByIdAndUpdate(req.user.userId, updates, { new: true }).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- RIDE ROUTES ---
app.post('/ride/create', auth, async (req, res) => {
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
});

app.get('/ride/search', auth, async (req, res) => {
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
});

// GET /ride/my - THIS IS THE KEY ROUTE!
app.get('/ride/my', auth, async (req, res) => {
  try {
    console.log('✅ HIT /ride/my for user:', req.user.userId);
    const rides = await Ride.find({ providerId: req.user.userId }).sort({ createdAt: -1 });
    res.json(rides);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/ride/:id', auth, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id).populate('providerId', 'name phone rating');
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    res.json(ride);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/ride/:id', auth, async (req, res) => {
  try {
    const ride = await Ride.findOne({ _id: req.params.id, providerId: req.user.userId });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    
    const updated = await Ride.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/ride/:id', auth, async (req, res) => {
  try {
    const ride = await Ride.findOneAndDelete({ _id: req.params.id, providerId: req.user.userId });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    res.json({ message: 'Ride deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- BOOKING ROUTES ---
app.post('/booking/request', auth, async (req, res) => {
  try {
    const { rideId } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (user.role === 'provider') return res.status(403).json({ message: 'Providers cannot book' });
    
    const ride = await Ride.findById(rideId);
    if (!ride || ride.seatsAvailable < 1) return res.status(400).json({ message: 'No seats available' });
    
    const booking = new Booking({ rideId, seekerId: req.user.userId });
    await booking.save();
    
    ride.seatsAvailable -= 1;
    await ride.save();
    
    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/booking/respond', auth, async (req, res) => {
  try {
    const { bookingId, status } = req.body;
    
    const booking = await Booking.findById(bookingId).populate('rideId');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    if (booking.rideId.providerId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    booking.status = status;
    await booking.save();
    
    if (status === 'rejected') {
      const ride = await Ride.findById(booking.rideId);
      ride.seatsAvailable += 1;
      await ride.save();
    }
    
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /booking/my - THIS IS THE KEY ROUTE!
app.get('/booking/my', auth, async (req, res) => {
  try {
    console.log('✅ HIT /booking/my for user:', req.user.userId);
    const bookings = await Booking.find({ seekerId: req.user.userId })
      .populate('rideId', 'pickup drop date time costPerSeat status')
      .populate('rideId.providerId', 'name phone')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /booking/requests - for provider
app.get('/booking/requests', auth, async (req, res) => {
  try {
    const rides = await Ride.find({ providerId: req.user.userId });
    const rideIds = rides.map(r => r._id);
    
    const bookings = await Booking.find({ rideId: { $in: rideIds } })
      .populate('rideId', 'pickup drop date time')
      .populate('seekerId', 'name phone rating college')
      .sort({ createdAt: -1 });
    
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /booking/ride/:rideId - THIS IS THE KEY ROUTE!
app.get('/booking/ride/:rideId', auth, async (req, res) => {
  try {
    console.log('✅ HIT /booking/ride/:rideId for ride:', req.params.rideId);
    const { rideId } = req.params;
    
    const ride = await Ride.findOne({ _id: rideId, providerId: req.user.userId });
    if (!ride) return res.status(403).json({ message: 'Not authorized' });
    
    const bookings = await Booking.find({ rideId })
      .populate('seekerId', 'name phone rating college')
      .sort({ createdAt: -1 });
    
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- RATINGS ROUTES ---
const ratingsRoutes = require('./ratings/ratings.routes');
app.use('/ratings', ratingsRoutes);

// --- KYC ROUTES ---
const kycRoutes = require('./kyc/kyc.routes');
app.use('/kyc', kycRoutes);

// --- TRACKING ROUTES ---
const trackingRoutes = require('./tracking/tracking.routes');
app.use('/tracking', trackingRoutes);

// --- CHAT ROUTES ---
const chatRoutes = require('./chat/chat.routes');
app.use('/chat', chatRoutes);

// --- ADMIN ROUTES ---
app.use('/admin', require('./admin/admin.routes'));

// 404 Handler
app.use((req, res) => {
  console.log(`❌ 404 - Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Route not found', url: req.originalUrl, method: req.method });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});