const User = require('../users/users.model');

// Check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    // Method 1: Check by specific admin emails
    const adminEmails = [
      'admin@freewheels.com',
      'superadmin@freewheels.com',
      // Add more admin emails here
    ];
    
    // Method 2: Check by role field (recommended)
    const user = await User.findById(req.user.userId);
    
    // Allow if email is in admin list OR role is 'admin'
    const isAdminUser = adminEmails.includes(req.user.email) || user.role === 'admin';
    
    if (!isAdminUser) {
      return res.status(403).json({ 
        message: 'Admin access required',
        yourEmail: req.user.email,
        yourRole: user.role
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const isSuperAdmin = async (req, res, next) => {
  const superAdminEmails = ['superadmin@freewheels.com'];
  
  if (!superAdminEmails.includes(req.user.email)) {
    return res.status(403).json({ message: 'Super admin access required' });
  }
  
  next();
};

module.exports = { isAdmin, isSuperAdmin };