/**
 * ADIVERSE  -  Interactive Scripts
 * 1. Navigation scroll & mobile toggle
 * 2. 3D Purple Tree Logo subtle interactive parallax / float response
 * 3. Smooth anchor scrolling
 * 4. IntersectionObserver reveals
 * 5. Knowledge Universe detailed graph animation & purple node highlight
 */

'use strict';

/* ============================================================
   1. NAVIGATION
   ============================================================ */

(function initNav() {
  const nav        = document.getElementById('site-nav');
  const hamburger  = document.getElementById('nav-hamburger');
  const mobileMenu = document.getElementById('nav-mobile');
  const mobileLinks = mobileMenu ? mobileMenu.querySelectorAll('.nav__mobile-link, .nav__mobile-cta') : [];

  if (!nav) return;

  const handleScroll = () => {
    const isScrolled = window.scrollY > 20;
    nav.classList.toggle('scrolled', isScrolled);
    nav.classList.toggle('is-scrolled', isScrolled);
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('scroll')) {
      const targetY = parseInt(params.get('scroll'), 10) || 0;
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, targetY);
      handleScroll();
      requestAnimationFrame(() => {
        document.documentElement.style.scrollBehavior = '';
      });
    }
  } catch (err) {}

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('is-open');
      hamburger.setAttribute('aria-expanded', String(isOpen));
      hamburger.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    });

    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('is-open');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.setAttribute('aria-label', 'Open navigation menu');
      });
    });

    document.addEventListener('click', (e) => {
      if (mobileMenu.classList.contains('is-open') &&
          !nav.contains(e.target) &&
          !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('is-open');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.setAttribute('aria-label', 'Open navigation menu');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) {
        mobileMenu.classList.remove('is-open');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.setAttribute('aria-label', 'Open navigation menu');
        hamburger.focus();
      }
    });
  }
})();


/* ============================================================
   2. 3D PURPLE TREE SCULPTURE POINTER INTERACTION
   Smooth, subtle tilt/elevation on mouse move
   ============================================================ */

