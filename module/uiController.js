// modules/UIController.js
import { HideLoadingPage } from '../uiView.js';
import { ConfigBuilder } from './configurationBuilder.js';
import { LocalizationService } from '../localization/localizationService.js';
import { ARController } from './arController.js';

/**
 * Відповідає за:
 * 1) Показ error-screen із відповідним повідомленням.
 * 2) Ініціалізацію ConfigBuilder і LocalizationService.
 * 3) Побудову initial home-screen (з кастомним SVG-trigger).
 * 4) Запуск ARController.
 */

function createSvgStartButton() {
  // Приклад SVG-кнопки (її можна замінити на свою іконку)
  const btn = document.createElement('button');
  btn.id = 'start-ar-button';
  btn.setAttribute('aria-label', 'Запустити AR');
  btn.style.border = 'none';
  btn.style.background = 'transparent';
  btn.style.cursor = 'pointer';
  btn.innerHTML = `
    <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="58" fill="#ffffff" stroke="#333" stroke-width="2" />
      <polygon points="50,40 80,60 50,80" fill="#333" />
    </svg>
    <span style="display:block; font-size:16px; margin-top:8px; color:#333;">
      Запустити AR
    </span>
  `;
  return btn;
}

export function showErrorScreen(message) {
  document.body.innerHTML = '';
  const div = document.createElement('div');
  div.style.cssText = `
    display:flex; flex-direction:column;
    justify-content:center; align-items:center;
    width:100vw; height:100vh; background:#fff;
  `;
  const txt = document.createElement('div');
  txt.textContent = message || 'Помилка 005';
  txt.style.fontSize = '24px';
  txt.style.marginBottom = '20px';
  div.appendChild(txt);
  const btn = document.createElement('button');
  btn.textContent = 'Вихід';
  btn.setAttribute('aria-label', 'Вихід');
  btn.style.padding = '10px 20px';
  btn.style.fontSize = '16px';
  btn.onclick = () => window.close();
  div.appendChild(btn);
  document.body.appendChild(div);
}

/**  
 * Створює і показує home-screen (фон + SVG-кнопка).  
 * Після кліку — запускає ARController.  
 */
async function showHomeScreen(params, modelList, loadedModels, loadModelAtIndex, localizationData) {
  HideLoadingPage();

  // Додати контейнер для home-screen
  const homeDiv = document.createElement('div');
  homeDiv.id = 'home-screen';
  homeDiv.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:0;';

  // Фонове зображення (встановимо через CSS з assets.json)
  try {
    const resp = await fetch('assets.json');
    const aJson = await resp.json();
    homeDiv.style.backgroundImage = `url(${aJson.background}/${aJson.backgroundName})`;
    homeDiv.style.backgroundSize = 'cover';
    homeDiv.style.backgroundPosition = 'center';
  } catch {
    homeDiv.style.backgroundColor = '#fafafa';
  }

  // SVG-кнопка «Запустити AR»
  const svgBtn = createSvgStartButton();
  svgBtn.style.cssText += `
    position:absolute;
    top:50%;
    left:50%;
    transform:translate(-50%, -50%);
    background:transparent;
    border:none;
  `;
  svgBtn.addEventListener('click', () => {
    // При кліку: видалити home-screen, створити #ar-container і #overlay, передати усе ARController
    homeDiv.remove();
    startAR(params, modelList, loadedModels, loadModelAtIndex, localizationData);
  });

  homeDiv.appendChild(svgBtn);
  document.body.appendChild(homeDiv);
}

/**  
 * Запускає ARController, передаючи всі налаштовані дані.  
 */
function startAR(params, modelList, loadedModels, loadModelAtIndex, localizationData) {
  // Додаємо елементи DOM: #ar-container і #overlay
  const arContainer = document.createElement('div');
  arContainer.id = 'ar-container';
  document.body.appendChild(arContainer);

  const overlay = document.createElement('div');
  overlay.id = 'overlay';
  overlay.style.display = 'none';
  overlay.innerHTML = `
    <button id="close-ar" aria-label="Закрити AR">&times;</button>
    <div id="model-buttons" role="group" aria-label="Кнопки перемикання моделей"></div>
    <div id="order-button-container" style="display:none;">
      <button id="order-button" aria-label="Замовити"></button>
    </div>
    <div id="scan-animation" style="display:none;">
      <img id="scan-frame" src="" alt="Сканування поверхні" />
    </div>
  `;
  document.body.appendChild(overlay);

  // Створюємо екземпляр ARController і передаємо всі потрібні дані
  const arCtrl = new ARController({
    params,
    modelList,
    loadedModels,
    loadModelAtIndex,
    localizationData
  });
  arCtrl.init();  // Стартує AR (створить сцену, запустить render-loop, hit-test тощо)
}

(async function initApp() {
  // 1) Конфігурація (ConfigBuilder)
  let configObj;
  try {
    const builder = new ConfigBuilder();
    configObj = await builder.init();
  } catch {
    return; // Якщо помилка у конфігурації, showErrorScreen вже викликаний
  }

  // 2) Локалізація (LocalizationService)
  const { params, modelList, loadedModels, loadModelAtIndex } = configObj;
  const lang = params.lang;
  const locService = new LocalizationService();
  const localizationResult = await locService.init(modelList.length, lang);

  // Якщо нічого не повернулося — беремо дефолти з applicationTextOptions.json
  let localizationData = localizationResult;
  if (!localizationData) {
    try {
      const resp = await fetch('applicationTextOptions.json');
      localizationData = await resp.json();
      // Для кнопок моделей, яких більше 1, просто пронумеруємо
      for (let i = 0; i < modelList.length; i++) {
        localizationData[`textArButtons${i+1}`] = `${i+1}`;
      }
    } catch {
      localizationData = {};
    }
  }

  // 3) Показати home-screen із кастомним SVG і aria-атрибутами
  showHomeScreen(params, modelList, loadedModels, loadModelAtIndex, localizationData);
})();
