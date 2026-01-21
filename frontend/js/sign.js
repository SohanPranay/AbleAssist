const video = document.getElementById("camera");
const statusText = document.getElementById("status");

const wifiBox = document.getElementById('wifiBox');
const themeBox = document.getElementById('themeBox');
const accessBox = document.getElementById('accessBox');
const onlineToggle = document.getElementById('onlineToggle');
const profileBtn = document.getElementById('profileBtn');
const feedbackBtn = document.getElementById('feedbackBtn');
const helpBtn = document.getElementById('helpBtn');
const gestureBookBtn = document.getElementById('gestureBookBtn');
const trainToggleBtn = document.getElementById('trainToggleBtn');
// modal elements will be created dynamically if needed
// camera state handled by presence of video.srcObject
const detectedLetterSpan = document.getElementById('detectedLetter');
const resultText = document.getElementById('resultText');
const clearTextBtn = document.getElementById('clearText');
const backspaceTextBtn = document.getElementById('backspaceText');
const emotionDisplay = document.getElementById('emotionDisplay');
const searchToggleBtn = document.getElementById('searchToggleBtn');
const searchInput = document.getElementById('searchInput');
// Optional search box on MultiMode page – used to mirror detected text into search.
function getVoiceSearchInput() {
  return document.getElementById('voiceSearchInput') || document.getElementById('voiceSearch');
}
const voiceSearchBox = getVoiceSearchInput();

// In-memory training store (normalized landmark arrays per label)
const trainingData = {};

// ===== GESTURE BOOK SEARCH LISTENER =====
if (searchInput) {
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    const items = document.querySelectorAll('.gesture-item');
    items.forEach(item => {
      const text = item.innerText.toLowerCase();
      item.style.display = text.includes(query) ? 'block' : 'none';
    });
  });
}

// Global current landmarks for ML
let currentLandmarks = null;

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true
    });
    video.srcObject = stream;
    // try to play the video element explicitly
    try {
      await video.play();
    } catch (playErr) {
      console.warn('video.play() failed:', playErr);
    }
    statusText.innerText = "Detecting gesture...";
    // Start the proper camera loop for MediaPipe
    cameraLoop();
    // optional: motion detection if the page provides a canvas
    startMotionDetection();
    // update camera toggle UI
    const btn = document.getElementById('cameraToggleBtn');
    if (btn) btn.innerText = 'Camera Off';
  } catch (error) {
    console.error('startCamera error:', error);
    // provide clearer message to user
    if (error && error.name === 'NotAllowedError') {
      statusText.innerText = 'Camera permission denied — check browser permissions';
    } else if (error && error.name === 'NotFoundError') {
      statusText.innerText = 'No camera found';
    } else {
      statusText.innerText = 'Camera failed to start';
    }
  }
}

function retryCamera() {
  statusText.innerText = "Restarting camera...";
  startCamera();
}


function goBack() {
  window.location.href = "index.html"; // main page
}

// --- new UI behavior ---
function toggleWifi() {
  const active = wifiBox.classList.toggle('active');
  wifiBox.setAttribute('aria-pressed', String(active));
  wifiBox.title = active ? 'Wi‑Fi: Connected' : 'Wi‑Fi: Disconnected';
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark');
  themeBox.setAttribute('aria-pressed', String(isDark));
  themeBox.title = isDark ? 'Switch to light' : 'Switch to dark';
}

function toggleAccessibility() {
  const isAcc = document.body.classList.toggle('accessible');
  accessBox.setAttribute('aria-pressed', String(isAcc));
  accessBox.title = isAcc ? 'Accessibility on' : 'Accessibility off';
}

function toggleOnline() {
  const isOffline = onlineToggle.classList.toggle('toggle-offline');
  onlineToggle.innerText = isOffline ? 'Offline' : 'Online';
}

function openProfile() {
  alert('Profile clicked — implement profile view.');
}

function openFeedback() {
  const msg = prompt('Send feedback (demo):');
  if (msg) alert('Thanks for the feedback!');
}

function openHelp() {
  alert('Help: Point camera to your hands and use retry if camera is blocked.');
}

// --- Motion detection (simple frame-difference heuristic) ---
let motionInterval = null;
let lastImageData = null;
const motionCanvas = document.getElementById('motionCanvas');
const mCtx = motionCanvas ? motionCanvas.getContext('2d') : null;

// Proper camera → MediaPipe pipeline
async function cameraLoop() {
  if (video.readyState >= 2) {
    try {
      if (hands) {
        await hands.send({ image: video });
      }
    } catch (e) {
      console.warn('hands.send failed:', e);
    }
  }
  requestAnimationFrame(cameraLoop);
}

function startMotionDetection() {
  if (!mCtx || !video) return;
  if (motionInterval) clearInterval(motionInterval);
  lastImageData = null;
  motionInterval = setInterval(() => {
    doDetect();
  }, 220);
}

function doDetect() {
  try {
    const w = motionCanvas.width;
    const h = motionCanvas.height;
    mCtx.drawImage(video, 0, 0, w, h);
    const frame = mCtx.getImageData(0, 0, w, h);
    if (!lastImageData) {
      lastImageData = frame.data.slice();
      return;
    }

    // compare pixels (sample every 4th pixel to speed up)
    let diff = 0;
    const len = frame.data.length;
    for (let i = 0; i < len; i += 16) {
      diff += Math.abs(frame.data[i] - lastImageData[i]);
      diff += Math.abs(frame.data[i+1] - lastImageData[i+1]);
      diff += Math.abs(frame.data[i+2] - lastImageData[i+2]);
    }

    // normalize diff
    const maxPerSample = 255 * 3;
    const samples = len / 16;
    const norm = diff / (maxPerSample * samples);

    lastImageData = frame.data.slice();

    const threshold = 0.02; // tune: higher = less sensitive
    if (norm > threshold) {
      showGestureActive(true);
    } else {
      showGestureActive(false);
    }
  } catch (e) {
    // ignore
  }
}

