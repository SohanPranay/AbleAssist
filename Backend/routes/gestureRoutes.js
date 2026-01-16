const express = require("express");
const router = express.Router();
const controller = require("../controllers/gestureController");

router.post("/save", controller.saveGesture);
router.get("/all", controller.getGestures);

module.exports = router;
