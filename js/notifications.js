/**
 * ADIVERSE - NOTIFICATIONS & REMINDERS MODULE
 * In-app notifications panel, upcoming deadlines, scheduled study sessions,
 * overdue warnings, customizable reminder settings, and optional browser notifications.
 */

'use strict';

window.AdiverseNotifications = (function () {
  const STORAGE_DISMISSED_KEY = 'adiverse_notifications_dismissed';
  const STORAGE_SETTINGS_KEY = 'adiverse_notification_settings';

  let dismissedIds = new Set();
  let settings = {
    deadlineLeadHours: 24,
    sessionLeadMinutes: 30,
    browserEnabled: false
  };

  // DOM Elements
  let bellBtn = null;
  let badgeEl = null;
  let panelEl = null;
  let listEl = null;
  let emptyEl = null;
  let summaryEl = null;
  let markAllReadBtn = null;
  let closePanelBtn = null;

  // Settings Modal Elements
  let settingsBtn = null;
  let settingsModalOverlay = null;
  let leadTimeSelect = null;
  let sessionLeadSelect = null;
  let browserStatusLabel = null;
  let requestBrowserBtn = null;
  let settingsSaveBtn = null;
  let settingsCancelBtn = null;

  function loadStorage() {
    try {
      const rawDismissed = localStorage.getItem(STORAGE_DISMISSED_KEY);
      if (rawDismissed) {
        const arr = JSON.parse(rawDismissed);
        if (Array.isArray(arr)) dismissedIds = new Set(arr);
      }
    } catch (e) {}

    try {
      const rawSettings = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (rawSettings) {
        settings = Object.assign(settings, JSON.parse(rawSettings));
      }
    } catch (e) {}
  }

  function saveDismissed() {
    try {
      localStorage.setItem(STORAGE_DISMISSED_KEY, JSON.stringify(Array.from(dismissedIds)));
    } catch (e) {}
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {}
  }

  function formatDateISO(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function init() {
    bellBtn = document.getElementById('topbar-notifications-btn');
    badgeEl = document.getElementById('notifications-badge');
    panelEl = document.getElementById('notifications-panel');
    listEl = document.getElementById('notifications-list');
    emptyEl = document.getElementById('notifications-empty');
    summaryEl = document.getElementById('notif-status-summary');
    markAllReadBtn = document.getElementById('btn-mark-all-read');
    closePanelBtn = document.getElementById('btn-close-notif-panel');

    settingsBtn = document.getElementById('btn-notif-settings');
    settingsModalOverlay = document.getElementById('notifications-settings-modal-overlay');
    leadTimeSelect = document.getElementById('notif-lead-time-select');
    sessionLeadSelect = document.getElementById('notif-session-lead-select');
    browserStatusLabel = document.getElementById('browser-notif-status');
    requestBrowserBtn = document.getElementById('btn-request-browser-notif');
    settingsSaveBtn = document.getElementById('notif-settings-save-btn');
    settingsCancelBtn = document.getElementById('notif-settings-cancel-btn');

    loadStorage();

    // Toggle Notifications Panel
    if (bellBtn) {
      bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePanel();
      });
    }

    if (closePanelBtn) {
      closePanelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closePanel();
      });
    }

    if (markAllReadBtn) {
      markAllReadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        markAllAsRead();
      });
    }

    // Close panel on outside click
    document.addEventListener('click', (e) => {
      if (panelEl && panelEl.style.display !== 'none') {
        if (!panelEl.contains(e.target) && !bellBtn.contains(e.target)) {
          closePanel();
        }
      }
    });

    // Settings Modal
    if (settingsBtn) {
      settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openSettingsModal();
      });
    }

    if (settingsSaveBtn) {
      settingsSaveBtn.addEventListener('click', handleSaveSettings);
    }

    if (settingsCancelBtn) {
      settingsCancelBtn.addEventListener('click', closeSettingsModal);
    }

    if (settingsModalOverlay) {
      settingsModalOverlay.addEventListener('click', (e) => {
        if (e.target === settingsModalOverlay) closeSettingsModal();
      });
    }

    if (requestBrowserBtn) {
      requestBrowserBtn.addEventListener('click', requestBrowserPermission);
    }

    updateBrowserPermissionStatus();
    render();
  }

  function togglePanel() {
    if (!panelEl) return;
    const isVisible = panelEl.style.display === 'flex' || panelEl.style.display === 'block';
    if (isVisible) {
      closePanel();
    } else {
      openPanel();
    }
  }

  function openPanel() {
    if (!panelEl) return;
    panelEl.style.display = 'flex';
    render();
  }

  function closePanel() {
    if (!panelEl) return;
    panelEl.style.display = 'none';
  }

  function getAssignments() {
    if (window.AdiverseAssignments && typeof window.AdiverseAssignments.getAssignments === 'function') {
      return window.AdiverseAssignments.getAssignments();
    }
    try {
      const raw = localStorage.getItem('adiverse_assignments_data');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  function getSessions() {
    if (window.AdiversePlanner && typeof window.AdiversePlanner.getSessions === 'function') {
      return window.AdiversePlanner.getSessions();
    }
    try {
      const raw = localStorage.getItem('adiverse_study_sessions');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  function generateNotifications() {
    const notifs = [];
    const now = new Date();
    const todayStr = formatDateISO(now);
    const msInHour = 3600000;
    const msInDay = 86400000;

    const leadHours = Number(settings.deadlineLeadHours) || 24;
    const thresholdFutureDate = new Date(now.getTime() + leadHours * msInHour);
    const thresholdDateStr = formatDateISO(thresholdFutureDate);

    // 1. Scan Assignments
    const assignments = getAssignments();
    assignments.forEach(a => {
      if (!a.dueDate || a.status === 'Completed') return;

      if (a.dueDate < todayStr) {
        // Overdue assignment
        const id = `notif_overdue_${a.id}`;
        notifs.push({
          id,
          type: 'overdue',
          title: `Overdue: ${a.title}`,
          message: `Due on ${a.dueDate}. Tap to update status or review assignment.`,
          badge: 'Overdue Warning',
          timestamp: now.getTime(),
          actionType: 'assignment',
          targetId: a.id
        });
      } else if (a.dueDate <= thresholdDateStr) {
        // Due today or upcoming within lead time
        const isToday = a.dueDate === todayStr;
        const id = `notif_due_${a.id}_${a.dueDate}`;
        notifs.push({
          id,
          type: 'upcoming_deadline',
          title: `${isToday ? 'Due Today' : 'Upcoming Deadline'}: ${a.title}`,
          message: `${a.subject || 'Milestone'} • Priority: ${a.priority || 'Medium'}.`,
          badge: isToday ? 'Due Today' : 'Upcoming',
          timestamp: now.getTime(),
          actionType: 'assignment',
          targetId: a.id
        });
      }
    });

    // 2. Scan Study Sessions
    const sessions = getSessions();
    const tomorrowStr = formatDateISO(new Date(now.getTime() + msInDay));

    sessions.forEach(s => {
      if (!s.date || s.completed) return;

      if (s.date === todayStr) {
        const id = `notif_session_${s.id}_${s.date}_${s.startTime || '10:00'}`;
        notifs.push({
          id,
          type: 'session',
          title: `Study Session Today: ${s.title}`,
          message: `Scheduled at ${s.startTime || '10:00'} (${s.duration || 60}m) for ${s.topic || 'General Studies'}.`,
          badge: 'Focus Block',
          timestamp: now.getTime(),
          actionType: 'session',
          targetId: s.id
        });
      } else if (s.date === tomorrowStr) {
        const id = `notif_session_tomorrow_${s.id}_${s.date}`;
        notifs.push({
          id,
          type: 'session_tomorrow',
          title: `Tomorrow: ${s.title}`,
          message: `Scheduled at ${s.startTime || '10:00'} for ${s.topic || 'General Studies'}.`,
          badge: 'Tomorrow',
          timestamp: now.getTime(),
          actionType: 'session',
          targetId: s.id
        });
      }
    });

    return notifs;
  }

  function render() {
    const allNotifs = generateNotifications();
    // Filter out dismissed
    const activeNotifs = allNotifs.filter(n => !dismissedIds.has(n.id));

    // Update Topbar Badge
    if (badgeEl) {
      if (activeNotifs.length > 0) {
        badgeEl.textContent = activeNotifs.length;
        badgeEl.style.display = 'flex';
      } else {
        badgeEl.style.display = 'none';
      }
    }

    if (summaryEl) {
      summaryEl.textContent = `${activeNotifs.length} active notifications`;
    }

    if (!listEl || !emptyEl) return;

    if (activeNotifs.length === 0) {
      listEl.innerHTML = '';
      emptyEl.style.display = 'block';
      return;
    }

    emptyEl.style.display = 'none';
    listEl.innerHTML = '';

    activeNotifs.forEach(notif => {
      const item = document.createElement('div');
      item.className = 'notif-item';

      let iconSvg = '';
      let badgeStyle = '';

      if (notif.type === 'overdue') {
        iconSvg = `
          <div class="notif-icon-wrap" style="background: rgba(201, 42, 42, 0.15); color: #c92a2a;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
        `;
        badgeStyle = 'background: rgba(201, 42, 42, 0.12); color: #c92a2a; border: 1px solid rgba(201, 42, 42, 0.3);';
      } else if (notif.type === 'upcoming_deadline') {
        iconSvg = `
          <div class="notif-icon-wrap" style="background: rgba(217, 72, 15, 0.15); color: #d9480f;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
        `;
        badgeStyle = 'background: rgba(217, 72, 15, 0.12); color: #d9480f; border: 1px solid rgba(217, 72, 15, 0.3);';
      } else {
        iconSvg = `
          <div class="notif-icon-wrap" style="background: rgba(166, 107, 239, 0.15); color: var(--color-purple);">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
        `;
        badgeStyle = 'background: rgba(166, 107, 239, 0.12); color: var(--color-purple); border: 1px solid rgba(166, 107, 239, 0.3);';
      }

      item.innerHTML = `
        ${iconSvg}
        <div class="notif-content" style="flex: 1;">
          <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 0.4rem; margin-bottom: 2px;">
            <h4 class="notif-title" style="margin: 0; font-size: 0.84rem; font-weight: bold; color: var(--color-dark);">${escapeHtml(notif.title)}</h4>
            <span style="font-size: 0.65rem; font-weight: bold; padding: 1px 6px; border-radius: 6px; ${badgeStyle}">${escapeHtml(notif.badge)}</span>
          </div>
          <p class="notif-desc" style="margin: 0; font-size: 0.76rem; color: var(--color-text-subtle); line-height: 1.35;">${escapeHtml(notif.message)}</p>
        </div>
        <button class="notif-dismiss-btn" type="button" title="Dismiss Notification" aria-label="Dismiss">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;

      // Click row to navigate
      item.addEventListener('click', () => {
        handleNotificationClick(notif);
      });

      // Dismiss button
      const dismissBtn = item.querySelector('.notif-dismiss-btn');
      if (dismissBtn) {
        dismissBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          dismissNotification(notif.id);
        });
      }

      listEl.appendChild(item);
    });
  }

  function handleNotificationClick(notif) {
    closePanel();
    if (notif.actionType === 'assignment') {
      if (window.AdiverseAssignments && typeof window.AdiverseAssignments.openDetailModal === 'function') {
        window.AdiverseAssignments.openDetailModal(notif.targetId);
      } else if (window.AdiverseAssignments && typeof window.AdiverseAssignments.show === 'function') {
        window.AdiverseAssignments.show();
      }
    } else if (notif.actionType === 'session') {
      if (window.AdiversePlanner && typeof window.AdiversePlanner.openEditModal === 'function') {
        window.AdiversePlanner.show();
        window.AdiversePlanner.openEditModal(notif.targetId);
      } else if (window.AdiversePlanner && typeof window.AdiversePlanner.show === 'function') {
        window.AdiversePlanner.show();
      }
    }
  }

  function dismissNotification(id) {
    dismissedIds.add(id);
    saveDismissed();
    render();
  }

  function markAllAsRead() {
    const allNotifs = generateNotifications();
    allNotifs.forEach(n => dismissedIds.add(n.id));
    saveDismissed();
    render();
  }

  // --- Reminder Settings Modal ---
  function openSettingsModal() {
    if (leadTimeSelect) leadTimeSelect.value = String(settings.deadlineLeadHours || 24);
    if (sessionLeadSelect) sessionLeadSelect.value = String(settings.sessionLeadMinutes || 30);
    updateBrowserPermissionStatus();
    if (settingsModalOverlay) settingsModalOverlay.classList.add('is-open');
  }

  function closeSettingsModal() {
    if (settingsModalOverlay) settingsModalOverlay.classList.remove('is-open');
  }

  function handleSaveSettings() {
    if (leadTimeSelect) settings.deadlineLeadHours = Number(leadTimeSelect.value);
    if (sessionLeadSelect) settings.sessionLeadMinutes = Number(sessionLeadSelect.value);
    saveSettings();
    closeSettingsModal();
    render();
  }

  function updateBrowserPermissionStatus() {
    if (!browserStatusLabel) return;
    if (!('Notification' in window)) {
      browserStatusLabel.textContent = 'Not supported in this browser';
      if (requestBrowserBtn) requestBrowserBtn.style.display = 'none';
      return;
    }

    if (Notification.permission === 'granted') {
      browserStatusLabel.textContent = 'Allowed (System alerts active)';
      browserStatusLabel.style.color = '#2b8a3e';
      if (requestBrowserBtn) {
        requestBrowserBtn.textContent = 'Enabled';
        requestBrowserBtn.disabled = true;
      }
    } else if (Notification.permission === 'denied') {
      browserStatusLabel.textContent = 'Blocked by browser settings';
      browserStatusLabel.style.color = '#c92a2a';
      if (requestBrowserBtn) {
        requestBrowserBtn.textContent = 'Blocked';
        requestBrowserBtn.disabled = true;
      }
    } else {
      browserStatusLabel.textContent = 'Disabled (Permission required)';
      browserStatusLabel.style.color = 'var(--color-text-subtle)';
      if (requestBrowserBtn) {
        requestBrowserBtn.textContent = 'Enable Alerts';
        requestBrowserBtn.disabled = false;
      }
    }
  }

  function requestBrowserPermission() {
    if (!('Notification' in window)) return;

    Notification.requestPermission().then(permission => {
      updateBrowserPermissionStatus();
      if (permission === 'granted') {
        settings.browserEnabled = true;
        saveSettings();
        try {
          new Notification('Adiverse Notifications Active', {
            body: 'You will receive timely reminders for academic deadlines and study sessions.',
            icon: 'favicon.ico'
          });
        } catch (e) {}
      }
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    init,
    render,
    openPanel,
    closePanel,
    dismissNotification,
    markAllAsRead,
    openSettingsModal,
    closeSettingsModal
  };
})();
