/**
 * Global Care — Interactive 3D showroom OR
 * Procedural Three.js room with 3D-anchored product pins, camera fly-to and a glass detail card.
 * Loaded by lab/showroom.html via dynamic import (falls back to the static image on failure).
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { openSpineModel, isSpineModelOpen } from "./spine-dialog.js";

var A = "../assets/";
var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ----- Station data ----- */
var STATIONS = [
  {
    id: "table", tag: "Training", kicker: "Operating table",
    title: "Aldaver spine simulation model",
    body: "A full spine surgical training dummy staged prone on a clinical OR bed—practise positioning, access and implant workflow exactly as you would in theatre.",
    products: [{ name: "Aldaver Spine surgery simulation model", href: "../products.html#education-training" }],
    model: { src: A + "products/aldaver-spine-simulator.glb", label: "Try the virtual model" },
    images: [
      { src: A + "products/aldaver-spine-simulation-model.jpg", alt: "Aldaver spine surgery simulation model" },
      { src: A + "or-whiteboard/spine-dummy-3d.jpg", alt: "Aldaver spine training dummy on a black tray" }
    ],
    anchor: [0.2, 1.3, 0.2], view: [4.4, 28, 52]
  },
  {
    id: "altician", tag: "Training", kicker: "Planning workstation",
    title: "Altician AR spine training",
    body: "Automatic spine and disc segmentation from CT, skin-incision and endoscopic-view simulation, plus one-click screw, rod and cage placement—run live during your visit.",
    products: [{ name: "Altician surgical training software", href: "../products.html#altician" }],
    images: [
      { src: A + "products/altician/gallery-1.jpg", alt: "Automatic spine and disc segmentation from CT" },
      { src: A + "products/altician/gallery-2.jpg", alt: "Skin incision and instrument simulation" },
      { src: A + "products/altician/gallery-3.jpg", alt: "Endoscopic view simulation" },
      { src: A + "products/altician/gallery-4.jpg", alt: "One-click screw and rod placement" },
      { src: A + "products/altician/gallery-5.jpg", alt: "One-click fusion cage placement" }
    ],
    anchor: [-2.6, 1.6, -1.4], view: [3.4, 18, 60]
  },
  {
    id: "endoscope", tag: "Visualization", kicker: "Mobile tower",
    title: "4K Endoscopic Camera System",
    body: "True 4K: proven versatility for UBE, Uniportal and Arthroscopy.",
    products: [],
    images: [{ src: A + "or-whiteboard/endoscope-tower-3d.jpg", alt: "4K endoscopic camera system", full: true }],
    video: { src: A + "products/endoscopic-camera-4k.mp4", poster: A + "products/endoscopic-camera-4k-poster.jpg", label: "4K Endoscopic Camera System video" },
    anchor: [1.9, 2.05, 0.6], view: [3.8, -38, 62]
  },
  {
    id: "rf", tag: "Pain management", kicker: "RF cart",
    title: "Radiofrequency ablation",
    body: "Water-cooled RF probes with a 2- or 4-channel generator console for interventional pain programmes—compare probe types and workflow at the cart.",
    products: [
      { name: "Water-cooled radiofrequency ablation probes", href: "../products.html#pain-management" },
      { name: "Console (2 channel / 4 channel)", href: "../products.html#pain-management" }
    ],
    images: [],
    anchor: [2.7, 1.4, -1.5], view: [3.2, 20, 60]
  },
  {
    id: "cabinet", tag: "Consumables", kicker: "Supply cabinet",
    title: "Vertebral augmentation consumables",
    body: "Kyphoplasty, vertebroplasty and cement-containment products shelved by family. Pull any system for a closer look on the back table.",
    products: [
      { name: "Kyphoplasty balloon system", href: "../products.html#consumables" },
      { name: "Vertebroplasty needle", href: "../products.html#consumables" },
      { name: "Bone cement holding mesh", href: "../products.html#consumables" }
    ],
    images: [],
    anchor: [1.0, 2.3, -2.6], view: [4.0, 8, 70]
  },
  {
    id: "instruments", tag: "Instruments", kicker: "Back table",
    title: "Instrument set case",
    body: "An open sterile-layout case with handled instruments and cannulas, ready for technique review.",
    products: [],
    images: [{ src: A + "or-whiteboard/instrument-case-web.jpg", alt: "Open surgical instrument case with hand instruments" }],
    anchor: [1.0, 1.3, 1.9], view: [2.8, 18, 42]
  },
  {
    id: "whiteboard", tag: "Research", kicker: "Imaging wall",
    title: "Novel product implementation",
    body: "Coronal, sagittal and axial case imaging on the wall display—used to discuss new products with surgeons and gather feedback for market research.",
    products: [],
    images: [
      { src: A + "or-whiteboard/ct-coronal-web.jpg", alt: "Coronal CT view" },
      { src: A + "or-whiteboard/ct-sagittal-web.jpg", alt: "Sagittal CT view" },
      { src: A + "or-whiteboard/ct-axial-web.jpg", alt: "Axial CT view" }
    ],
    anchor: [-1.3, 2.2, -2.85], view: [3.6, 4, 76]
  }
];

var DEFAULT_VIEW = { target: [0, 0.6, -0.1], view: [12.5, 14, 54] };
var INTRO_VIEW = { target: [0, 0.4, -0.1], view: [17, 8, 38] };

/* ----- Easing: matches --ease-in-out cubic-bezier(0.77, 0, 0.175, 1) ----- */
function bezier(x1, y1, x2, y2) {
  function a(p1, p2) { return 1 - 3 * p2 + 3 * p1; }
  function b(p1, p2) { return 3 * p2 - 6 * p1; }
  function c(p1) { return 3 * p1; }
  function calc(t, p1, p2) { return ((a(p1, p2) * t + b(p1, p2)) * t + c(p1)) * t; }
  function slope(t, p1, p2) { return 3 * a(p1, p2) * t * t + 2 * b(p1, p2) * t + c(p1); }
  return function (x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var t = x;
    for (var i = 0; i < 8; i++) {
      var s = slope(t, x1, x2);
      if (Math.abs(s) < 1e-6) break;
      t -= (calc(t, x1, x2) - x) / s;
    }
    return calc(t, y1, y2);
  };
}
var easeInOut = bezier(0.77, 0, 0.175, 1);
var easeOut = bezier(0.23, 1, 0.32, 1);

