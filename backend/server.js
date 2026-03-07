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
// 5. ROUTES - MODULAR ARCHITECTURE
// ==========================================

app.get('/', (req, res) => {
  res.json({ message: 'FreeWheels API is running!', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected' });
});

// Import auth middleware
const auth = require('./middleware/auth');

// Import models (for auth routes)
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

// --- MODULAR FEATURE ROUTES ---
const ridesRoutes = require('./rides/rides.routes');
const bookingsRoutes = require('./bookings/bookings.routes');
const ratingsRoutes = require('./ratings/ratings.routes');
const kycRoutes = require('./kyc/kyc.routes');
const trackingRoutes = require('./tracking/tracking.routes');
const chatRoutes = require('./chat/chat.routes');
const adminRoutes = require('./admin/admin.routes');
const alertsRoutes = require('./alerts/alerts.routes');
const sosRoutes = require('./sos/sos.routes');

app.use('/ride', ridesRoutes);
app.use('/booking', bookingsRoutes);
app.use('/ratings', ratingsRoutes);
app.use('/kyc', kycRoutes);
app.use('/tracking', trackingRoutes);
app.use('/chat', chatRoutes);
app.use('/admin', adminRoutes);
app.use('/alerts', alertsRoutes);
app.use('/sos', sosRoutes);

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