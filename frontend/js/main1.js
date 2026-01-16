const commandBox = document.getElementById("commandBox");
const voiceStatus = document.getElementById("voiceStatus");
const cameraStatus = document.getElementById("cameraStatus");
const cameraSection = document.getElementById("cameraSection");
const cameraPreview = document.getElementById("cameraPreview");
const cameraToggleBtn = document.getElementById("cameraToggleBtn");
const flipCameraBtn = document.getElementById("flipCameraBtn");
let isMirrored = false;
const perspectiveBtn = document.getElementById('perspectiveBtn');

let recognition;

// START CAMERA PREVIEW (IDLE MODE)
async function startCameraPreview() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const camEl = document.getElementById("cameraPreview");
      if (camEl) camEl.srcObject = stream;
      if (cameraStatus) cameraStatus.innerText = "Camera active";
    if (cameraToggleBtn) cameraToggleBtn.innerText = 'Camera Off';
  } catch (err) {
    cameraStatus.innerText = "Camera access denied";
  }
}

function stopCameraPreview() {
  try {
    const vid = cameraPreview || document.getElementById("cameraPreview");
    if (vid && vid.srcObject) {
      const tracks = vid.srcObject.getTracks();
      tracks.forEach(t => t.stop());
      vid.srcObject = null;
    }
    if (cameraStatus) cameraStatus.innerText = 'Camera off';
    if (cameraToggleBtn) cameraToggleBtn.innerText = 'Camera On/Off';
    // preserve mirror class state; do nothing else
  } catch (e) {
    console.warn('stopCameraPreview error', e);
  }
}

function toggleCamera() {
  const vid = cameraPreview || document.getElementById("cameraPreview");
  if (vid && vid.srcObject) {
    stopCameraPreview();
  } else {
    startCameraPreview();
  }
}

if (cameraToggleBtn) cameraToggleBtn.addEventListener('click', toggleCamera);
if (flipCameraBtn) flipCameraBtn.addEventListener('click', () => {
  isMirrored = !isMirrored;
  const vid = cameraPreview || document.getElementById("cameraPreview");
  if (vid) vid.classList.toggle('mirror', isMirrored);
  flipCameraBtn.innerText = isMirrored ? 'Unflip Preview' : 'Flip Preview';
});
if (perspectiveBtn) perspectiveBtn.addEventListener('click', () => {
  isMirrored = !isMirrored;
  const vid = cameraPreview || document.getElementById("cameraPreview");
  if (vid) vid.classList.toggle('mirror', isMirrored);
  perspectiveBtn.innerText = isMirrored ? 'Unflip' : 'Flip';
  // also update available flipCameraBtn if present
  if (flipCameraBtn) flipCameraBtn.innerText = isMirrored ? 'Unflip Preview' : 'Flip Preview';
});
// top theme toggle
const themeToggleTop = document.getElementById('themeToggleTop');
if (themeToggleTop) themeToggleTop.addEventListener('click', () => document.body.classList.toggle('dark'));

// VOICE ASSISTANT
function activateVoice() {
  // open voice page in a new tab
  window.open('voice.html', '_blank');
}

// SIGN LANGUAGE MODE
function activateSign() {
  // open sign page in a new tab
  window.open('sign.html', '_blank');
}

// TYPE MODE
function activateType() {
  cameraSection.style.display = "none";
  commandBox.focus();
  voiceStatus.innerText = "Type your command";
}

// START CAMERA ON LOAD (only when camera preview element exists)
if (cameraPreview) startCameraPreview();

// Real-time clock + date updater (updates if elements exist)
function updateClock() {
  try {
    const now = new Date();
    const clockEl = document.getElementById('clockBox');
    const dateEl = document.getElementById('dateBox');
    if (clockEl) {
      // show HH:MM:SS (24h) — use locale for proper digits
      const t = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      clockEl.innerText = t;
    }
    if (dateEl) {
      const d = now.toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
      dateEl.innerText = d;
    }
  } catch (e) {
    // ignore
  }
}
// start immediately and update every second
updateClock();
setInterval(updateClock, 1000);

/* ===== index page specific behavior (guarded) ===== */
if (typeof document !== 'undefined' && document.getElementById('brand')) {
  (function () {
    const brand = document.getElementById('brand');
    const searchWrap = document.getElementById('searchWrap');
    const searchForm = document.getElementById('searchForm');

    // animate brand into small header and reveal search after short delay
    function revealSearch() {
      brand.classList.add('brand--small');
      searchWrap.classList.add('search-wrap--visible');
      searchWrap.setAttribute('aria-hidden', 'false');
    }

    // Run once after load to create the 'transition from big name to small search' effect
    window.addEventListener('load', () => {
      // small delay so users see the large brand first
      setTimeout(revealSearch, 1000);
    });

    // Simple search handler: for now just shows a subtle focus + prevents navigation
    if (searchForm) {
      searchForm.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const q = document.getElementById('searchInput').value.trim();
        if (!q) return;
        // For now, simulate a result: open a quick search page or show alert
        try {
          // if site had a search page, we could navigate: window.location.href = '/search?q=' + encodeURIComponent(q)
          alert('Search: ' + q);
        } catch (e) {
          console.log('Search:', q);
        }
      });
    }
  })();
}

