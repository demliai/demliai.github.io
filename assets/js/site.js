/* Demli · site davranışı. Bağımlılık: config.js */
(function () {
  'use strict';
  var D = window.DEMLI || {};

  // 1) Dış bağlantılar tek kaynaktan: data-baglanti="youtube|github|arena"
  document.querySelectorAll('[data-baglanti]').forEach(function (a) {
    var url = D[a.getAttribute('data-baglanti')];
    if (url) a.href = url;
  });

  // 2) Ana sayfa: karta gelince Demli'nin ruh hali değişir (çay seviyesi ruh halidir)
  var kukla = document.querySelector('[data-kukla]');
  if (!kukla) return;
  var pozlar = kukla.querySelectorAll('[data-poz]');
  var yazi = document.querySelector('[data-ruh-yazi]');
  var AD = { 'bekle': 'sıkılmış', 'kas-kalkik': 'kaş kalkık', 'etkilenmis': 'etkilenmiş', 'tasti': 'taştı', 'dusunuyor': 'düşünüyor' };
  var zaman = null;

  function goster(ad) {
    var bulundu = false;
    pozlar.forEach(function (p) {
      var on = p.getAttribute('data-poz') === ad;
      if (on) { bulundu = true; if (p.loading === 'lazy') p.loading = 'eager'; }
      p.classList.toggle('aktif', on);
    });
    if (!bulundu) return goster('bekle');
    kukla.classList.toggle('bekliyor', ad === 'bekle');
    if (yazi) yazi.textContent = AD[ad] || ad;
  }
  kukla.classList.add('bekliyor');

  // pozları boşta önceden yükle: geçişte boş kare görünmesin
  var yukle = function () { pozlar.forEach(function (p) { p.loading = 'eager'; }); };
  if ('requestIdleCallback' in window) requestIdleCallback(yukle, { timeout: 2500 }); else setTimeout(yukle, 1200);

  document.querySelectorAll('[data-ruh]').forEach(function (k) {
    var gir = function () { clearTimeout(zaman); goster(k.getAttribute('data-ruh')); };
    var cik = function () { clearTimeout(zaman); zaman = setTimeout(function () { goster('bekle'); }, 240); };
    k.addEventListener('mouseenter', gir);
    k.addEventListener('focus', gir);
    k.addEventListener('mouseleave', cik);
    k.addEventListener('blur', cik);
  });
})();
