/**
 * SkillSphere AI - Accessibility, Edge-TTS Studio & Head Tracking Cursor Controller
 * Direct Integration with https://Arjnln-kokoro-tts-api.hf.space
 */

// Shared reusable Audio element
let sharedAudio = new Audio();
let isAudioPlaying = false;
let hoverTimer = null;
let currentHoveredElement = null;
let lastSpokenText = '';
let isAudioUnlocked = false;

// Head Tracking Engine State
let headTrackStream = null;
let headTrackAnimId = null;
let headCursorEl = null;
let headCursorX = window.innerWidth / 2;
let headCursorY = window.innerHeight / 2;
let lastFrameData = null;
let dwellStartTime = 0;
let dwellTarget = null;
const DWELL_CLICK_DURATION = 1300; // ms to trigger dwell click

// Web Speech fallback synthesis
let synth = window.speechSynthesis || null;

/**
 * Unlock Audio Context on first document interaction
 */
function unlockAudio() {
  if (isAudioUnlocked) return;
  try {
    sharedAudio.play().then(() => {
      sharedAudio.pause();
      isAudioUnlocked = true;
    }).catch(() => {
      isAudioUnlocked = true;
    });
  } catch (e) {
    isAudioUnlocked = true;
  }
}

document.addEventListener('click', unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });
document.addEventListener('touchstart', unlockAudio, { once: true });

/**
 * Direct TTS speak function connecting to Hugging Face Space
 */
async function speak(text, voice = 'id-female', rate = 0, pitch = 0) {
  try {
    const cleanContent = (text || 'Halo, selamat datang di SkillSphere AI.').trim();
    if (!cleanContent) return;

    if (sharedAudio) {
      sharedAudio.pause();
      sharedAudio.currentTime = 0;
      isAudioPlaying = false;
    }
    if (synth && synth.speaking) {
      synth.cancel();
    }

    const payload = {
      input: cleanContent,
      voice: voice || 'id-female', // id-female, id-male, en-female, en-male, multi-female, multi-male
      rate: Number(rate) || 0,
      pitch: Number(pitch) || 0,
    };

    const response = await fetch('https://Arjnln-kokoro-tts-api.hf.space/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Gagal fetch audio (${response.status}): ${response.statusText}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    sharedAudio.src = audioUrl;
    isAudioPlaying = true;

    sharedAudio.onended = () => {
      isAudioPlaying = false;
      if (currentHoveredElement) {
        currentHoveredElement.classList.remove('a11y-hover-speaking-element');
      }
    };

    await sharedAudio.play();
    return sharedAudio;
  } catch (error) {
    console.warn('Edge-TTS stream error, activating browser fallback...', error);
    playBrowserSpeechFallback(text, voice);
  }
}

function playBrowserSpeechFallback(text, voice = 'id-female') {
  if (!synth) return;
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    const isEn = voice.startsWith('en');
    const matched = voices.find((v) =>
      isEn ? v.lang.startsWith('en') : v.lang.startsWith('id') || v.name.includes('Indonesia')
    );
    if (matched) utterance.voice = matched;
    synth.speak(utterance);
  } catch (e) {
    console.error('TTS speech synthesis error:', e);
  }
}

// Expose speak function globally for use anywhere
window.speak = speak;

