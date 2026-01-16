const fs = require("fs");
const path = require("path");

const dataPath = path.join(__dirname, "../data/gestures.json");

exports.saveGesture = (req, res) => {
  const { label, landmarks } = req.body;

  if (!label || !landmarks) {
    return res.status(400).json({ error: "Invalid data" });
  }

  let data = [];
  if (fs.existsSync(dataPath)) {
    data = JSON.parse(fs.readFileSync(dataPath));
  }

  data.push({ label, landmarks, time: Date.now() });
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

  res.json({ message: "Gesture saved" });
};

exports.getGestures = (req, res) => {
  if (!fs.existsSync(dataPath)) return res.json([]);
  const data = JSON.parse(fs.readFileSync(dataPath));
  res.json(data);
};
