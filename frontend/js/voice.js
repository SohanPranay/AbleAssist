const startBtn = document.getElementById('startVoice');
const stopBtn = document.getElementById('stopVoice');
const voiceStatus = document.getElementById('voiceStatus');
const voiceTranscript = document.getElementById('voiceTranscript');
const voiceSearch = document.getElementById('voiceSearch');

// NOTE: Only modify/create this file per requirements.
// Web Speech API (standard + webkit)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;
let isListening = false;
let finalBuffer = '';

async function ensureMicPermission() {
  // Force a browser mic permission prompt (similar to camera prompt).
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('getUserMedia not available');
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  try { stream.getTracks().forEach((t) => t.stop()); } catch (e) {}
}

function setStatus(msg) {
  if (voiceStatus) voiceStatus.innerText = msg;
}

function safeLogError(prefix, err) {
  // Always log to console per requirements
  console.error(prefix, err);
}

function initRecognition() {
  if (!SpeechRecognition) {
    setStatus('Voice recognition not supported in this browser (use Chrome/Edge).');
    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = true;
    return;
  }

  try {
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;      // required
    recognition.interimResults = true;  // required

    recognition.onstart = () => {
      isListening = true;
      setStatus('Listening... Speak now!');
      if (startBtn) startBtn.disabled = true;
      if (stopBtn) stopBtn.disabled = false;
    };

    recognition.onresult = (ev) => {
      try {
        let interim = '';
        let hasNewFinal = false;
        
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const res = ev.results[i];
          const t = (res[0] && res[0].transcript) ? res[0].transcript : '';
          if (res.isFinal) {
            finalBuffer += t;
            hasNewFinal = true; // Track when we get new finalized results
          } else {
            interim += t;
          }
        }

        // Keep transcript visible - update with all final + interim results
        if (voiceTranscript) voiceTranscript.value = (finalBuffer + interim).trim();
        
        // NEW: When we have finalized speech results, copy them to voiceSearch input
        if (hasNewFinal && voiceSearch) {
          // Update the search input with the finalized recognized text
          voiceSearch.value = finalBuffer.trim();
          
          // Optionally trigger a search event after updating the search input
          // This allows other parts of the app to react to the search update
          try {
            const searchEvent = new Event('input', { bubbles: true });
            voiceSearch.dispatchEvent(searchEvent);
            
            // Also dispatch a custom 'search' event for more explicit handling
            const customSearchEvent = new CustomEvent('search', { 
              detail: { query: finalBuffer.trim() },
              bubbles: true 
            });
            voiceSearch.dispatchEvent(customSearchEvent);
          } catch (e) {
            safeLogError('Failed to dispatch search events:', e);
          }
        }
        
        setStatus(interim ? 'Listening...' : 'Listening... (processing)');
      } catch (e) {
        safeLogError('Speech recognition onresult error:', e);
      }
    };

    recognition.onerror = (ev) => {
      isListening = false;
      safeLogError('Speech recognition error:', ev);
      const code = ev && ev.error;
      if (code === 'not-allowed') setStatus('Microphone permission denied. Please allow microphone access.');
      else if (code === 'no-speech') setStatus('No speech detected. Click Start and try again.');
      else if (code === 'audio-capture') setStatus('No microphone available.');
      else setStatus('Voice error: ' + (code || 'unknown') + '. Try again.');
      if (startBtn) startBtn.disabled = false;
      if (stopBtn) stopBtn.disabled = false;
    };

    recognition.onend = () => {
      isListening = false;
      if (startBtn) startBtn.disabled = false;
      if (stopBtn) stopBtn.disabled = true;
      // Keep last transcript in the box; just update status.
      setStatus('Stopped. Click Start to listen again.');
    };

    // Initial button states
    if (stopBtn) stopBtn.disabled = true;
  } catch (e) {
    safeLogError('Failed to initialize SpeechRecognition:', e);
    setStatus('Voice recognition failed to initialize.');
    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = true;
  }
}

initRecognition();

if (startBtn) {
  startBtn.addEventListener('click', async () => {
    if (!recognition) {
      setStatus('Voice recognition not available (use Chrome/Edge).');
      return;
    }

    // Avoid InvalidStateError if Start is clicked repeatedly.
    if (isListening) {
      setStatus('Already listening...');
      return;
    }

    try {
      setStatus('Requesting microphone permission...');
      await ensureMicPermission();

      // Reset buffers for a fresh run.
      finalBuffer = '';
      if (voiceTranscript) voiceTranscript.value = '';

      recognition.start();
    } catch (e) {
      safeLogError('Failed to start voice recognition:', e);
      const name = e && e.name;
      if (name === 'NotAllowedError') setStatus('Microphone permission denied. Please allow microphone access.');
      else if (name === 'NotFoundError') setStatus('No microphone found. Connect a microphone and try again.');
      else if (window.isSecureContext === false) setStatus('Microphone requires http://localhost or https:// (not file://).');
      else setStatus('Could not start voice recognition. Check mic permissions and try again.');
      if (startBtn) startBtn.disabled = false;
      if (stopBtn) stopBtn.disabled = false;
    }
  });
}

if (stopBtn) {
  stopBtn.addEventListener('click', () => {
    try {
      if (recognition && isListening) recognition.stop();
    } catch (e) {
      safeLogError('Failed to stop voice recognition:', e);
      setStatus('Failed to stop. See console for details.');
    }
  });
}
