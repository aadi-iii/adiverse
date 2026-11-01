/**
 * ADIVERSE - GLOBAL SEARCH ENGINE
 * Instant search across Knowledge Tree topics and rich-text note content with
 * snippet extraction, match highlighting, Ctrl+K shortcut, and keyboard navigation.
 */

'use strict';

window.AdiverseSearch = (function () {
  // --- DOM Elements ---
  let searchContainer = null;
  let searchInput = null;
  let searchClearBtn = null;
  let searchKbd = null;
  let dropdown = null;
  let resultsList = null;
  let emptyState = null;
  let emptyTitle = null;
  let resultsCount = null;

  // State
  let currentResults = [];
  let focusedResultIndex = -1;

  // Fallback default nodes if workspace not ready
  const FALLBACK_NODES = [
    { id: 'root', title: 'My Knowledge' },
    { id: 'n1',   title: 'Data Structures' },
    { id: 'n2',   title: 'Algorithms' },
    { id: 'n3',   title: 'Computer Systems' },
    { id: 'n4',   title: 'Mathematics' }
  ];

  function init() {
    searchContainer = document.getElementById('workspace-search-container');
    searchInput = document.getElementById('workspace-search-input');
    searchClearBtn = document.getElementById('search-clear-btn');
    searchKbd = document.getElementById('search-shortcut-kbd');
    dropdown = document.getElementById('workspace-search-results');
    resultsList = document.getElementById('search-results-list');
    emptyState = document.getElementById('search-empty-state');
    emptyTitle = document.getElementById('search-empty-title');
    resultsCount = document.getElementById('search-results-count');

    if (!searchInput || !dropdown) return;

    // Platform detection for shortcut badge
    if (searchKbd) {
      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      searchKbd.textContent = isMac ? '⌘K' : 'Ctrl K';
    }

    // Input events
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim();
      if (searchClearBtn) {
        searchClearBtn.style.display = searchInput.value.length > 0 ? 'flex' : 'none';
      }

      if (query.length === 0) {
        closeDropdown();
      } else {
        performSearch(query);
      }
    });

    // Reopen dropdown on focus if input has text
    searchInput.addEventListener('focus', () => {
      const query = searchInput.value.trim();
      if (query.length > 0) {
        performSearch(query);
      }
    });

    // Clear Button
    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchClearBtn.style.display = 'none';
        closeDropdown();
        searchInput.focus();
      });
    }

    // Global Keyboard Shortcut: Ctrl+K / Cmd+K
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
        const query = searchInput.value.trim();
        if (query.length > 0) {
          performSearch(query);
        }
      }
    });

    // Keyboard navigation within search input & dropdown
    searchInput.addEventListener('keydown', handleKeyNavigation);

    // Click outside to dismiss dropdown
    document.addEventListener('click', (e) => {
      if (searchContainer && !searchContainer.contains(e.target)) {
        closeDropdown();
      }
    });
  }

  // --- Keyboard Navigation (Arrow Keys, Enter, Escape) ---
  function handleKeyNavigation(e) {
    if (!dropdown || dropdown.style.display === 'none') return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeDropdown();
      searchInput.blur();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      navigateResults(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      navigateResults(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectResult();
    }
  }

  function navigateResults(direction) {
    if (!resultsList || currentResults.length === 0) return;

    const items = resultsList.querySelectorAll('.search-result-item');
    if (items.length === 0) return;

    items.forEach(item => item.classList.remove('is-focused'));

    focusedResultIndex += direction;
    if (focusedResultIndex >= items.length) focusedResultIndex = 0;
    if (focusedResultIndex < 0) focusedResultIndex = items.length - 1;

    const focusedItem = items[focusedResultIndex];
    if (focusedItem) {
      focusedItem.classList.add('is-focused');
      focusedItem.scrollIntoView({ block: 'nearest' });
    }
  }

  function selectResult() {
    if (currentResults.length === 0) return;

    const targetIndex = focusedResultIndex >= 0 ? focusedResultIndex : 0;
    const match = currentResults[targetIndex];
    if (match) {
      openTopicFromSearch(match.id, match.title);
    }
  }

  // --- Core Search Execution ---
  function performSearch(query) {
    focusedResultIndex = -1;
    const topics = getAllTopics();
    const queryLower = query.toLowerCase();
    const results = [];

    topics.forEach(topic => {
      // 1. Title match
      const title = topic.title || '';
      const titleLower = title.toLowerCase();
      const titleMatches = titleLower.includes(queryLower);

      // 2. Note content match
      const noteHtml = getTopicNoteContent(topic.id);
      const plainNote = extractPlainText(noteHtml);
      const noteLower = plainNote.toLowerCase();
      const noteMatchIndex = noteLower.indexOf(queryLower);
      const noteMatches = noteMatchIndex !== -1;

      if (titleMatches || noteMatches) {
        // Calculate relevance
        let score = 0;
        if (titleLower === queryLower) score += 120;
        else if (titleLower.startsWith(queryLower)) score += 90;
        else if (titleMatches) score += 60;

        if (noteMatches) {
          score += 40;
          // Add small weight for frequency of term
          const occurrences = noteLower.split(queryLower).length - 1;
          score += Math.min(occurrences * 5, 25);
        }

        // Generate highlighted title
        const highlightedTitle = highlightMatch(title, query);

        // Generate context-aware preview snippet
        let snippet = '';
        if (noteMatches) {
          snippet = generateSnippet(plainNote, noteMatchIndex, query);
        } else if (plainNote.length > 0) {
          snippet = escapeHtml(plainNote.substring(0, 110)) + (plainNote.length > 110 ? '...' : '');
        } else {
          snippet = 'Topic in Knowledge Tree &bull; Click to open notes';
        }

        results.push({
          id: topic.id,
          title: title,
          highlightedTitle: highlightedTitle,
          snippet: snippet,
          titleMatches: titleMatches,
          noteMatches: noteMatches,
          score: score
        });
      }
    });

    // Sort by relevance score descending
    results.sort((a, b) => b.score - a.score);
    currentResults = results;

    renderResults(results, query);
  }

  function renderResults(results, query) {
    if (!dropdown || !resultsList || !emptyState) return;

    dropdown.style.display = 'block';

    if (results.length === 0) {
      resultsList.style.display = 'none';
      emptyState.style.display = 'flex';
      if (resultsCount) resultsCount.textContent = '0 Results';
      if (emptyTitle) {
        emptyTitle.innerHTML = `No matching topics or notes for "<strong>${escapeHtml(query)}</strong>"`;
      }
      return;
    }

    emptyState.style.display = 'none';
    resultsList.style.display = 'block';
    if (resultsCount) {
      resultsCount.textContent = `${results.length} ${results.length === 1 ? 'Topic Result' : 'Topic Results'}`;
    }

    resultsList.innerHTML = '';
    results.forEach((res, idx) => {
      const itemEl = document.createElement('div');
      itemEl.className = `search-result-item ${idx === 0 ? 'is-focused' : ''}`;
      itemEl.setAttribute('role', 'option');
      itemEl.setAttribute('data-id', res.id);
      itemEl.setAttribute('data-title', res.title);

      let badgeHtml = '';
      if (res.titleMatches && res.noteMatches) {
        badgeHtml = '<span class="search-match-badge search-badge-both">Title &amp; Note Match</span>';
      } else if (res.titleMatches) {
        badgeHtml = '<span class="search-match-badge search-badge-title">Topic Concept</span>';
      } else {
        badgeHtml = '<span class="search-match-badge search-badge-note">Saved Note Match</span>';
      }

      itemEl.innerHTML = `
        <div class="search-result-top">
          <div class="search-result-title">
            <span class="search-result-dot" aria-hidden="true"></span>
            <span>${res.highlightedTitle}</span>
          </div>
          ${badgeHtml}
        </div>
        <p class="search-result-snippet">${res.snippet}</p>
      `;

      itemEl.addEventListener('click', () => {
        openTopicFromSearch(res.id, res.title);
      });

      resultsList.appendChild(itemEl);
    });

    focusedResultIndex = 0;
  }

  function openTopicFromSearch(nodeId, nodeTitle) {
    closeDropdown();

    if (window.AdiverseNotes && typeof window.AdiverseNotes.openTopic === 'function') {
      window.AdiverseNotes.openTopic(nodeId, nodeTitle);
    }

    // Also update selected node in tree if available
    if (window.AdiverseWorkspace && typeof window.AdiverseWorkspace.selectNode === 'function') {
      window.AdiverseWorkspace.selectNode(nodeId);
    }
  }

  function closeDropdown() {
    if (dropdown) dropdown.style.display = 'none';
    currentResults = [];
    focusedResultIndex = -1;
  }

  // --- Data Extraction & Helpers ---
  function getAllTopics() {
    // 1. Try window.AdiverseWorkspace
    if (window.AdiverseWorkspace && typeof window.AdiverseWorkspace.getNodes === 'function') {
      const nodes = window.AdiverseWorkspace.getNodes();
      if (Array.isArray(nodes) && nodes.length > 0) {
        return mergeWithSavedStorageNodes(nodes);
      }
    }

    // 2. Try localStorage tree nodes
    try {
      const raw = localStorage.getItem('adiverse_tree_nodes');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return mergeWithSavedStorageNodes(parsed);
        }
      }
    } catch (e) {}

    // 3. Fallback default nodes
    return mergeWithSavedStorageNodes(FALLBACK_NODES);
  }

  // Ensure any topic notes created in localStorage are indexed even if detached
  function mergeWithSavedStorageNodes(baseNodes) {
    const list = [...baseNodes];
    const knownIds = new Set(list.map(n => n.id));

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('adiverse_notes_data_')) {
          const id = key.replace('adiverse_notes_data_', '');
          if (!knownIds.has(id)) {
            list.push({ id: id, title: `Topic (${id})` });
            knownIds.add(id);
          }
        }
      }
    } catch (e) {}

    return list;
  }

  function getTopicNoteContent(nodeId) {
    // If currently open and being edited in the active editorBody, get live text
    if (window.AdiverseNotes && typeof window.AdiverseNotes.getActiveNodeId === 'function') {
      if (window.AdiverseNotes.getActiveNodeId() === nodeId) {
        const editor = document.getElementById('notes-editor-body');
        if (editor) return editor.innerHTML;
      }
    }

    try {
      return localStorage.getItem(`adiverse_notes_data_${nodeId}`) || '';
    } catch (e) {
      return '';
    }
  }

  function extractPlainText(html) {
    if (!html) return '';
    // Replace block-level tags with space to avoid smashed words
    const cleaned = html
      .replace(/<\/?(div|p|h[1-6]|li|blockquote|br|hr)[^>]*>/gi, ' ')
      .replace(/<[^>]+>/g, '');

    // Normalize spacing and entities
    const tmp = document.createElement('div');
    tmp.innerHTML = cleaned;
    return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function generateSnippet(fullText, matchIndex, query) {
    const queryLen = query.length;
    const padBefore = 45;
    const padAfter = 70;

    let start = Math.max(0, matchIndex - padBefore);
    let end = Math.min(fullText.length, matchIndex + queryLen + padAfter);

    // Adjust to nearest word boundary
    if (start > 0) {
      const spaceBefore = fullText.indexOf(' ', start);
      if (spaceBefore !== -1 && spaceBefore < matchIndex) {
        start = spaceBefore + 1;
      }
    }
    if (end < fullText.length) {
      const spaceAfter = fullText.lastIndexOf(' ', end);
      if (spaceAfter !== -1 && spaceAfter > matchIndex + queryLen) {
        end = spaceAfter;
      }
    }

    let snippet = fullText.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < fullText.length) snippet = snippet + '...';

    return highlightMatch(snippet, query);
  }

  function highlightMatch(text, query) {
    if (!text || !query) return escapeHtml(text || '');
    const escapedQuery = escapeRegExp(query);
    const regex = new RegExp(`(${escapedQuery})`, 'gi');

    // Escape HTML first, then match
    const escapedText = escapeHtml(text);
    return escapedText.replace(regex, '<mark class="search-highlight">$1</mark>');
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

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  return {
    init,
    performSearch,
    closeDropdown
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  window.AdiverseSearch.init();
});