let gestureVisibleTimeout = null;
function showGestureActive(on) {
  clearTimeout(gestureVisibleTimeout);
  if (on) {
    statusText.classList.remove('hidden');
    statusText.classList.add('active');
    statusText.innerText = 'Gesture detected';
    // keep visible while motion continues; hide after 1s of silence
    gestureVisibleTimeout = setTimeout(() => showGestureActive(false), 1000);
  } else {
    statusText.classList.remove('active');
    statusText.classList.add('hidden');
    statusText.innerText = 'Detecting gesture...';
  }
}

function stopCamera() {
  if (video && video.srcObject) {
    const tracks = video.srcObject.getTracks();
    tracks.forEach(t => t.stop());
    video.srcObject = null;
  }
  stopPerceptionLoop();
  statusText.classList.remove('hidden');
  statusText.classList.remove('active');
  statusText.innerText = 'Camera off';
  const btn = document.getElementById('cameraToggleBtn');
  if (btn) btn.innerText = 'Camera On/Off';
}

// --- Gesture Book modal ---
// ASL alphabet arranged to match the visual grid (Delete after D, Space after S)
const gestures = [
  { name: 'A', meaning: 'Letter A', img: 'images/gestures/A.svg' },
  { name: 'B', meaning: 'Letter B', img: 'images/gestures/B.svg' },
  { name: 'C', meaning: 'Letter C', img: 'images/gestures/C.svg' },
  { name: 'D', meaning: 'Letter D', img: 'images/gestures/D.svg' },
  { name: 'Delete', meaning: 'Delete / backspace', img: 'images/gestures/Delete.svg' },
  { name: 'E', meaning: 'Letter E', img: 'images/gestures/E.svg' },
  { name: 'F', meaning: 'Letter F', img: 'images/gestures/F.svg' },

  { name: 'G', meaning: 'Letter G', img: 'images/gestures/G.svg' },
  { name: 'H', meaning: 'Letter H', img: 'images/gestures/H.svg' },
  { name: 'I', meaning: 'Letter I', img: 'images/gestures/I.svg' },
  { name: 'J', meaning: 'Letter J', img: 'images/gestures/J.svg' },
  { name: 'K', meaning: 'Letter K', img: 'images/gestures/K.svg' },
  { name: 'L', meaning: 'Letter L', img: 'images/gestures/L.svg' },
  { name: 'M', meaning: 'Letter M', img: 'images/gestures/M.svg' },

  { name: 'N', meaning: 'Letter N', img: 'images/gestures/N.svg' },
  { name: 'O', meaning: 'Letter O', img: 'images/gestures/O.svg' },
  { name: 'P', meaning: 'Letter P', img: 'images/gestures/P.svg' },
  { name: 'Q', meaning: 'Letter Q', img: 'images/gestures/Q.svg' },
  { name: 'R', meaning: 'Letter R', img: 'images/gestures/R.svg' },
  { name: 'S', meaning: 'Letter S', img: 'images/gestures/S.svg' },
  { name: 'Space', meaning: 'Space', img: 'images/gestures/Space.svg' },

  { name: 'T', meaning: 'Letter T', img: 'images/gestures/T.svg' },
  { name: 'U', meaning: 'Letter U', img: 'images/gestures/U.svg' },
  { name: 'V', meaning: 'Letter V', img: 'images/gestures/V.svg' },
  { name: 'W', meaning: 'Letter W', img: 'images/gestures/W.svg' },
  { name: 'X', meaning: 'Letter X', img: 'images/gestures/X.svg' },
  { name: 'Y', meaning: 'Letter Y', img: 'images/gestures/Y.svg' },
  { name: 'Z', meaning: 'Letter Z', img: 'images/gestures/Z.svg' }
];

