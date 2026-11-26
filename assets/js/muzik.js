// Demli · "Gece çay ocağı" — tarayıcıda kodla üretilen sonsuz lo-fi müzik (WebAudio, dosya yok, telif yok).
// Kullanıcı isteği 2026-11-26: "demlinin sitesine bide bir müzik ekleyelim kapatılabilir seçeneği ile. demliye uygun bir müzik".
// Varsayılan KAPALI; düğmeyle açılır, tercih hatırlanır. Sonraki ziyarette, tercih açıksa ilk dokunuşta başlar (tarayıcı kuralı).
// Kullanım: <script type="module" src="assets/js/muzik.js"></script>  (düğmeyi kendisi ekler)

const LS = 'demli.muzik';
const BPM = 72, VURUS = 60 / BPM, OLCU = VURUS * 4;
// Re minör lo-fi dizisi; dördüncü akor A7(b9) Hicaz rengi verir.
const AKORLAR = [
  { kok: 38, notalar: [50, 53, 57, 60, 64] },   // Dm9   (D F A C E)
  { kok: 43, notalar: [50, 55, 58, 62, 65] },   // Gm9   (G Bb D F A)  — bas G
  { kok: 36, notalar: [52, 55, 59, 60, 64] },   // Cmaj7 (C E G B)
  { kok: 45, notalar: [49, 55, 57, 58, 61] },   // A7b9  (A C# G Bb)  — Hicaz
];
// Ezgi: Re Hicaz dizisi (D Eb F# G A Bb C) — yalnız A7 ölçüsünde F#/Eb, diğerlerinde doğal minör
const EZGI_MINOR = [62, 64, 65, 67, 69, 70, 72, 74];
const EZGI_HICAZ = [62, 63, 66, 67, 69, 70, 72, 74];
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

