const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const gestureRoutes = require("./routes/gestureRoutes");
const searchRoutes = require("./routes/searchRoutes");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

// Routes
app.use("/api/gesture", gestureRoutes);
app.use("/api/search", searchRoutes);

app.get("/", (req, res) => {
  res.send("AbleAssist Backend Running");
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
