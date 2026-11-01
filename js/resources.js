/**
 * ADIVERSE - LEARNING RESOURCES MODULE
 * Curate and manage academic study materials: articles, lecture videos,
 * websites, uploaded PDFs, and research notes linked to knowledge topics.
 */

'use strict';

window.AdiverseResources = (function () {
  const STORAGE_KEY = 'adiverse_resources_data';

  let resources = [];
  let filterType = 'all';
  let filterTopic = 'all';
  let searchKeyword = '';

  let editingResourceId = null;
  let stagedFileData = null;
  let stagedFileName = null;

  // DOM Elements
  let resourcesView = null;
  let resourcesGrid = null;
  let resourcesEmpty = null;
  let statTotal = null;
  let statArticles = null;
  let statVideos = null;
  let statPdfs = null;

  let selectType = null;
  let selectTopic = null;
  let searchInput = null;

  // Modal Elements
  let modalOverlay = null;
  let modalTitle = null;
  let form = null;
  let inputTitle = null;
  let inputType = null;
  let inputTopic = null;
  let inputUrl = null;
  let inputDesc = null;
  let inputFile = null;
  let fileUploadLabel = null;
  let topicDatalist = null;
  let modalSaveBtn = null;
  let modalCancelBtn = null;

  // Preview Overlay
  let previewOverlay = null;
  let previewTitle = null;
  let previewBody = null;
  let previewCloseBtn = null;

  function getSeedResources() {
    return [
      {
        id: 'res_' + (Date.now() - 40000),
        title: 'In Search of an Understandable Consensus Algorithm (Raft Paper)',
        type: 'PDF',
        topic: 'Distributed Systems',
        url: 'https://raft.github.io/raft.pdf',
        description: 'Diego Ongaro and John Ousterhout seminal Stanford paper introducing Raft consensus protocol as an understandable, verifiable alternative to Paxos.',
        createdAt: Date.now() - 1000 * 60 * 60 * 48
      },
      {
        id: 'res_' + (Date.now() - 30000),
        title: 'MIT 6.824: Distributed Systems Lecture Series',
        type: 'Video',
        topic: 'Distributed Systems',
        url: 'https://www.youtube.com/watch?v=cQP8WApzIQQ',
        description: 'Comprehensive graduate course lectures covering fault-tolerant state machine replication, consensus, and primary-backup architectures.',
        createdAt: Date.now() - 1000 * 60 * 60 * 36
      },
      {
        id: 'res_' + (Date.now() - 20000),
        title: 'Visualizing Shortest Path & Heuristic Graph Traversal',
        type: 'Website',
        topic: 'Algorithms',
        url: 'https://visualgo.net/en/sssp',
        description: 'Interactive animated step-by-step visualizer for Dijkstra, Bellman-Ford, and A* heuristic shortest path algorithms on Euclidean networks.',
        createdAt: Date.now() - 1000 * 60 * 60 * 24
      },
      {
        id: 'res_' + (Date.now() - 10000),
        title: 'Understanding LSTM Networks & Gated Architectures',
        type: 'Article',
        topic: 'Artificial Intelligence',
        url: 'https://colah.github.io/posts/2015-08-Understanding-LSTMs/',
        description: 'Christopher Olah foundational guide breaking down recurrent neural networks, vanishing gradients, and constant error carousels.',
        createdAt: Date.now() - 1000 * 60 * 60 * 12
      },
      {
        id: 'res_' + Date.now(),
        title: 'OSTEP: Introduction to Paging and Address Translation',
        type: 'PDF',
        topic: 'Operating Systems',
        url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/vm-paging.pdf',
        description: 'Operating Systems: Three Easy Pieces Chapter 18. Detailed coverage of linear page tables, page directory entries, and TLB lookups.',
        createdAt: Date.now() - 1000 * 60 * 60 * 6
      }
    ];
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        resources = JSON.parse(raw);
        if (!Array.isArray(resources)) {
          resources = getSeedResources();
          saveData();
        }
      } else {
        resources = getSeedResources();
        saveData();
      }
    } catch (e) {
      console.warn('Failed to parse resources from localStorage:', e);
      resources = getSeedResources();
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resources));
    } catch (e) {
      console.error('Failed to save resources to localStorage:', e);
    }
  }

  function init() {
    resourcesView = document.getElementById('resources-workspace-view');
    resourcesGrid = document.getElementById('resources-grid');
    resourcesEmpty = document.getElementById('resources-empty');
    statTotal = document.getElementById('stat-resources-total');
    statArticles = document.getElementById('stat-resources-articles');
    statVideos = document.getElementById('stat-resources-videos');
    statPdfs = document.getElementById('stat-resources-pdfs');

    selectType = document.getElementById('res-filter-type');
    selectTopic = document.getElementById('res-filter-topic');
    searchInput = document.getElementById('res-search-input');

    // Modals
    modalOverlay = document.getElementById('resource-modal-overlay');
    modalTitle = document.getElementById('resource-modal-title');
    form = document.getElementById('resource-form');
    inputTitle = document.getElementById('res-input-title');
    inputType = document.getElementById('res-input-type');
    inputTopic = document.getElementById('res-input-topic');
    inputUrl = document.getElementById('res-input-url');
    inputDesc = document.getElementById('res-input-desc');
    inputFile = document.getElementById('res-input-file');
    fileUploadLabel = document.getElementById('res-file-upload-label');
    topicDatalist = document.getElementById('resource-topic-datalist');
    modalSaveBtn = document.getElementById('res-modal-save-btn');
    modalCancelBtn = document.getElementById('res-modal-cancel-btn');

    previewOverlay = document.getElementById('file-preview-overlay');
    previewTitle = document.getElementById('preview-modal-title');
    previewBody = document.getElementById('preview-modal-body');
    previewCloseBtn = document.getElementById('preview-modal-close-btn');

    loadData();

    // Bindings
    const navResources = document.getElementById('nav-resources');
    if (navResources) {
      navResources.addEventListener('click', () => {
        show();
      });
    }

    const btnCreate = document.getElementById('btn-create-resource');
    if (btnCreate) {
      btnCreate.addEventListener('click', () => openCreateModal());
    }

    const btnEmptyCreate = document.getElementById('btn-empty-create-resource');
    if (btnEmptyCreate) {
      btnEmptyCreate.addEventListener('click', () => openCreateModal());
    }

    // Filters
    if (selectType) {
      selectType.addEventListener('change', (e) => {
        filterType = e.target.value;
        render();
      });
    }

    if (selectTopic) {
      selectTopic.addEventListener('change', (e) => {
        filterTopic = e.target.value;
        render();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchKeyword = e.target.value.trim().toLowerCase();
        render();
      });
    }

    // Modal Actions
    if (modalSaveBtn) {
      modalSaveBtn.addEventListener('click', saveModalResource);
    }
    if (modalCancelBtn) {
      modalCancelBtn.addEventListener('click', closeModal);
    }
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
      });
    }

    // File Input Listener
    if (inputFile) {
      inputFile.addEventListener('change', handleFileUpload);
    }

    // Preview Close
    if (previewCloseBtn) {
      previewCloseBtn.addEventListener('click', closePreview);
    }
    if (previewOverlay) {
      previewOverlay.addEventListener('click', (e) => {
        if (e.target === previewOverlay) closePreview();
      });
    }

    // Escape Key Handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (modalOverlay && modalOverlay.classList.contains('is-active')) closeModal();
        else if (previewOverlay && previewOverlay.classList.contains('is-active')) closePreview();
      }
    });

    populateTopicOptions();
    render();

    if (window.location.hash === '#resources') {
      show();
    }

    window.addEventListener('hashchange', () => {
      if (window.location.hash === '#resources') {
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
    if (progressView) progressView.style.display = 'none';

    if (resourcesView) {
      resourcesView.style.display = 'flex';
      resourcesView.scrollTop = 0;
    }

    if (eyebrow) eyebrow.textContent = 'Scholar Artifacts';
    if (title) title.textContent = 'Learning Resources';

    navItems.forEach(item => item.classList.remove('active'));
    const navBtn = document.getElementById('nav-resources');
    if (navBtn) navBtn.classList.add('active');

    populateTopicOptions();
    render();
  }

  function populateTopicOptions() {
    const topicsSet = new Set();

    resources.forEach(r => {
      if (r.topic && r.topic.trim()) topicsSet.add(r.topic.trim());
    });

    if (window.AdiverseWorkspace && typeof window.AdiverseWorkspace.getNodes === 'function') {
      const nodes = window.AdiverseWorkspace.getNodes() || [];
      nodes.forEach(n => {
        if (n.title && n.title.trim() && n.id !== 'root') topicsSet.add(n.title.trim());
      });
    }

    const sorted = Array.from(topicsSet).sort();

    if (selectTopic) {
      const cur = selectTopic.value;
      selectTopic.innerHTML = '<option value="all">All Topics</option>';
      sorted.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        selectTopic.appendChild(opt);
      });
      if (sorted.includes(cur)) selectTopic.value = cur;
      else {
        selectTopic.value = 'all';
        filterTopic = 'all';
      }
    }

    if (topicDatalist) {
      topicDatalist.innerHTML = '';
      sorted.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        topicDatalist.appendChild(opt);
      });
    }
  }

  function render() {
    // 1. Calculate stats
    const total = resources.length;
    const articles = resources.filter(r => r.type === 'Article').length;
    const videos = resources.filter(r => r.type === 'Video').length;
    const pdfs = resources.filter(r => r.type === 'PDF').length;

    if (statTotal) statTotal.textContent = total;
    if (statArticles) statArticles.textContent = articles;
    if (statVideos) statVideos.textContent = videos;
    if (statPdfs) statPdfs.textContent = pdfs;

    // 2. Filter resources
    const filtered = resources.filter(r => {
      if (filterType !== 'all' && r.type !== filterType) return false;
      if (filterTopic !== 'all' && r.topic !== filterTopic) return false;
      if (searchKeyword) {
        const matchTitle = (r.title || '').toLowerCase().includes(searchKeyword);
        const matchDesc = (r.description || '').toLowerCase().includes(searchKeyword);
        const matchTopic = (r.topic || '').toLowerCase().includes(searchKeyword);
        if (!matchTitle && !matchDesc && !matchTopic) return false;
      }
      return true;
    });

    // 3. Render DOM
    if (!resourcesGrid) return;

    if (filtered.length === 0) {
      resourcesGrid.style.display = 'none';
      if (resourcesEmpty) resourcesEmpty.style.display = 'flex';
      return;
    }

    resourcesGrid.style.display = 'grid';
    if (resourcesEmpty) resourcesEmpty.style.display = 'none';
    resourcesGrid.innerHTML = '';

    filtered.forEach(res => {
      const card = createResourceCard(res);
      resourcesGrid.appendChild(card);
    });
  }

  function createResourceCard(res) {
    const card = document.createElement('div');
    card.className = 'resource-card';
    card.setAttribute('data-id', res.id);

    // Header: Type Badge + Topic Tag
    const header = document.createElement('div');
    header.className = 'resource-card-header';

    const typeBadge = document.createElement('span');
    const badgeTypeClass = `res-badge--${(res.type || 'other').toLowerCase()}`;
    typeBadge.className = `resource-type-badge ${badgeTypeClass}`;

    let iconSvg = '';
    if (res.type === 'Article') {
      iconSvg = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>';
    } else if (res.type === 'Video') {
      iconSvg = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>';
    } else if (res.type === 'PDF') {
      iconSvg = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>';
    } else {
      iconSvg = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line></svg>';
    }

    typeBadge.innerHTML = `${iconSvg} <span>${res.type || 'Resource'}</span>`;
    header.appendChild(typeBadge);

    if (res.topic) {
      const topicTag = document.createElement('span');
      topicTag.className = 'resource-topic-tag';
      topicTag.textContent = res.topic;
      header.appendChild(topicTag);
    }
    card.appendChild(header);

    // Body: Title & Desc
    const body = document.createElement('div');
    body.className = 'resource-card-body';

    const titleEl = document.createElement('h3');
    titleEl.className = 'resource-card-title';
    titleEl.textContent = res.title;
    body.appendChild(titleEl);

    if (res.description) {
      const descEl = document.createElement('p');
      descEl.className = 'resource-card-desc';
      descEl.textContent = res.description;
      body.appendChild(descEl);
    }
    card.appendChild(body);

    // Footer: Link / Preview + Actions
    const footer = document.createElement('div');
    footer.className = 'resource-card-footer';

    if (res.fileData) {
      const previewBtn = document.createElement('button');
      previewBtn.className = 'resource-link-btn';
      previewBtn.type = 'button';
      previewBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
        <span>Preview File</span>
      `;
      previewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openPreview(res);
      });
      footer.appendChild(previewBtn);
    } else if (res.url) {
      const link = document.createElement('a');
      link.className = 'resource-link-btn';
      link.href = res.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.innerHTML = `
        <span>Visit Link</span>
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="7" y1="17" x2="17" y2="7"></line>
          <polyline points="7 7 17 7 17 17"></polyline>
        </svg>
      `;
      footer.appendChild(link);
    } else {
      const span = document.createElement('span');
      span.style.fontSize = '0.78rem';
      span.style.color = 'var(--color-text-subtle)';
      span.textContent = 'No link attached';
      footer.appendChild(span);
    }

    // Actions: Edit & Delete
    const actions = document.createElement('div');
    actions.className = 'resource-card-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'assign-action-btn';
    editBtn.type = 'button';
    editBtn.setAttribute('title', 'Edit Resource');
    editBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
    `;
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(res.id);
    });
    actions.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'assign-action-btn assign-action-btn--danger';
    delBtn.type = 'button';
    delBtn.setAttribute('title', 'Delete Resource');
    delBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    `;
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteResource(res.id);
    });
    actions.appendChild(delBtn);

    footer.appendChild(actions);
    card.appendChild(footer);

    return card;
  }

  // --- File Upload Handling ---
  function handleFileUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    stagedFileName = file.name;
    if (fileUploadLabel) fileUploadLabel.textContent = `Selected: ${file.name}`;

    const reader = new FileReader();
    reader.onload = function (event) {
      stagedFileData = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  // --- Modal Operations ---
  function openCreateModal() {
    editingResourceId = null;
    stagedFileData = null;
    stagedFileName = null;
    if (modalTitle) modalTitle.textContent = 'Add Learning Resource';
    if (form) form.reset();
    if (fileUploadLabel) fileUploadLabel.textContent = 'Upload PDF or image file (optional)';

    populateTopicOptions();
    if (modalOverlay) modalOverlay.classList.add('is-active');
    if (inputTitle) setTimeout(() => inputTitle.focus(), 50);
  }

  function openEditModal(resId) {
    const res = resources.find(r => r.id === resId);
    if (!res) return;

    editingResourceId = resId;
    stagedFileData = res.fileData || null;
    stagedFileName = res.fileName || null;

    if (modalTitle) modalTitle.textContent = 'Edit Learning Resource';
    if (inputTitle) inputTitle.value = res.title || '';
    if (inputType) inputType.value = res.type || 'Article';
    if (inputTopic) inputTopic.value = res.topic || '';
    if (inputUrl) inputUrl.value = res.url || '';
    if (inputDesc) inputDesc.value = res.description || '';

    if (fileUploadLabel) {
      fileUploadLabel.textContent = stagedFileName ? `Current file: ${stagedFileName}` : 'Upload PDF or image file (optional)';
    }

    populateTopicOptions();
    if (modalOverlay) modalOverlay.classList.add('is-active');
    if (inputTitle) setTimeout(() => inputTitle.focus(), 50);
  }

  function closeModal() {
    if (modalOverlay) modalOverlay.classList.remove('is-active');
    editingResourceId = null;
    stagedFileData = null;
    stagedFileName = null;
  }

  function saveModalResource() {
    const titleVal = inputTitle ? inputTitle.value.trim() : '';
    if (!titleVal) {
      if (inputTitle) {
        inputTitle.focus();
        inputTitle.style.borderColor = '#c92a2a';
        setTimeout(() => { if (inputTitle) inputTitle.style.borderColor = ''; }, 1500);
      }
      return;
    }

    const typeVal = inputType ? inputType.value : 'Article';
    const topicVal = inputTopic ? inputTopic.value.trim() : 'General Studies';
    const urlVal = inputUrl ? inputUrl.value.trim() : '';
    const descVal = inputDesc ? inputDesc.value.trim() : '';

    if (editingResourceId) {
      const res = resources.find(r => r.id === editingResourceId);
      if (res) {
        res.title = titleVal;
        res.type = typeVal;
        res.topic = topicVal;
        res.url = urlVal;
        res.description = descVal;
        if (stagedFileData) {
          res.fileData = stagedFileData;
          res.fileName = stagedFileName;
        }
        res.updatedAt = Date.now();
      }
    } else {
      const newRes = {
        id: 'res_' + Date.now(),
        title: titleVal,
        type: typeVal,
        topic: topicVal,
        url: urlVal,
        description: descVal,
        fileData: stagedFileData,
        fileName: stagedFileName,
        createdAt: Date.now()
      };
      resources.unshift(newRes);
    }

    saveData();
    closeModal();
    populateTopicOptions();
    render();
  }

  function deleteResource(resId) {
    resources = resources.filter(r => r.id !== resId);
    saveData();
    populateTopicOptions();
    render();
  }

  // --- Preview Modal ---
  function openPreview(res) {
    if (!res || !res.fileData || !previewOverlay || !previewBody) return;
    if (previewTitle) previewTitle.textContent = res.title || 'File Preview';
    previewBody.innerHTML = '';

    const isImage = res.fileData.startsWith('data:image/');
    const isPdf = res.fileData.startsWith('data:application/pdf');

    if (isImage) {
      const img = document.createElement('img');
      img.src = res.fileData;
      img.alt = res.title;
      previewBody.appendChild(img);
    } else if (isPdf) {
      const iframe = document.createElement('iframe');
      iframe.src = res.fileData;
      iframe.title = res.title;
      previewBody.appendChild(iframe);
    } else {
      const p = document.createElement('p');
      p.textContent = `Attached file: ${res.fileName || 'Document'}`;
      previewBody.appendChild(p);
    }

    previewOverlay.classList.add('is-active');
  }

  function closePreview() {
    if (previewOverlay) previewOverlay.classList.remove('is-active');
    if (previewBody) previewBody.innerHTML = '';
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
    getResources: () => resources,
    createResource: (data) => {
      const res = Object.assign({
        id: 'res_' + Date.now(),
        title: 'Untitled Resource',
        type: 'Article',
        topic: 'General Studies',
        url: '',
        description: '',
        createdAt: Date.now()
      }, data);
      resources.unshift(res);
      saveData();
      render();
      return res;
    },
    deleteResource,
    openCreateModal,
    openEditModal,
    closeModal
  };
})();
