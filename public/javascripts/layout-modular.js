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

    // Single icon that swaps its Font Awesome class (landing / exam style)
    const swapIcon = document.getElementById('themeIcon');
    if (swapIcon && swapIcon.tagName && swapIcon.tagName.toLowerCase() === 'i') {
      swapIcon.className = isLight ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    }

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

    const isMobile = window.innerWidth <= 1024;
    if (isMobile) {
      const isCurrentlyOpen = sidebar.classList.contains('open') || sidebar.classList.contains('drawer-open');
      const shouldShow = typeof show === 'boolean' ? show : !isCurrentlyOpen;
      if (shouldShow) {
        sidebar.classList.add('open', 'drawer-open');
        if (backdrop) backdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
      } else {
        sidebar.classList.remove('open', 'drawer-open');
        if (backdrop) backdrop.classList.remove('active');
        document.body.style.overflow = '';
      }
    } else {
      if (show === false) {
        sidebar.classList.add('collapsed');
      } else if (show === true) {
        sidebar.classList.remove('collapsed');
      } else {
        sidebar.classList.toggle('collapsed');
      }
    }
  };

  // -------------------------------------------------------------------------
  // 2b. Dynamic Tutor Courses Sync
  // -------------------------------------------------------------------------
  async function syncTutorSidebarCourses() {
    const list = document.getElementById('sidebar-courses-list');
    if (!list) return;

    const token = localStorage.getItem('skillsphere_access_token') ||
                  localStorage.getItem('accessToken') ||
                  localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch('/api/courses/tutor/my-courses', {
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer ' + token
        }
      });
      if (!res.ok) return;
      const json = await res.json();
      if (!json.success || !Array.isArray(json.data)) return;

      const courses = json.data;
      if (courses.length === 0) {
        list.innerHTML = '<div style="padding:10px 24px; font-size:12px; color:var(--text-tertiary);">Belum ada kelas diajar.</div>';
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const activeCourseId = parseInt(urlParams.get('courseId') || urlParams.get('course_id') || urlParams.get('id'), 10);

      list.innerHTML = courses.map(c => {
        const isActive = activeCourseId && activeCourseId === c.id;
        const initial = (c.title || 'K')[0].toUpperCase();
        const safeTitle = (c.title || 'Kelas').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
        const catName = c.category && c.category.name ? c.category.name.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]) : 'Umum';
        const sectionCount = Array.isArray(c.sections) ? c.sections.length : 0;
        return `
          <a href="/tutor/materials?courseId=${c.id}" class="sidebar-class-row${isActive ? ' active' : ''}" title="${safeTitle}">
            <div class="sidebar-class-circle">${initial}</div>
            <div class="sidebar-class-text">
              <span class="sidebar-class-title">${safeTitle}</span>
              <span class="sidebar-class-subtitle">${catName} • ${sectionCount} Bab</span>
            </div>
          </a>
        `;
      }).join('');
    } catch (e) {
      // Graceful fallback without breaking layout
    }
  }

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
      const rawUser = localStorage.getItem('skillsphere_user') || localStorage.getItem('user') || localStorage.getItem('currentUser');
      if (rawUser) {
        try {
          const cachedUser = JSON.parse(rawUser);
          renderUserData(cachedUser);
        } catch (e) {
          // ignore parsing error
        }
      }

      // Fetch fresh profile from API
      const token = localStorage.getItem('skillsphere_access_token') || localStorage.getItem('token') || localStorage.getItem('accessToken');
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
          localStorage.setItem('skillsphere_user', JSON.stringify(userData));
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
      const token = localStorage.getItem('skillsphere_access_token') || localStorage.getItem('token') || localStorage.getItem('accessToken');
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
      localStorage.removeItem('skillsphere_access_token');
      localStorage.removeItem('skillsphere_refresh_token');
      localStorage.removeItem('skillsphere_user');
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

    // Sync Tutor Sidebar Courses if Sidebar Present
    syncTutorSidebarCourses();

    // Bind Theme Toggle Buttons.
    // Many views attach their own inline bubble handler to the same button.
    // A single delegated capture handler stops propagation so exactly one
    // toggle happens per click (otherwise two handlers cancel each other out).
    document.addEventListener('click', function (e) {
      const btn = e.target && e.target.closest && e.target.closest('#theme-toggle-btn, #themeToggleBtn, .theme-toggle-btn');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      toggleThemeMode();
    }, true);

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
