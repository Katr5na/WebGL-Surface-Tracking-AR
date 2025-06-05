// modules/ARController.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

/**
 * ARController відповідає за:
 * 1) Створення Three.js-сцени та XR-сесії із DOM-Overlay.
 * 2) Scan-анімацію (75 кадрів із assets.json).
 * 3) Hit-test, ретикл, розміщення моделі.
 * 4) Lazy-load інших моделей під час перемикання кнопок.
 * 5) Жести (drag, rotate, pinch) з урахуванням scaleEnabled.
 */
export class ARController {
  constructor({ params, modelList, loadedModels, loadModelAtIndex, localizationData }) {
    this.params = params;
    this.modelList = modelList;
    this.loadedModels = loadedModels;
    this.loadModelAtIndex = loadModelAtIndex;
    this.localizationData = localizationData;

    // Будемо зберігати посилання на DOM-елементи:
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.reticle = null;
    this.controller = null;
    this.hitTestSource = null;
    this.hitTestSourceRequested = false;
    this.scanInterval = null;
    this.currentFrameIndex = 0;

    // Параметри жестів
    this.isUserInteracting = false;
    this.isRotatingGesture = false;
    this.isScalingGesture = false;
    this.lastTouchX = 0;
    this.lastTouchY = 0;
    this.previousRotationAngle = 0;
    this.initialPinchDistance = 0;

    // Зчитані параметри
    this.scaleEnabled = params.scaleEnabled;
    this.byUrl = params.byUrl;
    this.lang = params.lang;

    // Шляхи та префікси для scan-анімації (з assets.json)
    this.scanFramesBaseUrl = '';
    this.scanFramePrefix = 'frame_';
    this.scanFrameSuffix = '_delay-0.08s.png';
    this.frameCount = 75;
    this.scanDuration = 3000; // ms

    // Встановимо GLTFLoader
    this.loader = new GLTFLoader();
  }

  async init() {
    // 1) Підготувати canvas/renderer, add ARButton із DOM-Overlay
    this.setupThreeXR();

    // 2) Показати scan-анімацію
    await this.loadAssetsForScanAnimation();
    this.startScanAnimation();

    // 3) Запустити render-loop
    this.animate();
  }

