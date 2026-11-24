/* ==========================================================================
   Demli Slayt · motor v1
   Framework yok, build yok. Bir sunum = tek index.html içinde
   <section class="slayt" data-mod="kagit|demlik"> blokları.
   ========================================================================== */
(function () {
  'use strict';

  var Q = new URLSearchParams(location.search);
  var CAPTURE = Q.has('capture');
  var PRINT = Q.has('print');
  var src = (document.currentScript && document.currentScript.src) || '';
  var MOTOR = src.slice(0, src.lastIndexOf('/') + 1);

  var deste, slaytlar = [], aktif = -1, adim = 0, kilit = false;
  var ilerleme, silme, bildirim, bildirimZaman;
  var zorlaSira = ['', 'kagit', 'demlik'];

  /* ------------------------------------------------------------------ yardımcı */
  function $$(sel, kok) { return Array.prototype.slice.call((kok || document).querySelectorAll(sel)); }
  function iki(n) { return (n < 10 ? '0' : '') + n; }
  function kacis(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  // sayaçlar için sabit 16 ms zamanlayıcı: arka planda ve headless tarayıcıda da ilerler, capture'da deterministik
  var kareIste = function (f) { return setTimeout(function () { f(performance.now()); }, 16); };
  function json(el, ad) {
    var ham = el.getAttribute(ad);
    if (!ham) {
      var sc = el.querySelector('script[type="application/json"]');
      ham = sc ? sc.textContent : null;
    }
    if (!ham) return null;
    try { return JSON.parse(ham); } catch (e) { console.warn('[demli-slayt] JSON okunamadı', el, e); return null; }
  }

  /* ------------------------------------------------------------------ çay ölçer */
  var GLASS = 'M8 4 L52 4 C50 18 42 28 42 38 C42 50 55 64 53 82 C52 93 44 98 30 98 C16 98 8 93 7 82 C5 64 18 50 18 38 C18 28 10 18 8 4 Z';
  var bardakNo = 0;
  function bardakSvg(p) {
    var id = 'dsb' + (++bardakNo);
    var tasti = p > 100;
    var y = 98 - 94 * Math.min(p, 100) / 100;
    y = Math.max(y, 4);
    var bos = (100 - y + 4).toFixed(1);
    var s = '';
    s += '<svg viewBox="-8 -14 76 128" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
    s += '<defs><clipPath id="' + id + 'c"><path d="' + GLASS + '"/></clipPath>';
    s += '<pattern id="' + id + 'd" width="3.2" height="3.2" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".62" fill="#16130F" opacity=".38"/></pattern></defs>';
    // tabak
    s += '<ellipse cx="30" cy="101.5" rx="36" ry="7.5" style="fill:var(--tabak);stroke:var(--kenar)" stroke-width="1.5"/>';
    s += '<ellipse cx="30" cy="101" rx="25" ry="4.4" fill="none" stroke="#D49B26" stroke-width="1"/>';
    if (tasti) s += '<g class="tasma"><ellipse cx="50" cy="102" rx="10" ry="2.6" fill="#AD341B"/></g>';
    // cam
    s += '<path d="' + GLASS + '" style="fill:var(--cam)"/>';
    s += '<g clip-path="url(#' + id + 'c)"><g class="sivi" style="--bos:' + bos + 'px">';
    s += '<rect x="0" y="' + y.toFixed(1) + '" width="60" height="110" fill="#AD341B"/>';
    s += '<rect x="35" y="' + y.toFixed(1) + '" width="25" height="110" fill="url(#' + id + 'd)"/>';
    s += '<ellipse cx="30" cy="' + y.toFixed(1) + '" rx="30" ry="2.2" fill="#DC6C21"/>';
    s += '</g><path d="M14 26 C12 48 13 68 16 86" stroke="#fff" stroke-width="1.6" fill="none" opacity=".55" stroke-linecap="round"/>';
    s += '<path d="M19 22 C18 30 18 34 18.5 38" stroke="#fff" stroke-width="1.1" fill="none" opacity=".45" stroke-linecap="round"/></g>';
    s += '<path d="' + GLASS + '" fill="none" style="stroke:var(--kenar)" stroke-width="1.7" stroke-linejoin="round"/>';
    s += '<ellipse cx="30" cy="4" rx="22" ry="1.6" fill="none" style="stroke:var(--kenar)" stroke-width="1" opacity=".5"/>';
    if (tasti) {
      // taşma: çay rim'in üstünden kabarır, iki yandan dışarı sarkar (kulp gibi görünmesin: açık kontur)
      s += '<g class="tasma">';
      s += '<path d="M4.4 19 L4.6 7 C4.6 0.5 12 -3.8 30 -3.8 C48 -3.8 55.4 0.5 55.4 7 L55.6 14.5 C55.6 17.4 52.4 17.4 52.4 14.5 L52.2 9.4 L8 9.4 L7.8 19 C7.8 22 4.4 22 4.4 19 Z" fill="#AD341B"/>';
      s += '<path d="M9.5 1.6 C17 -1.6 43 -1.6 50.5 1.6" fill="none" stroke="#DC6C21" stroke-width="1.5" stroke-linecap="round"/>';
      s += '<path d="M52.2 9.4 L52.4 14.5 C52.4 17.4 55.6 17.4 55.6 14.5 L55.4 7 C55.4 0.5 48 -3.8 30 -3.8 C12 -3.8 4.6 0.5 4.6 7 L4.4 19 C4.4 22 7.8 22 7.8 19 L8 9.6" fill="none" style="stroke:var(--kenar)" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/>';
      s += '<path d="M6.1 25 C7.2 26.8 7.8 27.8 7.8 28.8 C7.8 29.8 7 30.5 6.1 30.5 C5.2 30.5 4.4 29.8 4.4 28.8 C4.4 27.8 5 26.8 6.1 25 Z" fill="#AD341B"/>';
      s += '</g>';
    }
    s += '</svg>';
    return s;
  }

  function kurBardaklar(kok) {
    $$('.cay-olcer', kok).forEach(function (olcer) {
      var veri = json(olcer, 'data-veri');
      if (veri && veri.length) {
        olcer.innerHTML = veri.map(function (v) {
          return '<figure class="bardak" data-puan="' + v.puan + '"' + (v.not ? ' data-not="' + kacis(v.not) + '"' : '') + '><figcaption>' + kacis(v.ad) + '</figcaption></figure>';
        }).join('');
      }
      if (olcer.dataset.yukseklik) olcer.style.setProperty('--h', olcer.dataset.yukseklik + 'px');
    });
    $$('.bardak[data-puan]', kok).forEach(function (b, i) {
      if (b.dataset.kuruldu) return;
      b.dataset.kuruldu = '1';
      var p = parseFloat(b.dataset.puan) || 0;
      var kardesler = b.parentElement ? $$(':scope > .bardak', b.parentElement) : [b];
      b.style.setProperty('--sira-b', Math.max(0, kardesler.indexOf(b)));
      var cap = b.querySelector('figcaption');
      var puan = document.createElement('div');
      puan.className = 'puan' + (p > 100 ? ' tasti' : '') + (p < 30 ? ' dusuk' : '');
      puan.innerHTML = '<span data-say="' + p + '">' + p + '</span>';
      b.insertAdjacentHTML('afterbegin', bardakSvg(p));
      if (cap) b.insertBefore(puan, cap); else b.appendChild(puan);
      var notMetni = b.dataset.not || (p > 100 ? 'taştı' : (p < 30 ? 'dibe çöktü' : ''));
      var n = document.createElement('div');
      n.className = 'not' + (notMetni ? '' : ' bos');
      n.textContent = notMetni || '-';
      b.appendChild(n);
    });
  }

  /* ------------------------------------------------------------------ adisyon */
  function kurAdisyon(kok) {
    $$('.adisyon[data-veri], .adisyon > script[type="application/json"]', kok).forEach(function (x) {
      var el = x.classList.contains('adisyon') ? x : x.parentElement;
      if (el.dataset.kuruldu) return;
      el.dataset.kuruldu = '1';
      var v = json(el, 'data-veri') || {};
      var satirlar = v.satirlar || [];
      var i = 0;
      function satir(cls, a, b) {
        return '<div class="s satir ' + (cls || '') + '" style="--sira-s:' + (i++) + '"><span>' + kacis(a) + '</span><span></span><span>' + kacis(b) + '</span></div>';
      }
      var h = '<div class="fis">';
      h += '<div class="bas satir" style="--sira-s:' + (i++) + '">' + kacis(v.baslik || 'DEMLİ ÇAY OCAĞI') + '</div>';
      if (v.altBaslik) h += '<div class="alt-bas satir" style="--sira-s:' + (i++) + '">' + kacis(v.altBaslik) + '</div>';
      satirlar.forEach(function (s) { h += satir('', s[0], s[1]); });
      if (v.toplam) h += satir('top', v.toplam[0], v.toplam[1]);
      if (v.hukum) h += satir('hukum' + (v.toplam ? '' : ' top'), 'HÜKÜM', v.hukum);
      if (v.alt) h += '<div class="tesekkur satir" style="--sira-s:' + (i++) + '">' + kacis(v.alt) + '</div>';
      h += '</div>';
      el.innerHTML = h;
    });
  }

  /* ------------------------------------------------------------------ kod */
  var KW = {
    js: 'const|let|var|function|return|if|else|for|while|of|in|new|class|import|from|export|async|await|true|false|null|undefined|this|break|continue',
    py: 'def|return|if|elif|else|for|while|in|import|from|class|async|await|True|False|None|and|or|not|with|as|lambda|pass|break|continue|self'
  };
  function renklendir(kod, dil) {
    var yorum = dil === 'py' || dil === 'sh' ? '#.*$' : '\\/\\/.*$';
    var kw = KW[dil] || KW.js;
    var re = new RegExp('(' + yorum + ')|("(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\'|`(?:\\\\.|[^`\\\\])*`)|\\b(\\d+(?:\\.\\d+)?)\\b|\\b(' + kw + ')\\b|([A-Za-z_$][\\w$]*)(?=\\()', 'gm');
    var out = '', son = 0, m;
    while ((m = re.exec(kod))) {
      out += kacis(kod.slice(son, m.index));
      var c = m[1] ? 'y' : m[2] ? 's' : m[3] ? 't' : m[4] ? 'k' : 'f';
      out += '<span class="' + c + '">' + kacis(m[0]) + '</span>';
      son = re.lastIndex;
      if (m[0].length === 0) re.lastIndex++;
    }
    return out + kacis(kod.slice(son));
  }
  function araliklar(s) {
    var set = {};
    (s || '').split(',').forEach(function (p) {
      var a = p.split('-').map(function (x) { return parseInt(x, 10); });
      if (!a[0]) return;
      for (var i = a[0]; i <= (a[1] || a[0]); i++) set[i] = 1;
    });
    return set;
  }
  function kurKod(kok) {
    $$('.kod', kok).forEach(function (k) {
      if (k.dataset.kuruldu) return;
      k.dataset.kuruldu = '1';
      var pre = k.querySelector('pre');
      if (!pre) return;
      var ham = pre.textContent.replace(/^\n/, '').replace(/\s+$/, '');
      var dil = k.dataset.dil || 'js';
      var isik = araliklar(k.dataset.vurgu);
      var satirlar = renklendir(ham, dil).split('\n');
      pre.innerHTML = satirlar.map(function (s, i) {
        return '<span class="satir' + (isik[i + 1] ? ' isik' : '') + '">' + (s || ' ') + '</span>';
      }).join('');
      if (k.dataset.dosya && !k.querySelector('.ust')) {
        k.insertAdjacentHTML('afterbegin', '<div class="ust"><span class="etiket kucuk koyu">' + kacis(k.dataset.dosya) + '</span><span class="dil">' + kacis(dil) + '</span></div>');
      }
    });
  }

  /* ------------------------------------------------------------------ maskot, sim */
  function kurGorseller(kok) {
    $$('img[data-maskot]', kok).forEach(function (img) {
      if (!img.getAttribute('src')) img.src = MOTOR + 'maskot/' + img.dataset.maskot + '.png';
      if (!img.alt) img.alt = 'Demli maskotu';
    });
  }
  function kurSim(kok) {
    $$('.sim[data-src]', kok).forEach(function (s) {
      if (s.dataset.kuruldu) return;
      s.dataset.kuruldu = '1';
      var ust = '<div class="ust"><span class="etiket kucuk">' + kacis(s.dataset.model || 'simülasyon') + '</span>' +
        '<span class="canli">' + kacis(s.dataset.durum || 'canlı') + '</span></div>';
      s.insertAdjacentHTML('afterbegin', ust + '<div class="ekran"><div class="yukleniyor"><svg class="buhar" width="90" height="90" viewBox="0 0 70 70"><path d="M20 64 C10 50 30 42 20 28 C12 18 24 10 22 4"/><path d="M36 64 C26 50 46 42 36 28 C28 18 40 10 38 4"/><path d="M52 64 C42 50 62 42 52 28 C44 18 56 10 54 4"/></svg></div></div>');
    });
  }
  function simYukle(slayt) {
    $$('.sim[data-src]', slayt).forEach(function (s) {
      var ekran = s.querySelector('.ekran');
      var url = s.dataset.src;
      if (CAPTURE) url += (url.indexOf('?') < 0 ? '?' : '&') + 'capture';
      var fr = ekran.querySelector('iframe');
      if (!fr) {
        fr = document.createElement('iframe');
        fr.title = s.dataset.model || 'simülasyon';
        fr.setAttribute('loading', 'eager');
        fr.addEventListener('load', function () { var y = ekran.querySelector('.yukleniyor'); if (y) y.remove(); });
        ekran.appendChild(fr);
      }
      if (s.dataset.yeniden !== 'yok' || !fr.getAttribute('src')) fr.src = url;
    });
  }

  /* ------------------------------------------------------------------ künye, damga */
  function kurKunye() {
    var baslik = deste.dataset.baslik || '';
    slaytlar.forEach(function (s, i) {
      if (s.hasAttribute('data-ornek-veri') && !s.querySelector('.ornek-veri')) {
        var d = document.createElement('div');
        d.className = 'ornek-veri';
        d.textContent = s.getAttribute('data-ornek-veri') || 'örnek veri';
        s.appendChild(d);
      }
      if (s.dataset.kunye === 'yok' || s.querySelector('.kunye')) return;
      var k = document.createElement('div');
      k.className = 'kunye';
      k.innerHTML = '<span class="marka">demli<i>.</i></span>' + (baslik ? '<span>' + kacis(baslik) + '</span>' : '') +
        '<span class="bosluk"></span><span class="sayac ui">' + iki(i + 1) + ' / ' + iki(slaytlar.length) + '</span>';
      s.appendChild(k);
    });
  }

  /* ------------------------------------------------------------------ demlenme sırası */
  function kurDem() {
    slaytlar.forEach(function (s) {
      var adaylar = [];
      $$(':scope > *', s).forEach(function (c) {
        if (c.classList.contains('kunye') || c.classList.contains('ornek-veri') || c.classList.contains('noktalar')) return;
        if (c.classList.contains('dem-grup') || c.hasAttribute('data-grup')) {
          $$(':scope > *', c).forEach(function (cc) { adaylar.push(cc); });
        } else adaylar.push(c);
      });
      $$('.dem-grup', s).forEach(function (g) {
        if (g.parentElement === s) return;
        $$(':scope > *', g).forEach(function (cc) { if (adaylar.indexOf(cc) < 0) adaylar.push(cc); });
      });
      $$('[data-dem]', s).forEach(function (c) { if (adaylar.indexOf(c) < 0) adaylar.push(c); });
      // grup elemanlarının ebeveyni ayrıca canlanmasın
      adaylar = adaylar.filter(function (c) { return !c.classList.contains('dem-grup'); });
      // sırayı belge sırasına göre ver
      adaylar.sort(function (a, b) { return a.compareDocumentPosition(b) & 4 ? -1 : 1; });
      var n = 0;
      adaylar.forEach(function (c) {
        if (c.hasAttribute('data-adim')) return;
        c.classList.add('dem');
        var sira = c.hasAttribute('data-sira') ? parseFloat(c.getAttribute('data-sira')) : n++;
        c.style.setProperty('--sira', sira);
      });
    });
  }

  /* ------------------------------------------------------------------ adımlar */
  function adimDegerleri(s) {
    var d = {};
    $$('[data-adim]', s).forEach(function (e) { d[parseFloat(e.dataset.adim) || 1] = 1; });
    return Object.keys(d).map(Number).sort(function (a, b) { return a - b; });
  }
  function adimUygula(s, k, animasyonlu) {
    var deg = adimDegerleri(s);
    var esik = k > 0 ? deg[k - 1] : -Infinity;
    $$('[data-adim]', s).forEach(function (e) {
      var ac = (parseFloat(e.dataset.adim) || 1) <= esik;
      if (ac && !e.classList.contains('acik')) {
        e.classList.add('acik');
        if (animasyonlu) sayaclariBaslat(e, 0);
      } else if (!ac) e.classList.remove('acik');
    });
  }

  /* ------------------------------------------------------------------ sayaç (count-up) */
  function sayaclariBaslat(kok, gecikme) {
    $$('[data-say]', kok).forEach(function (el) {
      if (el.closest('[data-adim]:not(.acik)')) return;
      var hedef = parseFloat(el.dataset.say);
      var ondalik = parseInt(el.dataset.ondalik || '0', 10);
      var sure = parseFloat(el.dataset.sure || '1000');
      var bas = null;
      var bek = gecikme + (parseFloat(el.dataset.gecikme || '0'));
      if (PRINT) { el.textContent = bicim(hedef, ondalik); return; }
      el.textContent = bicim(0, ondalik);
      var tok = (el._tok = (el._tok || 0) + 1);
      setTimeout(function () {
        function kare(t) {
          if (tok !== el._tok) return;
          if (bas === null) bas = t;
          var x = Math.min(1, (t - bas) / sure);
          var e = 1 - Math.pow(1 - x, 3);
          el.textContent = bicim(hedef * e, ondalik);
          if (x < 1) kareIste(kare);
        }
        kareIste(kare);
      }, bek);
    });
  }
  function bicim(v, ondalik) {
    return ondalik ? v.toFixed(ondalik).replace('.', ',') : String(Math.round(v));
  }

  /* ------------------------------------------------------------------ gezinme */
  function goster(i, k, gecisli) {
    i = Math.max(0, Math.min(slaytlar.length - 1, i));
    var s = slaytlar[i];
    var deg = adimDegerleri(s);
    if (k === 'son') k = deg.length;
    k = Math.max(0, Math.min(deg.length, k || 0));
    var degisti = i !== aktif;

    function uygula() {
      if (degisti) {
        if (aktif >= 0) slaytlar[aktif].classList.remove('aktif', 'demlen');
        s.classList.add('aktif');
        s.classList.remove('demlen');
        void s.offsetWidth;
        s.classList.add('demlen');
        aktif = i;
        adimUygula(s, k, false);
        sayaclariBaslat(s, 380);
        simYukle(s);
        document.body.style.setProperty('--sahne-zemin', getComputedStyle(s).backgroundColor);
        document.body.dataset.aktifMod = s.dataset.mod || 'kagit';
      } else {
        adimUygula(s, k, true);
      }
      adim = k;
      guncelleArayuz();
    }

    if (degisti && gecisli && s.dataset.gecis === 'cay' && !CAPTURE_SESSIZ()) {
      kilit = true;
      silme.classList.remove('bosal');
      silme.classList.add('dol');
      setTimeout(function () {
        uygula();
        silme.classList.remove('dol');
        void silme.offsetWidth;
        silme.classList.add('bosal');
        setTimeout(function () { silme.classList.remove('bosal'); kilit = false; }, 480);
      }, 440);
    } else {
      uygula();
    }
  }
  function CAPTURE_SESSIZ() { return PRINT || window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  function ileri() {
    if (kilit) return;
    var deg = adimDegerleri(slaytlar[aktif]);
    if (adim < deg.length) goster(aktif, adim + 1);
    else if (aktif < slaytlar.length - 1) goster(aktif + 1, 0, true);
  }
  function geri() {
    if (kilit) return;
    if (adim > 0) goster(aktif, adim - 1);
    else if (aktif > 0) goster(aktif - 1, 'son');
  }

  function guncelleArayuz() {
    var h = '#' + (aktif + 1) + (adim > 0 ? '.' + adim : '');
    if (location.hash !== h) history.replaceState(null, '', h);
    var toplamAdim = 0, gecen = 0;
    slaytlar.forEach(function (s, i) {
      var n = adimDegerleri(s).length + 1;
      toplamAdim += n;
      if (i < aktif) gecen += n;
    });
    gecen += adim + 1;
    if (ilerleme) ilerleme.style.width = (100 * gecen / toplamAdim).toFixed(3) + '%';
  }

  function hashOku() {
    var m = /^#(\d+)(?:\.(\d+|son))?$/.exec(location.hash || '');
    if (!m) return { i: 0, k: 0 };
    return { i: parseInt(m[1], 10) - 1, k: m[2] === 'son' ? 'son' : parseInt(m[2] || '0', 10) };
  }

  /* ------------------------------------------------------------------ ölçek */
  function olcekle() {
    var w = window.innerWidth, h = window.innerHeight;
    if (PRINT) {
      var o = Math.min(1, (w - 64) / 1920);
      document.documentElement.style.setProperty('--olcek', o);
      return;
    }
    document.documentElement.style.setProperty('--olcek', Math.min(w / 1920, h / 1080));
  }

  /* ------------------------------------------------------------------ bildirim */
  function bildir(metin) {
    if (!bildirim) return;
    bildirim.textContent = metin;
    bildirim.classList.add('gor');
    clearTimeout(bildirimZaman);
    bildirimZaman = setTimeout(function () { bildirim.classList.remove('gor'); }, 1400);
  }

  function modZorla() {
    var su = document.body.dataset.zorla || '';
    var yeni = zorlaSira[(zorlaSira.indexOf(su) + 1) % zorlaSira.length];
    if (yeni) document.body.dataset.zorla = yeni; else delete document.body.dataset.zorla;
    if (aktif >= 0) document.body.style.setProperty('--sahne-zemin', getComputedStyle(slaytlar[aktif]).backgroundColor);
    bildir(yeni === 'kagit' ? 'kâğıt modu zorlandı' : yeni === 'demlik' ? 'demlik modu zorlandı' : 'slayt modları');
  }

  function tamEkran() {
    if (!document.fullscreenElement) (document.documentElement.requestFullscreen || function () {}).call(document.documentElement);
    else document.exitFullscreen();
  }

  /* ------------------------------------------------------------------ kurulum */
  function kur() {
    deste = document.querySelector('.deste');
    if (!deste) {
      deste = document.createElement('div');
      deste.className = 'deste';
      $$('body > .slayt').forEach(function (s) { deste.appendChild(s); });
      document.body.appendChild(deste);
    }
    slaytlar = $$('.slayt', deste);
    if (CAPTURE) document.body.classList.add('capture');
    if (Q.get('mod') === 'kagit' || Q.get('mod') === 'demlik') document.body.dataset.zorla = Q.get('mod');

    kurGorseller(deste);
    kurBardaklar(deste);
    kurAdisyon(deste);
    kurKod(deste);
    kurSim(deste);
    kurKunye();
    kurDem();

    olcekle();
    window.addEventListener('resize', olcekle);

    if (PRINT) {
      document.body.classList.add('baski');
      slaytlar.forEach(function (s) {
        var kutu = document.createElement('div');
        kutu.className = 'baski-kutu';
        s.parentNode.insertBefore(kutu, s);
        kutu.appendChild(s);
        $$('[data-adim]', s).forEach(function (e) { e.classList.add('acik'); });
        sayaclariBaslat(s, 0);
        simYukle(s);
      });
      return;
    }

    ilerleme = document.createElement('div'); ilerleme.className = 'ilerleme';
    silme = document.createElement('div'); silme.className = 'cay-silme'; silme.innerHTML = '<div class="sivi"></div>';
    bildirim = document.createElement('div'); bildirim.className = 'bildirim';
    document.body.appendChild(ilerleme); document.body.appendChild(silme); document.body.appendChild(bildirim);

    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var k = e.key;
      if (k === 'ArrowRight' || k === 'PageDown' || k === ' ' || k === 'Spacebar' || k === 'Enter') { e.preventDefault(); ileri(); }
      else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'Backspace') { e.preventDefault(); geri(); }
      else if (k === 'Home') { e.preventDefault(); goster(0, 0); }
      else if (k === 'End') { e.preventDefault(); goster(slaytlar.length - 1, 'son'); }
      else if (k === 'f' || k === 'F') { e.preventDefault(); tamEkran(); }
      else if (k === 'l' || k === 'L') { e.preventDefault(); modZorla(); }
    });
    deste.addEventListener('click', function (e) {
      if (e.target.closest('a,button,iframe,.sim')) return;
      if (e.clientX < window.innerWidth * 0.25) geri(); else ileri();
    });
    var dokunX = null;
    deste.addEventListener('touchstart', function (e) { dokunX = e.touches[0].clientX; }, { passive: true });
    deste.addEventListener('touchend', function (e) {
      if (dokunX === null) return;
      var dx = e.changedTouches[0].clientX - dokunX; dokunX = null;
      if (Math.abs(dx) > 50) { if (dx < 0) ileri(); else geri(); }
    });
    window.addEventListener('hashchange', function () {
      var h = hashOku();
      if (h.i !== aktif || h.k !== adim) goster(h.i, h.k);
    });

    var basla = function () { var h = hashOku(); goster(h.i, h.k); };
    // capture: yazı tipleri inmeden sahneyi başlatma (deterministik kare)
    if (CAPTURE && document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(basla, 30); });
    else basla();
  }

  window.DemliSlayt = {
    git: function (n, k) { goster(n - 1, k || 0, true); },
    ileri: function () { ileri(); }, geri: function () { geri(); },
    bardak: bardakSvg
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kur);
  else kur();
})();
