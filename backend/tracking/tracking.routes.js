const express = require("express");
const router = express.Router();
const controller = require("./tracking.controller");
const auth = require('../middleware/auth'); 

// UPDATE LOCATION - Protected
router.post("/update", auth, controller.updateLocation);

// GET TRACKING - Protected
router.get("/:rideId", auth, controller.getTracking);

// END RIDE - Protected
router.post("/end", auth, controller.endRide);

module.exports = router;