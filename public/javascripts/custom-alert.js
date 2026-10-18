/**
 * SkillSphere AI • Universal Custom Alert, Confirm & Toast Component
 * Intercepts default window.alert and provides Claude Warm Paper dialogs.
 */

(function () {
  'use strict';

  // Ensure CSS is injected if not already loaded via link tag
  function ensureStyles() {
    if (!document.getElementById('ss-custom-alert-styles')) {
      const link = document.createElement('link');
      link.id = 'ss-custom-alert-styles';
      link.rel = 'stylesheet';
      link.href = '/stylesheets/custom-alert.css?v=2.0';
      document.head.appendChild(link);
    }
  }

  // Create or get DOM elements
  function getModalElements() {
    let backdrop = document.getElementById('ss-custom-alert-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'ss-custom-alert-backdrop';
      backdrop.className = 'ss-custom-alert-backdrop';
      backdrop.setAttribute('role', 'dialog');
      backdrop.setAttribute('aria-modal', 'true');
      backdrop.innerHTML = `
        <div class="ss-custom-alert-card" id="ss-custom-alert-card">
          <div class="ss-alert-icon-wrapper" id="ss-alert-icon-wrapper">
            <i class="fas fa-circle-info" id="ss-alert-icon"></i>
          </div>
          <h3 class="ss-alert-title" id="ss-alert-title">Pemberitahuan</h3>
          <p class="ss-alert-message" id="ss-alert-message"></p>
          <div class="ss-alert-actions" id="ss-alert-actions">
            <button class="ss-alert-btn ss-alert-btn-secondary" id="ss-alert-btn-cancel" style="display:none;">Batal</button>
            <button class="ss-alert-btn ss-alert-btn-primary" id="ss-alert-btn-confirm">Saya Mengerti</button>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);
    }

    let toastContainer = document.getElementById('ss-toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'ss-toast-container';
      toastContainer.className = 'ss-toast-container';
      document.body.appendChild(toastContainer);
    }

    return {
      backdrop,
      card: document.getElementById('ss-custom-alert-card'),
      iconWrapper: document.getElementById('ss-alert-icon-wrapper'),
      icon: document.getElementById('ss-alert-icon'),
      title: document.getElementById('ss-alert-title'),
      message: document.getElementById('ss-alert-message'),
      btnCancel: document.getElementById('ss-alert-btn-cancel'),
      btnConfirm: document.getElementById('ss-alert-btn-confirm'),
      toastContainer,
    };
  }

  /**
   * Show Custom Alert Dialog
   * @param {Object|string} options
   * @returns {Promise<void>}
   */
  function showCustomAlert(options) {
    ensureStyles();
    return new Promise((resolve) => {
      let title = 'Pemberitahuan';
      let message = '';
      let type = 'info'; // 'info', 'success', 'error', 'warning'
      let buttonText = 'Saya Mengerti';

      if (typeof options === 'string') {
        message = options;
        if (message.toLowerCase().includes('berhasil') || message.toLowerCase().includes('sukses')) {
          type = 'success';
          title = 'Berhasil';
        } else if (message.toLowerCase().includes('gagal') || message.toLowerCase().includes('salah') || message.toLowerCase().includes('tidak ditemukan')) {
          type = 'error';
          title = 'Perhatian';
        } else if (message.toLowerCase().includes('peringatan') || message.toLowerCase().includes('perhatian')) {
          type = 'warning';
          title = 'Peringatan';
        }
      } else if (options && typeof options === 'object') {
        title = options.title || title;
        message = options.message || '';
        type = options.type || type;
        buttonText = options.buttonText || options.confirmText || buttonText;
      }

      const els = getModalElements();
      els.title.textContent = title;
      els.message.textContent = message;
      els.btnConfirm.textContent = buttonText;
      els.btnCancel.style.display = 'none';

      // Set icon & color class
      els.iconWrapper.className = `ss-alert-icon-wrapper ss-${type}`;
      if (type === 'success') {
        els.icon.className = 'fas fa-circle-check';
      } else if (type === 'error') {
        els.icon.className = 'fas fa-circle-exclamation';
      } else if (type === 'warning') {
        els.icon.className = 'fas fa-triangle-exclamation';
      } else {
        els.icon.className = 'fas fa-circle-info';
      }

      function cleanup() {
        els.backdrop.classList.remove('ss-active');
        document.removeEventListener('keydown', handleKey);
        els.btnConfirm.removeEventListener('click', handleConfirm);
        resolve();
      }

      function handleConfirm() {
        cleanup();
      }

      function handleKey(e) {
        if (e.key === 'Escape' || e.key === 'Enter') {
          e.preventDefault();
          cleanup();
        }
      }

      els.btnConfirm.addEventListener('click', handleConfirm, { once: true });
      document.addEventListener('keydown', handleKey);

      els.backdrop.classList.add('ss-active');
      setTimeout(() => els.btnConfirm.focus(), 50);
    });
  }

  /**
   * Show Custom Confirm Dialog
   * @param {Object|string} options
   * @returns {Promise<boolean>}
   */
  function showCustomConfirm(options) {
    ensureStyles();
    return new Promise((resolve) => {
      let title = 'Konfirmasi Tindakan';
      let message = 'Apakah Anda yakin ingin melanjutkan tindakan ini?';
      let type = 'warning';
      let confirmText = 'Ya, Lanjutkan';
      let cancelText = 'Batal';

      if (typeof options === 'string') {
        message = options;
      } else if (options && typeof options === 'object') {
        title = options.title || title;
        message = options.message || message;
        type = options.type || type;
        confirmText = options.confirmText || confirmText;
        cancelText = options.cancelText || cancelText;
      }

      const els = getModalElements();
      els.title.textContent = title;
      els.message.textContent = message;
      els.btnConfirm.textContent = confirmText;
      els.btnCancel.textContent = cancelText;
      els.btnCancel.style.display = 'inline-flex';

      els.iconWrapper.className = `ss-alert-icon-wrapper ss-${type}`;
      if (type === 'warning') {
        els.icon.className = 'fas fa-triangle-exclamation';
      } else if (type === 'error' || type === 'danger') {
        els.icon.className = 'fas fa-circle-exclamation';
      } else {
        els.icon.className = 'fas fa-circle-question';
      }

      function cleanup(result) {
        els.backdrop.classList.remove('ss-active');
        document.removeEventListener('keydown', handleKey);
        els.btnConfirm.removeEventListener('click', handleConfirm);
        els.btnCancel.removeEventListener('click', handleCancel);
        resolve(result);
      }

      function handleConfirm() {
        cleanup(true);
      }

      function handleCancel() {
        cleanup(false);
      }

      function handleKey(e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          cleanup(false);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          cleanup(true);
        }
      }

      els.btnConfirm.addEventListener('click', handleConfirm, { once: true });
      els.btnCancel.addEventListener('click', handleCancel, { once: true });
      document.addEventListener('keydown', handleKey);

      els.backdrop.classList.add('ss-active');
      setTimeout(() => els.btnConfirm.focus(), 50);
    });
  }

  /**
   * Show Custom Toast Notification
   * @param {string} message
   * @param {'success'|'error'|'info'|'warning'} type
   * @param {number} durationMs
   */
  function showToast(message, type = 'success', durationMs = 3500) {
    ensureStyles();
    const { toastContainer } = getModalElements();

    const toast = document.createElement('div');
    toast.className = `ss-toast-item ss-toast-${type}`;

    let iconHtml = '<i class="fas fa-circle-check ss-toast-icon" style="color:var(--color-success, #10B981);"></i>';
    if (type === 'error' || type === 'danger') {
      iconHtml = '<i class="fas fa-circle-exclamation ss-toast-icon" style="color:var(--color-danger, #EF4444);"></i>';
    } else if (type === 'warning') {
      iconHtml = '<i class="fas fa-triangle-exclamation ss-toast-icon" style="color:var(--color-warning, #F59E0B);"></i>';
    } else if (type === 'info') {
      iconHtml = '<i class="fas fa-circle-info ss-toast-icon" style="color:var(--accent-primary, #1F1E1B);"></i>';
    }

    toast.innerHTML = `
      ${iconHtml}
      <div class="ss-toast-text">${String(message)}</div>
      <button class="ss-toast-close" type="button" aria-label="Tutup"><i class="fas fa-xmark"></i></button>
    `;

    toastContainer.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.classList.add('ss-toast-visible');
    });

    const closeBtn = toast.querySelector('.ss-toast-close');
    let timer = null;

    function removeToast() {
      if (timer) clearTimeout(timer);
      toast.classList.remove('ss-toast-visible');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }

    if (closeBtn) closeBtn.addEventListener('click', removeToast);
    timer = setTimeout(removeToast, durationMs);
  }

  // Intercept standard window.alert
  window.alert = function (msg) {
    showCustomAlert(msg);
  };

  // Expose global methods
  window.showCustomAlert = showCustomAlert;
  window.showCustomConfirm = showCustomConfirm;
  window.showToast = showToast;

  // Auto initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureStyles);
  } else {
    ensureStyles();
  }
})();

// Keyboard ESC handler and auto-dismiss lifecycle enabled
