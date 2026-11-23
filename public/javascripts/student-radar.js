(function () {
  'use strict';

  const STAGE_DEFAULTS = [
    { level: 1, name: 'Pondasi', minScore: 0 },
    { level: 2, name: 'Eksplorasi', minScore: 20 },
    { level: 3, name: 'Praktisi', minScore: 40 },
    { level: 4, name: 'Spesialis', minScore: 60 },
    { level: 5, name: 'Expert', minScore: 80 }
  ];

  const DEFAULT_SKILL_LABELS = [
    'Pemrograman Dasar',
    'Web Development',
    'Basis Data',
    'AI & Data',
    'Cloud & DevOps',
    'Keamanan Siber'
  ];

  const DEFAULT_STAGE_LABELS = [
    'Penguasaan Materi',
    'Praktikum Kode',
    'Evaluasi Ujian',
    'Sertifikasi',
    'Konsistensi Belajar',
    'Kesiapan Karier'
  ];

  let radarChartInstance = null;
  let activeMode = 'skill';
  let normalizedState = null;

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function clampPercent(value, fallback) {
    const num = Number(value);
    if (!Number.isFinite(num)) return typeof fallback === 'number' ? fallback : 0;
    return Math.max(0, Math.min(100, Math.round(num)));
  }

  function toNonNegativeInt(value) {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) return 0;
    return Math.round(num);
  }

  function isDarkMode() {
    const htmlTheme = document.documentElement.getAttribute('data-theme');
    if (htmlTheme === 'dark') return true;
    if (document.documentElement.classList.contains('dark-mode')) return true;
    return Boolean(document.body && document.body.classList.contains('dark-mode'));
  }

  function getAuthToken() {
    try {
      return localStorage.getItem('token') || localStorage.getItem('skillsphere_access_token') || '';
    } catch (_err) {
      return '';
    }
  }

  function getStageNameByScore(score) {
    const pct = clampPercent(score, 0);
    if (pct >= 80) return 'Expert';
    if (pct >= 60) return 'Spesialis';
    if (pct >= 40) return 'Praktisi';
    if (pct >= 20) return 'Eksplorasi';
    return 'Pondasi';
  }

  function getStageLevelByScore(score) {
    const pct = clampPercent(score, 0);
    if (pct >= 80) return 5;
    if (pct >= 60) return 4;
    if (pct >= 40) return 3;
    if (pct >= 20) return 2;
    return 1;
  }

  function normalizeSkillRadar(rawData) {
    const source = rawData.skill_radar || rawData.skillRadar || rawData.skills_radar || (rawData.radar && (rawData.radar.skill || rawData.radar.skills)) || rawData.categories || null;

    let labels = [];
    let mastery = [];
    let practice = [];
    let target = [];

    if (Array.isArray(source) && source.length > 0) {
      labels = source.map(function (item) {
        return String(item.label || item.name || item.category || item.domain || 'Bidang');
      });
      mastery = source.map(function (item) {
        return clampPercent(item.mastery ?? item.material_score ?? item.materialScore ?? item.progress ?? item.score, 0);
      });
      practice = source.map(function (item) {
        return clampPercent(item.practice ?? item.lab_exam_score ?? item.labExamScore ?? item.practical ?? item.exam_score, 0);
      });
      target = source.map(function (item) {
        return clampPercent(item.target ?? item.target_score ?? item.targetScore, 80);
      });
    } else if (source && typeof source === 'object' && Array.isArray(source.labels) && source.labels.length > 0) {
      labels = source.labels.map(function (l) { return String(l); });

      if (Array.isArray(source.datasets) && source.datasets.length > 0) {
        const ds0 = source.datasets[0] && Array.isArray(source.datasets[0].data) ? source.datasets[0].data : [];
        const ds1 = source.datasets[1] && Array.isArray(source.datasets[1].data) ? source.datasets[1].data : [];
        const ds2 = source.datasets[2] && Array.isArray(source.datasets[2].data) ? source.datasets[2].data : [];
        mastery = labels.map(function (_, i) { return clampPercent(ds0[i], 0); });
        practice = labels.map(function (_, i) { return clampPercent(ds1[i], 0); });
        target = labels.map(function (_, i) { return clampPercent(ds2[i], 80); });
      } else {
        const mArr = Array.isArray(source.mastery) ? source.mastery : (Array.isArray(source.material) ? source.material : (Array.isArray(source.material_scores) ? source.material_scores : []));
        const pArr = Array.isArray(source.practice) ? source.practice : (Array.isArray(source.practical) ? source.practical : (Array.isArray(source.lab_exam) ? source.lab_exam : (Array.isArray(source.practice_scores) ? source.practice_scores : [])));
        const tArr = Array.isArray(source.target) ? source.target : (Array.isArray(source.targets) ? source.targets : (Array.isArray(source.target_scores) ? source.target_scores : []));
        mastery = labels.map(function (_, i) { return clampPercent(mArr[i], 0); });
        practice = labels.map(function (_, i) { return clampPercent(pArr[i], 0); });
        target = labels.map(function (_, i) { return clampPercent(tArr[i], 80); });
      }
    }

    if (labels.length < 3) {
      const existingMap = {};
      labels.forEach(function (lbl, idx) {
        existingMap[lbl.toLowerCase()] = {
          mastery: mastery[idx] || 0,
          practice: practice[idx] || 0,
          target: target[idx] || 80
        };
      });

      const mergedLabels = labels.slice();
      const mergedMastery = mastery.slice();
      const mergedPractice = practice.slice();
      const mergedTarget = target.slice();

      DEFAULT_SKILL_LABELS.forEach(function (fallbackLabel) {
        if (mergedLabels.length >= 6) return;
        if (!existingMap[fallbackLabel.toLowerCase()]) {
          mergedLabels.push(fallbackLabel);
          mergedMastery.push(0);
          mergedPractice.push(0);
          mergedTarget.push(75);
        }
      });

      labels = mergedLabels;
      mastery = mergedMastery;
      practice = mergedPractice;
      target = mergedTarget;
    }

    return { labels: labels, mastery: mastery, practice: practice, target: target };
  }

  function normalizeStageRadar(rawData) {
    const source = rawData.stage_radar || rawData.stageRadar || (rawData.radar && rawData.radar.stage) || rawData.dimensions || null;

    let labels = DEFAULT_STAGE_LABELS.slice();
    let current = [0, 0, 0, 0, 0, 0];
    let target = [80, 80, 80, 80, 80, 80];

    if (Array.isArray(source) && source.length > 0) {
      labels = source.map(function (item) {
        return String(item.label || item.name || item.dimension || 'Dimensi');
      });
      current = source.map(function (item) {
        return clampPercent(item.current ?? item.value ?? item.score ?? item.actual, 0);
      });
      target = source.map(function (item) {
        return clampPercent(item.target ?? item.target_score ?? item.benchmark, 80);
      });
    } else if (source && typeof source === 'object' && Array.isArray(source.labels) && source.labels.length > 0) {
      labels = source.labels.map(function (l) { return String(l); });

      if (Array.isArray(source.datasets) && source.datasets.length > 0) {
        const ds0 = source.datasets[0] && Array.isArray(source.datasets[0].data) ? source.datasets[0].data : [];
        const ds1 = source.datasets[1] && Array.isArray(source.datasets[1].data) ? source.datasets[1].data : [];
        current = labels.map(function (_, i) { return clampPercent(ds0[i], 0); });
        target = labels.map(function (_, i) { return clampPercent(ds1[i], 80); });
      } else {
        const cArr = Array.isArray(source.current) ? source.current : (Array.isArray(source.values) ? source.values : (Array.isArray(source.scores) ? source.scores : []));
        const tArr = Array.isArray(source.target) ? source.target : (Array.isArray(source.targets) ? source.targets : (Array.isArray(source.benchmark) ? source.benchmark : []));
        current = labels.map(function (_, i) { return clampPercent(cArr[i], 0); });
        target = labels.map(function (_, i) { return clampPercent(tArr[i], 80); });
      }
    }

    return { labels: labels, current: current, target: target };
  }

  function normalizePayload(json) {
    const data = (json && typeof json === 'object' && json.data && typeof json.data === 'object') ? json.data : (json || {});

    const rawTopics = Array.isArray(data.studied_topics)
      ? data.studied_topics
      : (Array.isArray(data.studiedTopics)
        ? data.studiedTopics
        : (Array.isArray(data.courses)
          ? data.courses
          : (Array.isArray(data.topics) ? data.topics : [])));

    const studiedTopics = rawTopics.map(function (item) {
      const progress = clampPercent(item.progress ?? item.progress_percent ?? item.progressPercent ?? item.completion, 0);
      return {
        courseId: item.course_id ?? item.courseId ?? item.id ?? '',
        slug: item.slug || '',
        title: String(item.title || item.course_title || item.name || 'Kursus Tanpa Judul'),
        category: String(item.category || item.category_name || item.categoryName || 'Umum'),
        progress: progress,
        stageLabel: String(item.stage_label || item.stageLabel || item.stage || item.status || (progress >= 100 ? 'Selesai' : (progress > 0 ? 'Sedang Belajar' : 'Baru Mulai')))
      };
    });

    const stageObj = (data.current_stage && typeof data.current_stage === 'object')
      ? data.current_stage
      : ((data.currentStage && typeof data.currentStage === 'object')
        ? data.currentStage
        : ((data.stage && typeof data.stage === 'object') ? data.stage : null));

    const overallScore = clampPercent(
      data.overall_score ?? data.overallScore ?? data.stage_score ?? data.stageScore ?? (stageObj && (stageObj.overall_score ?? stageObj.score)),
      0
    );

    const activeLevel = toNonNegativeInt(
      (stageObj && (stageObj.level ?? stageObj.index ?? stageObj.step)) ?? data.stage_level ?? data.stageLevel
    ) || getStageLevelByScore(overallScore);

    const stageName = String(
      (stageObj && (stageObj.name || stageObj.label || stageObj.title)) ||
      (typeof data.current_stage === 'string' ? data.current_stage : '') ||
      (typeof data.currentStage === 'string' ? data.currentStage : '') ||
      getStageNameByScore(overallScore)
    );

    const rawStages = Array.isArray(data.stages) && data.stages.length > 0 ? data.stages : STAGE_DEFAULTS;
    const stages = rawStages.slice(0, 5).map(function (st, idx) {
      const level = toNonNegativeInt(st.level ?? st.step) || (idx + 1);
      const isCurrent = typeof st.active === 'boolean' ? st.active : (level === activeLevel);
      const isReached = typeof st.reached === 'boolean' ? st.reached : (level <= activeLevel);
      return {
        level: level,
        name: String(st.name || st.label || STAGE_DEFAULTS[idx].name),
        active: isCurrent,
        reached: isReached
      };
    });

    const metricsObj = data.metrics || data.stats || data.summary_metrics || data;
    const metrics = {
      activeCourses: toNonNegativeInt(metricsObj.active_courses ?? metricsObj.activeCourses ?? metricsObj.enrolled_courses ?? metricsObj.enrolledCourses ?? metricsObj.total_courses ?? studiedTopics.length),
      completedLabs: toNonNegativeInt(metricsObj.completed_labs ?? metricsObj.completedLabs ?? metricsObj.labs_completed ?? metricsObj.labsCompleted ?? metricsObj.passed_labs),
      avgExamScore: clampPercent(metricsObj.avg_exam_score ?? metricsObj.avgExamScore ?? metricsObj.exam_score ?? metricsObj.examScore ?? metricsObj.average_exam_score, 0),
      certificates: toNonNegativeInt(metricsObj.certificates ?? metricsObj.certificates_count ?? metricsObj.certificatesCount ?? metricsObj.total_certificates ?? metricsObj.earned_certificates)
    };

    const summaryText = String(
      data.summary ||
      data.stage_summary ||
      data.stageSummary ||
      (stageObj && stageObj.description) ||
      ('Tahap saat ini: ' + stageName + ' (' + overallScore + '%) - lanjutkan materi dan praktikum untuk naik ke tahap berikutnya.')
    );

    return {
      overallScore: overallScore,
      stageLevel: activeLevel,
      stageName: stageName,
      summaryText: summaryText,
      stages: stages,
      metrics: metrics,
      studiedTopics: studiedTopics,
      skillRadar: normalizeSkillRadar(data),
      stageRadar: normalizeStageRadar(data)
    };
  }

  function renderSummaryAndStepper(state) {
    const summaryEl = document.getElementById('radarStageSummary');
    if (summaryEl) {
      summaryEl.textContent = state.summaryText;
    }

    const stepperEl = document.getElementById('radarStageStepper');
    if (!stepperEl) return;

    const pillsHtml = state.stages.map(function (st) {
      const classes = ['radar-stage-pill'];
      if (st.active) {
        classes.push('active');
      } else if (st.reached) {
        classes.push('reached');
      }
      const ariaCurrent = st.active ? ' aria-current="step"' : '';
      return (
        '<span class="' + classes.join(' ') + '"' + ariaCurrent + '>' +
          '<span class="radar-stage-pill-num">' + escapeHtml(st.level) + '</span>' +
          '<span>' + escapeHtml(st.level + '. ' + st.name) + '</span>' +
        '</span>'
      );
    }).join('');

    stepperEl.innerHTML =
      '<div class="radar-stage-pills" role="list" aria-label="Tahapan Belajar Siswa">' +
        pillsHtml +
      '</div>' +
      '<div class="radar-stage-overall" aria-label="Skor Keseluruhan Tahap Belajar">' +
        '<span>Tahap: ' + escapeHtml(state.stageName) + '</span>' +
        '<span class="radar-stage-overall-score">' + escapeHtml(state.overallScore) + '%</span>' +
      '</div>';
  }

  function renderMiniMetrics(metrics) {
    const container = document.getElementById('radarMetricsMini');
    if (!container) return;

    const items = [
      { label: 'Kursus Aktif', value: String(metrics.activeCourses), icon: 'fa-book-open', color: 'is-blue' },
      { label: 'Lab Selesai', value: String(metrics.completedLabs), icon: 'fa-flask', color: 'is-terracotta' },
      { label: 'Skor Ujian', value: metrics.avgExamScore + '%', icon: 'fa-award', color: 'is-amber' },
      { label: 'Sertifikat', value: String(metrics.certificates), icon: 'fa-certificate', color: 'is-emerald' }
    ];

    container.innerHTML = items.map(function (item) {
      return (
        '<div class="radar-kpi-tile">' +
          '<div class="radar-kpi-top">' +
            '<span class="radar-kpi-label">' + escapeHtml(item.label) + '</span>' +
            '<i class="fas ' + escapeHtml(item.icon) + ' radar-kpi-icon ' + escapeHtml(item.color) + '" aria-hidden="true"></i>' +
          '</div>' +
          '<div class="radar-kpi-value">' + escapeHtml(item.value) + '</div>' +
        '</div>'
      );
    }).join('');
  }

  function renderStudiedTopics(topics) {
    const container = document.getElementById('radarStudiedTopics');
    if (!container) return;

    if (!Array.isArray(topics) || topics.length === 0) {
      container.innerHTML =
        '<div class="radar-empty-state">' +
          '<p class="radar-empty-text">Belum ada kursus atau praktikum yang tercatat. Mulai belajar untuk memetakan kompetensi Anda.</p>' +
          '<div class="radar-empty-actions">' +
            '<a class="radar-cta-btn is-primary" href="/courses"><i class="fas fa-compass" aria-hidden="true"></i> Jelajahi Kursus</a>' +
            '<a class="radar-cta-btn" href="/labs"><i class="fas fa-code" aria-hidden="true"></i> Buka Coding Lab</a>' +
          '</div>' +
        '</div>';
      return;
    }

    container.innerHTML = topics.map(function (topic) {
      const targetId = topic.slug || topic.courseId;
      const href = targetId ? ('/courses/' + encodeURIComponent(String(targetId)) + '/learn') : '/courses';
      const isComplete = topic.progress >= 100;
      const stageClass = isComplete ? 'is-done' : (topic.progress > 0 ? 'is-progress' : '');

      return (
        '<a class="radar-topic-item" href="' + escapeHtml(href) + '">' +
          '<div class="radar-topic-head">' +
            '<span class="radar-topic-title">' + escapeHtml(topic.title) + '</span>' +
            '<span class="radar-topic-percent">' + escapeHtml(topic.progress) + '%</span>' +
          '</div>' +
          '<div class="radar-topic-meta">' +
            '<span class="radar-topic-category">' + escapeHtml(topic.category) + '</span>' +
            '<span class="radar-topic-stage ' + stageClass + '">' + escapeHtml(topic.stageLabel) + '</span>' +
          '</div>' +
          '<div class="radar-progress-track" role="progressbar" aria-valuenow="' + escapeHtml(topic.progress) + '" aria-valuemin="0" aria-valuemax="100">' +
            '<div class="radar-progress-fill' + (isComplete ? ' is-complete' : '') + '" style="width: ' + escapeHtml(topic.progress) + '%;"></div>' +
          '</div>' +
        '</a>'
      );
    }).join('');
  }

  function getThemePalette() {
    const dark = isDarkMode();
    return {
      gridColor: dark ? 'rgba(161, 160, 154, 0.22)' : 'rgba(20, 20, 19, 0.12)',
      angleLineColor: dark ? 'rgba(161, 160, 154, 0.22)' : 'rgba(20, 20, 19, 0.12)',
      pointLabelColor: dark ? '#FAF9F5' : '#141413',
      tickColor: dark ? '#A1A09A' : '#6B6A65',
      legendColor: dark ? '#FAF9F5' : '#141413',
      tooltipBg: dark ? '#1F1E1B' : '#FFFFFF',
      tooltipBorder: dark ? '#3B3934' : '#E5E4DE',
      tooltipTitle: dark ? '#FAF9F5' : '#141413',
      tooltipBody: dark ? '#E5E4DE' : '#6B6A65',
      pointBorder: dark ? '#1F1E1B' : '#FFFFFF'
    };
  }

  function buildChartConfig(state, mode) {
    const palette = getThemePalette();
    const isStageMode = mode === 'stage';
    const labels = isStageMode ? state.stageRadar.labels : state.skillRadar.labels;

    const datasets = isStageMode
      ? [
          {
            label: 'Capaian Saat Ini (%)',
            data: state.stageRadar.current,
            borderColor: '#D97757',
            backgroundColor: 'rgba(217, 119, 87, 0.22)',
            borderWidth: 2.2,
            pointBackgroundColor: '#D97757',
            pointBorderColor: palette.pointBorder,
            pointBorderWidth: 1.5,
            pointStyle: 'circle',
            pointRadius: 4.5,
            pointHoverRadius: 6
          },
          {
            label: 'Target Tahap (%)',
            data: state.stageRadar.target,
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            borderWidth: 2,
            borderDash: [6, 4],
            pointBackgroundColor: '#10B981',
            pointBorderColor: palette.pointBorder,
            pointBorderWidth: 1.5,
            pointStyle: 'triangle',
            pointRadius: 4.5,
            pointHoverRadius: 6
          }
        ]
      : [
          {
            label: 'Penguasaan Materi (%)',
            data: state.skillRadar.mastery,
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.16)',
            borderWidth: 2.2,
            pointBackgroundColor: '#3B82F6',
            pointBorderColor: palette.pointBorder,
            pointBorderWidth: 1.5,
            pointStyle: 'rectRot',
            pointRadius: 5,
            pointHoverRadius: 6.5
          },
          {
            label: 'Praktikum & Ujian (%)',
            data: state.skillRadar.practice,
            borderColor: '#D97757',
            backgroundColor: 'rgba(217, 119, 87, 0.18)',
            borderWidth: 2.2,
            pointBackgroundColor: '#D97757',
            pointBorderColor: palette.pointBorder,
            pointBorderWidth: 1.5,
            pointStyle: 'rect',
            pointRadius: 4.5,
            pointHoverRadius: 6
          },
          {
            label: 'Target Kemahiran (%)',
            data: state.skillRadar.target,
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.06)',
            borderWidth: 1.8,
            borderDash: [6, 4],
            pointBackgroundColor: '#10B981',
            pointBorderColor: palette.pointBorder,
            pointBorderWidth: 1.5,
            pointStyle: 'triangle',
            pointRadius: 4.5,
            pointHoverRadius: 6
          }
        ];

    return {
      type: 'radar',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          r: {
            min: 0,
            max: 100,
            beginAtZero: true,
            grid: {
              circular: false,
              color: palette.gridColor,
              lineWidth: 1
            },
            angleLines: {
              color: palette.angleLineColor,
              lineWidth: 1
            },
            ticks: {
              stepSize: 20,
              backdropColor: 'transparent',
              color: palette.tickColor,
              font: {
                size: 10,
                family: '"JetBrains Mono", monospace'
              },
              callback: function (val) {
                return val + '%';
              }
            },
            pointLabels: {
              color: palette.pointLabelColor,
              padding: 8,
              font: {
                size: 11,
                weight: '600',
                family: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif'
              }
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              boxWidth: 10,
              boxHeight: 10,
              padding: 14,
              color: palette.legendColor,
              font: {
                size: 11,
                weight: '600',
                family: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif'
              }
            }
          },
          tooltip: {
            backgroundColor: palette.tooltipBg,
            borderColor: palette.tooltipBorder,
            borderWidth: 1,
            titleColor: palette.tooltipTitle,
            bodyColor: palette.tooltipBody,
            padding: 10,
            cornerRadius: 8,
            usePointStyle: true,
            callbacks: {
              label: function (ctx) {
                const dsLabel = ctx.dataset && ctx.dataset.label ? ctx.dataset.label.replace(/\s*\(%\)$/, '') : 'Skor';
                const val = typeof ctx.parsed === 'object' && ctx.parsed !== null ? ctx.parsed.r : ctx.raw;
                return ' ' + dsLabel + ': ' + clampPercent(val, 0) + '%';
              }
            }
          }
        }
      }
    };
  }

  function renderRadarChart(state, mode) {
    const canvas = document.getElementById('studentLearningRadarCanvas');
    if (!canvas) return;

    if (typeof window.Chart !== 'function') {
      const box = canvas.parentElement;
      if (box) {
        box.innerHTML = '<div class="radar-canvas-fallback">Pustaka grafik radar tidak tersedia. Muat ulang halaman untuk mencoba kembali.</div>';
      }
      return;
    }

    if (radarChartInstance) {
      radarChartInstance.destroy();
      radarChartInstance = null;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    radarChartInstance = new window.Chart(ctx, buildChartConfig(state, mode));
  }

  function bindModeTabs(sectionEl) {
    const buttons = sectionEl.querySelectorAll('.radar-tab-btn[data-radar-tab]');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const nextMode = btn.getAttribute('data-radar-tab') === 'stage' ? 'stage' : 'skill';
        if (nextMode === activeMode) return;
        activeMode = nextMode;

        buttons.forEach(function (other) {
          const isSelected = other.getAttribute('data-radar-tab') === activeMode;
          other.classList.toggle('active', isSelected);
          other.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        });

        if (normalizedState) {
          renderRadarChart(normalizedState, activeMode);
        }
      });
    });
  }

  function observeThemeChanges() {
    if (typeof window.MutationObserver !== 'function') return;

    let lastDark = isDarkMode();
    const handleMutation = function () {
      const currentDark = isDarkMode();
      if (currentDark === lastDark) return;
      lastDark = currentDark;
      if (normalizedState) {
        renderRadarChart(normalizedState, activeMode);
      }
    };

    const observer = new window.MutationObserver(handleMutation);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class']
    });

    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
      });
    }
  }

  async function initStudentRadar() {
    const sectionEl = document.getElementById('studentRadarSection');
    if (!sectionEl) return;

    const token = getAuthToken();
    if (!token) return;

    bindModeTabs(sectionEl);
    observeThemeChanges();

    try {
      const response = await fetch('/api/student/learning-radar', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }

      const json = await response.json();
      if (!json || json.success === false) {
        throw new Error((json && json.message) || 'Gagal memuat data peta belajar.');
      }

      normalizedState = normalizePayload(json);
      renderSummaryAndStepper(normalizedState);
      renderMiniMetrics(normalizedState.metrics);
      renderStudiedTopics(normalizedState.studiedTopics);
      renderRadarChart(normalizedState, activeMode);
    } catch (_error) {
      const summaryEl = document.getElementById('radarStageSummary');
      if (summaryEl) {
        summaryEl.textContent = 'Data peta kompetensi belum dapat dimuat saat ini. Coba muat ulang halaman.';
      }
      normalizedState = normalizePayload({});
      renderMiniMetrics(normalizedState.metrics);
      renderStudiedTopics([]);
      renderRadarChart(normalizedState, activeMode);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStudentRadar);
  } else {
    initStudentRadar();
  }
})();
