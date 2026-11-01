/**
 * ADIVERSE - REVISION & FLASHCARDS MODULE
 * Active recall study decks, 3D flip card interactions, practice tracking,
 * subject filtering, and persistent localStorage sync.
 */

'use strict';

window.AdiverseFlashcards = (function () {
  const STORAGE_KEY = 'adiverse_flashcards_data';

  let flashcards = [];
  let currentDeck = [];
  let currentIndex = 0;
  let isFlipped = false;

  let selectedTopic = 'all';
  let selectedStatusFilter = 'all';

  let editingCardId = null;

  // DOM Elements
  let revisionView = null;
  let activeCardEl = null;
  let cardTopicFront = null;
  let cardTopicBack = null;
  let cardStatusFront = null;
  let cardIndexPill = null;
  let cardQuestionText = null;
  let cardAnswerText = null;

  let statTotal = null;
  let statPractice = null;
  let statMastered = null;
  let statRate = null;

  let topicSelect = null;
  let statusFilter = null;
  let btnToggleLibrary = null;
  let deckLibrarySection = null;
  let deckLibraryList = null;
  let deckLibraryCount = null;
  let revisionEmpty = null;
  let flashcardStage = null;

  // Navigation & Rating Buttons
  let btnPrev = null;
  let btnNext = null;
  let btnFlip = null;
  let btnShuffle = null;
  let btnRatePractice = null;
  let btnRateGotIt = null;

  // Modal Elements
  let modalOverlay = null;
  let modalTitle = null;
  let form = null;
  let inputTopic = null;
  let inputQuestion = null;
  let inputAnswer = null;
  let inputStatus = null;
  let topicDatalist = null;
  let btnImportTopic = null;
  let modalSaveBtn = null;
  let modalCancelBtn = null;

  function getSeedFlashcards() {
    return [
      {
        id: 'fc_' + (Date.now() - 60000),
        topic: 'Distributed Systems',
        question: 'What is the CAP Theorem and what trade-offs does it dictate in network partitions?',
        answer: 'The CAP Theorem states that a distributed data store can only guarantee at most two out of three properties: Consistency, Availability, and Partition Tolerance. In the presence of a network partition (P), a system must trade off between returning the latest data (C) or responding to all requests (A).',
        status: 'mastered',
        reviewCount: 3,
        createdAt: Date.now() - 1000 * 60 * 60 * 48
      },
      {
        id: 'fc_' + (Date.now() - 50000),
        topic: 'Distributed Systems',
        question: 'How does the Raft consensus algorithm handle leader election when heartbeats timeout?',
        answer: 'When a follower election timer expires without receiving heartbeats, it transitions to Candidate, increments the term, votes for itself, and broadcasts RequestVote RPCs. If it receives votes from a majority of servers, it becomes the new Leader and sends periodic appendEntries heartbeats.',
        status: 'practice',
        reviewCount: 2,
        createdAt: Date.now() - 1000 * 60 * 60 * 36
      },
      {
        id: 'fc_' + (Date.now() - 40000),
        topic: 'Algorithms',
        question: 'What distinguishes Dijkstra algorithm from A* heuristic search?',
        answer: 'Dijkstra explores paths uniformly based solely on exact cumulative distance g(n) from the start node. A* search enhances Dijkstra by adding an admissible heuristic h(n) estimating distance to the goal (f(n) = g(n) + h(n)), directing exploration toward the target and cutting unneeded vertex evaluations.',
        status: 'new',
        reviewCount: 0,
        createdAt: Date.now() - 1000 * 60 * 60 * 24
      },
      {
        id: 'fc_' + (Date.now() - 30000),
        topic: 'Artificial Intelligence',
        question: 'Why does the vanishing gradient problem occur in deep recurrent networks, and how do LSTMs mitigate it?',
        answer: 'Repeated matrix multiplications with small eigenvalues during backpropagation through time cause gradients to decay exponentially to zero. LSTMs introduce constant error carousels with additive linear gradient highways regulated by forget, input, and output gates.',
        status: 'practice',
        reviewCount: 4,
        createdAt: Date.now() - 1000 * 60 * 60 * 18
      },
      {
        id: 'fc_' + (Date.now() - 20000),
        topic: 'Operating Systems',
        question: 'Explain the difference between paging and segmentation in virtual memory architecture.',
        answer: 'Paging divides memory and address space into fixed-size physical frames and pages managed transparently by the OS, preventing external fragmentation. Segmentation divides memory into variable-sized logical segments (code, stack, heap) matching the modular program layout.',
        status: 'mastered',
        reviewCount: 2,
        createdAt: Date.now() - 1000 * 60 * 60 * 12
      },
      {
        id: 'fc_' + (Date.now() - 10000),
        topic: 'Database Systems',
        question: 'How does Write-Ahead Logging (WAL) guarantee durability and atomicity in ACID databases?',
        answer: 'WAL mandates that any modifications to buffer cache pages must be written sequentially to non-volatile log storage on disk before dirty database pages can be flushed. During crash recovery, the database replays redo records and rolls back uncommitted undo records.',
        status: 'new',
        reviewCount: 0,
        createdAt: Date.now() - 1000 * 60 * 60 * 6
      }
    ];
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        flashcards = JSON.parse(raw);
        if (!Array.isArray(flashcards)) {
          flashcards = getSeedFlashcards();
          saveData();
        }
      } else {
        flashcards = getSeedFlashcards();
        saveData();
      }
    } catch (e) {
      console.warn('Failed to parse flashcards from localStorage:', e);
      flashcards = getSeedFlashcards();
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(flashcards));
    } catch (e) {
      console.error('Failed to save flashcards to localStorage:', e);
    }
  }

  function init() {
    // Cache DOM
    revisionView = document.getElementById('revision-workspace-view');
    activeCardEl = document.getElementById('active-flashcard');
    cardTopicFront = document.getElementById('card-topic-front');
    cardTopicBack = document.getElementById('card-topic-back');
    cardStatusFront = document.getElementById('card-status-front');
    cardIndexPill = document.getElementById('card-index-pill');
    cardQuestionText = document.getElementById('card-question-text');
    cardAnswerText = document.getElementById('card-answer-text');

    statTotal = document.getElementById('stat-flashcards-total');
    statPractice = document.getElementById('stat-flashcards-practice');
    statMastered = document.getElementById('stat-flashcards-mastered');
    statRate = document.getElementById('stat-flashcards-rate');

    topicSelect = document.getElementById('rev-topic-select');
    statusFilter = document.getElementById('rev-status-filter');
    btnToggleLibrary = document.getElementById('btn-toggle-library');
    deckLibrarySection = document.getElementById('deck-library-section');
    deckLibraryList = document.getElementById('deck-library-list');
    deckLibraryCount = document.getElementById('deck-library-count');
    revisionEmpty = document.getElementById('revision-empty');
    flashcardStage = document.getElementById('flashcard-stage');

    btnPrev = document.getElementById('btn-card-prev');
    btnNext = document.getElementById('btn-card-next');
    btnFlip = document.getElementById('btn-card-flip');
    btnShuffle = document.getElementById('btn-card-shuffle');
    btnRatePractice = document.getElementById('btn-rate-practice');
    btnRateGotIt = document.getElementById('btn-rate-gotit');

    // Modal DOM
    modalOverlay = document.getElementById('flashcard-modal-overlay');
    modalTitle = document.getElementById('flashcard-modal-title');
    form = document.getElementById('flashcard-form');
    inputTopic = document.getElementById('fc-input-topic');
    inputQuestion = document.getElementById('fc-input-question');
    inputAnswer = document.getElementById('fc-input-answer');
    inputStatus = document.getElementById('fc-input-status');
    topicDatalist = document.getElementById('flashcard-topic-datalist');
    btnImportTopic = document.getElementById('fc-btn-import-topic');
    modalSaveBtn = document.getElementById('fc-modal-save-btn');
    modalCancelBtn = document.getElementById('fc-modal-cancel-btn');

    loadData();

    // Bindings
    const navRevision = document.getElementById('nav-revision');
    if (navRevision) {
      navRevision.addEventListener('click', () => {
        show();
      });
    }

    const btnCreate = document.getElementById('btn-create-flashcard');
    if (btnCreate) {
      btnCreate.addEventListener('click', () => openCreateModal());
    }

    const btnEmptyCreate = document.getElementById('btn-empty-create-flashcard');
    if (btnEmptyCreate) {
      btnEmptyCreate.addEventListener('click', () => openCreateModal());
    }

    // Card Flip
    if (activeCardEl) {
      activeCardEl.addEventListener('click', toggleFlip);
      activeCardEl.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          toggleFlip();
        }
      });
    }

    if (btnFlip) {
      btnFlip.addEventListener('click', toggleFlip);
    }

    // Navigation Controls
    if (btnPrev) {
      btnPrev.addEventListener('click', prevCard);
    }
    if (btnNext) {
      btnNext.addEventListener('click', nextCard);
    }
    if (btnShuffle) {
      btnShuffle.addEventListener('click', shuffleDeck);
    }

    // Rating Controls
    if (btnRatePractice) {
      btnRatePractice.addEventListener('click', () => rateCurrentCard('practice'));
    }
    if (btnRateGotIt) {
      btnRateGotIt.addEventListener('click', () => rateCurrentCard('mastered'));
    }

    // Filter Controls
    if (topicSelect) {
      topicSelect.addEventListener('change', (e) => {
        selectedTopic = e.target.value;
        buildDeck();
      });
    }

    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        selectedStatusFilter = e.target.value;
        buildDeck();
      });
    }

    // Toggle Deck Library
    if (btnToggleLibrary) {
      btnToggleLibrary.addEventListener('click', () => {
        if (!deckLibrarySection) return;
        const isVisible = deckLibrarySection.style.display !== 'none';
        deckLibrarySection.style.display = isVisible ? 'none' : 'flex';
        btnToggleLibrary.querySelector('span').textContent = isVisible ? 'View All Cards' : 'Hide Cards Library';
        if (!isVisible) renderLibraryList();
      });
    }

    // Modal Actions
    if (modalSaveBtn) {
      modalSaveBtn.addEventListener('click', saveModalCard);
    }
    if (modalCancelBtn) {
      modalCancelBtn.addEventListener('click', closeModal);
    }
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
      });
    }

    // Auto-fill from notes button
    if (btnImportTopic) {
      btnImportTopic.addEventListener('click', handleAutoFillNotes);
    }

    // Keyboard Shortcuts (Arrow keys & Spacebar during study)
    document.addEventListener('keydown', (e) => {
      // Check if modal is open
      if (modalOverlay && modalOverlay.classList.contains('is-active')) {
        if (e.key === 'Escape') closeModal();
        return;
      }

      // Check if Revision view is active
      if (!revisionView || revisionView.style.display === 'none') return;
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'SELECT')) {
        return;
      }

      if (e.key === 'ArrowRight') {
        nextCard();
      } else if (e.key === 'ArrowLeft') {
        prevCard();
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        toggleFlip();
      }
    });

    populateTopicOptions();
    buildDeck();

    if (window.location.hash === '#revision') {
      show();
    }

    window.addEventListener('hashchange', () => {
      if (window.location.hash === '#revision') {
        show();
      }
    });
  }

  function show() {
    const stage = document.getElementById('workspace-stage');
    const notesView = document.getElementById('notes-workspace-view');
    const dashboardView = document.getElementById('dashboard-workspace-view');
    const assignmentsView = document.getElementById('assignments-workspace-view');
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

    if (revisionView) {
      revisionView.style.display = 'flex';
      revisionView.scrollTop = 0;
    }

    if (eyebrow) eyebrow.textContent = 'Active Recall Cosmos';
    if (title) title.textContent = 'Revision & Flashcards';

    navItems.forEach(item => item.classList.remove('active'));
    const navBtn = document.getElementById('nav-revision');
    if (navBtn) navBtn.classList.add('active');

    populateTopicOptions();
    buildDeck();
  }

  function populateTopicOptions() {
    const topicsSet = new Set();

    // From current flashcards
    flashcards.forEach(fc => {
      if (fc.topic && fc.topic.trim()) topicsSet.add(fc.topic.trim());
    });

    // From knowledge tree nodes
    if (window.AdiverseWorkspace && typeof window.AdiverseWorkspace.getNodes === 'function') {
      const nodes = window.AdiverseWorkspace.getNodes() || [];
      nodes.forEach(n => {
        if (n.title && n.title.trim() && n.id !== 'root') {
          topicsSet.add(n.title.trim());
        }
      });
    }

    const sorted = Array.from(topicsSet).sort();

    // Populate topic dropdown
    if (topicSelect) {
      const cur = topicSelect.value;
      topicSelect.innerHTML = '<option value="all">All Topics</option>';
      sorted.forEach(top => {
        const count = flashcards.filter(f => f.topic === top).length;
        const opt = document.createElement('option');
        opt.value = top;
        opt.textContent = `${top} (${count})`;
        topicSelect.appendChild(opt);
      });
      if (sorted.includes(cur)) {
        topicSelect.value = cur;
      } else {
        topicSelect.value = 'all';
        selectedTopic = 'all';
      }
    }

    // Populate datalist in modal
    if (topicDatalist) {
      topicDatalist.innerHTML = '';
      sorted.forEach(top => {
        const opt = document.createElement('option');
        opt.value = top;
        topicDatalist.appendChild(opt);
      });
    }
  }

  function buildDeck() {
    currentDeck = flashcards.filter(fc => {
      if (selectedTopic !== 'all' && fc.topic !== selectedTopic) return false;
      if (selectedStatusFilter === 'practice' && fc.status !== 'practice') return false;
      if (selectedStatusFilter === 'mastered' && fc.status !== 'mastered') return false;
      return true;
    });

    currentIndex = 0;
    isFlipped = false;
    if (activeCardEl) activeCardEl.classList.remove('is-flipped');

    updateMetrics();
    renderActiveCard();
    renderLibraryList();
  }

  function updateMetrics() {
    const total = flashcards.length;
    const practiceCount = flashcards.filter(f => f.status === 'practice').length;
    const masteredCount = flashcards.filter(f => f.status === 'mastered').length;
    const rate = total > 0 ? Math.round((masteredCount / total) * 100) : 0;

    if (statTotal) statTotal.textContent = total;
    if (statPractice) statPractice.textContent = practiceCount;
    if (statMastered) statMastered.textContent = masteredCount;
    if (statRate) statRate.textContent = `${rate}%`;
  }

  function renderActiveCard() {
    if (currentDeck.length === 0) {
      if (flashcardStage) flashcardStage.style.display = 'none';
      if (revisionEmpty) revisionEmpty.style.display = 'flex';
      return;
    }

    if (flashcardStage) flashcardStage.style.display = 'flex';
    if (revisionEmpty) revisionEmpty.style.display = 'none';

    // Clamp index
    if (currentIndex >= currentDeck.length) currentIndex = 0;
    if (currentIndex < 0) currentIndex = currentDeck.length - 1;

    const card = currentDeck[currentIndex];
    isFlipped = false;
    if (activeCardEl) activeCardEl.classList.remove('is-flipped');

    if (cardTopicFront) cardTopicFront.textContent = card.topic || 'General Topic';
    if (cardTopicBack) cardTopicBack.textContent = card.topic || 'General Topic';
    if (cardQuestionText) cardQuestionText.textContent = card.question;
    if (cardAnswerText) cardAnswerText.textContent = card.answer;

    if (cardIndexPill) {
      cardIndexPill.textContent = `Card ${currentIndex + 1} of ${currentDeck.length}`;
    }

    if (cardStatusFront) {
      cardStatusFront.className = 'flashcard-status-badge';
      if (card.status === 'mastered') {
        cardStatusFront.classList.add('badge-fc--mastered');
        cardStatusFront.textContent = 'Got It';
      } else if (card.status === 'practice') {
        cardStatusFront.classList.add('badge-fc--practice');
        cardStatusFront.textContent = 'Need Practice';
      } else {
        cardStatusFront.classList.add('badge-fc--new');
        cardStatusFront.textContent = 'New';
      }
    }
  }

  function toggleFlip() {
    if (!activeCardEl || currentDeck.length === 0) return;
    isFlipped = !isFlipped;
    if (isFlipped) {
      activeCardEl.classList.add('is-flipped');
    } else {
      activeCardEl.classList.remove('is-flipped');
    }
  }

  function nextCard() {
    if (currentDeck.length === 0) return;
    currentIndex = (currentIndex + 1) % currentDeck.length;
    renderActiveCard();
  }

  function prevCard() {
    if (currentDeck.length === 0) return;
    currentIndex = (currentIndex - 1 + currentDeck.length) % currentDeck.length;
    renderActiveCard();
  }

  function shuffleDeck() {
    if (currentDeck.length <= 1) return;
    // Fisher-Yates shuffle
    for (let i = currentDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [currentDeck[i], currentDeck[j]] = [currentDeck[j], currentDeck[i]];
    }
    currentIndex = 0;
    renderActiveCard();
  }

  function rateCurrentCard(newStatus) {
    if (currentDeck.length === 0) return;
    const card = currentDeck[currentIndex];
    card.status = newStatus;
    card.reviewCount = (card.reviewCount || 0) + 1;
    card.lastReviewed = Date.now();

    // Persist
    saveData();
    updateMetrics();

    // Advance to next card
    if (currentDeck.length > 1) {
      nextCard();
    } else {
      renderActiveCard();
    }

    renderLibraryList();
  }

  function renderLibraryList() {
    if (!deckLibraryList) return;
    const visibleCards = flashcards.filter(f => selectedTopic === 'all' || f.topic === selectedTopic);

    if (deckLibraryCount) {
      deckLibraryCount.textContent = `${visibleCards.length} Card${visibleCards.length === 1 ? '' : 's'}`;
    }

    deckLibraryList.innerHTML = '';
    if (visibleCards.length === 0) {
      deckLibraryList.innerHTML = '<p style="color: var(--color-text-subtle); font-size: 0.85rem; padding: 1rem 0;">No cards created yet in this topic.</p>';
      return;
    }

    visibleCards.forEach(card => {
      const row = document.createElement('div');
      row.className = 'deck-item-row';

      const content = document.createElement('div');
      content.className = 'deck-item-content';

      const meta = document.createElement('div');
      meta.className = 'deck-item-meta';

      const topicTag = document.createElement('span');
      topicTag.className = 'flashcard-topic-pill';
      topicTag.textContent = card.topic || 'General';
      meta.appendChild(topicTag);

      const statusTag = document.createElement('span');
      statusTag.className = 'flashcard-status-badge';
      if (card.status === 'mastered') {
        statusTag.classList.add('badge-fc--mastered');
        statusTag.textContent = 'Got It';
      } else if (card.status === 'practice') {
        statusTag.classList.add('badge-fc--practice');
        statusTag.textContent = 'Need Practice';
      } else {
        statusTag.classList.add('badge-fc--new');
        statusTag.textContent = 'New';
      }
      meta.appendChild(statusTag);

      const qEl = document.createElement('h4');
      qEl.className = 'deck-item-question';
      qEl.textContent = card.question;

      const aEl = document.createElement('p');
      aEl.className = 'deck-item-answer';
      aEl.textContent = card.answer;

      content.appendChild(meta);
      content.appendChild(qEl);
      content.appendChild(aEl);
      row.appendChild(content);

      // Actions
      const actions = document.createElement('div');
      actions.className = 'deck-item-actions';

      // Study / Jump to this card button
      const jumpBtn = document.createElement('button');
      jumpBtn.className = 'assign-action-btn';
      jumpBtn.type = 'button';
      jumpBtn.setAttribute('title', 'Study this card');
      jumpBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      `;
      jumpBtn.addEventListener('click', () => {
        // Find in current deck
        const idx = currentDeck.findIndex(c => c.id === card.id);
        if (idx !== -1) {
          currentIndex = idx;
          renderActiveCard();
          // Scroll up to stage
          if (revisionView) revisionView.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
      actions.appendChild(jumpBtn);

      // Edit Button
      const editBtn = document.createElement('button');
      editBtn.className = 'assign-action-btn';
      editBtn.type = 'button';
      editBtn.setAttribute('title', 'Edit Card');
      editBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      `;
      editBtn.addEventListener('click', () => openEditModal(card.id));
      actions.appendChild(editBtn);

      // Delete Button
      const delBtn = document.createElement('button');
      delBtn.className = 'assign-action-btn assign-action-btn--danger';
      delBtn.type = 'button';
      delBtn.setAttribute('title', 'Delete Card');
      delBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      `;
      delBtn.addEventListener('click', () => deleteFlashcard(card.id));
      actions.appendChild(delBtn);

      row.appendChild(actions);
      deckLibraryList.appendChild(row);
    });
  }

  // --- Modal Operations ---
  function openCreateModal(defaultTopic = '') {
    editingCardId = null;
    if (modalTitle) modalTitle.textContent = 'New Flashcard';
    if (form) form.reset();

    if (inputTopic) {
      inputTopic.value = defaultTopic || (selectedTopic !== 'all' ? selectedTopic : '');
    }
    if (inputStatus) inputStatus.value = 'new';

    populateTopicOptions();
    if (modalOverlay) modalOverlay.classList.add('is-active');
    if (inputQuestion) setTimeout(() => inputQuestion.focus(), 50);
  }

  function openEditModal(cardId) {
    const card = flashcards.find(f => f.id === cardId);
    if (!card) return;

    editingCardId = cardId;
    if (modalTitle) modalTitle.textContent = 'Edit Flashcard';

    if (inputTopic) inputTopic.value = card.topic || '';
    if (inputQuestion) inputQuestion.value = card.question || '';
    if (inputAnswer) inputAnswer.value = card.answer || '';
    if (inputStatus) inputStatus.value = card.status || 'new';

    populateTopicOptions();
    if (modalOverlay) modalOverlay.classList.add('is-active');
    if (inputQuestion) setTimeout(() => inputQuestion.focus(), 50);
  }

  function closeModal() {
    if (modalOverlay) modalOverlay.classList.remove('is-active');
    editingCardId = null;
  }

  function saveModalCard() {
    const topicVal = inputTopic ? inputTopic.value.trim() : '';
    const qVal = inputQuestion ? inputQuestion.value.trim() : '';
    const aVal = inputAnswer ? inputAnswer.value.trim() : '';
    const statusVal = inputStatus ? inputStatus.value : 'new';

    if (!qVal) {
      if (inputQuestion) {
        inputQuestion.focus();
        inputQuestion.style.borderColor = '#c92a2a';
        setTimeout(() => { if (inputQuestion) inputQuestion.style.borderColor = ''; }, 1500);
      }
      return;
    }

    if (!aVal) {
      if (inputAnswer) {
        inputAnswer.focus();
        inputAnswer.style.borderColor = '#c92a2a';
        setTimeout(() => { if (inputAnswer) inputAnswer.style.borderColor = ''; }, 1500);
      }
      return;
    }

    if (editingCardId) {
      const card = flashcards.find(f => f.id === editingCardId);
      if (card) {
        card.topic = topicVal || 'General Studies';
        card.question = qVal;
        card.answer = aVal;
        card.status = statusVal;
        card.updatedAt = Date.now();
      }
    } else {
      const newCard = {
        id: 'fc_' + Date.now(),
        topic: topicVal || 'General Studies',
        question: qVal,
        answer: aVal,
        status: statusVal,
        reviewCount: 0,
        createdAt: Date.now()
      };
      flashcards.unshift(newCard);
    }

    saveData();
    closeModal();
    populateTopicOptions();
    buildDeck();
  }

  function deleteFlashcard(cardId) {
    flashcards = flashcards.filter(f => f.id !== cardId);
    saveData();
    populateTopicOptions();
    buildDeck();
  }

  // --- Auto-fill from Topic Notes ---
  function handleAutoFillNotes() {
    const topicName = inputTopic ? inputTopic.value.trim() : '';
    if (!topicName) {
      alert('Please enter or select a topic first.');
      return;
    }

    // Attempt to find node in tree
    if (window.AdiverseWorkspace && typeof window.AdiverseWorkspace.getNodes === 'function') {
      const nodes = window.AdiverseWorkspace.getNodes() || [];
      const node = nodes.find(n => n.title && n.title.toLowerCase() === topicName.toLowerCase());
      if (node) {
        const noteRaw = localStorage.getItem(`adiverse_notes_data_${node.id}`);
        if (noteRaw) {
          const temp = document.createElement('div');
          temp.innerHTML = noteRaw;
          const text = temp.textContent || temp.innerText || '';
          const cleaned = text.replace(/\s+/g, ' ').trim();
          if (cleaned) {
            if (!inputQuestion.value.trim()) {
              inputQuestion.value = `Explain the foundational concept of ${node.title}.`;
            }
            if (!inputAnswer.value.trim()) {
              inputAnswer.value = cleaned.substring(0, 320) + (cleaned.length > 320 ? '...' : '');
            }
            return;
          }
        }
      }
    }

    // Fallback if no specific note found
    if (!inputQuestion.value.trim()) {
      inputQuestion.value = `What are the core principles and definitions of ${topicName}?`;
    }
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
    getFlashcards: () => flashcards,
    createFlashcard: (data) => {
      const card = Object.assign({
        id: 'fc_' + Date.now(),
        topic: 'General Studies',
        question: 'Sample Question',
        answer: 'Sample Answer',
        status: 'new',
        reviewCount: 0,
        createdAt: Date.now()
      }, data);
      flashcards.unshift(card);
      saveData();
      buildDeck();
      return card;
    },
    rateCurrentCard,
    toggleFlip,
    nextCard,
    prevCard,
    shuffleDeck,
    deleteFlashcard,
    openCreateModal,
    openEditModal,
    closeModal
  };
})();
