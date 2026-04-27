import { Game } from "./game.js";
import { BUILD_VERSION, initializeReleaseServices } from "./platform.js";

const releaseServices = initializeReleaseServices();
const loadingScreen = document.getElementById("loading-screen");
const loadingFill = document.getElementById("loading-bar-fill");
const loadingStatus = document.getElementById("loading-status");
const versionText = document.getElementById("build-version");

const canvas = document.getElementById("game");
const hud = document.getElementById("hud");
const overlay = document.getElementById("overlay");
const fullscreenButton = document.getElementById("fullscreen-button");
const touchControls = document.getElementById("touch-controls");

function setLoading(progress, status) {
  if (loadingFill) loadingFill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
  if (loadingStatus) loadingStatus.textContent = status;
}

function finishLoading() {
  setLoading(100, "Ready");
  window.setTimeout(() => loadingScreen?.classList.add("hidden"), 250);
}

setLoading(18, "Preparing release services...");
if (versionText) versionText.textContent = `Build ${BUILD_VERSION}`;

const game = new Game(canvas, hud, overlay);
game.release = releaseServices;
setLoading(62, "Loading fighters, stages, and UI...");
game.start();
finishLoading();

function updateFullscreenLabel() {
  if (!fullscreenButton) return;
  fullscreenButton.textContent = document.fullscreenElement ? "Exit Fullscreen" : "Fullscreen";
}

fullscreenButton?.addEventListener("click", async () => {
  const shell = document.getElementById("game-shell");
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await shell?.requestFullscreen?.();
  } catch {
    // Fullscreen can be unavailable in embedded browsers; the game still runs normally.
  }
  updateFullscreenLabel();
});

document.addEventListener("fullscreenchange", updateFullscreenLabel);

function bindTouchControls() {
  if (!touchControls || !game.input?.setVirtualButton) return;
  const activeAxes = new Map();
  const activeTouchButtons = new Map();
  const refreshAxis = () => {
    let x = 0;
    let y = 0;
    for (const value of activeAxes.values()) {
      x += value.x;
      y += value.y;
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    game.input.setVirtualAxis("p1", x, y);
  };

  const pressButton = (button, pointerId) => {
    const action = button.dataset.touchAction;
    const axis = button.dataset.touchAxis;
    const player = button.dataset.touchPlayer || "p1";
    if (action) game.input.setVirtualButton(player, action, true);
    if (axis) {
      const [x, y] = axis.split(",").map(Number);
      activeAxes.set(pointerId, { x, y });
      refreshAxis();
    }
    button.classList.add("pressed");
  };

  const clearButton = (button, pointerId) => {
    const action = button.dataset.touchAction;
    const axis = button.dataset.touchAxis;
    const player = button.dataset.touchPlayer || "p1";
    if (action) game.input.setVirtualButton(player, action, false);
    if (axis) activeAxes.delete(pointerId);
    refreshAxis();
    button.classList.remove("pressed");
  };

  touchControls.querySelectorAll("button").forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      pressButton(button, event.pointerId);
    });
    button.addEventListener("pointerup", (event) => clearButton(button, event.pointerId));
    button.addEventListener("pointercancel", (event) => clearButton(button, event.pointerId));
    button.addEventListener("lostpointercapture", (event) => clearButton(button, event.pointerId));
    button.addEventListener("touchstart", (event) => {
      event.preventDefault();
      if (window.PointerEvent) return;
      for (const touch of event.changedTouches) {
        activeTouchButtons.set(touch.identifier, button);
        pressButton(button, touch.identifier);
      }
    }, { passive: false });
    button.addEventListener("touchend", (event) => {
      event.preventDefault();
      if (window.PointerEvent) return;
      for (const touch of event.changedTouches) {
        const activeButton = activeTouchButtons.get(touch.identifier) || button;
        clearButton(activeButton, touch.identifier);
        activeTouchButtons.delete(touch.identifier);
      }
    }, { passive: false });
    button.addEventListener("touchcancel", (event) => {
      event.preventDefault();
      if (window.PointerEvent) return;
      for (const touch of event.changedTouches) {
        const activeButton = activeTouchButtons.get(touch.identifier) || button;
        clearButton(activeButton, touch.identifier);
        activeTouchButtons.delete(touch.identifier);
      }
    }, { passive: false });
  });
}

bindTouchControls();

document.addEventListener("touchmove", (event) => {
  if (game.mode === "play") event.preventDefault();
}, { passive: false });

window.neonFists = game;
window.neonFistsRelease = releaseServices;
