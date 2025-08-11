// utils/imageLoader.js (JS puro)
const doneCache = new Map();        // id -> blobURL
const inFlight = new Map();         // id -> Promise<string>
const lru = [];                     // ordem de uso
const MAX = 200;                    // máx imagens no cache

function touch(id) {
  const i = lru.indexOf(id);
  if (i !== -1) lru.splice(i, 1);
  lru.push(id);
}
function evictIfNeeded() {
  while (lru.length > MAX) {
    const oldest = lru.shift();
    const url = doneCache.get(oldest);
    if (url) URL.revokeObjectURL(url);
    doneCache.delete(oldest);
  }
}

function supportsWebP() {
  try {
    const c = document.createElement('canvas');
    return c.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    return false;
  }
}

function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

async function downscaleToBlob(blob, targetH) {
  const mimePreferred = supportsWebP() ? 'image/webp' : 'image/jpeg';
  const quality = 0.88;

  // 1) Tenta redimensionar já no createImageBitmap (Chrome/Edge)
  let bmp = null;
  try {
    bmp = await createImageBitmap(blob, { resizeHeight: targetH, resizeQuality: 'high' });
  } catch {
    bmp = null;
  }

  let w, h;
  if (bmp) {
    w = bmp.width; h = bmp.height;
  } else {
    const img = await blobToImage(blob);
    const ratio = img.naturalHeight > targetH ? targetH / img.naturalHeight : 1;
    w = Math.round(img.naturalWidth * ratio);
    h = Math.round(img.naturalHeight * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context não disponível');

  if (bmp) {
    ctx.drawImage(bmp, 0, 0, w, h);
    if (bmp.close) bmp.close();
  } else {
    const img = await blobToImage(blob);
    ctx.drawImage(img, 0, 0, w, h);
  }

  // tenta preferred mime; se falhar, cai pra jpeg
  const blobOut = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) return resolve(b);
      canvas.toBlob((b2) => b2 ? resolve(b2) : reject(new Error('toBlob null')), 'image/jpeg', quality);
    }, mimePreferred, quality);
  });

  return blobOut;
}

// Dedup + LRU + Abort support
export async function getImageUrl({ id, url, targetH, signal }) {
  if (!id || !url) throw new Error('getImageUrl: id e url são obrigatórios');

  if (doneCache.has(id)) {
    touch(id);
    return doneCache.get(id);
  }
  if (inFlight.has(id)) {
    return inFlight.get(id);
  }

  const p = (async () => {
    const res = await fetch(url, { headers: { 'ngrok-skip-browser-warning': '1', 'Accept': 'image/*' }, signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const processed = await downscaleToBlob(blob, targetH);
    const blobURL = URL.createObjectURL(processed);
    doneCache.set(id, blobURL);
    touch(id);
    evictIfNeeded();
    return blobURL;
  })();

  inFlight.set(id, p);
  try {
    const result = await p;
    return result;
  } finally {
    inFlight.delete(id);
  }
}
