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
    const res = await fetch('/data/produkter.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const items = (data.entries || []).slice(0, 4);

    if (!items.length) {
      container.innerHTML =
        '<div class="empty-state"><div class="empty-state__icon">📚</div><p>Ingen varer registrert ennå – legg til via redigeringspanelet.</p></div>';
      return;
    }

    container.innerHTML = items.map((item) => `
      <div class="product-card">
        <div class="product-card__image">
          <img
            src="${item.bilde ? escapeHTML(item.bilde) : '/images/placeholder.svg'}"
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
  const res = await fetch('/data/oppdateringer.json');
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
    '<div class="empty-state"><div class="empty-state__icon">⏳</div><p>Laster...</p></div>';

  try {
    const entries = await fetchOppdateringer();
    const filtered = kategori === 'Alle'
      ? entries
      : entries.filter((e) => e.kategori === kategori);

    if (!filtered.length) {
      container.innerHTML =
        '<div class="empty-state"><div class="empty-state__icon">📭</div><p>Ingen oppdateringer i denne kategorien ennå.</p></div>';
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

  /* Determine today's Norwegian day name */
  const norskDager = ['Søndag','Mandag','Tirsdag','Onsdag','Torsdag','Fredag','Lørdag'];
  const todayNorsk = norskDager[new Date().getDay()];

  try {
    const res = await fetch('/data/innstillinger.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    if (hoursBody && Array.isArray(data.aapningstider)) {
      hoursBody.innerHTML = data.aapningstider.map((row) => `
        <tr class="${row.dag === todayNorsk ? 'today' : ''}">
          <td>${escapeHTML(row.dag)}</td>
          <td class="${row.stengt ? 'closed' : ''}">${row.stengt ? 'Stengt' : escapeHTML(row.tid)}</td>
        </tr>
      `).join('');
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

/* ---- Bootstrap ---- */

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  renderNyeste();
  renderOppdateringer();
  initFilterTabs();
  renderKontakt();
});
