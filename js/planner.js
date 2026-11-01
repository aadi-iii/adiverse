/**
 * ADIVERSE - STUDY PLANNER & ACADEMIC CALENDAR MODULE
 * Month, Week, and Day calendar views, study sessions CRUD,
 * assignment deadline synchronization, and persistent localStorage sync.
 */

'use strict';

window.AdiversePlanner = (function () {
  const STORAGE_KEY = 'adiverse_study_sessions';

  let sessions = [];
  let currentDate = new Date();
  let currentView = 'month'; // 'month', 'week', 'day'
  let editingSessionId = null;

  // DOM Elements
  let plannerView = null;
  let titleDisplay = null;
  let tabMonth = null;
  let tabWeek = null;
  let tabDay = null;
  let prevBtn = null;
  let nextBtn = null;
  let todayBtn = null;

  let monthContainer = null;
  let monthDays = null;
  let weekContainer = null;
  let weekGrid = null;
  let dayContainer = null;
  let dayTimeline = null;

  let sessionsList = null;
  let sessionsEmpty = null;
  let sessionsCountBadge = null;
  let deadlinesList = null;
  let deadlinesEmpty = null;
  let deadlinesCountBadge = null;

  // Modal Elements
  let modalOverlay = null;
  let modalTitle = null;
  let form = null;
  let inputTitle = null;
  let inputTopic = null;
  let inputDate = null;
  let inputTime = null;
  let inputDuration = null;
  let inputLink = null;
  let inputNotes = null;
  let inputCompleted = null;
  let modalCancelBtn = null;
  let modalSaveBtn = null;
  let topicDatalist = null;

  function formatDateISO(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getSeedSessions() {
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 86400000);
    const inThreeDays = new Date(today.getTime() + 86400000 * 3);

    return [
      {
        id: 'sess_' + (Date.now() - 3600000),
        title: 'Distributed Consensus & Proofs Study Block',
        topic: 'Computer Systems',
        date: formatDateISO(today),
        startTime: '14:00',
        duration: '60',
        linkedItem: '',
        notes: 'Review Raft leader election, safety invariants, and Byzantine fault tolerance.',
        completed: false,
        createdAt: Date.now() - 86400000
      },
      {
        id: 'sess_' + Date.now(),
        title: 'Algorithms Dynamic Programming Mastery',
        topic: 'Algorithms',
        date: formatDateISO(tomorrow),
        startTime: '16:30',
        duration: '90',
        linkedItem: '',
        notes: 'Solve Knapsack variations and Longest Common Subsequence proofs.',
        completed: false,
        createdAt: Date.now() - 43200000
      },
      {
        id: 'sess_' + (Date.now() + 1000),
        title: 'Data Structures Balanced BST Analysis',
        topic: 'Data Structures',
        date: formatDateISO(inThreeDays),
        startTime: '10:00',
        duration: '45',
        linkedItem: '',
        notes: 'Implement Red-Black tree rotation tests and AVL tree rebalancing benchmark.',
        completed: true,
        createdAt: Date.now() - 200000
      }
    ];
  }

  function loadSessions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        sessions = JSON.parse(raw);
        if (!Array.isArray(sessions)) {
          sessions = getSeedSessions();
          saveSessions();
        }
      } else {
        sessions = getSeedSessions();
        saveSessions();
      }
    } catch (e) {
      console.warn('Failed to parse study sessions from localStorage:', e);
      sessions = getSeedSessions();
    }
  }

  function saveSessions() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error('Failed to save study sessions to localStorage:', e);
    }
    if (window.AdiverseDashboard && typeof window.AdiverseDashboard.render === 'function') {
      window.AdiverseDashboard.render();
    }
    if (window.AdiverseNotifications && typeof window.AdiverseNotifications.render === 'function') {
      window.AdiverseNotifications.render();
    }
  }

  function init() {
    plannerView = document.getElementById('planner-workspace-view');
    titleDisplay = document.getElementById('calendar-title-display');
    tabMonth = document.getElementById('tab-cal-month');
    tabWeek = document.getElementById('tab-cal-week');
    tabDay = document.getElementById('tab-cal-day');
    prevBtn = document.getElementById('cal-prev-btn');
    nextBtn = document.getElementById('cal-next-btn');
    todayBtn = document.getElementById('cal-today-btn');

    monthContainer = document.getElementById('planner-month-view');
    monthDays = document.getElementById('cal-month-days');
    weekContainer = document.getElementById('planner-week-view');
    weekGrid = document.getElementById('cal-week-grid');
    dayContainer = document.getElementById('planner-day-view');
    dayTimeline = document.getElementById('cal-day-timeline');

    sessionsList = document.getElementById('planner-sessions-list');
    sessionsEmpty = document.getElementById('planner-sessions-empty');
    sessionsCountBadge = document.getElementById('planner-sessions-count');
    deadlinesList = document.getElementById('planner-deadlines-list');
    deadlinesEmpty = document.getElementById('planner-deadlines-empty');
    deadlinesCountBadge = document.getElementById('planner-deadlines-count');

    // Modal
    modalOverlay = document.getElementById('study-session-modal-overlay');
    modalTitle = document.getElementById('session-modal-title');
    form = document.getElementById('study-session-form');
    inputTitle = document.getElementById('sess-input-title');
    inputTopic = document.getElementById('sess-input-topic');
    inputDate = document.getElementById('sess-input-date');
    inputTime = document.getElementById('sess-input-time');
    inputDuration = document.getElementById('sess-input-duration');
    inputLink = document.getElementById('sess-input-link');
    inputNotes = document.getElementById('sess-input-notes');
    inputCompleted = document.getElementById('sess-input-completed');
    modalCancelBtn = document.getElementById('sess-modal-cancel-btn');
    modalSaveBtn = document.getElementById('sess-modal-save-btn');
    topicDatalist = document.getElementById('session-topic-datalist');

    const btnCreateSession = document.getElementById('btn-create-session');
    if (btnCreateSession) {
      btnCreateSession.addEventListener('click', () => openCreateModal());
    }

    // Navigation Tab Listeners
    if (tabMonth) {
      tabMonth.addEventListener('click', () => switchCalendarView('month'));
    }
    if (tabWeek) {
      tabWeek.addEventListener('click', () => switchCalendarView('week'));
    }
    if (tabDay) {
      tabDay.addEventListener('click', () => switchCalendarView('day'));
    }

    // Date Step Buttons
    if (prevBtn) {
      prevBtn.addEventListener('click', () => stepDate(-1));
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => stepDate(1));
    }
    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        currentDate = new Date();
        renderCalendar();
      });
    }

    // Modal Events
    if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);
    if (modalSaveBtn) modalSaveBtn.addEventListener('click', handleSaveSession);
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
      });
    }

    // Sidebar navigation hook
    const navPlanner = document.getElementById('nav-planner');
    if (navPlanner) {
      navPlanner.addEventListener('click', () => show());
    }

    // Datalist population
    populateTopicOptions();

    loadSessions();
    renderCalendar();
    renderUpcomingWidgets();

    if (window.location.hash === '#planner') {
      show();
    }

    window.addEventListener('hashchange', () => {
      if (window.location.hash === '#planner') {
        show();
      }
    });
  }

  function show() {
    const stage = document.getElementById('workspace-stage');
    const notesView = document.getElementById('notes-workspace-view');
    const dashboardView = document.getElementById('dashboard-workspace-view');
    const assignmentsView = document.getElementById('assignments-workspace-view');
    const revisionView = document.getElementById('revision-workspace-view');
    const resourcesView = document.getElementById('resources-workspace-view');
    const progressView = document.getElementById('progress-workspace-view');
    const eyebrow = document.getElementById('workspace-view-eyebrow');
    const title = document.getElementById('workspace-view-title');
    const navItems = document.querySelectorAll('.workspace-nav-item');

    // Close mobile sidebar if open
    const sidebar = document.getElementById('workspace-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-open');

    if (notesView) {
      if (window.AdiverseNotes && typeof window.AdiverseNotes.saveCurrentNote === 'function') {
        window.AdiverseNotes.saveCurrentNote(true);
      }
      notesView.style.display = 'none';
      notesView.classList.remove('is-active');
    }

    if (stage) stage.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'none';
    if (assignmentsView) assignmentsView.style.display = 'none';
    if (revisionView) revisionView.style.display = 'none';
    if (resourcesView) resourcesView.style.display = 'none';
    if (progressView) progressView.style.display = 'none';

    if (plannerView) {
      plannerView.style.display = 'flex';
      plannerView.scrollTop = 0;
    }

    if (eyebrow) eyebrow.textContent = 'Academic Schedule';
    if (title) title.textContent = 'Study Planner & Calendar';

    navItems.forEach(item => item.classList.remove('active'));
    const navBtn = document.getElementById('nav-planner');
    if (navBtn) navBtn.classList.add('active');

    populateTopicOptions();
    populateLinkOptions();
    renderCalendar();
    renderUpcomingWidgets();
  }

  function stepDate(direction) {
    if (currentView === 'month') {
      currentDate.setMonth(currentDate.getMonth() + direction);
    } else if (currentView === 'week') {
      currentDate.setDate(currentDate.getDate() + direction * 7);
    } else if (currentView === 'day') {
      currentDate.setDate(currentDate.getDate() + direction);
    }
    renderCalendar();
  }

  function switchCalendarView(view) {
    currentView = view;

    [tabMonth, tabWeek, tabDay].forEach(tab => {
      if (tab) {
        tab.classList.remove('is-active');
        tab.setAttribute('aria-selected', 'false');
      }
    });

    if (monthContainer) monthContainer.style.display = 'none';
    if (weekContainer) weekContainer.style.display = 'none';
    if (dayContainer) dayContainer.style.display = 'none';

    if (view === 'month') {
      if (tabMonth) {
        tabMonth.classList.add('is-active');
        tabMonth.setAttribute('aria-selected', 'true');
      }
      if (monthContainer) monthContainer.style.display = 'block';
    } else if (view === 'week') {
      if (tabWeek) {
        tabWeek.classList.add('is-active');
        tabWeek.setAttribute('aria-selected', 'true');
      }
      if (weekContainer) weekContainer.style.display = 'block';
    } else if (view === 'day') {
      if (tabDay) {
        tabDay.classList.add('is-active');
        tabDay.setAttribute('aria-selected', 'true');
      }
      if (dayContainer) dayContainer.style.display = 'block';
    }

    renderCalendar();
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

  function renderCalendar() {
    if (!titleDisplay) return;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    if (currentView === 'month') {
      titleDisplay.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
      renderMonthView();
    } else if (currentView === 'week') {
      const weekStart = getWeekStartDate(currentDate);
      const weekEnd = new Date(weekStart.getTime() + 6 * 86400000);
      titleDisplay.textContent = `${monthNames[weekStart.getMonth()].substring(0, 3)} ${weekStart.getDate()} - ${monthNames[weekEnd.getMonth()].substring(0, 3)} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
      renderWeekView(weekStart);
    } else if (currentView === 'day') {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      titleDisplay.textContent = `${dayNames[currentDate.getDay()]}, ${monthNames[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
      renderDayView();
    }
  }

  // --- 1. Month View Renderer ---
  function renderMonthView() {
    if (!monthDays) return;
    monthDays.innerHTML = '';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const todayStr = formatDateISO(new Date());
    const assignments = getAssignments();

    // Map events by ISO date
    const eventsByDate = new Map();

    // Index study sessions
    sessions.forEach(sess => {
      if (!sess.date) return;
      if (!eventsByDate.has(sess.date)) eventsByDate.set(sess.date, []);
      eventsByDate.get(sess.date).push({ type: 'session', data: sess });
    });

    // Index assignments
    assignments.forEach(assign => {
      if (!assign.dueDate) return;
      if (!eventsByDate.has(assign.dueDate)) eventsByDate.set(assign.dueDate, []);
      eventsByDate.get(assign.dueDate).push({ type: 'assignment', data: assign });
    });

    // Total cells in month grid (always 35 or 42)
    const totalCells = (firstDayIndex + totalDays > 35) ? 42 : 35;

    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell';

      let cellDate;
      let dayNumber;
      let isOtherMonth = false;

      if (i < firstDayIndex) {
        // Previous month days
        dayNumber = prevMonthDays - firstDayIndex + i + 1;
        cellDate = new Date(year, month - 1, dayNumber);
        isOtherMonth = true;
      } else if (i < firstDayIndex + totalDays) {
        // Current month days
        dayNumber = i - firstDayIndex + 1;
        cellDate = new Date(year, month, dayNumber);
      } else {
        // Next month days
        dayNumber = i - (firstDayIndex + totalDays) + 1;
        cellDate = new Date(year, month + 1, dayNumber);
        isOtherMonth = true;
      }

      const isoDate = formatDateISO(cellDate);
      if (isOtherMonth) cell.classList.add('is-other-month');
      if (isoDate === todayStr) cell.classList.add('is-today');

      // Day number label
      const numLabel = document.createElement('span');
      numLabel.className = 'cal-day-num';
      numLabel.textContent = dayNumber;
      cell.appendChild(numLabel);

      // Events container
      const eventsWrap = document.createElement('div');
      eventsWrap.className = 'cal-day-events';

      const dayEvents = eventsByDate.get(isoDate) || [];
      dayEvents.forEach(evt => {
        const pill = document.createElement('div');
        pill.className = 'cal-event-pill';

        if (evt.type === 'session') {
          const sess = evt.data;
          pill.classList.add(sess.completed ? 'cal-event--session-completed' : 'cal-event--session');
          pill.title = `${sess.title} (${sess.startTime || '10:00'}, ${sess.duration || 60}m)`;
          pill.innerHTML = `<span>${sess.startTime ? sess.startTime + ' ' : ''}${escapeHtml(sess.title)}</span>`;
          pill.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditModal(sess.id);
          });
        } else if (evt.type === 'assignment') {
          const assign = evt.data;
          const isOverdue = assign.dueDate < todayStr && assign.status !== 'Completed';
          pill.classList.add(isOverdue ? 'cal-event--deadline-overdue' : 'cal-event--deadline');
          if (assign.status === 'Completed') {
            pill.style.textDecoration = 'line-through';
            pill.style.opacity = '0.65';
          }
          pill.title = `Deadline: ${assign.title} (${assign.subject || 'Milestone'})`;
          pill.innerHTML = `<span>📋 ${escapeHtml(assign.title)}</span>`;
          pill.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.AdiverseAssignments && typeof window.AdiverseAssignments.openDetailModal === 'function') {
              window.AdiverseAssignments.openDetailModal(assign.id);
            }
          });
        }

        eventsWrap.appendChild(pill);
      });

      cell.appendChild(eventsWrap);

      // Clicking cell adds session on that date
      cell.addEventListener('click', () => {
        openCreateModal(isoDate);
      });

      monthDays.appendChild(cell);
    }
  }

  function getWeekStartDate(d) {
    const copy = new Date(d);
    const day = copy.getDay(); // 0 is Sunday
    copy.setDate(copy.getDate() - day);
    return copy;
  }

  // --- 2. Week View Renderer ---
  function renderWeekView(weekStart) {
    if (!weekGrid) return;
    weekGrid.innerHTML = '';

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayStr = formatDateISO(new Date());
    const assignments = getAssignments();

    for (let i = 0; i < 7; i++) {
      const colDate = new Date(weekStart.getTime() + i * 86400000);
      const isoDate = formatDateISO(colDate);

      const col = document.createElement('div');
      col.className = 'cal-week-col';
      if (isoDate === todayStr) col.classList.add('is-today');

      // Column Header
      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.flexDirection = 'column';
      header.style.borderBottom = '1px solid rgba(23, 23, 23, 0.08)';
      header.style.paddingBottom = '0.4rem';
      header.style.marginBottom = '0.4rem';

      header.innerHTML = `
        <span style="font-size: 0.72rem; font-weight: var(--weight-bold); text-transform: uppercase; color: var(--color-text-subtle);">${dayNames[i]}</span>
        <span style="font-family: var(--font-display); font-size: 1.15rem; font-weight: var(--weight-bold); color: var(--color-dark);">${colDate.getDate()}</span>
      `;
      col.appendChild(header);

      const eventsList = document.createElement('div');
      eventsList.style.display = 'flex';
      eventsList.style.flexDirection = 'column';
      eventsList.style.gap = '6px';
      eventsList.style.flex = '1';

      // Study sessions on this day
      sessions.filter(s => s.date === isoDate).forEach(sess => {
        const item = document.createElement('div');
        item.className = 'cal-event-pill ' + (sess.completed ? 'cal-event--session-completed' : 'cal-event--session');
        item.style.whiteSpace = 'normal';
        item.style.padding = '6px 8px';
        item.innerHTML = `
          <strong style="display: block; font-size: 0.72rem;">${sess.startTime || '10:00'} (${sess.duration || 60}m)</strong>
          <span style="font-size: 0.78rem;">${escapeHtml(sess.title)}</span>
        `;
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          openEditModal(sess.id);
        });
        eventsList.appendChild(item);
      });

      // Assignments on this day
      assignments.filter(a => a.dueDate === isoDate).forEach(assign => {
        const isOverdue = assign.dueDate < todayStr && assign.status !== 'Completed';
        const item = document.createElement('div');
        item.className = 'cal-event-pill ' + (isOverdue ? 'cal-event--deadline-overdue' : 'cal-event--deadline');
        item.style.whiteSpace = 'normal';
        item.style.padding = '6px 8px';
        item.innerHTML = `
          <strong style="display: block; font-size: 0.72rem;">Due Deadline</strong>
          <span style="font-size: 0.78rem;">${escapeHtml(assign.title)}</span>
        `;
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          if (window.AdiverseAssignments && typeof window.AdiverseAssignments.openDetailModal === 'function') {
            window.AdiverseAssignments.openDetailModal(assign.id);
          }
        });
        eventsList.appendChild(item);
      });

      col.appendChild(eventsList);

      col.addEventListener('click', () => {
        openCreateModal(isoDate);
      });

      weekGrid.appendChild(col);
    }
  }

  // --- 3. Day View Renderer ---
  function renderDayView() {
    if (!dayTimeline) return;
    dayTimeline.innerHTML = '';

    const isoDate = formatDateISO(currentDate);
    const todayStr = formatDateISO(new Date());
    const daySessions = sessions.filter(s => s.date === isoDate);
    const dayAssignments = getAssignments().filter(a => a.dueDate === isoDate);

    // Hours from 8:00 to 22:00
    for (let h = 8; h <= 22; h++) {
      const hourStr = `${String(h).padStart(2, '0')}:00`;
      const row = document.createElement('div');
      row.className = 'cal-day-hour-row';

      const label = document.createElement('span');
      label.className = 'cal-hour-label';
      label.textContent = hourStr;
      row.appendChild(label);

      const eventsContainer = document.createElement('div');
      eventsContainer.className = 'cal-hour-events';

      // Match sessions starting in this hour (e.g. 14:00 to 14:59)
      daySessions.forEach(sess => {
        const sessHour = parseInt((sess.startTime || '10:00').split(':')[0], 10);
        if (sessHour === h) {
          const item = document.createElement('div');
          item.className = 'cal-event-pill ' + (sess.completed ? 'cal-event--session-completed' : 'cal-event--session');
          item.style.padding = '8px 12px';
          item.style.whiteSpace = 'normal';
          item.style.display = 'flex';
          item.style.alignItems = 'center';
          item.style.justifyContent = 'space-between';
          item.innerHTML = `
            <div>
              <strong style="font-size: 0.82rem; display: block;">${escapeHtml(sess.title)}</strong>
              <span style="font-size: 0.72rem; opacity: 0.85;">${sess.topic ? sess.topic + ' • ' : ''}${sess.startTime} • ${sess.duration}m duration</span>
            </div>
            <span style="font-size: 0.74rem; font-weight: bold;">${sess.completed ? 'Completed' : 'Planned'}</span>
          `;
          item.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditModal(sess.id);
          });
          eventsContainer.appendChild(item);
        }
      });

      // Show assignments due at 17:00 or 23:59
      if (h === 17) {
        dayAssignments.forEach(assign => {
          const isOverdue = assign.dueDate < todayStr && assign.status !== 'Completed';
          const item = document.createElement('div');
          item.className = 'cal-event-pill ' + (isOverdue ? 'cal-event--deadline-overdue' : 'cal-event--deadline');
          item.style.padding = '8px 12px';
          item.style.whiteSpace = 'normal';
          item.innerHTML = `
            <strong style="font-size: 0.82rem; display: block;">Assignment Due: ${escapeHtml(assign.title)}</strong>
            <span style="font-size: 0.72rem; opacity: 0.85;">${assign.subject || 'Milestone'} • Priority: ${assign.priority}</span>
          `;
          item.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.AdiverseAssignments && typeof window.AdiverseAssignments.openDetailModal === 'function') {
              window.AdiverseAssignments.openDetailModal(assign.id);
            }
          });
          eventsContainer.appendChild(item);
        });
      }

      row.appendChild(eventsContainer);

      row.addEventListener('click', () => {
        openCreateModal(isoDate, hourStr);
      });

      dayTimeline.appendChild(row);
    }
  }

  // --- Upcoming Widgets (Sessions & Deadlines) ---
  function renderUpcomingWidgets() {
    renderUpcomingSessions();
    renderUpcomingDeadlines();
  }

  function renderUpcomingSessions() {
    if (!sessionsList || !sessionsEmpty) return;

    const sorted = [...sessions].sort((a, b) => {
      const timeA = (a.date || '') + ' ' + (a.startTime || '00:00');
      const timeB = (b.date || '') + ' ' + (b.startTime || '00:00');
      return timeA.localeCompare(timeB);
    });

    if (sessionsCountBadge) {
      sessionsCountBadge.textContent = `${sessions.length} Sessions`;
    }

    if (sorted.length === 0) {
      sessionsList.innerHTML = '';
      sessionsEmpty.style.display = 'block';
      return;
    }

    sessionsEmpty.style.display = 'none';
    sessionsList.innerHTML = '';

    sorted.slice(0, 5).forEach(sess => {
      const card = document.createElement('div');
      card.className = 'dashboard-item-card';
      card.style.cursor = 'default';

      const durationStr = sess.duration ? `${sess.duration} min` : '60 min';
      const timeStr = `${sess.date} at ${sess.startTime || '10:00'} (${durationStr})`;

      card.innerHTML = `
        <div class="dashboard-item-top">
          <div class="dashboard-item-title" style="cursor: pointer;">
            <span class="dashboard-item-dot" style="background: ${sess.completed ? '#2b8a3e' : 'var(--color-purple)'};" aria-hidden="true"></span>
            <span style="${sess.completed ? 'text-decoration: line-through; opacity: 0.75;' : ''}">${escapeHtml(sess.title)}</span>
          </div>
          <span class="dashboard-item-badge">${escapeHtml(sess.topic || 'General')}</span>
        </div>
        <div class="dashboard-item-meta" style="justify-content: space-between;">
          <span>🕒 ${timeStr}</span>
          <div style="display: flex; gap: 0.4rem;">
            <button class="btn-toggle-sess assign-action-btn" type="button" title="${sess.completed ? 'Mark Incomplete' : 'Mark Completed'}" style="width: auto; height: auto; padding: 2px 7px; font-size: 0.72rem;">
              ${sess.completed ? 'Done' : 'Mark Done'}
            </button>
            <button class="btn-edit-sess assign-action-btn" type="button" title="Edit Session" style="width: auto; height: auto; padding: 2px 7px; font-size: 0.72rem;">
              Edit
            </button>
            <button class="btn-del-sess assign-action-btn" type="button" title="Delete Session" style="color: #c92a2a; width: auto; height: auto; padding: 2px 7px; font-size: 0.72rem;">
              Delete
            </button>
          </div>
        </div>
      `;

      const titleEl = card.querySelector('.dashboard-item-title');
      if (titleEl) {
        titleEl.addEventListener('click', () => openEditModal(sess.id));
      }

      const toggleBtnEl = card.querySelector('.btn-toggle-sess');
      if (toggleBtnEl) {
        toggleBtnEl.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleSessionCompleted(sess.id);
        });
      }

      const editBtnEl = card.querySelector('.btn-edit-sess');
      if (editBtnEl) {
        editBtnEl.addEventListener('click', (e) => {
          e.stopPropagation();
          openEditModal(sess.id);
        });
      }

      const delBtnEl = card.querySelector('.btn-del-sess');
      if (delBtnEl) {
        delBtnEl.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteSession(sess.id);
        });
      }

      sessionsList.appendChild(card);
    });
  }

  function renderUpcomingDeadlines() {
    if (!deadlinesList || !deadlinesEmpty) return;

    const assignments = getAssignments();
    const sorted = [...assignments].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));

    if (deadlinesCountBadge) {
      deadlinesCountBadge.textContent = `${assignments.length} Tasks`;
    }

    if (sorted.length === 0) {
      deadlinesList.innerHTML = '';
      deadlinesEmpty.style.display = 'block';
      return;
    }

    deadlinesEmpty.style.display = 'none';
    deadlinesList.innerHTML = '';

    const todayStr = formatDateISO(new Date());

    sorted.slice(0, 5).forEach(assign => {
      const card = document.createElement('div');
      card.className = 'dashboard-item-card';

      const isOverdue = assign.dueDate < todayStr && assign.status !== 'Completed';
      const badgeColor = isOverdue ? '#c92a2a' : '#d9480f';

      card.innerHTML = `
        <div class="dashboard-item-top">
          <div class="dashboard-item-title">
            <span class="dashboard-item-dot" style="background: ${badgeColor};" aria-hidden="true"></span>
            <span>${escapeHtml(assign.title)}</span>
          </div>
          <span class="dashboard-item-badge" style="border-color: ${badgeColor}; color: ${badgeColor};">
            ${isOverdue ? 'Overdue' : escapeHtml(assign.status)}
          </span>
        </div>
        <div class="dashboard-item-meta">
          <span>📅 Due: ${assign.dueDate || 'No date'}</span>
          <span>•</span>
          <span>${escapeHtml(assign.subject || 'Milestone')}</span>
          <span>•</span>
          <span style="color: var(--color-purple); font-weight: bold; cursor: pointer;" class="deadline-detail-link">Open Details →</span>
        </div>
      `;

      card.addEventListener('click', () => {
        if (window.AdiverseAssignments && typeof window.AdiverseAssignments.openDetailModal === 'function') {
          window.AdiverseAssignments.openDetailModal(assign.id);
        }
      });

      deadlinesList.appendChild(card);
    });
  }

  // --- Study Session Modal Management ---
  function openCreateModal(defaultDate, defaultTime) {
    editingSessionId = null;
    if (modalTitle) modalTitle.textContent = 'Plan Study Session';
    if (form) form.reset();

    if (inputDate) inputDate.value = defaultDate || formatDateISO(new Date());
    if (inputTime) inputTime.value = defaultTime || '10:00';
    if (inputDuration) inputDuration.value = '60';
    if (inputCompleted) inputCompleted.checked = false;

    populateTopicOptions();
    populateLinkOptions();

    if (modalOverlay) modalOverlay.classList.add('is-open');
    setTimeout(() => inputTitle && inputTitle.focus(), 60);
  }

  function openEditModal(sessionId) {
    const sess = sessions.find(s => s.id === sessionId);
    if (!sess) return;

    editingSessionId = sessionId;
    if (modalTitle) modalTitle.textContent = 'Edit Study Session';

    if (inputTitle) inputTitle.value = sess.title || '';
    if (inputTopic) inputTopic.value = sess.topic || '';
    if (inputDate) inputDate.value = sess.date || formatDateISO(new Date());
    if (inputTime) inputTime.value = sess.startTime || '10:00';
    if (inputDuration) inputDuration.value = sess.duration || '60';
    if (inputNotes) inputNotes.value = sess.notes || '';
    if (inputCompleted) inputCompleted.checked = !!sess.completed;

    populateTopicOptions();
    populateLinkOptions(sess.linkedItem);

    if (modalOverlay) modalOverlay.classList.add('is-open');
    setTimeout(() => inputTitle && inputTitle.focus(), 60);
  }

  function closeModal() {
    editingSessionId = null;
    if (modalOverlay) modalOverlay.classList.remove('is-open');
  }

  function handleSaveSession() {
    if (!inputTitle || !inputDate) return;
    const title = inputTitle.value.trim();
    const date = inputDate.value;
    if (!title || !date) return;

    const topic = inputTopic ? inputTopic.value.trim() : '';
    const startTime = inputTime ? inputTime.value : '10:00';
    const duration = inputDuration ? inputDuration.value : '60';
    const linkedItem = inputLink ? inputLink.value : '';
    const notes = inputNotes ? inputNotes.value.trim() : '';
    const completed = inputCompleted ? inputCompleted.checked : false;

    if (editingSessionId) {
      const sess = sessions.find(s => s.id === editingSessionId);
      if (sess) {
        sess.title = title;
        sess.topic = topic;
        sess.date = date;
        sess.startTime = startTime;
        sess.duration = duration;
        sess.linkedItem = linkedItem;
        sess.notes = notes;
        sess.completed = completed;
        sess.updatedAt = Date.now();
      }
    } else {
      const newSession = {
        id: 'sess_' + Date.now(),
        title,
        topic,
        date,
        startTime,
        duration,
        linkedItem,
        notes,
        completed,
        createdAt: Date.now()
      };
      sessions.push(newSession);
    }

    saveSessions();
    renderCalendar();
    renderUpcomingWidgets();
    closeModal();
  }

  function deleteSession(id) {
    sessions = sessions.filter(s => s.id !== id);
    saveSessions();
    renderCalendar();
    renderUpcomingWidgets();
  }

  function toggleSessionCompleted(id) {
    const sess = sessions.find(s => s.id === id);
    if (sess) {
      sess.completed = !sess.completed;
      sess.updatedAt = Date.now();
      saveSessions();
      renderCalendar();
      renderUpcomingWidgets();
    }
  }

  function populateTopicOptions() {
    if (!topicDatalist) return;
    topicDatalist.innerHTML = '';

    const set = new Set();
    if (window.AdiverseWorkspace && typeof window.AdiverseWorkspace.getNodes === 'function') {
      window.AdiverseWorkspace.getNodes().forEach(n => {
        if (!n.isRoot && n.title) set.add(n.title);
      });
    }

    set.forEach(title => {
      const opt = document.createElement('option');
      opt.value = title;
      topicDatalist.appendChild(opt);
    });
  }

  function populateLinkOptions(selectedLinkVal) {
    if (!inputLink) return;
    inputLink.innerHTML = '<option value="">None (Independent Study)</option>';

    // Topics group
    const topicGroup = document.createElement('optgroup');
    topicGroup.label = 'Knowledge Topics';
    if (window.AdiverseWorkspace && typeof window.AdiverseWorkspace.getNodes === 'function') {
      window.AdiverseWorkspace.getNodes().forEach(n => {
        if (!n.isRoot && n.title) {
          const opt = document.createElement('option');
          opt.value = `topic:${n.id}:${n.title}`;
          opt.textContent = `Topic: ${n.title}`;
          if (selectedLinkVal === opt.value) opt.selected = true;
          topicGroup.appendChild(opt);
        }
      });
    }
    inputLink.appendChild(topicGroup);

    // Assignments group
    const assignGroup = document.createElement('optgroup');
    assignGroup.label = 'Assignments & Coursework';
    getAssignments().forEach(a => {
      const opt = document.createElement('option');
      opt.value = `assign:${a.id}:${a.title}`;
      opt.textContent = `Assignment: ${a.title}`;
      if (selectedLinkVal === opt.value) opt.selected = true;
      assignGroup.appendChild(opt);
    });
    inputLink.appendChild(assignGroup);
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
    show,
    renderCalendar,
    renderUpcomingWidgets,
    getSessions: () => sessions,
    createSession: (data) => {
      const newSession = Object.assign({
        id: 'sess_' + Date.now(),
        title: 'Untitled Session',
        topic: '',
        date: formatDateISO(new Date()),
        startTime: '10:00',
        duration: '60',
        notes: '',
        completed: false,
        createdAt: Date.now()
      }, data);
      sessions.push(newSession);
      saveSessions();
      renderCalendar();
      renderUpcomingWidgets();
      return newSession;
    },
    editSession: (id, updates) => {
      const item = sessions.find(s => s.id === id);
      if (item) {
        Object.assign(item, updates, { updatedAt: Date.now() });
        saveSessions();
        renderCalendar();
        renderUpcomingWidgets();
        return item;
      }
      return null;
    },
    deleteSession,
    toggleSessionCompleted,
    openCreateModal,
    openEditModal,
    closeModal
  };
})();
