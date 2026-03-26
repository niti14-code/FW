// backend/server.js - CORRECTED
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
// Build allowed origins from env + hardcoded dev origins
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://fw-mq8p.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    console.log('⚠️ CORS request from unlisted origin (allowing):', origin);
    // In production you may want to block; for now allow all to avoid deploy issues
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS','PATCH'],
  allowedHeaders: ['Content-Type','Authorization']
}));

// ==========================================
// 2. BODY PARSERS
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// 3. REQUEST LOGGING
// ==========================================
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ==========================================
// 4. SOCKET.IO
// ==========================================
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET","POST"] },
  transports: ['websocket','polling']
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  socket.on("join-ride", (rideId) => {
    socket.join(`ride-${rideId}`);
  });

  socket.on("send-message", async (data) => {
    try {
      const Chat = require('./chat/chat.model');
      const { rideId, senderId, message } = data;
      const chat = new Chat({ rideId, sender: senderId, message });
      await chat.save();
      io.to(`ride-${rideId}`).emit("receive-message", {
        rideId, senderId, message, createdAt: chat.createdAt
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
// 5. HEALTH ROUTES
// ==========================================
app.get('/', (req, res) => {
  res.json({
    message: 'FreeWheels API is running!',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// ==========================================
// 6. ROUTES - ALL CONSISTENTLY PREFIXED WITH /api
// ==========================================

// AUTH
const authRoutes = require('./auth/auth.routes');
app.use('/api/auth', authRoutes);

// USERS
const usersRoutes = require('./users/users.routes');
app.use('/api/users', usersRoutes);

// FEATURES - All prefixed with /api for consistency
const ridesRoutes = require('./rides/rides.routes');
const bookingsRoutes = require('./bookings/bookings.routes');
const ratingsRoutes = require('./ratings/ratings.routes');
const kycRoutes = require('./kyc/kyc.routes');
const trackingRoutes = require('./tracking/tracking.routes');
const chatRoutes = require('./chat/chat.routes');
const adminRoutes = require('./admin/admin.routes');
const alertsRoutes = require('./alerts/alerts.routes');
const sosRoutes = require('./sos/sos.routes');
const incidentsRoutes = require('./incidents/incidents.routes');

// FIXED: Consistent /api prefix for all routes
app.use('/api/ride', ridesRoutes);
app.use('/api/booking', bookingsRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/incidents', incidentsRoutes);

// ==========================================
// 7. 404 HANDLER
// ==========================================
app.use((req, res) => {
  console.log(`❌ 404 - Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Route not found',
    url: req.originalUrl,
    method: req.method
  });
});

// ==========================================
// 8. ERROR HANDLER
// ==========================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ error: err.message });
});

// ==========================================
// 9. START SERVER
// ==========================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});