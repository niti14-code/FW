const User = require('../users/users.model');

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
};