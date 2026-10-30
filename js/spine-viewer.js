/**
 * Global Care — Aldaver spine simulator viewer
 * Loads the GLB into the showroom's <dialog data-or3d-model> the first time it opens.
 * Imported on demand by js/or-scene.js, so the tour never pays for it up front.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Node names match the GLB. Rows appear in the panel in this order.
var LAYERS = [
  { node: "Vertebrae", label: "Vertebrae / pelvis", color: [0.94, 0.92, 0.84] },
  { node: "SoftTissueInternal", label: "Soft tissue", color: [0.46, 0.10, 0.14] },
  { node: "LigamentumFlavum", label: "Ligamentum flavum", color: [0.95, 0.68, 0.28], opacity: 0.85 },
  { node: "Discs", label: "Intervertebral discs", color: [0.90, 0.78, 0.32], opacity: 0.9 },
  { node: "SpinalCord", label: "Spinal cord / roots", color: [1.0, 0.88, 0.08] }
];
var SHELL = {
  SkinCover: { color: [0.92, 0.60, 0.46], roughness: 0.62, metalness: 0 },
  WhitePlate: { color: [0.94, 0.94, 0.95], roughness: 0.5 },
  OuterBase: { color: [0.05, 0.05, 0.055], roughness: 0.92 },
  InnerTray: { color: [0.05, 0.05, 0.055], roughness: 0.92 },
  Supports: { color: [0.05, 0.05, 0.055], roughness: 0.92 }
};
var COVERS = ["SkinCover", "WhitePlate"];
var HIGHLIGHT = new THREE.Color(0x02816b);
var COVER_LIFT = 0.07;

function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

// Spec colours are sRGB, matched to photos of the real unit
function srgb(c) { return new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace); }
function toCss(c) { return "#" + srgb(c).getHexString(); }

export function init(dialog) {
  var stage = dialog.querySelector("[data-model-stage]");
  var canvas = dialog.querySelector("canvas");
  var panel = dialog.querySelector("[data-model-panel]");
  var layerList = dialog.querySelector("[data-model-layers]");
  var progress = dialog.querySelector("[data-model-progress]");
  var viewBtns = Array.prototype.slice.call(dialog.querySelectorAll("[data-model-view]"));

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  var scene = new THREE.Scene();
  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  // Soft reflections only; more than this greys out the black tray and pales the skin
  scene.environmentIntensity = 0.65;

  var camera = new THREE.PerspectiveCamera(36, 1, 0.01, 20);
  var controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.495;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a9096, 0.6));
  var key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(0.7, 1.5, 0.9);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -0.5;
  key.shadow.camera.right = 0.5;
  key.shadow.camera.top = 0.5;
  key.shadow.camera.bottom = -0.5;
  scene.add(key);
  var fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(-0.8, 0.5, -0.4);
  scene.add(fill);

  var ground = new THREE.Mesh(new THREE.CircleGeometry(1.2, 48), new THREE.ShadowMaterial({ opacity: 0.16 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  /* ----- Model state ----- */
  var model = null;
  var modelBox = null; // measured once, with the covers seated, so reframing doesn't drift
  var loading = null;
  var nodes = {};
  var hidden = {};
  var meshesByNode = {};
  var covers = [];
  var highlighted = null;
  var inside = false;
  var cover = { v: 1, target: 1 };

  function applyVisibility() {
    if (!model) return;
    COVERS.forEach(function (name) { if (nodes[name]) nodes[name].visible = cover.v > 0.001; });
    // The anatomy sits under an opaque cover, so it only draws once the cover starts to lift
    LAYERS.forEach(function (l) {
      if (nodes[l.node]) nodes[l.node].visible = cover.v < 0.999 && !hidden[l.node];
    });
  }

  function applyCover() {
    covers.forEach(function (c) {
      c.mesh.material.transparent = cover.v < 0.999;
      c.mesh.material.opacity = cover.v;
      c.node.position.y = c.baseY + COVER_LIFT * (1 - cover.v);
    });
    applyVisibility();
  }

  function setHighlight(name) {
    highlighted = name;
    LAYERS.forEach(function (l) {
      (meshesByNode[l.node] || []).forEach(function (mesh) {
        // Tint as well as glow: emissive alone barely shows on the near-white bone
        var on = l.node === name;
        mesh.material.color.copy(srgb(l.color));
        if (on) mesh.material.color.lerp(HIGHLIGHT, 0.75);
        mesh.material.emissive.copy(HIGHLIGHT);
        mesh.material.emissiveIntensity = on ? 0.35 : 0;
      });
    });
    layerList.querySelectorAll("[data-model-highlight]").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-model-highlight") === name ? "true" : "false");
    });
  }

  function setInside(on) {
    inside = on;
    cover.target = on ? 0 : 1;
    if (REDUCED) { cover.v = cover.target; applyCover(); }
    if (!on) setHighlight(null);
    viewBtns.forEach(function (b) {
      b.setAttribute("aria-pressed", (b.getAttribute("data-model-view") === "inside") === on ? "true" : "false");
    });
    panel.classList.toggle("is-inside", on);
  }

  function setLayerHidden(name, off) {
    if (off) hidden[name] = true; else delete hidden[name];
    if (off && highlighted === name) setHighlight(null);
    var box = layerList.querySelector('[data-model-toggle="' + name + '"]');
    if (box) box.checked = !off;
    applyVisibility();
  }

  // Selecting anatomy opens the model and makes sure that layer is on
  function selectLayer(name) {
    if (highlighted === name) { setHighlight(null); return; }
    if (!inside) setInside(true);
    setLayerHidden(name, false);
    setHighlight(name);
  }

  /* ----- Panel ----- */
  layerList.innerHTML = LAYERS.map(function (l) {
    return '<li class="or3d-model__layer">' +
      '<button type="button" class="or3d-model__layer-name" data-model-highlight="' + l.node + '" aria-pressed="false">' +
      '<span class="or3d-model__swatch" style="background:' + toCss(l.color) + '"></span>' + l.label + "</button>" +
      '<input type="checkbox" checked data-model-toggle="' + l.node + '" aria-label="Show ' + l.label + '">' +
      "</li>";
  }).join("");

  layerList.addEventListener("click", function (e) {
    var b = e.target.closest("[data-model-highlight]");
    if (b) selectLayer(b.getAttribute("data-model-highlight"));
  });
  layerList.addEventListener("change", function (e) {
    var name = e.target.getAttribute("data-model-toggle");
    if (!name) return;
    if (e.target.checked && !inside) setInside(true);
    setLayerHidden(name, !e.target.checked);
  });
  viewBtns.forEach(function (b) {
    b.addEventListener("click", function () { setInside(b.getAttribute("data-model-view") === "inside"); });
  });
  dialog.querySelector("[data-model-reset]").addEventListener("click", function () { frameModel(true); });

  /* ----- Click a part to select it (a drag only orbits) ----- */
  var raycaster = new THREE.Raycaster();
  var pointer = new THREE.Vector2();
  var down = null;
  canvas.addEventListener("pointerdown", function (e) {
    down = e.button === 0 ? { x: e.clientX, y: e.clientY } : null;
  });
  canvas.addEventListener("pointerup", function (e) {
    if (!down || !model) return;
    var moved = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y);
    down = null;
    if (moved > 5) return;
    var r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    var hits = raycaster.intersectObject(model, true);
    for (var i = 0; i < hits.length; i++) {
      var o = hits[i].object;
      while (o && !nodes[o.name]) o = o.parent;
      if (!o) continue;
      if (LAYERS.some(function (l) { return l.node === o.name; })) { selectLayer(o.name); return; }
      if (COVERS.indexOf(o.name) !== -1 || o.name === "InnerTray" || o.name === "OuterBase") return;
    }
  });

  /* ----- Framing ----- */
  var size = { w: 1, h: 1 };
  var offsetX = 0;
  var home = { target: new THREE.Vector3(), pos: new THREE.Vector3() };
  var tween = null;
  var radius = 0.3;
  var userMoved = false;

  // The panel floats over the left of the stage on wide screens
  function panelInset() {
    return getComputedStyle(panel).position === "absolute" ? panel.offsetWidth + 16 : 0;
  }

  function resize() {
    var r = stage.getBoundingClientRect();
    size.w = Math.max(1, r.width);
    size.h = Math.max(1, r.height);
    renderer.setSize(size.w, size.h, false);
    camera.aspect = size.w / size.h;
    offsetX = -panelInset() / 2;
    camera.setViewOffset(size.w, size.h, offsetX, 0, size.w, size.h);
    camera.updateProjectionMatrix();
    // Keep the model fitted (e.g. rotating a phone) unless the visitor has set their own view
    if (model && !userMoved) {
      computeHome();
      if (!tween) placeAtHome();
    }
  }
  new ResizeObserver(resize).observe(stage);

  function computeHome() {
    var center = modelBox.getCenter(new THREE.Vector3());
    radius = modelBox.getSize(new THREE.Vector3()).length() / 2;
    var vHalf = THREE.MathUtils.degToRad(camera.fov) / 2;
    var visibleAspect = Math.max(0.5, (size.w - panelInset()) / size.h);
    var hHalf = Math.atan(Math.tan(vHalf) * visibleAspect);
    var dist = (radius / Math.sin(Math.min(vHalf, hHalf))) * 1.02;
    home.target.copy(center);
    home.pos.copy(center).add(new THREE.Vector3(0.38, 0.72, 0.78).normalize().multiplyScalar(dist));
    controls.minDistance = radius * 0.6;
    controls.maxDistance = dist * 2.2;
  }

  function placeAtHome() {
    camera.position.copy(home.pos);
    controls.target.copy(home.target);
    controls.update();
  }

  function frameModel(animate) {
    computeHome();
    userMoved = false;
    if (REDUCED || !animate) {
      tween = null;
      placeAtHome();
      return;
    }
    tween = {
      t0: performance.now(), dur: 750,
      fromPos: camera.position.clone(), fromTarget: controls.target.clone()
    };
    controls.enableDamping = false;
  }
  controls.addEventListener("start", function () {
    userMoved = true;
    tween = null;
    controls.enableDamping = true;
  });

  /* ----- Loop ----- */
  var running = false;
  var last = 0;
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (tween) {
      var p = Math.min(1, (now - tween.t0) / tween.dur);
      var e = easeOut(p);
      camera.position.lerpVectors(tween.fromPos, home.pos, e);
      controls.target.lerpVectors(tween.fromTarget, home.target, e);
      if (p >= 1) { tween = null; controls.enableDamping = true; }
    }
    if (cover.v !== cover.target) {
      var step = dt / 0.45;
      cover.v = cover.target > cover.v ? Math.min(cover.target, cover.v + step) : Math.max(cover.target, cover.v - step);
      applyCover();
    }
    controls.update();
    renderer.render(scene, camera);
  }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }
  function stop() { running = false; }
  dialog.addEventListener("close", stop);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else if (dialog.open && model) start();
  });

  /* ----- Load ----- */
  function prepare(gltf) {
    var root = gltf.scene;
    root.traverse(function (o) {
      if (o.name) nodes[o.name] = o;
      if (!o.isMesh || !o.material) return;
      o.castShadow = true;
      o.receiveShadow = true;
      o.material = o.material.clone();
      var owner = o;
      while (owner && !SHELL[owner.name] && !LAYERS.some(function (l) { return l.node === owner.name; })) owner = owner.parent;
      if (!owner) return;
      var layer = LAYERS.filter(function (l) { return l.node === owner.name; })[0];
      var spec = layer || SHELL[owner.name];
      o.material.color.copy(srgb(spec.color));
      if (spec.roughness !== undefined) o.material.roughness = spec.roughness;
      if (spec.metalness !== undefined) o.material.metalness = spec.metalness;
      if (spec.opacity !== undefined) { o.material.transparent = true; o.material.opacity = spec.opacity; }
      if (layer) (meshesByNode[layer.node] = meshesByNode[layer.node] || []).push(o);
      if (COVERS.indexOf(owner.name) !== -1) covers.push({ mesh: o, node: owner, baseY: owner.position.y });
    });
    model = root;
    modelBox = new THREE.Box3().setFromObject(root);
    scene.add(root);
  }

  function load(src) {
    if (model) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      new GLTFLoader().load(src, function (gltf) {
        prepare(gltf);
        resolve();
      }, function (evt) {
        if (evt.lengthComputable && progress) progress.textContent = Math.round((evt.loaded / evt.total) * 100) + "%";
      }, reject);
    }).finally(function () { loading = null; });
    return loading;
  }

  return {
    open: function (src) {
      resize();
      return load(src).then(function () {
        if (!dialog.open) return;
        resize();
        var first = !dialog.classList.contains("is-loaded");
        if (first) {
          applyCover();
          computeHome();
          // Settle in from a little further out and around
          camera.position.copy(home.target).add(home.pos.clone().sub(home.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), REDUCED ? 0 : 0.5).multiplyScalar(REDUCED ? 1 : 1.25));
          controls.target.copy(home.target);
          controls.update();
          frameModel(true);
        }
        dialog.classList.add("is-loaded");
        start();
      });
    }
  };
}
