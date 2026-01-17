const mongoose = require("mongoose");

const GestureSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
  },
  data: {
    type: [Number], // normalized 63 landmark values
    required: true,
    validate: {
      validator: function(arr) {
        return arr.length === 63; // Must be exactly 63 normalized values
      },
      message: 'Data must contain exactly 63 normalized landmark values'
    }
  },
  normalized: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Add index for better query performance
GestureSchema.index({ label: 1 });
GestureSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Gesture", GestureSchema);
