// Demli · veriden HTML üreten saf işlevler. Hem tarayıcıda (site.js) hem Node'da (araclar/veri-bas.mjs) çalışır.
// Sayfadaki her rakam, tarih ve liste buradan geçer; metne elle yazılmaz.
// Bölge sözleşmesi: <div data-veri="ad" data-kok="../"><!--veri-->…<!--/veri--></div>

const KACIS = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const k = s => String(s ?? '').replace(/[&<>"']/g, c => KACIS[c]);

const SAAT_DILIMI = 'Europe/Istanbul';
export function tarihMetni(iso) {
  const d = new Date(iso);
  const gun = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', weekday: 'long', timeZone: SAAT_DILIMI }).formatToParts(d);
  const p = t => gun.find(x => x.type === t)?.value;
  const saat = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: SAAT_DILIMI }).format(d);
  return `${p('day')} ${p('month')} ${p('weekday')}, ${saat}`;
}
export const kisaTarih = iso => new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', timeZone: SAAT_DILIMI }).format(new Date(iso));

const SAYI = ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz', 'on'];
export const yaziyla = n => SAYI[n] ?? String(n);
const buyukHarf = s => s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1);

const DURUM = { bekliyor: 'Henüz demlenmedi', demleniyor: 'Demleniyor', bitti: 'Demlendi' };

export function ortalama(m) {
  const p = Object.values(m.puan).filter(v => typeof v === 'number');
  return p.length ? Math.round(p.reduce((a, b) => a + b, 0) / p.length * 10) / 10 : null;
}

// ---------- çay ölçer: ince belli bardak, tabaksız ----------
// 100x160 kutuda bardak; seviye 0..1. Boşsa (null) kesikli bekleme çizgisi.
const BARDAK = 'M12 6 C14 32 27 46 27 64 C27 86 15 102 15 127 C15 146 27 156 40 156 L60 156 C73 156 85 146 85 127 C85 102 73 86 73 64 C73 46 86 32 88 6 Z';
const UST = 10, ALT = 154;
let kimlik = 0;
export function olcer(puan, { etiket = '', boy = 'orta' } = {}) {
  const id = 'b' + (++kimlik).toString(36) + Math.round(Math.abs(puan ?? 7) * 13).toString(36);
  const dolu = typeof puan === 'number';
  const sev = dolu ? Math.max(0, Math.min(1, puan / 100)) : 0;
  const y = ALT - sev * (ALT - UST);
  const cay = dolu ? `<g clip-path="url(#${id})"><rect x="0" y="${y.toFixed(1)}" width="100" height="${(160 - y).toFixed(1)}" fill="#AD341B"/>` +
    `<rect x="0" y="${(y - 1.5).toFixed(1)}" width="100" height="4" fill="#DC6C21"/></g>` :
    `<line x1="22" x2="78" y1="118" y2="118" stroke="#9C8C7C" stroke-width="1.5" stroke-dasharray="3 4"/>`;
  return `<svg class="olcer olcer-${boy}" viewBox="0 0 100 160" role="img" aria-label="${k(etiket)}">` +
    `<defs><clipPath id="${id}"><path d="${BARDAK}"/></clipPath></defs>` +
    `<path d="${BARDAK}" fill="rgba(247,238,228,.05)"/>${cay}` +
    `<path d="M22 22 C24 40 33 52 33 66" fill="none" stroke="rgba(247,238,228,.55)" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="M24 112 C22 124 23 136 28 144" fill="none" stroke="rgba(247,238,228,.35)" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="${BARDAK}" fill="none" stroke="#F7EEE4" stroke-width="2.6" stroke-linejoin="round"/></svg>`;
}