// remove the intro overlay after the animations finish so the page is fully interactive
(function removeIntroAfter() {
  try {
    const intro = document.querySelector('.intro');
    const site = document.querySelector('.site');
    if (!intro) return;
    // remove shortly after the CSS animation (1s) so homepage is revealed promptly
    setTimeout(() => {
      if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
      if (site) {
        site.style.opacity = '1';
        site.style.pointerEvents = 'auto';
      }
      // restore body scrolling
      document.body.style.overflow = '';
      // focus the first actionable element
      const first = document.querySelector('.top-nav a, .btn-primary, input');
      if (first) first.focus();
    }, 900);
  } catch (e) {
    console.warn('removeIntroAfter error', e);
  }
})();

/* Randomize collage images positions/sizes so they form a single-page collage (no stacking) */
function randomizeCollage() {
  const container = document.querySelector('#indexPage .collage');
  if (!container) return;
  const items = Array.from(container.querySelectorAll('.c-item'));
  const containerRect = container.getBoundingClientRect();
  const sizes = [260, 200, 140, 100]; // square tile sizes
  // collision-aware placement: try to place tiles without overlapping
  const placed = [];
  function overlaps(a, b, pad = 8) {
    return !(a.left + a.w + pad < b.left || b.left + b.w + pad < a.left || a.top + a.h + pad < b.top || b.top + b.h + pad < a.top);
  }

  items.forEach((item, i) => {
    // choose size biased toward small/medium
    const r = Math.random();
    let s;
    if (r < 0.25) s = sizes[3];
    else if (r < 0.6) s = sizes[2];
    else if (r < 0.9) s = sizes[1];
    else s = sizes[0];

    // constrain to right portion of the container to avoid covering hero text
    const leftMin = Math.floor(containerRect.width * 0.42);
    const leftMax = Math.max(leftMin, Math.floor(containerRect.width - s - 8));
    const topMax = Math.max(8, Math.floor(containerRect.height - s - 8));

    let placedRect = null;
    const attempts = 60;
    for (let t = 0; t < attempts; t++) {
      const left = Math.floor(Math.random() * (leftMax - leftMin + 1)) + leftMin;
      const top = Math.floor(Math.random() * (topMax - 8 + 1)) + 8;
      const rect = { left, top, w: s, h: s };
      let ok = true;
      for (const p of placed) {
        if (overlaps(rect, p, 8)) { ok = false; break; }
      }
      if (ok) { placedRect = rect; break; }
    }

    // if we couldn't find a non-overlapping spot, place anyway at a safe default within bounds
    if (!placedRect) {
      const left = leftMin + Math.floor(Math.random() * Math.max(1, leftMax - leftMin + 1));
      const top = 8 + Math.floor(Math.random() * Math.max(1, topMax - 8 + 1));
      placedRect = { left, top, w: s, h: s };
    }

    const z = 20 + Math.floor(Math.random() * 40);
    const rotation = 45; // keep tile rotated 45deg; inner img is counter-rotated in CSS

    item.style.width = placedRect.w + 'px';
    item.style.height = placedRect.h + 'px';
    item.style.left = placedRect.left + 'px';
    item.style.top = placedRect.top + 'px';
    item.style.zIndex = z;
    item.style.transform = 'rotate(' + rotation + 'deg)';

    placed.push(placedRect);
  });
}

function debounce(fn, wait) {
  let t;
  return function () { clearTimeout(t); t = setTimeout(() => fn.apply(this, arguments), wait); };
}

// Run randomization shortly after the intro is removed and site fades in
window.addEventListener('load', () => {
  setTimeout(() => {
    randomizeCollage();

    // initialize floating columns seamless loop: duplicate track contents
    try{
      document.querySelectorAll('.scroll-track').forEach(track=>{
        const children = Array.from(track.children);
        if(children.length>0){
          children.forEach(node=>track.appendChild(node.cloneNode(true)));
        }
      });
    }catch(e){console.warn('floating cols init failed',e)}

  }, 2300);
});

// Recalculate on resize
window.addEventListener('resize', debounce(() => randomizeCollage(), 150));
