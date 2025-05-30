// main.js
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// 1. Парсинг URL-параметрів
const params        = new URLSearchParams(window.location.search);
const lang          = params.get('lang')         || 'ua';
const byUrl         = params.get('byUrl');
const commodity     = params.get('commodityName');
const scaleEnabled  = params.has('scale');
const maxButtons    = parseInt(params.get('buttonsAr') || Infinity, 10);
const background    = params.get('background');
const bgName        = params.get('backgroundName');
const helpToInstall = params.get('helpToInstall');

// 2. Фон сторінки
if (background && bgName) {
  const url = `${background.replace(/\/+$/, '')}/${bgName}`;
  document.getElementById('app').style.backgroundImage = `url("${url}")`;
}

// 3. Локалізація
let L = {};
fetch('GoogleSheetsLocalization.json')
  .then(r=>r.json())
  .then(cfg => fetch(`${cfg.codeGsUrl}?sheetName=${cfg.sheetName}&lang=${lang}`))
  .then(r=>r.json())
  .then(json => { L = json; initUI(); })
  .catch(_ => {
    L.startAr    = 'Запустити AR';
    L.error      = 'Помилка 005';
    L.byButton   = 'Замовити';
    L.instruction= 'Наведіть на площину';
    initUI();
  });

function initUI() {
  // 4. Стартовий екран
  const startBtn = document.getElementById('start-ar-btn');
  startBtn.textContent = L.startAr;
  startBtn.onclick = () => {
    document.getElementById('start-screen').style.display = 'none';
    initAR();
  };

  // Якщо немає commodityName — показати помилку
  if (!commodity) {
    const err = document.createElement('div');
    err.textContent = L.error;
    err.style = 'position:absolute;top:10px;left:10px;color:red;';
    document.body.appendChild(err);
  }
}

let camera, scene, renderer;
let reticle, hitTestSource = null, hitTestSourceRequested = false;
let loader = new GLTFLoader(), modelConfigs = [], placedModel = null;
let loadingImg, seqInterval, frame = 0, frames = [], frameDur;

// 5. Ініціалізація AR-сцени
function initAR() {
  // Canvas і сценa
  const canvas = document.getElementById('ar-canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  scene  = new THREE.Scene();
  camera = new THREE.PerspectiveCamera();

  // Світло
  scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1));

  document.body.appendChild(
    ARButton.createButton(renderer, {
      requiredFeatures: ['hit-test','dom-overlay'],
      domOverlay: { root: document.getElementById('overlay') }
    })
  );

  // Завантажуємо конфіг модельок
  const cfgUrl = params.get('config') || 'lion.json';
  fetch(cfgUrl)
    .then(r=>r.json())
    .then(json => {
      modelConfigs = json.slice(0, maxButtons);
      return Promise.all(json.map(c =>
        loader.loadAsync(c.url).then(gltf => ({ label: c.label, scene: gltf.scene }))
      ));
    })
    .then(models => {
      models.forEach(m => m.scene.visible = false);
      modelConfigs = models;
      setupLoadingSeq();
      buildReticle();
      renderer.setAnimationLoop(render);
      buildCloseButton();
    });

  window.addEventListener('resize', onWindowResize);
}

function buildReticle() {
  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.1, 0.11, 32),
    new THREE.MeshBasicMaterial({ color: 0xffc107 })
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);
}

function setupLoadingSeq() {
  loadingImg = document.getElementById('loading-seq');
  if (!helpToInstall) return;
  frames = Array.from({length:75}, (_,i) =>
    `${helpToInstall.replace(/\/+$/,'')}/frame_${String(i).padStart(2,'0')}_delay-0.08s.png`
  );
  frameDur = 2000 / frames.length;
}