// Puan cetveli bardağı: kalemler alttan üste katman katman (yükseklik = puan payı).
export function cetvelBardak(cetvel, ad) {
  const id = 'c' + (++kimlik).toString(36);
  const toplam = cetvel.reduce((a, [, p]) => a + p, 0);
  const tonlar = ['#AD341B', '#93301A', '#B9461F', '#8A2A15', '#C4552A'];
  let y = ALT, katman = '', etiket = '';
  cetvel.forEach(([kalem, p], i) => {
    const h = p / toplam * (ALT - UST);
    katman += `<rect x="0" y="${(y - h).toFixed(1)}" width="100" height="${h.toFixed(1)}" fill="${tonlar[i % tonlar.length]}"/>` +
      (i ? `<line x1="0" x2="100" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#1E1712" stroke-width="1.4"/>` : '');
    etiket += `<li style="--alt:${((ALT - y + h / 2) / 160 * 100).toFixed(2)}%"><span class="cetvel-puan">${p}</span> ${k(kalem)}</li>`;
    y -= h;
  });
  return `<div class="cetvel"><svg class="cetvel-bardak" viewBox="0 0 100 160" role="img" aria-label="${k(ad)} puan cetveli, toplam ${toplam}">` +
    `<defs><clipPath id="${id}"><path d="${BARDAK}"/></clipPath></defs><g clip-path="url(#${id})">${katman}</g>` +
    `<path d="M22 22 C24 40 33 52 33 66" fill="none" stroke="rgba(247,238,228,.5)" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="${BARDAK}" fill="none" stroke="#F7EEE4" stroke-width="2.6" stroke-linejoin="round"/></svg>` +
    `<ol class="cetvel-kalem" reversed>${etiket}</ol></div>`;
}

const aileSinif = a => 'aile-' + a.toLocaleLowerCase('tr-TR').replace(/[^a-z]/g, '');

