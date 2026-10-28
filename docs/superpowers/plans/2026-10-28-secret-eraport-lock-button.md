# Secret Eraport Lock Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan tombol rahasia ikon kunci kecil di bawah tombol mode gelap/terang pada header navigasi yang membuka portal e-Rapor (`https://ynserver.my.id/`) setelah diklik 4 kali cepat (double-tap lalu double-tap dalam rentang 1,5 detik).

**Architecture:**
- **Markup & Layout:** Membungkus `#theme-toggle` dan tombol rahasia `<button class="secret-lock-btn" id="secret-lock-btn" aria-label="Portal" type="button">🔒</button>` dalam pembungkus vertikal `.nav-theme-box` di `.nav-actions`.
- **Styling:** CSS di `assets/css/style.css` menyetel ukuran ikon kunci kecil (11px), transparan halus (opacity ~0.35, saat hover 0.8), latar transparan, tanpa border tebal agar estetis dan tersembunyi.
- **Logika Interaksi:** Di `assets/js/site.js`, event listener click mencatat interval dan jumlah tap. Jika jeda <= 800ms dan durasi total <= 1500ms mencapai 4 tap, buka `https://ynserver.my.id/` di tab baru lalu reset counter.

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript.

**Spec:** Desain disetujui pengguna pada 28 Oktober 2026.

## Global Constraints
- Murni Vanilla JS tanpa library luar.
- Bekerja presisi baik di klik mouse PC maupun tap layar ponsel.
- Tidak menggeser tombol hamburger menu di layar ponsel/tablet.
- Sinkron di seluruh 24 berkas HTML (`index.html` dan 23 sub-halaman di `pages/`).

## Review Focus
- Klik 1 atau 2 kali tidak boleh membuka link.
- Jika pengguna berhenti menekan lebih dari 800ms, counter wajib kembali ke 0.
- Mode gelap dan mode terang memiliki tampilan ikon yang senada dan tidak merusak layout header.

---

### Task 1: Styling CSS untuk Pembungkus Tombol Tema & Ikon Kunci Rahasia

**Files:**
- Modify: `assets/css/style.css`

- [ ] **Step 1: Tambahkan kelas `.nav-theme-box` dan `.secret-lock-btn` pada `assets/css/style.css`**
  - `.nav-theme-box`: `display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; line-height: 1;`
  - `.secret-lock-btn`: `background: none; border: none; padding: 0; font-size: 11px; opacity: 0.35; cursor: pointer; line-height: 1; transition: opacity 0.2s ease, transform 0.15s ease; user-select: none;`
  - `.secret-lock-btn:hover`: `opacity: 0.85; transform: scale(1.15);`
  - `.secret-lock-btn:active`: `transform: scale(0.9);`

- [ ] **Step 2: Verifikasi sintaks CSS**

---

### Task 2: Logika JavaScript 4-Tap pada `assets/js/site.js`

**Files:**
- Modify: `assets/js/site.js`

- [ ] **Step 1: Implementasikan fungsi `initSecretLock()` di `assets/js/site.js`**
  - Mendaftarkan event listener pada `#secret-lock-btn`.
  - Melacak `tapCount`, `firstTapTime`, dan `lastTapTime`.
  - Jika jeda > 800ms atau (sekarang - `firstTapTime`) > 1500ms, reset `tapCount = 0`.
  - Tambah `tapCount++`.
  - Jika `tapCount === 4`:
    - `window.open('https://ynserver.my.id/', '_blank');`
    - Reset `tapCount = 0`.

- [ ] **Step 2: Verifikasi logika dengan headless test**

---

### Task 3: Penerapan Markup pada Seluruh Berkas HTML

**Files:**
- Modify: `index.html`
- Modify: Seluruh 23 berkas di `pages/**/*.html`

- [ ] **Step 1: Ganti blok `.theme-toggle` menjadi `.nav-theme-box` berisi tombol tema + tombol kunci rahasia**
- [ ] **Step 2: Verifikasi kelengkapan seluruh berkas**

---

### Task 4: Uji Fungsionalitas End-to-End pada Localhost

- [ ] **Step 1: Simulasi 1 tap, 2 tap (pastikan tidak terbuka)**
- [ ] **Step 2: Simulasi 4 tap cepat dalam 1,5 detik (pastikan url target terpanggil)**
- [ ] **Step 3: Uji visual responsiveness di desktop & mobile preview**
