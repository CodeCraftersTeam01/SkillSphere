/**
 * SkillSphere AI - Modular Layout Script
 * Handles Theme Toggling, User Profile Synchronization, Mobile Sidebar Drawers, and Universal Logout.
 * Works seamlessly across Admin, Tutor, and Student portals.
 */

(function () {
  'use strict';

  // -------------------------------------------------------------------------
  // 1. Theme Engine Synchronization
  // -------------------------------------------------------------------------
  function getPreferredTheme() {
    const saved = localStorage.getItem('skillsphere_theme') || localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('skillsphere_theme', theme);
    localStorage.setItem('theme', theme);

    const isLight = theme === 'light';

    // Update icons
    const sunIcons = document.querySelectorAll('#theme-icon-sun, .theme-icon-sun');
    const moonIcons = document.querySelectorAll('#theme-icon-moon, .theme-icon-moon');
    sunIcons.forEach(icon => {
      icon.style.display = isLight ? 'none' : 'inline-block';
    });
    moonIcons.forEach(icon => {
      icon.style.display = isLight ? 'inline-block' : 'none';
    });

    // Update text labels
    const textLabels = document.querySelectorAll('#theme-text, .theme-text-label');
    textLabels.forEach(el => {
      el.textContent = isLight ? 'Mode Gelap' : 'Mode Terang';
    });
  }

  function toggleThemeMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
  }

  window.toggleThemeMode = toggleThemeMode;

  // -------------------------------------------------------------------------
  // 2. Mobile Sidebar & Drawer Helpers
  // -------------------------------------------------------------------------
  window.toggleMobileSidebar = function (show) {
    const sidebar = document.getElementById('admin-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar) return;

    const shouldShow = typeof show === 'boolean' ? show : !sidebar.classList.contains('active');
    if (shouldShow) {
      sidebar.classList.add('active');
      if (backdrop) backdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
    } else {
      sidebar.classList.remove('active');
      if (backdrop) backdrop.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

  window.toggleClassroomSidebar = function (show) {
    const sidebar = document.getElementById('classroom-left-sidebar');
    const backdrop = document.getElementById('classroom-sidebar-backdrop');
    if (!sidebar) return;

    const shouldShow = typeof show === 'boolean' ? show : !sidebar.classList.contains('open');
    if (shouldShow) {
      sidebar.classList.add('open');
      if (backdrop) backdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
    } else {
      sidebar.classList.remove('open');
      if (backdrop) backdrop.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

  // -------------------------------------------------------------------------
  // 3. User Profile Synchronization
  // -------------------------------------------------------------------------
  function renderUserData(user) {
    if (!user) return;

    const name = user.name || user.fullName || user.username || 'Pengguna';
    const initials = name
      .split(' ')
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';

    const role = (user.role || 'student').toLowerCase();
    const roleLabels = {
      admin: 'ADMIN',
      tutor: 'TUTOR',
      student: 'SISWA'
    };
    const roleText = roleLabels[role] || role.toUpperCase();

    // Update name labels
    document.querySelectorAll('#header-user-name, #sidebar-user-name, #nav-user-name').forEach(el => {
      el.textContent = name;
    });

    // Update avatar circles
    document.querySelectorAll('#header-avatar, #sidebar-avatar, #nav-avatar').forEach(el => {
      el.textContent = initials;
    });

    // Update role tags
    document.querySelectorAll('#header-user-role, #sidebar-user-role, #nav-user-role').forEach(el => {
      el.textContent = roleText;
    });

    // Update streak if available
    if (user.streakCount !== undefined || user.streak !== undefined) {
      const streakVal = user.streakCount !== undefined ? user.streakCount : user.streak;
      document.querySelectorAll('#nav-streak-count').forEach(el => {
        el.textContent = streakVal || 1;
      });
    }
  }

  async function syncUserProfile() {
    try {
      const rawUser = localStorage.getItem('user') || localStorage.getItem('currentUser');
      if (rawUser) {
        try {
          const cachedUser = JSON.parse(rawUser);
          renderUserData(cachedUser);
        } catch (e) {
          // ignore parsing error
        }
      }

      // Fetch fresh profile from API
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const headers = { 'Accept': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const res = await fetch('/api/auth/me', {
        headers,
        credentials: 'include'
      });

      if (res.ok) {
        const json = await res.json();
        const userData = json.data && json.data.user ? json.data.user : (json.data || json.user);
        if (userData) {
          renderUserData(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        }
      }
    } catch (err) {
      console.warn('[LayoutModular] Profile sync warning:', err.message);
    }
  }

  // -------------------------------------------------------------------------
  // 4. Universal Logout Handler
  // -------------------------------------------------------------------------
  async function performLogout() {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;

      await fetch('/api/auth/logout', {
        method: 'POST',
        headers,
        credentials: 'include'
      });
    } catch (e) {
      // Continue client-side logout even if network fails
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('currentUser');
      sessionStorage.clear();
      window.location.href = '/login';
    }
  }

  window.handleModularLogout = function () {
    if (typeof CustomAlert !== 'undefined' && CustomAlert.confirm) {
      CustomAlert.confirm('Apakah Anda yakin ingin keluar dari sistem?', 'Konfirmasi Keluar', () => {
        performLogout();
      });
    } else if (confirm('Apakah Anda yakin ingin keluar dari sistem?')) {
      performLogout();
    }
  };

  // -------------------------------------------------------------------------
  // 5. DOM Initialization
  // -------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function () {
    // Initialize Theme
    applyTheme(getPreferredTheme());

    // Bind Theme Toggle Buttons
    document.querySelectorAll('#theme-toggle-btn, #themeToggleBtn, .theme-toggle-btn').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        toggleThemeMode();
      });
    });

    // Bind Universal Logout Buttons
    document.querySelectorAll('#logout-btn, #header-logout-btn, #sidebar-logout-btn, .modular-logout-btn').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        window.handleModularLogout();
      });
    });

    // Sync User Data
    syncUserProfile();
  });
})();
