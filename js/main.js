/* ============================================================
   Tromsø Bruktbokhandel – main.js
   Nav, rendering fra JSON, filter, åpningstider
   ============================================================ */

'use strict';

/* ---- Helpers ---- */

function escapeHTML(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('nb-NO', { year: 'numeric', month: 'long', day: 'numeric' });
}

/* ---- Nav ---- */

function initNav() {
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('nav-links');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', String(open));
    });

    /* Close on outside click */
    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });

    /* Close on Escape */
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        navLinks.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* Highlight active page link */
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__links a').forEach((link) => {
    const linkFile = link.getAttribute('href').split('/').pop();
    if (
      linkFile === currentFile ||
      (currentFile === '' && linkFile === 'index.html')
    ) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
}

/* ---- Forside: Nyeste i butikken ---- */

async function renderNyeste() {
  const container = document.getElementById('nyeste-grid');
  if (!container) return;

  try {
    const res = await fetch('data/produkter.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const items = (data.entries || []).slice(0, 4);

    if (!items.length) {
      container.innerHTML =
        '<div class="empty-state"><p>Ingen varer registrert ennå – legg til via redigeringspanelet.</p></div>';
      return;
    }

    container.innerHTML = items.map((item) => `
      <div class="product-card">
        <div class="product-card__image">
          <img
            src="${item.bilde ? escapeHTML(item.bilde) : 'images/placeholder.svg'}"
            alt="${escapeHTML(item.navn)}"
            loading="lazy"
            width="240" height="240">
        </div>
        <div class="product-card__body">
          <div class="product-card__category">${escapeHTML(item.kategori)}</div>
          <div class="product-card__name">${escapeHTML(item.navn)}</div>
          ${item.beskrivelse
            ? `<p class="card__text" style="margin-top:.35rem;font-size:.82rem">${escapeHTML(item.beskrivelse)}</p>`
            : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML =
      '<div class="empty-state"><p>Kunne ikke laste inn varer.</p></div>';
  }
}

/* ---- Oppdateringer ---- */

let _cachedOppdateringer = null;

async function fetchOppdateringer() {
  if (_cachedOppdateringer) return _cachedOppdateringer;
  const res = await fetch('data/oppdateringer.json');
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  _cachedOppdateringer = data.entries || [];
  return _cachedOppdateringer;
}

async function renderOppdateringer(filter) {
  const container = document.getElementById('oppdateringer-grid');
  if (!container) return;

  const kategori = filter || 'Alle';
  container.innerHTML =
    '<div class="empty-state"><p>Laster...</p></div>';

  try {
    const entries = await fetchOppdateringer();
    const filtered = kategori === 'Alle'
      ? entries
      : entries.filter((e) => e.kategori === kategori);

    if (!filtered.length) {
      container.innerHTML =
        '<div class="empty-state"><p>Ingen oppdateringer i denne kategorien ennå.</p></div>';
      return;
    }

    container.innerHTML = filtered.map((item) => `
      <article class="card">
        ${item.bilde
          ? `<div class="card__image"><img src="${escapeHTML(item.bilde)}" alt="${escapeHTML(item.tittel)}" loading="lazy"></div>`
          : ''}
        <div class="card__body">
          <div class="card__tag">${escapeHTML(item.kategori)}</div>
          <div class="card__date">${formatDate(item.dato)}</div>
          <h3 class="card__title">${escapeHTML(item.tittel)}</h3>
          <p class="card__text">${escapeHTML(item.tekst)}</p>
        </div>
      </article>
    `).join('');
  } catch (err) {
    container.innerHTML =
      '<div class="empty-state"><p>Kunne ikke laste inn oppdateringer.</p></div>';
  }
}

function initFilterTabs() {
  const tabs = document.querySelectorAll('.filter-tab');
  if (!tabs.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => { t.classList.remove('active'); t.setAttribute('aria-pressed', 'false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-pressed', 'true');
      renderOppdateringer(tab.dataset.filter);
    });
  });
}

/* ---- Kontakt: render fra innstillinger.json ---- */

async function renderKontakt() {
  const hoursBody = document.getElementById('hours-body');
  const adresseEl = document.getElementById('kontakt-adresse');
  const tlfEl     = document.getElementById('kontakt-tlf');
  const epostEl   = document.getElementById('kontakt-epost');
  const fbEl      = document.getElementById('kontakt-facebook');

  if (!hoursBody && !adresseEl) return;

  try {
    const res = await fetch('data/innstillinger.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    if (hoursBody && data.aapningstider_tekst) {
      hoursBody.textContent = data.aapningstider_tekst;
    }

    if (adresseEl && data.adresse) adresseEl.textContent = data.adresse;

    if (tlfEl && data.telefon) {
      tlfEl.textContent = data.telefon;
      tlfEl.href = 'tel:+47' + data.telefon.replace(/\s/g, '');
    }

    if (epostEl && data.epost) {
      epostEl.textContent = data.epost;
      epostEl.href = 'mailto:' + data.epost;
    }

    if (fbEl && data.facebook) {
      fbEl.href = escapeHTML(data.facebook);
    }
  } catch {
    /* Fall back gracefully – static HTML content in kontakt.html remains */
  }
}

/* ---- Forside ---- */

async function renderForside() {
  const onPage = document.getElementById('forside-om-oss') ||
                 document.getElementById('forside-galleri-grid');
  if (!onPage) return;

  try {
    const res = await fetch('data/forside.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    const overskriftEl = document.getElementById('hero-title');
    if (overskriftEl && data.hero_overskrift) overskriftEl.textContent = data.hero_overskrift;

    const undertekstEl = document.getElementById('forside-hero-undertekst');
    if (undertekstEl && data.hero_undertekst) undertekstEl.textContent = data.hero_undertekst;

    const omOssEl = document.getElementById('forside-om-oss');
    if (omOssEl && data.om_oss) omOssEl.textContent = data.om_oss;

    const galleriGrid = document.getElementById('forside-galleri-grid');
    if (galleriGrid && Array.isArray(data.galleri) && data.galleri.length) {
      galleriGrid.innerHTML = data.galleri.map((img) => `
        <div class="image-card">
          <img src="${escapeHTML(img.bilde)}" alt="${escapeHTML(img.alt)}" loading="lazy" width="400" height="300">
        </div>
      `).join('');
    }
  } catch {
    /* Fallback til statisk HTML-innhold i index.html */
  }
}

/* ---- Butikken ---- */

async function renderButikken() {
  const onPage = document.getElementById('butikken-kategorier-grid') ||
                 document.getElementById('butikken-galleri-grid');
  if (!onPage) return;

  try {
    const res = await fetch('data/butikken.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    const kategorierGrid = document.getElementById('butikken-kategorier-grid');
    if (kategorierGrid && Array.isArray(data.kategorier) && data.kategorier.length) {
      kategorierGrid.innerHTML = data.kategorier.map((k) => `
        <div class="category-item">
          <div class="category-item__name">${escapeHTML(k.navn)}</div>
          <p class="category-item__desc">${escapeHTML(k.beskrivelse)}</p>
        </div>
      `).join('');
    }

    const galleriGrid = document.getElementById('butikken-galleri-grid');
    if (galleriGrid && Array.isArray(data.galleri) && data.galleri.length) {
      galleriGrid.innerHTML = data.galleri.map((img) => `
        <div class="image-card">
          <img src="${escapeHTML(img.bilde)}" alt="${escapeHTML(img.alt)}" loading="lazy" width="400" height="300">
        </div>
      `).join('');
    }
  } catch {
    /* Fallback til statisk HTML-innhold i butikken.html */
  }
}

/* ---- Legoloftet ---- */

async function renderLegoloftet() {
  const onPage =
    document.getElementById('lego-kategorier-grid') ||
    document.getElementById('lego-galleri-grid');
  if (!onPage) return;

  try {
    const res = await fetch('data/legoloftet.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    /* Overskrift */
    const overskriftEl = document.getElementById('lego-intro-overskrift');
    if (overskriftEl && data.intro_overskrift) overskriftEl.textContent = data.intro_overskrift;

    /* Introduksjonstekst */
    const introEl = document.getElementById('lego-intro-tekst');
    if (introEl && data.intro_tekst) introEl.textContent = data.intro_tekst;

    /* Kategorier */
    const kategorierGrid = document.getElementById('lego-kategorier-grid');
    if (kategorierGrid && Array.isArray(data.kategorier) && data.kategorier.length) {
      kategorierGrid.innerHTML = data.kategorier.map((k) => `
        <div class="lego-category-card">
          <div class="lego-category-card__name">${escapeHTML(k.navn)}</div>
          <p class="lego-category-card__desc">${escapeHTML(k.beskrivelse)}</p>
        </div>
      `).join('');
    }

    /* Galleri */
    const galleriGrid = document.getElementById('lego-galleri-grid');
    if (galleriGrid && Array.isArray(data.galleri) && data.galleri.length) {
      galleriGrid.innerHTML = data.galleri.map((img) => `
        <div class="lego-gallery__item">
          <img
            src="${escapeHTML(img.bilde)}"
            alt="${escapeHTML(img.alt)}"
            loading="lazy">
        </div>
      `).join('');
    }

  } catch {
    /* Fallback til statisk HTML-innhold i legoloftet.html */
  }

  /* Åpningstider fra innstillinger.json */
  const hoursText = document.getElementById('lego-hours-text');
  if (!hoursText) return;

  try {
    const res = await fetch('data/innstillinger.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data.aapningstider_tekst) {
      hoursText.textContent = data.aapningstider_tekst;
    }
  } catch {
    /* Åpningstider vises ikke – ikke kritisk */
  }
}

/* ---- Theme toggle ---- */

function initTheme() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  updateToggleIcon(current);
  btn.addEventListener('click', () => {
    const curr = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = curr === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateToggleIcon(next);
  });
}

function updateToggleIcon(theme) {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.textContent = theme === 'dark' ? '☀' : '☾';
  btn.setAttribute('aria-label', theme === 'dark' ? 'Bytt til lyst tema' : 'Bytt til mørkt tema');
}

/* ---- Bootstrap ---- */

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initTheme();
  renderNyeste();
  renderOppdateringer();
  initFilterTabs();
  renderKontakt();
  renderLegoloftet();
  renderForside();
  renderButikken();
});