// ---------- bölgeler ----------
export const BOLGE = {
  // Ana sayfa: sıradaki test özeti
  'test-ozet'(v) {
    const t = v.testler, n = t.modeller.length;
    return `<p class="ust-not"><span class="nokta-durum durum-${k(t.durum)}"></span>${k(DURUM[t.durum] || t.durum)}</p>` +
      `<h2 class="bolum-baslik" id="test-baslik">${k(t.test)}, <span class="kirik">${k(kisaTarih(t.tarih))}’de.</span></h2>` +
      `<p class="giris">${buyukHarf(yaziyla(t.gorevler.length))} görev, ${yaziyla(n)} model, kelimesi kelimesine aynı prompt. Her model tek atış yapar; puanı çay ölçer, hesabı adisyon verir.</p>` +
      `<p class="zaman"><time datetime="${k(t.tarih)}">${k(tarihMetni(t.tarih))}</time> <span class="kalan" data-kalan="${k(t.tarih)}"></span></p>`;
  },
  // Çay ölçer sırası (model başına bir bardak)
  'olcer-sira'(v) {
    const t = v.testler;
    return `<ul class="olcer-sira" aria-label="Modeller ve ortalama puanları">` + t.modeller.map(m => {
      const o = ortalama(m);
      const et = o == null ? `${m.aile} ${m.ad}: henüz puan yok` : `${m.aile} ${m.ad}: ortalama ${o}`;
      return `<li>${olcer(o, { etiket: et })}<span class="olcer-puan">${o == null ? '—' : String(o).replace('.', ',')}</span>` +
        `<span class="olcer-ad"><span class="aile-nokta ${aileSinif(m.aile)}"></span>${k(m.ad)}</span><span class="olcer-arac">${k(m.arac)}</span></li>`;
    }).join('') + `</ul>`;
  },
  // Görev listesi (ana sayfa ve test sayfası)
  'gorev-liste'(v) {
    return `<ol class="gorev-liste">` + v.testler.gorevler.map((g, i) => {
      const agir = g.cetvel ? g.cetvel.reduce((a, b) => (b[1] > a[1] ? b : a)) : null;
      return `<li><span class="gorev-sira">${i + 1}</span><div><h3>${k(g.ad)}</h3><p>${k(g.ozet)}</p>` +
        (agir ? `<p class="gorev-meta">En ağır kalem: ${k(agir[0])}, ${agir[1]} puan</p>` : '') + `</div></li>`;
    }).join('') + `</ol>`;
  },
  // Test sayfası: kurallar
  'kurallar'(v) {
    return `<dl class="kurallar">` + v.testler.kurallar.map(r => `<div><dt>${k(r.ad)}</dt><dd>${k(r.metin)}</dd></div>`).join('') + `</dl>`;
  },
  // Test sayfası: görev başına cetvel bardağı
  'cetveller'(v) {
    return v.testler.gorevler.map((g, i) => `<article class="gorev-kart" aria-labelledby="g-${k(g.id)}">` +
      `<p class="gorev-no">Görev ${i + 1}</p><h3 id="g-${k(g.id)}">${k(g.ad)}</h3><p class="gorev-ozet">${k(g.ozet)}</p>` +
      cetvelBardak(g.cetvel, g.ad) + `</article>`).join('');
  },
  // Test sayfası: sonuç tablosu
  'sonuc-tablo'(v) {
    const t = v.testler;
    const bas = `<tr><th scope="col">Model</th>${t.gorevler.map(g => `<th scope="col">${k(g.ad)}</th>`).join('')}<th scope="col">Ortalama</th></tr>`;
    const sat = t.modeller.map(m => {
      const o = ortalama(m);
      return `<tr><th scope="row"><span class="aile-nokta ${aileSinif(m.aile)}"></span>${k(m.aile)} ${k(m.ad)}<span class="tablo-arac">${k(m.arac)}</span></th>` +
        t.gorevler.map(g => `<td data-etiket="${k(g.ad)}">${m.puan[g.id] ?? '<span class="bos">—</span>'}</td>`).join('') +
        `<td class="ort" data-etiket="Ortalama">${o == null ? '<span class="bos">—</span>' : String(o).replace('.', ',')}</td></tr>`;
    }).join('');
    return `<div class="tablo-kap" tabindex="0" role="region" aria-label="Sonuç tablosu"><table class="sonuc"><thead data-duzen-gizli>${bas}</thead><tbody>${sat}</tbody></table></div>` +
      `<p class="dipnot">${t.durum === 'bitti' ? 'Puanı iki kişi verir: ajan cetvele göre ön puan çıkarır, ben oynayıp onaylarım.' :
        `Tablo ${k(kisaTarih(t.tarih))}’de dolar. Boş hücre “henüz demlenmedi” demek; sıfır puan değil.`}</p>`;
  },
  // Durum satırı (test sayfası başı)
  'test-durum'(v) {
    const t = v.testler;
    return `<dl class="durum-satir">` +
      `<div><dt>Test</dt><dd>${k(t.test)}</dd></div>` +
      `<div><dt>Tarih</dt><dd><time datetime="${k(t.tarih)}">${k(tarihMetni(t.tarih))}</time></dd></div>` +
      `<div><dt>Model</dt><dd>${t.modeller.length}</dd></div>` +
      `<div><dt>Durum</dt><dd><span class="nokta-durum durum-${k(t.durum)}"></span>${k(DURUM[t.durum] || t.durum)} <span class="kalan" data-kalan="${k(t.tarih)}"></span></dd></div></dl>`;
  },
  // Sunumlar
  'sunumlar'(v, kok) {
    return v.sunumlar.sunumlar.map(s => {
      const ac = s.adres ? `<a class="dugme dugme-ana" href="${k(s.adres)}">Sunumu aç</a>` :
        `<p class="hazirlik"><span class="nokta-durum durum-bekliyor"></span>${k(buyukHarf(s.durum))}. Yayına alınınca buradan açılacak.</p>`;
      return `<article class="sunum" aria-labelledby="s-${k(s.id)}">` +
        `<figure class="sunum-onizleme"><img src="${kok}assets/img/sahne/vapur-1280.webp" srcset="${kok}assets/img/sahne/vapur-800.webp 800w, ${kok}assets/img/sahne/vapur-1280.webp 1280w" sizes="(min-width: 1000px) 60vw, 100vw" width="1280" height="720" alt="" loading="lazy">` +
        `<figcaption class="sunum-kare"><span class="sunum-kicker">&gt; ${k(s.kapak.kicker)}</span><span class="sunum-buyuk">${k(s.kapak.baslik)}</span>` +
        `<span class="sunum-cubuk"><span>01 / ${String(s.bolumler.length).padStart(2, '0')}</span><span>${k(s.bolumler[0])}</span></span></figcaption></figure>` +
        `<div class="sunum-metin"><h2 id="s-${k(s.id)}">${k(s.ad)}</h2><p>${k(s.ozet)}</p>${ac}` +
        `<h3>${buyukHarf(yaziyla(s.bolumler.length))} bölüm</h3><ol class="bolumler">${s.bolumler.map(b => `<li>${k(b)}</li>`).join('')}</ol>` +
        `<h3>Tuşlar</h3><dl class="tuslar">${s.tuslar.map(([t, a]) => `<div><dt><kbd>${k(t)}</kbd></dt><dd>${k(a)}</dd></div>`).join('')}</dl></div></article>`;
    }).join('');
  },
  // Duvar kâğıtları
  'duvar'(v, kok) {
    const d = v.duvar;
    return `<ul class="duvar-liste">` + d.kagitlar.map(x => {
      const src = s => `${kok}assets/img/duvar/${x.id}-${s}`;
      return `<li class="duvar"><figure><picture><source type="image/avif" srcset="${src(640)}.avif 640w, ${src(960)}.avif 960w" sizes="(min-width: 900px) 46vw, 100vw">` +
        `<img src="${src(960)}.webp" srcset="${src(640)}.webp 640w, ${src(960)}.webp 960w" sizes="(min-width: 900px) 46vw, 100vw" width="960" height="540" alt="${k(x.alt)}" loading="lazy"></picture>` +
        `<figcaption><h2>${k(x.ad)}</h2><p>${k(x.ozet)}</p><ul class="olculer">` +
        x.olculer.map(o => `<li><a href="${k(d.indir)}" rel="nofollow"><span>İndir</span>${k(o.replace('x', ' × '))}</a></li>`).join('') +
        `</ul></figcaption></figure></li>`;
    }).join("") + `</ul><p class="dipnot indir-notu">${k(d.indirNotu)}</p>`;
  }
};

