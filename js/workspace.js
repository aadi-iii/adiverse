/**
 * ADIVERSE - ACADEMIC WORKSPACE & KNOWLEDGE TREE ENGINE
 * Interactive Knowledge Tree, Pan/Zoom, Node Editing, and Navigation
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // --- UI Elements ---
  const sidebar = document.getElementById('workspace-sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle');
  const backdrop = document.getElementById('sidebar-backdrop');
  const navItems = document.querySelectorAll('.workspace-nav-item');
  const mainStage = document.getElementById('workspace-stage');
  const svg = document.getElementById('tree-svg');
  const viewport = document.getElementById('tree-viewport');
  const edgesLayer = document.getElementById('edges-layer');
  const nodesLayer = document.getElementById('nodes-layer');
  const nodeToolbar = document.getElementById('node-toolbar');
  const nodeCountBadge = document.getElementById('node-count-badge');

  // Dialog Elements
  const dialogOverlay = document.getElementById('node-dialog-overlay');
  const dialogTitle = document.getElementById('dialog-title');
  const dialogInput = document.getElementById('dialog-input');
  const dialogSaveBtn = document.getElementById('dialog-save-btn');
  const dialogCancelBtn = document.getElementById('dialog-cancel-btn');

  // Delete Confirmation Dialog Elements
  const deleteOverlay = document.getElementById('delete-confirm-overlay');
  const deleteMessage = document.getElementById('delete-dialog-message');
  const deleteCancelBtn = document.getElementById('delete-cancel-btn');
  const deleteConfirmBtn = document.getElementById('delete-confirm-btn');
  let pendingDeleteNodeId = null;

  // Toolbar action buttons
  const toolOpenNotesBtn = document.getElementById('tool-open-notes');
  const toolAddChildBtn = document.getElementById('tool-add-child');
  const toolEditBtn = document.getElementById('tool-edit-title');
  const toolDeleteBtn = document.getElementById('tool-delete');
  const addConceptTopbarBtn = document.getElementById('add-concept-topbar');

  // Zoom / Recenter buttons
  const zoomInBtn = document.getElementById('zoom-in-btn');
  const zoomOutBtn = document.getElementById('zoom-out-btn');
  const recenterBtn = document.getElementById('recenter-btn');

  // --- Tree State & Persistence ---
  const DEFAULT_NODES = [
    { id: 'root', title: 'My Knowledge', x: 0, y: 0, isRoot: true, parentId: null },
    { id: 'n1',   title: 'Data Structures', x: -180, y: -110, isRoot: false, parentId: 'root' },
    { id: 'n2',   title: 'Algorithms',      x: 180,  y: -110, isRoot: false, parentId: 'root' },
    { id: 'n3',   title: 'Computer Systems',x: -160, y: 120,  isRoot: false, parentId: 'root' },
    { id: 'n4',   title: 'Mathematics',     x: 160,  y: 120,  isRoot: false, parentId: 'root' }
  ];

  function loadNodes() {
    try {
      const stored = localStorage.getItem('adiverse_tree_nodes');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_NODES;
  }

  function persistNodes() {
    try {
      localStorage.setItem('adiverse_tree_nodes', JSON.stringify(nodes));
    } catch (e) {}
    if (window.AdiverseDashboard && typeof window.AdiverseDashboard.render === 'function') {
      window.AdiverseDashboard.render();
    }
  }

  let nodes = loadNodes();

  let selectedNodeId = 'root';
  let dialogMode = 'edit'; // 'edit' or 'add'
  let dialogTargetNodeId = null;

  // Viewport Pan / Zoom State
  let panX = 0;
  let panY = 0;
  let zoom = 1.0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  // Initialize Viewport Position to Canvas Center
  function centerViewport() {
    if (!mainStage) return;
    const rect = mainStage.getBoundingClientRect();
    panX = rect.width / 2;
    panY = rect.height / 2;
    zoom = rect.width < 640 ? 0.82 : 1.0;
    applyTransform();
  }

  function applyTransform() {
    if (viewport) {
      viewport.setAttribute('transform', `translate(${panX}, ${panY}) scale(${zoom})`);
    }
    updateToolbarPosition();
  }

  // --- Render Knowledge Tree ---
  function renderTree() {
    if (!edgesLayer || !nodesLayer) return;

    edgesLayer.innerHTML = '';
    nodesLayer.innerHTML = '';

    const nodeMap = new Map();
    nodes.forEach(n => nodeMap.set(n.id, n));

    // Render Edges
    nodes.forEach(node => {
      if (!node.parentId) return;
      const parent = nodeMap.get(node.parentId);
      if (!parent) return;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const isSelected = selectedNodeId === node.id || selectedNodeId === parent.id;
      path.setAttribute('class', `tree-edge ${isSelected ? 'active' : ''}`);

      // Smooth cubic curve
      const dx = node.x - parent.x;
      const dy = node.y - parent.y;
      const cx1 = parent.x + dx * 0.45;
      const cy1 = parent.y;
      const cx2 = parent.x + dx * 0.55;
      const cy2 = node.y;

      path.setAttribute('d', `M ${parent.x} ${parent.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${node.x} ${node.y}`);
      edgesLayer.appendChild(path);
    });

    // Render Nodes
    nodes.forEach(node => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `tree-node-group ${selectedNodeId === node.id ? 'selected' : ''}`);
      g.setAttribute('data-id', node.id);
      g.setAttribute('transform', `translate(${node.x}, ${node.y})`);

      // Text measurement simulation
      const textLen = node.title.length;
      const padX = node.isRoot ? 28 : 20;
      const padY = node.isRoot ? 18 : 12;
      const charWidth = node.isRoot ? 9.5 : 8.2;
      const pillWidth = Math.max(node.isRoot ? 160 : 120, textLen * charWidth + padX * 2);
      const pillHeight = node.isRoot ? 48 : 38;
      const rx = pillHeight / 2;

      // Capsule / Pill shape
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('class', `tree-node-shape ${node.isRoot ? 'tree-node-shape--root' : 'tree-node-shape--child'}`);
      rect.setAttribute('x', -pillWidth / 2);
      rect.setAttribute('y', -pillHeight / 2);
      rect.setAttribute('width', pillWidth);
      rect.setAttribute('height', pillHeight);
      rect.setAttribute('rx', rx);
      rect.setAttribute('ry', rx);
      g.appendChild(rect);

      // Icon / Dot for children
      if (!node.isRoot) {
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('class', 'tree-node-badge');
        dot.setAttribute('cx', -pillWidth / 2 + 16);
        dot.setAttribute('cy', 0);
        dot.setAttribute('r', 4.5);
        g.appendChild(dot);
      }

      // Title Text
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('class', `tree-node-text ${node.isRoot ? 'tree-node-text--root' : 'tree-node-text--child'}`);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('x', node.isRoot ? 0 : 6);
      text.setAttribute('y', 0);
      text.textContent = node.title;
      g.appendChild(text);

      // Node Event Listeners
      g.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        startNodeDrag(node.id, e.clientX, e.clientY);
      });

      g.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        e.stopPropagation();
        const touch = e.touches[0];
        startNodeDrag(node.id, touch.clientX, touch.clientY);
      }, { passive: false });

      g.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        if (window.AdiverseNotes) {
          window.AdiverseNotes.openTopic(node.id, node.title);
        } else {
          openEditDialog(node.id);
        }
      });

      nodesLayer.appendChild(g);
    });

    if (nodeCountBadge) {
      nodeCountBadge.textContent = `${nodes.length} Concept Nodes`;
    }

    updateToolbarPosition();
  }

  // --- Node Selection & Action Toolbar ---
  function selectNode(id) {
    selectedNodeId = id;
    renderTree();
  }

  function updateToolbarPosition() {
    if (!nodeToolbar || !selectedNodeId) {
      if (nodeToolbar) nodeToolbar.classList.remove('is-visible');
      return;
    }

    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node) {
      nodeToolbar.classList.remove('is-visible');
      return;
    }

    // Convert node coords to screen coords
    const screenX = panX + node.x * zoom;
    const screenY = panY + node.y * zoom;

    nodeToolbar.style.left = `${screenX}px`;
    nodeToolbar.style.top = `${screenY - (node.isRoot ? 32 : 26) * zoom}px`;
    nodeToolbar.classList.add('is-visible');

    // Root node cannot be deleted
    if (toolDeleteBtn) {
      toolDeleteBtn.style.display = node.isRoot ? 'none' : 'flex';
    }
  }

  // --- Dialog Management ---
  function openEditDialog(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    dialogMode = 'edit';
    dialogTargetNodeId = nodeId;
    if (dialogTitle) dialogTitle.textContent = 'Edit Concept Title';
    if (dialogInput) {
      dialogInput.value = node.title;
      dialogInput.placeholder = 'Enter concept name...';
    }
    if (dialogOverlay) dialogOverlay.classList.add('is-open');
    setTimeout(() => dialogInput && dialogInput.focus(), 50);
  }

  function openAddDialog(parentNodeId) {
    const parent = nodes.find(n => n.id === parentNodeId);
    if (!parent) return;

    dialogMode = 'add';
    dialogTargetNodeId = parentNodeId;
    if (dialogTitle) dialogTitle.textContent = `Add Concept under "${parent.title}"`;
    if (dialogInput) {
      dialogInput.value = '';
      dialogInput.placeholder = 'e.g. Binary Search, Dynamic Programming...';
    }
    if (dialogOverlay) dialogOverlay.classList.add('is-open');
    setTimeout(() => dialogInput && dialogInput.focus(), 50);
  }

  function closeDialog() {
    if (dialogOverlay) dialogOverlay.classList.remove('is-open');
    dialogTargetNodeId = null;
  }

  function saveDialog() {
    if (!dialogInput) return;
    const title = dialogInput.value.trim();
    if (!title) return;

    if (dialogMode === 'edit') {
      const node = nodes.find(n => n.id === dialogTargetNodeId);
      if (node) {
        node.title = title;
      }
    } else if (dialogMode === 'add') {
      const parent = nodes.find(n => n.id === dialogTargetNodeId);
      if (parent) {
        // Calculate dynamic branch angle
        const siblings = nodes.filter(n => n.parentId === parent.id);
        const count = siblings.length;
        const radius = parent.isRoot ? 170 : 130;
        
        let angle;
        if (parent.isRoot) {
          const angles = [-0.65, 0.65, -2.45, 2.45, -1.57, 1.57, 0, 3.14];
          angle = angles[count % angles.length];
        } else {
          // Spread outwardly
          const baseAngle = Math.atan2(parent.y, parent.x);
          const spread = (count % 2 === 0 ? 1 : -1) * (0.35 * Math.ceil(count / 2));
          angle = baseAngle + spread;
        }

        const newX = Math.round(parent.x + Math.cos(angle) * radius);
        const newY = Math.round(parent.y + Math.sin(angle) * radius);

        const newId = `node-${Date.now()}`;
        nodes.push({
          id: newId,
          title: title,
          x: newX,
          y: newY,
          isRoot: false,
          parentId: parent.id
        });
        selectedNodeId = newId;
      }
    }

    closeDialog();
    persistNodes();
    renderTree();
  }

  // --- Hierarchy, Subtree & Rebalancing Helpers ---
  function isDescendant(candidateChildId, candidateAncestorId) {
    if (!candidateChildId || !candidateAncestorId) return false;
    if (candidateChildId === candidateAncestorId) return true;
    let curr = nodes.find(n => n.id === candidateChildId);
    while (curr && curr.parentId) {
      if (curr.parentId === candidateAncestorId) return true;
      curr = nodes.find(n => n.id === curr.parentId);
    }
    return false;
  }

  function getDescendants(nodeId) {
    const result = new Set();
    function collect(id) {
      nodes.filter(n => n.parentId === id).forEach(child => {
        result.add(child.id);
        collect(child.id);
      });
    }
    collect(nodeId);
    return result;
  }

  function shiftDescendants(nodeId, dx, dy) {
    if (dx === 0 && dy === 0) return;
    const descendants = getDescendants(nodeId);
    descendants.forEach(id => {
      const dNode = nodes.find(n => n.id === id);
      if (dNode) {
        dNode.x += dx;
        dNode.y += dy;
      }
    });
  }

  function rebalanceSiblings(parentId) {
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) return;

    const siblings = nodes.filter(n => n.parentId === parentId);
    if (siblings.length === 0) return;

    if (parent.isRoot) {
      siblings.sort((a, b) => {
        const angleA = Math.atan2(a.y - parent.y, a.x - parent.x);
        const angleB = Math.atan2(b.y - parent.y, b.x - parent.x);
        return angleA - angleB;
      });

      const count = siblings.length;
      const radius = 200;
      const angleStep = (2 * Math.PI) / count;
      const baseOffset = -Math.PI / 4;

      siblings.forEach((sibling, i) => {
        const angle = baseOffset + i * angleStep;
        const targetX = Math.round(parent.x + Math.cos(angle) * radius);
        const targetY = Math.round(parent.y + Math.sin(angle) * radius);
        const deltaX = targetX - sibling.x;
        const deltaY = targetY - sibling.y;

        sibling.x = targetX;
        sibling.y = targetY;
        shiftDescendants(sibling.id, deltaX, deltaY);
      });
    } else {
      const grandParent = nodes.find(n => n.id === parent.parentId);
      const inAngle = grandParent 
        ? Math.atan2(parent.y - grandParent.y, parent.x - grandParent.x) 
        : Math.atan2(parent.y, parent.x);

      siblings.sort((a, b) => {
        const angleA = Math.atan2(a.y - parent.y, a.x - parent.x);
        const angleB = Math.atan2(b.y - parent.y, b.x - parent.x);
        return angleA - angleB;
      });

      const count = siblings.length;
      const radius = 135;
      const arcSpread = Math.min(Math.PI * 0.9, 0.45 * Math.max(1, count));
      const startAngle = inAngle - arcSpread / 2;
      const step = count > 1 ? arcSpread / (count - 1) : 0;

      siblings.forEach((sibling, i) => {
        const angle = count === 1 ? inAngle : startAngle + i * step;
        const targetX = Math.round(parent.x + Math.cos(angle) * radius);
        const targetY = Math.round(parent.y + Math.sin(angle) * radius);
        const deltaX = targetX - sibling.x;
        const deltaY = targetY - sibling.y;

        sibling.x = targetX;
        sibling.y = targetY;
        shiftDescendants(sibling.id, deltaX, deltaY);
      });
    }
  }

  function reorderSiblingsByAngle(parentId) {
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) return;

    const siblings = nodes.filter(n => n.parentId === parentId);
    if (siblings.length <= 1) return;

    siblings.forEach(s => {
      s._angle = Math.atan2(s.y - parent.y, s.x - parent.x);
    });
    siblings.sort((a, b) => a._angle - b._angle);
    siblings.forEach(s => delete s._angle);
  }

  function moveTopic(topicId, newParentId) {
    const topic = nodes.find(n => n.id === topicId);
    const newParent = nodes.find(n => n.id === newParentId);
    if (!topic || !newParent) return false;
    if (topic.isRoot) return false;
    if (isDescendant(newParentId, topicId)) return false;

    const oldParentId = topic.parentId;
    topic.parentId = newParentId;

    rebalanceSiblings(newParentId);
    if (oldParentId && oldParentId !== newParentId) {
      rebalanceSiblings(oldParentId);
    }

    persistNodes();
    renderTree();
    selectNode(topicId);
    return true;
  }

  function reorderSiblings(parentId, orderedIds) {
    if (!Array.isArray(orderedIds)) return false;
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) return false;

    const siblings = nodes.filter(n => n.parentId === parentId);
    if (siblings.length <= 1) return true;

    const count = orderedIds.length;
    const radius = parent.isRoot ? 200 : 135;
    const baseOffset = -Math.PI / 4;
    const angleStep = (2 * Math.PI) / count;

    orderedIds.forEach((id, i) => {
      const sibling = siblings.find(s => s.id === id);
      if (sibling) {
        const angle = baseOffset + i * angleStep;
        const targetX = Math.round(parent.x + Math.cos(angle) * radius);
        const targetY = Math.round(parent.y + Math.sin(angle) * radius);
        const deltaX = targetX - sibling.x;
        const deltaY = targetY - sibling.y;

        sibling.x = targetX;
        sibling.y = targetY;
        shiftDescendants(sibling.id, deltaX, deltaY);
      }
    });

    persistNodes();
    renderTree();
    return true;
  }

  // --- Node Drag & Drop Handlers ---
  let nodeDragActive = false;
  let draggedNodeId = null;
  let dragStartPointerX = 0;
  let dragStartPointerY = 0;
  let dragStartNodeX = 0;
  let dragStartNodeY = 0;
  let hasDragged = false;
  let currentDropTargetId = null;
  let initialDescendantOffsets = new Map();

  function startNodeDrag(nodeId, clientX, clientY) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    nodeDragActive = true;
    draggedNodeId = nodeId;
    dragStartPointerX = clientX;
    dragStartPointerY = clientY;
    dragStartNodeX = node.x;
    dragStartNodeY = node.y;
    hasDragged = false;
    currentDropTargetId = null;

    initialDescendantOffsets.clear();
    const descendants = getDescendants(nodeId);
    descendants.forEach(dId => {
      const dNode = nodes.find(n => n.id === dId);
      if (dNode) {
        initialDescendantOffsets.set(dId, {
          offsetX: dNode.x - node.x,
          offsetY: dNode.y - node.y
        });
      }
    });
  }

  function handleNodeDragMove(clientX, clientY) {
    if (!nodeDragActive || !draggedNodeId) return;

    const dist = Math.hypot(clientX - dragStartPointerX, clientY - dragStartPointerY);
    if (!hasDragged && dist < 4) return;

    hasDragged = true;

    if (nodeToolbar) nodeToolbar.classList.remove('is-visible');

    const node = nodes.find(n => n.id === draggedNodeId);
    if (!node) return;

    const dx = (clientX - dragStartPointerX) / zoom;
    const dy = (clientY - dragStartPointerY) / zoom;

    node.x = Math.round(dragStartNodeX + dx);
    node.y = Math.round(dragStartNodeY + dy);

    initialDescendantOffsets.forEach((offset, dId) => {
      const dNode = nodes.find(n => n.id === dId);
      if (dNode) {
        dNode.x = node.x + offset.offsetX;
        dNode.y = node.y + offset.offsetY;
      }
    });

    // Check drop targets
    const cursorCanvasX = (clientX - panX) / zoom;
    const cursorCanvasY = (clientY - panY) / zoom;

    let closestValidTarget = null;
    let closestInvalidTarget = null;
    let minDist = Infinity;

    nodes.forEach(target => {
      if (target.id === draggedNodeId) return;

      const targetDist = Math.hypot(cursorCanvasX - target.x, cursorCanvasY - target.y);
      const hitRadius = target.isRoot ? 90 : 65;

      if (targetDist < hitRadius && targetDist < minDist) {
        minDist = targetDist;
        const isSelfOrDescendant = isDescendant(target.id, draggedNodeId);
        if (node.isRoot || isSelfOrDescendant) {
          closestInvalidTarget = target.id;
          closestValidTarget = null;
        } else {
          closestValidTarget = target.id;
          closestInvalidTarget = null;
        }
      }
    });

    currentDropTargetId = closestValidTarget;

    updateVisualNodePositions();

    const nodeGroups = nodesLayer ? nodesLayer.querySelectorAll('.tree-node-group') : [];
    nodeGroups.forEach(g => {
      const gId = g.getAttribute('data-id');
      if (gId === draggedNodeId) {
        g.classList.add('is-dragging');
      } else {
        g.classList.remove('is-dragging');
      }

      if (gId === closestValidTarget) {
        g.classList.add('drop-target');
        g.classList.remove('drop-invalid');
      } else if (gId === closestInvalidTarget) {
        g.classList.add('drop-invalid');
        g.classList.remove('drop-target');
      } else {
        g.classList.remove('drop-target');
        g.classList.remove('drop-invalid');
      }
    });
  }

  function updateVisualNodePositions() {
    if (!nodesLayer || !edgesLayer) return;

    const nodeMap = new Map();
    nodes.forEach(n => nodeMap.set(n.id, n));

    const nodeGroups = nodesLayer.querySelectorAll('.tree-node-group');
    nodeGroups.forEach(g => {
      const gId = g.getAttribute('data-id');
      const n = nodeMap.get(gId);
      if (n) {
        g.setAttribute('transform', `translate(${n.x}, ${n.y})`);
      }
    });

    const edges = edgesLayer.querySelectorAll('path.tree-edge');
    let edgeIdx = 0;
    nodes.forEach(node => {
      if (!node.parentId) return;
      const parent = nodeMap.get(node.parentId);
      if (!parent) return;

      const edgePath = edges[edgeIdx++];
      if (edgePath) {
        const dx = node.x - parent.x;
        const dy = node.y - parent.y;
        const cx1 = parent.x + dx * 0.45;
        const cy1 = parent.y;
        const cx2 = parent.x + dx * 0.55;
        const cy2 = node.y;
        edgePath.setAttribute('d', `M ${parent.x} ${parent.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${node.x} ${node.y}`);
      }
    });
  }

  function endNodeDrag() {
    if (!nodeDragActive) return;

    const wasDragging = hasDragged;
    const activeId = draggedNodeId;
    const dropTarget = currentDropTargetId;

    nodeDragActive = false;
    draggedNodeId = null;
    hasDragged = false;
    currentDropTargetId = null;
    initialDescendantOffsets.clear();

    if (wasDragging) {
      const node = nodes.find(n => n.id === activeId);
      if (node) {
        if (dropTarget && !node.isRoot && !isDescendant(dropTarget, node.id)) {
          // Reparent to drop target!
          const oldParentId = node.parentId;
          node.parentId = dropTarget;
          rebalanceSiblings(dropTarget);
          if (oldParentId && oldParentId !== dropTarget) {
            rebalanceSiblings(oldParentId);
          }
        } else if (!dropTarget && node.parentId) {
          reorderSiblingsByAngle(node.parentId);
        }
      }

      persistNodes();
      renderTree();
      selectNode(activeId);
    } else {
      selectNode(activeId);
    }
  }

  // --- Delete Topic Confirmation Management ---
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function openDeleteConfirmDialog(node, descendantCount) {
    pendingDeleteNodeId = node.id;
    if (deleteMessage) {
      deleteMessage.innerHTML = `Topic <strong>"${escapeHtml(node.title)}"</strong> contains <strong>${descendantCount}</strong> child ${descendantCount === 1 ? 'topic' : 'topics'}. Deleting it will also remove all its child topics and saved notes. Are you sure you want to proceed?`;
    }
    if (deleteOverlay) {
      deleteOverlay.classList.add('is-open');
    }
  }

  function closeDeleteConfirmDialog() {
    pendingDeleteNodeId = null;
    if (deleteOverlay) {
      deleteOverlay.classList.remove('is-open');
    }
  }

  function executeDelete(nodeId) {
    const toDelete = new Set([nodeId, ...getDescendants(nodeId)]);
    nodes = nodes.filter(n => !toDelete.has(n.id));
    selectedNodeId = 'root';
    persistNodes();
    renderTree();
  }

  function deleteSelectedNode() {
    if (!selectedNodeId || selectedNodeId === 'root') return;
    
    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node) return;

    // Check if node has children
    const childNodes = nodes.filter(n => n.parentId === selectedNodeId);
    if (childNodes.length > 0) {
      const descendants = getDescendants(selectedNodeId);
      openDeleteConfirmDialog(node, descendants.size);
      return;
    }

    // Leaf node: delete directly
    executeDelete(selectedNodeId);
  }

  if (deleteCancelBtn) deleteCancelBtn.addEventListener('click', closeDeleteConfirmDialog);
  if (deleteConfirmBtn) {
    deleteConfirmBtn.addEventListener('click', () => {
      if (pendingDeleteNodeId) {
        executeDelete(pendingDeleteNodeId);
        closeDeleteConfirmDialog();
      }
    });
  }

  if (deleteOverlay) {
    deleteOverlay.addEventListener('click', (e) => {
      if (e.target === deleteOverlay) closeDeleteConfirmDialog();
    });
  }

  // --- Pan & Drag Event Listeners ---
  if (mainStage) {
    mainStage.addEventListener('mousedown', (e) => {
      // Ignore if clicking a button or dialog
      if (e.target.closest('.canvas-controls') || e.target.closest('.node-toolbar') || e.target.closest('.node-dialog')) {
        return;
      }

      isDragging = true;
      startX = e.clientX - panX;
      startY = e.clientY - panY;
      mainStage.classList.add('is-panning');

      // Click on background deselects
      if (e.target === svg || e.target.id === 'workspace-stage') {
        selectedNodeId = null;
        renderTree();
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (nodeDragActive) {
        handleNodeDragMove(e.clientX, e.clientY);
        return;
      }
      if (!isDragging) return;
      panX = e.clientX - startX;
      panY = e.clientY - startY;
      applyTransform();
    });

    window.addEventListener('mouseup', () => {
      if (nodeDragActive) {
        endNodeDrag();
        return;
      }
      if (isDragging) {
        isDragging = false;
        mainStage.classList.remove('is-panning');
      }
    });

    window.addEventListener('touchmove', (e) => {
      if (nodeDragActive && e.touches.length === 1) {
        handleNodeDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      if (nodeDragActive) {
        endNodeDrag();
      }
    });

    // Mouse wheel zoom
    mainStage.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.min(2.5, Math.max(0.4, zoom * zoomFactor));

      // Zoom towards mouse
      const rect = mainStage.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      panX = mouseX - (mouseX - panX) * (newZoom / zoom);
      panY = mouseY - (mouseY - panY) * (newZoom / zoom);
      zoom = newZoom;

      applyTransform();
    }, { passive: false });
  }

  // --- Toolbar & Control Button Bindings ---
  if (toolOpenNotesBtn) {
    toolOpenNotesBtn.addEventListener('click', () => {
      if (selectedNodeId) {
        const node = nodes.find(n => n.id === selectedNodeId);
        if (node && window.AdiverseNotes) {
          window.AdiverseNotes.openTopic(node.id, node.title);
        }
      }
    });
  }

  if (toolAddChildBtn) {
    toolAddChildBtn.addEventListener('click', () => {
      if (selectedNodeId) openAddDialog(selectedNodeId);
    });
  }

  if (toolEditBtn) {
    toolEditBtn.addEventListener('click', () => {
      if (selectedNodeId) openEditDialog(selectedNodeId);
    });
  }

  if (toolDeleteBtn) {
    toolDeleteBtn.addEventListener('click', deleteSelectedNode);
  }

  if (addConceptTopbarBtn) {
    addConceptTopbarBtn.addEventListener('click', () => {
      openAddDialog(selectedNodeId || 'root');
    });
  }

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      zoom = Math.min(2.5, zoom * 1.2);
      applyTransform();
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      zoom = Math.max(0.4, zoom * 0.8);
      applyTransform();
    });
  }

  if (recenterBtn) {
    recenterBtn.addEventListener('click', centerViewport);
  }

  // Dialog Button Listeners
  if (dialogSaveBtn) dialogSaveBtn.addEventListener('click', saveDialog);
  if (dialogCancelBtn) dialogCancelBtn.addEventListener('click', closeDialog);
  if (dialogInput) {
    dialogInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveDialog();
      if (e.key === 'Escape') closeDialog();
    });
  }

  // --- Mobile Sidebar Toggle & Navigation Items ---
  function openSidebar() {
    if (sidebar) sidebar.classList.add('is-open');
    if (backdrop) backdrop.classList.add('is-open');
  }

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-open');
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (sidebar && sidebar.classList.contains('is-open')) closeSidebar();
      else openSidebar();
    });
  }

  if (backdrop) backdrop.addEventListener('click', closeSidebar);

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      if (window.innerWidth <= 1024) closeSidebar();
    });
  });

  // Window resize handler
  window.addEventListener('resize', () => {
    applyTransform();
  });

  // Initial load
  centerViewport();
  renderTree();

  // Expose Workspace API for Global Search, Tree Organization & Navigation
  window.AdiverseWorkspace = {
    getNodes: () => nodes,
    selectNode: (id) => {
      selectedNodeId = id;
      renderTree();
    },
    moveTopic: (topicId, newParentId) => moveTopic(topicId, newParentId),
    reorderSiblings: (parentId, orderedIds) => reorderSiblings(parentId, orderedIds),
    getDescendants: (id) => getDescendants(id),
    isDescendant: (childId, ancestorId) => isDescendant(childId, ancestorId),
    deleteSelectedNode: () => deleteSelectedNode()
  };
});