  setupThreeXR() {
    // Сцена + камера
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1));

    // Рендерер
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;
    document.getElementById('ar-container').appendChild(this.renderer.domElement);

    // Події дотику
    document.addEventListener('touchstart', this.onTouchStart.bind(this));
    document.addEventListener('touchmove', this.onTouchMove.bind(this));
    document.addEventListener('touchend', this.onTouchEnd.bind(this));

    // ARButton із DOM-Overlay
    const overlayRoot = document.getElementById('overlay');
    const sessionInit = {
      requiredFeatures: ['hit-test', 'dom-overlay'],
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: overlayRoot }
    };
    overlayRoot.style.pointerEvents = 'none';
    document.body.appendChild(ARButton.createButton(this.renderer, sessionInit));

    // Кнопка «Закрити AR»
    const closeBtn = document.getElementById('close-ar');
    closeBtn.addEventListener('click', () => {
      const session = this.renderer.xr.getSession();
      if (session) session.end();
    });

    // Reticle
    const ringGeom = new THREE.RingGeometry(0.05, 0.06, 32).rotateX(-Math.PI / 2);
    this.reticle = new THREE.Mesh(
      ringGeom,
      new THREE.MeshBasicMaterial({ color: 0xffaa2a })
    );
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;
    this.scene.add(this.reticle);

    // Controller (XR select)
    this.controller = this.renderer.xr.getController(0);
    this.controller.addEventListener('select', this.onSelect.bind(this));
    this.scene.add(this.controller);

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  async loadAssetsForScanAnimation() {
    // Завантажуємо assets.json, щоб отримати базу для scan-анімації
    try {
      const resp = await fetch('assets.json');
      const aJson = await resp.json();
      this.scanFramesBaseUrl = aJson.helpToInstall;      // URL до папки з кадрами
      this.scanFramePrefix = aJson.framePrefix || 'frame_';
      this.scanFrameSuffix = aJson.frameSuffix || '_delay-0.08s.png';
      this.frameCount = aJson.frameCount || 75;
      this.scanDuration = this.frameCount * 40; // ~ 40ms на кадр
    } catch {
      // Якщо не вдалося, просто не показуємо scan-анімацію (але AR усе одно працюватиме)
      this.scanFramesBaseUrl = '';
    }
  }

  startScanAnimation() {
    const animDiv = document.getElementById('scan-animation');
    const img = document.getElementById('scan-frame');
    animDiv.style.cssText = `
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 200px; height: 200px;
      z-index: 11;
      display: flex;
      justify-content: center;
      align-items: center;
      background: rgba(0,0,0,0.3);
      border-radius: 100px;
    `;
    img.style.cssText = `
      width: 100%;
      height: 100%;
    `;
    animDiv.style.display = 'flex';

    const frameDuration = this.scanDuration / this.frameCount; // близько 40 ms
    this.currentFrameIndex = 0;

    this.scanInterval = setInterval(() => {
      const idx = String(this.currentFrameIndex).padStart(2, '0');
      img.src = `${this.scanFramesBaseUrl}${this.scanFramePrefix}${idx}${this.scanFrameSuffix}`;
      this.currentFrameIndex = (this.currentFrameIndex + 1) % this.frameCount;
    }, frameDuration);
  }

  stopScanAnimation() {
    clearInterval(this.scanInterval);
    const animDiv = document.getElementById('scan-animation');
    if (animDiv) animDiv.style.display = 'none';
  }

  onWindowResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    this.renderer.setAnimationLoop(this.render.bind(this));
  }

  render(time, frame) {
    if (frame && !this.placedModel) {
      const session = this.renderer.xr.getSession();
      const refSpace = this.renderer.xr.getReferenceSpace();

      if (!this.hitTestSourceRequested) {
        session.requestReferenceSpace('viewer')
          .then(rs => session.requestHitTestSource({ space: rs }))
          .then(src => { this.hitTestSource = src; });
        session.addEventListener('end', () => {
          this.hitTestSourceRequested = false;
          this.hitTestSource = null;
        });
        this.hitTestSourceRequested = true;
      }

      if (this.hitTestSource) {
        const hits = frame.getHitTestResults(this.hitTestSource);
        if (hits.length > 0) {
          const pose = hits[0].getPose(refSpace);
          this.reticle.visible = true;
          this.reticle.matrix.fromArray(pose.transform.matrix);
          this.stopScanAnimation();
          // Змінити колір на жовтий, як тільки вперше показався ретикл
          this.reticle.material.color.setHex(0xffff00);
        } else {
          this.reticle.visible = false;
        }
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  onSelect() {
    if (!this.reticle.visible || this.placedModel) return;

    // Підвантажити (якщо ще не підвантажено) першу модель (index 0)
    this.placeModelAtIndex(0);
  }

  async placeModelAtIndex(i) {
    // Перший раз завантажити (але ми вже робили lazy-load у ConfigBuilder)
    let model = this.loadedModels[i];
    if (!model) {
      model = await this.loadModelAtIndex(i);
    }
    if (!model) {
      alert((this.localizationData.error || 'Помилка') + ' завантаження моделі');
      return;
    }

    this.placedModel = model.clone();
    this.placedModel.position.setFromMatrixPosition(this.reticle.matrix);
    this.placedModel.quaternion.setFromRotationMatrix(this.reticle.matrix);
    this.placedModel.scale.set(1, 1, 1);
    this.scene.add(this.placedModel);

    // Після розміщення Reticle ховаємо і завершимо hit-test
    this.reticle.visible = false;
    this.hitTestSourceRequested = false;
    this.hitTestSource = null;

    // Запобігти дублікатам scan-анімації
    this.stopScanAnimation();

    // Показати кнопки перемикання моделей і «Замовити» (якщо потрібно)
    this.buildModelButtonsUI();
    if (this.byUrl) {
      const orderCont = document.getElementById('order-button-container');
      orderCont.style.display = 'block';
      const orderBtn = document.getElementById('order-button');
      orderBtn.textContent = this.localizationData.byButton || 'Замовити';
      orderBtn.onclick = () => window.location.href = this.byUrl;
    }
  }

  buildModelButtonsUI() {
    const container = document.getElementById('model-buttons');
    container.innerHTML = '';

    this.modelList.forEach((entry, idx) => {
      // Якщо це перша модель, яка вже стоїть у сцені, все одно створимо кнопку
      const btn = document.createElement('button');
      btn.setAttribute('aria-label', `Модель ${idx + 1}`);
      btn.textContent = this.localizationData[`textArButtons${idx + 1}`] || entry.label;
      btn.style.cssText = `
        flex: 0 0 auto;
        padding: 8px 16px;
        font-size: 14px;
        margin-right: 8px;
        border: none;
        border-radius: 4px;
        background: rgba(255,255,255,0.9);
        cursor: pointer;
      `;
      btn.addEventListener('click', () => this.switchModel(idx));
      container.appendChild(btn);
    });

    container.style.cssText = `
      position: absolute;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      overflow-x: auto;
      gap: 8px;
      padding: 8px 4px;
      background: rgba(0,0,0,0.4);
      border-radius: 8px;
      z-index: 11;
      -webkit-overflow-scrolling: touch;
    `;
    container.setAttribute('role', 'group');
    container.setAttribute('aria-label', 'Кнопки перемикання моделей');
  }

  async switchModel(idx) {
    if (!this.placedModel) return;

    // Зберегти старі трансформації
    const { position, rotation, scale } = this.placedModel;

    // Видалити поточну модель
    this.scene.remove(this.placedModel);
    this.placedModel = null;

    // Підвантажити модель за індексом idx, якщо ще не підвантажено
    let newModel = this.loadedModels[idx];
    if (!newModel) {
      newModel = await this.loadModelAtIndex(idx);
    }
    if (!newModel) {
      alert((this.localizationData.error || 'Помилка') + ' завантаження моделі');
      return;
    }

    // Додати нову модель із тими ж трансформаціями
    this.placedModel = newModel.clone();
    this.placedModel.position.copy(position);
    this.placedModel.quaternion.copy(rotation);
    this.placedModel.scale.copy(scale);
    this.scene.add(this.placedModel);
  }
}

/**
 * Допоміжна функція для завантаження glTF-моделі через Promise.
 */
export function loadGLTF(url) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => resolve(gltf),
      undefined,
      (err) => reject(err)
    );
  });
}