function createGestureModal() {
  let modal = document.getElementById('gestureModal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'gestureModal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Gesture Book</h3>
        <div class="modal-buttons">
          <button id="gesturePrint" class="modal-btn">Print</button>
          <button id="gestureClose" class="modal-btn close-btn">Close</button>
        </div>
      </div>
      <div id="gestureList" class="gesture-grid"></div>
    </div>`;
  document.body.appendChild(modal);
  
  // Add event listeners with proper error handling
  const closeBtn = document.getElementById('gestureClose');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('open');
      console.log('Modal closed');
    });
  }
  
  const printBtn = document.getElementById('gesturePrint');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      console.log('Print button clicked');
      try {
        window.print();
      } catch (e) {
        console.error('Print failed:', e);
        alert('Print functionality is not available in this browser');
      }
    });
  }
  
  modal.addEventListener('click', (e) => { 
    if (e.target === modal) {
      modal.classList.remove('open');
    }
  });
  
  return modal;
}

function hideGestureModal(modal) {
  if (!modal) return;
  try { modal.classList.remove('open'); } catch (_) {}
  try { modal.setAttribute('aria-hidden', 'true'); } catch (_) {}
  try { modal.style.display = 'none'; } catch (_) {}
}

function showGestureModal(modal) {
  if (!modal) return;
  try { modal.classList.add('open'); } catch (_) {}
  try { modal.setAttribute('aria-hidden', 'false'); } catch (_) {}
  try { modal.style.display = 'flex'; } catch (_) {}
}

function downloadTrainingBackup() {
  try {
    const blob = new Blob([JSON.stringify(trainingData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gestureTrainingData.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  } catch (e) {
    console.warn('Failed to download training backup:', e);
  }
}

function bindGestureBookControls() {
  const modal = document.getElementById('gestureModal');
  const closeBtnA = document.getElementById('gestureClose');
  const closeBtnB = document.getElementById('closeGestureModal');
  const printBtnA = document.getElementById('gesturePrint');
  const printBtnB = document.getElementById('printGestureBtn');

  const bindOnce = (el, key, handler) => {
    if (!el) return;
    if (el.dataset && el.dataset[key] === '1') return;
    if (el.dataset) el.dataset[key] = '1';
    el.addEventListener('click', handler);
    el.addEventListener('mousedown', (e) => e.stopPropagation());
  };

  bindOnce(closeBtnA, 'boundClose', (e) => {
    e.preventDefault();
    e.stopPropagation();
    hideGestureModal(modal);
  });
  bindOnce(closeBtnB, 'boundClose', (e) => {
    e.preventDefault();
    e.stopPropagation();
    hideGestureModal(modal);
  });

  const doPrintAndSave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try { saveTrainingData(); } catch (_) {}
    try { downloadTrainingBackup(); } catch (_) {}
    try { window.print(); } catch (err) {
      console.error('Print failed:', err);
      alert('Print failed. Please allow popups / printing for this site.');
    }
  };

  bindOnce(printBtnA, 'boundPrint', doPrintAndSave);
  bindOnce(printBtnB, 'boundPrint', doPrintAndSave);

  if (modal && !modal.dataset.boundBackdrop) {
    modal.dataset.boundBackdrop = '1';
    modal.addEventListener('click', (e) => {
      if (e.target === modal) hideGestureModal(modal);
    });
  }
}

function openGestureBook() {
  // Prefer using an existing modal markup (voice.html) if present to avoid duplicate modals
  const modal = document.getElementById('gestureModal') || createGestureModal();
  bindGestureBookControls();
  const list = document.getElementById('gestureList');
  // If the older createGestureModal structure exists (with #gestureList), populate it
  if (list) {
    list.innerHTML = '';
    gestures.forEach(g => {
      const el = document.createElement('div');
      el.className = 'gesture-item';
      el.innerHTML = `
        <div class="gesture-label"><strong>${g.name}</strong></div>
        <img src="${g.img}" alt="${g.name}" class="gesture-img" />
        <div class="gesture-meaning">${g.meaning}</div>`;
      el.addEventListener('click', () => {
        if (!trainMode) return;
        // Use the new captureSample function
        captureSample(g.name);
        const samples = trainingData[g.name] ? trainingData[g.name].length : 0;
        alert(`Saved sample for letter ${g.name} (total: ${samples}).`);
      });
      list.appendChild(el);
    });
    // older modal used .open class
    showGestureModal(modal);
    return;
  }

  // Fallback: if the page provides a gestureGrid / gesturePreview (voice.html), populate that instead
  const gestureGrid = document.getElementById('gestureGrid');
  const gesturePreview = document.getElementById('gesturePreview');
  if (gestureGrid) {
    gestureGrid.innerHTML = '';
    gestures.forEach(g => {
      const item = document.createElement('div'); item.className = 'gesture-item';
      const label = document.createElement('div'); label.className = 'ltr'; label.textContent = g.name;
      const img = document.createElement('img'); img.src = g.img; img.alt = g.name;
      item.appendChild(label); item.appendChild(img);
      item.addEventListener('click', () => {
        if (trainMode) {
          // Use the new captureSample function
          captureSample(g.name);
          const samples = trainingData[g.name] ? trainingData[g.name].length : 0;
          alert(`Saved sample for letter ${g.name} (total: ${samples}).`);
        } else {
          if (!gesturePreview) return;
          gesturePreview.innerHTML = '';
          const big = document.createElement('img'); big.src = g.img; big.alt = g.name; big.style.width = '140px'; big.style.height = '140px'; big.style.objectFit = 'contain'; big.style.border = '1px solid #ddd'; big.style.padding = '8px'; big.style.background = '#fff';
          const lab = document.createElement('div'); lab.style.fontWeight='800'; lab.textContent = g.name;
          const meaningEl = document.createElement('div'); meaningEl.style.fontSize='13px'; meaningEl.style.color='#555'; meaningEl.textContent = g.meaning || '';
          gesturePreview.appendChild(big); gesturePreview.appendChild(lab); gesturePreview.appendChild(meaningEl);
        }
      });
      gestureGrid.appendChild(item);
    });
    showGestureModal(modal);
    return;
  }

  // Last-resort: populate whichever container exists
  try {
    const fallbackList = document.getElementById('gestureList') || document.getElementById('gestureGrid');
    if (fallbackList) {
      fallbackList.innerHTML = '';
      gestures.forEach(g => {
        const el = document.createElement('div'); el.className = 'gesture-item'; el.innerHTML = `<div class="gesture-label"><strong>${g.name}</strong></div><img src="${g.img}" alt="${g.name}" class="gesture-img" />`;
        fallbackList.appendChild(el);
      });
      showGestureModal(modal);
    }
  } catch (e) { /* ignore */ }
}

if (gestureBookBtn) gestureBookBtn.addEventListener('click', openGestureBook);

if (wifiBox) wifiBox.addEventListener('click', toggleWifi);
if (themeBox) themeBox.addEventListener('click', toggleTheme);
if (accessBox) accessBox.addEventListener('click', toggleAccessibility);
if (onlineToggle) onlineToggle.addEventListener('click', toggleOnline);
if (profileBtn) profileBtn.addEventListener('click', openProfile);
if (feedbackBtn) feedbackBtn.addEventListener('click', openFeedback);
if (helpBtn) helpBtn.addEventListener('click', openHelp);

// Add a simple camera toggle button handler
const cameraToggleBtn = document.getElementById('cameraToggleBtn');
if (cameraToggleBtn) cameraToggleBtn.addEventListener('click', () => {
  if (video && video.srcObject) {
    stopCamera();
  } else {
    startCamera();
  }
});

// flip preview control (mirror/unmirror)
const flipCameraBtn = document.getElementById('flipCameraBtn');
let isMirrored = false;
function setMirrored(v) {
  isMirrored = !!v;
  if (video) video.classList.toggle('mirror', isMirrored);
  if (flipCameraBtn) flipCameraBtn.innerText = isMirrored ? 'Unflip Preview' : 'Flip Preview';
  // update MediaPipe options if initialized
  try {
    if (hands) hands.setOptions(Object.assign({}, hands._config || {}, { selfieMode: isMirrored }));
  } catch (e) {}
  try {
    if (faceMesh) faceMesh.setOptions(Object.assign({}, faceMesh._config || {}, { selfieMode: isMirrored }));
  } catch (e) {}
}
if (flipCameraBtn) flipCameraBtn.addEventListener('click', () => setMirrored(!isMirrored));

// training templates and recognition state
let trainMode = false;
// Legacy templates object (kept for backward compatibility with image-based template build).
const templates = {}; // name -> { sum: Float32Array, count }
let lastLandmarks = null;
let detectCounts = {};
let lastAccepted = null;
const STABLE_FRAMES = 3; // require N consecutive frames for acceptance
const MATCH_THRESHOLD = 0.12; // tune: lower for stricter match

if (trainToggleBtn) trainToggleBtn.addEventListener('click', () => {
  trainMode = !trainMode;
  trainToggleBtn.classList.toggle('active', trainMode);
  trainToggleBtn.innerText = trainMode ? 'Training: ON' : 'Train Mode';
  
  // Reset current label when toggling training mode
  if (!trainMode) {
    currentLabel = null;
  }
  
  console.log('Training mode:', trainMode ? 'ON' : 'OFF');
});

if (clearTextBtn) clearTextBtn.addEventListener('click', () => { if (resultText) resultText.value = ''; });
if (backspaceTextBtn) backspaceTextBtn.addEventListener('click', () => { if (resultText) resultText.value = resultText.value.slice(0,-1); });
if (searchToggleBtn) searchToggleBtn.addEventListener('click', () => {
  if (!searchInput) return; searchInput.style.display = searchInput.style.display === 'none' ? 'block' : 'none';
});

// helper: snapshot of last landmarks (set by onHandsResults)
function lastLandmarksSnapshot() {
  return lastLandmarks ? lastLandmarks : null;
}

// ----- LANDMARK NORMALIZATION (Device-Independent ML) -----
function normalizeLandmarks(landmarks) {
  const wrist = landmarks[0];

  // Step 1: translate so wrist = (0,0,0)
  const translated = landmarks.map(pt => ({
    x: pt.x - wrist.x,
    y: pt.y - wrist.y,
    z: pt.z - wrist.z
  }));

  // Step 2: compute hand size (wrist → middle finger tip)
  const ref = translated[12];
  const handSize = Math.sqrt(
    ref.x * ref.x +
    ref.y * ref.y +
    ref.z * ref.z
  ) || 1; // avoid divide by zero

  // Step 3: scale + flatten
  const normalized = [];
  translated.forEach(pt => {
    normalized.push(
      pt.x / handSize,
      pt.y / handSize,
      pt.z / handSize
    );
  });

  console.log('🔍 STEP 2 - NORMALIZATION CHECK:');
  console.log('Normalized length:', normalized.length); // Must be 63
  console.log('First 3 values:', normalized.slice(0, 3));
  console.log('Hand size:', handSize);

  return normalized; // length = 63
}

// Euclidean distance for gesture comparison
function euclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

// Predict gesture using normalized landmarks
function predictGestureNormalized(input, dataset) {
  let bestLabel = null;
  let bestScore = Infinity;

  for (const label in dataset) {
    for (const sample of dataset[label]) {
      const dist = euclideanDistance(input, sample);
      if (dist < bestScore) {
        bestScore = dist;
        bestLabel = label;
      }
    }
  }
  return bestLabel;
}

// Convert landmarks to flattened array for ML (legacy - kept for compatibility)
function landmarksToArray(landmarks) {
  return landmarks.flatMap(p => [p.x, p.y, p.z]);
}

function landmarksToDescriptor(lm) {
  // flatten normalized landmarks relative to wrist and scaled
  const w = lm[0];
  const refDist = Math.hypot(lm[9].x - w.x, lm[9].y - w.y) || 0.0001; // use middle_mcp as scale
  const vec = new Float32Array(42);
  for (let i = 0; i < 21; i++) {
    vec[i*2] = (lm[i].x - w.x) / refDist;
    vec[i*2+1] = (lm[i].y - w.y) / refDist;
  }
  return vec;
}

// MediaPipe Hands init
let hands = null;
function initHands() {
  if (typeof Hands === 'undefined') return;
  hands = new Hands({ 
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` 
  });
  
  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7,
    selfieMode: isMirrored
  });
  
  hands.onResults(results => {
    if (results.multiHandLandmarks?.length) {
      currentLandmarks = results.multiHandLandmarks[0];
    } else {
      currentLandmarks = null;
    }
    
    // Call the existing handler for compatibility
    onHandsResults(results);
  });
}