function toRad(d) { return (d * Math.PI) / 180; }

/* ----- Scene building helpers ----- */
function mat(color, opts) {
  return new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.55, metalness: 0 }, opts || {}));
}

var M = {
  wall: mat(0xeef1f4, { roughness: 0.9 }),
  white: mat(0xf5f7f9, { roughness: 0.45 }),
  panel: mat(0xe3e8ed, { roughness: 0.5 }),
  grey: mat(0xb8c2cc, { roughness: 0.5 }),
  dark: mat(0x1c2836, { roughness: 0.45 }),
  black: mat(0x0d1218, { roughness: 0.6 }),
  steel: mat(0xd2d8de, { metalness: 0.85, roughness: 0.28 }),
  navy: mat(0x0b224c, { roughness: 0.6 }),
  teal: mat(0x02816b, { roughness: 0.55 }),
  tealSoft: mat(0x2aa58f, { roughness: 0.6 }),
  tealMist: mat(0xcdeee8, { roughness: 0.8 }),
  skin: mat(0xe7b89d, { roughness: 0.65 }),
  wood: mat(0xc2ab8e, { roughness: 0.7 }),
  rubber: mat(0x30363d, { roughness: 0.9 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xd8ecf5, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false }),
  ledWarm: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff6dc, emissiveIntensity: 1.6 }),
  ledCool: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xe6fbff, emissiveIntensity: 1.2 })
};

function shade(mesh) { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }

/** Box whose bottom sits at y. */
function box(parent, w, h, d, material, x, y, z) {
  var m = shade(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material));
  m.position.set(x || 0, (y || 0) + h / 2, z || 0);
  parent.add(m);
  return m;
}

/** Rounded box via extruded rounded rect (bottom at y). */
function rbox(parent, w, h, d, r, material, x, y, z) {
  var s = new THREE.Shape();
  var hw = w / 2 - r, hd = d / 2 - r;
  s.moveTo(-hw, -d / 2);
  s.lineTo(hw, -d / 2); s.quadraticCurveTo(w / 2, -d / 2, w / 2, -hd);
  s.lineTo(w / 2, hd); s.quadraticCurveTo(w / 2, d / 2, hw, d / 2);
  s.lineTo(-hw, d / 2); s.quadraticCurveTo(-w / 2, d / 2, -w / 2, hd);
  s.lineTo(-w / 2, -hd); s.quadraticCurveTo(-w / 2, -d / 2, -hw, -d / 2);
  var g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 6 });
  g.rotateX(-Math.PI / 2);
  var m = shade(new THREE.Mesh(g, material));
  m.position.set(x || 0, y || 0, z || 0);
  parent.add(m);
  return m;
}

function cyl(parent, rt, rb, h, material, x, y, z, seg) {
  var m = shade(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 24), material));
  m.position.set(x || 0, (y || 0) + h / 2, z || 0);
  parent.add(m);
  return m;
}

/** Cylinder spanning two points. */
function rod(parent, a, b, r, material) {
  var va = new THREE.Vector3().fromArray(a), vb = new THREE.Vector3().fromArray(b);
  var len = va.distanceTo(vb);
  var m = shade(new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 16), material));
  m.position.copy(va).add(vb).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.sub(va).normalize());
  parent.add(m);
  return m;
}

function wheels(parent, w, d, y) {
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s) {
    var wh = cyl(parent, 0.045, 0.045, 0.04, M.rubber, s[0] * w / 2, y || 0.02, s[1] * d / 2, 16);
    wh.rotation.x = Math.PI / 2;
    wh.position.y = 0.045;
  });
}

function screenMaterial(texture) {
  return new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
}

function screen(parent, w, h, texture, x, y, z) {
  var bezel = box(parent, w + 0.05, h + 0.05, 0.04, M.black, x, y - (h + 0.05) / 2, z);
  var s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMaterial(texture));
  s.position.set(x, y, z + 0.021);
  parent.add(s);
  return bezel;
}

/* ----- Textures ----- */
function floorTexture() {
  var c = document.createElement("canvas");
  c.width = c.height = 512;
  var g = c.getContext("2d");
  g.fillStyle = "#e4e9ee";
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(160,175,190,0.35)";
  g.lineWidth = 2;
  for (var i = 0; i <= 512; i += 128) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke();
  }
  var t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 3);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function ctTexture(loader) {
  var c = document.createElement("canvas");
  c.width = 1536; c.height = 768;
  var g = c.getContext("2d");
  g.fillStyle = "#05070a";
  g.fillRect(0, 0, c.width, c.height);
  var t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  ["ct-coronal-web.jpg", "ct-sagittal-web.jpg", "ct-axial-web.jpg"].forEach(function (f, i) {
    var img = new Image();
    img.onload = function () {
      var cw = c.width / 3 - 24, ch = c.height - 48;
      var s = Math.min(cw / img.width, ch / img.height);
      var w = img.width * s, h = img.height * s;
      g.drawImage(img, i * (c.width / 3) + 12 + (cw - w) / 2, 24 + (ch - h) / 2, w, h);
      t.needsUpdate = true;
    };
    img.src = A + "or-whiteboard/" + f;
  });
  return t;
}

