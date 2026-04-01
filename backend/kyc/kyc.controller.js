const User = require('../users/users.model');
const path = require('path');
const fs = require('fs');

// Submit KYC (Providers: aadhar + drivingLicense + collegeIdCard, Seekers: aadhar + collegeIdCard)
exports.submitKyc = async (req, res) => {
  try {
    console.log('KYC Submit Request Body:', req.body); // DEBUG LOG

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { aadharUrl, drivingLicenseUrl, collegeIdCardUrl, selfieUrl } = req.body;

    // Enhanced validation with specific error messages
    if (!aadharUrl) {
      return res.status(400).json({ message: "Aadhar document is required" });
    }
    if (!collegeIdCardUrl) {
      return res.status(400).json({ message: "College ID document is required" });
    }

    // Validate image format (must be data URL or http URL)
    const isValidImageUrl = (url) => {
      return url && (
        url.startsWith('data:image') || 
        url.startsWith('http://') || 
        url.startsWith('https://')
      );
    };

    if (!isValidImageUrl(aadharUrl)) {
      return res.status(400).json({ message: "Aadhar must be a valid image (data URL or http URL)" });
    }
    if (!isValidImageUrl(collegeIdCardUrl)) {
      return res.status(400).json({ message: "College ID must be a valid image" });
    }

    // Validate based on role
    const isProvider = ['provider', 'both'].includes(user.role);
    if (isProvider && !drivingLicenseUrl) {
      return res.status(400).json({ message: "Driving License is required for providers" });
    }
    if (isProvider && drivingLicenseUrl && !isValidImageUrl(drivingLicenseUrl)) {
      return res.status(400).json({ message: "Driving License must be a valid image" });
    }

    // Save documents
    user.kycDocuments = {
      aadhar: aadharUrl,
      drivingLicense: isProvider ? drivingLicenseUrl : null,
      collegeIdCard: collegeIdCardUrl,
      selfie: selfieUrl || null
    };

    user.kycStatus = 'pending';
    user.kycSubmittedAt = new Date();

    await user.save();

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
    // Only get users who have ACTUALLY submitted documents
    const pending = await User.find({ 
      kycStatus: 'pending',
      $or: [
        { 'kycDocuments.aadhar': { $ne: null } },
        { 'kycDocuments.collegeIdCard': { $ne: null } }
      ]
    }).select('name email role kycDocuments kycSubmittedAt');
    
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

// Serve KYC document image

exports.getDocumentImage = async (req, res) => {
  try {
    const { userId, docType } = req.params;
    
    // Validate docType
    const validDocTypes = ['aadhar', 'collegeIdCard', 'drivingLicense', 'selfie'];
    if (!validDocTypes.includes(docType)) {
      return res.status(400).json({ message: 'Invalid document type' });
    }

    const user = await User.findById(userId);
    if (!user || !user.kycDocuments || !user.kycDocuments[docType]) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const filename = user.kycDocuments[docType];
    
    // If it's base64 or URL, redirect to it
    if (filename.startsWith('data:') || filename.startsWith('http')) {
      return res.redirect(filename);
    }

    // Otherwise, serve from uploads folder
    const uploadDir = process.env.UPLOAD_DIR || './uploads/kyc';
    const filePath = path.join(uploadDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    // Set proper content type
    const ext = path.extname(filename).toLowerCase();
    const contentType = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif'
    }[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('Error serving document:', error);
    res.status(500).json({ error: error.message });
  }
};