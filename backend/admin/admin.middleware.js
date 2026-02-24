const User = require('../users/users.model');

// Check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    // Method 1: Check by email domain or specific emails
    const adminEmails = [
      'admin@freewheels.com',
      'niti@gmail.com',
    ];
    
    // Method 2: Check by role field (if you add 'admin' role)
    // const user = await User.findById(req.user.userId);
    // if (user.role !== 'admin') {
    //   return res.status(403).json({ message: 'Admin access required' });
    // }
    
    if (!adminEmails.includes(req.user.email)) {
      return res.status(403).json({ 
        message: 'Admin access required',
        yourEmail: req.user.email 
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Optional: Super admin check (for critical operations)
const isSuperAdmin = async (req, res, next) => {
  const superAdminEmails = ['admin@freewheels.com'];
  
  if (!superAdminEmails.includes(req.user.email)) {
    return res.status(403).json({ message: 'Super admin access required' });
  }
  
  next();
};

module.exports = { isAdmin, isSuperAdmin };