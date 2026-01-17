const Gesture = require("../models/Gesture");

exports.saveGesture = async (req, res) => {
  try {
    const { label, landmarks, normalized } = req.body;

    if (!label || !landmarks) {
      return res.status(400).json({ error: "Invalid data" });
    }

    // Save to MongoDB
    const gesture = new Gesture({
      label: label,
      data: landmarks, // normalized 63 landmark values
      normalized: normalized || true
    });

    await gesture.save();

    console.log("✅ TRAINING DATA:", { label, normalized });
    res.json({ message: "Gesture saved to MongoDB", gesture });
  } catch (err) {
    console.error("❌ Error saving gesture:", err);
    res.status(500).json({ error: "Failed to save gesture" });
  }
};

exports.getGestures = async (req, res) => {
  try {
    const gestures = await Gesture.find().sort({ createdAt: -1 });
    console.log("📤 Returning gestures from MongoDB:", gestures.length, "items");
    res.json(gestures);
  } catch (err) {
    console.error("❌ Error loading gestures:", err);
    res.status(500).json({ error: "Failed to load gestures" });
  }
};