(function () {
  'use strict';

  const STORAGE_KEY = 'skillsphere_a11y_prefs';

  const defaultPrefs = {
    fontSize: 'normal', // 'small', 'normal', 'large', 'xlarge'
    dyslexic: false,
    highContrast: false,
    monochrome: false,
    reduceMotion: false,
    readingRuler: false,
    hoverSpeak: false, // Baca otomatis saat kursor diarahkan (Hover Reader)
    headTracking: false, // Pelacak gerakan kepala (Head Tracking)
    headSensitivity: 3.2,
    voice: 'id-female',
  };

  let prefs = { ...defaultPrefs };

  // Load saved preferences
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      prefs = { ...defaultPrefs, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('A11y prefs loading error:', e);
  }

  function savePrefs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.warn('A11y prefs saving error:', e);
    }
    applyPrefs();
  }

  function applyPrefs() {
    const docEl = document.documentElement;
    const body = document.body;
    if (!docEl || !body) return;

    // Font Sizing (Applied simultaneously on root html and body for 100% universal scaling)
    docEl.classList.remove('a11y-font-sm', 'a11y-font-lg', 'a11y-font-xl');
    body.classList.remove('a11y-font-sm', 'a11y-font-lg', 'a11y-font-xl');

    if (prefs.fontSize === 'small') {
      docEl.classList.add('a11y-font-sm');
      body.classList.add('a11y-font-sm');
    } else if (prefs.fontSize === 'large') {
      docEl.classList.add('a11y-font-lg');
      body.classList.add('a11y-font-lg');
    } else if (prefs.fontSize === 'xlarge') {
      docEl.classList.add('a11y-font-xl');
      body.classList.add('a11y-font-xl');
    }

    // Dyslexic Font
    body.classList.toggle('a11y-dyslexic', !!prefs.dyslexic);

    // High Contrast
    body.classList.toggle('a11y-high-contrast', !!prefs.highContrast);

    // Monochrome
    body.classList.toggle('a11y-monochrome', !!prefs.monochrome);

    // Reduced Motion
    body.classList.toggle('a11y-reduce-motion', !!prefs.reduceMotion);

    // Reading Ruler
    const ruler = document.getElementById('a11y-reading-ruler');
    if (ruler) {
      ruler.classList.toggle('active', !!prefs.readingRuler);
    }

    // Head Tracking Engine Toggle
    if (prefs.headTracking) {
      startHeadTracking();
    } else {
      stopHeadTracking();
    }

    updateUIElements();
  }

  /**
   * Helper to find readable text from an element and clean it
   */
  function extractCleanText(element) {
    if (!element) return '';
    if (element.closest('#a11y-dialog-panel') || element.closest('#a11y-launcher-btn') || element.closest('#a11y-webcam-pip')) {
      return '';
    }

    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim().length > 0) {
      return ariaLabel.trim();
    }

    const clone = element.cloneNode(true);
    clone.querySelectorAll('script, style, svg, noscript, [aria-hidden="true"]').forEach((n) => n.remove());

    let text = clone.innerText || clone.textContent || '';
    text = text.replace(/\s+/g, ' ').trim();

    if (text.length > 250) {
      text = text.slice(0, 250) + '...';
    }
    return text;
  }

  /**
   * Setup Hover-to-Speak mouse listeners
   */
  function setupHoverToSpeak() {
    document.addEventListener('mouseover', (e) => {
      if (!prefs.hoverSpeak) return;

      const target = e.target;
      if (!target || target.nodeType !== Node.ELEMENT_NODE) return;

      if (target.closest('#a11y-dialog-panel') || target.closest('#a11y-launcher-btn') || target.closest('#a11y-webcam-pip') || target.closest('#a11y-reading-ruler')) {
        return;
      }

      const readableTarget = target.closest('h1, h2, h3, h4, h5, h6, p, li, button, a, label, .card, .btn, td, th, [data-speakable]');
      const activeEl = readableTarget || (target.innerText && target.innerText.trim().length > 2 ? target : null);

      if (!activeEl) return;

      const text = extractCleanText(activeEl);
      if (!text || text.length < 2) return;

      if (currentHoveredElement && currentHoveredElement !== activeEl) {
        currentHoveredElement.classList.remove('a11y-hover-speaking-element');
      }
      currentHoveredElement = activeEl;
      activeEl.classList.add('a11y-hover-speaking-element');

      if (hoverTimer) clearTimeout(hoverTimer);

      hoverTimer = setTimeout(() => {
        if (text === lastSpokenText && isAudioPlaying) return;
        lastSpokenText = text;

        speak(text, prefs.voice || 'id-female', 0, 0).catch(() => {});
      }, 250);
    });

    document.addEventListener('mouseout', (e) => {
      if (!prefs.hoverSpeak) return;
      if (hoverTimer) clearTimeout(hoverTimer);
      if (currentHoveredElement) {
        currentHoveredElement.classList.remove('a11y-hover-speaking-element');
      }
    });
  }

  /**
   * --- 3D Machine Learning Head Pose & Gaze Orientation Controller ---
   */
  let neutralYaw = null;
  let neutralPitch = null;
  let currentYaw = 0;
  let currentPitch = 0;
  let targetCursorX = window.innerWidth / 2;
  let targetCursorY = window.innerHeight / 2;
  let mediaPipeFaceMesh = null;
  let isMediaPipeLoading = false;

  const HISTORY_SIZE = 7;
  const yawHistory = [];
  const pitchHistory = [];

  // Rock-Solid Stillness Lock Engine Variables
  let isStillnessLocked = false;
  let lockedScreenX = window.innerWidth / 2;
  let lockedScreenY = window.innerHeight / 2;
  let stillnessStreak = 0;
  let lastRawYaw = 0;
  let lastRawPitch = 0;
  let filteredYaw = 0;
  let filteredPitch = 0;

  // --- 9-Point Screen Calibration Model & State ---
  const CALIBRATION_POINTS = [
    { id: 1, name: 'Pojok Kiri Atas', xp: 12, yp: 12 },
    { id: 2, name: 'Tengah Atas', xp: 50, yp: 12 },
    { id: 3, name: 'Pojok Kanan Atas', xp: 88, yp: 12 },
    { id: 4, name: 'Tengah Kiri', xp: 12, yp: 50 },
    { id: 5, name: 'Pusat Layar', xp: 50, yp: 50 },
    { id: 6, name: 'Tengah Kanan', xp: 88, yp: 50 },
    { id: 7, name: 'Pojok Kiri Bawah', xp: 12, yp: 88 },
    { id: 8, name: 'Tengah Bawah', xp: 50, yp: 88 },
    { id: 9, name: 'Pojok Kanan Bawah', xp: 88, yp: 88 },
  ];

  const CALIB_STORAGE_KEY = 'skillsphere_a11y_calib_model';
  let calibrationModel = null;
  try {
    const savedModel = localStorage.getItem(CALIB_STORAGE_KEY);
    if (savedModel) calibrationModel = JSON.parse(savedModel);
  } catch (e) {}

  let isCalibrating9Pt = false;
  let currentCalibStep = 0;
  let calibCurrentSamples = [];
  let allCalibRecordedPoints = [];
  let calibDwellStartTime = 0;

  function solveLinearSystem4x4(A, b) {
    const n = 4;
    for (let i = 0; i < n; i++) {
      let maxEl = Math.abs(A[i][i]);
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(A[k][i]) > maxEl) {
          maxEl = Math.abs(A[k][i]);
          maxRow = k;
        }
      }
      for (let k = i; k < n; k++) {
        const tmp = A[maxRow][k];
        A[maxRow][k] = A[i][k];
        A[i][k] = tmp;
      }
      const tmpB = b[maxRow];
      b[maxRow] = b[i];
      b[i] = tmpB;

      if (Math.abs(A[i][i]) < 1e-12) continue;

      for (let k = i + 1; k < n; k++) {
        const c = -A[k][i] / A[i][i];
        for (let j = i; j < n; j++) {
          if (i === j) A[k][j] = 0;
          else A[k][j] += c * A[i][j];
        }
        b[k] += c * b[i];
      }
    }

    const x = [0, 0, 0, 0];
    for (let i = n - 1; i >= 0; i--) {
      x[i] = b[i] / (A[i][i] || 1);
      for (let k = i - 1; k >= 0; k--) {
        b[k] -= A[k][i] * x[i];
      }
    }
    return x;
  }

  function train9PointCalibrationModel(data) {
    const ATA = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
    const AT_X = [0, 0, 0, 0];
    const AT_Y = [0, 0, 0, 0];

    for (const d of data) {
      const f = [1, d.yaw, d.pitch, d.yaw * d.pitch];
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          ATA[i][j] += f[i] * f[j];
        }
        AT_X[i] += f[i] * d.targetX;
        AT_Y[i] += f[i] * d.targetY;
      }
    }

    for (let i = 0; i < 4; i++) ATA[i][i] += 1e-4;

    const ATA_copy = ATA.map((row) => [...row]);
    const cx = solveLinearSystem4x4(ATA, AT_X);
    const cy = solveLinearSystem4x4(ATA_copy, AT_Y);

    return { cx, cy };
  }

  function start9PointCalibration() {
    if (!prefs.headTracking) {
      prefs.headTracking = true;
      savePrefs();
    }
    isCalibrating9Pt = true;
    currentCalibStep = 0;
    calibCurrentSamples = [];
    allCalibRecordedPoints = [];

    let overlay = document.getElementById('a11y-calibration-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'a11y-calibration-overlay';
      overlay.innerHTML = `
        <div class="a11y-calib-banner">
          <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 16px;">
            <h3 id="a11y-calib-title" style="margin: 0; font-size: 15px; font-weight: 700; color: #EA580C; display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-bullseye"></i> Kalibrasi Layar 9 Titik
            </h3>
            <div id="a11y-calib-step-dots" style="display: flex; gap: 6px; align-items: center;"></div>
          </div>
          <p id="a11y-calib-instruction" style="margin: 4px 0 0 0; font-size: 12.5px; color: #E4E1D8;">
            Tatap / tolehkan kepala Anda ke titik target di bawah. Saat sudah pas menatapnya, <strong>KLIK TITIK TERSEBUT</strong> dengan mouse Anda (atau tekan <strong>Spasi</strong>).
          </p>
        </div>

        <button type="button" class="a11y-calib-close-btn" id="a11y-calib-cancel-btn">
          <i class="fas fa-times"></i> Batal (Esc)
        </button>

        <div class="a11y-calib-bottom-bar">
          <button type="button" class="a11y-calib-nav-btn" id="a11y-calib-prev-btn" style="display: none;">
            <i class="fas fa-arrow-left"></i> Ulangi Titik Sebelumnya
          </button>
          <div id="a11y-calib-live-monitor" class="a11y-calib-monitor-badge">
            <span style="color:#EA580C;">●</span> Menunggu Klik Mouse...
          </div>
        </div>

        <div class="a11y-calib-target" id="a11y-calib-target" title="Klik mouse di sini saat menatap titik ini">
          <div class="a11y-calib-target-glow"></div>
          <div class="a11y-calib-target-inner" id="a11y-calib-point-num">1</div>
          <div class="a11y-calib-target-prompt">
            <i class="fas fa-mouse-pointer"></i> KLIK SAYA
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      document.getElementById('a11y-calib-cancel-btn').addEventListener('click', cancel9PointCalibration);
      document.getElementById('a11y-calib-target').addEventListener('click', (e) => {
        e.stopPropagation();
        recordCurrentCalibPoint();
      });
      document.getElementById('a11y-calib-prev-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        goToPrevCalibPoint();
      });
    }

    overlay.classList.add('active');
    renderCalibStepDots();
    showCurrentCalibPoint();
  }

  function renderCalibStepDots() {
    const container = document.getElementById('a11y-calib-step-dots');
    if (!container) return;
    container.innerHTML = CALIBRATION_POINTS.map((pt, idx) => {
      let bg = 'rgba(255,255,255,0.25)';
      if (idx < currentCalibStep) bg = '#10B981'; // Completed
      else if (idx === currentCalibStep) bg = '#EA580C'; // Current
      return `<span style="width: 8px; height: 8px; border-radius: 50%; background: ${bg}; transition: all 0.2s ease;"></span>`;
    }).join('');
  }

  function showCurrentCalibPoint() {
    if (currentCalibStep >= CALIBRATION_POINTS.length) {
      finish9PointCalibration();
      return;
    }

    const pt = CALIBRATION_POINTS[currentCalibStep];
    const targetEl = document.getElementById('a11y-calib-target');
    const numEl = document.getElementById('a11y-calib-point-num');
    const titleEl = document.getElementById('a11y-calib-title');
    const prevBtn = document.getElementById('a11y-calib-prev-btn');

    if (targetEl && numEl && titleEl) {
      targetEl.style.left = `${pt.xp}%`;
      targetEl.style.top = `${pt.yp}%`;
      numEl.innerText = `${pt.id}`;
      titleEl.innerHTML = `<i class="fas fa-bullseye"></i> Titik ${pt.id}/9: ${pt.name}`;
      targetEl.classList.remove('a11y-calib-success-flash');
    }

    if (prevBtn) {
      prevBtn.style.display = currentCalibStep > 0 ? 'inline-flex' : 'none';
    }

    renderCalibStepDots();
    calibCurrentSamples = [];
  }

  function recordCurrentCalibPoint() {
    if (!isCalibrating9Pt || currentCalibStep >= CALIBRATION_POINTS.length) return;

    const pt = CALIBRATION_POINTS[currentCalibStep];
    const screenX = (window.innerWidth * pt.xp) / 100;
    const screenY = (window.innerHeight * pt.yp) / 100;

    let avgYaw = currentYaw;
    let avgPitch = currentPitch;

    if (calibCurrentSamples.length > 0) {
      // Use the last 15 stable samples leading up to the mouse click
      const recentSamples = calibCurrentSamples.slice(-15);
      avgYaw = recentSamples.reduce((a, b) => a + b.yaw, 0) / recentSamples.length;
      avgPitch = recentSamples.reduce((a, b) => a + b.pitch, 0) / recentSamples.length;
    }

    allCalibRecordedPoints[currentCalibStep] = {
      yaw: avgYaw,
      pitch: avgPitch,
      targetX: screenX,
      targetY: screenY,
    };

    // Flash visual confirmation on target
    const targetEl = document.getElementById('a11y-calib-target');
    if (targetEl) {
      targetEl.classList.add('a11y-calib-success-flash');
    }

    currentCalibStep++;
    setTimeout(() => {
      showCurrentCalibPoint();
    }, 180);
  }

  function goToPrevCalibPoint() {
    if (!isCalibrating9Pt || currentCalibStep <= 0) return;
    currentCalibStep--;
    showCurrentCalibPoint();
  }

  function finish9PointCalibration() {
    isCalibrating9Pt = false;
    const overlay = document.getElementById('a11y-calibration-overlay');
    if (overlay) overlay.classList.remove('active');

    const validPoints = allCalibRecordedPoints.filter(Boolean);
    if (validPoints.length === 9) {
      calibrationModel = train9PointCalibrationModel(validPoints);
      try {
        localStorage.setItem(CALIB_STORAGE_KEY, JSON.stringify(calibrationModel));
      } catch (e) {}

      showToastNotice('🎉 Kalibrasi 9 Titik Selesai! Model ML telah dipersonalisasi presisi sesuai orientasi kepala Anda.');
    }

    calibrateHeadNeutral();
    updateUIElements();
  }

  function cancel9PointCalibration() {
    isCalibrating9Pt = false;
    const overlay = document.getElementById('a11y-calibration-overlay');
    if (overlay) overlay.classList.remove('active');
    showToastNotice('Kalibrasi 9 titik dibatalkan.');
  }

  function resetCalibrationModel() {
    calibrationModel = null;
    try {
      localStorage.removeItem(CALIB_STORAGE_KEY);
    } catch (e) {}
    calibrateHeadNeutral();
    updateUIElements();
    showToastNotice('Model kalibrasi 9 titik telah di-reset ke standar.');
  }

  function loadMediaPipeScript() {
    return new Promise((resolve) => {
      if (window.FaceMesh) return resolve(true);
      if (isMediaPipeLoading) {
        const checkInterval = setInterval(() => {
          if (window.FaceMesh) {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 100);
        return;
      }
      isMediaPipeLoading = true;

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        isMediaPipeLoading = false;
        resolve(true);
      };
      script.onerror = () => {
        isMediaPipeLoading = false;
        console.warn('MediaPipe CDN load failed, using high-precision geometric 3D fallback.');
        resolve(false);
      };
      document.head.appendChild(script);
    });
  }

  function calibrateHeadNeutral() {
    neutralYaw = currentYaw;
    neutralPitch = currentPitch;
    yawHistory.length = 0;
    pitchHistory.length = 0;
    filteredYaw = currentYaw;
    filteredPitch = currentPitch;
    headCursorX = window.innerWidth / 2;
    headCursorY = window.innerHeight / 2;
    targetCursorX = window.innerWidth / 2;
    targetCursorY = window.innerHeight / 2;
    lockedScreenX = headCursorX;
    lockedScreenY = headCursorY;
    isStillnessLocked = true;
    stillnessStreak = 5;
    if (headCursorEl) {
      headCursorEl.style.left = `${headCursorX}px`;
      headCursorEl.style.top = `${headCursorY}px`;
    }
    showToastNotice('<i class="fas fa-crosshairs" style="color:#EA580C;"></i> Posisi Netral Kepala Berhasil Dikalibrasi!');
  }

  async function startHeadTracking() {
    if (headTrackStream) return;

    const pip = document.getElementById('a11y-webcam-pip');
    const video = document.getElementById('a11y-webcam-video');
    headCursorEl = document.getElementById('a11y-head-cursor');

    if (!headCursorEl || !video || !pip) return;

    try {
      headTrackStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
        audio: false,
      });

      video.srcObject = headTrackStream;
      await video.play();

      pip.style.display = 'flex';
      headCursorEl.style.display = 'block';

      showToastNotice('<i class="fas fa-robot" style="color:#EA580C;"></i> ML Head Tracking Aktif! Menoleh ke sudut layar untuk mengarahkan kursor.');

      headCursorX = window.innerWidth / 2;
      headCursorY = window.innerHeight / 2;
      targetCursorX = window.innerWidth / 2;
      targetCursorY = window.innerHeight / 2;
      lockedScreenX = headCursorX;
      lockedScreenY = headCursorY;
      isStillnessLocked = true;
      stillnessStreak = 5;
      neutralYaw = null;
      neutralPitch = null;

      // Initialize MediaPipe or Geometric Fallback
      initMediaPipeOrFallback(video);
    } catch (err) {
      console.warn('Gagal mengakses kamera untuk pelacak kepala:', err);
      showToastNotice('Izin kamera ditolak atau kamera tidak ditemukan.');
      prefs.headTracking = false;
      savePrefs();
    }
  }

  async function initMediaPipeOrFallback(video) {
    const hasMediaPipe = await loadMediaPipeScript();

    if (hasMediaPipe && window.FaceMesh && !mediaPipeFaceMesh) {
      try {
        mediaPipeFaceMesh = new window.FaceMesh({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
        });

        mediaPipeFaceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        mediaPipeFaceMesh.onResults(onMediaPipeResults);
      } catch (err) {
        console.warn('MediaPipe initialization fallback to 3D geometry:', err);
      }
    }

    runHeadTrackingLoop();
  }

  function onMediaPipeResults(results) {
    if (!prefs.headTracking || !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      return;
    }

    const landmarks = results.multiFaceLandmarks[0];
    const nose = landmarks[1];
    const rightEye = landmarks[33];
    const leftEye = landmarks[263];
    const forehead = landmarks[10];
    const chin = landmarks[152];

    const faceMidX = (leftEye.x + rightEye.x) / 2;
    const faceMidY = (forehead.y + chin.y) / 2;
    const faceWidth = Math.max(0.01, Math.abs(leftEye.x - rightEye.x));
    const faceHeight = Math.max(0.01, Math.abs(chin.y - forehead.y));

    // Calculate Head Pose Rotation Angles
    currentYaw = (nose.x - faceMidX) / faceWidth;
    currentPitch = (nose.y - faceMidY) / faceHeight;

    // Landmark 168 / Landmark 6: Glabella (precisely between both eyes)
    const glabella = landmarks[168] || landmarks[6] || landmarks[197] || {
      x: (leftEye.x + rightEye.x) / 2,
      y: (leftEye.y + rightEye.y) / 2,
    };

    // Draw Live 3D Face Mesh Wireframe Mask
    const overlayCanvas = document.getElementById('a11y-webcam-overlay-canvas');
    if (overlayCanvas) {
      const isStill = isHeadStationary(currentYaw, currentPitch);
      draw3DFaceMeshMask(overlayCanvas, landmarks, isStill);
    }

    processHeadAngles(currentYaw, currentPitch, glabella.x, glabella.y);
  }

  function draw3DFaceMeshMask(canvas, landmarks, isStationary) {
    if (!canvas || !landmarks) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width || 320;
    const h = canvas.height || 240;
    if (canvas.width !== 320) canvas.width = 320;
    if (canvas.height !== 240) canvas.height = 240;

    ctx.clearRect(0, 0, w, h);

    // Full 3D Facial Contour Polygons & Triangulation Lines
    const contourPolygons = [
      // 1. 3D Face Oval / Jawline
      [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10],
      // 2. Forehead Curves & Temple
      [10, 151, 9, 8, 168],
      [54, 103, 67, 109, 10, 338, 297, 332, 284],
      // 3. Left Eye & Eyebrow
      [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7, 33],
      [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
      // 4. Right Eye & Eyebrow
      [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382, 362],
      [336, 296, 334, 293, 300, 285, 295, 282, 283, 276],
      // 5. 3D Nose Bridge & T-Zone
      [168, 6, 197, 195, 5, 4, 1, 2, 98, 327, 168],
      // 6. Cheekbone Triangulation Meshes
      [116, 123, 147, 213, 192, 138, 135, 116],
      [345, 352, 376, 433, 416, 367, 364, 345],
      // 7. Lips Outer & Inner
      [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146, 61],
      [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78]
    ];

    ctx.lineWidth = 1.1;
    ctx.strokeStyle = isStationary ? 'rgba(16, 185, 129, 0.65)' : 'rgba(234, 88, 12, 0.65)';

    for (const poly of contourPolygons) {
      ctx.beginPath();
      for (let i = 0; i < poly.length; i++) {
        const pt = landmarks[poly[i]];
        if (!pt) continue;
        const px = pt.x * w;
        const py = pt.y * h;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // 3D Glabella Anchor Target between both eyes (Landmark 168)
    const glabella = landmarks[168] || landmarks[6] || landmarks[197];
    if (glabella) {
      const gx = glabella.x * w;
      const gy = glabella.y * h;

      // 3D HUD Reticle Crosshairs
      ctx.beginPath();
      ctx.moveTo(gx - 10, gy);
      ctx.lineTo(gx - 4, gy);
      ctx.moveTo(gx + 4, gy);
      ctx.lineTo(gx + 10, gy);
      ctx.moveTo(gx, gy - 10);
      ctx.lineTo(gx, gy - 4);
      ctx.moveTo(gx, gy + 4);
      ctx.lineTo(gx, gy + 10);
      ctx.strokeStyle = isStationary ? '#10B981' : '#EA580C';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Solid Anchor Center
      ctx.beginPath();
      ctx.arc(gx, gy, 3.5, 0, 2 * Math.PI);
      ctx.fillStyle = isStationary ? '#10B981' : '#EA580C';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Outer Pulse Reticle
      ctx.beginPath();
      ctx.arc(gx, gy, 7.5, 0, 2 * Math.PI);
      ctx.strokeStyle = isStationary ? 'rgba(16, 185, 129, 0.95)' : 'rgba(234, 88, 12, 0.95)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  }

  function isHeadStationary(yaw, pitch) {
    if (yawHistory.length < 3) return false;
    const lastYaw = yawHistory[yawHistory.length - 1];
    const lastPitch = pitchHistory[pitchHistory.length - 1];
    const vel = Math.hypot(yaw - lastYaw, pitch - lastPitch);
    return vel < 0.0075;
  }

  function stopHeadTracking() {
    if (headTrackAnimId) {
      cancelAnimationFrame(headTrackAnimId);
      headTrackAnimId = null;
    }

    if (headTrackStream) {
      headTrackStream.getTracks().forEach((track) => track.stop());
      headTrackStream = null;
    }

    const pip = document.getElementById('a11y-webcam-pip');
    if (pip) pip.style.display = 'none';

    if (headCursorEl) {
      headCursorEl.style.display = 'none';
    }

    const ring = document.querySelector('#a11y-head-cursor circle');
    if (ring) ring.style.strokeDashoffset = '100';
    if (dwellTarget) {
      dwellTarget.classList.remove('a11y-dwell-active-target');
    }
    dwellTarget = null;
    dwellStartTime = 0;
  }

  let lastLightCheckTime = 0;
  function checkAndAdjustLightingForHeadTracking(video, canvas, ctx, width, height) {
    if (!prefs.headTracking) return;
    const now = Date.now();
    if (now - lastLightCheckTime < 2500) return; // Check every 2.5s
    lastLightCheckTime = now;

    try {
      if (!ctx || width === 0 || height === 0) return;
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      let totalLum = 0;
      let count = 0;
      for (let i = 0; i < data.length; i += 24) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        totalLum += (0.299 * r + 0.587 * g + 0.114 * b);
        count++;
      }
      const avgLum = count > 0 ? (totalLum / count) : 100;

      // When environment is dark (< 52 luminance) and site is in Dark Mode:
      if (avgLum < 52) {
        const currentTheme = document.documentElement.getAttribute('data-theme') || localStorage.getItem('skillsphere_theme');
        if (currentTheme === 'dark') {
          document.documentElement.setAttribute('data-theme', 'light');
          try {
            localStorage.setItem('skillsphere_theme', 'light');
          } catch(e) {}
          showToastNotice('<i class="fas fa-sun" style="color:#F59E0B;"></i> Ruangan Gelap Terdeteksi: Mode Terang diaktifkan agar kamera dapat mendeteksi wajah dengan jelas.');
        }
      }
    } catch(e) {}
  }

  function runHeadTrackingLoop() {
    const video = document.getElementById('a11y-webcam-video');
    const canvas = document.getElementById('a11y-headtrack-canvas');
    if (!video || !canvas || !prefs.headTracking) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const width = canvas.width;
    const height = canvas.height;

    async function processFrame() {
      if (!prefs.headTracking || !headTrackStream) return;

      if (video.readyState >= 2) {
        checkAndAdjustLightingForHeadTracking(video, canvas, ctx, width, height);

        if (mediaPipeFaceMesh) {
          try {
            await mediaPipeFaceMesh.send({ image: video });
          } catch (e) {
            runGeometric3DFallback(video, canvas, ctx, width, height);
          }
        } else {
          runGeometric3DFallback(video, canvas, ctx, width, height);
        }
      }

      headTrackAnimId = requestAnimationFrame(processFrame);
    }

    processFrame();
  }

  /**
   * High-Precision 3D Geometric Fallback for Head Yaw/Pitch Rotation
   */
  function runGeometric3DFallback(video, canvas, ctx, width, height) {
    ctx.drawImage(video, 0, 0, width, height);
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let leftHalfSkin = 0;
    let rightHalfSkin = 0;
    let topHalfSkin = 0;
    let bottomHalfSkin = 0;
    let sumX = 0;
    let sumY = 0;
    let totalWeight = 0;
    let topFaceY = height;
    let bottomFaceY = 0;

    for (let y = 4; y < height - 4; y += 2) {
      for (let x = 4; x < width - 4; x += 2) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        const isSkin = (r > 45 && g > 28 && b > 15 && r > g && (r - b) > 10);
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        if (isSkin && lum > 30 && lum < 240) {
          sumX += x;
          sumY += y;
          totalWeight++;

          if (y < topFaceY) topFaceY = y;
          if (y > bottomFaceY) bottomFaceY = y;

          if (x < width / 2) leftHalfSkin++;
          else rightHalfSkin++;

          if (y < height / 2) topHalfSkin++;
          else bottomHalfSkin++;
        }
      }
    }

    if (totalWeight > 30) {
      const avgX = sumX / totalWeight;

      // Compute 3D Yaw & Pitch from facial symmetry balance
      const balanceX = (rightHalfSkin - leftHalfSkin) / (totalWeight || 1);
      const balanceY = (bottomHalfSkin - topHalfSkin) / (totalWeight || 1);

      currentYaw = balanceX * 1.5;
      currentPitch = balanceY * 1.8;

      // Position tracking marker precisely between the two eyes (35% from the top of the detected head)
      const eyeLevelY = topFaceY < bottomFaceY ? (topFaceY + (bottomFaceY - topFaceY) * 0.35) / height : 0.35;
      
      const overlayCanvas = document.getElementById('a11y-webcam-overlay-canvas');
      if (overlayCanvas) {
        const isStill = isHeadStationary(currentYaw, currentPitch);
        drawFallback3DMask(overlayCanvas, avgX, eyeLevelY, isStill);
      }

      processHeadAngles(currentYaw, currentPitch, avgX / width, eyeLevelY);
    }
  }

  function drawFallback3DMask(canvas, avgX, eyeLevelY, isStationary) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width || 320;
    const h = canvas.height || 240;
    if (canvas.width !== 320) canvas.width = 320;
    if (canvas.height !== 240) canvas.height = 240;
    ctx.clearRect(0, 0, w, h);

    const gx = avgX * (w / 80);
    const gy = eyeLevelY * h;

    ctx.strokeStyle = isStationary ? 'rgba(16, 185, 129, 0.65)' : 'rgba(234, 88, 12, 0.65)';
    ctx.lineWidth = 1.2;

    // Stylized 3D Head Oval
    ctx.beginPath();
    ctx.ellipse(gx, gy + (h * 0.08), w * 0.26, h * 0.36, 0, 0, 2 * Math.PI);
    ctx.stroke();

    // Eye bar & Eyebrow Lines
    ctx.beginPath();
    ctx.moveTo(gx - w * 0.16, gy);
    ctx.lineTo(gx + w * 0.16, gy);
    ctx.moveTo(gx - w * 0.14, gy - 8);
    ctx.lineTo(gx - w * 0.04, gy - 10);
    ctx.moveTo(gx + w * 0.04, gy - 10);
    ctx.lineTo(gx + w * 0.14, gy - 8);
    ctx.stroke();

    // 3D Nose Bridge & Cheek Triangles
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx, gy + h * 0.14);
    ctx.lineTo(gx - w * 0.04, gy + h * 0.16);
    ctx.lineTo(gx + w * 0.04, gy + h * 0.16);
    ctx.closePath();
    ctx.stroke();

    // Glabella Anchor HUD Crosshair Target
    ctx.beginPath();
    ctx.moveTo(gx - 8, gy);
    ctx.lineTo(gx - 3, gy);
    ctx.moveTo(gx + 3, gy);
    ctx.lineTo(gx + 8, gy);
    ctx.moveTo(gx, gy - 8);
    ctx.lineTo(gx, gy - 3);
    ctx.moveTo(gx, gy + 3);
    ctx.lineTo(gx, gy + 8);
    ctx.strokeStyle = isStationary ? '#10B981' : '#EA580C';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(gx, gy, 3.5, 0, 2 * Math.PI);
    ctx.fillStyle = isStationary ? '#10B981' : '#EA580C';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(gx, gy, 7, 0, 2 * Math.PI);
    ctx.strokeStyle = isStationary ? 'rgba(16, 185, 129, 0.95)' : 'rgba(234, 88, 12, 0.95)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  function processHeadAngles(yaw, pitch, normEyeX, normEyeY) {
    if (neutralYaw === null || neutralPitch === null) {
      neutralYaw = yaw;
      neutralPitch = pitch;
      filteredYaw = yaw;
      filteredPitch = pitch;
    }

    // Instantaneous Angular Velocity Calculation
    const angVel = Math.hypot(yaw - lastRawYaw, pitch - lastRawPitch);
    lastRawYaw = yaw;
    lastRawPitch = pitch;

    // Adaptive Exponential Filter:
    // Heavy noise rejection when head is resting; fast dynamic responsiveness when moving intentionally
    const alpha = angVel < 0.007 ? 0.10 : (angVel > 0.020 ? 0.48 : 0.25);
    filteredYaw = filteredYaw + (yaw - filteredYaw) * alpha;
    filteredPitch = filteredPitch + (pitch - filteredPitch) * alpha;

    // Rolling window buffer to eliminate residual tremors
    yawHistory.push(filteredYaw);
    pitchHistory.push(filteredPitch);
    if (yawHistory.length > HISTORY_SIZE) yawHistory.shift();
    if (pitchHistory.length > HISTORY_SIZE) pitchHistory.shift();

    const smoothYaw = yawHistory.reduce((a, b) => a + b, 0) / yawHistory.length;
    const smoothPitch = pitchHistory.reduce((a, b) => a + b, 0) / pitchHistory.length;

    // Handle 9-Point Calibration sampling (Rolling window buffer for click snapshot)
    if (isCalibrating9Pt && currentCalibStep < CALIBRATION_POINTS.length) {
      calibCurrentSamples.push({ yaw: smoothYaw, pitch: smoothPitch });
      if (calibCurrentSamples.length > 25) calibCurrentSamples.shift();

      const monitorBadge = document.getElementById('a11y-calib-live-monitor');
      if (monitorBadge) {
        const degYaw = Math.round(smoothYaw * 60);
        const degPitch = Math.round(-smoothPitch * 60);
        const isStill = isHeadStationary(smoothYaw, smoothPitch);
        const statusIcon = isStill ? '<span style="color:#10B981;">● Posisi Stabil</span>' : '<span style="color:#EA580C;">● Menoleh</span>';
        monitorBadge.innerHTML = `${statusIcon} | Yaw: ${degYaw >= 0 ? '+' : ''}${degYaw}° | Pitch: ${degPitch >= 0 ? '+' : ''}${degPitch}° (Klik Mouse / Spasi)`;
      }
    }

    // Offset relative to calibrated neutral gaze
    let deltaYaw = smoothYaw - neutralYaw;
    let deltaPitch = smoothPitch - neutralPitch;

    // Deadband threshold: reject micro-tremors (< 0.008 rad)
    const DEADBAND = 0.008;
    if (Math.abs(deltaYaw) < DEADBAND) deltaYaw = 0;
    else deltaYaw = Math.sign(deltaYaw) * (Math.abs(deltaYaw) - DEADBAND);

    if (Math.abs(deltaPitch) < DEADBAND) deltaPitch = 0;
    else deltaPitch = Math.sign(deltaPitch) * (Math.abs(deltaPitch) - DEADBAND);

    const sens = parseFloat(prefs.headSensitivity) || 3.4;

    let targetX;
    let targetY;

    // If 9-Point Polynomial Regression Model exists, use personalized matrix mapping!
    if (calibrationModel && calibrationModel.cx && calibrationModel.cy) {
      const cx = calibrationModel.cx;
      const cy = calibrationModel.cy;
      targetX = cx[0] + cx[1] * smoothYaw + cx[2] * smoothPitch + cx[3] * (smoothYaw * smoothPitch);
      targetY = cy[0] + cy[1] * smoothYaw + cy[2] * smoothPitch + cy[3] * (smoothYaw * smoothPitch);
    } else {
      // Ergonomic Non-Linear Power Curve (Effortless Downward Pitch)
      const pitchMultiplier = deltaPitch > 0 ? 5.6 : 4.2;
      const accelYaw = Math.sign(deltaYaw) * Math.pow(Math.abs(deltaYaw) * 3.5, 1.18);
      const accelPitch = Math.sign(deltaPitch) * Math.pow(Math.abs(deltaPitch) * pitchMultiplier, 1.15);

      const screenMoveX = -accelYaw * (window.innerWidth / 2) * sens;
      const screenMoveY = accelPitch * (window.innerHeight / 2) * sens;

      targetX = (window.innerWidth / 2) + screenMoveX;
      targetY = (window.innerHeight / 2) + screenMoveY;
    }

    // Clamping to viewport bounds
    targetX = Math.max(16, Math.min(window.innerWidth - 16, targetX));
    targetY = Math.max(16, Math.min(window.innerHeight - 16, targetY));

    // Magnetic Target Gravitation (Snaps stickily to buttons, inputs, links, and cards within 70px)
    const rawElUnder = document.elementFromPoint(targetX, targetY);
    const snapCandidate = rawElUnder?.closest('button, a, input, select, [role="button"], label, .btn, .card, .account-item-card, .auth-card');
    if (snapCandidate) {
      const rect = snapCandidate.getBoundingClientRect();
      const elCenterX = rect.left + rect.width / 2;
      const elCenterY = rect.top + rect.height / 2;
      const distToCenter = Math.hypot(targetX - elCenterX, targetY - elCenterY);
      if (distToCenter < 70) {
        targetX = targetX * 0.45 + elCenterX * 0.55;
        targetY = targetY * 0.45 + elCenterY * 0.55;
      }
    }

    // Stillness Detection Streak
    if (angVel < 0.0075) {
      stillnessStreak++;
    } else if (angVel > 0.014) {
      stillnessStreak = 0;
    }

    // ROCK-SOLID ZERO-VELOCITY STILLNESS LOCK:
    // If head is stationary (streak >= 2), lock cursor 100% in place (ZERO wandering/creep)
    if (stillnessStreak >= 2) {
      if (!isStillnessLocked) {
        isStillnessLocked = true;
        lockedScreenX = headCursorX;
        lockedScreenY = headCursorY;
      }
    }

    if (isStillnessLocked) {
      const distFromLock = Math.hypot(targetX - lockedScreenX, targetY - lockedScreenY);
      // If user intentionally turns head beyond deadzone (distance > 32px or angular velocity > 0.015), break lock!
      if (distFromLock > 32 || angVel > 0.015) {
        isStillnessLocked = false;
        stillnessStreak = 0;
      } else {
        // Enforce 100% frozen cursor position (Zero-Jitter Lock)
        headCursorX = lockedScreenX;
        headCursorY = lockedScreenY;

        if (headCursorEl) {
          headCursorEl.style.left = `${headCursorX}px`;
          headCursorEl.style.top = `${headCursorY}px`;
        }

        handleHeadDwell(headCursorX, headCursorY);
        return;
      }
    }

    // When moving intentionally: Smooth interpolation towards target
    const dist = Math.hypot(targetX - headCursorX, targetY - headCursorY);
    if (dist >= 3) {
      const lerpFactor = dist > 45 ? 0.38 : (dist > 15 ? 0.26 : 0.16);
      headCursorX += (targetX - headCursorX) * lerpFactor;
      headCursorY += (targetY - headCursorY) * lerpFactor;
      lockedScreenX = headCursorX;
      lockedScreenY = headCursorY;
    }

    // Final boundary clamp
    headCursorX = Math.max(14, Math.min(window.innerWidth - 14, headCursorX));
    headCursorY = Math.max(14, Math.min(window.innerHeight - 14, headCursorY));

    // Position virtual head cursor
    if (headCursorEl) {
      headCursorEl.style.left = `${headCursorX}px`;
      headCursorEl.style.top = `${headCursorY}px`;
    }

    // Handle Dwell-to-Click
    handleHeadDwell(headCursorX, headCursorY);
  }

  function handleHeadDwell(x, y) {
    const el = document.elementFromPoint(x, y);
    const ring = document.querySelector('#a11y-head-cursor circle');
    if (!el) {
      if (ring) ring.style.strokeDashoffset = '100';
      if (dwellTarget) {
        dwellTarget.classList.remove('a11y-dwell-active-target');
      }
      dwellTarget = null;
      dwellStartTime = 0;
      return;
    }

    // Check if target is clickable or interactive container
    const clickable = el.closest('button, a, input, select, [role="button"], label, .btn, .card, .account-item-card');

    // Also trigger hover TTS if Hover Reader is on
    if (prefs.hoverSpeak && el !== currentHoveredElement) {
      const text = extractCleanText(el);
      if (text && text.length > 2) {
        if (currentHoveredElement) currentHoveredElement.classList.remove('a11y-hover-speaking-element');
        currentHoveredElement = el;
        el.classList.add('a11y-hover-speaking-element');

        if (hoverTimer) clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => {
          speak(text, prefs.voice || 'id-female', 0, 0).catch(() => {});
        }, 200);
      }
    }

    if (clickable) {
      if (dwellTarget !== clickable) {
        if (dwellTarget) dwellTarget.classList.remove('a11y-dwell-active-target');
        dwellTarget = clickable;
        dwellStartTime = Date.now();
        clickable.classList.add('a11y-dwell-active-target');
        if (ring) ring.style.strokeDashoffset = '100';
      } else {
        const elapsed = Date.now() - dwellStartTime;
        const progress = Math.min(1, elapsed / DWELL_CLICK_DURATION);
        if (ring) {
          ring.style.strokeDashoffset = (100 - progress * 100).toString();
        }

        if (elapsed >= DWELL_CLICK_DURATION) {
          // Trigger click
          clickable.click();
          clickable.focus();
          showToastNotice('<i class="fas fa-hand-pointer" style="color:#EA580C;"></i> Klik Terpicu!');
          dwellStartTime = Date.now() + 800; // Reset with cooldown
          if (ring) ring.style.strokeDashoffset = '100';
        }
      }
    } else {
      if (dwellTarget) {
        dwellTarget.classList.remove('a11y-dwell-active-target');
      }
      dwellTarget = null;
      dwellStartTime = 0;
      if (ring) ring.style.strokeDashoffset = '100';
    }
  }

  function showToastNotice(msg) {
    let toast = document.getElementById('a11y-toast-notice');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'a11y-toast-notice';
      toast.style.cssText = `
        position: fixed;
        bottom: 84px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: #18181B;
        color: #FFFFFF;
        padding: 10px 18px;
        border-radius: 9999px;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        z-index: 999999;
        opacity: 0;
        pointer-events: none;
        transition: all 0.25s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: var(--font-sans, "Plus Jakarta Sans", sans-serif);
      `;
      document.body.appendChild(toast);
    }
    toast.innerHTML = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
    }, 2400);
  }

  function renderWidget() {
    if (document.getElementById('a11y-launcher-btn')) return;

    // 1. Reading ruler element
    const ruler = document.createElement('div');
    ruler.id = 'a11y-reading-ruler';
    ruler.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ruler);

    document.addEventListener('mousemove', (e) => {
      if (prefs.readingRuler) {
        ruler.style.top = e.clientY + 'px';
      }
    });

    // 2. Virtual Head Cursor Element with SVG Dwell Ring
    const headCursor = document.createElement('div');
    headCursor.id = 'a11y-head-cursor';
    headCursor.setAttribute('aria-hidden', 'true');
    headCursor.innerHTML = `
      <svg class="a11y-dwell-ring" viewBox="0 0 36 36">
        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(234, 88, 12, 0.2)" stroke-width="3" />
        <circle cx="18" cy="18" r="15.9155" />
      </svg>
    `;
    document.body.appendChild(headCursor);

    // 3. Mini Webcam PiP with Live 3D Mesh Overlay Canvas (Clean Unobstructed View)
    const pip = document.createElement('div');
    pip.id = 'a11y-webcam-pip';
    pip.innerHTML = `
      <video id="a11y-webcam-video" playsinline muted autoplay></video>
      <canvas id="a11y-webcam-overlay-canvas"></canvas>
      <canvas id="a11y-headtrack-canvas" width="80" height="60" style="display:none;"></canvas>
    `;
    document.body.appendChild(pip);

    // 4. Launcher button
    const launcher = document.createElement('button');
    launcher.id = 'a11y-launcher-btn';
    launcher.className = 'a11y-fab-launcher';
    launcher.setAttribute('type', 'button');
    launcher.setAttribute('aria-label', 'Buka Menu Aksesibilitas & Pembaca Suara (Alt + A)');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-controls', 'a11y-dialog-panel');
    launcher.innerHTML = '<i class="fas fa-universal-access" aria-hidden="true"></i>';
    document.body.appendChild(launcher);

    // 5. Backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'a11y-backdrop';
    backdrop.className = 'a11y-drawer-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);

    // 6. Panel (Clean Accessibility Panel)
    const panel = document.createElement('div');
    panel.id = 'a11y-dialog-panel';
    panel.className = 'a11y-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Panel Aksesibilitas & Kontrol Motorik');
    panel.innerHTML = `
      <div class="a11y-panel-header">
        <h2 class="a11y-panel-title">
          <i class="fas fa-universal-access" style="color:var(--accent-primary, #000);"></i>
          Menu Aksesibilitas
        </h2>
        <button type="button" class="a11y-btn-close" id="a11y-close-btn" aria-label="Tutup menu aksesibilitas">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="a11y-panel-body">
        <!-- Motor & Voice Section -->
        <div>
          <div class="a11y-section-title">
            <i class="fas fa-head-side-couch" style="font-size: 11px; margin-right: 4px;"></i> Kontrol Motorik & Suara
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            
            <!-- Head Tracking Toggle -->
            <label class="a11y-toggle-row" for="toggle-head-tracking" style="background: rgba(234, 88, 12, 0.08); border-color: rgba(234, 88, 12, 0.35);">
              <span class="a11y-toggle-label" style="font-weight: 600; color: #EA580C;">
                <i class="fas fa-camera"></i> Kontrol Kursor Kepala (Head Tracking)
              </span>
              <span class="a11y-switch">
                <input type="checkbox" id="toggle-head-tracking">
                <span class="a11y-slider" style="background-color: #EA580C;"></span>
              </span>
            </label>

            <!-- Subcontrols for Head Tracking -->
            <div id="a11y-headtrack-subcontrols" style="display: none; flex-direction: column; gap: 8px; padding: 10px; background: rgba(234, 88, 12, 0.05); border-radius: 8px; border: 1px dashed rgba(234, 88, 12, 0.3);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 11px; font-weight: 600; color: #EA580C;">
                  Sensitivitas: <span id="a11y-sens-val">3.2x</span>
                </span>
                <button type="button" id="a11y-panel-recenter-btn" style="background: #EA580C; color: #FFF; border: none; border-radius: 6px; padding: 3px 8px; font-size: 10.5px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                  <i class="fas fa-crosshairs"></i> Pusatkan
                </button>
              </div>
              <input type="range" id="a11y-head-sens-slider" min="1.0" max="5.0" step="0.2" value="3.2" style="width: 100%; accent-color: #EA580C; cursor: pointer;">
              
              <!-- 9-Point Calibration Button & Status -->
              <button type="button" id="a11y-panel-start-calib-btn" style="width: 100%; background: var(--accent-primary, #000); color: #FFF; border: none; border-radius: 6px; padding: 7px 10px; font-size: 11.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 2px;">
                <i class="fas fa-bullseye" style="color: #EA580C;"></i> Mulai Kalibrasi Layar 9 Titik
              </button>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: var(--text-secondary);">
                <span id="a11y-calib-status-badge">Status: Belum Terkalibrasi</span>
                <button type="button" id="a11y-panel-reset-calib-btn" style="background: none; border: none; color: #EF4444; font-size: 10px; cursor: pointer; text-decoration: underline; padding: 0;">Reset</button>
              </div>
            </div>

            <!-- Hover to Speak Toggle -->
            <label class="a11y-toggle-row" for="toggle-hover-speak">
              <span class="a11y-toggle-label">
                <i class="fas fa-volume-high"></i> Baca Saat Kursor Diarahkan (Hover)
              </span>
              <span class="a11y-switch">
                <input type="checkbox" id="toggle-hover-speak">
                <span class="a11y-slider"></span>
              </span>
            </label>

            <!-- Voice Selection Dropdown -->
            <div style="padding: 4px 0;">
              <label for="a11y-voice-select" style="font-size: 11px; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 4px;">
                Pilihan Karakter Suara
              </label>
              <select id="a11y-voice-select" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-subtle); background: var(--bg-surface); color: var(--text-primary); font-size: 12.5px; font-weight: 500; cursor: pointer;">
                <option value="id-female">id-female (Bahasa Indonesia - Wanita)</option>
                <option value="id-male">id-male (Bahasa Indonesia - Pria)</option>
                <option value="en-female">en-female (English - Female)</option>
                <option value="en-male">en-male (English - Male)</option>
                <option value="multi-female">multi-female (Multilingual - Female)</option>
                <option value="multi-male">multi-male (Multilingual - Male)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Visual Enhancements -->
        <div>
          <div class="a11y-section-title">
            <i class="fas fa-sliders" style="font-size: 11px; margin-right: 4px;"></i> Penyesuaian Visual & Kognitif
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <label class="a11y-toggle-row" for="toggle-dyslexic">
              <span class="a11y-toggle-label">
                <i class="fas fa-font"></i> Font Ramah Disleksia
              </span>
              <span class="a11y-switch">
                <input type="checkbox" id="toggle-dyslexic">
                <span class="a11y-slider"></span>
              </span>
            </label>

            <label class="a11y-toggle-row" for="toggle-contrast">
              <span class="a11y-toggle-label">
                <i class="fas fa-circle-half-stroke"></i> Kontras Tinggi (AAA)
              </span>
              <span class="a11y-switch">
                <input type="checkbox" id="toggle-contrast">
                <span class="a11y-slider"></span>
              </span>
            </label>

            <label class="a11y-toggle-row" for="toggle-ruler">
              <span class="a11y-toggle-label">
                <i class="fas fa-ruler-horizontal"></i> Garis Bantu Baca (Ruler)
              </span>
              <span class="a11y-switch">
                <input type="checkbox" id="toggle-ruler">
                <span class="a11y-slider"></span>
              </span>
            </label>

            <label class="a11y-toggle-row" for="toggle-motion">
              <span class="a11y-toggle-label">
                <i class="fas fa-film"></i> Kurangi Animasi (Motion)
              </span>
              <span class="a11y-switch">
                <input type="checkbox" id="toggle-motion">
                <span class="a11y-slider"></span>
              </span>
            </label>
          </div>
        </div>

        <!-- Font Size Options (4 Responsive Scales) -->
        <div>
          <div class="a11y-section-title">
            <i class="fas fa-text-height" style="font-size: 11px; margin-right: 4px;"></i> Ukuran Teks Halaman
          </div>
          <div class="a11y-grid" role="group" aria-label="Pilihan ukuran teks">
            <button type="button" class="a11y-grid-btn" id="a11y-font-sm" data-size="small">
              <span style="font-size: 11.5px; font-weight: 600;">A-</span>
              <span style="font-size: 10.5px;">Kecil</span>
            </button>
            <button type="button" class="a11y-grid-btn" id="a11y-font-norm" data-size="normal">
              <span style="font-size: 13px; font-weight: 600;">A</span>
              <span style="font-size: 10.5px;">Normal</span>
            </button>
            <button type="button" class="a11y-grid-btn" id="a11y-font-lg" data-size="large">
              <span style="font-size: 15px; font-weight: 700;">A+</span>
              <span style="font-size: 10.5px;">Besar</span>
            </button>
            <button type="button" class="a11y-grid-btn" id="a11y-font-xl" data-size="xlarge">
              <span style="font-size: 17.5px; font-weight: 700;">A++</span>
              <span style="font-size: 10.5px;">Ekstra</span>
            </button>
          </div>
        </div>
      </div>

      <div class="a11y-panel-footer">
        <button type="button" class="a11y-btn-reset" id="a11y-btn-reset">
          <i class="fas fa-rotate-left"></i> Reset ke Standar
        </button>
        <span style="font-size: 11px; color: var(--text-tertiary, #9C968D);">Shortcut: Alt + A</span>
      </div>
    `;
    document.body.appendChild(panel);

    // Event Listeners
    launcher.addEventListener('click', togglePanel);
    backdrop.addEventListener('click', closePanel);
    document.getElementById('a11y-close-btn').addEventListener('click', closePanel);

    // Voice Selection
    const voiceSelect = document.getElementById('a11y-voice-select');
    voiceSelect.value = prefs.voice || 'id-female';
    voiceSelect.addEventListener('change', (e) => {
      prefs.voice = e.target.value;
      savePrefs();
    });

    // Head Tracking Recenter buttons
    document.getElementById('a11y-pip-recenter-btn')?.addEventListener('click', calibrateHeadNeutral);
    document.getElementById('a11y-panel-recenter-btn')?.addEventListener('click', calibrateHeadNeutral);

    // 9-Point Calibration buttons
    document.getElementById('a11y-pip-calib-btn')?.addEventListener('click', start9PointCalibration);
    document.getElementById('a11y-panel-start-calib-btn')?.addEventListener('click', () => {
      closePanel();
      start9PointCalibration();
    });
    document.getElementById('a11y-panel-reset-calib-btn')?.addEventListener('click', resetCalibrationModel);

    // Sensitivity Slider
    const sensSlider = document.getElementById('a11y-head-sens-slider');
    if (sensSlider) {
      sensSlider.value = prefs.headSensitivity || 3.2;
      sensSlider.addEventListener('input', (e) => {
        prefs.headSensitivity = parseFloat(e.target.value);
        const valEl = document.getElementById('a11y-sens-val');
        if (valEl) valEl.innerText = e.target.value + 'x';
        savePrefs();
      });
    }

    // Head Tracking Toggle
    const togHead = document.getElementById('toggle-head-tracking');
    togHead.addEventListener('change', (e) => {
      unlockAudio();
      prefs.headTracking = e.target.checked;
      savePrefs();
    });

    // Hover Speak Toggle
    const togHover = document.getElementById('toggle-hover-speak');
    togHover.addEventListener('change', (e) => {
      unlockAudio();
      prefs.hoverSpeak = e.target.checked;
      savePrefs();
      if (prefs.hoverSpeak) {
        showToastNotice('<i class="fas fa-volume-high" style="color:#EA580C;"></i> Hover Reader AKTIF! Arahkan kursor ke teks.');
      } else {
        showToastNotice('Hover Reader Dinonaktifkan.');
      }
    });

    // Font Sizing (Small, Normal, Large, XLarge)
    ['small', 'normal', 'large', 'xlarge'].forEach((size) => {
      const btn = document.querySelector(`[data-size="${size}"]`);
      if (btn) {
        btn.addEventListener('click', () => {
          prefs.fontSize = size;
          savePrefs();
          showToastNotice(`Ukuran teks diubah ke: ${size.toUpperCase()}`);
        });
      }
    });

    // Toggles
    const togDyslexic = document.getElementById('toggle-dyslexic');
    togDyslexic.addEventListener('change', (e) => {
      prefs.dyslexic = e.target.checked;
      savePrefs();
    });

    const togContrast = document.getElementById('toggle-contrast');
    togContrast.addEventListener('change', (e) => {
      prefs.highContrast = e.target.checked;
      savePrefs();
    });

    const togRuler = document.getElementById('toggle-ruler');
    togRuler.addEventListener('change', (e) => {
      prefs.readingRuler = e.target.checked;
      savePrefs();
    });

    const togMotion = document.getElementById('toggle-motion');
    togMotion.addEventListener('change', (e) => {
      prefs.reduceMotion = e.target.checked;
      savePrefs();
    });

    // Reset Button
    document.getElementById('a11y-btn-reset').addEventListener('click', () => {
      if (sharedAudio) {
        sharedAudio.pause();
        sharedAudio.currentTime = 0;
      }
      prefs = { ...defaultPrefs };
      resetCalibrationModel();
      savePrefs();
      showToastNotice('Pengaturan aksesibilitas telah di-reset ke standar.');
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if (isCalibrating9Pt) {
        if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
          e.preventDefault();
          recordCurrentCalibPoint();
          return;
        }
        if (e.key === 'Backspace' || e.key === 'ArrowLeft') {
          e.preventDefault();
          goToPrevCalibPoint();
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          cancel9PointCalibration();
          return;
        }
      }

      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        togglePanel();
      }
      if (e.key === 'Escape') {
        const p = document.getElementById('a11y-dialog-panel');
        if (p && p.classList.contains('active')) {
          closePanel();
        }
      }
    });
  }

  function togglePanel() {
    const panel = document.getElementById('a11y-dialog-panel');
    const backdrop = document.getElementById('a11y-backdrop');
    const launcher = document.getElementById('a11y-launcher-btn');
    if (!panel) return;

    const isActive = panel.classList.contains('active');
    if (isActive) {
      closePanel();
    } else {
      unlockAudio();
      panel.classList.add('active');
      if (backdrop) backdrop.classList.add('active');
      if (launcher) launcher.setAttribute('aria-expanded', 'true');
      document.getElementById('a11y-close-btn')?.focus();
    }
  }

  function closePanel() {
    const panel = document.getElementById('a11y-dialog-panel');
    const backdrop = document.getElementById('a11y-backdrop');
    const launcher = document.getElementById('a11y-launcher-btn');
    if (panel) panel.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
    if (launcher) {
      launcher.setAttribute('aria-expanded', 'false');
      launcher.focus();
    }
  }

  function updateUIElements() {
    // Font button active states
    document.querySelectorAll('.a11y-grid-btn').forEach((b) => {
      const size = b.getAttribute('data-size');
      b.classList.toggle('active', size === prefs.fontSize);
      b.setAttribute('aria-pressed', size === prefs.fontSize ? 'true' : 'false');
    });

    // Checkboxes & Selects
    const voiceSel = document.getElementById('a11y-voice-select');
    if (voiceSel) voiceSel.value = prefs.voice || 'id-female';

    const togHead = document.getElementById('toggle-head-tracking');
    if (togHead) togHead.checked = !!prefs.headTracking;

    const subControls = document.getElementById('a11y-headtrack-subcontrols');
    if (subControls) subControls.style.display = prefs.headTracking ? 'flex' : 'none';

    const sensSlider = document.getElementById('a11y-head-sens-slider');
    if (sensSlider) sensSlider.value = prefs.headSensitivity || 3.2;

    const sensVal = document.getElementById('a11y-sens-val');
    if (sensVal) sensVal.innerText = (prefs.headSensitivity || 3.2) + 'x';

    const calibBadge = document.getElementById('a11y-calib-status-badge');
    if (calibBadge) {
      if (calibrationModel && calibrationModel.cx) {
        calibBadge.innerHTML = '<i class="fas fa-check-circle" style="color:#10B981;"></i> Status: Terkalibrasi (9 Titik)';
      } else {
        calibBadge.innerHTML = 'Status: Belum Terkalibrasi';
      }
    }

    const togHover = document.getElementById('toggle-hover-speak');
    if (togHover) togHover.checked = !!prefs.hoverSpeak;

    const togDys = document.getElementById('toggle-dyslexic');
    if (togDys) togDys.checked = !!prefs.dyslexic;

    const togCon = document.getElementById('toggle-contrast');
    if (togCon) togCon.checked = !!prefs.highContrast;

    const togRul = document.getElementById('toggle-ruler');
    if (togRul) togRul.checked = !!prefs.readingRuler;

    const togMot = document.getElementById('toggle-motion');
    if (togMot) togMot.checked = !!prefs.reduceMotion;
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      renderWidget();
      applyPrefs();
      setupHoverToSpeak();
    });
  } else {
    renderWidget();
    applyPrefs();
    setupHoverToSpeak();
  }
})();