function coverTexture(loader, src, aspect) {
  var t = loader.load(src, function (tex) {
    var ia = tex.image.width / tex.image.height;
    if (ia > aspect) { tex.repeat.set(aspect / ia, 1); tex.offset.set((1 - aspect / ia) / 2, 0); }
    else { tex.repeat.set(1, ia / aspect); tex.offset.set(0, (1 - ia / aspect) / 2); }
  });
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function endoTexture(loader) {
  // Crop the endoscopic view straight out of the original showroom render.
  var t = loader.load(A + "or-showroom-birdseye.jpg");
  t.colorSpace = THREE.SRGBColorSpace;
  t.repeat.set(170 / 1280, 100 / 720);
  t.offset.set(818 / 1280, 1 - 332 / 720);
  return t;
}

function consoleTexture() {
  var c = document.createElement("canvas");
  c.width = 256; c.height = 128;
  var g = c.getContext("2d");
  g.fillStyle = "#06221e"; g.fillRect(0, 0, 256, 128);
  g.fillStyle = "#73d3c4"; g.font = "bold 34px sans-serif";
  g.fillText("90°C", 18, 52); g.fillText("02:30", 132, 52);
  g.fillStyle = "rgba(115,211,196,0.35)";
  for (var i = 0; i < 4; i++) g.fillRect(18 + i * 58, 80, 46, 26);
  var t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ----- Room ----- */
var ROOM = { w: 8, d: 6, h: 2.7, t: 0.12 };

function buildWall(scene, opts) {
  var g = new THREE.Group();
  var mats = { wall: M.wall.clone(), navy: M.navy.clone(), teal: M.teal.clone() };
  var len = opts.len;
  box(g, len, ROOM.h, ROOM.t, mats.wall, 0, 0, 0).castShadow = false;
  box(g, len, 0.12, ROOM.t + 0.02, mats.navy, 0, 0.95, 0);
  box(g, len, 0.07, ROOM.t + 0.02, mats.teal, 0, 1.07, 0);
  box(g, len + 0.001, 0.04, ROOM.t + 0.04, mats.navy, 0, ROOM.h - 0.03, 0); // sits proud of the wall top so the two faces don't flicker
  g.position.set(opts.x, 0, opts.z);
  g.rotation.y = opts.ry;
  g.userData = { normal: new THREE.Vector3().fromArray(opts.normal), point: new THREE.Vector3(opts.x, 1, opts.z), fade: 1, mats: mats };
  scene.add(g);
  return g;
}

function buildRoom(scene, tex) {
  var hw = ROOM.w / 2, hd = ROOM.d / 2;

  var floor = new THREE.Mesh(new THREE.BoxGeometry(ROOM.w + 0.3, 0.24, ROOM.d + 0.3), [
    M.panel, M.panel, mat(0xffffff, { map: tex.floor, roughness: 0.8 }), M.panel, M.panel, M.panel
  ]);
  floor.position.y = -0.12;
  floor.receiveShadow = true;
  scene.add(floor);

  // Sterile field marking under the table
  var field = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.2), new THREE.MeshStandardMaterial({ color: 0xd6efe9, roughness: 0.9, transparent: true, opacity: 0.55 }));
  field.rotation.x = -Math.PI / 2;
  field.rotation.z = toRad(15);
  field.position.set(0.2, 0.002, 0.2);
  field.receiveShadow = true;
  scene.add(field);

  var walls = [
    buildWall(scene, { len: ROOM.w + ROOM.t * 2, x: 0, z: -hd - ROOM.t / 2, ry: 0, normal: [0, 0, 1] }),
    buildWall(scene, { len: ROOM.d, x: -hw - ROOM.t / 2, z: 0, ry: Math.PI / 2, normal: [1, 0, 0] }),
    buildWall(scene, { len: ROOM.d, x: hw + ROOM.t / 2, z: 0, ry: -Math.PI / 2, normal: [-1, 0, 0] }),
    buildWall(scene, { len: ROOM.w + ROOM.t * 2, x: 0, z: hd + ROOM.t / 2, ry: Math.PI, normal: [0, 0, -1] })
  ];

  // Back wall: navy feature panel + imaging display
  var back = walls[0];
  box(back, 2.8, 2.0, 0.02, back.userData.mats.navy, -1.3, 0.55, ROOM.t / 2 + 0.01);
  screen(back, 1.7, 0.85, tex.ct, -1.3, 1.65, ROOM.t / 2 + 0.05);

  // Left wall: teal scrub niche + dispenser
  var left = walls[1];
  box(left, 1.0, 0.6, 0.02, left.userData.mats.teal, -1.4, 1.3, ROOM.t / 2 + 0.01);
  box(left, 0.12, 0.2, 0.08, M.white, -1.55, 1.48, ROOM.t / 2 + 0.05);
  box(left, 0.42, 0.02, 0.12, M.steel, -1.2, 1.42, ROOM.t / 2 + 0.07);

  // Right wall: entrance door
  var right = walls[2];
  var zf = ROOM.t / 2;
  box(right, 1.22, 2.24, 0.06, right.userData.mats.wall === M.wall ? M.wood : M.wood, 0.5, 0, zf + 0.02);
  box(right, 1.06, 2.14, 0.05, M.grey, 0.5, 0, zf + 0.05);
  box(right, 0.16, 0.6, 0.02, M.glass, 0.72, 1.2, zf + 0.08);
  box(right, 0.04, 0.3, 0.04, M.steel, 0.15, 0.95, zf + 0.09);
  box(right, 1.06, 0.07, 0.01, right.userData.mats.teal, 0.5, 1.07, zf + 0.08);

  return walls;
}

function buildTable(scene) {
  var g = new THREE.Group();
  box(g, 0.9, 0.08, 0.5, M.grey, 0, 0, 0);
  box(g, 0.32, 0.62, 0.26, M.white, 0, 0.08, 0);
  box(g, 2.1, 0.06, 0.62, M.steel, 0, 0.7, 0);
  [-0.68, 0, 0.68].forEach(function (x) { rbox(g, 0.64, 0.09, 0.6, 0.05, M.teal, x, 0.76, 0); });
  rbox(g, 0.26, 0.07, 0.34, 0.06, M.teal, 1.2, 0.74, 0);
  // Drape falling off the near side
  box(g, 1.6, 0.4, 0.02, M.tealSoft, -0.1, 0.4, 0.32);
  // Spine trainer on black tray
  rbox(g, 0.96, 0.04, 0.44, 0.04, M.black, -0.1, 0.85, 0);
  var torso = shade(new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.52, 8, 20), M.skin));
  torso.rotation.z = Math.PI / 2;
  torso.scale.set(0.7, 1, 1.25);
  torso.position.set(-0.1, 1.0, 0);
  g.add(torso);
  var spine = box(g, 0.6, 0.015, 0.03, mat(0xd39c80), -0.1, 1.098, 0);
  spine.castShadow = false;
  g.position.set(0.2, 0, 0.2);
  g.rotation.y = toRad(-15);
  scene.add(g);
}

