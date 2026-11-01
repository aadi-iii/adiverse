/**
 * ADIVERSE - ASSIGNMENTS & DEADLINES MODULE
 * Track coursework, problem sets, and milestones across the academic universe.
 * Full CRUD, status transitions, multi-criteria filtering, overdue/upcoming detection,
 * detail modal, and persistent localStorage sync.
 */

'use strict';

window.AdiverseAssignments = (function () {
  const STORAGE_KEY = 'adiverse_assignments_data';

  let assignments = [];
  let filters = {
    status: 'all',
    priority: 'all',
    subject: 'all',
    search: ''
  };

  let editingAssignmentId = null;
  let viewingAssignmentId = null;

  // DOM Elements
  let assignmentsView = null;
  let assignmentsList = null;
  let assignmentsEmpty = null;
  let statOverdue = null;
  let statUpcoming = null;
  let statProgress = null;
  let statCompleted = null;
  let filterStatus = null;
  let filterPriority = null;
  let filterSubject = null;
  let searchInput = null;
  let subjectDatalist = null;

  // Form Modal Elements
  let modalOverlay = null;
  let modalTitle = null;
  let form = null;
  let inputTitle = null;
  let inputSubject = null;
  let inputDueDate = null;
  let inputPriority = null;
  let inputStatus = null;
  let inputDesc = null;
  let modalSaveBtn = null;
  let modalCancelBtn = null;

  // Detail Modal Elements
  let detailOverlay = null;
  let detailTitle = null;
  let detailBadges = null;
  let detailDesc = null;
  let detailMeta = null;
  let detailCloseX = null;
  let detailDeleteBtn = null;
  let detailToggleBtn = null;
  let detailEditBtn = null;

  // Date utilities
  function formatDateISO(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getHumanDate(dueDateStr) {
    if (!dueDateStr) return 'No due date';
    const parts = dueDateStr.split('-');
    if (parts.length !== 3) return dueDateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  function getDueStatus(dueDateStr, status) {
    if (status === 'Completed') {
      return {
        type: 'completed',
        label: 'Completed',
        diffDays: 0,
        badgeClass: 'badge-status-completed'
      };
    }

    if (!dueDateStr) {
      return {
        type: 'none',
        label: 'No deadline',
        diffDays: 999,
        badgeClass: ''
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parts = dueDateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dueDate = new Date(year, month, day);
    dueDate.setHours(0, 0, 0, 0);

    const diffMs = dueDate.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const formatted = getHumanDate(dueDateStr);

    if (diffDays < 0) {
      const daysAgo = Math.abs(diffDays);
      return {
        type: 'overdue',
        label: `Overdue by ${daysAgo} day${daysAgo === 1 ? '' : 's'} (${formatted})`,
        diffDays,
        indicatorClass: 'due-indicator--overdue'
      };
    } else if (diffDays === 0) {
      return {
        type: 'today',
        label: `Due Today (${formatted})`,
        diffDays,
        indicatorClass: 'due-indicator--today'
      };
    } else if (diffDays <= 7) {
      return {
        type: 'upcoming',
        label: `Due in ${diffDays} day${diffDays === 1 ? '' : 's'} (${formatted})`,
        diffDays,
        indicatorClass: 'due-indicator--upcoming'
      };
    } else {
      return {
        type: 'future',
        label: `Due ${formatted}`,
        diffDays,
        indicatorClass: ''
      };
    }
  }

  function getSeedAssignments() {
    const today = new Date();
    const msInDay = 86400000;

    const overdueDate = new Date(today.getTime() - 1 * msInDay);
    const upcomingDate1 = new Date(today.getTime() + 2 * msInDay);
    const upcomingDate2 = new Date(today.getTime() + 5 * msInDay);
    const completedDate = new Date(today.getTime() - 3 * msInDay);
    const futureDate = new Date(today.getTime() + 12 * msInDay);

    return [
      {
        id: 'assign_' + (Date.now() - 5000),
        title: 'Distributed Systems Consensus Paper',
        description: 'Analyze Raft vs Paxos consensus protocols, focusing on leader election, log replication safety guarantees, and partition tolerance.',
        subject: 'Distributed Systems',
        dueDate: formatDateISO(upcomingDate1),
        priority: 'Urgent',
        status: 'In Progress',
        createdAt: Date.now() - 3 * msInDay,
        updatedAt: Date.now() - 1 * msInDay
      },
      {
        id: 'assign_' + (Date.now() - 4000),
        title: 'Algorithmic Complexity & Graph Search Analysis',
        description: 'Implement A* heuristic search algorithm and benchmark execution performance against Dijkstra on large Euclidean grid roadmaps.',
        subject: 'Algorithms',
        dueDate: formatDateISO(upcomingDate2),
        priority: 'High',
        status: 'Not Started',
        createdAt: Date.now() - 2 * msInDay,
        updatedAt: Date.now() - 2 * msInDay
      },
      {
        id: 'assign_' + (Date.now() - 3000),
        title: 'Database Query Optimization Benchmark',
        description: 'Profile PostgreSQL query planner with B-tree vs hash indexes under concurrent read/write transactional workloads.',
        subject: 'Database Systems',
        dueDate: formatDateISO(completedDate),
        priority: 'Medium',
        status: 'Completed',
        createdAt: Date.now() - 7 * msInDay,
        updatedAt: Date.now() - 3 * msInDay
      },
      {
        id: 'assign_' + (Date.now() - 2000),
        title: 'Machine Learning Gradient Descent Lab',
        description: 'Evaluate Adam, RMSprop, and SGD with momentum on high-dimensional non-convex loss surfaces with varying learning rates.',
        subject: 'Artificial Intelligence',
        dueDate: formatDateISO(overdueDate),
        priority: 'High',
        status: 'Not Started',
        createdAt: Date.now() - 5 * msInDay,
        updatedAt: Date.now() - 5 * msInDay
      },
      {
        id: 'assign_' + (Date.now() - 1000),
        title: 'Operating Systems Virtual Memory Sim',
        description: 'Simulate LRU, Second-Chance, and Optimal page replacement algorithms under thrashing memory constraints in C++.',
        subject: 'Operating Systems',
        dueDate: formatDateISO(futureDate),
        priority: 'Low',
        status: 'In Progress',
        createdAt: Date.now() - 1 * msInDay,
        updatedAt: Date.now() - 1 * msInDay
      }
    ];
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        assignments = JSON.parse(raw);
        if (!Array.isArray(assignments)) {
          assignments = getSeedAssignments();
          saveData();
        }
      } else {
        assignments = getSeedAssignments();
        saveData();
      }
    } catch (e) {
      console.warn('Failed to parse assignments from localStorage:', e);
      assignments = getSeedAssignments();
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
    } catch (e) {
      console.error('Failed to save assignments to localStorage:', e);
    }
  }

  function init() {
    // Cache DOM nodes
    assignmentsView = document.getElementById('assignments-workspace-view');
    assignmentsList = document.getElementById('assignments-list');
    assignmentsEmpty = document.getElementById('assignments-empty');
    statOverdue = document.getElementById('stat-overdue-count');
    statUpcoming = document.getElementById('stat-upcoming-count');
    statProgress = document.getElementById('stat-progress-count');
    statCompleted = document.getElementById('stat-completed-count');
    filterStatus = document.getElementById('filter-status');
    filterPriority = document.getElementById('filter-priority');
    filterSubject = document.getElementById('filter-subject');
    searchInput = document.getElementById('assign-search-input');
    subjectDatalist = document.getElementById('assignment-subject-datalist');

    // Modals
    modalOverlay = document.getElementById('assignment-modal-overlay');
    modalTitle = document.getElementById('assignment-modal-title');
    form = document.getElementById('assignment-form');
    inputTitle = document.getElementById('assign-input-title');
    inputSubject = document.getElementById('assign-input-subject');
    inputDueDate = document.getElementById('assign-input-due-date');
    inputPriority = document.getElementById('assign-input-priority');
    inputStatus = document.getElementById('assign-input-status');
    inputDesc = document.getElementById('assign-input-desc');
    modalSaveBtn = document.getElementById('assign-modal-save-btn');
    modalCancelBtn = document.getElementById('assign-modal-cancel-btn');

    detailOverlay = document.getElementById('assignment-detail-overlay');
    detailTitle = document.getElementById('assign-detail-title');
    detailBadges = document.getElementById('assign-detail-badges');
    detailDesc = document.getElementById('assign-detail-desc');
    detailMeta = document.getElementById('assign-detail-meta');
    detailCloseX = document.getElementById('assign-detail-close-x');
    detailDeleteBtn = document.getElementById('assign-detail-delete-btn');
    detailToggleBtn = document.getElementById('assign-detail-toggle-btn');
    detailEditBtn = document.getElementById('assign-detail-edit-btn');

    loadData();

    // Event Bindings
    const navAssignments = document.getElementById('nav-assignments');
    if (navAssignments) {
      navAssignments.addEventListener('click', () => {
        show();
      });
    }

    const btnCreate = document.getElementById('btn-create-assignment');
    if (btnCreate) {
      btnCreate.addEventListener('click', () => openCreateModal());
    }

    const btnEmptyCreate = document.getElementById('btn-empty-create-assignment');
    if (btnEmptyCreate) {
      btnEmptyCreate.addEventListener('click', () => openCreateModal());
    }

    // Filters
    if (filterStatus) {
      filterStatus.addEventListener('change', (e) => {
        filters.status = e.target.value;
        render();
      });
    }

    if (filterPriority) {
      filterPriority.addEventListener('change', (e) => {
        filters.priority = e.target.value;
        render();
      });
    }

    if (filterSubject) {
      filterSubject.addEventListener('change', (e) => {
        filters.subject = e.target.value;
        render();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        filters.search = e.target.value.trim().toLowerCase();
        render();
      });
    }

    // Modal Form Buttons
    if (modalSaveBtn) {
      modalSaveBtn.addEventListener('click', saveAssignmentForm);
    }
    if (modalCancelBtn) {
      modalCancelBtn.addEventListener('click', closeFormModal);
    }
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeFormModal();
      });
    }

    // Modal Detail Buttons
    if (detailCloseX) {
      detailCloseX.addEventListener('click', closeDetailModal);
    }
    if (detailOverlay) {
      detailOverlay.addEventListener('click', (e) => {
        if (e.target === detailOverlay) closeDetailModal();
      });
    }
    if (detailEditBtn) {
      detailEditBtn.addEventListener('click', () => {
        if (!viewingAssignmentId) return;
        const targetId = viewingAssignmentId;
        closeDetailModal();
        openEditModal(targetId);
      });
    }
    if (detailToggleBtn) {
      detailToggleBtn.addEventListener('click', () => {
        if (!viewingAssignmentId) return;
        toggleAssignmentStatus(viewingAssignmentId);
      });
    }
    if (detailDeleteBtn) {
      detailDeleteBtn.addEventListener('click', () => {
        if (!viewingAssignmentId) return;
        deleteAssignment(viewingAssignmentId);
      });
    }

    // Escape Key Handler for Overlays
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (modalOverlay && modalOverlay.classList.contains('is-active')) {
          closeFormModal();
        } else if (detailOverlay && detailOverlay.classList.contains('is-active')) {
          closeDetailModal();
        }
      }
    });

    populateSubjectOptions();
    render();

    if (window.location.hash === '#assignments') {
      show();
    }

    window.addEventListener('hashchange', () => {
      if (window.location.hash === '#assignments') {
        show();
      }
    });
  }

  function show() {
    const stage = document.getElementById('workspace-stage');
    const notesView = document.getElementById('notes-workspace-view');
    const dashboardView = document.getElementById('dashboard-workspace-view');
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
    const revisionView = document.getElementById('revision-workspace-view');
    if (stage) stage.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'none';
    if (revisionView) revisionView.style.display = 'none';

    if (assignmentsView) {
      assignmentsView.style.display = 'flex';
      assignmentsView.scrollTop = 0;
    }

    if (eyebrow) eyebrow.textContent = 'Academic Milestones';
    if (title) title.textContent = 'Assignments & Deadlines';

    navItems.forEach(item => item.classList.remove('active'));
    const navBtn = document.getElementById('nav-assignments');
    if (navBtn) navBtn.classList.add('active');

    populateSubjectOptions();
    render();
  }

  function populateSubjectOptions() {
    const subjectsSet = new Set();

    // From current assignments
    assignments.forEach(a => {
      if (a.subject && a.subject.trim()) {
        subjectsSet.add(a.subject.trim());
      }
    });

    // From knowledge tree nodes
    if (window.AdiverseWorkspace && typeof window.AdiverseWorkspace.getNodes === 'function') {
      const nodes = window.AdiverseWorkspace.getNodes() || [];
      nodes.forEach(n => {
        if (n.title && n.title.trim() && n.id !== 'root') {
          subjectsSet.add(n.title.trim());
        }
      });
    }

    const sortedSubjects = Array.from(subjectsSet).sort();

    // Populate filter dropdown
    if (filterSubject) {
      const currentVal = filterSubject.value;
      filterSubject.innerHTML = '<option value="all">All Subjects</option>';
      sortedSubjects.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub;
        opt.textContent = sub;
        filterSubject.appendChild(opt);
      });
      if (sortedSubjects.includes(currentVal)) {
        filterSubject.value = currentVal;
      } else {
        filterSubject.value = 'all';
        filters.subject = 'all';
      }
    }

    // Populate form datalist
    if (subjectDatalist) {
      subjectDatalist.innerHTML = '';
      sortedSubjects.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub;
        subjectDatalist.appendChild(opt);
      });
    }
  }

  function render() {
    // 1. Calculate Metrics
    let countOverdue = 0;
    let countUpcoming = 0;
    let countProgress = 0;
    let countCompleted = 0;

    assignments.forEach(a => {
      const statusInfo = getDueStatus(a.dueDate, a.status);
      if (a.status === 'Completed') {
        countCompleted++;
      } else {
        if (statusInfo.type === 'overdue') countOverdue++;
        else if (statusInfo.type === 'upcoming' || statusInfo.type === 'today') countUpcoming++;
        if (a.status === 'In Progress') countProgress++;
      }
    });

    if (statOverdue) statOverdue.textContent = countOverdue;
    if (statUpcoming) statUpcoming.textContent = countUpcoming;
    if (statProgress) statProgress.textContent = countProgress;
    if (statCompleted) statCompleted.textContent = countCompleted;

    // 2. Filter Assignments
    let filtered = assignments.filter(a => {
      if (filters.status !== 'all' && a.status !== filters.status) return false;
      if (filters.priority !== 'all' && a.priority !== filters.priority) return false;
      if (filters.subject !== 'all' && a.subject !== filters.subject) return false;
      if (filters.search) {
        const query = filters.search;
        const titleMatch = (a.title || '').toLowerCase().includes(query);
        const descMatch = (a.description || '').toLowerCase().includes(query);
        const subjectMatch = (a.subject || '').toLowerCase().includes(query);
        if (!titleMatch && !descMatch && !subjectMatch) return false;
      }
      return true;
    });

    // 3. Sort: Incomplete first (by due date ascending), Completed last
    filtered.sort((a, b) => {
      if (a.status === 'Completed' && b.status !== 'Completed') return 1;
      if (a.status !== 'Completed' && b.status === 'Completed') return -1;
      const dateA = a.dueDate || '9999-12-31';
      const dateB = b.dueDate || '9999-12-31';
      return dateA.localeCompare(dateB);
    });

    // 4. Render DOM
    if (!assignmentsList) return;

    if (filtered.length === 0) {
      assignmentsList.style.display = 'none';
      if (assignmentsEmpty) assignmentsEmpty.style.display = 'flex';
      return;
    }

    assignmentsList.style.display = 'flex';
    if (assignmentsEmpty) assignmentsEmpty.style.display = 'none';
    assignmentsList.innerHTML = '';

    filtered.forEach(assign => {
      const card = createAssignmentCardElement(assign);
      assignmentsList.appendChild(card);
    });
  }

  function createAssignmentCardElement(assign) {
    const card = document.createElement('div');
    const isCompleted = assign.status === 'Completed';
    const statusInfo = getDueStatus(assign.dueDate, assign.status);
    const isOverdue = statusInfo.type === 'overdue' && !isCompleted;

    card.className = `assignment-card ${isOverdue ? 'assignment-card--overdue' : ''} ${isCompleted ? 'assignment-card--completed' : ''}`;
    card.setAttribute('role', 'listitem');
    card.setAttribute('data-id', assign.id);

    // Left Section: Checkbox + Details
    const leftWrap = document.createElement('div');
    leftWrap.className = 'assignment-card-left';

    // Status Toggle Checkbox Button
    const checkboxBtn = document.createElement('button');
    checkboxBtn.className = 'assignment-checkbox-btn';
    checkboxBtn.type = 'button';
    checkboxBtn.setAttribute('title', isCompleted ? 'Mark as Incomplete' : 'Mark as Completed');
    checkboxBtn.setAttribute('aria-label', isCompleted ? 'Mark as Incomplete' : 'Mark as Completed');
    if (isCompleted) {
      checkboxBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
    }
    checkboxBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleAssignmentStatus(assign.id);
    });
    leftWrap.appendChild(checkboxBtn);

    // Details Wrap
    const detailsWrap = document.createElement('div');
    detailsWrap.className = 'assignment-details-wrap';

    // Header Row: Title & Badges
    const headerRow = document.createElement('div');
    headerRow.className = 'assignment-card-header-row';

    const titleEl = document.createElement('h3');
    titleEl.className = 'assignment-card-title';
    titleEl.textContent = assign.title;
    headerRow.appendChild(titleEl);

    // Priority Badge
    if (assign.priority) {
      const priorityBadge = document.createElement('span');
      const pClass = `badge-priority-${(assign.priority || '').toLowerCase()}`;
      priorityBadge.className = `assignment-badge ${pClass}`;
      priorityBadge.textContent = assign.priority;
      headerRow.appendChild(priorityBadge);
    }

    // Status Badge
    const statusBadge = document.createElement('span');
    statusBadge.className = `assignment-badge ${isCompleted ? 'badge-status-completed' : 'badge-status'}`;
    statusBadge.textContent = assign.status;
    headerRow.appendChild(statusBadge);

    // Subject Badge
    if (assign.subject) {
      const subjectBadge = document.createElement('span');
      subjectBadge.className = 'assignment-badge badge-subject';
      subjectBadge.textContent = assign.subject;
      headerRow.appendChild(subjectBadge);
    }

    detailsWrap.appendChild(headerRow);

    // Description snippet
    if (assign.description) {
      const descEl = document.createElement('p');
      descEl.className = 'assignment-card-desc';
      descEl.textContent = assign.description;
      detailsWrap.appendChild(descEl);
    }

    // Meta Row: Due Date & Overdue Tag
    const metaRow = document.createElement('div');
    metaRow.className = 'assignment-meta-row';

    const dueEl = document.createElement('span');
    dueEl.className = statusInfo.indicatorClass || '';
    dueEl.innerHTML = `
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: -1px; margin-right: 3px;">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
      ${statusInfo.label}
    `;
    metaRow.appendChild(dueEl);

    detailsWrap.appendChild(metaRow);
    leftWrap.appendChild(detailsWrap);
    card.appendChild(leftWrap);

    // Right Actions
    const actionsWrap = document.createElement('div');
    actionsWrap.className = 'assignment-card-actions';

    // Edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'assign-action-btn';
    editBtn.type = 'button';
    editBtn.setAttribute('title', 'Edit Assignment');
    editBtn.setAttribute('aria-label', 'Edit Assignment');
    editBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
    `;
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(assign.id);
    });
    actionsWrap.appendChild(editBtn);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'assign-action-btn assign-action-btn--danger';
    deleteBtn.type = 'button';
    deleteBtn.setAttribute('title', 'Delete Assignment');
    deleteBtn.setAttribute('aria-label', 'Delete Assignment');
    deleteBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    `;
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteAssignment(assign.id);
    });
    actionsWrap.appendChild(deleteBtn);

    card.appendChild(actionsWrap);

    // Clicking anywhere on card opens details
    card.addEventListener('click', () => {
      openDetailModal(assign.id);
    });

    return card;
  }

  // --- CRUD Operations ---
  function openCreateModal() {
    editingAssignmentId = null;
    if (modalTitle) modalTitle.textContent = 'New Academic Assignment';
    if (form) form.reset();

    // Default due date to 3 days from now
    if (inputDueDate) {
      const defaultDate = new Date(Date.now() + 3 * 86400000);
      inputDueDate.value = formatDateISO(defaultDate);
    }
    if (inputPriority) inputPriority.value = 'Medium';
    if (inputStatus) inputStatus.value = 'Not Started';

    populateSubjectOptions();
    if (modalOverlay) modalOverlay.classList.add('is-active');
    if (inputTitle) setTimeout(() => inputTitle.focus(), 50);
  }

  function openEditModal(id) {
    const item = assignments.find(a => a.id === id);
    if (!item) return;

    editingAssignmentId = id;
    if (modalTitle) modalTitle.textContent = 'Edit Assignment';

    if (inputTitle) inputTitle.value = item.title || '';
    if (inputSubject) inputSubject.value = item.subject || '';
    if (inputDueDate) inputDueDate.value = item.dueDate || '';
    if (inputPriority) inputPriority.value = item.priority || 'Medium';
    if (inputStatus) inputStatus.value = item.status || 'Not Started';
    if (inputDesc) inputDesc.value = item.description || '';

    populateSubjectOptions();
    if (modalOverlay) modalOverlay.classList.add('is-active');
    if (inputTitle) setTimeout(() => inputTitle.focus(), 50);
  }

  function closeFormModal() {
    if (modalOverlay) modalOverlay.classList.remove('is-active');
    editingAssignmentId = null;
  }

  function saveAssignmentForm() {
    const titleVal = inputTitle ? inputTitle.value.trim() : '';
    const dueDateVal = inputDueDate ? inputDueDate.value.trim() : '';

    if (!titleVal) {
      if (inputTitle) {
        inputTitle.focus();
        inputTitle.style.borderColor = '#c92a2a';
        setTimeout(() => {
          if (inputTitle) inputTitle.style.borderColor = '';
        }, 1500);
      }
      return;
    }

    if (!dueDateVal) {
      if (inputDueDate) {
        inputDueDate.focus();
        inputDueDate.style.borderColor = '#c92a2a';
        setTimeout(() => {
          if (inputDueDate) inputDueDate.style.borderColor = '';
        }, 1500);
      }
      return;
    }

    const subjectVal = inputSubject ? inputSubject.value.trim() : '';
    const priorityVal = inputPriority ? inputPriority.value : 'Medium';
    const statusVal = inputStatus ? inputStatus.value : 'Not Started';
    const descVal = inputDesc ? inputDesc.value.trim() : '';

    if (editingAssignmentId) {
      // Update existing
      const item = assignments.find(a => a.id === editingAssignmentId);
      if (item) {
        item.title = titleVal;
        item.subject = subjectVal;
        item.dueDate = dueDateVal;
        item.priority = priorityVal;
        item.status = statusVal;
        item.description = descVal;
        item.updatedAt = Date.now();
      }
    } else {
      // Create new
      const newAssign = {
        id: 'assign_' + Date.now(),
        title: titleVal,
        subject: subjectVal,
        dueDate: dueDateVal,
        priority: priorityVal,
        status: statusVal,
        description: descVal,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      assignments.unshift(newAssign);
    }

    saveData();
    closeFormModal();
    populateSubjectOptions();
    render();

    // If detail modal is open for this assignment, refresh it
    if (viewingAssignmentId && viewingAssignmentId === editingAssignmentId) {
      openDetailModal(viewingAssignmentId);
    }
  }

  function toggleAssignmentStatus(id) {
    const item = assignments.find(a => a.id === id);
    if (!item) return;

    if (item.status === 'Completed') {
      item.status = 'In Progress';
    } else {
      item.status = 'Completed';
    }
    item.updatedAt = Date.now();

    saveData();
    render();

    if (viewingAssignmentId === id) {
      openDetailModal(id);
    }
  }

  function deleteAssignment(id) {
    assignments = assignments.filter(a => a.id !== id);
    saveData();
    if (viewingAssignmentId === id) {
      closeDetailModal();
    }
    populateSubjectOptions();
    render();
  }

  // --- Detail Modal ---
  function openDetailModal(id) {
    const item = assignments.find(a => a.id === id);
    if (!item) return;

    viewingAssignmentId = id;
    const isCompleted = item.status === 'Completed';
    const statusInfo = getDueStatus(item.dueDate, item.status);

    if (detailTitle) detailTitle.textContent = item.title;

    if (detailBadges) {
      detailBadges.innerHTML = `
        <span class="assignment-badge badge-priority-${(item.priority || '').toLowerCase()}">${item.priority || 'Medium'}</span>
        <span class="assignment-badge ${isCompleted ? 'badge-status-completed' : 'badge-status'}">${item.status}</span>
        ${item.subject ? `<span class="assignment-badge badge-subject">${item.subject}</span>` : ''}
      `;
    }

    if (detailDesc) {
      detailDesc.textContent = item.description || 'No description provided for this academic assignment.';
    }

    if (detailMeta) {
      detailMeta.innerHTML = `
        <div style="display: flex; justify-content: space-between; padding-bottom: 0.35rem; border-bottom: 1px dashed rgba(23, 23, 23, 0.1);">
          <span style="color: var(--color-text-subtle);">Deadline:</span>
          <span class="${statusInfo.indicatorClass || ''}" style="font-weight: 600;">${statusInfo.label}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding-top: 0.35rem;">
          <span style="color: var(--color-text-subtle);">Subject Universe:</span>
          <span style="font-weight: 500;">${item.subject || 'General Studies'}</span>
        </div>
      `;
    }

    if (detailToggleBtn) {
      detailToggleBtn.textContent = isCompleted ? 'Mark as In Progress' : 'Mark Completed';
    }

    if (detailOverlay) detailOverlay.classList.add('is-active');
  }

  function closeDetailModal() {
    if (detailOverlay) detailOverlay.classList.remove('is-active');
    viewingAssignmentId = null;
  }

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public API
  return {
    init,
    show,
    render,
    getAssignments: () => assignments,
    createAssignment: (data) => {
      const newAssign = Object.assign({
        id: 'assign_' + Date.now(),
        title: 'Untitled Assignment',
        subject: '',
        dueDate: formatDateISO(new Date()),
        priority: 'Medium',
        status: 'Not Started',
        description: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }, data);
      assignments.unshift(newAssign);
      saveData();
      render();
      return newAssign;
    },
    editAssignment: (id, updates) => {
      const item = assignments.find(a => a.id === id);
      if (item) {
        Object.assign(item, updates, { updatedAt: Date.now() });
        saveData();
        render();
        return item;
      }
      return null;
    },
    deleteAssignment,
    toggleAssignmentStatus,
    openCreateModal,
    openEditModal,
    openDetailModal,
    closeFormModal,
    closeDetailModal
  };
})();
