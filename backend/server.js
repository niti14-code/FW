const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

// ==========================================
// CORS CONFIGURATION - UPDATE THIS AFTER FRONTEND DEPLOYMENT
// ==========================================
const allowedOrigins = [
  'http://localhost:3000',           // React default
  'http://localhost:5500',           // Live Server (VS Code)
  'http://localhost:5501',           // Live Server alternative
  'http://127.0.0.1:5500',           // Live Server IP
  'http://127.0.0.1:5501',           // Live Server IP alternative
  'https://fw-mq8p.onrender.com'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
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

// Parse JSON body
app.use(express.json());

// ==========================================
// ROUTES
// ==========================================

app.get('/', (req, res) => {
  res.json({ message: 'FreeWheels API is running!' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'FreeWheels API is running',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// API Routes
app.use('/auth', require('./auth/auth.routes'));
app.use('/users', require('./users/users.routes'));
app.use('/ride', require('./rides/rides.routes'));
app.use('/booking', require('./bookings/bookings.routes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));