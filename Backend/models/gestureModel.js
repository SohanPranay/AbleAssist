class Gesture {
  constructor(label, landmarks) {
    this.label = label;
    this.landmarks = landmarks;
    this.createdAt = Date.now();
  }
}

module.exports = Gesture;
