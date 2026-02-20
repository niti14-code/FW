const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

// These TWO lines MUST come BEFORE routes
app.use(cors());
app.use(express.json());  // ← This parses JSON body
app.use(express.json());  
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
app.use(cors());
// Routes come AFTER
app.use('/auth', require('./auth/auth.routes'));
app.use('/users', require('./users/users.routes'));
app.use('/ride', require('./rides/rides.routes'));
app.use('/booking', require('./bookings/bookings.routes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