// FaceMesh init (for simple emotion heuristics)
let faceMesh = null;
function initFaceMesh() {
  if (typeof FaceMesh === 'undefined') return;
  faceMesh = new FaceMesh({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
  faceMesh.setOptions({ selfieMode: isMirrored, maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
  faceMesh.onResults(onFaceResults);
}

function onFaceResults(results) {
  try {
    if (!results || !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      if (emotionDisplay) emotionDisplay.innerText = 'Emotion: -';
      return;
    }
    const lm = results.multiFaceLandmarks[0];
    const emotion = estimateEmotionFromFace(lm);
    if (emotionDisplay) emotionDisplay.innerText = 'Emotion: ' + emotion;
  } catch (e) {
    // ignore
  }
}

function estimateEmotionFromFace(lm) {
  // landmarks indices chosen for robustness across meshes
  const idx = (i) => lm[i];
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // mouth corners (approx): 61 (left) and 291 (right)
  const leftMouth = idx(61);
  const rightMouth = idx(291);
  // upper/lower lip (approx): 13 (upper), 14 (lower)
  const upperLip = idx(13);
  const lowerLip = idx(14);
  // eye outer points for scale: 33 (left eye outer), 263 (right eye outer)
  const leftEye = idx(33);
  const rightEye = idx(263);

  const mouthWidth = dist(leftMouth, rightMouth);
  const mouthOpen = dist(upperLip, lowerLip);
  const eyeDist = dist(leftEye, rightEye) || 0.0001;

  const smileRatio = mouthWidth / eyeDist;
  const openRatio = mouthOpen / eyeDist;

  // heuristics (may need tuning):
  if (openRatio > 0.35) return 'Surprised';
  if (smileRatio > 0.52) return 'Happy';
  return 'Neutral';
}

// API Configuration
const API_BASE = "https://ableassist-project.onrender.com";

// Global gestures array - loaded from MongoDB on every app start
let trainedGestures = [];

// Merge a single sample into in-memory stores
function addSampleToStores(label, sample) {
  if (!label || !Array.isArray(sample)) return;
  if (!trainingData[label]) trainingData[label] = [];
  trainingData[label].push(sample);
}

// Rebuild the KNN and legacy fallback stores from trainingData (MongoDB + cache)
async function hydrateClassifierFromTrainingData() {
  const classifier = ensureKNN();

  // Clear any previous session data
  if (classifier && classifier.clearAllClasses) {
    try { classifier.clearAllClasses(); } catch (e) { console.warn('clearAllClasses failed', e); }
  }
  try {
    Object.keys(legacyTrainingData).forEach((k) => delete legacyTrainingData[k]);
  } catch (_) {}

  let added = 0;

  Object.entries(trainingData).forEach(([label, samples]) => {
    if (!Array.isArray(samples)) return;
    samples.forEach((sample) => {
      if (!Array.isArray(sample)) return;

      // Feed modern KNN classifier
      if (classifier && typeof tf !== 'undefined') {
        tf.tidy(() => {
          const tensor = tf.tensor(sample).expandDims(0);
          classifier.addExample(tensor, label);
        });
      }

      // Keep legacy mean-descriptor fallback aligned to the same data
      if (!legacyTrainingData[label]) {
        legacyTrainingData[label] = { sum: new Float32Array(sample.length), count: 0 };
      }
      const store = legacyTrainingData[label];
      store.count += 1;
      for (let i = 0; i < sample.length; i++) {
        store.sum[i] += sample[i];
      }

      added += 1;
    });
  });

  console.log('Hydrated classifier from training data samples:', added);
}

// Build trainedGestures list from the current trainingData map
function rebuildTrainedGesturesFromTrainingData() {
  trainedGestures = [];
  Object.entries(trainingData).forEach(([label, samples]) => {
    if (!Array.isArray(samples)) return;
    samples.forEach((sample) => {
      if (!Array.isArray(sample)) return;
      trainedGestures.push({ label, data: sample });
    });
  });
}

// Generic fetch + merge helper for gesture endpoints
async function mergeGesturesFromEndpoint(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn('Failed to load gestures from', url, res.statusText);
      return;
    }
    const gestures = await res.json();
    if (!Array.isArray(gestures)) {
      console.warn('Unexpected gestures payload from', url);
      return;
    }

    gestures.forEach((gesture) => {
      const label = gesture.label;
      const sample = gesture.data || gesture.landmarks;
      addSampleToStores(label, sample);
    });

    console.log('Merged gestures from', url, 'count:', gestures.length);
  } catch (error) {
    console.error('Failed to load gestures from', url, error);
  }
}

// Load gestures from MongoDB and merge into the local cache
async function loadGestures() {
  await mergeGesturesFromEndpoint(`${API_BASE}/api/gestures`);
  return trainingData;
}

// Load gestures immediately when script loads
loadGestures();

// Load training data from backend API (now expecting normalized landmarks)
async function loadFromBackend() {
  try {
    const response = await fetch(`${API_BASE}/api/gesture/all`);
    if (!response.ok) {
      console.warn('Failed to load gestures from backend:', response.statusText);
      return;
    }
    
    const backendGestures = await response.json();
    
    // Merge backend data with local training data
    if (backendGestures && Array.isArray(backendGestures)) {
      backendGestures.forEach(gesture => {
        if (gesture.label && gesture.landmarks) {
          if (!trainingData[gesture.label]) {
            trainingData[gesture.label] = [];
          }
          // Backend data should already be normalized, but we'll check
          if (gesture.normalized) {
            trainingData[gesture.label].push(gesture.landmarks);
          } else {
            // Legacy data - normalize it before adding
            if (Array.isArray(gesture.landmarks) && gesture.landmarks.length === 63) {
              // Already flattened normalized data
              trainingData[gesture.label].push(gesture.landmarks);
            } else {
              // Raw landmarks - need to normalize (unlikely with new backend)
              console.warn('Received non-normalized data from backend - skipping');
            }
          }
        }
      });
      
      // Save merged data to localStorage
      localStorage.setItem('gestureTrainingData', JSON.stringify(trainingData));
      console.log('Loaded and merged normalized training data from backend:', Object.keys(trainingData));
    }
  } catch (error) {
    console.error('Error loading from backend:', error);
  }
}

// Unified loader: merge localStorage, /api/gestures, and /api/gesture/all into trainingData
async function loadTrainingData() {
  trainedGestures = [];

  // 1) local cache
  try {
    const cached = localStorage.getItem('gestureTrainingData');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object') {
        Object.entries(parsed).forEach(([label, samples]) => {
          if (!Array.isArray(samples)) return;
          if (!trainingData[label]) trainingData[label] = [];
          samples.forEach((s) => Array.isArray(s) && trainingData[label].push(s));
        });
      }
    }
  } catch (e) {
    console.warn('Could not read cached training data', e);
  }

  // 2) primary gestures endpoint
  await loadGestures();

  // 3) fallback/legacy endpoint with normalized landmarks
  try {
    await mergeGesturesFromEndpoint(`${API_BASE}/api/gesture/all`);
  } catch (e) {
    console.warn('Optional gestures/all fetch failed', e);
  }

  // Persist merged store for fast reloads
  try {
    localStorage.setItem('gestureTrainingData', JSON.stringify(trainingData));
  } catch (e) {
    console.warn('Failed to cache training data', e);
  }

  rebuildTrainedGesturesFromTrainingData();
  await hydrateClassifierFromTrainingData();

  console.log('Training data ready', Object.keys(trainingData));
  return trainingData;
}

