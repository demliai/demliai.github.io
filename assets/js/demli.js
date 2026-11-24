// Demli · rig2 sarmalayıcısı. Sayfalar kuklaya yalnız bu modülden ulaşır.
//
// Rig dosyaları tek yerde: assets/rig/ (demli-rig2.js + parcalar.js/json + parcalar/), stüdyodan
// `py -3.11 araclar/rig_al.py` ile alınır. Rig değişince yalnız o klasör değişir; bu modül ve sayfalar değişmez.
// Kadraj ve zemin manifestten okunur. Statik yedek görseller (JS kapalıyken görünen): node araclar/demli-kare.mjs

const RIG = new URL('../rig/', import.meta.url);
const BETIKLER = [new URL('parcalar.js', RIG).href, new URL('demli-rig2.js', RIG).href];

// Tam boy kadraj: manifestteki kadraj.tam (taban çizim koordinatı). Yüklenene kadar bilinen değer.
export let KADRAJ = [215, 70, 840, 1001];
// Göz hizası (iki gözün ortası, taban koordinatı): imlece bakış için.
const GOZ = [635, 385];

// Eldiven delikleri onarılana dek kullanılmayan kollar ve yerine geçenleri.
// Yeni parçalar gelince bu tablo boşaltılır: { }.
const KOL_YEDEK = {};
// Ruh hallerinin rig içindeki varsayılan kolları (yedek kolu uygulamak için).
const HAL_KOLU = {
  sikilmis: 'present', 'kas-kalkik': 'present', etkilenmis: 'point', tasti: 'hip',
  'hayal-kirikligi': 'down', sok: 'down', dusunuyor: 'chin'
};
const kolSec = ad => KOL_YEDEK[ad] || ad;

export const azHareket = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

let yukleme = null;
function rigYukle() {
  if (window.Demli) return Promise.resolve(window.Demli);
  const yukle = src => new Promise((ok, red) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = () => red(new Error('Demli rig yüklenemedi: ' + src));
    document.head.append(s);
  });
  // parcalar.js önce: manifest betikle gelir, fetch gerekmez (file:// önizlemede de çalışır)
  yukleme ||= BETIKLER.reduce((p, src) => p.then(() => yukle(src)), Promise.resolve()).then(() => {
    if (!window.Demli) throw new Error('Demli rig: window.Demli yok');
    const m = window.DEMLI2_PARCALAR;
    if (m?.kadraj?.tam) KADRAJ = m.kadraj.tam.slice();
    return window.Demli;
  });
  return yukleme;
}

/**
 * Bir yuvaya canlı Demli kurar. Yuvadaki <img> statik yedektir; kukla hazır olunca
 * yuvaya "canli" sınıfı eklenir ve CSS yedeği gizler. Hata olursa yedek görünür kalır.
 * @param {HTMLElement} yuva
 * @param {{hal?:string, kol?:string, cay?:number, ilkCay?:number, bakis?:{x:number,y:number}, kapak?:number, tohum?:number}} s
 */
export async function demliKur(yuva, s = {}) {
  const Demli = await rigYukle();
  const katman = document.createElement('div');
  katman.className = 'demli-tuval';
  katman.setAttribute('aria-hidden', 'true');
  yuva.append(katman);
  const sakin = azHareket();
  const rig = Demli.create(katman, { seed: s.tohum ?? 11, view: KADRAJ, blink: !sakin });
  await rig.ready;

  const hal = s.hal || 'sikilmis';
  rig.mood(hal, { dur: 0 });
  const durus = {
    arm: kolSec(s.kol || HAL_KOLU[hal] || 'hip'),
    tea: s.ilkCay ?? s.cay ?? 0.9,
    lid: s.kapak ?? 0.12,
    look: s.bakis || { x: 0.45, y: 0.05 }
  };
  rig.set(durus, 0);
  rig.seek(0);
  yuva.classList.add('canli');

  let gorunur = true, calisiyor = false;
  const baslat = () => { if (!sakin && gorunur && !calisiyor) { rig.animate(); calisiyor = true; } };
  const durdur = () => { if (calisiyor) { rig.stop(); calisiyor = false; } };

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { gorunur = es[0].isIntersecting; gorunur ? baslat() : durdur(); }).observe(yuva);
  }
  document.addEventListener('visibilitychange', () => (document.hidden ? durdur() : baslat()));

  // Ekrandaki göz noktası (rig'in kadraj hesabının aynısı; özel işlevlere erişmeden).
  const gozEkranda = () => {
    const r = rig.canvas.getBoundingClientRect();
    const [vx, vy, vw, vh] = KADRAJ;
    const k = Math.min(r.width / vw, r.height / vh);
    const ox = (r.width - vw * k) / 2 - vx * k, oy = (r.height - vh * k) / 2 - vy * k;
    return { x: r.left + ox + GOZ[0] * k, y: r.top + oy + GOZ[1] * k, w: r.width, h: r.height };
  };
  const sinir = (v, a, b) => Math.max(a, Math.min(b, v));

  const api = {
    rig,
    /** Çayı verilen seviyeye doldurur (aşağıdan yukarı, sakin). */
    dok(seviye, ms = 1800) { if (sakin) { rig.set({ tea: seviye }, 0); rig.seek(rig.clock + 1); } else rig.pour(seviye, ms); return api; },
    hal(ad) { rig.mood(ad); const k = HAL_KOLU[ad]; if (k && KOL_YEDEK[k]) rig.setArm(kolSec(k), 0); if (sakin) rig.seek(rig.clock + 2000); return api; },
    kol(ad, ms) { rig.setArm(kolSec(ad), ms); return api; },
    ayarla(o, ms) { if (o.arm) o = { ...o, arm: kolSec(o.arm) }; rig.set(o, sakin ? 0 : ms); if (sakin) rig.seek(rig.clock + 1); return api; },
    /** İmlece bakar (yalnız hareket açıkken). */
    bak(cx, cy) {
      if (sakin) return api;
      const g = gozEkranda(); if (!g.w) return api;
      rig.set({ look: { x: sinir((cx - g.x) / (g.w * 0.9), -1, 1), y: sinir((cy - g.y) / (g.h * 0.7), -1, 1) } }, 260);
      return api;
    },
    baslat, durdur
  };
  baslat();
  return api;
}

/** Sayfadaki her [data-demli] yuvasını kurar. Yuva verisi: data-hal, data-kol, data-cay, data-ilk-cay. */
export function sayfadakiDemliler() {
  return Promise.all([...document.querySelectorAll('[data-demli]')].map(y =>
    demliKur(y, {
      hal: y.dataset.hal, kol: y.dataset.kol,
      cay: y.dataset.cay != null ? Number(y.dataset.cay) : undefined,
      ilkCay: y.dataset.ilkCay != null ? Number(y.dataset.ilkCay) : undefined
    }).then(api => { y._demli = api; return api; })
      .catch(e => { console.warn(e.message); return null; })
  ));
}
