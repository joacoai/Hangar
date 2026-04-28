/* ============================================================
   HANGAR FITNESS — main.js
   Animaciones de texto premium (sin decode):
     · Hero title  → word split slide-up (clip-path por palabra)
     · Section label → wipe horizontal izquierda→derecha
     · Títulos, cards → fade + translateY suave (stagger)
     · Stats → counter animado
============================================================ */

// ─── Detectar preferencia de movimiento reducido ───────────
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── WORD SPLIT ─────────────────────────────────────────────
// Divide el texto de un elemento leaf en palabras envueltas.
// Cada palabra: <span class="sr-word-outer"><span class="sr-word-inner" style="--wi: N">word</span></span>
// El outer tiene overflow:hidden → el inner sube desde abajo.
function splitWords(el) {
  const text = el.textContent.trim();
  if (!text || el.children.length > 0) return; // solo leaf nodes

  const words = text.split(/(\s+)/); // preserva espacios
  el.textContent = '';

  let wordIdx = 0;
  words.forEach((part) => {
    if (/^\s+$/.test(part)) {
      // espacio → nodo de texto directo
      el.appendChild(document.createTextNode(part));
    } else {
      const outer = document.createElement('span');
      outer.className = 'sr-word-outer';

      const inner = document.createElement('span');
      inner.className = 'sr-word-inner';
      inner.style.setProperty('--wi', wordIdx);
      inner.textContent = part;

      outer.appendChild(inner);
      el.appendChild(outer);
      wordIdx++;
    }
  });

  el.dataset.wordCount = wordIdx;
}

// ─── SCROLL REVEAL ──────────────────────────────────────────
function initScrollReveal() {

  // 1. Word-split en hero title spans (leaf nodes, estilos via CSS padre)
  const heroSpans = document.querySelectorAll(
    '.hero-title .block-solid, .hero-title .block-yellow, .hero-title .block-outline'
  );
  heroSpans.forEach((el) => {
    if (!REDUCED) splitWords(el);
    el.classList.add('sr-hero-span');
  });

  // 2. Section labels → wipe horizontal
  document.querySelectorAll('.section-label').forEach((el) => {
    el.classList.add('sr-label');
  });

  // 3. Elementos generales con fade + slide
  const generalSelectors = [
    '.hero-eyebrow',
    '.hero-badge',
    '.hero-subtitle',
    '.hero-ctas',
    '.hero-info-bar',
    '.section-title',
    '.section-sub',
    '.deco-line',
    '.bp-card',
    '.plan-card',
    '.crew-card',
    '.stat-item',
    '.vm-card',
    '.fi-item',
    '.join-card',
    '.info-box',
    '.sponsors-bar',
    '.cal-accordion',
    '.form-wrapper',
    '.map-tactical',
    '.cta-band .section-title',
    '.cta-band .section-sub',
    '.cta-band .btn',
    '.gallery-item',
    '.review-card-hg',
    '.footer-grid > div',
  ];

  generalSelectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      // Calcular stagger según posición entre hermanos con la misma clase
      const siblings = Array.from(el.parentElement.children).filter((c) =>
        c.classList.contains(el.classList[0])
      );
      const idx = siblings.indexOf(el);
      el.style.setProperty('--sr-delay', `${Math.min(idx * 0.055, 0.33)}s`);

      if (el.closest('.hero')) {
        el.classList.add('sr-item', 'sr-hero');
      } else {
        el.classList.add('sr-item');
      }
    });
  });

  // ── Observer entrada ──────────────────────────────────────
  const enterObs = new IntersectionObserver(
    (entries) => {
      entries.forEach(({ target: el, isIntersecting }) => {
        if (!isIntersecting) return;
        clearTimeout(el._exitTimer);
        el.classList.add('sr-visible');
        el.classList.remove('sr-out');
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -36px 0px' }
  );

  // ── Observer salida (resetea para re-animar al subir) ─────
  const exitObs = new IntersectionObserver(
    (entries) => {
      entries.forEach(({ target: el, isIntersecting }) => {
        if (isIntersecting) { clearTimeout(el._exitTimer); return; }
        el._exitTimer = setTimeout(() => {
          el.classList.remove('sr-visible');
          el.classList.add('sr-out');
        }, 100);
      });
    },
    { threshold: 0, rootMargin: '80px 0px 80px 0px' }
  );

  // Observar todo
  document.querySelectorAll('.sr-item, .sr-label, .sr-hero-span').forEach((el) => {
    enterObs.observe(el);
    exitObs.observe(el);
  });

  // Hero: animar inmediatamente con stagger
  const heroEls = document.querySelectorAll('.sr-hero, .sr-hero-span');
  heroEls.forEach((el, i) => {
    setTimeout(() => {
      el.classList.add('sr-visible');
    }, 80 + i * 75);
  });
}

// ─── STATS COUNTER ──────────────────────────────────────────
function animateCount(el) {
  const raw = el.dataset.original || el.textContent.trim();
  const match = raw.match(/([+\-]?)(\d+)([+\w\s]*)/);
  if (!match) return;

  const prefix  = match[1] || '';
  const target  = parseInt(match[2]);
  const suffix  = match[3] || '';
  const dur     = REDUCED ? 0 : 1200;
  const start   = performance.now();
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  if (dur === 0) { el.textContent = raw; return; }

  const tick = (now) => {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = prefix + Math.round(easeOut(p) * target) + suffix;
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = raw;
  };
  requestAnimationFrame(tick);
}

function initStatsCounter() {
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach(({ target: el, isIntersecting }) => {
        if (isIntersecting && !el.dataset.counted) {
          el.dataset.counted = '1';
          animateCount(el);
        }
        if (!isIntersecting) delete el.dataset.counted;
      });
    },
    { threshold: 0.6 }
  );

  document.querySelectorAll('.stat-number').forEach((el) => {
    if (!el.dataset.original) el.dataset.original = el.textContent.trim();
    obs.observe(el);
  });
}

// ─── NAVBAR ─────────────────────────────────────────────────
function initNavbar() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('navbar--scrolled', window.scrollY > 60);
  }, { passive: true });
}

// ─── PAGE TRANSITION ────────────────────────────────────────
function initPageTransition() {
  document.body.classList.add('page-loaded');
  document.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') ||
        href.startsWith('mailto') || href.startsWith('tel')) return;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.body.classList.add('page-leaving');
      setTimeout(() => { window.location.href = href; }, REDUCED ? 0 : 280);
    });
  });
}

// ─── INIT ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initScrollReveal();
  initStatsCounter();
  initPageTransition();
});
