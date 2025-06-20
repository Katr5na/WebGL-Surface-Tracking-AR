import { getUrlParams } from './urlReader.js';
import { getLink } from './linksBuilder.js';
import { loadGLTF, enableScaling } from './arController.js';
import { showErrorScreen, initBuyButton } from './uiController.js';

async function init() {
  const { clientName, itemName, scale, buyUrl } = getUrlParams();

  const resp = await fetch('errorList.json');
  let errorList = await resp.json()
  // 1. Перевіряємо clientName
  if (!clientName) {
    console.error('відсутня назва клієнта');

    //const resp = await fetch('errorList.json');
    //let errorList = await resp.json()
    // за потреби можна показати екран помилки:
    // showErrorScreen('Відсутня назва клієнта');
    return;
  }

  // 2. Перевіряємо itemName
  if (!itemName) {
    showErrorScreen('003: відсутній параметр itemName');
    throw new Error('itemName missing');
  }

  // 3. Дістаємо URL до папки з моделями
  //    (в linksBuilder.js має бути реалізована функція getLink)
  const folderUrl = getLink(clientName, itemName);
  if (!folderUrl) {
    showErrorScreen(`Не знайдено папку для "${itemName}"`);
    throw new Error('folder URL missing');
  }

  // 4. Підготовка списку .glb-файлів
  //    просто підвантажимо перші N i далі – поки є файли)
  const modelList = [];
  for (let i = 1; i <= buttCount; i++) {
    const url = `${folderUrl}/${itemName}_${i}.glb`;
    // спробуємо зробити HEAD-запит, щоби перевірити наявність,
    // але тут для спрощення просто додаємо до списку
    modelList.push({ label: `${itemName}_${i}`, url });
  }

  // 5. Завантажуємо моделі по черзі
  //    (першу – одразу, інші – за потреби, або всі підряд)
  // Наприклад, завантажимо всі підряд
  const loadedModels = [];
  for (let i = 0; i < modelList.length; i++) {
    try {
      const gltf = await loadGLTF(modelList[i].url);
      loadedModels.push(gltf.scene.clone());
    } catch (e) {
      console.warn(`Модель ${modelList[i].label} не знайдена або з помилкою`, e);
      break; // припинити, якщо далі файлів нема
    }
  }

  // 6. Якщо scale=true – включаємо можливість масштабування
  if (scale === 'true' || scale === true) {
    enableScaling(); // у вашому arController.js — реалізація скейлінгу
  }

  // 7. Якщо є buyUrl – показуємо кнопку і навішуємо редірект
  if (buyUrl) {
    initBuyButton(buyUrl);
  }

  // 8. Далі – передаємо завантажені моделі у ваш AR-контролер
  //    або рендеримо першу модель тощо…
  return { loadedModels };
}

// Запускаємо
init().catch(err => {
  console.error('Помилка ініціалізації AR-сесії:', err);
});

/**
 * Завантажує assetLinks.json, далі modelsJson (з models/*.json),
 * формує modelList із { label, url } і реалізує lazy-load моделей:
 * — одразу завантажує тільки першу (.glb через loadGLTF),
 * — інші — лише коли користувач тиснутиме кнопку переключення.
 */
// export class ConfigBuilder {
//   constructor() {
//     this.params = getUrlParams();
//     this.assetLinks = null;   // вміст assetLinks.json
//     this.modelsCfg = null;    // вміст поточного models/*.json
//     this.modelList = [];      // масив { label, url }
//     this.loadedModels = [];   // масив gltf-моделей, завантажених по-потребі
//   }

//   async init() {
//     const { itemName, arButCount } = this.params;

//     // Якщо commodityName відсутній → error
//     if (!itemName) {
//       showErrorScreen('№005: itemName missing');
//       throw new Error('itemName missing');
//     }

//     // Завантажити assetLinks.json
//     try {
//       const resp = await fetch('https://katr5na.github.io/WebGL-Surface-Tracking-AR/assets/assetLinks.json');
//       if (!resp.ok) throw new Error('Cannot fetch assetLinks.json');
//       this.assetLinks = await resp.json();
//     } catch (e) {
//       showErrorScreen('Не вдалося завантажити assetLinks.json');
//       throw e;
//     }

//     // Знайти запис для commodityName
//     const entry = this.assetLinks[commodityName];
//     if (!entry || !entry.arButtonsUrl) {
//       showErrorScreen(`Commodity "${commodityName}" not found in assetLinks.json`);
//       throw new Error('assetLinks entry missing');
//     }

//     // Завантажити JSON зі списком моделей (models/*.json)
//     try {
//       const resp2 = await fetch(entry.arButtonsUrl);
//       if (!resp2.ok) throw new Error('Cannot load models JSON');
//       this.modelsCfg = await resp2.json();
//     } catch (e) {
//       showErrorScreen('Не вдалося завантажити JSON моделей');
//       throw e;
//     }

//     if (!Array.isArray(this.modelsCfg.models) || this.modelsCfg.models.length === 0) {
//       showErrorScreen('models array is empty');
//       throw new Error('models array empty');
//     }

//     // Відфільтрувати залежно від arButtons
//     let filtered;
//     if (arButtons === 'dynamic') {
//       filtered = [...this.modelsCfg.models];
//     } else if (typeof arButtons === 'number') {
//       filtered = this.modelsCfg.models.slice(0, arButtons);
//     } else {
//       // arButtons === false
//       filtered = [this.modelsCfg.models[0]];
//     }
//     this.modelList = filtered;

//     // Підготувати масив місць для завантажених GLTF (lazy)
//     this.loadedModels = new Array(this.modelList.length).fill(null);

//     // За замовчуванням одразу підвантажити лише першу модель (index 0)
//     await this.loadModelAtIndex(0);

//     // Далі передаємо результат вверх
//     // Інші моделі (1,2,3,…) підвантажуються пізніше у ARController
//     return {
//       params: this.params,
//       modelList: this.modelList,
//       loadedModels: this.loadedModels,
//       loadModelAtIndex: this.loadModelAtIndex.bind(this)
//     };
//   }

//   /**
//    * Завантажує glTF моделі за індексом i, якщо ще не завантажено.
//    * Повертає новий gltf (Three.js Group) або null у разі помилки.
//    */
//   async loadModelAtIndex(i) {
//     if (this.loadedModels[i]) {
//       return this.loadedModels[i];
//     }
//     const entry = this.modelList[i];
//     try {
//       const gltf = await loadGLTF(entry.url);
//       this.loadedModels[i] = gltf.scene.clone();
//       return this.loadedModels[i];
//     } catch (e) {
//       console.error(`Error loading model at index ${i}:`, e);
//       this.loadedModels[i] = null;
//       return null;
//     }
//   }
// }
