/**
 * Lightbox Smart Zoom & Pan Engine for Methodist-11 Website
 * Ringan, pure Vanilla JS (0 KB overhead, tanpa library eksternal).
 *
 * Fitur:
 * - Klik sekali pada gambar untuk perbesar 2x (mode baca) / klik lagi untuk reset ke 1x.
 * - Scroll wheel mouse untuk perbesaran dinamis halus (1x - 4x).
 * - Drag/Pan dengan mouse saat posisi ter-zoom (dengan soft clamp agar tidak hilang dari layar).
 * - Otomatis reset ke 1x saat modal ditutup (✕, background, Escape) atau berganti gambar (‹, ›).
 * - Tidak mengganggu pinch-to-zoom bawaan browser pada perangkat mobile / HP.
 */

(function () {
  'use strict';

  function initLightboxZoom() {
    var lb = document.getElementById('lightbox');
    var lbImg = document.getElementById('lb-img');
    if (!lb || !lbImg) return;

    var scale = 1;
    var panX = 0;
    var panY = 0;
    var isDragging = false;
    var startX = 0;
    var startY = 0;
    var hasMoved = false;

    function applyZoom(smooth) {
      lbImg.style.transition = smooth ? 'transform 0.22s ease-out' : 'none';
      lbImg.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + scale + ')';
      lbImg.style.cursor = scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in';
    }

    function resetZoom(smooth) {
      scale = 1;
      panX = 0;
      panY = 0;
      isDragging = false;
      hasMoved = false;
      applyZoom(smooth !== false);
    }

    window.resetLbZoom = resetZoom;

    // 1. Klik gambar untuk toggle zoom (PC)
    lbImg.addEventListener('click', function (e) {
      e.stopPropagation();
      if (hasMoved) {
        hasMoved = false;
        return;
      }
      if (scale === 1) {
        scale = 2.2;
        applyZoom(true);
      } else {
        resetZoom(true);
      }
    });

    // 2. Scroll wheel mouse untuk zoom halus
    lb.addEventListener('wheel', function (e) {
      if (!lb.classList.contains('open')) return;
      e.preventDefault();
      var delta = e.deltaY < 0 ? 0.25 : -0.25;
      var newScale = Math.min(Math.max(1, scale + delta), 4);
      if (newScale === scale) return;
      scale = Math.round(newScale * 100) / 100;
      if (scale === 1) {
        panX = 0;
        panY = 0;
      }
      applyZoom(false);
    }, { passive: false });

    // 3. Drag / Pan saat posisi ter-zoom
    lbImg.addEventListener('mousedown', function (e) {
      if (scale <= 1 || e.button !== 0) return;
      e.preventDefault();
      isDragging = true;
      hasMoved = false;
      startX = e.clientX - panX;
      startY = e.clientY - panY;
      applyZoom(false);
    });

    window.addEventListener('mousemove', function (e) {
      if (!isDragging) return;
      var currentX = e.clientX - startX;
      var currentY = e.clientY - startY;
      if (Math.abs(currentX - panX) > 4 || Math.abs(currentY - panY) > 4) {
        hasMoved = true;
      }
      panX = currentX;
      panY = currentY;

      // Batasi geser agar gambar tidak hilang dari pandangan
      var limitX = Math.max(window.innerWidth * 0.75, (lbImg.offsetWidth * scale) / 2);
      var limitY = Math.max(window.innerHeight * 0.75, (lbImg.offsetHeight * scale) / 2);
      panX = Math.max(-limitX, Math.min(limitX, panX));
      panY = Math.max(-limitY, Math.min(limitY, panY));

      applyZoom(false);
    });

    window.addEventListener('mouseup', function () {
      if (!isDragging) return;
      isDragging = false;
      applyZoom(false);
    });

    // 4. Observer otomatis: reset saat lightbox ditutup atau gambar diganti
    if (window.MutationObserver) {
      var lbObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          if (m.attributeName === 'class' && !lb.classList.contains('open')) {
            resetZoom(false);
          }
        });
      });
      lbObserver.observe(lb, { attributes: true, attributeFilter: ['class'] });

      var imgObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          if (m.attributeName === 'src') {
            resetZoom(false);
          }
        });
      });
      imgObserver.observe(lbImg, { attributes: true, attributeFilter: ['src'] });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLightboxZoom);
  } else {
    initLightboxZoom();
  }
})();
