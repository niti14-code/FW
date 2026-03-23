const Incident = require('./incidents.model');

// ── Report incident ───────────────────────────────────────────────
exports.reportIncident = async (req, res) => {
  try {
    const { rideId, rideDescription, type, description, severity, location } = req.body;

    if (!description) {
      return res.status(400).json({ message: 'Description is required' });
    }

    const incident = new Incident({
      rideId:          rideId || undefined,      // optional ObjectId
      rideDescription: rideDescription || undefined,
      reportedBy:      req.user.userId,
      type:            type || 'other',
      description,
      severity:        severity || 'medium',
      location,
    });

    await incident.save();
    console.log('✅ Incident reported:', incident._id, '| type:', type);
    res.status(201).json({ message: 'Incident reported', incident });
  } catch (err) {
    console.error('❌ reportIncident error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// ── Add evidence ──────────────────────────────────────────────────
exports.addEvidence = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ message: 'Incident not found' });

    // Only the reporter can add evidence
    if (String(incident.reportedBy) !== String(req.user.userId)) {
      return res.status(403).json({ message: 'Not authorised' });
    }

    incident.evidence.push(...(req.body.evidence || []));
    await incident.save();
    res.json({ message: 'Evidence added', incident });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Get my incidents ──────────────────────────────────────────────
exports.getMyIncidents = async (req, res) => {
  try {
    const incidents = await Incident.find({ reportedBy: req.user.userId })
      .populate('rideId', 'date time pickup drop')
      .sort({ createdAt: -1 });
    res.json(incidents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Get all incidents (admin) ─────────────────────────────────────
exports.getAllIncidents = async (req, res) => {
  try {
    const incidents = await Incident.find()
      .populate('rideId', 'date time')
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(incidents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Export to authorities (user can self-export their own incidents) ──
exports.exportIncident = async (req, res) => {
  try {
    const filter = req.user.isAdmin
      ? { _id: req.params.id }
      : { _id: req.params.id, reportedBy: req.user.userId };

    const incident = await Incident.findOne(filter)
      .populate('rideId')
      .populate('reportedBy', 'name email phone');

    if (!incident) return res.status(404).json({ message: 'Incident not found' });

    incident.status    = 'exported_to_authorities';
    incident.exportedAt = new Date();
    incident.exportRef  = `CR-${incident._id.toString().slice(-8).toUpperCase()}-${Date.now()}`;
    await incident.save();

    console.log('📤 Incident exported:', incident.exportRef);
    res.json({ message: 'Incident exported', exportRef: incident.exportRef, incident });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};