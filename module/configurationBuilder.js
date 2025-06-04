// modules/ConfigBuilder.js
import { parseUrlParams } from './UrlReader.js';
import { showErrorScreen, setInitialModelIndex } from './UIController.js';
import { loadGLTF } from './ARController.js';

/**
 * Завантажує assetLinks.json, далі modelsJson (з models/*.json),
 * формує modelList із { label, url } і реалізує lazy-load моделей:
 * — одразу завантажує тільки першу (.glb через loadGLTF),
 * — інші — лише коли користувач тиснутиме кнопку переключення.
 */
export class ConfigBuilder {
  constructor() {
    this.params = parseUrlParams();
    this.assetLinks = null;   // вміст assetLinks.json
    this.modelsCfg = null;    // вміст поточного models/*.json
    this.modelList = [];      // масив { label, url }
    this.loadedModels = [];   // масив gltf-моделей, завантажених по-потребі
  }

  async init() {
    const { commodityName, arButtons } = this.params;

    // Якщо commodityName відсутній → error
    if (!commodityName) {
      showErrorScreen('№005: commodityName missing');
      throw new Error('commodityName missing');
    }

    // Завантажити assetLinks.json
    try {
      const resp = await fetch('assetLinks.json');
      if (!resp.ok) throw new Error('Cannot fetch assetLinks.json');
      this.assetLinks = await resp.json();
    } catch (e) {
      showErrorScreen('Не вдалося завантажити assetLinks.json');
      throw e;
    }

    // Знайти запис для commodityName
    const entry = this.assetLinks[commodityName];
    if (!entry || !entry.arButtonsUrl) {
      showErrorScreen(`Commodity "${commodityName}" not found in assetLinks.json`);
      throw new Error('assetLinks entry missing');
    }

    // Завантажити JSON зі списком моделей (models/*.json)
    try {
      const resp2 = await fetch(entry.arButtonsUrl);
      if (!resp2.ok) throw new Error('Cannot load models JSON');
      this.modelsCfg = await resp2.json();
    } catch (e) {
      showErrorScreen('Не вдалося завантажити JSON моделей');
      throw e;
    }

    if (!Array.isArray(this.modelsCfg.models) || this.modelsCfg.models.length === 0) {
      showErrorScreen('models array is empty');
      throw new Error('models array empty');
    }

    // Відфільтрувати залежно від arButtons
    let filtered;
    if (arButtons === 'dynamic') {
      filtered = [...this.modelsCfg.models];
    } else if (typeof arButtons === 'number') {
      filtered = this.modelsCfg.models.slice(0, arButtons);
    } else {
      // arButtons === false
      filtered = [this.modelsCfg.models[0]];
    }
    this.modelList = filtered;

    // Підготувати масив місць для завантажених GLTF (lazy)
    this.loadedModels = new Array(this.modelList.length).fill(null);

    // За замовчуванням одразу підвантажити лише першу модель (index 0)
    await this.loadModelAtIndex(0);

    // Далі передаємо результат вверх
    // Інші моделі (1,2,3,…) підвантажуються пізніше у ARController
    return {
      params: this.params,
      modelList: this.modelList,
      loadedModels: this.loadedModels,
      loadModelAtIndex: this.loadModelAtIndex.bind(this)
    };
  }

  /**
   * Завантажує glTF моделі за індексом i, якщо ще не завантажено.
   * Повертає новий gltf (Three.js Group) або null у разі помилки.
   */
  async loadModelAtIndex(i) {
    if (this.loadedModels[i]) {
      return this.loadedModels[i];
    }
    const entry = this.modelList[i];
    try {
      const gltf = await loadGLTF(entry.url);
      this.loadedModels[i] = gltf.scene.clone();
      return this.loadedModels[i];
    } catch (e) {
      console.error(`Error loading model at index ${i}:`, e);
      this.loadedModels[i] = null;
      return null;
    }
  }
}
