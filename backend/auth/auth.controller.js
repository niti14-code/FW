const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../users/users.model');

// Helper function to normalize email
const normalizeEmail = (email) => email.toLowerCase().trim();

// Register user
const register = async (req, res) => {
  try {
    const { name, email, password, phone, role, college } = req.body;
    
    const normalizedEmail = normalizeEmail(email);
    
    // Check if user already exists with normalized email
    let user = await User.findOne({ email: normalizedEmail });
    
    if (user) {
      return res.status(400).json({ 
        message: 'User already exists',
        debug: { existingEmail: user.email }
      });
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    user = new User({
      name, 
      email: normalizedEmail, // Always store normalized email
      password: hashedPassword, 
      phone, 
      role, 
      college: role === 'admin' ? undefined : college
    });
    
    await user.save();
    
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        college: user.college,
        phone: user.phone
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const normalizedEmail = normalizeEmail(email);
    
    // Find user with normalized email
    const user = await User.findOne({ email: normalizedEmail });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: { 
        id: user._id, 
        name: user.name,    
        email: user.email,  
        role: user.role,     
        college: user.college,
        phone: user.phone
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get current user
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  register,
  login,
  getMe
};