function buildCArm(scene) {
  var g = new THREE.Group();
  rbox(g, 0.75, 0.42, 0.55, 0.08, M.white, 0, 0.09, 0);
  wheels(g, 0.6, 0.45);
  box(g, 0.2, 0.95, 0.22, M.white, -0.18, 0.5, 0);
  box(g, 0.75, 0.12, 0.14, M.white, 0.2, 1.3, 0);
  var cx = 0.95, cy = 1.02;
  var c = shade(new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.055, 16, 64, Math.PI * 1.4), M.white));
  c.rotation.z = Math.PI * 0.3;
  c.position.set(cx, cy, 0);
  g.add(c);
  var a1 = Math.PI * 0.3, a2 = Math.PI * 1.7;
  var tube = rbox(g, 0.32, 0.2, 0.3, 0.06, M.white, cx + Math.cos(a1) * 0.62, cy + Math.sin(a1) * 0.62 - 0.05, 0);
  tube.rotation.z = a1 - Math.PI / 2;
  var det = cyl(g, 0.17, 0.17, 0.12, M.panel, cx + Math.cos(a2) * 0.62, cy + Math.sin(a2) * 0.62 - 0.02, 0, 32);
  det.material = M.panel;
  g.position.set(-2.05, 0, 0.55);
  g.rotation.y = toRad(-15);
  scene.add(g);
}

function buildLight(scene) {
  var g = new THREE.Group();
  cyl(g, 0.12, 0.12, 0.05, M.white, 0.6, ROOM.h - 0.05, -0.7);
  cyl(g, 0.035, 0.035, 0.45, M.white, 0.6, ROOM.h - 0.5, -0.7);
  rod(g, [0.6, ROOM.h - 0.48, -0.7], [0.2, ROOM.h - 0.48, 0.2], 0.03, M.white);
  rod(g, [0.2, ROOM.h - 0.48, 0.2], [0.2, 1.96, 0.2], 0.025, M.white);
  var head = cyl(g, 0.34, 0.3, 0.09, M.white, 0.2, 1.88, 0.2, 40);
  head.castShadow = false;
  var lens = new THREE.Mesh(new THREE.CircleGeometry(0.27, 40), M.ledWarm);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0.2, 1.875, 0.2);
  g.add(lens);
  scene.add(g);

  var spot = new THREE.SpotLight(0xfff4dd, 14, 4, toRad(28), 0.75, 1.4);
  spot.position.set(0.2, 1.86, 0.2);
  spot.target.position.set(0.2, 0.8, 0.2);
  scene.add(spot, spot.target);
}

function buildEndoscope(scene, tex) {
  var g = new THREE.Group();
  rbox(g, 0.6, 0.06, 0.55, 0.06, M.white, 0, 0.1, 0);
  wheels(g, 0.5, 0.45);
  [-0.24, 0.24].forEach(function (x) { cyl(g, 0.02, 0.02, 1.0, M.grey, x, 0.16, -0.2, 12); });
  var y = 0.2;
  [[0.18, M.white], [0.14, M.panel], [0.16, M.white], [0.12, M.panel]].forEach(function (b, i) {
    box(g, 0.5, b[0], 0.42, b[1], 0, y, 0);
    var face = box(g, 0.18, b[0] * 0.5, 0.01, i % 2 ? M.dark : M.teal, -0.1, y + b[0] * 0.25, 0.212);
    face.castShadow = false;
    y += b[0] + 0.03;
  });
  rbox(g, 0.56, 0.04, 0.48, 0.04, M.white, 0, 1.12, 0);
  cyl(g, 0.03, 0.03, 0.32, M.grey, 0, 1.16, -0.05, 12);
  var mon = new THREE.Group();
  screen(mon, 0.82, 0.48, tex.endo, 0, 0, 0);
  box(mon, 0.84, 0.05, 0.06, M.white, 0, -0.3, 0);
  mon.position.set(0, 1.76, 0);
  mon.rotation.y = -0.75;
  g.add(mon);
  g.position.set(1.9, 0, 0.6);
  g.rotation.y = 0.15;
  scene.add(g);
}

function buildRF(scene, tex) {
  var g = new THREE.Group();
  rbox(g, 0.5, 0.05, 0.42, 0.05, M.white, 0, 0.1, 0);
  wheels(g, 0.4, 0.34);
  cyl(g, 0.025, 0.025, 0.8, M.grey, 0, 0.15, -0.12, 12);
  rbox(g, 0.5, 0.04, 0.42, 0.05, M.white, 0, 0.62, 0);
  rbox(g, 0.5, 0.04, 0.42, 0.05, M.white, 0, 0.92, 0);
  var con = rbox(g, 0.44, 0.22, 0.34, 0.04, M.white, 0, 0.96, 0);
  con.castShadow = true;
  var disp = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.12), screenMaterial(tex.console));
  disp.position.set(0, 1.08, 0.172);
  g.add(disp);
  [-0.12, -0.04, 0.04, 0.12].forEach(function (x) { cyl(g, 0.012, 0.012, 0.02, M.teal, x, 0.99, 0.17, 10).rotation.x = Math.PI / 2; });
  // Probe cables
  [[-0.12, 0.25], [0.12, 0.35]].forEach(function (p) {
    var curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(p[0], 0.99, 0.18),
      new THREE.Vector3(p[0] * 1.6, 0.8, 0.32),
      new THREE.Vector3(p[0] * 2.2, 0.75, p[1] + 0.1),
      new THREE.Vector3(p[0] * 2.5, 0.66, p[1])
    ]);
    g.add(shade(new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.008, 8), M.teal)));
  });
  g.position.set(2.7, 0, -1.5);
  g.rotation.y = -0.4;
  scene.add(g);
}

