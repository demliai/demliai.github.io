// Demli · site davranışı. İçerik HTML'de hazır (araclar/veri-bas.mjs); bu dosya yalnız üstüne ekler:
// veriyi taze okur, kalan süreyi yazar, Demli'yi canlandırır, açılış demlenmesini oynatır.
import { BOLGE } from './cizim.js';
import { sayfadakiDemliler, azHareket } from './demli.js';

const VERI = new URL('../veri/', import.meta.url);
const jsonAl = ad => fetch(new URL(ad + '.json', VERI)).then(r => (r.ok ? r.json() : Promise.reject(new Error(ad + '.json ' + r.status))));

async function veriTazele() {
  const bolgeler = [...document.querySelectorAll('[data-veri]')];
  const baglar = [...document.querySelectorAll('[data-baglanti]')];
  if (!bolgeler.length && !baglar.length) return;
  try {
    const [testler, baglantilar, sunumlar, duvar] = await Promise.all(['testler', 'baglantilar', 'sunumlar', 'duvar'].map(jsonAl));
    const veri = { testler, baglantilar, sunumlar, duvar };
    for (const el of bolgeler) {
      const f = BOLGE[el.dataset.veri]; if (!f) continue;
      const yeni = f(veri, el.dataset.kok || '');
      if (el.dataset.son !== yeni) { el.innerHTML = yeni; el.dataset.son = yeni; }
    }
    for (const a of baglar) { const b = baglantilar[a.dataset.baglanti]; if (b) a.href = b.adres; }
  } catch (e) {
    // Veri okunamazsa HTML'e basılmış içerik olduğu gibi kalır.
    console.warn('Demli: veri tazelenemedi, sayfadaki hâli gösteriliyor.', e.message);
  }
  kalanYaz();
}

function kalanYaz() {
  const yaz = () => document.querySelectorAll('[data-kalan]').forEach(el => {
    const fark = new Date(el.dataset.kalan) - Date.now();
    if (!(fark > 0)) { el.textContent = ''; return; }
    const g = Math.floor(fark / 864e5), s = Math.floor(fark % 864e5 / 36e5), d = Math.floor(fark % 36e5 / 6e4);
    el.textContent = '· ' + (g ? `${g} gün ${s} saat kaldı` : s ? `${s} saat ${d} dakika kaldı` : `${d} dakika kaldı`);
  });
  yaz();
  clearInterval(kalanYaz.t); kalanYaz.t = setInterval(yaz, 30000);
}

async function demliler() {
  const hepsi = (await sayfadakiDemliler()).filter(Boolean);
  for (const d of hepsi) {
    const yuva = d.rig.host.closest('[data-demli]');
    const hedef = Number(yuva.dataset.cay ?? 0.9);
    if (yuva.dataset.ilkCay != null) setTimeout(() => d.dok(hedef, 2000), azHareket() ? 0 : 500);
    if (yuva.dataset.takip != null && !azHareket()) {
      let bekle = 0;
      addEventListener('pointermove', e => {
        if (bekle) return; bekle = requestAnimationFrame(() => { bekle = 0; d.bak(e.clientX, e.clientY); });
      }, { passive: true });
    }
  }
}

// Mobil menü: Esc ile kapanır, bağlantıya basınca kapanır.
function menu() {
  const m = document.querySelector('.mobil-menu'); if (!m) return;
  addEventListener('keydown', e => { if (e.key === 'Escape' && m.open) { m.open = false; m.querySelector('summary').focus(); } });
  m.addEventListener('click', e => { if (e.target.closest('a')) m.open = false; });
}

menu();
veriTazele();
demliler();

// Site müziği "Gece çay ocağı" (kodla üretilir, varsayılan kapalı, sol alttaki düğmeyle açılır). Hata verse bile site çalışmaya devam eder.
import('./muzik.js').catch(() => {});