function tohum(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

class GeceCayOcagi {
  constructor() { this.ac = null; this.calisiyor = false; this.r = tohum(Date.now() & 0xffff); }

  kur() {
    const ac = this.ac = new (window.AudioContext || window.webkitAudioContext)();
    this.ana = ac.createGain(); this.ana.gain.value = 0;
    const sik = ac.createDynamicsCompressor(); sik.threshold.value = -20; sik.ratio.value = 3; sik.attack.value = 0.02; sik.release.value = 0.3;
    const sicak = ac.createBiquadFilter(); sicak.type = 'lowpass'; sicak.frequency.value = 5200; sicak.Q.value = 0.4;   // lo-fi tavan
    this.ana.connect(sik); sik.connect(sicak); sicak.connect(ac.destination);
    // Yumuşak oda yankısı (kısa, kodla üretilmiş dürtü yanıtı)
    this.yanki = ac.createConvolver(); this.yanki.buffer = this.dürtü(2.2);
    this.yankiGir = ac.createGain(); this.yankiGir.gain.value = 0.22; this.yankiGir.connect(this.yanki); this.yanki.connect(this.ana);
    this.gurultu = this.beyazGurultu(2);
    this.cizirti();
  }

  dürtü(sn) {
    const ac = this.ac, n = ac.sampleRate * sn, b = ac.createBuffer(2, n, ac.sampleRate);
    for (let k = 0; k < 2; k++) { const d = b.getChannelData(k); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2); }
    return b;
  }
  beyazGurultu(sn) {
    const ac = this.ac, n = ac.sampleRate * sn, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  cikis(kazanc, yanki = 0) {
    const g = this.ac.createGain(); g.gain.value = kazanc; g.connect(this.ana);
    if (yanki) { const y = this.ac.createGain(); y.gain.value = yanki; g.connect(y); y.connect(this.yankiGir); }
    return g;
  }

  // Plak cızırtısı: sürekli çok kısık hışırtı + seyrek tıkırtılar
  cizirti() {
    const ac = this.ac, s = ac.createBufferSource(); s.buffer = this.gurultu; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 0.7;
    const g = ac.createGain(); g.gain.value = 0.006; s.connect(f); f.connect(g); g.connect(this.ana); s.start();
    this.cizirtiKaynak = s;
  }
  tik(t) {
    const ac = this.ac, s = ac.createBufferSource(); s.buffer = this.gurultu;
    const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500;
    const g = ac.createGain(); g.gain.setValueAtTime(0.05 + this.r() * 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
    s.connect(f); f.connect(g); g.connect(this.ana); s.start(t, this.r(), 0.02);
  }

  // Elektrikli piyano: iki sinüs (temel + yumuşak FM çanı), yavaş tremolo
  piyano(m, t, sure, hiz = 0.5) {
    const ac = this.ac, out = this.cikis(0.06 * hiz, 0.35);
    const o = ac.createOscillator(), mod = ac.createOscillator(), mg = ac.createGain(), env = ac.createGain();
    o.type = 'sine'; o.frequency.value = mtof(m);
    mod.type = 'sine'; mod.frequency.value = mtof(m) * 2.0; mg.gain.setValueAtTime(mtof(m) * 0.9, t); mg.gain.exponentialRampToValueAtTime(mtof(m) * 0.05, t + 0.6);
    mod.connect(mg); mg.connect(o.frequency);
    env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(1, t + 0.012); env.gain.exponentialRampToValueAtTime(0.35, t + 0.5); env.gain.exponentialRampToValueAtTime(0.0001, t + sure);
    const trem = ac.createOscillator(), tg = ac.createGain(); trem.frequency.value = 4.2; tg.gain.value = 0.12; trem.connect(tg); tg.connect(env.gain);
    o.connect(env); env.connect(out);
    [o, mod, trem].forEach(x => { x.start(t); x.stop(t + sure + 0.05); });
  }
  bas(m, t, sure) {
    const ac = this.ac, out = this.cikis(0.16), o = ac.createOscillator(), env = ac.createGain();
    o.type = 'sine'; o.frequency.value = mtof(m);
    env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(1, t + 0.03); env.gain.exponentialRampToValueAtTime(0.0001, t + sure);
    o.connect(env); env.connect(out); o.start(t); o.stop(t + sure + 0.05);
  }
  // Ney'e benzeyen yumuşak üflemeli ses: üçgen + hava gürültüsü + geç gelen vibrato
  ney(m, t, sure) {
    const ac = this.ac, out = this.cikis(0.05, 0.6);
    const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(m);
    const vib = ac.createOscillator(), vg = ac.createGain(); vib.frequency.value = 5; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(mtof(m) * 0.012, t + sure * 0.6);
    vib.connect(vg); vg.connect(o.frequency);
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1700;
    const hava = ac.createBufferSource(); hava.buffer = this.gurultu; const hf = ac.createBiquadFilter(); hf.type = 'bandpass'; hf.frequency.value = mtof(m) * 2; hf.Q.value = 2;
    const hg = ac.createGain(); hg.gain.value = 0.25;
    const env = ac.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(1, t + 0.18); env.gain.setValueAtTime(1, t + sure * 0.7); env.gain.linearRampToValueAtTime(0, t + sure);
    o.connect(f); f.connect(env); hava.connect(hf); hf.connect(hg); hg.connect(env); env.connect(out);
    o.start(t); vib.start(t); hava.start(t, this.r()); [o, vib, hava].forEach(x => x.stop(t + sure + 0.05));
  }
  // Davul: yumuşak tokmak, fırça trampet, sallama
  tokmak(t) {
    const ac = this.ac, out = this.cikis(0.32), o = ac.createOscillator(), env = ac.createGain();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    env.gain.setValueAtTime(1, t); env.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(env); env.connect(out); o.start(t); o.stop(t + 0.3);
  }
  firca(t, guc = 1) {
    const ac = this.ac, out = this.cikis(0.07 * guc, 0.3), s = ac.createBufferSource(); s.buffer = this.gurultu;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 0.6;
    const env = ac.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(1, t + 0.01); env.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    s.connect(f); f.connect(env); env.connect(out); s.start(t, this.r(), 0.25);
  }
  sallama(t, guc) {
    const ac = this.ac, out = this.cikis(0.025 * guc), s = ac.createBufferSource(); s.buffer = this.gurultu;
    const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const env = ac.createGain(); env.gain.setValueAtTime(1, t); env.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(f); f.connect(env); env.connect(out); s.start(t, this.r(), 0.06);
  }
  // Uzakta vapur düdüğü: iki alçak ton, uzun, boğuk, bol yankılı
  vapur(t) {
    const ac = this.ac, out = this.cikis(0.035, 1.2);
    [[98, 0], [98 * 1.26, 0]].forEach(([fr]) => {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr;
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
      const env = ac.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(1, t + 0.4); env.gain.setValueAtTime(1, t + 2.0); env.gain.linearRampToValueAtTime(0, t + 3.2);
      o.connect(f); f.connect(env); env.connect(out); o.start(t); o.stop(t + 3.3);
    });
  }
  // Çay kaşığı bardağa: iki üç kısa, ince "tın"
  kasik(t) {
    const ac = this.ac, out = this.cikis(0.03, 0.5);
    for (let i = 0; i < 2 + (this.r() < 0.5 ? 1 : 0); i++) {
      const tt = t + i * 0.13, o = ac.createOscillator(), env = ac.createGain();
      o.type = 'sine'; o.frequency.value = 3150 + this.r() * 250;
      env.gain.setValueAtTime(1, tt); env.gain.exponentialRampToValueAtTime(0.0001, tt + 0.35);
      o.connect(env); env.connect(out); o.start(tt); o.stop(tt + 0.4);
    }
  }

  // Bir ölçüyü (4 vuruş) planla
  olcuPlanla(n, t0) {
    const a = AKORLAR[n % 4], swing = VURUS * 0.17;
    // akor: vuruş 1'de ve "ve 3"te hafif kaydırarak (yumuşak arpej)
    a.notalar.forEach((m, i) => this.piyano(m, t0 + i * 0.018, OLCU * 0.62, 0.9));
    if (this.r() < 0.6) a.notalar.slice(1, 4).forEach((m, i) => this.piyano(m + (this.r() < 0.3 ? 12 : 0), t0 + VURUS * 2.5 + swing + i * 0.02, OLCU * 0.35, 0.55));
    this.bas(a.kok, t0, VURUS * 1.6); this.bas(a.kok + (this.r() < 0.5 ? 7 : 0), t0 + VURUS * 2, VURUS * 1.4);
    // davul (4. döngüden sonra girer, arada nefes ölçüleri)
    const davul = n >= 4 && (n % 16 !== 15);
    if (davul) {
      this.tokmak(t0); this.tokmak(t0 + VURUS * 2.5 + swing * 0.5);
      if (this.r() < 0.3) this.tokmak(t0 + VURUS * 1.5 + swing);
      this.firca(t0 + VURUS, 1); this.firca(t0 + VURUS * 3, 1);
      for (let i = 0; i < 8; i++) this.sallama(t0 + i * VURUS / 2 + (i % 2 ? swing : 0), i % 2 ? 0.7 : 1);
    }
    // ezgi: her 8 ölçüde 2 ölçülük cümle, seyrek
    if (n % 8 === 4 || (n % 8 === 6 && this.r() < 0.5)) {
      const dizi = (n % 4 === 3) ? EZGI_HICAZ : EZGI_MINOR;
      let t = t0 + VURUS * 0.5, k = 3 + Math.floor(this.r() * 3), sira = 2 + Math.floor(this.r() * 3);
      for (let i = 0; i < k; i++) {
        const sure = VURUS * (this.r() < 0.4 ? 1.5 : 1);
        this.ney(dizi[Math.max(0, Math.min(dizi.length - 1, sira))], t, sure * 0.95);
        t += sure; sira += this.r() < 0.55 ? -1 : 1;
      }
    }
    // ortam
    for (let i = 0; i < 3; i++) if (this.r() < 0.5) this.tik(t0 + this.r() * OLCU);
    if (n > 2 && n % 12 === 7 && this.r() < 0.7) this.vapur(t0 + VURUS);
    if (n % 6 === 3 && this.r() < 0.35) this.kasik(t0 + VURUS * (1 + this.r() * 2));
  }

  zamanlayici() {   // 100 ms'de bir, 1,5 sn ileriyi planla
    const ac = this.ac;
    while (this.sonraki < ac.currentTime + 1.5) { this.olcuPlanla(this.olcuNo++, this.sonraki); this.sonraki += OLCU; }
  }

  async baslat() {
    if (!this.ac) this.kur();
    if (this.ac.state === 'suspended') await this.ac.resume();
    if (this.calisiyor) return;
    this.calisiyor = true;
    this.olcuNo = 0; this.sonraki = this.ac.currentTime + 0.1;
    const g = this.ana.gain, t = this.ac.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.85, t + 3);
    this.saat = setInterval(() => this.zamanlayici(), 100); this.zamanlayici();
  }
  durdur() {
    if (!this.calisiyor) return;
    this.calisiyor = false; clearInterval(this.saat);
    const g = this.ana.gain, t = this.ac.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + 1.2);
    setTimeout(() => { if (!this.calisiyor) this.ac.suspend(); }, 1400);
  }
}