function startLoadingSeq() {
  if (!frames.length) return;
  loadingImg.style.display = 'block';
  seqInterval = setInterval(()=>{
    loadingImg.src = frames[frame];
    frame = (frame+1) % frames.length;
  }, frameDur);
}
function stopLoadingSeq() {
  clearInterval(seqInterval);
  loadingImg.style.display = 'none';
}

// 6. Кнопка закриття AR
function buildCloseButton() {
  document.getElementById('close-ar').onclick = () => {
    renderer.xr.getSession().end();
    document.getElementById('overlay').hidden = true;
  };
}

// 7. Побудова кнопок перемикання і "Замовити"
function buildModelButtons() {
  const btnContainer = document.getElementById('model-buttons');
  btnContainer.innerHTML = '';
  modelConfigs.forEach((m, i) => {
    const btn = document.createElement('button');
    btn.textContent = m.label;
    btn.onclick = () => switchModel(i);
    btnContainer.appendChild(btn);
  });
  if (byUrl) {
    const orderCont = document.getElementById('order-button-container');
    const orderBtn  = document.getElementById('order-button');
    orderBtn.href   = byUrl;
    orderBtn.textContent = L.byButton;
    orderCont.hidden = false;
  }
  document.getElementById('overlay').hidden = false;
}

// 8. Перемикання моделей
function switchModel(index) {
  if (placedModel) scene.remove(placedModel);
  placedModel = modelConfigs[index].scene.clone();
  placedModel.position.setFromMatrixPosition(reticle.matrix);
  placedModel.quaternion.setFromRotationMatrix(reticle.matrix);
  scene.add(placedModel);
}

// 9. Обробка торків для переміщення/обертання/масштабування
let lastTouch = null, initialDist = null;
renderer.domElement.addEventListener('touchstart', e => {
  lastTouch = e.touches[0];
}, { passive: false });
renderer.domElement.addEventListener('touchmove', e => {
  if (!placedModel) return;
  if (e.touches.length === 1) {
    const dx = (e.touches[0].pageX - lastTouch.pageX)*0.005;
    const dz = (e.touches[0].pageY - lastTouch.pageY)*0.005;
    placedModel.position.x += dx;
    placedModel.position.z += dz;
    lastTouch = e.touches[0];
  }
  if (scaleEnabled && e.touches.length === 2) {
    const dx = e.touches[0].pageX - e.touches[1].pageX;
    const dy = e.touches[0].pageY - e.touches[1].pageY;
    const dist = Math.hypot(dx, dy);
    if (!initialDist) initialDist = dist;
    else placedModel.scale.setScalar(dist / initialDist);
  }
}, { passive: false });
renderer.domElement.addEventListener('touchend', e => {
  if (e.touches.length < 2) initialDist = null;
}, { passive: false });

// 10. Resize
function onWindowResize() {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// 11. Цикл рендерингу + hit-test
function render(timestamp, frame) {
  if (frame) {
    const session = renderer.xr.getSession();
    if (!hitTestSourceRequested) {
      session.requestReferenceSpace('viewer')
        .then(ref => session.requestHitTestSource({ space: ref }))
        .then(src => { hitTestSource = src; });
      session.addEventListener('end', () => {
        hitTestSourceRequested = false;
        hitTestSource = null;
      });
      hitTestSourceRequested = true;
    }
    if (hitTestSource) {
      const hit = frame.getHitTestResults(hitTestSource);
      if (hit.length) {
        stopLoadingSeq();
        const pose = hit[0].getPose(renderer.xr.getReferenceSpace());
        reticle.visible = true;
        reticle.matrix.fromArray(pose.transform.matrix);
      } else {
        reticle.visible = false;
        startLoadingSeq();
      }
    }
  }

  // Розміщення по тапу
  const controller = renderer.xr.getController(0);
  controller.addEventListener('select', () => {
    if (reticle.visible && modelConfigs.length) {
      switchModel(0);
      buildModelButtons();
      reticle.visible = false;
      stopLoadingSeq();
    }
  });

  renderer.render(scene, camera);
}
