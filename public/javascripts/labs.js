/**
 * SkillSphere AI - Ruang Lab & Praktikum Kode (Student Interactive IDE)
 * Handles unified lab & practicum filtering, code editor with line numbers,
 * AI code evaluation submissions, and submission history.
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1. State & Constants
  // ---------------------------------------------------------------------------
  const state = {
    mode: 'all',
    language: 'all',
    difficulty: 'all',
    search: '',
    challenges: [],
    selectedChallenge: null,
    activeLeftTab: 'instructions',
    submissions: [],
    isSubmitting: false
  };

  // ---------------------------------------------------------------------------
  // 2. Security & Utility Helpers
  // ---------------------------------------------------------------------------
  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toArray(val) {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      } catch (_) {
        return val.trim() ? [val] : [];
      }
    }
    return [];
  }

  function safeParseObject(val) {
    if (!val) return {};
    if (typeof val === 'object' && !Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (_) {
        return {};
      }
    }
    return {};
  }

  function getAuthToken() {
    const token =
      localStorage.getItem('skillsphere_access_token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('token');
    if (token) {
      if (!localStorage.getItem('skillsphere_access_token')) {
        localStorage.setItem('skillsphere_access_token', token);
      }
      if (!localStorage.getItem('token')) {
        localStorage.setItem('token', token);
      }
    }
    return token || '';
  }

  function buildHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
  }

  function normalizeLanguage(lang) {
    const raw = String(lang || '').trim().toLowerCase();
    if (raw === 'js' || raw === 'javascript' || raw === 'node') return 'javascript';
    if (raw === 'py' || raw === 'python') return 'python';
    if (raw === 'sql' || raw === 'mysql' || raw === 'postgresql') return 'sql';
    if (raw === 'html' || raw === 'css' || raw === 'html/css' || raw === 'html-css') return 'html/css';
    if (raw === 'php') return 'php';
    return raw;
  }

  function formatLanguageLabel(lang) {
    const norm = normalizeLanguage(lang);
    const map = {
      javascript: 'JavaScript',
      python: 'Python',
      sql: 'SQL',
      'html/css': 'HTML/CSS',
      php: 'PHP'
    };
    return map[norm] || (lang ? String(lang) : 'Kode');
  }

  function normalizeDifficulty(diff) {
    const raw = String(diff || 'beginner').trim().toLowerCase();
    if (raw === 'beginner' || raw === 'easy') return 'beginner';
    if (raw === 'intermediate' || raw === 'medium') return 'intermediate';
    if (raw === 'advanced' || raw === 'hard') return 'advanced';
    return raw;
  }

  function formatDifficulty(diff) {
    const raw = String(diff || 'beginner').trim().toLowerCase();
    const map = {
      beginner: { label: 'Pemula', cls: 'pill-diff-beginner' },
      easy: { label: 'Mudah', cls: 'pill-diff-easy' },
      intermediate: { label: 'Menengah', cls: 'pill-diff-intermediate' },
      medium: { label: 'Menengah', cls: 'pill-diff-medium' },
      advanced: { label: 'Lanjut', cls: 'pill-diff-advanced' },
      hard: { label: 'Sulit', cls: 'pill-diff-hard' }
    };
    return map[raw] || { label: diff || 'Pemula', cls: 'pill-diff-beginner' };
  }

  function formatMode(mode) {
    const raw = String(mode || 'create').trim().toLowerCase();
    if (raw === 'fix') {
      return {
        shortLabel: 'Perbaiki Kode',
        fullLabel: 'Tugas: Perbaiki Kode',
        cls: 'pill-mode-fix'
      };
    }
    return {
      shortLabel: 'Buat Kode',
      fullLabel: 'Tugas: Buat Kode',
      cls: 'pill-mode-create'
    };
  }

  function formatRoomLabel() {
    return 'Lab & Praktikum';
  }

  function formatDateTime(isoString) {
    if (!isoString) return '-';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // ---------------------------------------------------------------------------
  // 3. Inline Alert Helpers
  // ---------------------------------------------------------------------------
  function clearInlineAlert() {
    const box = document.getElementById('labInlineAlertContainer');
    if (box) box.innerHTML = '';
  }

  function showInlineAlert(type, message, showLoginLink) {
    const box = document.getElementById('labInlineAlertContainer');
    if (!box) return;
    const alertClass = type === 'danger' ? 'alert-danger' : 'alert-warning';
    const icon = type === 'danger' ? 'fa-circle-exclamation' : 'fa-lock';
    const loginHtml = showLoginLink
      ? '<a href="/login" class="lab-alert-link"><i class="fas fa-right-to-bracket" aria-hidden="true"></i> Masuk Sekarang</a>'
      : '';

    box.innerHTML = `
      <div class="lab-inline-alert ${alertClass}" role="alert">
        <span><i class="fas ${icon}" aria-hidden="true" style="margin-right:6px;"></i>${escapeHtml(message)}</span>
        ${loginHtml}
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // 4. Code Editor & Line Numbers Synchronization
  // ---------------------------------------------------------------------------
  function updateLineNumbers() {
    const textarea = document.getElementById('codeEditorTextarea');
    const gutter = document.getElementById('codeLineNumbers');
    if (!textarea || !gutter) return;

    const lines = textarea.value.split('\n').length;
    const count = Math.max(lines, 1);
    const nums = [];
    for (let i = 1; i <= count; i += 1) {
      nums.push(i);
    }
    gutter.textContent = nums.join('\n');
    gutter.scrollTop = textarea.scrollTop;
  }

  function updateCursorInfo() {
    const textarea = document.getElementById('codeEditorTextarea');
    const info = document.getElementById('editorCursorInfo');
    if (!textarea || !info) return;

    const pos = textarea.selectionStart || 0;
    const before = textarea.value.slice(0, pos);
    const lines = before.split('\n');
    const lineNum = lines.length;
    const colNum = lines[lines.length - 1].length + 1;
    info.textContent = 'Baris ' + lineNum + ', Kolom ' + colNum;
  }

  function setEditorCode(codeText) {
    const textarea = document.getElementById('codeEditorTextarea');
    if (!textarea) return;
    textarea.value = typeof codeText === 'string' ? codeText : '';
    updateLineNumbers();
    updateCursorInfo();
  }

  function setupEditorInteractions() {
    const textarea = document.getElementById('codeEditorTextarea');
    const gutter = document.getElementById('codeLineNumbers');
    if (!textarea) return;

    textarea.addEventListener('input', function () {
      updateLineNumbers();
      updateCursorInfo();
    });

    textarea.addEventListener('scroll', function () {
      if (gutter) gutter.scrollTop = textarea.scrollTop;
    });

    textarea.addEventListener('keyup', updateCursorInfo);
    textarea.addEventListener('click', updateCursorInfo);

    textarea.addEventListener('keydown', function (e) {
      // Ctrl+Enter / Cmd+Enter triggers AI analysis
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        submitCodeForAnalysis();
        return;
      }

      // Tab inserts 2 spaces instead of moving focus
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const val = textarea.value;

        if (e.shiftKey) {
          const lineStart = val.lastIndexOf('\n', start - 1) + 1;
          if (val.slice(lineStart, lineStart + 2) === '  ') {
            textarea.value = val.slice(0, lineStart) + val.slice(lineStart + 2);
            const nextPos = Math.max(lineStart, start - 2);
            textarea.selectionStart = nextPos;
            textarea.selectionEnd = Math.max(lineStart, end - 2);
          }
        } else {
          textarea.value = val.slice(0, start) + '  ' + val.slice(end);
          textarea.selectionStart = start + 2;
          textarea.selectionEnd = start + 2;
        }
        updateLineNumbers();
        updateCursorInfo();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 5. Data Fetching: Stats, Challenges, Challenge Detail, Submissions
  // ---------------------------------------------------------------------------
  async function fetchStudentStats() {
    const elSolved = document.getElementById('statSolved');
    const elAttempts = document.getElementById('statAttempts');
    const elAvg = document.getElementById('statAvgScore');

    if (!getAuthToken()) {
      if (elSolved) elSolved.textContent = '0';
      if (elAttempts) elAttempts.textContent = '0';
      if (elAvg) elAvg.textContent = '-';
      return;
    }

    try {
      const res = await fetch('/api/labs/stats/me', { headers: buildHeaders() });
      if (!res.ok) return;
      const json = await res.json();
      const stats = (json && json.data) ? json.data : {};

      const solved = stats.solved_count ?? stats.solved ?? stats.total_solved ?? 0;
      const attempts = stats.total_submissions ?? stats.total_attempts ?? stats.attempts ?? 0;
      const avgRaw = stats.average_score ?? stats.avg_score ?? 0;
      const avgFormatted = Number.isFinite(Number(avgRaw)) ? Math.round(Number(avgRaw)) : 0;

      if (elSolved) elSolved.textContent = String(solved);
      if (elAttempts) elAttempts.textContent = String(attempts);
      if (elAvg) elAvg.textContent = attempts > 0 ? String(avgFormatted) : '0';
    } catch (err) {
      console.error('Gagal memuat statistik lab:', err);
    }
  }

  async function fetchChallenges() {
    const grid = document.getElementById('challengesGrid');
    if (grid) {
      grid.innerHTML = `
        <div class="labs-empty-state">
          <i class="fas fa-spinner fa-spin" aria-hidden="true"></i>
          <h3>Memuat Tantangan Lab &amp; Praktikum...</h3>
          <p>Mohon tunggu sebentar.</p>
        </div>
      `;
    }

    try {
      const params = new URLSearchParams();
      const urlCourseId = new URLSearchParams(window.location.search).get('course_id');
      if (urlCourseId) {
        params.set('course_id', urlCourseId);
      }
      const queryString = params.toString();
      const endpoint = queryString ? '/api/labs?' + queryString : '/api/labs';
      const res = await fetch(endpoint, { headers: buildHeaders() });
      const json = await res.json();

      const rawList =
        (json && json.data && Array.isArray(json.data.items))
          ? json.data.items
          : (json && json.data && Array.isArray(json.data.challenges))
            ? json.data.challenges
            : (json && Array.isArray(json.data))
              ? json.data
              : [];

      state.challenges = rawList;
      renderChallengesList();

      // Auto-select challenge matching ?lab_id=... or first matching challenge
      const filtered = getFilteredChallenges();
      if (filtered.length > 0) {
        const urlLabId = new URLSearchParams(window.location.search).get('lab_id');
        const requestedLab = urlLabId
          ? filtered.find(c => String(c.id) === String(urlLabId))
          : null;
        const stillExists = state.selectedChallenge &&
          filtered.some(c => String(c.id) === String(state.selectedChallenge.id));
        if (requestedLab && (!state.selectedChallenge || String(state.selectedChallenge.id) !== String(requestedLab.id))) {
          await selectChallenge(requestedLab, false);
        } else if (!stillExists) {
          await selectChallenge(filtered[0], false);
        }
      } else {
        state.selectedChallenge = null;
        renderEmptyWorkspace();
      }
    } catch (err) {
      console.error('Gagal memuat daftar tantangan lab:', err);
      if (grid) {
        grid.innerHTML = `
          <div class="labs-empty-state">
            <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
            <h3>Gagal Memuat Tantangan</h3>
            <p>Terjadi kendala saat mengambil data dari server. Silakan muat ulang halaman.</p>
          </div>
        `;
      }
    }
  }

  function getFilteredChallenges() {
    const list = Array.isArray(state.challenges) ? state.challenges : [];
    const searchLower = state.search.trim().toLowerCase();

    return list.filter(item => {
      if (!item) return false;

      if (state.mode !== 'all') {
        const itemMode = String(item.mode || item.challenge_mode || 'create').toLowerCase();
        if (itemMode !== state.mode) return false;
      }

      if (state.language !== 'all') {
        const itemLang = normalizeLanguage(item.language);
        if (itemLang !== state.language) return false;
      }

      if (state.difficulty !== 'all') {
        const itemDiff = normalizeDifficulty(item.difficulty);
        const targetDiff = normalizeDifficulty(state.difficulty);
        if (itemDiff !== targetDiff) return false;
      }

      if (searchLower) {
        const title = String(item.title || '').toLowerCase();
        const desc = String(item.description || '').toLowerCase();
        const lang = String(item.language || '').toLowerCase();
        if (!title.includes(searchLower) && !desc.includes(searchLower) && !lang.includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }

  function renderChallengesList() {
    const grid = document.getElementById('challengesGrid');
    if (!grid) return;

    const filtered = getFilteredChallenges();
    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="labs-empty-state">
          <i class="fas fa-folder-open" aria-hidden="true"></i>
          <h3>Tidak Ada Tantangan Ditemukan</h3>
          <p>Coba ubah filter mode, bahasa pemrograman, atau kata kunci pencarian Anda.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(c => {
      const isSelected = state.selectedChallenge && String(state.selectedChallenge.id) === String(c.id);
      const modeMeta = formatMode(c.mode || c.challenge_mode);
      const diffMeta = formatDifficulty(c.difficulty);
      const langLabel = formatLanguageLabel(c.language);
      const isSolved = Boolean(
        c.is_solved ||
        c.solved ||
        (c.user_status && c.user_status.solved) ||
        (c.user_progress && c.user_progress.is_solved)
      );
      const bestScoreVal =
        c.best_score ??
        (c.user_status ? c.user_status.best_score : null) ??
        (c.user_progress ? c.user_progress.best_score : null);
      const bestScoreText = (bestScoreVal !== null && bestScoreVal !== undefined && bestScoreVal > 0)
        ? String(bestScoreVal) + '/100'
        : '-';
      const courseTitle = c.course && c.course.title ? String(c.course.title) : '';

      return `
        <button
          type="button"
          class="challenge-card ${isSelected ? 'selected' : ''}"
          data-challenge-id="${escapeHtml(c.id)}"
        >
          <div>
            <div class="challenge-card-top">
              <h3 class="challenge-card-title">${escapeHtml(c.title || 'Tantangan Kode')}</h3>
              ${isSolved
                ? '<span class="solved-badge"><i class="fas fa-check" aria-hidden="true"></i> Selesai</span>'
                : ''}
            </div>
            ${courseTitle
              ? `<div style="font-size:0.78rem;color:var(--text-secondary,#6B6A65);margin-top:6px;line-height:1.35;"><i class="fas fa-graduation-cap" aria-hidden="true" style="margin-right:4px;"></i>${escapeHtml(courseTitle)}</div>`
              : ''}
            <div class="challenge-pills-row" style="margin-top:10px;">
              <span class="lab-pill ${modeMeta.cls}">${escapeHtml(modeMeta.shortLabel)}</span>
              <span class="lab-pill pill-lang">${escapeHtml(langLabel)}</span>
              <span class="lab-pill ${diffMeta.cls}">${escapeHtml(diffMeta.label)}</span>
            </div>
          </div>
          <div class="challenge-card-footer">
            <span>Skor Terbaik</span>
            <span class="challenge-score-mono">${escapeHtml(bestScoreText)}</span>
          </div>
        </button>
      `;
    }).join('');

    // Bind click listeners safely
    const cards = grid.querySelectorAll('.challenge-card');
    cards.forEach(btn => {
      btn.addEventListener('click', function () {
        const cid = btn.getAttribute('data-challenge-id');
        const found = filtered.find(item => String(item.id) === String(cid));
        if (found) {
          selectChallenge(found, true);
        }
      });
    });
  }

  function renderEmptyWorkspace() {
    const inst = document.getElementById('instructionsPane');
    if (inst) {
      inst.innerHTML = `
        <div class="labs-empty-state" style="border:none; background:transparent;">
          <i class="fas fa-code" aria-hidden="true"></i>
          <h3>Belum Ada Tantangan Dipilih</h3>
          <p>Pilih salah satu tantangan di daftar atas untuk mulai berlatih.</p>
        </div>
      `;
    }
    setEditorCode('');
    resetAnalysisPlaceholder();
  }

  async function selectChallenge(challengeSummary, shouldScrollOnMobile) {
    clearInlineAlert();
    let challenge = challengeSummary;

    // Fetch full challenge detail if endpoint is available
    if (challengeSummary && challengeSummary.id) {
      try {
        const res = await fetch('/api/labs/' + encodeURIComponent(challengeSummary.id), {
          headers: buildHeaders()
        });
        if (res.ok) {
          const json = await res.json();
          if (json && json.success && json.data) {
            challenge = Object.assign({}, challengeSummary, json.data);
          }
        }
      } catch (_) {
        // Fallback to summary object
      }
    }

    state.selectedChallenge = challenge;
    renderChallengesList();
    renderInstructionsPane(challenge);
    updateEditorHeader(challenge);

    const initialCode = challenge.starter_code || challenge.buggy_code || '';
    setEditorCode(initialCode);
    resetAnalysisPlaceholder();

    // Load submission history for this challenge
    await fetchChallengeSubmissions(challenge.id);

    if (shouldScrollOnMobile && window.innerWidth <= 860) {
      const workspace = document.getElementById('ideWorkspace');
      if (workspace) {
        workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  function updateEditorHeader(challenge) {
    const langBadge = document.getElementById('editorLangBadge');
    const modeBadge = document.getElementById('editorModeBadge');
    const modeMeta = formatMode(challenge.mode || challenge.challenge_mode);

    if (langBadge) {
      langBadge.textContent = formatLanguageLabel(challenge.language);
    }
    if (modeBadge) {
      modeBadge.textContent = modeMeta.shortLabel;
      modeBadge.className = 'lab-pill ' + modeMeta.cls;
    }
  }

  function renderInstructionsPane(c) {
    const pane = document.getElementById('instructionsPane');
    if (!pane || !c) return;

    const modeMeta = formatMode(c.mode || c.challenge_mode);
    const diffMeta = formatDifficulty(c.difficulty);
    const roomLabel = formatRoomLabel();
    const passingScore = c.passing_score ?? 70;
    const testCases = toArray(c.test_cases);
    const hints = toArray(c.hints);

    const testCasesHtml = testCases.length > 0
      ? `
        <div class="problem-box">
          <h3 class="problem-box-title">
            <i class="fas fa-vial-circle-check" aria-hidden="true"></i>
            Kasus Uji (${testCases.length})
          </h3>
          <ul class="test-cases-list">
            ${testCases.map((tc, idx) => {
              if (typeof tc === 'string') {
                return `<li class="test-case-item"><div class="test-case-io">${escapeHtml(tc)}</div></li>`;
              }
              const tcName = tc.name || tc.description || ('Kasus Uji #' + (idx + 1));
              const tcInput = tc.input !== undefined ? String(tc.input) : '';
              const tcExpected = tc.expected_output !== undefined
                ? String(tc.expected_output)
                : (tc.expected !== undefined ? String(tc.expected) : '');
              return `
                <li class="test-case-item">
                  <div class="test-case-name">${escapeHtml(tcName)}</div>
                  ${tcInput ? `<div class="test-case-io">Input: ${escapeHtml(tcInput)}</div>` : ''}
                  ${tcExpected ? `<div class="test-case-io">Output Diharapkan: ${escapeHtml(tcExpected)}</div>` : ''}
                </li>
              `;
            }).join('')}
          </ul>
        </div>
      `
      : '';

    const hintsHtml = hints.length > 0
      ? `
        <div class="hints-accordion">
          <button type="button" class="hints-toggle-btn" id="btnToggleHints" aria-expanded="false">
            <span><i class="fas fa-lightbulb" aria-hidden="true" style="margin-right:7px; color:var(--lab-warning);"></i>Lihat Petunjuk (Hint)</span>
            <i class="fas fa-chevron-down" id="hintsChevron" aria-hidden="true"></i>
          </button>
          <div class="hints-content" id="hintsContent" style="display:none;">
            <ol class="hints-list">
              ${hints.map(h => `<li>${escapeHtml(typeof h === 'string' ? h : (h.text || JSON.stringify(h)))}</li>`).join('')}
            </ol>
          </div>
        </div>
      `
      : '';

    const expectedBoxHtml = c.expected_output
      ? `
        <div class="problem-box">
          <h3 class="problem-box-title">
            <i class="fas fa-bullseye" aria-hidden="true"></i>
            Output Diharapkan / Kriteria Keberhasilan
          </h3>
          <pre class="expected-output-pre">${escapeHtml(c.expected_output)}</pre>
        </div>
      `
      : '';

    pane.innerHTML = `
      <div class="problem-badges-row">
        <span class="lab-pill">${escapeHtml(roomLabel)}</span>
        <span class="lab-pill ${modeMeta.cls}">${escapeHtml(modeMeta.fullLabel)}</span>
        <span class="lab-pill ${diffMeta.cls}">${escapeHtml(diffMeta.label)}</span>
        <span class="lab-pill">Skor Lulus: ${escapeHtml(passingScore)}/100</span>
      </div>

      <h2 class="problem-title">${escapeHtml(c.title || 'Tantangan Kode')}</h2>
      <p class="problem-description">${escapeHtml(c.description || 'Ikuti instruksi dan selesaikan kode di panel editor.')}</p>

      ${expectedBoxHtml}
      ${testCasesHtml}
      ${hintsHtml}
    `;

    const toggleHintsBtn = document.getElementById('btnToggleHints');
    const hintsContent = document.getElementById('hintsContent');
    const hintsChevron = document.getElementById('hintsChevron');
    if (toggleHintsBtn && hintsContent) {
      toggleHintsBtn.addEventListener('click', function () {
        const isHidden = hintsContent.style.display === 'none';
        hintsContent.style.display = isHidden ? 'block' : 'none';
        toggleHintsBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
        if (hintsChevron) {
          hintsChevron.className = isHidden ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
        }
      });
    }
  }

  async function fetchChallengeSubmissions(challengeId) {
    const pane = document.getElementById('submissionsPane');
    if (!pane) return;

    if (!getAuthToken()) {
      state.submissions = [];
      pane.innerHTML = `
        <div class="labs-empty-state" style="border:none; background:transparent;">
          <i class="fas fa-lock" aria-hidden="true"></i>
          <h3>Masuk untuk Melihat Riwayat</h3>
          <p>Silakan <a href="/login" style="color:var(--text-primary); font-weight:600;">masuk ke akun Anda</a> agar riwayat pengumpulan kode tersimpan otomatis.</p>
        </div>
      `;
      return;
    }

    try {
      const res = await fetch('/api/labs/' + encodeURIComponent(challengeId) + '/submissions', {
        headers: buildHeaders()
      });
      if (!res.ok) {
        state.submissions = [];
        renderSubmissionsPane();
        return;
      }
      const json = await res.json();
      const list =
        (json && json.data && Array.isArray(json.data.items))
          ? json.data.items
          : (json && json.data && Array.isArray(json.data.submissions))
            ? json.data.submissions
            : (json && Array.isArray(json.data))
              ? json.data
              : [];

      state.submissions = list;
      renderSubmissionsPane();
    } catch (err) {
      console.error('Gagal memuat riwayat pengumpulan:', err);
      state.submissions = [];
      renderSubmissionsPane();
    }
  }

  function renderSubmissionsPane() {
    const pane = document.getElementById('submissionsPane');
    if (!pane) return;

    const list = Array.isArray(state.submissions) ? state.submissions : [];
    if (list.length === 0) {
      pane.innerHTML = `
        <div class="labs-empty-state" style="border:none; background:transparent;">
          <i class="fas fa-clock-rotate-left" aria-hidden="true"></i>
          <h3>Belum Ada Riwayat Pengumpulan</h3>
          <p>Klik tombol "Analisis Kode dengan AI" untuk mengirimkan solusi pertama Anda.</p>
        </div>
      `;
      return;
    }

    pane.innerHTML = `
      <p style="font-size:12.5px; color:var(--text-secondary); margin:0 0 12px 0;">
        Klik salah satu riwayat di bawah untuk memuat ulang kode ke dalam editor.
      </p>
      <div class="submissions-list">
        ${list.map((sub, idx) => {
          const verdict = String(sub.verdict || sub.status || 'incorrect').toLowerCase();
          const verdictCls = verdict === 'correct' ? 'correct' : (verdict === 'partial' ? 'partial' : 'incorrect');
          const verdictText = verdict === 'correct'
            ? 'Benar'
            : (verdict === 'partial' ? 'Sebagian Benar' : 'Belum Tepat');
          const scoreVal = sub.score ?? 0;
          const timeText = formatDateTime(sub.created_at || sub.createdAt || sub.submitted_at);

          return `
            <button type="button" class="submission-item-btn" data-sub-idx="${idx}">
              <div class="submission-item-top">
                <span class="submission-verdict-tag ${verdictCls}">${escapeHtml(verdictText)}</span>
                <span class="challenge-score-mono">Skor: ${escapeHtml(scoreVal)}/100</span>
              </div>
              <div class="submission-meta-row">
                <span>Percobaan #${list.length - idx}</span>
                <span>${escapeHtml(timeText)}</span>
              </div>
            </button>
          `;
        }).join('')}
      </div>
    `;

    const buttons = pane.querySelectorAll('.submission-item-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', function () {
        const idx = Number(btn.getAttribute('data-sub-idx'));
        const sub = list[idx];
        if (!sub) return;
        const codeToLoad = sub.submitted_code ?? sub.code ?? '';
        setEditorCode(codeToLoad);
        if (sub.ai_feedback || sub.ai_analysis || sub.verdict) {
          renderAnalysisResult(sub);
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 6. Code Submission & AI Analysis Rendering
  // ---------------------------------------------------------------------------
  function resetAnalysisPlaceholder() {
    const panel = document.getElementById('aiAnalysisPanel');
    if (!panel) return;
    panel.innerHTML = `
      <div class="ai-analysis-placeholder">
        <i class="fas fa-sparkles" aria-hidden="true"></i>
        <p style="margin:0;">
          Hasil evaluasi AI, skor, temuan perbaikan, dan hasil uji kasus akan ditampilkan di sini setelah Anda menekan <strong>Analisis Kode dengan AI</strong>.
        </p>
      </div>
    `;
  }

  function setSubmittingState(isLoading) {
    state.isSubmitting = isLoading;
    const btn = document.getElementById('btnAnalyzeCode');
    const icon = document.getElementById('analyzeBtnIcon');
    const text = document.getElementById('analyzeBtnText');

    if (btn) btn.disabled = isLoading;
    if (icon) {
      icon.className = isLoading ? 'fas fa-spinner fa-spin' : 'fas fa-wand-magic-sparkles';
    }
    if (text) {
      text.textContent = isLoading ? 'Menganalisis Kode...' : 'Analisis Kode dengan AI';
    }
  }

  async function submitCodeForAnalysis() {
    if (state.isSubmitting) return;
    clearInlineAlert();

    if (!state.selectedChallenge || !state.selectedChallenge.id) {
      showInlineAlert('warning', 'Silakan pilih tantangan kode terlebih dahulu sebelum melakukan analisis.', false);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      showInlineAlert(
        'warning',
        'Anda perlu masuk ke akun SkillSphere AI terlebih dahulu untuk menjalankan Analisis Kode dengan AI.',
        true
      );
      return;
    }

    const textarea = document.getElementById('codeEditorTextarea');
    const code = textarea ? textarea.value : '';
    if (!code.trim()) {
      showInlineAlert('warning', 'Editor kode masih kosong. Tulis atau perbaiki kode Anda terlebih dahulu.', false);
      return;
    }

    setSubmittingState(true);

    try {
      const res = await fetch(
        '/api/labs/' + encodeURIComponent(state.selectedChallenge.id) + '/submit',
        {
          method: 'POST',
          headers: buildHeaders(),
          body: JSON.stringify({ code: code, submitted_code: code })
        }
      );

      if (res.status === 401) {
        showInlineAlert(
          'warning',
          'Sesi login Anda telah berakhir. Silakan masuk kembali untuk menganalisis kode.',
          true
        );
        return;
      }

      const json = await res.json();
      if (!res.ok || !json.success) {
        showInlineAlert(
          'danger',
          (json && json.message) ? json.message : 'Gagal menganalisis kode. Silakan coba beberapa saat lagi.',
          false
        );
        return;
      }

      const payload = (json.data && json.data.submission) ? json.data.submission : (json.data || {});
      renderAnalysisResult(payload);

      // Refresh student stats & challenge submissions in background
      fetchStudentStats();
      fetchChallengeSubmissions(state.selectedChallenge.id);
      if (String(payload.verdict || '').toLowerCase() === 'correct') {
        state.selectedChallenge.is_solved = true;
        const best = Number(state.selectedChallenge.best_score || 0);
        const currentScore = Number(payload.score || 0);
        if (currentScore > best) state.selectedChallenge.best_score = currentScore;
        renderChallengesList();
      }
    } catch (err) {
      console.error('Error submitting code:', err);
      showInlineAlert('danger', 'Terjadi kesalahan jaringan saat menghubungi layanan analisis AI.', false);
    } finally {
      setSubmittingState(false);
    }
  }

  function renderAnalysisResult(result) {
    const panel = document.getElementById('aiAnalysisPanel');
    if (!panel || !result) return;

    const verdictRaw = String(result.verdict || 'incorrect').toLowerCase();
    let verdictClass = 'verdict-incorrect';
    let verdictIcon = 'fa-xmark';
    let verdictTitle = 'BELUM TEPAT (INCORRECT)';

    if (verdictRaw === 'correct') {
      verdictClass = 'verdict-correct';
      verdictIcon = 'fa-check';
      verdictTitle = 'KODE BENAR (CORRECT)';
    } else if (verdictRaw === 'partial') {
      verdictClass = 'verdict-partial';
      verdictIcon = 'fa-exclamation';
      verdictTitle = 'SEBAGIAN BENAR (PERLU PERBAIKAN)';
    }

    const score = Number.isFinite(Number(result.score)) ? Number(result.score) : 0;
    const passingScore = (state.selectedChallenge && state.selectedChallenge.passing_score)
      ? Number(state.selectedChallenge.passing_score)
      : 70;
    const passedThreshold = score >= passingScore;

    const analysis = safeParseObject(result.ai_analysis);
    const aiFeedback = result.ai_feedback || analysis.summary || 'Evaluasi selesai.';
    const strengths = toArray(analysis.strengths);
    const issues = toArray(analysis.issues);
    const testResults = toArray(analysis.test_results);
    const improvedHint = analysis.improved_hint || '';

    const strengthsHtml = strengths.length > 0
      ? `
        <div class="analysis-block">
          <h3 class="analysis-block-title">
            <i class="fas fa-circle-check" style="color:var(--lab-success);" aria-hidden="true"></i>
            Kelebihan Kode
          </h3>
          <ul class="analysis-list">
            ${strengths.map(item => `
              <li class="strength-item">
                <i class="fas fa-check" aria-hidden="true"></i>
                <span>${escapeHtml(typeof item === 'string' ? item : (item.message || JSON.stringify(item)))}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `
      : '';

    const issuesHtml = issues.length > 0
      ? `
        <div class="analysis-block">
          <h3 class="analysis-block-title">
            <i class="fas fa-wrench" style="color:var(--lab-warning);" aria-hidden="true"></i>
            Temuan &amp; Saran Perbaikan (${issues.length})
          </h3>
          <ul class="analysis-list">
            ${issues.map(issue => {
              if (typeof issue === 'string') {
                return `<li class="issue-card"><p class="issue-message">${escapeHtml(issue)}</p></li>`;
              }
              const lineNum = issue.line ?? issue.line_number ?? null;
              const sevRaw = String(issue.severity || 'warning').toLowerCase();
              const msg = issue.message || issue.description || '';
              const suggestion = issue.suggestion || issue.fix || '';
              return `
                <li class="issue-card">
                  <div class="issue-card-header">
                    ${lineNum !== null ? `<span class="issue-line-badge">Baris ${escapeHtml(lineNum)}</span>` : ''}
                    <span class="issue-severity-badge ${escapeHtml(sevRaw)}">${escapeHtml(sevRaw)}</span>
                  </div>
                  <p class="issue-message">${escapeHtml(msg)}</p>
                  ${suggestion ? `<p class="issue-suggestion"><strong>Saran:</strong> ${escapeHtml(suggestion)}</p>` : ''}
                </li>
              `;
            }).join('')}
          </ul>
        </div>
      `
      : '';

    const testResultsHtml = testResults.length > 0
      ? `
        <div class="analysis-block">
          <h3 class="analysis-block-title">
            <i class="fas fa-list-check" aria-hidden="true"></i>
            Hasil Uji Kasus
          </h3>
          <ul class="analysis-list">
            ${testResults.map((tr, idx) => {
              const isPass = Boolean(tr && (tr.passed === true || tr.status === 'passed' || tr.status === 'pass'));
              const label = (tr && (tr.name || tr.case || tr.description))
                ? (tr.name || tr.case || tr.description)
                : ('Kasus Uji #' + (idx + 1));
              const detail = (tr && (tr.detail || tr.message || tr.actual))
                ? (tr.detail || tr.message || ('Hasil: ' + tr.actual))
                : (isPass ? 'Lulus' : 'Tidak sesuai ekspektasi');

              return `
                <li class="test-result-item">
                  <i class="fas ${isPass ? 'fa-circle-check pass' : 'fa-circle-xmark fail'} test-result-icon" aria-hidden="true"></i>
                  <div>
                    <div style="font-weight:600; color:var(--text-primary);">${escapeHtml(label)}</div>
                    <div style="font-size:12px; color:var(--text-secondary);">${escapeHtml(detail)}</div>
                  </div>
                </li>
              `;
            }).join('')}
          </ul>
        </div>
      `
      : '';

    const improvedHintHtml = improvedHint
      ? `
        <div class="analysis-block">
          <h3 class="analysis-block-title">
            <i class="fas fa-compass" aria-hidden="true"></i>
            Petunjuk Langkah Berikutnya
          </h3>
          <div class="next-hint-box">${escapeHtml(improvedHint)}</div>
        </div>
      `
      : '';

    panel.innerHTML = `
      <div class="verdict-banner ${verdictClass}">
        <div class="verdict-badge-row">
          <div class="verdict-icon"><i class="fas ${verdictIcon}" aria-hidden="true"></i></div>
          <div>
            <p class="verdict-label">${escapeHtml(verdictTitle)}</p>
            <p class="verdict-threshold">
              Batas lulus: ${escapeHtml(passingScore)}/100 (${passedThreshold ? 'Memenuhi batas lulus' : 'Di bawah batas lulus'})
            </p>
          </div>
        </div>
        <div class="verdict-score-box">
          <span class="verdict-score-num">${escapeHtml(score)}</span>
          <span class="verdict-score-max">/100</span>
        </div>
      </div>

      <div class="analysis-block">
        <h3 class="analysis-block-title">
          <i class="fas fa-comment-dots" aria-hidden="true"></i>
          Ringkasan Evaluasi AI
        </h3>
        <p class="analysis-summary-text">${escapeHtml(aiFeedback)}</p>
      </div>

      ${strengthsHtml}
      ${issuesHtml}
      ${testResultsHtml}
      ${improvedHintHtml}
    `;
  }

  // ---------------------------------------------------------------------------
  // 7. UI Event Listeners
  // ---------------------------------------------------------------------------
  function bindEvents() {
    // Mode Filter Pills
    const modeBtns = document.querySelectorAll('#modeFilterGroup .filter-pill');
    modeBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        state.mode = btn.getAttribute('data-mode') || 'all';
        modeBtns.forEach(b => b.classList.toggle('active', b === btn));
        renderChallengesList();
      });
    });

    // Language Filter Pills
    const langBtns = document.querySelectorAll('#langFilterGroup .filter-pill');
    langBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        state.language = btn.getAttribute('data-lang') || 'all';
        langBtns.forEach(b => b.classList.toggle('active', b === btn));
        renderChallengesList();
      });
    });

    // Difficulty Filter Pills
    const diffRoot = document.getElementById('difficultyFilterGroup') || document;
    const diffBtns = diffRoot.querySelectorAll('[data-filter-difficulty]');
    diffBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        state.difficulty = String(btn.getAttribute('data-filter-difficulty') || 'all').toLowerCase();
        diffBtns.forEach(b => b.classList.toggle('active', b === btn));
        renderChallengesList();
      });
    });

    // Search Input
    const searchInput = document.getElementById('labSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        state.search = searchInput.value || '';
        renderChallengesList();
      });
    }

    // Left Panel Tabs (Instructions vs Submission History)
    const leftTabs = document.querySelectorAll('.panel-tab-btn');
    leftTabs.forEach(btn => {
      btn.addEventListener('click', function () {
        const target = btn.getAttribute('data-left-tab') || 'instructions';
        state.activeLeftTab = target;
        leftTabs.forEach(t => {
          const active = t.getAttribute('data-left-tab') === target;
          t.classList.toggle('active', active);
          t.setAttribute('aria-selected', active ? 'true' : 'false');
        });

        const instPane = document.getElementById('instructionsPane');
        const subPane = document.getElementById('submissionsPane');
        if (instPane) instPane.style.display = target === 'instructions' ? 'block' : 'none';
        if (subPane) subPane.style.display = target === 'submissions' ? 'block' : 'none';
      });
    });

    // Reset Starter Code
    const btnReset = document.getElementById('btnResetCode');
    if (btnReset) {
      btnReset.addEventListener('click', function () {
        if (!state.selectedChallenge) return;
        const starter = state.selectedChallenge.starter_code || state.selectedChallenge.buggy_code || '';
        setEditorCode(starter);
      });
    }

    // Copy Code
    const btnCopy = document.getElementById('btnCopyCode');
    if (btnCopy) {
      btnCopy.addEventListener('click', async function () {
        const textarea = document.getElementById('codeEditorTextarea');
        const label = document.getElementById('copyCodeLabel');
        if (!textarea) return;
        try {
          await navigator.clipboard.writeText(textarea.value);
          if (label) {
            label.textContent = 'Tersalin!';
            setTimeout(() => { label.textContent = 'Salin Kode'; }, 1600);
          }
        } catch (_) {
          textarea.select();
          document.execCommand('copy');
          if (label) {
            label.textContent = 'Tersalin!';
            setTimeout(() => { label.textContent = 'Salin Kode'; }, 1600);
          }
        }
      });
    }

    // Submit for AI Analysis
    const btnAnalyze = document.getElementById('btnAnalyzeCode');
    if (btnAnalyze) {
      btnAnalyze.addEventListener('click', submitCodeForAnalysis);
    }
  }

  // ---------------------------------------------------------------------------
  // 8. Initialization
  // ---------------------------------------------------------------------------
  function init() {
    setupEditorInteractions();
    bindEvents();
    updateLineNumbers();

    fetchStudentStats();
    fetchChallenges();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
