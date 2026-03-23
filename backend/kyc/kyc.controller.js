const User = require('../users/users.model');

// Submit KYC (ONLY PROVIDERS)
exports.submitKyc = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    // ❌ Block seekers
    if (!['provider', 'both'].includes(user.role)) {
      return res.status(403).json({ message: "KYC only for providers" });
    }

    const { aadhar, drivingLicense, collegeIdCard } = req.body;

    user.kycDocuments = {
      aadhar,
      drivingLicense,
      collegeIdCard
    };

    user.kycStatus = 'pending';

    await user.save();

    res.json({
      message: "KYC submitted. Waiting for admin approval.",
      kycStatus: user.kycStatus
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Get KYC Status
exports.getKycStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select("kycStatus kycDocuments role");

    res.json({
      role: user.role,
      kycStatus: user.kycStatus,
      documents: user.kycDocuments
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/*const User = require('../users/users.model');

// Submit KYC
exports.submitKyc = async (req, res) => {
  try {
    const { studentId, license } = req.body;

    const user = await User.findById(req.user.userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (studentId !== undefined) {
      user.verified.studentId = studentId;
    }

    if (license !== undefined) {
      user.verified.license = license;
    }

    await user.save();

    res.json({
      message: "KYC submitted successfully",
      verified: user.verified
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Get verification status
exports.getKycStatus = async (req, res) => {
  try {

    const user = await User.findById(req.user.userId).select("verified");

    res.json(user.verified);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};*/