const Incident = require('./incidents.model');

exports.reportIncident = async (req, res) => {
  try {
    const { rideId, type, description, severity, location } = req.body;
    const incident = new Incident({
  rideId,
  reportedBy: req.user.userId,
  type,
  description,
  severity,
  location
});
    await incident.save();
    res.status(201).json({ message: 'Incident reported', incident });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.addEvidence = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ message: 'Incident not found' });
    incident.evidence.push(...(req.body.evidence || []));
    await incident.save();
    res.json({ message: 'Evidence added', incident });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getMyIncidents = async (req, res) => {
  try {
    const incidents = await Incident.find({ reportedBy: req.user.userId })
      .populate('rideId','date time pickup drop').sort({ createdAt: -1 });
    res.json(incidents);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getAllIncidents = async (req, res) => {
  try {
    const incidents = await Incident.find()
      .populate('rideId','date time').populate('reportedBy','name email').sort({ createdAt: -1 });
    res.json(incidents);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.exportIncident = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('rideId').populate('reportedBy','name email phone');
    if (!incident) return res.status(404).json({ message: 'Incident not found' });
    incident.status = 'exported_to_authorities';
    incident.exportedAt = new Date();
    incident.exportRef = `FW-${incident._id.toString().slice(-8).toUpperCase()}-${Date.now()}`;
    await incident.save();
    res.json({ message: 'Incident exported', exportRef: incident.exportRef, incident });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
