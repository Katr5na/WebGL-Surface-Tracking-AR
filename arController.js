import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let camera, scene, renderer, controller, reticle;
let hitTestSource = null, hitTestSourceRequested = false;
let modelList = [], modelObjects = [], placedModel = null;
const loader = new GLTFLoader();
const urlParams = new URLSearchParams(window.location.search);
const configUrl = urlParams.get('config');
const byUrl = urlParams.get('byUrl');

if (!configUrl) {
  alert("Missing ?config= parameter");
  throw new Error("Missing config");
}

fetch(configUrl)
  .then(res => res.json())
  .then(cfg => {
    modelList = cfg.models;
    return Promise.all(modelList.map(entry => new Promise(resolve => {
      loader.load(entry.url, gltf => {
        modelObjects.push(gltf.scene);
        resolve();
      }, undefined, err => {
        console.error(`Error loading ${entry.label}:`, err);
        modelObjects.push(null);
        resolve();
      });
    })));
  })
  .then(() => { init(); animate(); })
  .catch(err => { console.error(err); alert("Failed to load config"); });

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1));

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  const overlay = document.getElementById('overlay');
  const sessionInit = {
    requiredFeatures: ['hit-test', 'dom-overlay'],
    domOverlay: { root: overlay }
  };
  document.body.appendChild(ARButton.createButton(renderer, sessionInit));

  document.getElementById('close-ar').addEventListener('click', () => {
    const session = renderer.xr.getSession(); if (session) session.end();
  });

  const ringGeo = new THREE.RingGeometry(0.05, 0.06, 32).rotateX(-Math.PI / 2);
  reticle = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffaa2a }));
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect);
  scene.add(controller);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function onSelect() {
  if (!reticle.visible || placedModel) return;
  const model = modelObjects[0];
  if (!model) return alert("Model failed to load.");
  placedModel = model.clone();
  placedModel.position.setFromMatrixPosition(reticle.matrix);
  placedModel.quaternion.setFromRotationMatrix(reticle.matrix);
  scene.add(placedModel);
  buildModelButtons();

  if (byUrl) {
    const oc = document.getElementById('order-button-container');
    oc.style.display = 'block';
    document.getElementById('order-button').onclick = () => window.location.href = byUrl;
  }
}

function buildModelButtons() {
  const container = document.getElementById('model-buttons');
  container.innerHTML = '';
  modelList.forEach((entry, idx) => {
    const model = modelObjects[idx];
    if (!model) return;
    const btn = document.createElement('button');
    btn.textContent = entry.label;
    btn.addEventListener('click', () => switchModel(model));
    container.appendChild(btn);
  });
  container.style.display = 'flex';
}

function switchModel(newModel) {
  if (!placedModel) return;
  scene.remove(placedModel);
  placedModel = newModel.clone();
  scene.add(placedModel);
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render(_, frame) {
  if (frame && !placedModel) {
    const session = renderer.xr.getSession();
    const refSpace = renderer.xr.getReferenceSpace();
    if (!hitTestSourceRequested) {
      session.requestReferenceSpace('viewer')
        .then(rs => session.requestHitTestSource({ space: rs }))
        .then(src => { hitTestSource = src; });
      session.addEventListener('end', () => {
        hitTestSourceRequested = false;
        hitTestSource = null;
      });
      hitTestSourceRequested = true;
    }
    if (hitTestSource) {
      const hits = frame.getHitTestResults(hitTestSource);
      if (hits.length > 0) {
        const pose = hits[0].getPose(refSpace);
        reticle.visible = true;
        reticle.matrix.fromArray(pose.transform.matrix);
      } else {
        reticle.visible = false;
      }
    }
  }

  renderer.render(scene, camera);
}
