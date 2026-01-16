function distance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2);
  }
  return Math.sqrt(sum);
}

exports.classifyGesture = (input, dataset) => {
  let best = null;
  let minDist = Infinity;

  dataset.forEach(sample => {
    const d = distance(input, sample.landmarks);
    if (d < minDist) {
      minDist = d;
      best = sample.label;
    }
  });

  return best;
};
