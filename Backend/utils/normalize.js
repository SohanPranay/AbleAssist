exports.normalizeLandmarks = (landmarks) => {
  return landmarks.flat().map(v => Number(v.toFixed(4)));
};