// Save training data to localStorage and backend
function saveTrainingData() {
  try {
    localStorage.setItem('gestureTrainingData', JSON.stringify(trainingData));
    console.log('Saved training data to localStorage');
    
    // Also save each label to backend (best-effort)
    Object.entries(trainingData).forEach(([label, samples]) => {
      if (!Array.isArray(samples)) return;
      samples.forEach((sample) => {
        if (Array.isArray(sample)) saveToBackend(label, sample);
      });
    });
  } catch (e) {
    console.warn('Failed to save training data:', e);
  }
}

// Save single gesture to backend API
async function saveToBackend(label, data) {
  try {
    const response = await fetch(`${API_BASE}/api/train`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        label: label,
        data: data // These are normalized landmarks
      })
    });
    
    const result = await response.json();
    console.log('🟢 TRAINING CONFIRMATION:', result);
    
    if (!response.ok) {
      console.warn('Failed to save normalized gesture to backend:', response.statusText);
    }
  } catch (error) {
    console.error('Error saving to backend:', error);
  }
}

function resetTrainingData() {
  try {
    for (const k of Object.keys(trainingData)) delete trainingData[k];
  } catch (_) {}

  try {
    localStorage.removeItem('gestureTrainingData');
  } catch (_) {}

  try {
    if (knn && typeof knn.clearAllClasses === 'function') knn.clearAllClasses();
  } catch (_) {}

  try {
    for (const k of Object.keys(legacyTrainingData)) delete legacyTrainingData[k];
  } catch (_) {}

  // Reset debounce state
  try {
    lastPredictedLabel = null;
    stableFrames = 0;
    lastEmittedLabel = null;
  } catch (_) {}

  if (detectedLetterSpan) detectedLetterSpan.innerText = '-';
  if (statusText) statusText.innerText = 'Training reset. Turn Train Mode ON and save samples.';
}

