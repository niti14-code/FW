const User = require('../users/users.model');

// Submit KYC (Providers: aadhar + drivingLicense + collegeIdCard, Seekers: aadhar + collegeIdCard)
exports.submitKyc = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    const { aadharUrl, drivingLicenseUrl, collegeIdCardUrl, selfieUrl } = req.body;

    // Validate based on role
    const isProvider = ['provider', 'both'].includes(user.role);
    const isSeeker = ['seeker', 'both'].includes(user.role);

    // All users need aadhar and college ID
    if (!aadharUrl || !collegeIdCardUrl) {
      return res.status(400).json({ 
        message: "Aadhar and College ID are required for all users" 
      });
    }

    // Providers also need driving license
    if (isProvider && !drivingLicenseUrl) {
      return res.status(400).json({ 
        message: "Driving License is required for providers" 
      });
    }

    // FIXED: Explicitly set kycStatus to 'pending'
    user.kycDocuments = {
      aadhar: aadharUrl,
      drivingLicense: isProvider ? drivingLicenseUrl : null,
      collegeIdCard: collegeIdCardUrl,
      selfie: selfieUrl || null
    };

    user.kycStatus = 'pending';  // This is the key line!
    user.kycSubmittedAt = new Date();

    await user.save();

    // DEBUG: Log to verify
    console.log('KYC submitted for user:', user._id, 'Status:', user.kycStatus);

    res.json({
      message: "KYC submitted successfully. Waiting for admin approval.",
      kycStatus: user.kycStatus,
      documents: user.kycDocuments
    });

  } catch (error) {
    console.error('KYC submit error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get KYC Status and Documents
exports.getKycStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select("kycStatus kycDocuments role kycSubmittedAt kycVerifiedAt");

    res.json({
      role: user.role,
      kycStatus: user.kycStatus, // 'pending', 'approved', 'rejected', 'not_submitted'
      documents: user.kycDocuments,
      submittedAt: user.kycSubmittedAt,
      verifiedAt: user.kycVerifiedAt
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: Get all pending KYCs
exports.getPendingKyc = async (req, res) => {
  try {
    const pending = await User.find({ kycStatus: 'pending' })
      .select('name email role kycDocuments kycSubmittedAt');
    
    res.json(pending);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: Approve/Reject KYC
exports.reviewKyc = async (req, res) => {
  try {
    const { userId, status, remarks } = req.body; // status: 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.kycStatus = status;
    user.kycRemarks = remarks || '';
    user.kycVerifiedAt = new Date();

    await user.save();

    res.json({
      message: `KYC ${status}`,
      user: {
        id: user._id,
        name: user.name,
        kycStatus: user.kycStatus
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};