function buildCabinet(scene) {
  var g = new THREE.Group();
  var W = 1.8, H = 2.15, D = 0.42;
  box(g, W, H, 0.03, M.navy, 0, 0, -D / 2);
  box(g, 0.05, H, D, M.navy, -W / 2, 0, 0);
  box(g, 0.05, H, D, M.navy, W / 2, 0, 0);
  box(g, 0.05, H, D, M.navy, 0, 0, 0);
  box(g, W, 0.05, D, M.navy, 0, H - 0.05, 0);
  box(g, W, 0.12, D, M.navy, 0, 0, 0);
  box(g, W - 0.1, 0.015, 0.02, M.ledCool, 0, H - 0.08, 0.15).castShadow = false;
  var rnd = 7;
  function r() { rnd = (rnd * 9301 + 49297) % 233280; return rnd / 233280; }
  [0.5, 0.92, 1.34, 1.76].forEach(function (y) {
    box(g, W - 0.1, 0.02, D - 0.05, M.glass, 0, y, 0);
    [-1, 1].forEach(function (side) {
      var x = side * 0.06;
      while (Math.abs(x) < W / 2 - 0.15) {
        var w = 0.1 + r() * 0.1, h = 0.12 + r() * 0.16;
        var accent = r() > 0.78;
        box(g, w, h, 0.18 + r() * 0.1, accent ? M.tealMist : M.white, x + side * w / 2, y + 0.02, -0.02);
        x += side * (w + 0.03);
      }
    });
  });
  box(g, W / 2 - 0.03, H - 0.2, 0.01, M.glass, -W / 4, 0.12, D / 2).castShadow = false;
  box(g, W / 2 - 0.03, H - 0.2, 0.01, M.glass, W / 4, 0.12, D / 2).castShadow = false;
  g.position.set(1.0, 0, -ROOM.d / 2 + D / 2 + 0.02);
  scene.add(g);
}

function buildWorkstation(scene, tex) {
  var g = new THREE.Group();
  box(g, 1.1, 0.04, 0.6, M.white, 0, 0.74, 0);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s) { box(g, 0.04, 0.74, 0.04, M.grey, s[0] * 0.5, 0, s[1] * 0.26); });
  box(g, 1.0, 0.02, 0.5, M.panel, 0, 0.25, 0);
  box(g, 0.2, 0.02, 0.16, M.grey, 0, 0.78, -0.12);
  cyl(g, 0.02, 0.02, 0.2, M.grey, 0, 0.78, -0.12, 12);
  screen(g, 0.74, 0.44, tex.altician, 0, 1.22, -0.1);
  box(g, 0.44, 0.015, 0.14, M.dark, 0, 0.78, 0.12);
  box(g, 0.08, 0.015, 0.11, M.dark, 0.32, 0.78, 0.12);
  g.position.set(-2.6, 0, -1.6);
  g.rotation.y = 0.35;
  scene.add(g);
}

function buildInstrumentTable(scene, tex) {
  var g = new THREE.Group();
  box(g, 1.2, 0.03, 0.6, M.steel, 0, 0.84, 0);
  box(g, 1.1, 0.02, 0.5, M.steel, 0, 0.25, 0);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s) { cyl(g, 0.018, 0.018, 0.84, M.steel, s[0] * 0.56, 0, s[1] * 0.26, 10); });
  wheels(g, 1.12, 0.52);
  // Open case
  rbox(g, 0.62, 0.07, 0.42, 0.03, M.dark, -0.1, 0.87, 0.02);
  var inner = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.36), new THREE.MeshStandardMaterial({ map: tex.instruments, roughness: 0.6 }));
  inner.rotation.x = -Math.PI / 2;
  inner.position.set(-0.1, 0.942, 0.02);
  inner.receiveShadow = true;
  g.add(inner);
  var lid = new THREE.Group();
  rbox(lid, 0.62, 0.04, 0.42, 0.03, M.dark, 0, 0, 0.21);
  box(lid, 0.56, 0.01, 0.36, M.grey, 0, 0.04, 0.21);
  lid.position.set(-0.1, 0.94, -0.19);
  lid.rotation.x = toRad(-105);
  g.add(lid);
  [0.32, 0.38, 0.44].forEach(function (x, i) { box(g, 0.02, 0.012, 0.3 - i * 0.04, M.steel, x, 0.87, 0.02); });
  g.position.set(1.0, 0, 1.9);
  g.rotation.y = toRad(-8);
  scene.add(g);
}

function buildScrub(scene) {
  var g = new THREE.Group();
  box(g, 0.55, 0.86, 1.0, M.steel, 0, 0, 0);
  box(g, 0.02, 0.6, 0.45, M.grey, 0.28, 0.1, -0.24);
  box(g, 0.02, 0.6, 0.45, M.grey, 0.28, 0.1, 0.24);
  box(g, 0.4, 0.02, 0.6, M.dark, 0.02, 0.855, 0);
  var curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.22, 0.86, 0), new THREE.Vector3(-0.22, 1.18, 0),
    new THREE.Vector3(-0.12, 1.24, 0), new THREE.Vector3(0.0, 1.1, 0)
  ]);
  g.add(shade(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.018, 10), M.steel)));
  g.position.set(-ROOM.w / 2 + 0.3, 0, 1.4);
  scene.add(g);
}

