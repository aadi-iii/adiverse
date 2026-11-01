/**
 * ADIVERSE - LEARNING DASHBOARD MODULE
 * Overview metrics, Continue Learning (recently opened topics),
 * Recently Edited notes, and direct notes editor deep linking.
 */

'use strict';

window.AdiverseDashboard = (function () {
  let dashboardView = null;
  let metricTotalTopics = null;
  let metricTotalNotes = null;
  let continueLearningList = null;
  let continueLearningEmpty = null;
  let recentlyEditedList = null;
  let recentlyEditedEmpty = null;
  let globalEmpty = null;
  let metricsGrid = null;
  let sectionsGrid = null;

  function init() {
    dashboardView = document.getElementById('dashboard-workspace-view');
    metricTotalTopics = document.getElementById('metric-total-topics');
    metricTotalNotes = document.getElementById('metric-total-notes');
    continueLearningList = document.getElementById('continue-learning-list');
    continueLearningEmpty = document.getElementById('continue-learning-empty');
    recentlyEditedList = document.getElementById('recently-edited-list');
    recentlyEditedEmpty = document.getElementById('recently-edited-empty');
    globalEmpty = document.getElementById('dashboard-global-empty');
    metricsGrid = document.querySelector('.dashboard-metrics-grid');
    sectionsGrid = document.querySelector('.dashboard-sections-grid');

    const btnGoToTree = document.getElementById('dashboard-go-to-tree');
    const btnStartTree = document.getElementById('btn-empty-start-tree');

    if (btnGoToTree) {
      btnGoToTree.addEventListener('click', () => {
        showView('tree');
      });
    }

    if (btnStartTree) {
      btnStartTree.addEventListener('click', () => {
        showView('tree');
      });
    }

    // Sidebar navigation bindings
    const navDashboard = document.getElementById('nav-dashboard');
    const navTree = document.getElementById('nav-knowledge-tree');

    if (navDashboard) {
      navDashboard.addEventListener('click', () => {
        showView('dashboard');
      });
    }

    if (navTree) {
      navTree.addEventListener('click', () => {
        showView('tree');
      });
    }

    render();
  }

  function showView(viewName) {
    const stage = document.getElementById('workspace-stage');
    const notesView = document.getElementById('notes-workspace-view');
    const navItems = document.querySelectorAll('.workspace-nav-item');
    const eyebrow = document.getElementById('workspace-view-eyebrow');
    const title = document.getElementById('workspace-view-title');

    // Close any active mobile sidebar
    const sidebar = document.getElementById('workspace-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-open');

    if (viewName === 'dashboard') {
      if (notesView) {
        if (window.AdiverseNotes && typeof window.AdiverseNotes.saveCurrentNote === 'function') {
          window.AdiverseNotes.saveCurrentNote(true);
        }
        notesView.style.display = 'none';
        notesView.classList.remove('is-active');
      }
      if (stage) stage.style.display = 'none';
      if (dashboardView) dashboardView.style.display = 'block';

      if (eyebrow) eyebrow.textContent = 'Cosmos Overview';
      if (title) title.textContent = 'Learning Dashboard';

      navItems.forEach(item => item.classList.remove('active'));
      const navDash = document.getElementById('nav-dashboard');
      if (navDash) navDash.classList.add('active');

      render();
    } else if (viewName === 'tree') {
      if (notesView) {
        if (window.AdiverseNotes && typeof window.AdiverseNotes.saveCurrentNote === 'function') {
          window.AdiverseNotes.saveCurrentNote(true);
        }
        notesView.style.display = 'none';
        notesView.classList.remove('is-active');
      }
      if (dashboardView) dashboardView.style.display = 'none';
      if (stage) stage.style.display = 'flex';

      if (eyebrow) eyebrow.textContent = 'Academic Workspace';
      if (title) title.textContent = 'Knowledge Tree';

      navItems.forEach(item => item.classList.remove('active'));
      const navTreeBtn = document.getElementById('nav-knowledge-tree');
      if (navTreeBtn) navTreeBtn.classList.add('active');
    }
  }

  function getNodes() {
    if (window.AdiverseWorkspace && typeof window.AdiverseWorkspace.getNodes === 'function') {
      return window.AdiverseWorkspace.getNodes();
    }
    try {
      const stored = localStorage.getItem('adiverse_tree_nodes');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  }

  function render() {
    const nodes = getNodes();

    // 1. Total Topics
    const totalTopics = nodes.length;
    if (metricTotalTopics) metricTotalTopics.textContent = totalTopics;

    // 2. Total Notes
    let totalNotes = 0;
    nodes.forEach(n => {
      try {
        const raw = localStorage.getItem(`adiverse_notes_data_${n.id}`);
        if (raw && raw.trim().length > 0) totalNotes++;
      } catch (e) {}
    });
    if (metricTotalNotes) metricTotalNotes.textContent = totalNotes;

    // 3. Global Empty State check
    if (totalTopics === 0) {
      if (globalEmpty) globalEmpty.style.display = 'flex';
      if (metricsGrid) metricsGrid.style.display = 'none';
      if (sectionsGrid) sectionsGrid.style.display = 'none';
      return;
    } else {
      if (globalEmpty) globalEmpty.style.display = 'none';
      if (metricsGrid) metricsGrid.style.display = 'grid';
      if (sectionsGrid) sectionsGrid.style.display = 'grid';
    }

    // 4. Continue Learning (Recently Opened Topics)
    renderContinueLearning(nodes);

    // 5. Recently Edited Notes
    renderRecentlyEdited(nodes);
  }

  function renderContinueLearning(nodes) {
    if (!continueLearningList || !continueLearningEmpty) return;

    let recents = [];
    try {
      const raw = localStorage.getItem('adiverse_recent_opened');
      if (raw) recents = JSON.parse(raw);
    } catch (e) {}

    // Filter to topics that still exist in tree
    const nodeMap = new Map();
    nodes.forEach(n => nodeMap.set(n.id, n));

    recents = recents.filter(item => nodeMap.has(item.id));

    // Fallback: If no topics have been opened yet, present tree topics as starting topics
    if (recents.length === 0) {
      nodes.forEach(n => {
        if (!n.isRoot && recents.length < 5) {
          recents.push({
            id: n.id,
            title: n.title,
            openedAt: null
          });
        }
      });
    }

    if (recents.length === 0) {
      continueLearningList.innerHTML = '';
      continueLearningEmpty.style.display = 'block';
      return;
    }

    continueLearningEmpty.style.display = 'none';
    continueLearningList.innerHTML = '';

    recents.slice(0, 6).forEach(item => {
      const node = nodeMap.get(item.id);
      const parent = node && node.parentId ? nodeMap.get(node.parentId) : null;
      const hierarchy = parent ? `Under ${parent.title}` : 'Concept Topic';
      const timeLabel = item.openedAt ? formatRelativeTime(item.openedAt) : 'Ready to explore';

      const card = document.createElement('div');
      card.className = 'dashboard-item-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('data-id', item.id);

      card.innerHTML = `
        <div class="dashboard-item-top">
          <div class="dashboard-item-title">
            <span class="dashboard-item-dot" aria-hidden="true"></span>
            <span>${escapeHtml(item.title)}</span>
          </div>
          <span class="dashboard-item-badge">${escapeHtml(hierarchy)}</span>
        </div>
        <div class="dashboard-item-meta">
          <span>🕒 ${timeLabel}</span>
          <span>•</span>
          <span style="color: var(--color-purple); font-weight: var(--weight-bold);">Open Notes →</span>
        </div>
      `;

      card.addEventListener('click', () => {
        openTopicFromDashboard(item.id, item.title);
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') openTopicFromDashboard(item.id, item.title);
      });

      continueLearningList.appendChild(card);
    });
  }

  function renderRecentlyEdited(nodes) {
    if (!recentlyEditedList || !recentlyEditedEmpty) return;

    const nodeMap = new Map();
    nodes.forEach(n => nodeMap.set(n.id, n));

    let recentEdited = [];
    try {
      const raw = localStorage.getItem('adiverse_recent_edited');
      if (raw) recentEdited = JSON.parse(raw);
    } catch (e) {}

    // Filter to existing nodes
    recentEdited = recentEdited.filter(item => nodeMap.has(item.id));

    // Also include any topics that have notes in localStorage but aren't in recentEdited yet
    const knownIds = new Set(recentEdited.map(r => r.id));
    nodes.forEach(n => {
      if (!knownIds.has(n.id)) {
        try {
          const content = localStorage.getItem(`adiverse_notes_data_${n.id}`);
          if (content && content.trim().length > 0) {
            const plain = extractPlainText(content);
            if (plain.length > 0) {
              recentEdited.push({
                id: n.id,
                title: n.title,
                editedAt: null,
                snippet: plain.substring(0, 110)
              });
              knownIds.add(n.id);
            }
          }
        } catch (e) {}
      }
    });

    if (recentEdited.length === 0) {
      recentlyEditedList.innerHTML = '';
      recentlyEditedEmpty.style.display = 'block';
      return;
    }

    recentlyEditedEmpty.style.display = 'none';
    recentlyEditedList.innerHTML = '';

    recentEdited.slice(0, 6).forEach(item => {
      // Get fresh snippet if available
      let snippet = item.snippet;
      if (!snippet) {
        const rawNote = localStorage.getItem(`adiverse_notes_data_${item.id}`);
        snippet = rawNote ? extractPlainText(rawNote).substring(0, 110) : 'Study notes recorded.';
      }

      const wordCount = Math.max(1, Math.round(snippet.split(/\s+/).length * 1.5));
      const timeLabel = item.editedAt ? formatRelativeTime(item.editedAt) : 'Saved locally';

      const card = document.createElement('div');
      card.className = 'dashboard-item-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('data-id', item.id);

      card.innerHTML = `
        <div class="dashboard-item-top">
          <div class="dashboard-item-title">
            <span class="dashboard-item-dot" style="background: #171717;" aria-hidden="true"></span>
            <span>${escapeHtml(item.title)}</span>
          </div>
          <span class="dashboard-item-badge" style="background: rgba(255, 242, 26, 0.35); color: #7a6800; border-color: rgba(255, 242, 26, 0.6);">~${wordCount} words</span>
        </div>
        <p class="dashboard-item-snippet">${escapeHtml(snippet)}...</p>
        <div class="dashboard-item-meta">
          <span>✍️ ${timeLabel}</span>
          <span>•</span>
          <span style="color: var(--color-purple); font-weight: var(--weight-bold);">Edit Note →</span>
        </div>
      `;

      card.addEventListener('click', () => {
        openTopicFromDashboard(item.id, item.title);
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') openTopicFromDashboard(item.id, item.title);
      });

      recentlyEditedList.appendChild(card);
    });
  }

  function openTopicFromDashboard(nodeId, nodeTitle) {
    if (dashboardView) dashboardView.style.display = 'none';
    if (window.AdiverseNotes && typeof window.AdiverseNotes.openTopic === 'function') {
      window.AdiverseNotes.openTopic(nodeId, nodeTitle);
    }
    // Update nav active item
    const navItems = document.querySelectorAll('.workspace-nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    const navTreeBtn = document.getElementById('nav-knowledge-tree');
    if (navTreeBtn) navTreeBtn.classList.add('active');
  }

  function extractPlainText(html) {
    if (!html) return '';
    const cleaned = html
      .replace(/<\/?(div|p|h[1-6]|li|blockquote|br|hr)[^>]*>/gi, ' ')
      .replace(/<[^>]+>/g, '');
    const tmp = document.createElement('div');
    tmp.innerHTML = cleaned;
    return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function formatRelativeTime(ts) {
    if (!ts) return 'Recent';
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
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

  return {
    init,
    render,
    show: () => showView('dashboard'),
    hide: () => showView('tree')
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  window.AdiverseDashboard.init();
});