(function initSculptureMotion() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const stage = document.querySelector('.hero__sculpture-container');
  const sculpture = document.querySelector('.hero__sculpture-img');
  const shadow = document.querySelector('.hero__sculpture-shadow');

  if (!stage || !sculpture) return;

  let mouseX = 0;
  let mouseY = 0;
  let currentX = 0;
  let currentY = 0;
  let rafId = null;

  const onMouseMove = (e) => {
    const rect = stage.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Normalised delta (-1 to 1)
    mouseX = (e.clientX - centerX) / (window.innerWidth / 2);
    mouseY = (e.clientY - centerY) / (window.innerHeight / 2);
  };

  const update = () => {
    currentX += (mouseX - currentX) * 0.08;
    currentY += (mouseY - currentY) * 0.08;

    const rotateY = currentX * 12; // degrees
    const rotateX = -currentY * 10;
    const translateY = currentY * 8 - 4; // subtle floating breathing offset

    sculpture.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(${translateY}px)`;
    if (shadow) {
      shadow.style.transform = `translateX(calc(-50% + ${currentX * 14}px)) scale(${1 - Math.abs(currentY) * 0.08})`;
    }

    rafId = requestAnimationFrame(update);
  };

  window.addEventListener('mousemove', onMouseMove, { passive: true });
  rafId = requestAnimationFrame(update);

  // Return to center when mouse leaves window
  document.addEventListener('mouseleave', () => {
    mouseX = 0;
    mouseY = 0;
  });
})();


/* ============================================================
   3. SMOOTH ANCHOR SCROLLING
   ============================================================ */

(function initSmoothScroll() {
  const NAV_HEIGHT = () => parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--nav-height') || '72'
  );

  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;

    const targetId = anchor.getAttribute('href').slice(1);
    if (!targetId) return;

    const target = document.getElementById(targetId);
    if (!target) return;

    e.preventDefault();

    const top = target.getBoundingClientRect().top + window.scrollY - NAV_HEIGHT() - 16;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  });
})();


/* ============================================================
   4. SCROLL REVEAL (IntersectionObserver)
   ============================================================ */

(function initReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
    return;
  }

  const targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
  );

  targets.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      el.classList.add('is-visible');
    } else {
      observer.observe(el);
    }
  });
})();


/* ============================================================
   5. KNOWLEDGE UNIVERSE SVG ANIMATION SEQUENCE
   ============================================================ */

(function initUniverseAnimation() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.graph-edge--animate, .graph-node--animate').forEach(el => {
      el.style.opacity = '1';
      if (el.classList.contains('graph-edge--animate')) {
        el.style.strokeDashoffset = '0';
      }
    });
    return;
  }

  const canvas = document.getElementById('universe-canvas');
  if (!canvas) return;

  let animated = false;

  const runAnimation = () => {
    if (animated) return;
    animated = true;

    const edges = canvas.querySelectorAll('.graph-edge--animate');
    const nodes = canvas.querySelectorAll('.graph-node--animate');

    edges.forEach(edge => {
      if (edge.getAttribute('stroke-dasharray')) {
        // Keep dashed patterns intact
        return;
      }
      if (edge.getTotalLength) {
        const len = edge.getTotalLength();
        edge.style.strokeDasharray = len;
        edge.style.strokeDashoffset = len;
      }
    });

    edges.forEach((edge, i) => {
      const delay = i * 55;
      edge.style.animationDelay = `${delay}ms`;
      edge.style.animationDuration = `${550 + i * 25}ms`;
    });

    nodes.forEach((node, i) => {
      const delay = edges.length * 40 + i * 45;
      node.style.animationDelay = `${delay}ms`;
    });

    canvas.classList.add('is-animating');
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          runAnimation();
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  observer.observe(canvas);
})();


/* ============================================================
   6. UNIVERSE NODE HOVER INTERACTIONS
   Highlight connected nodes with purple glow & dim others
   ============================================================ */

(function initNodeHover() {
  const canvas = document.getElementById('universe-canvas');
  if (!canvas) return;

  const nodes = canvas.querySelectorAll('[data-node-id]');
  const edges = canvas.querySelectorAll('[data-edge-from][data-edge-to]');

  if (!nodes.length) return;

  const setDimState = (hoveredId) => {
    const connected = new Set([hoveredId]);
    edges.forEach(edge => {
      const from = edge.dataset.edgeFrom;
      const to   = edge.dataset.edgeTo;
      if (from === hoveredId) connected.add(to);
      if (to   === hoveredId) connected.add(from);
    });

    nodes.forEach(node => {
      const id = node.dataset.nodeId;
      const isConnected = connected.has(id);
      node.style.transition = 'opacity 220ms ease, transform 220ms ease, filter 220ms ease';
      node.style.opacity    = isConnected ? '1' : '0.22';
      node.style.transform  = id === hoveredId ? 'scale(1.08)' : 'scale(1)';
      if (id === hoveredId) {
        node.style.filter = 'drop-shadow(0 0 14px rgba(166, 107, 239, 0.85))';
      } else {
        node.style.filter = '';
      }
    });

    edges.forEach(edge => {
      const from = edge.dataset.edgeFrom;
      const to   = edge.dataset.edgeTo;
      const isConnected = connected.has(from) && connected.has(to);
      edge.style.transition = 'opacity 220ms ease, stroke-width 220ms ease, stroke 220ms ease';
      edge.style.opacity    = isConnected ? '1' : '0.12';
      if (isConnected) {
        edge.style.stroke = '#A66BEF';
      }
    });
  };

  const clearDimState = () => {
    nodes.forEach(node => {
      node.style.opacity   = '';
      node.style.transform = '';
      node.style.filter    = '';
    });
    edges.forEach(edge => {
      edge.style.opacity   = '';
      edge.style.stroke    = '';
    });
  };

  nodes.forEach(node => {
    node.addEventListener('mouseenter', () => setDimState(node.dataset.nodeId));
    node.addEventListener('mouseleave', clearDimState);
    node.addEventListener('focus', () => setDimState(node.dataset.nodeId));
    node.addEventListener('blur',  clearDimState);
  });
})();
