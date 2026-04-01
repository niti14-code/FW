const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const User   = require('../users/users.model');
const { validateCollegeEmail } = require('../config/collegeDomains');

// ── Register ──────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const {
      name, email, password, phone, role, college,
      aadhar, drivingLicense, collegeIdCard,
      emergencyContact
    } = req.body;

    console.log('🔍 Registration attempt:', { email, name, role });

    // ── College domain validation (skip for admin) ──
    if (role !== 'admin') {
      const { valid, message } = validateCollegeEmail(email, college, role);
      if (!valid) {
        return res.status(400).json({ message: message || 'Please use your official college email address' });
      }
    }

    // Case-insensitive duplicate check
    const existing = await User.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Check if KYC documents were actually provided
    const hasKycDocs = !!(aadhar || collegeIdCard || drivingLicense);
    
    // Determine KYC status - if docs provided during registration, mark as pending
    let kycStatus = 'not_required';
    if (['provider', 'both'].includes(role)) {
      kycStatus = hasKycDocs ? 'pending' : 'not_required';
    } else if (hasKycDocs) {
      // Even seekers can submit KYC during registration if they want
      kycStatus = 'pending';
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      role,
      college: role === 'admin' ? undefined : college,
      kycStatus,
      kycDocuments: {
        aadhar: aadhar || null,
        drivingLicense: drivingLicense || null,
        collegeIdCard: collegeIdCard || null,
        selfie: null // Selfie not collected during registration
      },
      // CRITICAL: Set submission timestamp if documents provided
      kycSubmittedAt: hasKycDocs ? new Date() : undefined,
      emergencyContact: emergencyContact || ''
    });

    await user.save();
    console.log('✅ New user created:', user._id, '| kycStatus:', user.kycStatus, '| hasDocs:', hasKycDocs);

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
        phone: user.phone,
        kycStatus: user.kycStatus
      }
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ── Login ─────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id:        user._id,
        name:      user.name,
        email:     user.email,
        role:      user.role,
        college:   user.college,
        phone:     user.phone,
        kycStatus: user.kycStatus
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Get current user ──────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { register, login, getMe };

/*const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../users/users.model');

// Register user
const register = async (req, res) => {
  try {
    const { name, email, password, phone, role, college } = req.body;

    console.log('🔍 Registration attempt:', { email, name, role });

    // Check existing user
    let existingUser = await User.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ✅ KYC LOGIC (CORRECT PLACE)
    let kycStatus = 'not_required';

    if (role === 'provider' || role === 'both') {
      kycStatus = 'pending';
    }

    // Create user
    const user = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      role,
      college: role === 'admin' ? undefined : college,
      kycStatus
    });

    await user.save();

    console.log('✅ User created:', user.email);

    // Token
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
        phone: user.phone,
        kycStatus: user.kycStatus
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Case-insensitive login
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });
    
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    
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
};*/