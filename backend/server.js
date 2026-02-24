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
// CORS CONFIGURATION - PRODUCTION READY
// ==========================================
const allowedOrigins = [
  // Local development
  'http://localhost:3000',
  'http://localhost:5500',
  'http://localhost:5501',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:5501',
  // Production frontend URLs
  process.env.FRONTEND_URL,
  'https://fw-mq8p.onrender.com',  
].filter(Boolean); // Remove undefined/null values

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// ==========================================
// SOCKET.IO SETUP
// ==========================================
const io = socketIo(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'] // Support both for compatibility
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);
  
  // Join specific ride room
  socket.on("join-ride", (rideId) => {
    socket.join(`ride-${rideId}`);
    console.log(`Socket ${socket.id} joined ride-${rideId}`);
  });
  
  socket.on("disconnect", () => {
    console.log("User Disconnected:", socket.id);
  });
});

// ==========================================
// ROUTES
// ==========================================

app.get('/', (req, res) => {
  res.json({ 
    message: 'FreeWheels API is running!',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'FreeWheels API is running',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    socketConnections: io.engine.clientsCount
  });
});

// API Routes
app.use('/auth', require('./auth/auth.routes'));
app.use('/users', require('./users/users.routes'));
app.use('/ride', require('./rides/rides.routes'));
app.use('/booking', require('./bookings/bookings.routes'));
app.use('/tracking', trackingRoutes);

// ==========================================
// ERROR HANDLING
// ==========================================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// ==========================================
// START SERVER
// ==========================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
});