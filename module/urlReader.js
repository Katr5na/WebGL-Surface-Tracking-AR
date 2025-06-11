// Зчитує й повертає параметри з URL: 
// lang, clientName, itemName, arButCount, scale, buyUrl.
function getUrlParams() {
  const params = new URLSearchParams(document.location.search);
  
  const langRaw = params.get("lang");
  const lang = (langRaw && langRaw.trim()) ? langRaw.trim().toLowerCase() : 'uk';
  console.log("lang", lang);
  
  const clientNameRaw = params.get("clientName");
  const clientName = (clientNameRaw && clientNameRaw.trim()) ? clientNameRaw.trim() : null;
  console.log("clientName", clientName);
  
  const itemNameRaw = params.get("itemName");
  const itemName = (itemNameRaw && itemNameRaw.trim()) ? itemNameRaw.trim() : null;
  console.log("itemName", itemName);
  
  const buyUrlRaw = params.get("buyUrl");
  const buyUrl = (buyUrlRaw && buyUrlRaw.trim()) ? buyUrlRaw.trim() : null;
  console.log("buyUrl", buyUrl);
  
  const scaleRaw = params.get("scale");
  const scale = (scaleRaw && scaleRaw.trim()) ? scaleRaw.trim() : null;
  console.log("scale", scale);
  
  const arButCountRaw = params.get("arButCount");
  const arButCount = (arButCountRaw && arButCountRaw.trim()) ? arButCountRaw.trim() : null;
  console.log("arButCount", arButCount);
  
  return { lang, clientName, itemName, arButCount, scale, buyUrl };
}

/**
* export function parseUrlParams() {
* const params = new URLSearchParams(window.location.search);

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
 */ 
/*
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
*/


