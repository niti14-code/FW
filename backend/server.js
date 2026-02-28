const express = require('express');
const mongoose = require("mongoose");
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const http = require("http");
const socketIo = require("socket.io");
const trackingRoutes = require("./tracking/tracking.routes");

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// ==========================================
// 1. CORS FIRST
// ==========================================
const allowedOrigins = [
  'https://fw-mq8p.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
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
// 2. BODY PARSERS SECOND (CRITICAL!)
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// 3. LOGGING
// ==========================================
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log('Body:', req.body);  // Now this will show the body
  next();
});
console.log('🔌 MongoDB URI:', process.env.MONGODB_URI ? 'Set (hidden)' : 'NOT SET!');
console.log('🗄️  Database name:', mongoose.connection.name || 'Not connected yet');

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected to:', mongoose.connection.name);
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
  socket.on("disconnect", () => {
    console.log("User Disconnected:", socket.id);
  });
});

// ==========================================
// 5. ROUTES LAST
// ==========================================

app.get('/', (req, res) => {
  res.json({ message: 'FreeWheels API is running!', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected' });
});

// API Routes
app.use('/api/auth', require('./auth/auth.routes'));
app.use('/api/users', require('./users/users.routes'));
app.use('/api/rides', require('./rides/rides.routes'));
app.use('/api/bookings', require('./bookings/bookings.routes'));
app.use('/api/tracking', trackingRoutes);
app.use('/api/admin', require('./admin/admin.routes'));

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
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// DEBUG ROUTE - List all users (remove in production!)
app.get('/debug/users', async (req, res) => {
  try {
    const User = require('./users/users.model');
    const users = await User.find().select('-password');
    res.json({
      count: users.length,
      users: users.map(u => ({
        id: u._id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});