// ---- Düğme
const SIMGE_ACIK = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 18V6l10-2v12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16.5" cy="16" r="2.5" fill="#DC6C21" stroke="currentColor" stroke-width="2"/></svg>';
const SIMGE_KAPALI = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 18V6l10-2v12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/><circle cx="6.5" cy="18" r="2.5" fill="none" stroke="currentColor" stroke-width="2" opacity=".55"/><circle cx="16.5" cy="16" r="2.5" fill="none" stroke="currentColor" stroke-width="2" opacity=".55"/><path d="M4 4l16 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

const stil = document.createElement('style');
stil.textContent = `.muzik-dugme{position:fixed;left:calc(14px + env(safe-area-inset-left));bottom:calc(14px + env(safe-area-inset-bottom));z-index:50;display:flex;align-items:center;gap:8px;
height:42px;padding:0 14px 0 12px;border-radius:999px;border:1px solid rgba(247,238,228,.22);background:rgba(22,19,15,.72);color:#F7EEE4;
font:500 13px Inter,system-ui,sans-serif;cursor:pointer;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.muzik-dugme:hover{border-color:rgba(247,238,228,.45)}
.muzik-dugme:focus-visible{outline:2px solid #DC6C21;outline-offset:3px}
.muzik-dugme .muzik-yazi{white-space:nowrap}
@media (max-width:420px){.muzik-dugme .muzik-yazi{display:none}.muzik-dugme{padding:0 11px}}`;
document.head.appendChild(stil);

