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
// CORS - ALLOW ALL ORIGINS
// ==========================================
app.use(cors({
  origin: ['https://fw-mq8p.onrender.com', 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ==========================================
// REQUEST LOGGING
// ==========================================
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ==========================================
// SOCKET.IO SETUP
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
// ROUTES
// ==========================================

app.get('/', (req, res) => {
  res.json({ message: 'FreeWheels API is running!', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected' });
});

// ==========================================
// API ROUTES - THESE MUST MATCH YOUR FRONTEND
// ==========================================

// Auth routes - /api/auth/register
app.use('/api/auth', require('./auth/auth.routes'));

// User routes - /api/users/*
app.use('/api/users', require('./users/users.routes'));

// Ride routes - /api/rides/*
app.use('/api/rides', require('./rides/rides.routes'));

// Booking routes - /api/bookings/*
app.use('/api/bookings', require('./bookings/bookings.routes'));

// Tracking routes - /api/tracking/*
app.use('/api/tracking', trackingRoutes);

// Admin routes - /api/admin/*
app.use('/api/admin', require('./admin/admin.routes'));

// ==========================================
// 404 HANDLER
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
// ERROR HANDLER
// ==========================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ error: err.message });
});

// ==========================================
// START SERVER
// ==========================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 Available routes:`);
  console.log(`   POST http://localhost:${PORT}/api/auth/register`);
  console.log(`   POST http://localhost:${PORT}/api/auth/login`);
  console.log(`   GET  http://localhost:${PORT}/api/auth/me`);
});