/** Bağlantı adreslerini (data-baglanti) veriye göre yazar. HTML metni üzerinde çalışır (Node). */
export function baglantiYaz(html, baglantilar) {
  return html.replace(/data-baglanti="(\w+)" href="[^"]*"/g, (m, ad) =>
    baglantilar[ad] ? `data-baglanti="${ad}" href="${baglantilar[ad].adres}"` : m);
}

/** HTML metnindeki bütün veri bölgelerini yeniden yazar (Node, veri-bas.mjs). */
export function bolgeleriYaz(html, veri) {
  return html.replace(/(<(\w+)[^>]*\bdata-veri="([\w-]+)"[^>]*>)<!--veri-->[\s\S]*?<!--\/veri-->/g, (m, ac, etiket, ad) => {
    const f = BOLGE[ad]; if (!f) throw new Error('Bilinmeyen veri bölgesi: ' + ad);
    const kok = (ac.match(/data-kok="([^"]*)"/) || [, ''])[1];
    return `${ac}<!--veri-->${f(veri, kok)}<!--/veri-->`;
  });
}

// ---------- bağlantı merkezi simgeleri: mürekkep çizgi + halftone, kodla çizildi (stok/klişe simge yok) ----------
const KREM = '#F7EEE4', CAY = '#DC6C21';
let simgeNo = 0;
export function simge(ad, boy = 34) {
  const id = 'ht' + (++simgeNo).toString(36) + ad.slice(0, 2);
  const nokta = (renk = KREM, op = .55) => `<defs><pattern id="${id}" width="2.6" height="2.6" patternUnits="userSpaceOnUse"><circle cx="1.3" cy="1.3" r=".62" fill="${renk}" fill-opacity="${op}"/></pattern></defs>`;
  const c = `fill="none" stroke="${KREM}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"`;
  const govde = {
    // eski televizyon: kanal
    youtube: `${nokta()}<path d="M12 7 9 3M20 7l3-4" ${c}/><rect x="4" y="7" width="24" height="18" rx="4" ${c}/>` +
      `<rect x="7" y="10" width="14" height="12" rx="2" fill="url(#${id})"/><rect x="7" y="10" width="14" height="12" rx="2" ${c}/>` +
      `<path d="M12 13l5 3-5 3z" fill="${CAY}"/><circle cx="24.6" cy="12.5" r="1.3" fill="${KREM}"/><circle cx="24.6" cy="17" r="1.3" fill="${KREM}"/><path d="M9 25v2.5M23 25v2.5" ${c}/>`,
    // çay ölçer: tabaksız ince belli bardak + ölçek çizgileri
    olcer: `${nokta(KREM, .5)}<clipPath id="${id}k"><path d="M8 4C9 10 12.5 12 12.5 15.5C12.5 19.5 8.5 21 8.5 25C8.5 28 11 29 13.5 29h5c2.5 0 5-1 5-4c0-4-4-5.5-4-9.5C19.5 12 23 10 24 4Z"/></clipPath>` +
      `<g clip-path="url(#${id}k)"><rect x="0" y="13" width="32" height="20" fill="${CAY}"/><rect x="16" y="13" width="16" height="20" fill="url(#${id})"/></g>` +
      `<path d="M8 4C9 10 12.5 12 12.5 15.5C12.5 19.5 8.5 21 8.5 25C8.5 28 11 29 13.5 29h5c2.5 0 5-1 5-4c0-4-4-5.5-4-9.5C19.5 12 23 10 24 4Z" ${c}/><path d="M26.5 9h2.5M26.5 15h2.5M26.5 21h2.5M26.5 27h2.5" ${c} stroke-width="1.6"/>`,
    // gece sahnesi: lamba altında perde/çerçeve
    sahne: `${nokta()}<path d="M16 2v3" ${c}/><path d="M10.5 10.5Q16 3.5 21.5 10.5z" ${c}/><circle cx="16" cy="11.2" r="1.4" fill="${CAY}"/>` +
      `<rect x="4" y="14" width="24" height="14" rx="2" fill="url(#${id})"/><rect x="4" y="14" width="24" height="14" rx="2" ${c}/><path d="M8 24q4-5 8 0q4-5 8 0" ${c} stroke="${CAY}"/>`,
    // adisyon fişi: kesik alt kenar, noktalı satırlar
    adisyon: `${nokta()}<path d="M8 4h16v22l-2.7 2.4-2.6-2.4-2.7 2.4-2.6-2.4-2.7 2.4L8 26z" fill="url(#${id})"/><path d="M8 4h16v22l-2.7 2.4-2.6-2.4-2.7 2.4-2.6-2.4-2.7 2.4L8 26z" ${c}/>` +
      `<path d="M11.5 9.5h9M11.5 13.5h6" ${c} stroke-width="1.7"/><path d="M11.5 17.5h9" ${c} stroke-width="1.7" stroke-dasharray=".1 2.6"/><path d="M11.5 21.5h3.5M18 21.5h2.5" ${c} stroke="${CAY}" stroke-width="2.2"/>`,
    // kod dalı: açık malzeme
    dal: `<path d="M7 10.8v11.4M24 12.8c0 6-10 5-15.6 10.6" ${c}/><circle cx="7" cy="8" r="2.8" ${c}/><circle cx="7" cy="25" r="2.8" fill="${CAY}" stroke="${KREM}" stroke-width="2.1"/><circle cx="24" cy="10" r="2.8" ${c}/>`,
    // ekran: ay, köprü, su
    duvar: `${nokta()}<rect x="3" y="5" width="26" height="17" rx="2.5" ${c}/><rect x="5" y="16" width="22" height="4.5" fill="url(#${id})"/><circle cx="22.5" cy="10" r="2.2" fill="${CAY}"/>` +
      `<path d="M10 17V11.5M17.5 17V11.5M5.5 14q4.5-2.5 4.5-2.5q3.75 5 7.5 0q4 2.5 8.5 2" ${c} stroke-width="1.6"/><path d="M13 22l-1.2 5h8.4L19 22" ${c}/>`,
    // film karesi: delikli şerit, ortada oynat
    film: `${nokta()}<rect x="4" y="6" width="24" height="20" rx="3" fill="url(#${id})"/><rect x="4" y="6" width="24" height="20" rx="3" ${c}/>` +
      `<path d="M8 6v20M24 6v20" ${c} stroke-width="1.6"/><path d="M5.5 10.5h1M5.5 16h1M5.5 21.5h1M25.5 10.5h1M25.5 16h1M25.5 21.5h1" ${c} stroke-width="1.6"/>` +
      `<path d="M13.5 11.5l6.5 4.5-6.5 4.5z" fill="${CAY}" stroke="${KREM}" stroke-width="1.6" stroke-linejoin="round"/>`,
    // dikey ekran: kısa video
    kisa: `${nokta()}<rect x="9.5" y="3" width="13" height="26" rx="3.2" fill="url(#${id})"/><rect x="9.5" y="3" width="13" height="26" rx="3.2" ${c}/>` +
      `<path d="M14 12.5l5 3.5-5 3.5z" fill="${CAY}"/><path d="M14.5 25.5h3" ${c} stroke-width="1.6"/><path d="M5 10v12M27 10v12" ${c} stroke-width="1.6" stroke-dasharray=".1 3.4"/>`,
    // fotoğraf makinesi gövdesi: Instagram
    instagram: `${nokta()}<rect x="5" y="5" width="22" height="22" rx="6.5" ${c}/><circle cx="16" cy="16" r="5.2" fill="url(#${id})"/><circle cx="16" cy="16" r="5.2" ${c}/><circle cx="22.2" cy="9.8" r="1.5" fill="${CAY}"/>`,
    // nota: TikTok sesleri
    tiktok: `<path d="M19.6 6v16M19.6 6c.6 3.6 3.4 6 7 6.2" fill="none" stroke="${CAY}" stroke-width="2.1" stroke-linecap="round"/><ellipse cx="15.2" cy="22.7" rx="4.6" ry="4.2" fill="none" stroke="${CAY}" stroke-width="2.1"/>` +
      `<path d="M18 4.5v16" ${c}/><path d="M18 4.5c.6 3.6 3.4 6 7 6.2" ${c}/><ellipse cx="13.6" cy="21.2" rx="4.6" ry="4.2" fill="${CAY}" stroke="${KREM}" stroke-width="2.1"/>`
  }[ad] || '';
  return `<svg viewBox="0 0 32 32" width="${boy}" height="${boy}" aria-hidden="true" focusable="false">${govde}</svg>`;
}
const OK_DIS = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const OK_IC = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

