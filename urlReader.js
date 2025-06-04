// modules/UrlReader.js

/**
 * Зчитує й повертає об’єкт із параметрами URL:
 * lang, byUrl, commodityName, scale, arButtons.
 */
export function parseUrlParams() {
  const params = new URLSearchParams(window.location.search);

  // lang
  const langRaw = params.get('lang');
  const lang = (langRaw && langRaw.trim()) ? langRaw.trim().toLowerCase() : 'ua';

  // byUrl
  const byUrlRaw = params.get('byUrl');
  const byUrl = (byUrlRaw && byUrlRaw.trim()) ? byUrlRaw.trim() : null;

  // commodityName
  const commodityRaw = params.get('commodityName');
  const commodityName = (commodityRaw && commodityRaw.trim()) ? commodityRaw.trim() : null;

  // scale (t/true → true, інакше false)
  const scaleRaw = params.get('scale');
  const scaleEnabled = scaleRaw
    ? (['t','true'].includes(scaleRaw.trim().toLowerCase()))
    : false;

  // arButtons: 'dynamic' | number >0 | false
  const arButtonsRaw = params.get('arButtons');
  let arButtons;
  if (arButtonsRaw && arButtonsRaw.trim()) {
    const v = arButtonsRaw.trim().toLowerCase();
    if (['m','model','im','image'].includes(v)) {
      arButtons = 'dynamic';
    } else {
      const n = Number(v);
      arButtons = (!isNaN(n) && n > 0) ? n : false;
    }
  } else {
    arButtons = false;
  }

  return { lang, byUrl, commodityName, scaleEnabled, arButtons };
}
