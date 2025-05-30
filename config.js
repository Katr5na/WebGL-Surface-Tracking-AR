// Розширювана логіка парсингу URL-параметрів
const params = new URLSearchParams(window.location.search);

export const CONFIG = {
  lang:           params.get('lang')           || 'ua',
  byUrl:          params.get('byUrl')          || null,
  commodityName:  params.get('commodityName')  || null,
  enableScale:    params.has('scale'),
  buttonsAr:      parseInt(params.get('buttonsAr'),10) || null,
  background:     params.get('background')     || null,
  backgroundName: params.get('backgroundName') || null,
  helpToInstall:  params.get('helpToInstall')  || null
};