BOLGE['merkez-kartlar'] = (v, kok) => `<ul class="kartlar">` + v.baglantilar.merkez.map((b, i) =>
  `<li><a class="kart${b.vurgu ? ' kart-vurgu' : ''}" href="${k(b.dis ? b.adres : kok + b.adres)}"${b.dis ? ' rel="noopener"' : ''} style="--sira:${i + 3}">` +
  `<span class="kart-simge">${simge(b.simge)}</span><span class="kart-metin"><span class="kart-ad">${k(b.ad)}</span><span class="kart-acik">${k(b.aciklama)}</span></span>` +
  `<span class="kart-ok">${b.dis ? OK_DIS : OK_IC}</span></a></li>`).join('') + `</ul>`;
BOLGE['merkez-slogan'] = v => `&gt; ${k(v.baglantilar.slogan)}`;
// sosyal simge sırası: YouTube, Instagram, TikTok, GitHub (yalnız simge; ad ekran okuyucuya ve ipucuna)
BOLGE['merkez-sosyal'] = v => `<ul class="sosyal">` + v.baglantilar.sosyal.map(ad => {
  const b = v.baglantilar[ad];
  return `<li><a class="sosyal-dugme" href="${k(b.adres)}" rel="noopener" aria-label="${k(b.ad)}: ${k(b.etiket)}" title="${k(b.ad)}">${simge(ad === 'github' ? 'dal' : ad, 26)}</a></li>`;
}).join('') + `</ul>`;
