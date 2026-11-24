/* Demli rig v2 — kesme (cutout) kukla. Karakter vektörle yeniden çizilmez: her katman onaylı çizimlerden
 * kesilmiş şeffaf PNG'dir (parcalar/). Konumlar parcalar.json'da, taban çizim (isaret-sag.png, 1254 px) koordinatında.
 * API v1 ile aynı: Demli.create, set, mood, pour, blink, look, setArm, seek, cue, speak, animate.
 * window.Demli olarak yüklenir (v1 ile aynı sayfada kullanılmaz). */
(function (root) {
  'use strict';
  var script = document.currentScript;
  var BASE = script && script.src ? script.src.replace(/[^/]*$/, '') : '';

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function ss(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  var EASE = {
    calm: function (t) { return -(Math.cos(Math.PI * t) - 1) / 2; },
    pour: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    out: function (t) { return 1 - Math.pow(1 - t, 3); }
  };
  function mulberry(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function Tw(v) { this.from = v; this.to = v; this.t0 = 0; this.dur = 0; this.ease = EASE.calm; }
  Tw.prototype.go = function (to, t, dur, ease) { this.from = this.val(t); this.to = to; this.t0 = t; this.dur = dur; this.ease = ease || EASE.calm; };
  Tw.prototype.k = function (t) { return this.dur <= 0 ? 1 : clamp((t - this.t0) / this.dur, 0, 1); };
  Tw.prototype.val = function (t) { return lerp(this.from, this.to, this.ease(this.k(t))); };

  var M = null, IMG = {}, loading = null;
  function loadAll() {
    if (loading) return loading;
    M = root.DEMLI2_PARCALAR;
    var p0 = M ? Promise.resolve(M) : fetch(BASE + 'parcalar.json').then(function (r) { return r.json(); });
    loading = p0.then(function (m) {
      M = m;
      return Promise.all(Object.keys(m.parcalar).map(function (k) {
        return new Promise(function (res, rej) {
          var im = new Image();
          im.onload = function () { IMG[k] = im; res(); };
          im.onerror = function () { rej(new Error('Demli: parça yüklenemedi ' + k)); };
          im.src = BASE + 'parcalar/' + m.parcalar[k].f;
        });
      }));
    });
    return loading;
  }

  // ---- ruh halleri ----
  var MOODS = {
    'sikilmis':        { tea: .9,  look: { x: .55, y: 0 }, eyes: 'acik', brow: 'flat', mouth: 'dinlenme', arm: 'present', lid: 0 },
    'kas-kalkik':      { tea: .9,  look: { x: .6, y: 0 },  eyes: 'kisik', brow: 'one',  mouth: 'U',        arm: 'present', lid: 0 },
    'etkilenmis':      { tea: 1,   look: { x: .1, y: 0 },  eyes: 'acik', brow: 'up',   mouth: 'L',        arm: 'point', lid: 0 },
    'tasti':           { tea: 1,   look: { x: 0, y: 0 },   eyes: 'iri',  brow: 'high', mouth: 'O',        arm: 'hip', lid: 0 },
    'hayal-kirikligi': { tea: .32, look: { x: .1, y: .7 }, eyes: 'uykulu', brow: 'sad',  mouth: 'F',        arm: 'down', lid: .3 },
    'sok':             { tea: .06, look: { x: 0, y: 0 },   eyes: 'iri',  brow: 'high', mouth: 'O',        arm: 'down', lid: 0 },
    'dusunuyor':       { tea: .9,  look: { x: .75, y: 0 }, eyes: 'acik', brow: 'one',  mouth: 'dinlenme', arm: 'chin', lid: 0 }
  };
  // kaş: raise (px, yukarı +), tilt (derece; + iç uç yukarı), kemer (sağ kaş kemerli çizim)
  var BROWS = {
    flat: { L: [0, 0], R: [0, 0], arch: 0 },
    up: { L: [7, 0], R: [7, 0], arch: 0 },
    high: { L: [15, 0], R: [15, 0], arch: 0 },
    one: { L: [-1, 0], R: [4, 0], arch: 1 },
    sad: { L: [3, 9], R: [3, 9], arch: 0 },
    angry: { L: [-3, -9], R: [-3, -9], arch: 0 }
  };
  // göz kareleri (goz-sayfasi.png): acik = tabandaki katmanlı göz; diğerleri tam kare
  var EYES = { acik: 'acik', normal: 'acik', iri: 'saskin', saskin: 'saskin', sok: 'saskin', uykulu: 'uykulu', kisik: 'kisik', supheli: 'kisik', yukari: 'yukari' };
  var MOUTHS = { flat: 'dinlenme', small: 'L', o: 'O', frown: 'F', smile: 'A' };
  var VIS_LEAD = 30;

  function Rig(host, opts) {
    var self = this;
    this.opts = opts = opts || {};
    this.host = host;
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'width:100%;height:100%;display:block';
    host.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.clock = 0; this.cues = []; this.talk = null;
    this.rng = mulberry(opts.seed || 7);
    this.blinking = opts.blink !== false;
    this.nextBlink = 1600 + this.rng() * 2000; this.blinkStart = -1e9; this.blink2 = -1e9;
    this.T = {};
    var t = function (n, v) { self.T[n] = new Tw(v); };
    t('tea', .9); t('lookX', .55); t('lookY', 0); t('lid', 0); t('faceY', 0);
    t('bLr', 0); t('bLt', 0); t('bRr', 0); t('bRt', 0); t('arch', 0); t('mk', 1);
    this.mouth = { name: 'dinlenme', k: 1 };
    this.viseme = null;
    this.eyes = 'acik';
    this.arms = { cur: 'present', prev: null, t0: -1e9, dur: 0 };
    this.view = null; this.flip = false;
    this.ready = loadAll().then(function () {
      self._teaCanvas = document.createElement('canvas');
      self._teaCanvas.width = M.tuval[0]; self._teaCanvas.height = M.tuval[1];
      self._teaLevel = null;
      self._eyeC = { L: document.createElement('canvas'), R: document.createElement('canvas') };
      if (!self.view) self.view = (opts.view || M.kadraj.tam).slice();
      if (opts.mood) self.mood(opts.mood, { dur: 0 });
      if (opts.state) self.set(opts.state, 0);
      self.render(self.clock);
      return self;
    });
    if (window.ResizeObserver) new ResizeObserver(function () { if (M && IMG.govde) self.render(self.clock); }).observe(host);
  }

  // ---------- durum ----------
  Rig.prototype._go = function (n, v, d, e) { this.T[n].go(v, this.clock, d, e); };
  Rig.prototype.set = function (o, ms) {
    var D = ms == null ? 340 : ms, t = this.clock;
    if (o.tea != null) this._go('tea', clamp(o.tea, 0, 1), o.teaMs != null ? o.teaMs : (D === 0 ? 0 : Math.max(D, 600)), EASE.pour);
    if (o.look) { this._go('lookX', clamp(o.look.x, -1, 1), D); this._go('lookY', clamp(o.look.y, -1, 1), D); }
    if (o.lid != null) this._go('lid', typeof o.lid === 'object' ? (o.lid.l + o.lid.r) / 2 : o.lid, D);
    if (o.face != null) this._go('faceY', o.face, D);
    if (o.eyes) this.eyes = EYES[o.eyes] || 'acik'; // kesme: göz kareleri anında değişir
    if (o.brow != null) {
      var b = typeof o.brow === 'string' ? BROWS[o.brow] : typeof o.brow === 'number' ? { L: [o.brow, 0], R: [o.brow, 0], arch: 0 } :
        { L: [o.brow.l ? o.brow.l.raise || 0 : 0, o.brow.l ? o.brow.l.tilt || 0 : 0], R: [o.brow.r ? o.brow.r.raise || 0 : 0, o.brow.r ? o.brow.r.tilt || 0 : 0], arch: o.brow.arch || 0 };
      if (b) {
        this._go('bLr', b.L[0], D); this._go('bLt', b.L[1], D); this._go('bRr', b.R[0], D); this._go('bRt', b.R[1], D);
        this._go('arch', b.arch, D === 0 ? 0 : 140);
      }
    }
    if (o.mouth) {
      var mn = typeof o.mouth === 'string' ? o.mouth : 'dinlenme';
      this.mouth = { name: MOUTHS[mn] || mn, k: o.mouthK != null ? o.mouthK : 1 };
    }
    if (o.viseme !== undefined) this.viseme = o.viseme ? { name: o.viseme, k: o.visemeK != null ? o.visemeK : 1 } : null;
    if (o.arm) this.setArm(o.arm, D === 0 ? 0 : Math.max(D, 240));
    return this;
  };
  Rig.prototype.mood = function (name, o) {
    var p = MOODS[name]; if (!p) throw new Error('Demli: bilinmeyen ruh hali ' + name);
    o = o || {};
    var s = {}; for (var k in p) s[k] = p[k];
    if (o.arm === false) delete s.arm;
    if (o.tea === false) delete s.tea;
    this.currentMood = name;
    var d = o.dur == null ? 340 : o.dur;
    if (s.tea != null && d > 0) { var dt = Math.abs(s.tea - this.T.tea.to); s.teaMs = 450 + dt * 1250; }
    return this.set(s, d);
  };
  Rig.prototype.pour = function (to, ms) { this._go('tea', clamp(to, 0, 1), ms == null ? 1500 : ms, EASE.pour); return this; };
  Rig.prototype.look = function (x, y, dur) { return this.set({ look: { x: x, y: y } }, dur); };
  Rig.prototype.blink = function () { this.blinkStart = this.clock; return this; };
  Rig.prototype.setArm = function (name, dur) {
    if (!M || !M.kollar[name]) { if (!M) this.arms.cur = name; return this; }
    if (name === this.arms.cur) return this;
    this.arms = { prev: this.arms.cur, cur: name, t0: this.clock, dur: dur == null ? 240 : dur };
    return this;
  };
  Rig.prototype.setView = function (v) { this.view = typeof v === 'string' ? M.kadraj[v].slice() : v.slice(); this.render(this.clock); return this; };
  Rig.prototype.cue = function (t, fn) { this.cues.push({ t: t, fn: fn, done: false }); this.cues.sort(function (a, b) { return a.t - b.t; }); return this; };
  Rig.prototype.seek = function (t) {
    for (var i = 0; i < this.cues.length; i++) {
      var c = this.cues[i];
      if (!c.done && c.t <= t) { this.clock = c.t; c.done = true; c.fn(this); }
    }
    this.clock = t;
    this.render(t);
    return this;
  };
  Rig.prototype.animate = function () {
    if (this._raf) return this;
    var self = this, last = performance.now();
    if (this.opts.follow) this._bindFollow();
    function loop(now) { self.seek(self.clock + Math.min(100, now - last)); last = now; self._raf = requestAnimationFrame(loop); }
    this._raf = requestAnimationFrame(loop);
    return this;
  };
  Rig.prototype.stop = function () { cancelAnimationFrame(this._raf); this._raf = null; return this; };
  Rig.prototype._bindFollow = function () {
    var self = this; if (this._fb) return;
    this._fb = function (e) {
      if (!M) return;
      var r = self.canvas.getBoundingClientRect(), p = self._toScreen(635, 385, r);
      var x = clamp((e.clientX - p[0]) / (r.width * .5), -1, 1), y = clamp((e.clientY - p[1]) / (r.height * .5), -1, 1);
      if (Math.abs(x - self.T.lookX.to) > .04 || Math.abs(y - self.T.lookY.to) > .04) self.set({ look: { x: x, y: y } }, 260);
    };
    window.addEventListener('pointermove', this._fb);
  };

  // ---------- konuşma (v1 ile aynı JSON) ----------
  Rig.prototype.speak = function (tl, o) {
    o = o || {};
    if (Array.isArray(tl)) tl = { visemes: tl };
    var start = o.start != null ? o.start : this.clock;
    var vs = (tl.visemes || []).map(function (v) { return { t: start + v.t * 1000, v: v.viseme, k: v.k == null ? 1 : v.k }; });
    var last = vs.length ? vs[vs.length - 1].t : start;
    this.talk = {
      start: start, end: start + (tl.sure != null ? tl.sure * 1000 : (last - start) + 400), vs: vs, fps: tl.fps || 30,
      blinks: (tl.kirpma || []).map(function (s) { return start + s * 1000; }),
      emph: (tl.vurgu || []).map(function (v) { return { t0: start + v.t0 * 1000, t1: start + v.t1 * 1000 }; }),
      gaze: (tl.bakis || []).map(function (b) { return { t: start + b.t * 1000, x: b.x, y: b.y }; }),
      env: tl.zarf || null
    };
    return this;
  };
  Rig.prototype.stopSpeaking = function () { this.talk = null; return this; };
  Rig.prototype._talkVis = function (t) {
    var s = this.talk; if (!s || t > s.end + 120) return null;
    var vs = s.vs, lo = 0, hi = vs.length - 1, i = -1;
    while (lo <= hi) { var mid = (lo + hi) >> 1; if (vs[mid].t - VIS_LEAD <= t) { i = mid; lo = mid + 1; } else hi = mid - 1; }
    if (i < 0 || t > s.end) return { name: 'dinlenme', k: 1 };
    return { name: vs[i].v, k: vs[i].k };
  };
  Rig.prototype._emph = function (t) {
    var s = this.talk; if (!s) return 0; var m = 0;
    s.emph.forEach(function (e) { m = Math.max(m, Math.min(ss(e.t0 - 120, e.t0 + 80, t), 1 - ss(e.t1 + 60, e.t1 + 440, t))); });
    return m;
  };
  Rig.prototype._gaze = function (t) {
    var s = this.talk; if (!s || !s.gaze.length) return [0, 0];
    var x = 0, y = 0;
    for (var i = 0; i < s.gaze.length; i++) {
      var g = s.gaze[i]; if (t < g.t) break;
      var k = EASE.calm(clamp((t - g.t) / 420, 0, 1)); x = lerp(x, g.x, k); y = lerp(y, g.y, k);
    }
    var back = ss(s.end + 200, s.end + 700, t);
    return [x * (1 - back), y * (1 - back)];
  };
  Object.defineProperty(Rig.prototype, 'mouthOpen', {
    get: function () {
      var v = this._mouthNow || { name: 'dinlenme', k: 1 };
      var o = { dinlenme: 0, kapali: 0, A: 1, E: .55, O: .8, U: .6, F: .45, L: .55, S: .35 }[v.name];
      return (o == null ? 0 : o) * (v.k || 1);
    }
  });

  // ---------- göz kırpma ----------
  Rig.prototype._blinkAmt = function (t) {
    if (this.blinking) {
      var guard = 0, tk = this.talk;
      while (t >= this.nextBlink && guard++ < 50) {
        if (tk && this.nextBlink > tk.start - 300 && this.nextBlink < tk.end + 300) { this.rng(); this.nextBlink += 3000 + this.rng() * 3000; continue; }
        this.blinkStart = this.nextBlink;
        this.blink2 = this.rng() < .2 ? this.blinkStart + 250 : -1e9;
        this.nextBlink = this.blinkStart + 3000 + this.rng() * 3000;
      }
    }
    // kesme animasyonu: açık -> yarı (kapak iner) -> kapalı kare -> yarı -> açık; toplam ~170 ms
    function c(d) { if (d < 0 || d > 170) return 0; if (d < 50) return d / 50; if (d < 100) return 1; return 1 - (d - 100) / 70; }
    var m = Math.max(c(t - this.blinkStart), c(t - this.blink2));
    if (this.talk) this.talk.blinks.forEach(function (b) { m = Math.max(m, c(t - b)); });
    return m;
  };

  // ---------- çizim ----------
  Rig.prototype._fit = function () {
    var c = this.canvas, dpr = window.devicePixelRatio || 1;
    var w = Math.max(1, Math.round(c.clientWidth * dpr)), h = Math.max(1, Math.round(c.clientHeight * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    var v = this.view, s = Math.min(w / v[2], h / v[3]);
    return { s: s, ox: (w - v[2] * s) / 2 - v[0] * s, oy: (h - v[3] * s) / 2 - v[1] * s, w: w, h: h };
  };
  Rig.prototype._toScreen = function (x, y, r) {
    var f = this._lastFit || this._fit(), dpr = window.devicePixelRatio || 1;
    return [r.left + (f.ox + x * f.s) / dpr, r.top + (f.oy + y * f.s) / dpr];
  };
  function part(n) { return M.parcalar[n]; }
  function draw(ctx, n, dx, dy, sx, sy) {
    var p = part(n), im = IMG[n]; if (!p || !im) return;
    sx = sx || 1; sy = sy || sx;
    ctx.drawImage(im, p.x + (dx || 0), p.y + (dy || 0), p.w * sx, p.h * sy);
  }

  // çay seviyesi: gövdenin iç bölgesi satır satır yeniden kurulur (gerçek çizimdeki boş cam, yüzey ve çay şeritlerinden)
  Rig.prototype._teaBody = function (lvl) {
    var key = Math.round(lvl * 1000);
    if (this._teaLevel === key) return this._teaCanvas;
    this._teaLevel = key;
    var C = M.cay, cv = this._teaCanvas, g = cv.getContext('2d'), src = IMG.govde;
    g.clearRect(0, 0, cv.width, cv.height);
    g.drawImage(src, 0, 0);
    var ys = Math.round(lerp(C.y_bos, C.y_dolu, lvl)); // yüzey çizgisinin yeni yeri
    var bs0 = C.bant_yuzey[0], bs1 = C.bant_yuzey[1], off = C.cizgi - bs0;
    var top = ys - off, bot = top + (bs1 - bs0);
    function tile(y, b0, h) { var k = ((y - b0) % (2 * h) + 2 * h) % (2 * h); return k < h ? b0 + k : b0 + 2 * h - 1 - k; } // ileri-geri döşeme: dikiş yok
    function X(y) { var i = y - C.y0; return i >= 0 && i < C.xl.length ? [C.xl[i], C.xr[i]] : null; }
    // kenara yapışık eşleme: sol yarı sol duvardan, sağ yarı sağ duvardan; arada kalan orta sütun esnetilir
    function rowEdge(sy, ty) {
      var s = X(sy), d = X(ty); if (!s || !d || d[1] <= d[0] || s[1] <= s[0]) return;
      var hs = (s[1] - s[0]) / 2, hd = (d[1] - d[0]) / 2, w = Math.floor(Math.min(hs, hd));
      g.clearRect(d[0], ty, d[1] - d[0], 1);
      g.drawImage(src, s[0], sy, w, 1, d[0], ty, w, 1);
      g.drawImage(src, s[1] - w, sy, w, 1, d[1] - w, ty, w, 1);
      if (d[1] - d[0] > 2 * w) { var cx = Math.round((s[0] + s[1]) / 2); g.drawImage(src, cx - 1, sy, 2, 1, d[0] + w, ty, d[1] - d[0] - 2 * w, 1); }
    }
    var bos = IMG['govde-bos'], bp = M.parcalar['govde-bos'];
    function rowEmpty(ty) {
      var d = X(ty); if (!d || d[1] <= d[0]) return;
      if (!bos || ty < bp.y || ty >= bp.y + bp.h) return rowEdge(tile(ty, e0, eh), ty);
      g.clearRect(d[0], ty, d[1] - d[0], 1);
      g.drawImage(bos, 0, ty - bp.y, bp.w, 1, bp.x, ty, bp.w, 1);
    }
    function rowScale(sy, ty) {
      var s = X(sy), d = X(ty); if (!s || !d || d[1] <= d[0] || s[1] <= s[0]) return;
      g.clearRect(d[0], ty, d[1] - d[0], 1);
      g.drawImage(src, s[0], sy, s[1] - s[0], 1, d[0], ty, d[1] - d[0], 1);
    }
    var e0 = C.bant_bos[0], eh = C.bant_bos[1] - e0, c0 = C.bant_cay[0], chh = C.bant_cay[1] - c0;
    // boş camın üst kısmı her zaman boş cam çiziminden (kasnak altında 26 satırda yumuşak geçiş): seviye değişince sıçrama olmaz
    if (bos) for (var ye = C.bos_ust; ye < Math.min(top, bs0); ye++) {
      var d0 = X(ye); if (!d0 || ye < bp.y) continue;
      g.globalAlpha = clamp((ye - C.bos_ust + 1) / 26, 0, 1);
      g.drawImage(bos, 0, ye - bp.y, bp.w, 1, bp.x, ye, bp.w, 1);
    }
    g.globalAlpha = 1;
    var y1 = Math.max(bot, bs1);
    for (var y = Math.min(top, bs0); y < y1; y++) {
      if (y < top) { if (y >= bs0) rowEmpty(y); }                         // boş cam (gerçek boş cam çizimi, satır satır)
      else if (y < bot) rowScale(bs0 + (y - top), y);                     // yüzey şeridi (elips)
      else if (y < bs1) rowEdge(tile(y, c0, chh), y);                    // seviye yükseldiyse yüzeyin altı çay
    }
    return cv;
  };

  Rig.prototype._eye = function (side, x, y, lidK, look) {
    // akı + göz bebeği (akla kırpılmış) + kapak kırpması, sonra alt kontur ve kapak çizgisi
    var g = this._eyeC[side], E = M.goz[side], S = 2;
    var a0 = part('goz-' + side + '-ak'), a1 = part('goz-' + side + '-alt');
    var pa = { x: Math.min(a0.x, a1.x), y: Math.min(a0.y, a1.y) };
    var bw = Math.ceil(Math.max(a0.x + a0.w, a1.x + a1.w) - pa.x + 8), bh = Math.ceil(Math.max(a0.y + a0.h, a1.y + a1.h) - pa.y + 8);
    if (g.width !== bw * S || g.height !== bh * S) { g.width = bw * S; g.height = bh * S; }
    var c = g.getContext('2d');
    c.setTransform(S, 0, 0, S, -(pa.x - 4) * S, -(pa.y - 4) * S);
    c.clearRect(pa.x - 4, pa.y - 4, bw, bh);
    c.globalCompositeOperation = 'source-over';
    draw(c, 'goz-' + side + '-ak');
    c.globalCompositeOperation = 'source-atop';
    var range = (E.x1 - E.x0) / 2 - E.pr - 3, hc = (E.x0 + E.x1) / 2;
    var px = hc + look[0] * range - E.pcx, py = Math.max(0, look[1]) * (E.bot - E.top - E.pr * 1.2);
    draw(c, 'goz-' + side + '-bebek', px, py);
    var H = E.bot - E.top, drop = lidK * H * 1.05;
    c.globalCompositeOperation = 'source-over';
    draw(c, 'goz-' + side + '-alt');
    // kapak indikçe üstte kalan her şey (akın üstü, alt konturun köşeleri) kapak çizgisinin altına kırpılır
    c.globalCompositeOperation = 'destination-out';
    if (drop > 0) c.fillRect(pa.x - 4, pa.y - 4, bw, (E.top - pa.y + 4) + drop - 3);
    c.globalCompositeOperation = 'source-over';
    this.ctx.drawImage(g, pa.x - 4 + x, pa.y - 4 + y, bw, bh);
    draw(this.ctx, 'goz-' + side + '-kapak', x, y + drop);
  };

  Rig.prototype.render = function (t) {
    if (!M || !IMG.govde || !this.view) return;
    var T = this.T, v = function (k) { return T[k].val(t); };
    var f = this._lastFit = this._fit(), ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, f.w, f.h);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    // nefes: ayak tabanı (zemin) sabit, karakter tabandan çok az esner (kesme animasyonunda tek parça gövde). Tabak yok.
    var br = Math.sin(t / 3600 * Math.PI * 2), sy = 1 + br * .0035, baseY = M.zemin || 1080;
    // temas gölgesi zeminde durur, nefesle esnemez
    ctx.setTransform(f.s, 0, 0, f.s, f.ox, f.oy);
    if (IMG.golge) draw(ctx, 'golge');
    ctx.setTransform(f.s, 0, 0, f.s * sy, f.ox, f.oy + baseY * f.s * (1 - sy));

    // gövde + çay
    ctx.drawImage(this._teaBody(clamp(v('tea'), 0, 1)), 0, 0);

    // kollar (dış kollar gövdenin üstünde; eldiven konturun önüne biner)
    var A = this.arms, ak = A.dur > 0 ? clamp((t - A.t0) / A.dur, 0, 1) : 1;
    var self = this;
    function arms(name, alpha, front) {
      if (!name || alpha <= 0) return;
      M.kollar[name].forEach(function (n) {
        if (!!part(n).on !== front) return;
        ctx.globalAlpha = alpha;
        // yeni kol omuzdan hafif "pop" ile gelir
        var p = part(n), k = alpha < 1 && name === A.cur ? .94 + .06 * EASE.out(alpha) : 1;
        if (k !== 1) {
          var cx = p.x < M.bardak.cx ? p.x + p.w : p.x, cy = p.y + p.h * .3;
          ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy); draw(ctx, n); ctx.restore();
        } else draw(ctx, n);
        ctx.globalAlpha = 1;
      });
    }
    var aCur = EASE.calm(ak);
    arms(A.prev, 1 - aCur, false); arms(A.cur, aCur, false);

    // yüz
    var gz = this._gaze(t), em = this._emph(t);
    var lx = clamp(v('lookX') + gz[0], -1, 1), ly = clamp(v('lookY') + gz[1], -1, 1);
    var fx = lx * 2.5, fy = v('faceY') + ly * 2;
    var blink = this._blinkAmt(t), lid = clamp(v('lid') - em * .15, 0, 1);
    var mode = this.eyes;
    if (mode === 'acik' && ly < -.45) mode = 'yukari';
    var closed = blink > .75;
    ['L', 'R'].forEach(function (s) {
      if (closed) { draw(ctx, 'goz-' + s + '-kapali', fx, fy); return; }
      if (mode === 'acik') { self._eye(s, fx, fy, clamp(lid + blink * .9, 0, 1), [lx, ly]); return; }
      // kare gözlerde yarı kırpma: uykulu kare (şaşkın göz dikey basılır)
      if (blink > .25 && mode !== 'saskin') { draw(ctx, 'goz-' + s + '-uykulu', fx, fy); return; }
      var n = 'goz-' + s + '-' + mode, p = part(n), q = mode === 'saskin' ? 1 - blink * .7 : 1, cy = p.y + p.h / 2;
      ctx.save(); ctx.translate(0, cy + fy); ctx.scale(1, q); ctx.translate(0, -cy); draw(ctx, n, fx, 0); ctx.restore();
    });
    // kaşlar
    var arch = v('arch'), er = em * 7;
    function brow(n, r, tilt, inner) {
      var p = part(n), cx = p.x + p.w / 2, cy = p.y + p.h / 2;
      ctx.save(); ctx.translate(cx + fx, cy + fy - r); ctx.rotate(tilt * Math.PI / 180 * inner); ctx.translate(-cx, -cy); draw(ctx, n); ctx.restore();
    }
    if (this.eyes === 'saskin') { brow('kas-L-saskin', v('bLr') * .3 + er, 0, 1); brow('kas-R-saskin', v('bRr') * .3 + er, 0, -1); }
    else {
      brow('kas-L', v('bLr') + er, v('bLt'), 1);
      if (arch > .5) brow('kas-R-kemer', v('bRr') + er - 4, 0, -1);
      else brow('kas-R', v('bRr') + er, v('bRt'), -1);
    }
    // ağız: konuşma > elle viseme > ruh hali ağzı (kesme: şekiller anında değişir)
    var mv = this._talkVis(t) || this.viseme || this.mouth;
    this._mouthNow = mv;
    var mn = M.visemler[mv.name] || ('agiz-' + mv.name);
    if (!part(mn)) mn = 'agiz-dinlenme';
    var mp = part(mn), open = /^(A|E|O|U|F|L)$/.test(mv.name), kk = open ? clamp(.78 + .24 * (mv.k == null ? 1 : mv.k), .7, 1.04) : 1;
    ctx.save(); ctx.translate(0, mp.y + fy); ctx.scale(1, kk); ctx.translate(0, -mp.y); draw(ctx, mn, fx * 1.2, 0); ctx.restore();

    // önde duran kollar (bağlı kollar, çenede el)
    arms(A.prev, 1 - aCur, true); arms(A.cur, aCur, true);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  };

  var Demli = {
    create: function (el, opts) { if (typeof el === 'string') el = document.querySelector(el); return new Rig(el, opts); },
    MOODS: Object.keys(MOODS),
    ARMS: ['hip', 'point', 'present', 'chin', 'cross', 'down'],
    VISEMES: ['dinlenme', 'kapali', 'A', 'E', 'O', 'U', 'F', 'L', 'S'],
    BROWS: Object.keys(BROWS),
    EYES: ['acik', 'yukari', 'uykulu', 'kisik', 'saskin'],
    load: loadAll,
    version: '2.0.0'
  };
  root.Demli = Demli;
})(typeof window !== 'undefined' ? window : this);
