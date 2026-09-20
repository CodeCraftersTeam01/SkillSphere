/**
 * SkillSphere AI - PWA Service Worker Registration & Modern Morphing Install Sheet
 */
(function () {
  // 1. Register Service Worker for lightweight caching and fast performance
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('✅ [PWA] Service Worker registered successfully, scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('⚠️ [PWA] Service Worker registration failed:', err);
        });
    });
  }

  // 2. Custom Install Banner & Morphing Half-Screen Bottom Sheet
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    const isDismissed = localStorage.getItem('skillsphere_pwa_dismissed');
    if (isDismissed && Date.now() - parseInt(isDismissed, 10) < 24 * 60 * 60 * 1000) {
      return;
    }

    renderInstallBanner();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    hideAllInstallUI();
    console.log('🎉 [PWA] SkillSphere AI installed as native app!');
  });

  function renderInstallBanner() {
    if (document.getElementById('pwa-install-banner')) return;

    // Create Backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'pwa-sheet-backdrop';
    backdrop.className = 'pwa-backdrop';
    document.body.appendChild(backdrop);

    // Create Banner / Sheet Container
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.className = 'pwa-banner-container';
    banner.innerHTML = `
      <div class="pwa-banner-card" id="pwa-initial-card">
        <div class="pwa-banner-left">
          <div class="pwa-banner-app-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L13.8 8.2L22 10L13.8 11.8L12 20L10.2 11.8L2 10L10.2 8.2L12 0Z" />
            </svg>
          </div>
          <div class="pwa-banner-text">
            <div class="pwa-banner-title">Install Aplikasi SkillSphere</div>
            <div class="pwa-banner-desc">Akses cepat, ringan & hemat kuota di perangkat Anda</div>
          </div>
        </div>
        <div class="pwa-banner-actions">
          <button type="button" class="pwa-btn-install" id="pwa-btn-install-action">
            <i class="fas fa-download" style="font-size:11px; margin-right:4px;"></i> Install
          </button>
          <button type="button" class="pwa-btn-close" id="pwa-btn-close-action" aria-label="Tutup banner">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    // Click Install -> Morph into Half-Screen Sheet with Realtime Progress
    document.getElementById('pwa-btn-install-action').addEventListener('click', () => {
      startHalfScreenInstallFlow();
    });

    // Dismiss
    document.getElementById('pwa-btn-close-action').addEventListener('click', () => {
      localStorage.setItem('skillsphere_pwa_dismissed', Date.now().toString());
      hideAllInstallUI();
    });

    backdrop.addEventListener('click', () => {
      hideAllInstallUI();
    });
  }

  function startHalfScreenInstallFlow() {
    const banner = document.getElementById('pwa-install-banner');
    const backdrop = document.getElementById('pwa-sheet-backdrop');
    if (!banner) return;

    if (backdrop) backdrop.classList.add('active');
    banner.classList.add('sheet-mode');

    banner.innerHTML = `
      <div class="pwa-sheet-card">
        <div class="pwa-sheet-handle"></div>
        
        <div>
          <div class="pwa-sheet-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L13.8 8.2L22 10L13.8 11.8L12 20L10.2 11.8L2 10L10.2 8.2L12 0Z" />
            </svg>
          </div>
          <h3 class="pwa-sheet-title" id="sheet-title">Menginstall SkillSphere AI...</h3>
          <p class="pwa-sheet-status" id="sheet-status">Menyiapkan Service Worker & modul offline...</p>
        </div>

        <!-- Realtime Progress Meter -->
        <div class="pwa-progress-section">
          <div class="pwa-progress-header">
            <span class="pwa-progress-label" id="sheet-progress-label">Mengunduh aset...</span>
            <span class="pwa-progress-percent" id="sheet-progress-percent">0%</span>
          </div>
          <div class="pwa-progress-track">
            <div class="pwa-progress-fill" id="sheet-progress-fill" style="width: 0%;"></div>
          </div>
        </div>

        <!-- Steps Checklist -->
        <div class="pwa-steps-list">
          <div class="pwa-step-item active" id="step-1">
            <div class="pwa-step-icon"><i class="fas fa-check"></i></div>
            <span>Inisialisasi Service Worker & Cache</span>
          </div>
          <div class="pwa-step-item" id="step-2">
            <div class="pwa-step-icon"><i class="fas fa-check"></i></div>
            <span>Unduh Antarmuka & Font Ringan</span>
          </div>
          <div class="pwa-step-item" id="step-3">
            <div class="pwa-step-icon"><i class="fas fa-check"></i></div>
            <span>Optimasi Performa Lokal Offline</span>
          </div>
          <div class="pwa-step-item" id="step-4">
            <div class="pwa-step-icon"><i class="fas fa-check"></i></div>
            <span>Pemasangan Beranda Aplikasi Sistem</span>
          </div>
        </div>

        <button type="button" class="pwa-sheet-footer-btn" id="pwa-btn-finish">
          <i class="fas fa-circle-check"></i> Buka Aplikasi
        </button>
      </div>
    `;

    // Realtime Progress Simulation (Smooth and dynamic)
    const fill = document.getElementById('sheet-progress-fill');
    const percent = document.getElementById('sheet-progress-percent');
    const label = document.getElementById('sheet-progress-label');
    const status = document.getElementById('sheet-status');
    const title = document.getElementById('sheet-title');
    const btnFinish = document.getElementById('pwa-btn-finish');

    let current = 0;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 8) + 4;

      if (current >= 25 && current < 50) {
        document.getElementById('step-1').className = 'pwa-step-item completed';
        document.getElementById('step-2').className = 'pwa-step-item active';
        label.textContent = 'Menyimpan komponen UI...';
        status.textContent = 'Mengunduh font & tema editorial...';
      } else if (current >= 50 && current < 78) {
        document.getElementById('step-2').className = 'pwa-step-item completed';
        document.getElementById('step-3').className = 'pwa-step-item active';
        label.textContent = 'Mengaktifkan cache lokal...';
        status.textContent = 'Mengoptimalkan kecepatan akses offline...';
      } else if (current >= 78 && current < 100) {
        document.getElementById('step-3').className = 'pwa-step-item completed';
        document.getElementById('step-4').className = 'pwa-step-item active';
        label.textContent = 'Mendaftarkan ke sistem perangkat...';
        status.textContent = 'Menyelesaikan instalasi ke Home Screen...';
      } else if (current >= 100) {
        current = 100;
        clearInterval(interval);

        document.getElementById('step-4').className = 'pwa-step-item completed';
        fill.style.width = '100%';
        percent.textContent = '100%';
        label.textContent = 'Instalasi Selesai!';
        status.textContent = 'Aplikasi SkillSphere AI siap digunakan di perangkat Anda!';
        title.innerHTML = '<i class="fas fa-circle-check" style="color:var(--color-success); margin-right:6px;"></i> Terpasang!';
        
        btnFinish.style.display = 'flex';

        // Trigger native prompt if supported
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then((choice) => {
            console.log(`[PWA] Choice: ${choice.outcome}`);
            deferredPrompt = null;
          });
        }

        btnFinish.addEventListener('click', () => {
          hideAllInstallUI();
          if (window.location.pathname !== '/dashboard') {
            window.location.href = '/dashboard';
          }
        });

        // Auto dismiss after 2.4s if not tapped
        setTimeout(() => {
          hideAllInstallUI();
        }, 2800);
      }

      if (current < 100) {
        fill.style.width = current + '%';
        percent.textContent = current + '%';
      }
    }, 75);
  }

  function hideAllInstallUI() {
    const banner = document.getElementById('pwa-install-banner');
    const backdrop = document.getElementById('pwa-sheet-backdrop');
    if (banner) {
      banner.style.opacity = '0';
      banner.style.transform = 'translateY(40px)';
      setTimeout(() => banner.remove(), 350);
    }
    if (backdrop) {
      backdrop.classList.remove('active');
      setTimeout(() => backdrop.remove(), 350);
    }
  }
})();