// Fix TRAIN MODE logic with MongoDB persistence
function captureSample(label) {
  if (!currentLandmarks) {
    alert("Show your hand clearly inside the camera");
    return;
  }

  console.log('🔍 TRAINING - CAPTURING SAMPLE FOR:', label);
  console.log('Raw landmarks count:', currentLandmarks.length);
  
  // Use normalized landmarks for device-independent training
  const normalizedData = normalizeLandmarks(currentLandmarks);
  
  console.log('✅ TRAINING - Normalized data captured');
  console.log('Sample length:', normalizedData.length);
  
  // Save locally for immediate use
  if (!trainingData[label]) trainingData[label] = [];
  trainingData[label].push(normalizedData);
  trainedGestures.push({ label, data: normalizedData });

  // Persist and sync with backend
  saveTrainingData();
  saveToBackend(label, normalizedData);

  const samples = trainingData[label].length;
  if (statusText) statusText.innerText = `Saved ${label} sample (${samples})`;
  console.log(`✅ TRAINING - Captured and saved sample for ${label} (total ${samples})`);
}

// Simple in-memory training store: letter -> { sum: Float32Array, count: number }
// We keep a running sum of descriptors so we can easily compute the average when comparing.
const legacyTrainingData = {};
const TRAIN_MATCH_THRESHOLD = 0.35; // loose threshold for Euclidean distance (tune if needed)

// TensorFlow.js KNN classifier
let knn = null;
let currentLabel = null;

// Initialize ML variables
function initML() {
  try {
    if (typeof knnClassifier !== 'undefined' && knnClassifier.create) {
      knn = knnClassifier.create();
      console.log('KNN Classifier initialized successfully');
    }
  } catch (e) {
    console.error('Failed to initialize KNN Classifier:', e);
  }
  return knn;
}

function ensureKNN() {
  if (!knn) {
    initML();
  }
  return knn;
}

function addTrainingSample(letter, lm) {
  // Use the new landmarksToArray function for ML
  const features = landmarksToArray(lm);
  
  // Add to KNN classifier
  const classifier = ensureKNN();
  if (classifier && typeof tf !== 'undefined') {
    tf.tidy(() => {
      const tensor = tf.tensor(features).expandDims(0);
      classifier.addExample(tensor, letter);
    });
    console.log(`Added training sample for letter: ${letter}`);
  }
  
  // Also keep legacy template system for fallback
  const desc = landmarksToDescriptor(lm);
  if (!legacyTrainingData[letter]) {
    legacyTrainingData[letter] = { sum: new Float32Array(desc.length), count: 0 };
  }
  const store = legacyTrainingData[letter];
  store.count += 1;
  for (let i = 0; i < desc.length; i++) store.sum[i] += desc[i];
}

// Predict gesture using ML
async function predictGesture(landmarks) {
  const classifier = ensureKNN();
  if (!classifier || classifier.getNumClasses() === 0) {
    console.log('No trained classes available for prediction');
    return;
  }

  try {
    const features = landmarksToArray(landmarks);
    const tensor = tf.tensor(features).expandDims(0);
    const result = await classifier.predictClass(tensor);
    
    if (result && result.label && result.confidences[result.label] > 0.75) {
      handleDetectedLetter(result.label);
      console.log(`Predicted gesture: ${result.label} with confidence: ${result.confidences[result.label]}`);
    }
    
    // Clean up tensor
    tensor.dispose();
  } catch (error) {
    console.error('Prediction failed:', error);
  }
}

