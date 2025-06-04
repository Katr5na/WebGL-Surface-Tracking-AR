// modules/LocalizationService.js

/**
 * Завантажує GoogleSheetsLocalization.json та applicationTextOptions.json,
 * формує запит до Apps Script і повертає об’єкт із перекладами (таймаут 20 000 ms).
 * Якщо не вдалося за 20 с — повертає null, і зверху UIController буде взято дефолти.
 */
export class LocalizationService {
  constructor() {
    this.gsConfig = null;
    this.textOptions = null;
    this.timeoutMs = 20000;
  }

  async init(modelListLength, lang) {
    // Завантажуємо GoogleSheetsLocalization.json
    try {
      const resp = await fetch('GoogleSheetsLocalization.json');
      if (!resp.ok) throw new Error('Cannot fetch GoogleSheetsLocalization.json');
      this.gsConfig = await resp.json();
    } catch (e) {
      console.warn('LocalizationService: cannot load GoogleSheetsLocalization.json', e);
      return null;
    }

    // Завантажуємо applicationTextOptions.json
    try {
      const resp2 = await fetch('applicationTextOptions.json');
      if (!resp2.ok) throw new Error('Cannot fetch applicationTextOptions.json');
      this.textOptions = await resp2.json();
    } catch (e) {
      console.warn('LocalizationService: cannot load applicationTextOptions.json', e);
      return null;
    }

    // Формуємо URL із параметрами
    const { sheetKey, codeGsUrl, sheetName } = this.gsConfig;
    const url = new URL(codeGsUrl);
    url.searchParams.set('sheetKey', sheetKey);
    url.searchParams.set('sheetName', sheetName);
    url.searchParams.set('lang', lang);

    // Додаємо всі ключі, що !== false
    for (const [key, val] of Object.entries(this.textOptions)) {
      if (val !== false && val != null) {
        url.searchParams.set(key, val);
      }
    }
    // Для кнопок моделей: textArButtons1…N
    for (let i = 0; i < modelListLength; i++) {
      const keyName = `textArButtons${i+1}`;
      if (this.textOptions[keyName]) {
        url.searchParams.set(keyName, this.textOptions[keyName]);
      }
    }

    // Виконуємо fetch із таймаутом
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        console.warn('LocalizationService: timeout reached');
        resolve(null);
      }, this.timeoutMs);

      fetch(url.toString())
        .then(resp => {
          clearTimeout(timer);
          if (!resp.ok) {
            console.warn('LocalizationService: network error');
            resolve(null);
          } else {
            return resp.json().then(json => resolve(json));
          }
        })
        .catch(err => {
          clearTimeout(timer);
          console.warn('LocalizationService: fetch error', err);
          resolve(null);
        });
    });
  }
}
