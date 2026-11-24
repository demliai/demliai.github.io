/* Demli · gece çay ocağı davranışı. Bağımlılık: config.js; ana sayfada rig (assets/rig/demli-rig2.js). */
(function () {
  'use strict';
  var D = window.DEMLI || {};
  var azHareket = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dokunmatik = window.matchMedia('(hover: none)').matches;
  function $(s, k) { return (k || document).querySelector(s); }
  function $$(s, k) { return Array.prototype.slice.call((k || document).querySelectorAll(s)); }
  function sinir(v, a, b) { return v < a ? a : v > b ? b : v; }

  // 1) dış bağlantılar tek kaynaktan
  $$('[data-baglanti]').forEach(function (a) { var u = D[a.getAttribute('data-baglanti')]; if (u) a.href = u; });

  // 2) üst şerit, ilerleme bardağı
  var ust = $('[data-ust]'), ilerleme = $('[data-ilerleme]'), tik = false;
  function kaydir() {
    tik = false;
    var y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    if (ust) ust.classList.toggle('dolu', y > 40);
    if (ilerleme) {
      ilerleme.classList.toggle('gor', y > innerHeight * .5);
      ilerleme.style.setProperty('--dem', h > 0 ? sinir(y / h, 0, 1).toFixed(3) : 0);
    }
    if (sahne && !azHareket && y < innerHeight * 1.2) plaka.style.setProperty('--py', (y * .28).toFixed(1) + 'px');
    demle();
  }
  window.addEventListener('scroll', function () { if (!tik) { tik = true; requestAnimationFrame(kaydir); } }, { passive: true });

  // 3) demlenme: görünür olunca alttan yukarı dolarak gelir
  // (clip-path ile gizli öğe IntersectionObserver'a görünmez; konum kaydırmada ölçülür)
  var dem = $$('[data-dem]');
  var bekleyen = [];   // {el, fn}: öğe görününce bir kez çalışır
  function demle() {
    bekleyen = bekleyen.filter(function (b) { if (b.el.getBoundingClientRect().top < innerHeight * .8) { b.fn(); return false; } return true; });
    if (!dem.length) return;
    var sinirY = innerHeight * .92;
    dem = dem.filter(function (el) {
      if (el.getBoundingClientRect().top < sinirY) { el.classList.add('dem'); return false; }
      return true;
    });
  }
  if (azHareket) { dem.forEach(function (el) { el.classList.add('dem'); }); dem = []; }

  // 4) sahne: lamba ışığı imleci izler
  var sahne = $('[data-sahne]'), plaka = sahne && $('.plaka', sahne);
  if (sahne) {
    var img = $('img', plaka);
    var yak = function () { sahne.classList.add('yandi'); };
    if (img.complete) requestAnimationFrame(yak); else { img.addEventListener('load', yak); img.addEventListener('error', yak); setTimeout(yak, 2500); }

    var hedef = { x: 38, y: 40 }, simdi = { x: 38, y: 40 }, gorunur = true, dongu = null;
    if (!azHareket) {
      sahne.addEventListener('pointermove', function (e) {
        var r = sahne.getBoundingClientRect();
        hedef.x = (e.clientX - r.left) / r.width * 100; hedef.y = (e.clientY - r.top) / r.height * 100;
      });
      var t0 = performance.now();
      var isik = function (now) {
        if (dokunmatik) { var t = (now - t0) / 1000; hedef.x = 42 + Math.sin(t * .23) * 16; hedef.y = 42 + Math.sin(t * .31 + 1) * 10; }
        simdi.x += (hedef.x - simdi.x) * .05; simdi.y += (hedef.y - simdi.y) * .05;
        sahne.style.setProperty('--mx', simdi.x.toFixed(2) + '%'); sahne.style.setProperty('--my', simdi.y.toFixed(2) + '%');
        dongu = gorunur ? requestAnimationFrame(isik) : null;
      };
      dongu = requestAnimationFrame(isik);
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
        gorunur = es[0].isIntersecting;
        if (gorunur && !dongu) dongu = requestAnimationFrame(isik);
      }).observe(sahne);
    }
  }

  // 5) Demli (gerçek çizimden kesme rig): göz kırpar, imlece bakar, yaklaşınca kaşını kaldırır
  var yuva = $('[data-demli]');
  if (yuva && window.Demli) {
    var DUZ = { tea: .86, eyes: 'acik', brow: 'flat', mouth: 'dinlenme', arm: 'point', lid: .12 };
    var rig = window.Demli.create(yuva, { seed: 11, view: [215, 60, 840, 1100], blink: true });
    var ruh = null, kasKalkik = false, bosta = null, uyandi = 0, hazir = false, bos = yuva.getAttribute('data-demli-hal') === 'bos';
    rig.ready.then(function () {
      rig.set({ tea: 0, eyes: 'acik', brow: 'flat', mouth: 'dinlenme', arm: 'point', lid: .12, look: { x: .5, y: .1 } }, 0);
      rig.seek(0);
      yuva.classList.add('hazir'); hazir = true;
      if (bos) {   // 404: bardak boş, Demli şaşkın
        rig.set({ eyes: 'saskin', brow: 'high', mouth: 'O', arm: 'down', look: { x: 0, y: 0 } }, 0);
        DUZ = { tea: 0, eyes: 'saskin', brow: 'high', mouth: 'O', arm: 'down', lid: 0 };
        rig.seek(20);
        if (!azHareket) rig.animate();
        return;
      }
      if (azHareket) { rig.set({ tea: DUZ.tea }, 0); rig.seek(10); return; }
      rig.animate();
      setTimeout(function () { rig.pour(DUZ.tea, 1900); }, 700);   // açılışta demlenir
      bostaKur();
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) rig.animate(); else rig.stop();
      }).observe(yuva);
    }).catch(function () { yuva.classList.add('hata'); });

    var hal = function (ad) {
      if (ad === ruh) return; ruh = ad;
      if (!ad) { rig.set({ tea: DUZ.tea, arm: DUZ.arm, eyes: 'acik', brow: kasKalkik ? 'one' : 'flat', mouth: 'dinlenme', lid: DUZ.lid }, 380); return; }
      rig.mood(ad);
    };
    function bostaKur() {
      clearTimeout(bosta);
      bosta = setTimeout(function () { if (!ruh) rig.set({ lid: .42, look: { x: .2, y: .5 }, brow: 'flat' }, 900); }, 9000);
    }
    window.addEventListener('pointermove', function (e) {
      if (!hazir || ruh || azHareket) return;
      var r = rig.canvas.getBoundingClientRect(); if (!r.width) return;
      var p = rig._toScreen(635, 385, r);
      var dx = e.clientX - p[0], dy = e.clientY - p[1];
      rig.set({ look: { x: sinir(dx / (r.width * .9), -1, 1), y: sinir(dy / (r.height * .7), -1, 1) }, lid: DUZ.lid }, 260);
      if (bos) return;
      var yakin = Math.sqrt(dx * dx + dy * dy) < Math.max(150, r.width * .55);
      if (yakin !== kasKalkik) { kasKalkik = yakin; rig.set({ brow: yakin ? 'one' : 'flat' }, 220); }
      bostaKur();
    }, { passive: true });
    $$('[data-ruh]').forEach(function (k) {
      var gir = function () { hal(k.getAttribute('data-ruh')); bostaKur(); };
      var cik = function () { hal(null); };
      k.addEventListener('mouseenter', gir); k.addEventListener('focus', gir);
      k.addEventListener('mouseleave', cik); k.addEventListener('blur', cik);
    });
    // dokununca: kaş kalkar, bir yudum içilmiş gibi çay iner ve geri dolar
    yuva.addEventListener('click', function (e) {
      if (!hazir || azHareket || bos) return;
      var r = rig.canvas.getBoundingClientRect(), p = rig._toScreen(635, 385, r);
      rig.set({ look: { x: sinir((e.clientX - p[0]) / r.width, -1, 1), y: 0 } }, 200);
      uyandi++;
      if (uyandi % 4 === 0) { rig.mood('sok'); setTimeout(function () { ruh = 'x'; hal(null); }, 1600); return; }
      rig.set({ brow: 'one', eyes: 'kisik' }, 160).pour(.62, 600);
      setTimeout(function () { rig.set({ eyes: 'acik', brow: kasKalkik ? 'one' : 'flat' }, 300).pour(DUZ.tea, 1400); }, 900);
      bostaKur();
    });
  }

  // 6) Demli Testi: çay ölçer, veri dosyasından
  var olcer = $('[data-olcer]');
  if (olcer) {
    var ornek = /[?&]ornek\b/.test(location.search);
    var ORNEK = { 'claude-fable': [91, 84, 88], 'claude-opus': [86, 79, 83], 'claude-sonnet': [72, 74, 69], 'gpt-sol': [88, 81, 76], 'gpt-astra': [64, 58, 71] };
    fetch('assets/data/testler.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (V) {
      if (ornek) V.modeller.forEach(function (m) { var s = ORNEK[m.id]; if (s) V.gorevler.forEach(function (g, i) { m.puan[g.id] = s[i]; }); });
      olcerKur(V, ornek);
      sayacKur(V);
    }).catch(function () { $('[data-olcer-not]').textContent = 'Sonuçlar 27 Kasım\'da. Ayrıntılar GitHub\'daki demli-arena deposunda.'; });
  }
  var CAM = 'M18 10H82C80 42 70 63 67.5 81C65.5 97 77.5 110 76 128C75 139 72 145 68 147H32C28 145 25 139 24 128C22.5 110 34.5 97 32.5 81C30 63 20 42 18 10Z';
  function bardakSvg(id) {
    return '<svg viewBox="0 0 100 168" aria-hidden="true">' +
      '<defs><clipPath id="' + id + '"><path d="' + CAM + '"/></clipPath></defs>' +
      '<ellipse class="tabak" cx="50" cy="153" rx="46" ry="9"/><ellipse class="tabak-ic" cx="50" cy="152" rx="34" ry="5.5"/>' +
      '<path class="cam" d="' + CAM + '"/>' +
      '<g clip-path="url(#' + id + ')"><rect class="cay-dolu" x="0" y="14" width="100" height="140"/><ellipse class="yuzey" cx="50" cy="14" rx="48" ry="4.5"/></g>' +
      '<path class="bos-cizgi" d="M26 58H74"/>' +
      '<path class="cam" d="' + CAM + '" fill="none" style="fill:none"/>' +
      '<path class="yansima" d="M27 24c1 12 4 22 8 32"/><path class="yansima" d="M31 100c-1 8 0 16 2 24" style="opacity:.55"/>' +
      '</svg>';
  }
  function olcerKur(V, ornek) {
    var sek = $('[data-sekmeler]'), liste = $('[data-bardaklar]'), ozet = $('[data-gorev-ozet]'), not = $('[data-olcer-not]');
    var gorevler = V.gorevler.concat([{ id: '_ort', ad: 'Ortalama', ozet: 'Üç görevin ortalaması, 0 ile 100 arası. 100\'ü aşan sonuç yok; "taştı" yalnız beklentinin üstüne çıkan şaşırtıcı bir sonuç için söylenir.' }]);
    var secili = ornek ? '_ort' : V.gorevler[0].id;
    if (ornek) { var d = document.createElement('span'); d.className = 'damga'; d.textContent = 'örnek veri'; olcer.appendChild(d); }
    liste.innerHTML = V.modeller.map(function (m, i) {
      return '<li class="bardak" data-model="' + m.id + '">' + bardakSvg('cam-' + i) +
        '<span class="puan bos" data-puan>demlenmedi</span>' +
        '<span class="etiket bekliyor" data-etiket>' + m.ad + '</span><small>' + m.aile + ' · ' + m.arac + '</small></li>';
    }).join('');
    function puan(m, gid) {
      if (gid !== '_ort') return m.puan[gid];
      var s = 0; for (var i = 0; i < V.gorevler.length; i++) { var p = m.puan[V.gorevler[i].id]; if (p == null) return null; s += p; }
      return Math.round(s / V.gorevler.length);
    }
    function goster(gid) {
      secili = gid;
      var g = gorevler.filter(function (x) { return x.id === gid; })[0];
      ozet.textContent = g.ozet;
      $$('button', sek).forEach(function (b) { var on = b.getAttribute('data-gorev') === gid; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
      var puanlar = V.modeller.map(function (m) { return puan(m, gid); });
      var enIyi = Math.max.apply(null, puanlar.map(function (p) { return p == null ? -1 : p; }));
      var dolu = 0;
      V.modeller.forEach(function (m, i) {
        var li = liste.children[i], p = puanlar[i], k = p == null ? 0 : sinir(p / 100, 0, 1);
        var off = ((1 - k) * 140).toFixed(1) + 'px';
        $('.cay-dolu', li).style.transform = 'translateY(' + off + ')';
        $('.yuzey', li).style.transform = 'translateY(' + off + ')';
        $('.yuzey', li).style.opacity = k > 0 ? 1 : 0;
        $('.bos-cizgi', li).style.display = p == null ? '' : 'none';
        var pe = $('[data-puan]', li);
        pe.className = 'puan' + (p == null ? ' bos' : ''); pe.textContent = p == null ? 'demlenmedi' : p;
        var et = $('[data-etiket]', li); et.className = 'etiket' + (p == null || p < enIyi ? ' bekliyor' : '');
        li.setAttribute('aria-label', m.ad + ': ' + (p == null ? 'henüz puan yok' : p + ' puan' + (p === enIyi ? ', en demli' : '')));
        if (p != null) dolu++;
      });
      if (dolu) not.textContent = ornek ? 'Bu bir önizleme: sayılar örnek. Gerçek sonuçlar 27 Kasım\'dan sonra.' : 'Kırmızı noktalı tabak en demli olanı gösterir. Ham çıktılar ve puan cetveli demli-arena deposunda.';
    }
    sek.innerHTML = gorevler.map(function (g) {
      return '<button type="button" role="tab" data-gorev="' + g.id + '" aria-selected="false" aria-controls="bardaklar">' + g.ad + '</button>';
    }).join('');
    liste.id = 'bardaklar'; liste.setAttribute('role', 'tabpanel');
    sek.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) goster(b.getAttribute('data-gorev')); });
    sek.addEventListener('keydown', function (e) {
      var bs = $$('button', sek), i = bs.indexOf(document.activeElement);
      if (i < 0) return;
      var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? bs.length - 1 : null;
      if (j == null) return; e.preventDefault(); j = (j + bs.length) % bs.length; bs[j].focus(); goster(bs[j].getAttribute('data-gorev'));
    });
    // bardaklar görününce dolsun
    goster(secili);
    if (!azHareket) {
      var kay = $$('.cay-dolu, .yuzey', liste).map(function (el) { var t = el.style.transform; el.style.transform = 'translateY(140px)'; return [el, t]; });
      bekleyen.push({ el: liste, fn: function () { setTimeout(function () { kay.forEach(function (x) { x[0].style.transform = x[1]; }); }, 450); } });
      demle();
    }
  }
  function sayacKur(V) {
    var el = $('[data-sayac-yazi]'); if (!el) return;
    var hedef = new Date(V.tarih).getTime();
    function yaz() {
      var kalan = hedef - Date.now();
      if (V.durum === 'bitti') { el.textContent = 'Demlendi · sonuçlar aşağıda'; return; }
      if (kalan <= 0) { el.textContent = 'Demleniyor · sonuçlar yakında'; return; }
      var g = Math.floor(kalan / 864e5), s = Math.floor(kalan % 864e5 / 36e5), d = Math.floor(kalan % 36e5 / 6e4);
      el.textContent = 'İlk demleme 27 Kasım, 16:00 · ' + (g ? g + ' gün ' : '') + s + ' sa ' + (d < 10 ? '0' : '') + d + ' dk kaldı';
    }
    yaz(); setInterval(yaz, 30000);
  }

  // 7) adisyon saati
  var saat = $('[data-saat]');
  if (saat) {
    var n = new Date(), iki = function (x) { return (x < 10 ? '0' : '') + x; };
    saat.textContent = iki(n.getDate()) + '.' + iki(n.getMonth() + 1) + '.' + n.getFullYear() + ' · ' + iki(n.getHours()) + ':' + iki(n.getMinutes());
  }
  kaydir();
})();