const muzik = new GeceCayOcagi();
const dugme = document.createElement('button');
dugme.className = 'muzik-dugme'; dugme.type = 'button';
function ciz(acik) {
  dugme.innerHTML = (acik ? SIMGE_ACIK : SIMGE_KAPALI) + `<span class="muzik-yazi">${acik ? 'Müzik açık' : 'Müzik'}</span>`;
  dugme.setAttribute('aria-pressed', acik ? 'true' : 'false');
  dugme.setAttribute('aria-label', acik ? 'Müziği kapat' : 'Müziği aç: gece çay ocağı');
  dugme.title = acik ? 'Müziği kapat' : 'Müziği aç';
}
let tercih = false; try { tercih = localStorage.getItem(LS) === '1'; } catch (e) {}
ciz(false);
dugme.addEventListener('click', async () => {
  const ac = !muzik.calisiyor;
  ac ? await muzik.baslat() : muzik.durdur();
  ciz(ac); try { localStorage.setItem(LS, ac ? '1' : '0'); } catch (e) {}
});
document.body.appendChild(dugme);
// Ana sayfa tek ekran: alt künye ve kartlar dar ekranda sol alt köşeyi doldurur; çakışırsa düğme boş olan sol üste geçer.
function yerlestir() {
  dugme.style.bottom = ''; dugme.style.top = '';
  const engeller = [...document.querySelectorAll('.merkez-kunye, .kartlar li')];
  if (!engeller.length) return;
  const a = dugme.getBoundingClientRect();
  const carpar = engeller.some(el => { const b = el.getBoundingClientRect(); return a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom; });
  if (carpar) { dugme.style.top = 'calc(14px + env(safe-area-inset-top))'; dugme.style.bottom = 'auto'; }
}
yerlestir(); addEventListener('resize', yerlestir); addEventListener('load', yerlestir);
// Önceki ziyarette açık bırakıldıysa: ilk dokunuşta kendiliğinden devam (tarayıcılar sesi ancak dokunuştan sonra açar)
if (tercih) {
  const ilk = async e => { if (e.target.closest && e.target.closest('.muzik-dugme')) return; await muzik.baslat(); ciz(true); };
  ['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, ilk, { once: true }));
}
document.addEventListener('visibilitychange', () => { if (document.hidden && muzik.calisiyor) muzik.ac.suspend(); else if (!document.hidden && muzik.calisiyor) muzik.ac.resume(); });
export default muzik;
