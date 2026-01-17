// ===============================
// 1. IMPORTS
// ===============================
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");

// Routes
const gestureRoutes = require("./routes/gestureRoutes");
const searchRoutes = require("./routes/searchRoutes");

// Models
const Gesture = require("./models/Gesture");

// ===============================
// 2. APP INIT
// ===============================
const app = express();

app.use(cors());
app.use(bodyParser.json());

// Debug to confirm correct file is running
console.log("🔥 SERVER.JS FILE LOADED");

// ===============================
// 3. MONGODB CONNECTION (SAFE + VERBOSE)
// ===============================
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is NOT defined in environment variables");
} else {
  console.log("🔑 MONGO_URI detected");

  mongoose
    .connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log("✅ MongoDB connected");
    })
    .catch((err) => {
      console.error("❌ MongoDB connection error:", err);
    });
}

// ===============================
// 4. BASIC ROUTE
// ===============================
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// ===============================
// 5. TRAIN GESTURE (SAVE TO MONGODB)
// ===============================
app.post("/api/train", async (req, res) => {
  try {
    const { label, data } = req.body;

    if (!label || !data || !Array.isArray(data)) {
      return res.status(400).json({ error: "Invalid training data" });
    }

    await Gesture.create({ label, data });

    res.json({ message: "Gesture saved successfully" });
  } catch (err) {
    console.error("❌ Train error:", err);
    res.status(500).json({ error: "Failed to save gesture" });
  }
});

// ===============================
// 6. LOAD ALL GESTURES
// ===============================
app.get("/api/gestures", async (req, res) => {
  try {
    const gestures = await Gesture.find();
    res.json(gestures);
  } catch (err) {
    console.error("❌ Load gestures error:", err);
    res.status(500).json({ error: "Failed to load gestures" });
  }
});

// ===============================
// 7. OTHER ROUTES
// ===============================
app.use("/api/gesture", gestureRoutes);
app.use("/api/search", searchRoutes);

// ===============================
// 8. START SERVER (LAST)
// ===============================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("🚀 Server listening on port", PORT);
});