// Detect gesture → textbox → search bar
function onGestureDetected(letter) {
  if (resultText) {
    if (letter === 'Space') {
      resultText.value += ' ';
    } else if (letter === 'Delete') {
      resultText.value = resultText.value.slice(0, -1);
    } else {
      resultText.value += letter;
    }
  }

  const searchInput = getVoiceSearchInput();
  if (searchInput) {
    searchInput.value = resultText ? resultText.value : '';
    searchInput.focus();
    
    // Auto-trigger search for gesture detection
    if (letter !== 'Space' && letter !== 'Delete') {
      // Only trigger search if we have a complete word or single letter
      const currentText = searchInput.value.trim();
      if (currentText && !currentText.includes(' ')) {
        // Single word/letter - trigger search immediately
        setTimeout(() => {
          if (typeof handleMultiModeSearch === 'function') {
            handleMultiModeSearch(currentText);
          }
        }, 500);
      }
    }
  }
  
  // Mirror to other search boxes
  mirrorToSearchBoxes();
}

// Enhanced gesture detection with better UI feedback using normalized landmarks
function predictGestureSimple() {
  if (!currentLandmarks || trainedGestures.length === 0) {
    console.log('🔍 PREDICTION - No landmarks or no training data');
    return null;
  }

  console.log('🔍 STEP 3 - DISTANCE THRESHOLD CHECK:');
  console.log('Available trained gestures:', trainedGestures.map(g => g.label));
  
  // Normalize current landmarks for device-independent comparison
  const normalizedCurrent = normalizeLandmarks(currentLandmarks);
  console.log('✅ PREDICTION - Normalized current landmarks');
  
  let bestMatch = null;
  let bestDistance = Infinity;

  // Compare with all trained gestures from MongoDB
  for (const gesture of trainedGestures) {
    console.log(`Comparing with ${gesture.label}`);
    // Calculate Euclidean distance between normalized vectors
    const distance = euclideanDistance(normalizedCurrent, gesture.data);
    
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = gesture.label;
    }
  }

  console.log(`🔍 PREDICTION RESULTS:`);
  console.log(`Best match: ${bestMatch}`);
  console.log(`Best distance: ${bestDistance}`);
  
  // TEMPORARY FIX: Remove threshold completely to see if prediction works
  console.log('✅ PREDICTION - Returning best match without threshold');
  return bestMatch; // No threshold condition - always return best match
}

// Debounce / stability gating: emit one character per held sign
let lastPredictedLabel = null;
let stableFrames = 0;
let lastEmittedLabel = null;
const REQUIRED_STABLE_FRAMES = 4;

function onHandsResults(results) {
  console.log('🔍 STEP 5 - HAND DETECTION VALIDATION:');
  console.log('MediaPipe results:', results);
  
  // FINAL HARD FIX: Check if training data exists
  if (!trainingData || Object.keys(trainingData).length === 0) {
    console.log('❌ NO TRAINING DATA - Model not trained');
    if (statusText) statusText.innerText = 'Model not trained. Please train gestures first.';
    return;
  }
  
  // Check if hand is detected
  if (!results || !results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    console.log('❌ NO HAND DETECTED - Show hand clearly');
    // Reset gating when hand leaves the frame
    lastPredictedLabel = null;
    stableFrames = 0;
    lastEmittedLabel = null;
    if (detectedLetterSpan) detectedLetterSpan.innerText = '-';
    if (statusText && !statusText.innerText.includes('No gestures trained')) {
      statusText.innerText = 'Show hand clearly in camera frame';
    }
    return;
  }

  console.log('✅ HAND DETECTED - Proceeding with prediction');
  currentLandmarks = results.multiHandLandmarks[0];
  
  if (statusText && statusText.innerText.includes('Show hand clearly')) {
    statusText.innerText = 'Hand detected. Ready.';
  }

  // Skip recognition during training
  if (trainMode) {
    console.log('⏸️ TRAINING MODE - Skipping prediction');
    return;
  }

  console.log('🔍 STARTING PREDICTION PROCESS...');
  
  // Try to predict gesture using trained data
  const predictedLetter = predictGestureSimple();
  console.log('🔍 PREDICTION RESULT:', predictedLetter);
  
  if (predictedLetter) {
    console.log('✅ PREDICTION SUCCESS - Letter:', predictedLetter);
    if (predictedLetter === lastPredictedLabel) stableFrames += 1;
    else {
      lastPredictedLabel = predictedLetter;
      stableFrames = 1;
    }

    // Update UI preview always
    if (detectedLetterSpan) detectedLetterSpan.innerText = predictedLetter;

    // Emit only once per held sign
    if (stableFrames >= REQUIRED_STABLE_FRAMES && lastEmittedLabel !== predictedLetter) {
      console.log('🎯 EMITTING GESTURE:', predictedLetter);
      lastEmittedLabel = predictedLetter;
      onGestureDetected(predictedLetter);
      if (statusText) statusText.innerText = `Detected: ${predictedLetter}`;
    } else {
      if (statusText) statusText.innerText = `Analyzing: ${predictedLetter}`;
    }
  } else {
    console.log('❌ NO PREDICTION MATCH - Continuing analysis');
    // We have training data but no match
    lastPredictedLabel = null;
    stableFrames = 0;
    if (detectedLetterSpan) {
      detectedLetterSpan.innerText = '?';
    }
    if (statusText && !statusText.innerText.includes('Train')) {
      statusText.innerText = 'Analyzing gesture...';
    }
  }
}

