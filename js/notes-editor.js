/**
 * ADIVERSE - TOPIC NOTES WORKSPACE & RICH TEXT EDITOR ENGINE
 * Independent notes, full rich-text toolbar, device image upload & resize,
 * per-topic personalization, and automatic localStorage persistence.
 */

'use strict';

window.AdiverseNotes = (function () {
  let activeNodeId = null;
  let activeNodeTitle = '';
  let saveTimeout = null;
  let activeImage = null;

  // DOM Elements
  const stage = document.getElementById('workspace-stage');
  const notesView = document.getElementById('notes-workspace-view');
  const backBtn = document.getElementById('btn-back-to-tree');
  const topicPill = document.getElementById('notes-topic-name');
  const documentTitle = document.getElementById('notes-doc-title');
  const editorBody = document.getElementById('notes-editor-body');
  const documentCard = document.getElementById('notes-document-card');
  const saveStatus = document.getElementById('notes-save-status');

  // Toolbar Elements
  const fontSelect = document.getElementById('tb-font-family');
  const sizeSelect = document.getElementById('tb-font-size');
  const headingSelect = document.getElementById('tb-heading');
  const textColorInput = document.getElementById('tb-text-color');
  const textColorIndicator = document.getElementById('tb-text-color-indicator');
  const highlightColorInput = document.getElementById('tb-highlight-color');
  const highlightIndicator = document.getElementById('tb-highlight-indicator');
  const imageUploadInput = document.getElementById('tb-image-upload-input');
  const imageUploadBtn = document.getElementById('tb-btn-image');
  const linkBtn = document.getElementById('tb-btn-link');
  const clearFormatBtn = document.getElementById('tb-btn-clear');
  const undoBtn = document.getElementById('tb-btn-undo');
  const redoBtn = document.getElementById('tb-btn-redo');

  // Image Action Bar
  const imageActionBar = document.getElementById('image-action-bar');
  const imgWidthBtns = document.querySelectorAll('[data-img-width]');
  const imgAlignBtns = document.querySelectorAll('[data-img-align]');
  const imgDeleteBtn = document.getElementById('img-btn-delete');

  // Theme & Background Swatches
  const themeSwatches = document.querySelectorAll('.theme-swatch');
  const customBgColorInput = document.getElementById('tb-bg-color-input');

  // Default theme settings
  const defaultTheme = {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '1rem',
    bgColor: '#FFFFFF',
    textColor: '#171717'
  };

  let currentTheme = Object.assign({}, defaultTheme);

  // --- 1. OPEN & CLOSE TOPIC NOTES ---
  function openTopic(nodeId, nodeTitle) {
    if (!nodeId) return;

    // Save previous note if switching directly from one topic to another
    if (activeNodeId && activeNodeId !== nodeId) {
      saveCurrentNote(true);
    }

    activeNodeId = nodeId;
    activeNodeTitle = nodeTitle || 'Topic Notes';

    // Switch Views
    if (stage) stage.style.display = 'none';
    const dashboardView = document.getElementById('dashboard-workspace-view');
    if (dashboardView) dashboardView.style.display = 'none';
    const assignmentsView = document.getElementById('assignments-workspace-view');
    if (assignmentsView) assignmentsView.style.display = 'none';
    const revisionView = document.getElementById('revision-workspace-view');
    if (revisionView) revisionView.style.display = 'none';
    const resourcesView = document.getElementById('resources-workspace-view');
    if (resourcesView) resourcesView.style.display = 'none';
    const progressView = document.getElementById('progress-workspace-view');
    if (progressView) progressView.style.display = 'none';
    const plannerView = document.getElementById('planner-workspace-view');
    if (plannerView) plannerView.style.display = 'none';
    if (notesView) {
      notesView.style.display = 'flex';
      notesView.classList.add('is-active');
    }

    // Record recently opened topic
    recordRecentlyOpened(nodeId, activeNodeTitle);
    if (window.AdiverseDashboard && typeof window.AdiverseDashboard.render === 'function') {
      window.AdiverseDashboard.render();
    }

    // Update Headings
    if (topicPill) topicPill.textContent = activeNodeTitle;
    if (documentTitle) documentTitle.textContent = activeNodeTitle;

    // Load saved content
    loadNoteContent(nodeId, activeNodeTitle);

    // Load saved personalization
    loadNoteTheme(nodeId);

    // Scroll to top of document canvas
    const canvas = document.querySelector('.notes-document-canvas');
    if (canvas) canvas.scrollTop = 0;
  }

  function closeTopic() {
    saveCurrentNote(true);

    if (notesView) {
      notesView.style.display = 'none';
      notesView.classList.remove('is-active');
    }
    if (stage) {
      stage.style.display = 'flex';
    }

    const navItems = document.querySelectorAll('.workspace-nav-item');
    navItems.forEach(i => i.classList.remove('active'));
    const treeNav = document.getElementById('nav-knowledge-tree');
    if (treeNav) treeNav.classList.add('active');

    const eyebrow = document.getElementById('workspace-view-eyebrow');
    const title = document.getElementById('workspace-view-title');
    if (eyebrow) eyebrow.textContent = 'Academic Workspace';
    if (title) title.textContent = 'Knowledge Tree';

    if (imageActionBar) imageActionBar.classList.remove('is-visible');
    activeImage = null;
    activeNodeId = null;
  }

  // --- 2. PERSISTENCE (localStorage) ---
  function getStorageKey(nodeId) {
    return `adiverse_notes_data_${nodeId}`;
  }

  function getThemeKey(nodeId) {
    return `adiverse_notes_theme_${nodeId}`;
  }

  function loadNoteContent(nodeId, title) {
    if (!editorBody) return;
    const raw = localStorage.getItem(getStorageKey(nodeId));

    if (raw && raw.trim().length > 0) {
      editorBody.innerHTML = raw;
    } else {
      // Clean initial starter template for this topic
      editorBody.innerHTML = `
        <p>Start recording your study insights, core definitions, and related formulas for <strong>${title}</strong> here.</p>
        <h2>Key Concepts</h2>
        <ul>
          <li>Concept definition and theoretical principles</li>
          <li>Real-world applications and exam notes</li>
        </ul>
      `;
    }
    attachImageListeners();
    updateSaveIndicator(true);
  }

  function loadNoteTheme(nodeId) {
    currentTheme = Object.assign({}, defaultTheme);
    try {
      const rawTheme = localStorage.getItem(getThemeKey(nodeId));
      if (rawTheme) currentTheme = Object.assign({}, defaultTheme, JSON.parse(rawTheme));
    } catch (e) {}

    applyThemeToDocument(currentTheme);
  }

  function applyThemeToDocument(theme) {
    if (!documentCard) return;
    documentCard.style.fontFamily = theme.fontFamily || defaultTheme.fontFamily;
    documentCard.style.fontSize = theme.fontSize || defaultTheme.fontSize;
    documentCard.style.backgroundColor = theme.bgColor || defaultTheme.bgColor;

    // Adjust text color if dark background
    if (theme.bgColor === '#171717') {
      documentCard.style.color = '#FFFCA8';
    } else {
      documentCard.style.color = theme.textColor || defaultTheme.textColor;
    }

    // Sync Toolbar selects
    if (fontSelect) fontSelect.value = theme.fontFamily;
    if (sizeSelect) sizeSelect.value = theme.fontSize;

    // Sync Theme Swatches
    themeSwatches.forEach(swatch => {
      const color = swatch.getAttribute('data-bg-color');
      swatch.classList.toggle('active', color === theme.bgColor);
    });
  }

  function saveCurrentNote(immediate = false) {
    if (!activeNodeId || !editorBody) return;

    if (!immediate) {
      updateSaveIndicator(false);
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        commitSave();
      }, 350);
    } else {
      clearTimeout(saveTimeout);
      commitSave();
    }
  }

  function recordRecentlyOpened(nodeId, title) {
    if (!nodeId) return;
    try {
      const raw = localStorage.getItem('adiverse_recent_opened');
      let recents = raw ? JSON.parse(raw) : [];
      recents = recents.filter(item => item.id !== nodeId);
      recents.unshift({
        id: nodeId,
        title: title || 'Topic Notes',
        openedAt: Date.now()
      });
      localStorage.setItem('adiverse_recent_opened', JSON.stringify(recents.slice(0, 10)));
    } catch (e) {}
  }

  function recordRecentlyEdited(nodeId, title, htmlContent) {
    if (!nodeId) return;
    try {
      const plain = (htmlContent || '')
        .replace(/<\/?(div|p|h[1-6]|li|blockquote|br|hr)[^>]*>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const raw = localStorage.getItem('adiverse_recent_edited');
      let recents = raw ? JSON.parse(raw) : [];
      recents = recents.filter(item => item.id !== nodeId);
      recents.unshift({
        id: nodeId,
        title: title || 'Topic Notes',
        editedAt: Date.now(),
        snippet: plain.substring(0, 110)
      });
      localStorage.setItem('adiverse_recent_edited', JSON.stringify(recents.slice(0, 10)));
    } catch (e) {}
  }

  function commitSave() {
    if (!activeNodeId || !editorBody) return;
    const content = editorBody.innerHTML;
    localStorage.setItem(getStorageKey(activeNodeId), content);

    // Save Theme Object
    localStorage.setItem(getThemeKey(activeNodeId), JSON.stringify(currentTheme));

    recordRecentlyEdited(activeNodeId, activeNodeTitle, content);

    updateSaveIndicator(true);

    if (window.AdiverseDashboard && typeof window.AdiverseDashboard.render === 'function') {
      window.AdiverseDashboard.render();
    }
  }

  function updateSaveIndicator(isSaved) {
    if (!saveStatus) return;
    if (isSaved) {
      saveStatus.textContent = 'Auto-saved';
      saveStatus.style.opacity = '0.85';
    } else {
      saveStatus.textContent = 'Saving...';
      saveStatus.style.opacity = '1';
    }
  }

  // --- 3. RICH TEXT FORMATTING EXECUTION ---
  function exec(command, value = null) {
    if (!editorBody) return;
    editorBody.focus();
    document.execCommand(command, false, value);
    saveCurrentNote();
  }

  // --- 4. IMAGE UPLOAD & RESIZING ---
  function handleImageUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      const base64 = event.target.result;
      insertImageAtCursor(base64);
      e.target.value = ''; // Reset input
    };
    reader.readAsDataURL(file);
  }

  function insertImageAtCursor(src) {
    editorBody.focus();
    const imgHtml = `<img src="${src}" alt="Topic Image" class="img-align-center" style="width: 70%;" />`;
    document.execCommand('insertHTML', false, imgHtml);
    attachImageListeners();
    saveCurrentNote();
  }

  function attachImageListeners() {
    if (!editorBody) return;
    const images = editorBody.querySelectorAll('img');
    images.forEach(img => {
      img.removeEventListener('click', onImageClick);
      img.addEventListener('click', onImageClick);
    });
  }

  function onImageClick(e) {
    e.stopPropagation();
    const img = e.currentTarget;

    // Deselect previously selected
    if (activeImage) activeImage.classList.remove('selected');

    activeImage = img;
    activeImage.classList.add('selected');

    positionImageToolbar(img);
  }

  function positionImageToolbar(img) {
    if (!imageActionBar || !img) return;

    const rect = img.getBoundingClientRect();
    const canvasRect = document.querySelector('.notes-document-canvas').getBoundingClientRect();

    const top = rect.top - canvasRect.top + document.querySelector('.notes-document-canvas').scrollTop;
    const left = rect.left - canvasRect.left + rect.width / 2;

    imageActionBar.style.top = `${top}px`;
    imageActionBar.style.left = `${left}px`;
    imageActionBar.classList.add('is-visible');
  }

  // --- 5. INITIALIZE EVENT LISTENERS ---
  function init() {
    // Back to Tree Button
    if (backBtn) {
      backBtn.addEventListener('click', closeTopic);
    }

    // Auto-save on editor input
    if (editorBody) {
      editorBody.addEventListener('input', () => saveCurrentNote(false));

      // Click outside image hides image toolbar
      editorBody.addEventListener('click', (e) => {
        if (!e.target.matches('img')) {
          if (activeImage) activeImage.classList.remove('selected');
          activeImage = null;
          if (imageActionBar) imageActionBar.classList.remove('is-visible');
        }
      });
    }

    // Format buttons (Bold, Italic, Underline, Strikethrough)
    document.querySelectorAll('[data-command]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const cmd = btn.getAttribute('data-command');
        exec(cmd);
      });
    });

    // Heading Select
    if (headingSelect) {
      headingSelect.addEventListener('change', () => {
        const val = headingSelect.value;
        if (val) exec('formatBlock', val);
      });
    }

    // Font Family Select
    if (fontSelect) {
      fontSelect.addEventListener('change', () => {
        currentTheme.fontFamily = fontSelect.value;
        applyThemeToDocument(currentTheme);
        saveCurrentNote();
      });
    }

    // Font Size Select
    if (sizeSelect) {
      sizeSelect.addEventListener('change', () => {
        currentTheme.fontSize = sizeSelect.value;
        applyThemeToDocument(currentTheme);
        saveCurrentNote();
      });
    }

    // Text Color
    if (textColorInput) {
      textColorInput.addEventListener('input', () => {
        const color = textColorInput.value;
        currentTheme.textColor = color;
        if (textColorIndicator) textColorIndicator.style.backgroundColor = color;
        exec('foreColor', color);
      });
    }

    // Highlight Color
    if (highlightColorInput) {
      highlightColorInput.addEventListener('input', () => {
        const color = highlightColorInput.value;
        if (highlightIndicator) highlightIndicator.style.backgroundColor = color;
        exec('hiliteColor', color);
      });
    }

    // Image Upload
    if (imageUploadBtn && imageUploadInput) {
      imageUploadBtn.addEventListener('click', () => imageUploadInput.click());
      imageUploadInput.addEventListener('change', handleImageUpload);
    }

    // Image Action Bar Handlers
    imgWidthBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (!activeImage) return;
        const width = btn.getAttribute('data-img-width');
        activeImage.style.width = width;
        positionImageToolbar(activeImage);
        saveCurrentNote();
      });
    });

    imgAlignBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (!activeImage) return;
        const align = btn.getAttribute('data-img-align');
        activeImage.classList.remove('img-align-left', 'img-align-center', 'img-align-right');
        activeImage.classList.add(`img-align-${align}`);
        positionImageToolbar(activeImage);
        saveCurrentNote();
      });
    });

    if (imgDeleteBtn) {
      imgDeleteBtn.addEventListener('click', () => {
        if (!activeImage) return;
        activeImage.remove();
        activeImage = null;
        if (imageActionBar) imageActionBar.classList.remove('is-visible');
        saveCurrentNote();
      });
    }

    // Link Button
    if (linkBtn) {
      linkBtn.addEventListener('click', () => {
        const url = prompt('Enter link URL (e.g. https://...):', 'https://');
        if (url && url.trim()) {
          exec('createLink', url.trim());
        }
      });
    }

    // Clear Formatting Button
    if (clearFormatBtn) {
      clearFormatBtn.addEventListener('click', () => {
        exec('removeFormat');
      });
    }

    // Undo / Redo
    if (undoBtn) undoBtn.addEventListener('click', () => exec('undo'));
    if (redoBtn) redoBtn.addEventListener('click', () => exec('redo'));

    // Theme Background Swatches
    themeSwatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        const bgColor = swatch.getAttribute('data-bg-color');
        currentTheme.bgColor = bgColor;
        if (bgColor === '#171717') {
          currentTheme.textColor = '#FFFCA8';
        } else {
          currentTheme.textColor = '#171717';
        }
        applyThemeToDocument(currentTheme);
        saveCurrentNote();
      });
    });

    // Custom Background Color
    if (customBgColorInput) {
      customBgColorInput.addEventListener('input', () => {
        const color = customBgColorInput.value;
        currentTheme.bgColor = color;
        currentTheme.textColor = '#171717';
        applyThemeToDocument(currentTheme);
        saveCurrentNote();
      });
    }

    // Keyboard Shortcuts inside Editor
    if (editorBody) {
      editorBody.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
          e.preventDefault();
          saveCurrentNote(true);
        }
      });
    }
  }

  return {
    init,
    openTopic,
    closeTopic,
    saveCurrentNote,
    getActiveNodeId: () => activeNodeId
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  window.AdiverseNotes.init();
});
