'use strict';

// Shared behavior for the static school pages. Content and links work without JS.
function toggleTheme() {
  const mode = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = mode;
  try { localStorage.setItem('m11-theme', mode); } catch (_) {}
  syncTheme();
}
function syncTheme() {
  const button = document.getElementById('theme-toggle');
  if (!button) return;
  const dark = document.documentElement.dataset.theme === 'dark';
  button.textContent = dark ? '☀' : '◐';
  button.setAttribute('aria-label', dark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap');
}
function toggleMenu(force) {
  const menu = document.getElementById('menu');
  if (!menu) return;
  const open = typeof force === 'boolean' ? force : !menu.classList.contains('open');
  menu.classList.toggle('open', open);
  const button = document.querySelector('.menu-toggle');
  button.setAttribute('aria-expanded', String(open));
  button.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
  button.textContent = open ? '✕' : '☰';
}
syncTheme();
document.querySelectorAll('#menu a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));
document.addEventListener('click', event => {
  if (!event.target.closest('header')) toggleMenu(false);
});

let lbItems = [];
let lbIdx = 0;
let lbReturnFocus;
let previousOverflow = '';
function openLightbox(src) {
  const box = document.getElementById('lightbox');
  if (!box) return;
  const source = Array.from(document.images).find(img => img.src === src && img.id !== 'lb-img');
  const group = source && source.closest('.foto-grid, .galeri, .artikel, .feature');
  lbItems = group ? Array.from(group.querySelectorAll('img')) : source ? [source] : [];
  if (!lbItems.length) return;
  lbIdx = Math.max(0, lbItems.findIndex(img => img.src === src));
  lbReturnFocus = document.activeElement;
  previousOverflow = document.body.style.overflow;
  showLb();
  box.classList.add('open');
  document.body.style.overflow = 'hidden';
  document.querySelectorAll('body > :not(.lightbox):not(script)').forEach(el => {
    if (!el.inert) { el.inert = true; el.dataset.lbInert = 'true'; }
  });
  box.querySelector('.lb-close').focus();
}
function closeLightbox() {
  const box = document.getElementById('lightbox');
  if (!box || !box.classList.contains('open')) return;
  box.classList.remove('open');
  document.body.style.overflow = previousOverflow;
  document.querySelectorAll('[data-lb-inert]').forEach(el => { el.inert = false; delete el.dataset.lbInert; });
  if (lbReturnFocus) lbReturnFocus.focus();
}
function lightboxBg(event) { if (event.target.id === 'lightbox') closeLightbox(); }
function showLb() {
  const original = lbItems[lbIdx];
  const image = document.getElementById('lb-img');
  image.src = original.src;
  image.alt = original.alt;
  document.getElementById('lb-counter').textContent = `${lbIdx + 1} / ${lbItems.length} — ${original.alt}`;
  document.querySelectorAll('.lb-prev, .lb-next').forEach(button => { button.hidden = lbItems.length < 2; });
}
function lbNav(direction) {
  if (!lbItems.length) return;
  lbIdx = (lbIdx + direction + lbItems.length) % lbItems.length;
  showLb();
}
document.querySelectorAll('img[onclick*="openLightbox"]').forEach(img => {
  img.tabIndex = 0;
  img.setAttribute('role', 'button');

  img.setAttribute('aria-label', 'Perbesar foto: ' + img.alt);
  img.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openLightbox(img.src); }
  });
});
document.addEventListener('keydown', event => {
  const box = document.getElementById('lightbox');
  if (box && box.classList.contains('open')) {
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowLeft') { event.preventDefault(); lbNav(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); lbNav(1); }
    if (event.key === 'Tab') {
      const buttons = Array.from(box.querySelectorAll('button')).filter(b => !b.hidden);
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  } else if (event.key === 'Escape') {
    const wasOpen = document.getElementById('menu')?.classList.contains('open');
    toggleMenu(false);
    if (wasOpen) document.querySelector('.menu-toggle').focus();
  }
});

document.querySelectorAll('.scroll-row').forEach((row, index) => {
  row.id ||= `card-row-${index}`;
  const sectionTitle = row.closest('section')?.querySelector('h2')?.textContent || 'kartu';
  const controls = document.createElement('div');
  controls.className = 'row-controls';
  const hint = document.createElement('span');
  hint.textContent = 'Jelajahi ' + sectionTitle.toLowerCase();
  controls.append(hint);
  const buttons = [-1, 1].map(direction => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = direction < 0 ? '←' : '→';
    button.setAttribute('aria-label', `${sectionTitle} ${direction < 0 ? 'sebelumnya' : 'berikutnya'}`);
    button.setAttribute('aria-controls', row.id);
    button.addEventListener('click', () => row.scrollBy({left: direction * (row.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(row).gap)), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'}));
    controls.append(button);
    return button;
  });
  row.before(controls);
  const update = () => {
    controls.hidden = row.scrollWidth <= row.clientWidth + 2;
    buttons[0].disabled = row.scrollLeft <= 2;
    buttons[1].disabled = row.scrollLeft >= row.scrollWidth - row.clientWidth - 2;
  };
  row.addEventListener('scroll', update, {passive:true});
  new ResizeObserver(update).observe(row);
  update();
});

const today = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Jakarta', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date());
document.querySelectorAll('[data-event-end]').forEach(card => {
  const label = today > card.dataset.eventEnd ? 'Kegiatan selesai' : card.dataset.eventStart && today < card.dataset.eventStart ? 'Akan datang' : 'Agenda sekolah';
  const badge = document.createElement('span');
  badge.className = 'event-status';
  badge.textContent = label;
  card.querySelector('.kartu-badan')?.prepend(badge);
});
const jenjang = document.getElementById('jenjang');
if (jenjang) jenjang.addEventListener('change', () => {
  document.getElementById('admission-chat').href = 'https://wa.me/6285261053664?text=' + encodeURIComponent(`Halo Miss, saya ingin informasi pendaftaran ${jenjang.value} Methodist-11. Mohon info biaya, persyaratan, dan jadwal kunjungan. Terima kasih.`);
});


// Show the current announcement once per tab session; keep a manual opener.
const announcementDialog = document.getElementById('announcement-dialog');
if (announcementDialog) {
  const seenKey = 'm11-announcement-' + announcementDialog.dataset.announcement;
  let announcementFocus;
  let announcementOverflow;
  const showAnnouncement = () => {
    if (announcementDialog.open) return;
    announcementFocus = document.activeElement;
    announcementOverflow = document.body.style.overflow;
    announcementDialog.showModal();
    document.body.style.overflow = 'hidden';
    try { sessionStorage.setItem(seenKey, 'seen'); } catch (_) {}
  };
  document.querySelectorAll('[data-open-announcement]').forEach(button => button.addEventListener('click', showAnnouncement));
  announcementDialog.querySelector('[data-close-announcement]').addEventListener('click', () => announcementDialog.close());
  announcementDialog.addEventListener('click', event => {
    const rect = announcementDialog.getBoundingClientRect();
    if (event.target === announcementDialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) announcementDialog.close();
  });
  announcementDialog.addEventListener('close', () => {
    document.body.style.overflow = announcementOverflow;
    if (announcementFocus) announcementFocus.focus();
  });
  let seen = false;
  try { seen = sessionStorage.getItem(seenKey) === 'seen'; } catch (_) {}
  if (!seen && today <= announcementDialog.dataset.expires) showAnnouncement();
}