/* ----- Main ----- */
export function init(root) {
  var stage = root.querySelector("[data-or3d-stage]");
  var canvas = stage.querySelector("canvas");
  var pinsHost = stage.querySelector("[data-or3d-pins]");
  var card = root.querySelector("[data-or3d-card]");
  var cardContent = card.querySelector("[data-or3d-content]");
  var indexHost = root.querySelector("[data-or3d-index]");
  var resetBtn = root.querySelector("[data-or3d-reset]");
  var hint = root.querySelector("[data-or3d-hint]");

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  var scene = new THREE.Scene();
  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xc9d4de, 0.9));
  var sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(5, 9, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -6; sun.shadow.camera.right = 6;
  sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -6;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 25;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 4;
  scene.add(sun);

  var loader = new THREE.TextureLoader();
  var tex = {
    floor: floorTexture(),
    ct: ctTexture(loader),
    endo: endoTexture(loader),
    altician: coverTexture(loader, A + "products/altician/gallery-2.jpg", 0.74 / 0.44),
    instruments: coverTexture(loader, A + "or-whiteboard/instrument-case-web.jpg", 0.56 / 0.36),
    console: consoleTexture()
  };
  tex.instruments.colorSpace = THREE.SRGBColorSpace;

  var walls = buildRoom(scene, tex);
  buildTable(scene);
  buildCArm(scene);
  buildLight(scene);
  buildEndoscope(scene, tex);
  buildRF(scene, tex);
  buildCabinet(scene);
  buildWorkstation(scene, tex);
  buildInstrumentTable(scene, tex);
  buildScrub(scene);

  var camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 100);
  var controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 2.2;
  controls.maxDistance = 18;
  controls.minPolarAngle = 0.28;
  controls.maxPolarAngle = 1.36;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.7;

  // Let the page scroll normally; zoom only with pinch or Ctrl/⌘ + scroll.
  stage.addEventListener("wheel", function (e) {
    if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
    else e.preventDefault();
  }, { capture: true, passive: false });

  /* ----- Camera placement in spherical terms ----- */
  var sph = new THREE.Spherical();
  function viewToPos(target, view, out) {
    sph.set(view[0], toRad(view[2]), toRad(view[1]));
    return (out || new THREE.Vector3()).setFromSpherical(sph).add(target);
  }
  function stationTarget(s) {
    return new THREE.Vector3(s.anchor[0], s.anchor[1] - 0.55, s.anchor[2]);
  }

  var defaultTarget = new THREE.Vector3().fromArray(DEFAULT_VIEW.target);
  var start = REDUCED ? DEFAULT_VIEW : INTRO_VIEW;
  controls.target.fromArray(start.target);
  viewToPos(controls.target, start.view, camera.position);
  controls.update();

  var tween = null;
  function flyTo(target, view, duration) {
    var fromT = controls.target.clone();
    var off = camera.position.clone().sub(fromT);
    var from = new THREE.Spherical().setFromVector3(off);
    var to = new THREE.Spherical(view[0], toRad(view[2]), toRad(view[1]));
    // Shortest way round
    var dt = to.theta - from.theta;
    while (dt > Math.PI) dt -= Math.PI * 2;
    while (dt < -Math.PI) dt += Math.PI * 2;
    to.theta = from.theta + dt;
    if (REDUCED || duration === 0) {
      controls.target.copy(target);
      camera.position.setFromSpherical(to).add(target);
      tween = null;
      return;
    }
    controls.enableDamping = false;
    tween = { fromT: fromT, toT: target.clone(), from: from, to: to, t0: performance.now(), dur: duration || 1100, ease: easeInOut };
  }

  controls.addEventListener("start", function () {
    if (tween) { tween = null; controls.enableDamping = true; }
    if (hint && !hint.classList.contains("is-hidden")) hint.classList.add("is-hidden");
  });

  function stepTween(now) {
    if (!tween) return;
    var k = Math.min(1, (now - tween.t0) / tween.dur);
    var e = tween.ease(k);
    controls.target.lerpVectors(tween.fromT, tween.toT, e);
    sph.set(
      tween.from.radius + (tween.to.radius - tween.from.radius) * e,
      tween.from.phi + (tween.to.phi - tween.from.phi) * e,
      tween.from.theta + (tween.to.theta - tween.from.theta) * e
    );
    camera.position.setFromSpherical(sph).add(controls.target);
    if (k >= 1) { tween = null; controls.enableDamping = true; }
  }

  /* ----- Pins ----- */
  var pins = STATIONS.map(function (s, i) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "or3d-pin";
    btn.style.setProperty("--i", i);
    btn.setAttribute("aria-label", (i + 1) + ": " + s.title);
    btn.innerHTML = '<span class="or3d-pin__dot">' + (i + 1) + '</span><span class="or3d-pin__label">' + s.title + "</span>";
    btn.addEventListener("click", function () { open(i, 0); });
    pinsHost.appendChild(btn);
    return { el: btn, pos: new THREE.Vector3().fromArray(s.anchor) };
  });

  var indexBtns = STATIONS.map(function (s, i) {
    var li = document.createElement("li");
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "or3d-index__btn";
    btn.innerHTML = '<span class="or3d-index__num" aria-hidden="true">' + (i + 1) + '</span><span class="or3d-index__text"><span class="or3d-index__tag">' + s.tag + "</span>" + s.title + "</span>";
    btn.addEventListener("click", function () {
      open(i, 0);
      if (stage.getBoundingClientRect().top < 0 || stage.getBoundingClientRect().bottom > window.innerHeight) {
        stage.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "center" });
      }
    });
    li.appendChild(btn);
    indexHost.appendChild(li);
    return btn;
  });

  /* ----- Card ----- */
  var active = -1;
  var mql = window.matchMedia("(max-width: 759px)");

  function esc(t) { var d = document.createElement("div"); d.textContent = t; return d.innerHTML; }

  // Plays while scrolled into view inside the card; muted so browsers allow it to start on its own
  var videoWatcher = null;
  var videoSync = null;
  function watchCardVideo() {
    var video = cardContent.querySelector("video");
    if (!video) return;
    video.muted = true;
    if (REDUCED) return;
    var inView = false;
    function sync() {
      if (inView && !document.hidden) video.play().catch(function () {});
      else video.pause();
    }
    videoWatcher = new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      sync();
    }, { root: cardContent.closest(".or3d-card__scroll"), threshold: 0.5 });
    videoWatcher.observe(video);
    // Browsers pause muted video in a background tab; pick it back up on return
    document.addEventListener("visibilitychange", sync);
    videoSync = sync;
  }
  function stopCardVideo() {
    if (videoWatcher) { videoWatcher.disconnect(); videoWatcher = null; }
    if (videoSync) { document.removeEventListener("visibilitychange", videoSync); videoSync = null; }
    var video = cardContent.querySelector("video");
    if (video) video.pause();
  }

  function renderCard(i) {
    var s = STATIONS[i];
    var html = '<div class="or3d-card__meta"><span class="or3d-card__tag">' + esc(s.tag) + '</span><span class="or3d-card__count">' +
      String(i + 1).padStart(2, "0") + " / " + String(STATIONS.length).padStart(2, "0") + "</span></div>" +
      '<p class="or3d-card__kicker">' + esc(s.kicker) + "</p>" +
      '<h3 class="or3d-card__title" id="or3d-card-title" tabindex="-1">' + esc(s.title) + "</h3>" +
      '<p class="or3d-card__body">' + esc(s.body) + "</p>";
    if (s.products.length) {
      html += '<ul class="or3d-card__products">' + s.products.map(function (p) {
        return '<li><a href="' + p.href + '"><span>' + esc(p.name) + '</span><span aria-hidden="true" class="or3d-card__arrow">→</span></a></li>';
      }).join("") + "</ul>";
    }
    if (s.model) {
      html += '<button type="button" class="or3d-card__model" data-model-open>' +
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/></svg>' +
        "<span>" + esc(s.model.label) + "</span></button>";
    }
    if (s.images.length) {
      html += '<div class="or3d-card__media">' + s.images.map(function (im, k) {
        return '<button type="button" class="or3d-card__thumb' + (im.full ? " or3d-card__thumb--full" : "") + '" data-img="' + k + '" aria-label="View larger: ' + esc(im.alt) + '"><img src="' + im.src + '" alt="" loading="lazy"></button>';
      }).join("") + "</div>";
    }
    if (s.video) {
      html += '<video class="or3d-card__video" src="' + s.video.src + '" poster="' + s.video.poster + '" aria-label="' + esc(s.video.label) + '" muted loop playsinline controls preload="none"></video>';
    }
    stopCardVideo();
    cardContent.innerHTML = html;
    watchCardVideo();
    cardContent.querySelectorAll("[data-img]").forEach(function (b) {
      b.addEventListener("click", function () { openLightbox(s, +b.getAttribute("data-img"), b); });
    });
    var modelBtn = cardContent.querySelector("[data-model-open]");
    if (modelBtn) modelBtn.addEventListener("click", function () {
      // Only one 3D scene draws at a time
      openSpineModel(s.model.src, { trigger: modelBtn, onClose: syncRunning });
      syncRunning();
    });
  }

  function open(i, dir) {
    if (i === active) return;
    var wasOpen = active !== -1;
    var direction = dir || (wasOpen ? (i > active ? 1 : -1) : 0);
    active = i;
    renderCard(i);
    if (wasOpen && !REDUCED) {
      cardContent.animate(
        [{ opacity: 0, transform: "translateX(" + direction * 14 + "px)" }, { opacity: 1, transform: "none" }],
        { duration: 240, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }
      );
    }
    card.classList.add("is-open");
    card.setAttribute("aria-hidden", "false");
    card.inert = false;
    root.classList.add("has-active");
    pins.forEach(function (p, k) { p.el.classList.toggle("is-active", k === i); p.el.setAttribute("aria-pressed", k === i ? "true" : "false"); });
    indexBtns.forEach(function (b, k) { b.classList.toggle("is-active", k === i); b.setAttribute("aria-pressed", k === i ? "true" : "false"); });
    var b = indexBtns[i];
    if (b.parentNode && b.parentNode.parentNode.scrollWidth > b.parentNode.parentNode.clientWidth) {
      b.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "nearest", inline: "center" });
    }
    var s = STATIONS[i];
    // Pull back a little on narrower stages so the subject isn't cropped by the card
    var k = Math.min(1.6, Math.max(1.1, 1250 / size.w));
    flyTo(stationTarget(s), [s.view[0] * k, s.view[1], s.view[2]], wasOpen ? 1000 : 1150);
  }

  function close() {
    if (active === -1) return;
    var prevPin = pins[active].el;
    active = -1;
    stopCardVideo();
    card.classList.remove("is-open");
    card.setAttribute("aria-hidden", "true");
    card.inert = true;
    root.classList.remove("has-active");
    pins.forEach(function (p) { p.el.classList.remove("is-active"); p.el.setAttribute("aria-pressed", "false"); });
    indexBtns.forEach(function (b) { b.classList.remove("is-active"); b.setAttribute("aria-pressed", "false"); });
    flyTo(defaultTarget, DEFAULT_VIEW.view, 1000);
    if (card.contains(document.activeElement)) prevPin.focus();
  }

  function step(d) {
    var n = STATIONS.length;
    var next = active === -1 ? (d > 0 ? 0 : n - 1) : (active + d + n) % n;
    open(next, d);
  }

  card.querySelector("[data-or3d-close]").addEventListener("click", close);
  card.querySelector("[data-or3d-prev]").addEventListener("click", function () { step(-1); });
  card.querySelector("[data-or3d-next]").addEventListener("click", function () { step(1); });
  card.inert = true;
  if (resetBtn) resetBtn.addEventListener("click", function () {
    if (active !== -1) close();
    else flyTo(defaultTarget, DEFAULT_VIEW.view, 1000);
  });

  root.addEventListener("keydown", function (e) {
    if (lightbox.open) return;
    if (e.key === "Escape" && active !== -1) { e.preventDefault(); close(); }
    else if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && (active !== -1 || stage.contains(document.activeElement))) {
      if (e.target.closest && e.target.closest("input, textarea")) return;
      e.preventDefault();
      step(e.key === "ArrowRight" ? 1 : -1);
    }
  });

  /* ----- Lightbox ----- */
  var lightbox = root.querySelector("[data-or3d-lightbox]");
  var lbImg = lightbox.querySelector("img");
  var lbCap = lightbox.querySelector("[data-or3d-lb-caption]");
  var lbState = { s: null, k: 0, trigger: null };
  function showLb(k) {
    var im = lbState.s.images[k];
    lbState.k = k;
    lbImg.src = im.src;
    lbImg.alt = im.alt;
    lbCap.textContent = im.alt + (lbState.s.images.length > 1 ? "  ·  " + (k + 1) + " / " + lbState.s.images.length : "");
    lightbox.classList.toggle("is-single", lbState.s.images.length < 2);
  }
  function openLightbox(s, k, trigger) {
    lbState.s = s; lbState.trigger = trigger;
    showLb(k);
    lightbox.showModal();
  }
  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox || e.target.closest("[data-or3d-lb-close]")) lightbox.close();
  });
  lightbox.querySelector("[data-or3d-lb-prev]").addEventListener("click", function () {
    var n = lbState.s.images.length; showLb((lbState.k - 1 + n) % n);
  });
  lightbox.querySelector("[data-or3d-lb-next]").addEventListener("click", function () {
    var n = lbState.s.images.length; showLb((lbState.k + 1) % n);
  });
  lightbox.addEventListener("keydown", function (e) {
    if (!lbState.s || lbState.s.images.length < 2) return;
    if (e.key === "ArrowRight") { e.preventDefault(); showLb((lbState.k + 1) % lbState.s.images.length); }
    if (e.key === "ArrowLeft") { e.preventDefault(); showLb((lbState.k - 1 + lbState.s.images.length) % lbState.s.images.length); }
  });
  lightbox.addEventListener("close", function () { if (lbState.trigger) lbState.trigger.focus(); });

  /* ----- Layout / view offset so the subject sits beside the card ----- */
  var size = { w: 1, h: 1 };
  var offset = { x: 0, y: 0, tx: 0, ty: 0 };

  function resize() {
    var r = stage.getBoundingClientRect();
    size.w = Math.max(1, r.width);
    size.h = Math.max(1, r.height);
    renderer.setSize(size.w, size.h, false);
    camera.aspect = size.w / size.h;
    // Keep the room framed on narrow / tall stages
    camera.fov = camera.aspect < 1 ? 46 : camera.aspect < 1.4 ? 38 : 32;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  function updateOffsetTarget() {
    if (active === -1) { offset.tx = 0; offset.ty = 0; return; }
    if (mql.matches) { offset.tx = 0; offset.ty = card.offsetHeight * 0.5; }
    else { offset.tx = (card.offsetWidth + 16) * 0.5; offset.ty = 0; }
  }

  /* ----- Loop ----- */
  var v = new THREE.Vector3();
  var camDir = new THREE.Vector3();
  var running = false;
  var last = performance.now();

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    stepTween(now);
    controls.update();

    updateOffsetTarget();
    var kOff = REDUCED ? 1 : 1 - Math.exp(-dt * 7);
    offset.x += (offset.tx - offset.x) * kOff;
    offset.y += (offset.ty - offset.y) * kOff;
    camera.setViewOffset(size.w, size.h, offset.x, offset.y, size.w, size.h);

    // Dollhouse walls: fade any wall standing between camera and room
    var kWall = REDUCED ? 1 : 1 - Math.exp(-dt * 9);
    walls.forEach(function (w) {
      camDir.copy(camera.position).sub(w.userData.point);
      var want = camDir.dot(w.userData.normal) > 0.6 ? 1 : 0;
      var f = w.userData.fade += (want - w.userData.fade) * kWall;
      w.visible = f > 0.01;
      var transparent = f < 0.995;
      Object.keys(w.userData.mats).forEach(function (key) {
        var m = w.userData.mats[key];
        m.transparent = transparent;
        m.opacity = f;
        m.depthWrite = f > 0.5;
      });
      w.traverse(function (o) { if (o.isMesh) o.castShadow = f > 0.5 && o.material !== w.userData.mats.wall; });
    });

    renderer.render(scene, camera);

    // Project pins
    for (var i = 0; i < pins.length; i++) {
      v.copy(pins[i].pos).project(camera);
      var hidden = v.z > 1 || v.z < -1;
      var x = (v.x * 0.5 + 0.5) * size.w;
      var y = (-v.y * 0.5 + 0.5) * size.h;
      pins[i].el.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
      pins[i].el.classList.toggle("is-offscreen", hidden);
    }
  }

  function setRunning(on) {
    if (on === running) return;
    running = on;
    if (on) { last = performance.now(); requestAnimationFrame(frame); }
  }

  var introDone = false;
  var inView = false;
  function syncRunning() { setRunning(inView && !document.hidden && !isSpineModelOpen()); }
  new IntersectionObserver(function (entries) {
    inView = entries[0].isIntersecting;
    syncRunning();
    if (inView && !introDone) {
      introDone = true;
      root.classList.add("is-intro");
      if (!REDUCED && active === -1 && !tween) {
        tween = { fromT: controls.target.clone(), toT: defaultTarget.clone(), from: new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target)),
          to: new THREE.Spherical(DEFAULT_VIEW.view[0], toRad(DEFAULT_VIEW.view[2]), toRad(DEFAULT_VIEW.view[1])), t0: performance.now(), dur: 1800, ease: easeOut };
        controls.enableDamping = false;
      }
    }
  }, { threshold: 0.15 }).observe(stage);
  document.addEventListener("visibilitychange", syncRunning);

  root.classList.add("is-ready");
  var api = { open: open, close: close, camera: camera, controls: controls, offset: offset };
  root.or3d = api;
  return api;
}
