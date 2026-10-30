/**
 * Global Care — "Try the virtual model" dialog
 * Shared by the 3D tour and the products page. Builds the dialog the first time it's opened,
 * then imports the viewer (and Three.js) on demand, so pages pay nothing until it's used.
 * Any page calling this needs the "three" importmap (see products.html).
 */
var MARKUP =
  '<div class="or3d-model__stage" data-model-stage>' +
    '<canvas aria-label="Interactive 3D model of the Aldaver spine surgery simulation model. Drag to rotate."></canvas>' +
    '<div class="or3d-model__status or3d-model__status--loading" role="status">' +
      '<span class="or3d__spinner" aria-hidden="true"></span>' +
      "<span>Loading model <span data-model-progress></span></span>" +
    "</div>" +
    '<div class="or3d-model__status or3d-model__status--error" role="alert">' +
      "<p>The virtual model couldn’t be loaded.</p>" +
      '<button type="button" class="btn btn--secondary btn--sm" data-model-retry>Try again</button>' +
    "</div>" +
    '<aside class="or3d-model__panel" data-model-panel>' +
      '<h3 class="or3d-model__title" id="or3d-model-title">Aldaver Spine surgery simulation model</h3>' +
      '<p class="or3d-model__hint">Drag to rotate · scroll or pinch to zoom</p>' +
      '<div class="or3d-model__views" role="group" aria-label="Model view">' +
        '<button type="button" data-model-view="outside" aria-pressed="true">Outside</button>' +
        '<button type="button" data-model-view="inside" aria-pressed="false">Inside</button>' +
      "</div>" +
      '<p class="or3d-model__label">Anatomy</p>' +
      '<ul class="or3d-model__layers" data-model-layers></ul>' +
      '<button type="button" class="or3d-model__reset" data-model-reset>Reset view</button>' +
      '<p class="or3d-model__note">Web training-model visualization — not a medical device.</p>' +
    "</aside>" +
  "</div>" +
  '<button type="button" class="or3d-lightbox__close" data-model-close aria-label="Close virtual model" autofocus>×</button>';

var dialog = null;
var viewer = null;
var current = null;

function load() {
  dialog.classList.remove("is-error");
  if (!viewer) {
    viewer = import("./spine-viewer.js").then(function (m) { return m.init(dialog); });
    viewer.catch(function () { viewer = null; });
  }
  viewer.then(function (v) { return v.open(current.src); }).catch(function (err) {
    console.error(err);
    dialog.classList.add("is-error");
  });
}

function build() {
  dialog = document.createElement("dialog");
  dialog.className = "or3d-model";
  dialog.setAttribute("aria-labelledby", "or3d-model-title");
  dialog.innerHTML = MARKUP;
  dialog.addEventListener("click", function (e) {
    if (e.target === dialog || e.target.closest("[data-model-close]")) dialog.close();
    if (e.target.closest("[data-model-retry]")) load();
  });
  dialog.addEventListener("close", function () {
    if (current.onClose) current.onClose();
    if (current.trigger) current.trigger.focus();
  });
  document.body.appendChild(dialog);
}

export function isSpineModelOpen() {
  return !!dialog && dialog.open;
}

// options: trigger (element to refocus on close), onClose
export function openSpineModel(src, options) {
  if (!dialog) build();
  current = { src: src, trigger: options && options.trigger, onClose: options && options.onClose };
  dialog.showModal();
  load();
}