// Prevent overlapping KNN predictions
let predicting = false;
function handleRecognition(desc) {
  const classifier = ensureKNN();
  const hasKnn = classifier && classifier.getNumClasses && classifier.getNumClasses() > 0;
  const trainedLetters = Object.keys(legacyTrainingData).filter((k) => legacyTrainingData[k].count > 0);
  if (!hasKnn && trainedLetters.length === 0) {
    if (detectedLetterSpan) detectedLetterSpan.innerText = '-';
    if (statusText && !statusText.innerText.includes('Train')) {
      statusText.innerText = 'No gestures trained. Turn Train Mode ON and save samples.';
    }
    return;
  }

  const acceptPrediction = (label, score) => {
    if (!label) {
      if (detectedLetterSpan) detectedLetterSpan.innerText = '-';
      if (statusText) statusText.innerText = 'Detecting gesture...';
      return;
    }
    detectCounts[label] = (detectCounts[label] || 0) + 1;
    for (const n of Object.keys(detectCounts)) if (n !== label) detectCounts[n] = 0;
    if (detectedLetterSpan) detectedLetterSpan.innerText = label + ' (' + detectCounts[label] + '/' + STABLE_FRAMES + ')';
    if (detectCounts[label] >= STABLE_FRAMES) {
      if (detectedLetterSpan) detectedLetterSpan.innerText = label;
      if (resultText) {
        if (label === 'Space') resultText.value += ' ';
        else if (label === 'Delete') resultText.value = resultText.value.slice(0, -1);
        else resultText.value += label;
      }
      detectCounts[label] = 0;
      if (statusText) statusText.innerText = 'Detected: ' + label + (typeof score === 'number' ? ' (' + Math.round(score * 100) + '%)' : '');
      mirrorToSearchBoxes();
    }
  };

  if (hasKnn && typeof tf !== 'undefined') {
    if (predicting) return; // skip frame if a prediction is in flight
    predicting = true;
    tf.tidy(() => {
      const ex = tf.tensor1d(Array.from(desc));
      classifier.predictClass(ex, 3).then((out) => {
        predicting = false;
        const label = out && out.label;
        const confs = (out && out.confidences) || {};
        const score = label ? confs[label] || 0 : null;
        if (label) acceptPrediction(label, score);
        else acceptPrediction(null, null);
      }).catch(() => { predicting = false; fallback(); });
    });
  } else {
    fallback();
  }

  function fallback() {
    // Nearest-mean legacy fallback
    let bestName = null, bestDist = null;
    for (const letter of trainedLetters) {
      const store = legacyTrainingData[letter];
      const mean = new Float32Array(store.sum.length);
      for (let i = 0; i < mean.length; i++) mean[i] = store.sum[i] / store.count;
      let s = 0; for (let i = 0; i < mean.length; i++) { const d = desc[i] - mean[i]; s += d * d; }
      const dist = Math.sqrt(s / mean.length);
      if (bestDist === null || dist < bestDist) { bestDist = dist; bestName = letter; }
    }
    if (bestName !== null && bestDist !== null && bestDist < TRAIN_MATCH_THRESHOLD) acceptPrediction(bestName, 1 - bestDist);
    else acceptPrediction(null, null);
  }
}

function mirrorToSearchBoxes() {
  try {
    if (!resultText) return;
    const val = resultText.value;
    if (searchInput) {
      searchInput.style.display = 'block';
      searchInput.value = val;
      searchInput.focus();
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (voiceSearchBox) {
      voiceSearchBox.value = val;
      voiceSearchBox.dispatchEvent(new Event('input', { bubbles: true }));
      voiceSearchBox.dispatchEvent(new Event('change', { bubbles: true }));
    }
  } catch (e) { console.warn('mirrorToSearchBoxes failed', e); }
}

// ----- MultiMode search bar with backend integration -----
document.addEventListener('DOMContentLoaded', function () {
  // Remove the old backend-dependent search listener
  // The new client-side logic is in multimode.js
});

document.addEventListener('click', (e) => {
  const t = e.target;
  if (!t || !t.id) return;

  if (t.id === 'gestureClose' || t.id === 'closeGestureModal') {
    e.preventDefault();
    e.stopPropagation();
    hideGestureModal(document.getElementById('gestureModal'));
    return;
  }

  if (t.id === 'gesturePrint' || t.id === 'printGestureBtn') {
    e.preventDefault();
    e.stopPropagation();
    try { saveTrainingData(); } catch (_) {}
    try { downloadTrainingBackup(); } catch (_) {}
    try { window.print(); } catch (err) {
      console.error('Print failed:', err);
      alert('Print failed. Please allow popups / printing for this site.');
    }
  }
});

initHands();
initFaceMesh();
// Initialize ML components
initML();
// Load training data on page load
loadTrainingData();

// Allow calling from console if needed
try { window.resetTrainingData = resetTrainingData; } catch (_) {}

const resetTrainingBtn = document.getElementById('resetTrainingBtn');
if (resetTrainingBtn) {
  resetTrainingBtn.addEventListener('click', () => {
    const ok = confirm('Reset all saved training data? This cannot be undone.');
    if (!ok) return;
    resetTrainingData();
  });
}

// --- auto-build templates from gesture images (if they contain hands)
let buildingTemplates = false;
let pendingTemplateName = null;
let templateResolve = null;

async function buildTemplatesFromImages() {
  if (!hands) return;
  buildingTemplates = true;
  for (const g of gestures) {
    pendingTemplateName = g.name;
    await new Promise((res) => {
      templateResolve = res;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          hands.send({ image: img });
        } catch (e) {
          console.warn('hands.send failed for image', g.img, e);
          templateResolve();
        }
      };
      img.onerror = () => { templateResolve(); };
      img.src = g.img;
      // timeout in case of no result
      setTimeout(() => { if (templateResolve) { templateResolve(); templateResolve = null; } }, 1200);
    });
  }
  buildingTemplates = false;
  pendingTemplateName = null;
  console.log('Template build complete. templates:', Object.keys(templates));
}

// Start the camera directly for live training/recognition.
// Image-based template building is optional and can be invoked separately if needed.
startCamera();

// --- integrate with MultiMode gesture book "Train Mode" capture ---
// When Train Mode is ON in voice.html and a tile is clicked, that page dispatches
// a `gesture-capture` event with the chosen name. Here we turn the current
// live hand landmarks into a training sample for that name, stored in trainingData.
window.addEventListener('gesture-capture', (ev) => {
  try {
    const detail = ev && ev.detail;
    const name = detail && detail.name;
    if (!name) return;
    
    // Use the new captureSample function
    captureSample(name);
    const samples = trainingData[name] ? trainingData[name].length : 0;
    alert('Saved sample for letter ' + name + ' (total: ' + samples + ').');
  } catch (e) {
    console.warn('gesture-capture handler error', e);
  }
});