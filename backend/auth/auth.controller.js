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
      vehiclePhoto, vehicleNumber,
      emergencyContact, adminKey
    } = req.body;

    // 🔐 ADMIN KEY VALIDATION
if (role === 'admin') {
  const ADMIN_KEY = 'freewheel'; // or use process.env.ADMIN_KEY

  if (adminKey !== ADMIN_KEY) {
    return res.status(403).json({
      message: 'Invalid admin key. You are not authorized to register as admin.'
    });
  }
}
     // NEW: Check if this email was previously blocked
    const blockedUser = await User.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') },
      blocked: true
    });

    if (blockedUser) {
      return res.status(403).json({ 
        message: 'This account has been blocked. Please contact support for assistance.' 
      });
    }

    // Also check by phone number if blocked
    const blockedPhone = await User.findOne({
      phone: phone,
      blocked: true
    });

    if (blockedPhone) {
      return res.status(403).json({ 
        message: 'This phone number has been blocked. Please contact support.' 
      });
    }

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
        aadhar:         aadhar         || null,
        drivingLicense: drivingLicense || null,
        collegeIdCard:  collegeIdCard  || null,
        selfie:         null,
        vehiclePhoto:   vehiclePhoto   || null,
        vehicleNumber:  vehicleNumber  ? vehicleNumber.toUpperCase() : null,
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

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    console.log('🔐 Login attempt:', email, '| User found:', !!user);

    if (!user) return res.status(400).json({ message: 'No account found with this email. Please register first.' });

    // Check if user is blocked
    if (user.blocked) {
      return res.status(403).json({ 
        message: `Your account has been blocked. Reason: ${user.blockReason}. Contact support for assistance.` 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('🔐 Password match:', isMatch);

    if (!isMatch) return res.status(400).json({ message: 'Incorrect password. Please try again.' });

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
    console.error('❌ Login error:', error);
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
// admin verification using admin key
/*const { adminKey } = req.body;

if (role === 'admin' && adminKey !== 'freewheel') {
  return res.status(403).json({
    message: 'Invalid admin key'
  });
}
*/
const crypto = require("crypto");
const nodemailer = require("nodemailer");

/*const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});*/
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

exports.forgotPassword = async (req, res) => {
  try {

    const { email } = req.body;

    const user = await User.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const resetToken =
      crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire =
      Date.now() + 15 * 60 * 1000;

    await user.save();

    //const resetUrl =
      //`http://localhost:3000/reset-password/${resetToken}`;
    const resetUrl =
  `${process.env.FRONTEND_URL}?resetToken=${resetToken}`
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "CampusRide- Request for Password Reset",
      html: `
        <h2>Password Reset</h2>
        <p>You requested a password reset.</p>
        <p>Click below:</p>
        <a href="${resetUrl}">
          Reset Password
        </a>
      `
    });

    res.json({
      message: "Reset link sent"
    });

  } catch (error) {

    console.error(
      "Forgot password error:",
      error
    );

    res.status(500).json({
      message: "Failed to send reset email"
    });

  }
};

exports.resetPassword = async (req, res) => {

  const { token } = req.params;

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({
      message: "Invalid token"
    });
  }

  user.password = await bcrypt.hash(req.body.password, 10);

  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  res.json({
    message: "Password updated"
  });
};
module.exports = {
  register,
  login,
  getMe,
  forgotPassword: exports.forgotPassword,
  resetPassword: exports.resetPassword
};
//module.exports = { register, login, getMe};

