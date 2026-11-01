/**
 * ADIVERSE - LEARNING PROGRESS & ANALYTICS MODULE
 * Real-time active learning metrics, subject mastery progress bars,
 * topic lifecycle status tracking (Not Started, Learning, Completed),
 * and chronological activity timeline derived from genuine scholar data.
 */

'use strict';

window.AdiverseProgress = (function () {
  const STATUS_STORAGE_KEY = 'adiverse_topic_status';
  const COMPLETED_LOG_KEY = 'adiverse_completed_topics';

  let topicStatusMap = {};
  let completedTopicsLog = [];

  // DOM Elements
  let progressView = null;
  let progressEmpty = null;
  let progressContent = null;

  let gaugePercentText = null;
  let gaugeCircle = null;
  let countSubjectsPill = null;
  let countTopicsPill = null;
  let countNotesPill = null;
  let countAssignPill = null;
  let countFlashcardsPill = null;

  let statCompletedCount = null;
  let statLearningCount = null;
  let statNotStartedCount = null;

  let subjectsProgressList = null;
  let topicStatusBoard = null;
  let activityFeedList = null;

  function loadState() {
    try {
      const rawStatus = localStorage.getItem(STATUS_STORAGE_KEY);
      topicStatusMap = rawStatus ? JSON.parse(rawStatus) : {};
    } catch (e) {
      topicStatusMap = {};
    }

    try {
      const rawLog = localStorage.getItem(COMPLETED_LOG_KEY);
      completedTopicsLog = rawLog ? JSON.parse(rawLog) : [];
    } catch (e) {
      completedTopicsLog = [];
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(topicStatusMap));
      localStorage.setItem(COMPLETED_LOG_KEY, JSON.stringify(completedTopicsLog));
    } catch (e) {
      console.error('Failed to save progress analytics:', e);
    }
  }

  function init() {
    progressView = document.getElementById('progress-workspace-view');
    progressEmpty = document.getElementById('progress-empty');
    progressContent = document.getElementById('progress-main-content');

    gaugePercentText = document.getElementById('prog-gauge-percent');
    gaugeCircle = document.getElementById('prog-gauge-circle');
    countSubjectsPill = document.getElementById('prog-pill-subjects');
    countTopicsPill = document.getElementById('prog-pill-topics');
    countNotesPill = document.getElementById('prog-pill-notes');
    countAssignPill = document.getElementById('prog-pill-assignments');
    countFlashcardsPill = document.getElementById('prog-pill-flashcards');

    statCompletedCount = document.getElementById('prog-stat-completed');
    statLearningCount = document.getElementById('prog-stat-learning');
    statNotStartedCount = document.getElementById('prog-stat-notstarted');

    subjectsProgressList = document.getElementById('subjects-progress-list');
    topicStatusBoard = document.getElementById('topics-status-board');
    activityFeedList = document.getElementById('activity-feed-list');

    loadState();

    // Sidebar navigation binding
    const navProgress = document.getElementById('nav-progress');
    if (navProgress) {
      navProgress.addEventListener('click', () => {
        show();
      });
    }

    render();

    if (window.location.hash === '#progress') {
      show();
    }

    window.addEventListener('hashchange', () => {
      if (window.location.hash === '#progress') {
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

    if (progressView) {
      progressView.style.display = 'flex';
      progressView.scrollTop = 0;
    }

    if (eyebrow) eyebrow.textContent = 'Scholar Trajectory';
    if (title) title.textContent = 'Learning Progress & Analytics';

    navItems.forEach(item => item.classList.remove('active'));
    const navBtn = document.getElementById('nav-progress');
    if (navBtn) navBtn.classList.add('active');

    render();
  }

  function getKnowledgeTreeNodes() {
    if (window.AdiverseWorkspace && typeof window.AdiverseWorkspace.getNodes === 'function') {
      const live = window.AdiverseWorkspace.getNodes();
      if (live && live.length > 0) return live;
    }

    try {
      const raw = localStorage.getItem('adiverse_tree_nodes');
      if (raw) return JSON.parse(raw);
    } catch (e) {}

    return [];
  }

  function getEffectiveTopicStatus(node) {
    if (topicStatusMap[node.id]) {
      return topicStatusMap[node.id];
    }

    // Derive initial truthful status from actual learner artifacts
    const noteContent = localStorage.getItem(`adiverse_notes_data_${node.id}`);
    if (noteContent && noteContent.trim().length > 30) {
      return 'Learning';
    }

    return 'Not Started';
  }

  function setTopicStatus(nodeId, newStatus) {
    const nodes = getKnowledgeTreeNodes();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const oldStatus = topicStatusMap[nodeId] || getEffectiveTopicStatus(node);
    topicStatusMap[nodeId] = newStatus;

    if (newStatus === 'Completed' && oldStatus !== 'Completed') {
      completedTopicsLog.unshift({
        id: nodeId,
        title: node.title,
        completedAt: Date.now()
      });
      completedTopicsLog = completedTopicsLog.slice(0, 20);
    }

    saveState();
    render();
  }

  function render() {
    const nodes = getKnowledgeTreeNodes();
    const nonRootTopics = nodes.filter(n => !n.isRoot && n.id !== 'root');

    if (nonRootTopics.length === 0) {
      if (progressContent) progressContent.style.display = 'none';
      if (progressEmpty) progressEmpty.style.display = 'flex';
      return;
    }

    if (progressContent) progressContent.style.display = 'flex';
    if (progressEmpty) progressEmpty.style.display = 'none';

    // 1. Gather Analytics & Counts
    let completedCount = 0;
    let learningCount = 0;
    let notStartedCount = 0;

    nonRootTopics.forEach(node => {
      const st = getEffectiveTopicStatus(node);
      if (st === 'Completed') completedCount++;
      else if (st === 'Learning') learningCount++;
      else notStartedCount++;
    });

    const totalTopics = nonRootTopics.length;
    const completionPct = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;

    // Subjects: Direct children of root, or unique branches
    const directChildrenOfRoot = nodes.filter(n => n.parentId === 'root');
    const totalSubjects = Math.max(1, directChildrenOfRoot.length);

    // Notes Count
    let totalNotes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('adiverse_notes_data_')) totalNotes++;
    }

    // Assignments & Flashcards Count
    let totalAssignments = 0;
    try {
      const rawAssign = localStorage.getItem('adiverse_assignments_data');
      if (rawAssign) totalAssignments = JSON.parse(rawAssign).length;
    } catch (e) {}

    let totalFlashcards = 0;
    try {
      const rawFc = localStorage.getItem('adiverse_flashcards_data');
      if (rawFc) totalFlashcards = JSON.parse(rawFc).length;
    } catch (e) {}

    // Update Header Metric Pills & Gauge
    if (gaugePercentText) gaugePercentText.textContent = `${completionPct}%`;
    if (gaugeCircle) gaugeCircle.style.setProperty('--gauge-percent', `${completionPct}%`);

    if (countSubjectsPill) countSubjectsPill.textContent = `${totalSubjects} Subject${totalSubjects === 1 ? '' : 's'}`;
    if (countTopicsPill) countTopicsPill.textContent = `${totalTopics} Topic${totalTopics === 1 ? '' : 's'}`;
    if (countNotesPill) countNotesPill.textContent = `${totalNotes} Note${totalNotes === 1 ? '' : 's'}`;
    if (countAssignPill) countAssignPill.textContent = `${totalAssignments} Assignment${totalAssignments === 1 ? '' : 's'}`;
    if (countFlashcardsPill) countFlashcardsPill.textContent = `${totalFlashcards} Flashcard${totalFlashcards === 1 ? '' : 's'}`;

    // Breakdown Cards
    if (statCompletedCount) statCompletedCount.textContent = completedCount;
    if (statLearningCount) statLearningCount.textContent = learningCount;
    if (statNotStartedCount) statNotStartedCount.textContent = notStartedCount;

    // 2. Render Subject-Wise Progress Bars
    renderSubjectProgress(nodes, directChildrenOfRoot);

    // 3. Render Topic Status Manager Board
    renderTopicStatusBoard(nonRootTopics);

    // 4. Render Learning Activity Feed
    renderActivityFeed();
  }

  function renderSubjectProgress(allNodes, subjectRoots) {
    if (!subjectsProgressList) return;
    subjectsProgressList.innerHTML = '';

    // If no direct root children, group all under General Studies
    const subjects = subjectRoots.length > 0 ? subjectRoots : [{ id: 'general', title: 'General Studies' }];

    subjects.forEach(sub => {
      // Find all topics in this subject's branch
      const branchNodes = [];
      function collectDescendants(parentId) {
        allNodes.filter(n => n.parentId === parentId).forEach(child => {
          branchNodes.push(child);
          collectDescendants(child.id);
        });
      }
      collectDescendants(sub.id);

      // If branchNodes is empty (the subject itself is a leaf), include the subject
      const targetNodes = branchNodes.length > 0 ? branchNodes : [sub];

      let subCompleted = 0;
      targetNodes.forEach(n => {
        if (getEffectiveTopicStatus(n) === 'Completed') subCompleted++;
      });

      const subTotal = targetNodes.length;
      const subPct = subTotal > 0 ? Math.round((subCompleted / subTotal) * 100) : 0;

      const card = document.createElement('div');
      card.className = 'subject-progress-card';
      card.innerHTML = `
        <div class="sub-prog-header">
          <h4 class="sub-prog-title">${sub.title}</h4>
          <span class="sub-prog-pct">${subPct}%</span>
        </div>
        <div class="sub-prog-bar-track">
          <div class="sub-prog-bar-fill" style="width: ${subPct}%;"></div>
        </div>
        <div class="sub-prog-stats">
          <span>${subCompleted} of ${subTotal} Topics Mastered</span>
          <span>${subTotal - subCompleted} Remaining</span>
        </div>
      `;
      subjectsProgressList.appendChild(card);
    });
  }

  function renderTopicStatusBoard(topics) {
    if (!topicStatusBoard) return;
    topicStatusBoard.innerHTML = '';

    topics.forEach(node => {
      const currentStatus = getEffectiveTopicStatus(node);
      const row = document.createElement('div');
      row.className = 'topic-status-row';

      const statusSelectClass = `topic-status-select--${currentStatus.toLowerCase().replace(/\s+/g, '')}`;

      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.8rem; min-width: 0;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: ${currentStatus === 'Completed' ? '#2b8a3e' : currentStatus === 'Learning' ? '#d9480f' : 'rgba(23, 23, 23, 0.25)'}; flex-shrink: 0;"></div>
          <span style="font-family: var(--font-display); font-size: 1.05rem; font-weight: 600; color: var(--color-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${node.title}
          </span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <select class="topic-status-select ${statusSelectClass}" data-node-id="${node.id}" aria-label="Update status for ${node.title}">
            <option value="Not Started" ${currentStatus === 'Not Started' ? 'selected' : ''}>Not Started</option>
            <option value="Learning" ${currentStatus === 'Learning' ? 'selected' : ''}>Learning</option>
            <option value="Completed" ${currentStatus === 'Completed' ? 'selected' : ''}>Completed</option>
          </select>
        </div>
      `;

      const select = row.querySelector('.topic-status-select');
      select.addEventListener('change', (e) => {
        setTopicStatus(node.id, e.target.value);
      });

      topicStatusBoard.appendChild(row);
    });
  }

  function renderActivityFeed() {
    if (!activityFeedList) return;
    activityFeedList.innerHTML = '';

    const events = [];

    // 1. Completed topics from log
    completedTopicsLog.forEach(c => {
      events.push({
        type: 'completion',
        text: `Completed topic <strong>${c.title}</strong>`,
        timestamp: c.completedAt
      });
    });

    // 2. Recent Note Edits
    try {
      const rawEdits = localStorage.getItem('adiverse_recent_edited');
      if (rawEdits) {
        const edits = JSON.parse(rawEdits);
        edits.forEach(e => {
          events.push({
            type: 'note_edit',
            text: `Drafted research notes for <strong>${e.title}</strong>`,
            timestamp: e.editedAt
          });
        });
      }
    } catch (err) {}

    // 3. Recent Note Opened
    try {
      const rawOpened = localStorage.getItem('adiverse_recent_opened');
      if (rawOpened) {
        const opened = JSON.parse(rawOpened);
        opened.slice(0, 5).forEach(o => {
          events.push({
            type: 'study',
            text: `Studied concept notes on <strong>${o.title}</strong>`,
            timestamp: o.openedAt
          });
        });
      }
    } catch (err) {}

    // Sort by timestamp descending
    events.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    if (events.length === 0) {
      activityFeedList.innerHTML = '<p style="color: var(--color-text-subtle); font-size: 0.85rem; padding: 0.8rem 0;">No learning activity recorded yet. Start studying topics or taking notes to build your academic trail.</p>';
      return;
    }

    events.slice(0, 8).forEach(ev => {
      const item = document.createElement('div');
      item.className = 'activity-feed-item';

      let icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
      if (ev.type === 'completion') {
        icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2b8a3e" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      } else if (ev.type === 'note_edit') {
        icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--color-purple)" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
      }

      item.innerHTML = `
        <div class="activity-feed-icon">${icon}</div>
        <p class="activity-feed-text">${ev.text}</p>
        <span class="activity-feed-time">${formatTimeAgo(ev.timestamp)}</span>
      `;
      activityFeedList.appendChild(item);
    });
  }

  function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Just now';
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    init,
    show,
    render,
    setTopicStatus,
    getTopicStatus: (nodeId) => topicStatusMap[nodeId] || 'Not Started'
  };
})();
