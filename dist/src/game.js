import { AudioManager } from "./audio.js";
import { Boss, Enemy } from "./enemy.js";
import { HAZARD_INFO, LEVELS, Level, ParticleSystem } from "./level.js";
import { MonetizationSuite } from "./monetization.js";
import { FIGHTERS, Player } from "./player.js";
import { DIFFICULTIES, Progression, applyUpgradeToPlayer, ensurePlayerUpgrades } from "./progression.js";
import { PixelSpriteRenderer } from "./sprites.js";
import { bestCombo, stageScore } from "./stats.js";
import { PixelTileRenderer } from "./tiles.js";
import { UI } from "./ui.js";
import { WaveManager } from "./waves.js";
import { WEAPONS, WEAPON_IDS } from "./weapons.js";

const TUTORIAL_STEPS = [
  {
    id: "move",
    title: "Move",
    text: "WASD, arrow keys, gamepad, or the left touch D-pad moves on the street plane."
  },
  {
    id: "attack",
    title: "Punch / Kick",
    text: "Use J / K or PUNCH / KICK to start a combo. Punch three times for a finisher."
  },
  {
    id: "weapon",
    title: "Grab Weapon",
    text: "Walk over the glowing pipe. Press E or PICKUP to swap weapons later."
  },
  {
    id: "special",
    title: "Use Special",
    text: "When SUPER READY flashes, press U or SUPER for a crowd-clearing attack."
  },
  {
    id: "revive",
    title: "Revive Partner",
    text: "In co-op, stand near a downed partner and hold PICKUP or BLOCK to revive.",
    coopOnly: true,
    autoCompleteAfter: 5
  }
];

class Input {
  constructor() {
    this.keys = new Set();
    this.prev = new Set();
    this.justPressed = new Set();
    this.axisX = 0;
    this.axisY = 0;
    this.axes = {
      p1: { x: 0, y: 0 },
      p2: { x: 0, y: 0 }
    };
    this.virtualButtons = {
      p1: new Set(),
      p2: new Set(),
      system: new Set()
    };
    this.virtualPressed = {
      p1: new Set(),
      p2: new Set(),
      system: new Set()
    };
    this.virtualAxes = {
      p1: { x: 0, y: 0 },
      p2: { x: 0, y: 0 }
    };
    this.maps = {
      p1: {
        punch: ["KeyJ", "Pad0_0"],
        kick: ["KeyK", "Pad0_1"],
        jump: ["KeyL", "Pad0_2"],
        block: ["KeyI", "Pad0_4"],
        special: ["KeyU", "Pad0_3"],
        dash: ["ShiftLeft", "ShiftRight", "Pad0_5"],
        pickup: ["KeyE", "Pad0_6"]
      },
      p2: {
        punch: ["Numpad1", "Numpad7", "Digit1", "Digit7", "Pad1_0"],
        kick: ["Numpad2", "Numpad8", "Digit2", "Digit8", "Pad1_1"],
        jump: ["Numpad3", "Numpad9", "Digit3", "Digit9", "Pad1_2"],
        block: ["Numpad4", "Digit4", "Pad1_4"],
        special: ["Numpad5", "Digit5", "Pad1_3"],
        dash: ["Numpad0", "Digit0", "ControlRight", "Pad1_5"],
        pickup: ["Numpad6", "NumpadAdd", "Digit6", "Equal", "Pad1_6"]
      },
      system: {
        pause: ["Enter", "Escape", "Start", "Pad0_9", "Pad1_9"],
        debug: ["F3"]
      }
    };
    window.addEventListener("keydown", (e) => {
      if (!this.keys.has(e.code)) this.justPressed.add(e.code);
      this.keys.add(e.code);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
  }

  update() {
    this.prev = new Set(this.keys);
    this.justPressed.clear();
    this.readAxes();
  }

  endFrame() {
    this.prev = new Set(this.keys);
    this.justPressed.clear();
    this.virtualPressed.p1.clear();
    this.virtualPressed.p2.clear();
    this.virtualPressed.system.clear();
  }

  readAxes() {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 0, y: 0 };
    if (this.keys.has("KeyA")) p1.x -= 1;
    if (this.keys.has("KeyD")) p1.x += 1;
    if (this.keys.has("KeyW")) p1.y -= 1;
    if (this.keys.has("KeyS")) p1.y += 1;
    if (this.keys.has("ArrowLeft")) p2.x -= 1;
    if (this.keys.has("ArrowRight")) p2.x += 1;
    if (this.keys.has("ArrowUp")) p2.y -= 1;
    if (this.keys.has("ArrowDown")) p2.y += 1;
    p1.x += this.virtualAxes.p1.x;
    p1.y += this.virtualAxes.p1.y;
    p2.x += this.virtualAxes.p2.x;
    p2.y += this.virtualAxes.p2.y;
    const pads = navigator.getGamepads?.() || [];
    for (let padIndex = 0; padIndex < 2; padIndex++) {
      const pad = pads[padIndex];
      if (!pad) continue;
      const target = padIndex === 0 ? p1 : p2;
      if (Math.abs(pad.axes[0]) > 0.2) target.x = pad.axes[0];
      if (Math.abs(pad.axes[1]) > 0.2) target.y = pad.axes[1];
      pad.buttons.forEach((b, i) => {
        const code = `Pad${padIndex}_${i}`;
        if (b.pressed) {
          if (!this.keys.has(code)) this.justPressed.add(code);
          this.keys.add(code);
        }
        else this.keys.delete(code);
      });
    }
    this.axes.p1 = this.normalizeAxis(p1);
    this.axes.p2 = this.normalizeAxis(p2);
    this.axisX = this.axes.p1.x;
    this.axisY = this.axes.p1.y;
  }

  normalizeAxis(axis) {
    const len = Math.hypot(axis.x, axis.y);
    return len > 1 ? { x: axis.x / len, y: axis.y / len } : axis;
  }

  down(action, playerId = "p1") {
    const map = this.maps[playerId]?.[action] || this.maps.system[action] || [];
    const virtual = this.virtualButtons[playerId]?.has(action) || this.virtualButtons.system.has(action);
    return virtual || map.some((k) => this.keys.has(k));
  }

  pressed(action, playerId = "p1") {
    const map = this.maps[playerId]?.[action] || this.maps.system[action] || [];
    const virtual = this.virtualPressed[playerId]?.has(action) || this.virtualPressed.system.has(action);
    return virtual || map.some((k) => this.justPressed.has(k) || (this.keys.has(k) && !this.prev.has(k)));
  }

  setVirtualButton(playerId, action, active) {
    const bucket = this.virtualButtons[playerId] || this.virtualButtons.system;
    const pressed = this.virtualPressed[playerId] || this.virtualPressed.system;
    if (active) {
      if (!bucket.has(action)) pressed.add(action);
      bucket.add(action);
    } else {
      bucket.delete(action);
    }
  }

  setVirtualAxis(playerId, x, y) {
    if (!this.virtualAxes[playerId]) return;
    this.virtualAxes[playerId] = this.normalizeAxis({ x, y });
  }

  controller(playerId) {
    const input = this;
    return {
      get axisX() { return input.axes[playerId]?.x || 0; },
      get axisY() { return input.axes[playerId]?.y || 0; },
      down(action) { return input.down(action, playerId); },
      pressed(action) { return input.pressed(action, playerId); }
    };
  }
}

class Renderer {
  constructor(canvas) {
    this.displayCanvas = canvas;
    this.displayCtx = canvas.getContext("2d");
    this.displayCtx.imageSmoothingEnabled = false;
    this.canvas = document.createElement("canvas");
    this.canvas.width = 384;
    this.canvas.height = 216;
    this.world = { width: 1120, height: 630 };
    this.pixelScale = this.canvas.width / this.world.width;
    this.ctx = this.canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.sprites = new PixelSpriteRenderer();
    this.tiles = new PixelTileRenderer();
  }

  render(game) {
    const ctx = this.ctx;
    const shakeX = (Math.random() - 0.5) * game.shake * 12;
    const shakeY = (Math.random() - 0.5) * game.shake * 8;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.save();
    ctx.scale(this.pixelScale, this.pixelScale);
    ctx.translate(shakeX, shakeY);
    this.drawBackground(game);
    ctx.translate(-game.level.cameraX, 0);
    this.drawObjects(game);
    this.drawHazards(game);
    this.drawTrails(game);
    const actors = [...game.enemies, ...(game.players || [game.player])].filter(Boolean).sort((a, b) => a.depth() - b.depth());
    actors.forEach((actor) => this.drawActor(actor));
    this.drawPickups(game);
    this.drawParticles(game);
    this.drawForeground(game);
    this.drawPopups(game);
    ctx.restore();
    this.drawScreenOverlay(game);
    this.drawDebugOverlay(game);
    this.displayCtx.imageSmoothingEnabled = false;
    this.displayCtx.clearRect(0, 0, this.displayCanvas.width, this.displayCanvas.height);
    this.displayCtx.drawImage(this.canvas, 0, 0, this.displayCanvas.width, this.displayCanvas.height);
  }

  drawHazards(game) {
    const ctx = this.ctx;
    for (const h of game.level.hazards || []) {
      const info = HAZARD_INFO[h.type] || HAZARD_INFO.electric;
      const pulse = 0.45 + Math.sin(game.time * 12 + h.x) * 0.25;
      ctx.save();
      ctx.globalCompositeOperation = h.active ? "lighter" : "source-over";
      ctx.globalAlpha = h.active ? 0.8 : 0.34 + pulse * 0.22;
      ctx.fillStyle = h.active ? info.color : "rgba(255,255,255,0.22)";
      if (h.type === "steam") {
        ctx.fillRect(h.x - h.w / 2, h.y - h.h, h.w, h.h);
        ctx.fillStyle = info.color;
        for (let i = 0; i < 5; i++) ctx.fillRect(h.x - 32 + i * 16, h.y - h.h + i * 11, 10, h.h - i * 11);
      } else if (h.type === "laser") {
        ctx.fillRect(h.x - h.w / 2, h.y - h.h / 2, h.w, h.h);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(h.x - h.w / 2 + 10, h.y - 3, h.w - 20, 5);
      } else if (h.type === "crusher") {
        ctx.fillRect(h.x - h.w / 2, h.y - h.h, h.w, h.active ? h.h : 12);
        ctx.fillStyle = "#05070d";
        for (let i = 0; i < 6; i++) ctx.fillRect(h.x - h.w / 2 + i * 18, h.y - 10, 10, 12);
      } else if (h.type === "debris") {
        ctx.fillRect(h.x - h.w / 2, h.y - h.h, h.w, h.active ? h.h : 8);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(h.x - 16, h.y - h.h + 8, 32, 4);
      } else if (h.type === "gust") {
        for (let i = 0; i < 5; i++) ctx.fillRect(h.x - h.w / 2 + i * 28, h.y - h.h / 2 + i * 9, h.w * 0.46, 5);
      } else {
        ctx.fillRect(h.x - h.w / 2, h.y - h.h / 2, h.w, h.h);
        ctx.fillStyle = "#ffffff";
        if (h.active) ctx.fillRect(h.x - 18, h.y - 4, 36, 8);
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = info.color;
      ctx.lineWidth = h.active ? 4 : 2;
      ctx.strokeRect(h.x - h.w / 2, h.y - h.h / 2, h.w, h.h);
      ctx.restore();
    }
  }

  drawBackground(game) {
    const ctx = this.ctx;
    const canvas = this.world;
    const l = game.level;
    const [sky, far, mid, neon, accent] = l.palette;
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let layer = 0; layer < 3; layer++) {
      const speed = [0.18, 0.35, 0.55][layer];
      const baseY = [118, 188, 270][layer];
      ctx.fillStyle = [far, mid, "rgba(255,255,255,0.08)"][layer];
      for (let x = -160; x < canvas.width + 260; x += 150) {
        const sx = x - ((l.cameraX * speed) % 150);
        const h = 40 + ((x + layer * 71) % 90);
        ctx.fillRect(sx, baseY - h, 86, h);
        ctx.fillStyle = neon;
        ctx.fillRect(sx + 12, baseY - h + 12 + ((game.time * 20 + x) % 20), 18, 5);
        ctx.fillStyle = [far, mid, "rgba(255,255,255,0.08)"][layer];
      }
    }
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    for (let i = 0; i < 18; i++) {
      const x = (i * 83 - (l.cameraX * 0.9) % 83);
      ctx.fillRect(x, l.bounds.top - 28 + Math.sin(game.time * 2 + i) * 4, 42, 3);
    }
    this.drawStageSetPieces(game);
    this.drawStageIdentity(game);
    this.drawModernAtmosphere(game);
    const grd = ctx.createLinearGradient(0, l.bounds.top, 0, canvas.height);
    grd.addColorStop(0, "#15223f");
    grd.addColorStop(1, "#0b0d15");
    ctx.fillStyle = grd;
    ctx.fillRect(0, l.bounds.top - 8, canvas.width, canvas.height - l.bounds.top + 8);
    this.drawTileTexture(game);
    this.drawModernFloorLighting(game);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    for (let y = l.bounds.top; y < canvas.height; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y + 20);
      ctx.stroke();
    }
  }

  drawModernAtmosphere(game) {
    const ctx = this.ctx;
    const l = game.level;
    const cam = l.cameraX;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    if (l.index === 0) {
      for (let x = -120; x < this.world.width + 240; x += 180) {
        const sx = x - ((cam * 0.62) % 180);
        const glow = ctx.createRadialGradient(sx + 72, 206, 4, sx + 72, 206, 92);
        glow.addColorStop(0, "rgba(255,79,216,0.32)");
        glow.addColorStop(0.42, "rgba(55,245,255,0.12)");
        glow.addColorStop(1, "rgba(55,245,255,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(sx - 30, 122, 210, 172);
      }
      ctx.strokeStyle = "rgba(180,230,255,0.28)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 32; i++) {
        const sx = (i * 46 - (cam * 1.2 + game.time * 260) % 46);
        ctx.beginPath();
        ctx.moveTo(sx, 210 + (i % 5) * 18);
        ctx.lineTo(sx - 14, 270 + (i % 3) * 24);
        ctx.stroke();
      }
    } else if (l.index === 1) {
      for (let x = -80; x < this.world.width + 180; x += 150) {
        const sx = x - ((cam * 0.52) % 150);
        const glow = ctx.createRadialGradient(sx + 55, l.bounds.bottom + 12, 8, sx + 55, l.bounds.bottom + 12, 112);
        glow.addColorStop(0, "rgba(124,255,112,0.26)");
        glow.addColorStop(0.55, "rgba(124,255,112,0.08)");
        glow.addColorStop(1, "rgba(124,255,112,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(sx - 80, l.bounds.top - 50, 260, 210);
      }
      ctx.fillStyle = "rgba(199,208,221,0.12)";
      for (let i = 0; i < 12; i++) {
        const sx = i * 120 - ((cam * 0.88 + game.time * 70) % 120);
        ctx.fillRect(sx, l.bounds.top - 18, 36, 6 + Math.sin(game.time * 4 + i) * 4);
      }
    } else {
      const haze = ctx.createLinearGradient(0, 60, 0, l.bounds.top + 60);
      haze.addColorStop(0, "rgba(55,245,255,0.10)");
      haze.addColorStop(1, "rgba(255,79,216,0.02)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, 40, this.world.width, l.bounds.top + 40);
      for (let x = -160; x < this.world.width + 220; x += 230) {
        const sx = x - ((cam * 0.36 + game.time * 26) % 230);
        ctx.fillStyle = "rgba(255,79,216,0.22)";
        ctx.fillRect(sx, 128 + Math.sin(game.time + x) * 7, 54, 16);
        ctx.fillStyle = "rgba(55,245,255,0.24)";
        ctx.fillRect(sx + 12, 122 + Math.sin(game.time + x) * 7, 28, 5);
      }
    }
    ctx.restore();
  }

  drawModernFloorLighting(game) {
    const ctx = this.ctx;
    const l = game.level;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const sheen = ctx.createLinearGradient(0, l.bounds.top, 0, l.bounds.bottom + 80);
    sheen.addColorStop(0, "rgba(255,255,255,0.04)");
    sheen.addColorStop(0.45, l.index === 1 ? "rgba(124,255,112,0.08)" : l.index === 2 ? "rgba(55,245,255,0.08)" : "rgba(255,79,216,0.08)");
    sheen.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(l.cameraX, l.bounds.top - 4, this.world.width, l.bounds.bottom - l.bounds.top + 120);
    for (let x = l.cameraX - 80; x < l.cameraX + this.world.width + 120; x += 180) {
      const w = 90 + ((x / 20) % 3) * 18;
      ctx.fillStyle = l.index === 1 ? "rgba(124,255,112,0.16)" : "rgba(55,245,255,0.14)";
      ctx.fillRect(x, l.bounds.bottom + 18 + Math.sin(game.time * 2 + x) * 3, w, 5);
    }
    ctx.restore();
  }

  drawTileTexture(game) {
    const ctx = this.ctx;
    const l = game.level;
    const cam = l.cameraX;
    if (l.index === 0) {
      for (let y = l.bounds.top + 4; y < this.world.height; y += 32) {
        for (let x = -80; x < this.world.width + 120; x += 64) this.tiles.draw(ctx, "brick", x - ((cam * 1.03) % 64), y, 4, 0.18);
      }
      for (let x = 60; x < this.world.width + 140; x += 190) {
        const sx = x - ((cam * 0.9) % 190);
        this.tiles.draw(ctx, "puddle", sx, l.bounds.bottom - 24, 3, 0.62);
        this.tiles.draw(ctx, "vent", sx + 52, l.bounds.top - 74, 3, 0.7);
      }
      ctx.fillStyle = "rgba(255,79,216,0.16)";
      for (let y = l.bounds.top + 16; y < this.world.height; y += 24) {
        for (let x = -40; x < this.world.width + 80; x += 80) {
          const sx = x - ((cam * 1.05) % 80) + ((y / 24) % 2) * 24;
          ctx.fillRect(sx, y, 44, 3);
        }
      }
      ctx.fillStyle = "rgba(55,245,255,0.14)";
      for (let x = 30; x < this.world.width; x += 150) ctx.fillRect(x - ((cam * 0.9) % 150), l.bounds.bottom - 8, 78, 5);
      ctx.fillStyle = "rgba(255,209,92,0.13)";
      for (let y = l.bounds.top + 6; y < this.world.height; y += 18) {
        for (let x = -30; x < this.world.width + 60; x += 52) {
          if (((x + y) / 18) % 3 < 1) ctx.fillRect(x - ((cam * 1.08) % 52), y, 18, 3);
        }
      }
    } else if (l.index === 1) {
      for (let x = -80; x < this.world.width + 120; x += 70) this.tiles.draw(ctx, "pipe", x - ((cam * 0.8) % 70), l.bounds.top - 74, 4, 0.75);
      for (let y = l.bounds.top + 10; y < this.world.height; y += 36) {
        for (let x = -70; x < this.world.width + 90; x += 70) this.tiles.draw(ctx, "brick", x - ((cam * 0.72) % 70), y, 4, 0.12);
      }
      ctx.fillStyle = "rgba(124,255,112,0.15)";
      for (let y = l.bounds.top + 8; y < this.world.height; y += 20) {
        for (let x = -60; x < this.world.width + 90; x += 70) {
          ctx.fillRect(x - ((cam * 0.85) % 70), y, 44, 2);
        }
      }
      ctx.fillStyle = "rgba(124,255,112,0.28)";
      for (let x = -30; x < this.world.width + 40; x += 58) {
        const sx = x - ((cam * 1.1 + game.time * 18) % 58);
        ctx.fillRect(sx, l.bounds.bottom + 6 + Math.sin(game.time * 4 + x) * 3, 34, 4);
      }
      ctx.fillStyle = "rgba(124,255,112,0.2)";
      for (let x = -60; x < this.world.width + 80; x += 88) {
        const sx = x - ((cam * 1.04) % 88);
        ctx.fillRect(sx, l.bounds.bottom - 5, 64, 6);
        ctx.fillRect(sx + 10, l.bounds.bottom + 8 + Math.sin(game.time * 5 + x) * 2, 36, 4);
      }
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      for (let x = 50; x < this.world.width; x += 260) {
        const sx = x - ((cam * 0.35) % 260);
        ctx.fillRect(sx, l.bounds.top - 38, 18, 8);
        ctx.fillRect(sx + 15, l.bounds.top - 34, 10, 5);
      }
    } else {
      for (let x = -90; x < this.world.width + 140; x += 96) this.tiles.draw(ctx, "skyline", x - ((cam * 0.25) % 96), 86 + (x % 3) * 12, 4, 0.42);
      for (let x = 30; x < this.world.width + 100; x += 190) this.tiles.draw(ctx, "vent", x - ((cam * 1.0) % 190), l.bounds.top - 34, 3, 0.72);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      for (let x = -60; x < this.world.width + 100; x += 120) {
        const sx = x - ((cam * 0.7) % 120);
        ctx.fillRect(sx, l.bounds.top + 18, 72, 3);
        ctx.fillRect(sx + 20, l.bounds.top + 36, 48, 3);
      }
      ctx.fillStyle = "rgba(55,245,255,0.18)";
      for (let x = 25; x < this.world.width; x += 130) {
        const sx = x - ((cam * 1.05) % 130);
        ctx.fillRect(sx, l.bounds.bottom - 18, 38, 5);
      }
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      for (let x = -70; x < this.world.width + 130; x += 150) {
        const sx = x - ((cam * 0.38) % 150);
        ctx.fillRect(sx, 96 + Math.sin(game.time + x) * 6, 78, 9);
        ctx.fillRect(sx + 25, 104 + Math.sin(game.time + x) * 6, 96, 7);
      }
    }
  }

  drawStageSetPieces(game) {
    const ctx = this.ctx;
    const canvas = this.world;
    const l = game.level;
    const cam = l.cameraX;
    if (l.index === 0) {
      for (let x = -80; x < canvas.width + 180; x += 210) {
        const sx = x - ((cam * 0.72) % 210);
        ctx.fillStyle = "#10182b";
        ctx.fillRect(sx, 175, 86, 116);
        ctx.fillStyle = "rgba(55,245,255,0.28)";
        for (let wy = 190; wy < 258; wy += 22) ctx.fillRect(sx + 12, wy, 18, 8);
        ctx.fillStyle = "#ff4fd8";
        ctx.fillRect(sx + 52, 190 + Math.sin(game.time * 5 + x) * 2, 72, 18);
        ctx.fillStyle = "#0a0d18";
        ctx.fillRect(sx + 8, 276, 94, 12);
      }
      ctx.strokeStyle = "rgba(255,209,92,0.5)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(-80 + i * 230 - (cam * 0.5) % 230, 145 + i * 8);
        ctx.quadraticCurveTo(90 + i * 230 - (cam * 0.5) % 230, 174, 250 + i * 230 - (cam * 0.5) % 230, 138);
        ctx.stroke();
      }
      for (let x = -40; x < canvas.width + 160; x += 170) {
        const sx = x - ((cam * 0.78) % 170);
        ctx.fillStyle = "rgba(5,7,13,0.62)";
        ctx.fillRect(sx + 26, 203, 66, 10);
        ctx.fillRect(sx + 30, 228, 58, 8);
        ctx.strokeStyle = "rgba(199,208,221,0.42)";
        ctx.lineWidth = 3;
        for (let r = 0; r < 3; r++) {
          ctx.beginPath();
          ctx.moveTo(sx + 24, 204 + r * 24);
          ctx.lineTo(sx + 94, 204 + r * 24);
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(255,79,216,0.38)";
        ctx.fillRect(sx + 112, 246, 48, 10);
        ctx.fillStyle = "rgba(55,245,255,0.36)";
        ctx.fillRect(sx + 118, 260, 30, 6);
        ctx.fillStyle = "#060817";
        ctx.fillRect(sx + 132, 178, 24, 20);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(sx + 137, 181, 8, 7);
        ctx.fillStyle = "rgba(124,255,112,0.24)";
        ctx.fillRect(sx + 8, 286, 36, 14);
        ctx.fillRect(sx + 18, 276, 24, 10);
      }
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      for (let x = -20; x < canvas.width + 100; x += 250) {
        const sx = x - ((cam * 0.32) % 250);
        ctx.fillRect(sx, 255, 28, 58);
        ctx.fillRect(sx + 36, 242, 36, 72);
      }
    } else if (l.index === 1) {
      for (let x = -120; x < canvas.width + 180; x += 170) {
        const sx = x - ((cam * 0.65) % 170);
        ctx.fillStyle = "#193f39";
        ctx.fillRect(sx, 146, 118, 22);
        ctx.fillRect(sx + 18, 168, 18, 122);
        ctx.fillRect(sx + 78, 168, 18, 122);
        ctx.fillStyle = "#7cff70";
        ctx.fillRect(sx + 14, 168 + ((game.time * 34 + x) % 82), 6, 15);
        ctx.fillStyle = "rgba(124,255,112,0.22)";
        ctx.beginPath();
        ctx.arc(sx + 58, 278 + Math.sin(game.time * 3 + x) * 4, 12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(255,209,92,0.45)";
      for (let x = 20; x < canvas.width; x += 190) ctx.fillRect(x - ((cam * 0.9) % 190), 218, 20, 8);
      for (let x = -90; x < canvas.width + 170; x += 120) {
        const sx = x - ((cam * 0.5) % 120);
        ctx.fillStyle = "#0a1e1d";
        ctx.fillRect(sx, 205, 88, 18);
        ctx.fillStyle = "rgba(199,208,221,0.34)";
        for (let i = 0; i < 8; i++) ctx.fillRect(sx + 6 + i * 10, 209, 4, 11);
        ctx.fillStyle = "rgba(124,255,112,0.55)";
        ctx.fillRect(sx + 72, 176 + ((game.time * 24 + x) % 56), 7, 46);
      }
      for (let x = -60; x < canvas.width + 160; x += 210) {
        const sx = x - ((cam * 0.72) % 210);
        ctx.fillStyle = "#ff4055";
        ctx.fillRect(sx + 84, 184, 26, 12);
        ctx.fillStyle = Math.floor(game.time * 5 + x) % 2 ? "#ffd15c" : "#2c1d16";
        ctx.fillRect(sx + 91, 187, 12, 6);
        ctx.fillStyle = "rgba(255,255,255,0.14)";
        ctx.fillRect(sx + 18, 252, 18, 34);
        ctx.fillRect(sx + 52, 244, 16, 48);
      }
      ctx.fillStyle = "rgba(0,0,0,0.48)";
      for (let x = 30; x < canvas.width + 120; x += 260) {
        const sx = x - ((cam * 0.38 + game.time * 24) % 260);
        ctx.fillRect(sx, 304, 20, 8);
        ctx.fillRect(sx + 16, 308, 10, 5);
        ctx.fillRect(sx + 3, 312, 5, 4);
      }
    } else {
      for (let x = -140; x < canvas.width + 220; x += 260) {
        const sx = x - ((cam * 0.28) % 260);
        ctx.fillStyle = "#10182b";
        ctx.fillRect(sx, 74, 92, 192);
        ctx.fillStyle = "rgba(255,79,216,0.32)";
        for (let y = 96; y < 230; y += 26) ctx.fillRect(sx + 14, y, 14, 8);
      }
      const trainX = canvas.width - ((cam * 1.35 + game.time * 160) % (canvas.width + 360));
      ctx.fillStyle = "#18243d";
      ctx.fillRect(trainX, 248, 360, 42);
      ctx.fillStyle = "#37f5ff";
      for (let i = 0; i < 8; i++) ctx.fillRect(trainX + 24 + i * 38, 258, 20, 8);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      for (let i = 0; i < 12; i++) {
        const sx = i * 95 - ((cam * 1.1 + game.time * 70) % 95);
        ctx.beginPath();
        ctx.moveTo(sx, 170);
        ctx.lineTo(sx + 40, 166);
        ctx.stroke();
      }
      for (let x = -80; x < canvas.width + 180; x += 180) {
        const sx = x - ((cam * 0.82) % 180);
        ctx.fillStyle = "#17213a";
        ctx.fillRect(sx, 260, 74, 34);
        ctx.fillStyle = "#263a5b";
        ctx.fillRect(sx + 8, 248, 44, 14);
        ctx.fillStyle = "rgba(199,208,221,0.38)";
        ctx.fillRect(sx + 14, 252, 30, 4);
        ctx.strokeStyle = "rgba(255,255,255,0.42)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sx + 90, 248);
        ctx.lineTo(sx + 90, 190);
        ctx.lineTo(sx + 118, 216);
        ctx.stroke();
      }
      for (let x = -130; x < canvas.width + 160; x += 260) {
        const sx = x - ((cam * 0.42 + game.time * 32) % 260);
        ctx.fillStyle = "rgba(255,79,216,0.34)";
        ctx.fillRect(sx + 120, 134, 42, 14);
        ctx.fillStyle = "rgba(55,245,255,0.4)";
        ctx.fillRect(sx + 132, 128, 18, 5);
      }
    }
  }

  drawStageIdentity(game) {
    const ctx = this.ctx;
    const canvas = this.world;
    const l = game.level;
    const cam = l.cameraX;
    if (l.theme === "club") {
      for (let x = -80; x < canvas.width + 180; x += 170) {
        const sx = x - ((cam * 0.7) % 170);
        ctx.fillStyle = "rgba(255,209,92,0.4)";
        ctx.beginPath();
        ctx.moveTo(sx + 42, 160);
        ctx.lineTo(sx - 8, 304);
        ctx.lineTo(sx + 95, 304);
        ctx.fill();
        ctx.fillStyle = "#201022";
        ctx.fillRect(sx + 8, 238, 96, 22);
        ctx.fillStyle = Math.floor(game.time * 7 + x) % 2 ? "#ff4055" : "#ffd15c";
        ctx.fillRect(sx + 18, 242, 72, 8);
      }
    } else if (l.theme === "junkyard") {
      for (let x = -120; x < canvas.width + 220; x += 220) {
        const sx = x - ((cam * 0.62) % 220);
        ctx.fillStyle = "#171f20";
        ctx.fillRect(sx, 250, 150, 42);
        ctx.fillStyle = "#495543";
        for (let i = 0; i < 6; i++) ctx.fillRect(sx + 10 + i * 22, 234 - (i % 3) * 10, 18, 26 + (i % 3) * 10);
        ctx.strokeStyle = "rgba(255,139,61,0.55)";
        ctx.beginPath();
        ctx.moveTo(sx + 118, 232);
        ctx.lineTo(sx + 170, 180);
        ctx.lineTo(sx + 184, 232);
        ctx.stroke();
      }
    } else if (l.theme === "lab") {
      for (let x = -100; x < canvas.width + 160; x += 180) {
        const sx = x - ((cam * 0.72) % 180);
        ctx.fillStyle = "#102538";
        ctx.fillRect(sx, 172, 74, 118);
        ctx.fillStyle = "rgba(124,255,112,0.34)";
        ctx.fillRect(sx + 10, 184, 54, 92);
        ctx.fillStyle = "#7cff70";
        ctx.fillRect(sx + 18, 196 + Math.sin(game.time * 3 + x) * 12, 38, 18);
        ctx.strokeStyle = "rgba(255,79,216,0.48)";
        ctx.strokeRect(sx + 8, 182, 58, 96);
      }
    } else if (l.theme === "tower") {
      for (let x = -80; x < canvas.width + 160; x += 190) {
        const sx = x - ((cam * 0.55) % 190);
        ctx.fillStyle = "#130b22";
        ctx.fillRect(sx, 150, 112, 146);
        ctx.fillStyle = "rgba(255,64,85,0.36)";
        for (let y = 170; y < 270; y += 24) ctx.fillRect(sx + 18, y, 76, 7);
        ctx.fillStyle = Math.floor(game.time * 5 + x) % 2 ? "#ffd15c" : "#ff4055";
        ctx.fillRect(sx + 30, 222, 52, 18);
      }
    }
  }

  drawObjects(game) {
    const ctx = this.ctx;
    for (const o of game.level.objects) {
      if (o.dead) continue;
      const s = 1.58;
      ctx.save();
      ctx.globalAlpha = o.hitFlash > 0 ? 0.55 : 1;
      if (o.type === "barrel") {
        ctx.fillStyle = "#163b35";
        ctx.fillRect(o.x - 22 * s, o.y - 40 * s, 44 * s, 40 * s);
        ctx.fillStyle = "#7cff70";
        ctx.fillRect(o.x - 17 * s, o.y - 37 * s, 34 * s, 8 * s);
        ctx.fillRect(o.x - 15 * s, o.y - 15 * s, 30 * s, 6 * s);
        ctx.fillStyle = "rgba(124,255,112,0.35)";
        ctx.fillRect(o.x - 8 * s, o.y - 34 * s, 7 * s, 30 * s);
        ctx.fillStyle = "#0b1412";
        ctx.fillRect(o.x - 21 * s, o.y - 3 * s, 42 * s, 5 * s);
      } else if (o.type === "sign") {
        ctx.fillStyle = "#10182b";
        ctx.fillRect(o.x - 42 * s, o.y - 64 * s, 84 * s, 36 * s);
        ctx.fillStyle = "#ff4fd8";
        ctx.fillRect(o.x - 36 * s, o.y - 58 * s, 72 * s, 10 * s);
        ctx.fillStyle = "#37f5ff";
        ctx.fillRect(o.x - 25 * s, o.y - 43 * s, 50 * s, 7 * s);
        ctx.fillRect(o.x - 5 * s, o.y - 28 * s, 10 * s, 40 * s);
        ctx.fillStyle = "#ffd15c";
        ctx.fillRect(o.x + 20 * s, o.y - 52 * s, 11 * s, 5 * s);
      } else {
        ctx.fillStyle = "#6b3d25";
        ctx.fillRect(o.x - 30 * s, o.y - 42 * s, 60 * s, 40 * s);
        ctx.fillStyle = "#9a6339";
        ctx.fillRect(o.x - 25 * s, o.y - 37 * s, 50 * s, 8 * s);
        ctx.fillRect(o.x - 25 * s, o.y - 17 * s, 50 * s, 8 * s);
        ctx.strokeStyle = "#ffd15c";
        ctx.lineWidth = 3;
        ctx.strokeRect(o.x - 22 * s, o.y - 34 * s, 44 * s, 28 * s);
        ctx.beginPath();
        ctx.moveTo(o.x - 22 * s, o.y - 34 * s);
        ctx.lineTo(o.x + 22 * s, o.y - 6 * s);
        ctx.moveTo(o.x + 22 * s, o.y - 34 * s);
        ctx.lineTo(o.x - 22 * s, o.y - 6 * s);
        ctx.stroke();
        ctx.fillStyle = "#3d2014";
        ctx.fillRect(o.x - 27 * s, o.y - 2 * s, 54 * s, 5 * s);
      }
      ctx.restore();
    }
  }

  drawPickups(game) {
    const ctx = this.ctx;
    for (const p of game.level.pickups) {
      if (p.taken) continue;
      if (p.ttl != null && p.ttl < 2 && Math.floor(game.time * 8) % 2 === 0) continue;
      const bob = Math.sin(game.time * 5 + p.bob);
      const pulse = 0.65 + Math.sin(game.time * 9 + p.bob) * 0.35;
      const y = p.y - 32 + bob * 7;
      const color = p.type === "health" ? "#7cff70" : p.type === "power" ? "#ff4fd8" : p.type === "weapon" ? WEAPONS[p.weapon]?.color || "#ffd15c" : "#37f5ff";
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.34)";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 5, 42, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      if (p.inRange) {
        ctx.globalAlpha = 0.28 + pulse * 0.18;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 4, 74, 24, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.86;
        ctx.fillStyle = p.type === "weapon" ? "#ffd15c" : color;
        ctx.font = "700 18px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillText(p.type === "weapon" ? `${p.hintPlayer || ""} USE` : p.type.toUpperCase(), p.x, p.y - 86);
        ctx.textAlign = "left";
      }
      ctx.globalAlpha = 0.38 + pulse * 0.28;
      ctx.shadowColor = color;
      ctx.shadowBlur = 22;
      ctx.fillStyle = color;
      ctx.fillRect(p.x - 40, y - 40, 80, 80);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.save();
      ctx.translate(p.x, y);
      ctx.scale(1.48, 1.48);
      if (p.type === "weapon") this.drawWeaponPickup(ctx, 0, 0, p.weapon, game.time + p.bob);
      else if (p.type === "health") this.drawHealthPickup(ctx, 0, 0);
      else if (p.type === "power") this.drawPowerPickup(ctx, 0, 0, game.time + p.bob);
      else this.drawGemPickup(ctx, 0, 0, game.time + p.bob);
      ctx.restore();
      ctx.fillStyle = "#ffffff";
      const twinkle = Math.floor(game.time * 8 + p.bob) % 4;
      ctx.fillRect(p.x + 34 - twinkle * 4, y - 46 + twinkle * 6, 5, 5);
      ctx.fillRect(p.x - 44 + twinkle * 7, y + 24 - twinkle * 3, 4, 4);
      ctx.restore();
    }
  }

  drawHealthPickup(ctx, x, y) {
    ctx.fillStyle = "#05070d";
    ctx.fillRect(x - 27, y - 20, 54, 40);
    ctx.fillStyle = "#f5f0da";
    ctx.fillRect(x - 22, y - 15, 44, 30);
    ctx.fillStyle = "#b9f2cf";
    ctx.fillRect(x - 19, y - 12, 38, 5);
    ctx.fillRect(x - 19, y + 10, 38, 4);
    ctx.fillStyle = "#ffd15c";
    ctx.fillRect(x - 15, y - 23, 30, 7);
    ctx.fillStyle = "#ff4055";
    ctx.fillRect(x - 5, y - 10, 10, 20);
    ctx.fillRect(x - 15, y - 3, 30, 9);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x - 17, y - 12, 12, 4);
    ctx.fillRect(x + 9, y - 8, 7, 3);
    ctx.fillStyle = "#7cff70";
    ctx.fillRect(x + 14, y + 7, 7, 5);
    ctx.fillStyle = "#05070d";
    ctx.font = "700 8px 'Courier New', monospace";
    ctx.fillText("HP", x - 9, y + 19);
  }

  drawGemPickup(ctx, x, y, time) {
    const flicker = Math.sin(time * 7) > 0 ? "#baffff" : "#ffffff";
    ctx.fillStyle = "#05070d";
    ctx.fillRect(x - 5, y - 28, 10, 5);
    ctx.fillRect(x - 25, y - 20, 50, 35);
    ctx.fillRect(x - 15, y + 14, 30, 12);
    ctx.fillStyle = "#0b6f99";
    ctx.fillRect(x - 18, y - 16, 36, 30);
    ctx.fillStyle = "#37f5ff";
    ctx.fillRect(x - 10, y - 22, 20, 9);
    ctx.fillRect(x - 21, y - 9, 11, 14);
    ctx.fillStyle = "#1fd7ff";
    ctx.fillRect(x + 7, y - 13, 13, 22);
    ctx.fillStyle = "#07354d";
    ctx.fillRect(x - 1, y - 15, 3, 28);
    ctx.fillRect(x - 16, y + 3, 32, 3);
    ctx.fillStyle = flicker;
    ctx.fillRect(x - 4, y - 18, 8, 30);
    ctx.fillRect(x - 12, y - 5, 24, 5);
    ctx.fillRect(x + 11, y - 18, 5, 5);
  }

  drawPowerPickup(ctx, x, y, time) {
    const ring = Math.floor(time * 8) % 3;
    ctx.fillStyle = "#05070d";
    ctx.fillRect(x - 24, y - 28, 48, 52);
    ctx.fillStyle = "#3a1250";
    ctx.fillRect(x - 17, y - 19, 34, 34);
    ctx.fillStyle = "#ff4fd8";
    ctx.fillRect(x - 12, y - 14, 24, 24);
    ctx.fillStyle = "#b75cff";
    ctx.fillRect(x - 7, y - 9, 14, 14);
    ctx.fillStyle = "#ffd15c";
    ctx.fillRect(x - 4, y - 22, 8, 12);
    ctx.fillRect(x - 15, y + 10, 30, 9);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x - 4, y - 6, 8, 8);
    ctx.fillRect(x + 9, y - 1, 5, 5);
    ctx.strokeStyle = ring === 0 ? "#ff4fd8" : ring === 1 ? "#37f5ff" : "#ffd15c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y - 1, 27 + ring * 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawWeaponPickup(ctx, x, y, id, time) {
    const weapon = WEAPONS[id] || WEAPONS.pipe;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(time * 3) * 0.08);
    ctx.fillStyle = "#05070d";
    ctx.fillRect(-29, -23, 58, 46);
    ctx.fillStyle = weapon.dark;
    ctx.fillRect(-24, -18, 48, 36);
    ctx.fillStyle = weapon.color;
    if (id === "pipe") {
      ctx.fillRect(-26, -4, 52, 9);
      ctx.fillRect(13, -9, 8, 18);
      ctx.fillStyle = weapon.glow;
      ctx.fillRect(-18, -8, 30, 3);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(20, -3, 7, 3);
    } else if (id === "baton") {
      ctx.fillRect(-24, -5, 48, 10);
      ctx.fillStyle = weapon.glow;
      ctx.fillRect(-15, -12, 30, 4);
      ctx.fillRect(-15, 9, 30, 4);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(7, -15, 9, 2);
    } else if (id === "sign") {
      ctx.fillRect(-20, -17, 40, 23);
      ctx.fillStyle = "#ffd15c";
      ctx.fillRect(-13, -12, 26, 5);
      ctx.fillStyle = weapon.dark;
      ctx.fillRect(-13, -2, 26, 4);
      ctx.fillStyle = "#c7d0dd";
      ctx.fillRect(-3, 5, 7, 24);
    } else if (id === "gauntlet") {
      ctx.fillRect(-16, -17, 27, 30);
      ctx.fillStyle = weapon.glow;
      ctx.fillRect(-8, -8, 10, 12);
      ctx.fillRect(8, -12, 12, 6);
      ctx.fillRect(8, -2, 12, 6);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(12, 7, 8, 3);
    } else {
      ctx.fillRect(-23, -3, 38, 8);
      ctx.fillRect(6, -20, 19, 28);
      ctx.fillStyle = weapon.glow;
      ctx.fillRect(10, -15, 10, 7);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(20, 6, 7, 3);
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-25, -21, 7, 3);
    ctx.restore();
  }

  drawParticles(game) {
    const ctx = this.ctx;
    for (const p of game.particles.items) {
      ctx.globalAlpha = 1 - p.age / p.life;
      ctx.fillStyle = p.color;
      if (p.shape === "ring") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + p.age * 42, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.shape === "star") {
        const s = p.size + p.age * 18;
        ctx.fillRect(p.x - s, p.y - 1, s * 2, 2);
        ctx.fillRect(p.x - 1, p.y - s, 2, s * 2);
        ctx.fillRect(p.x - s * 0.55, p.y - s * 0.55, s, 2);
      } else if (p.shape === "line") {
        ctx.fillRect(p.x, p.y, p.size * 3, Math.max(1, p.size * 0.45));
      } else {
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  drawPopups(game) {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "800 26px 'Courier New', monospace";
    for (const p of game.popups) {
      const t = p.age / p.life;
      const y = p.y - t * 48;
      const scale = 1 + (1 - t) * p.pop;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.translate(p.x, y);
      ctx.scale(scale, scale);
      ctx.fillStyle = "#05070d";
      ctx.fillText(p.text, 2, 2);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, 0, 0);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-p.text.length * 7, 17, p.text.length * 14, 3);
      ctx.restore();
    }
    ctx.restore();
  }

  drawForeground(game) {
    const ctx = this.ctx;
    const canvas = this.world;
    const l = game.level;
    const cam = l.cameraX;
    ctx.save();
    ctx.globalAlpha = 0.78;
    if (l.index === 0) {
      ctx.strokeStyle = "rgba(55,245,255,0.2)";
      for (let x = -120; x < canvas.width + 220; x += 180) {
        const sx = x + cam - ((cam * 1.15) % 180);
        ctx.beginPath();
        ctx.moveTo(sx, l.bounds.bottom + 18);
        ctx.lineTo(sx + 86, l.bounds.bottom + 9);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,79,216,0.18)";
      for (let x = 0; x < l.length; x += 260) ctx.fillRect(x - 38, l.bounds.bottom + 22, 116, 4);
      for (let x = 120; x < l.length; x += 310) {
        ctx.fillStyle = "rgba(5,7,13,0.72)";
        ctx.fillRect(x - 38, l.bounds.bottom + 16, 52, 18);
        ctx.fillRect(x + 18, l.bounds.bottom + 10, 34, 22);
        ctx.fillStyle = "rgba(124,255,112,0.28)";
        ctx.fillRect(x - 26, l.bounds.bottom + 8, 22, 8);
      }
    } else if (l.index === 1) {
      ctx.fillStyle = "rgba(124,255,112,0.22)";
      for (let x = 80; x < l.length; x += 210) {
        const drip = (game.time * 42 + x) % 46;
        ctx.fillRect(x, l.bounds.top - 18 + drip, 5, 12);
      }
      ctx.fillStyle = "rgba(255,209,92,0.18)";
      for (let x = 30; x < l.length; x += 320) ctx.fillRect(x, l.bounds.top - 42, 38, 8);
      ctx.fillStyle = "rgba(124,255,112,0.2)";
      for (let x = -40; x < l.length; x += 180) {
        ctx.fillRect(x, l.bounds.bottom + 10 + Math.sin(game.time * 4 + x) * 3, 96, 7);
        ctx.fillRect(x + 30, l.bounds.bottom + 23, 44, 4);
      }
      ctx.fillStyle = "rgba(199,208,221,0.18)";
      for (let x = 80; x < l.length; x += 270) {
        ctx.fillRect(x, l.bounds.top - 12, 12, 64);
        ctx.fillRect(x - 14, l.bounds.top + 2, 40, 8);
      }
    } else {
      ctx.strokeStyle = "rgba(255,255,255,0.24)";
      for (let i = 0; i < 10; i++) {
        const sx = cam + i * 120 - ((cam * 1.5 + game.time * 120) % 120);
        ctx.beginPath();
        ctx.moveTo(sx, l.bounds.top - 22);
        ctx.lineTo(sx + 64, l.bounds.top - 30);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(55,245,255,0.16)";
      ctx.fillRect(cam, l.bounds.bottom + 6, canvas.width, 4);
      ctx.fillStyle = "rgba(5,7,13,0.6)";
      for (let x = 50; x < l.length; x += 240) {
        ctx.fillRect(x, l.bounds.bottom + 10, 120, 12);
        ctx.fillRect(x + 16, l.bounds.bottom - 12, 52, 10);
      }
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      for (let x = 30; x < l.length; x += 210) ctx.fillRect(x, l.bounds.top - 36, 74, 3);
    }
    ctx.restore();
  }

  drawTrails(game) {
    const ctx = this.ctx;
    for (const t of game.trails) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t.age / t.life) * 0.78;
      ctx.translate(t.x, t.y);
      ctx.scale(t.facing, 1);
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = t.kind === "special" || t.kind === "weaponSwing" ? 18 : 10;
      if (t.kind === "enemySlash") {
        ctx.fillRect(10, -t.h + 32, t.reach, 9);
        ctx.fillRect(24, -t.h + 22, t.reach * 0.72, 5);
      } else if (t.kind === "slam") {
        ctx.fillRect(10, -12, t.reach, 14);
        ctx.fillRect(18, -28, t.reach * 0.62, 10);
      } else if (t.kind === "finisher") {
        ctx.fillRect(4, -t.h + 26, t.reach, 20);
        ctx.fillRect(18, -t.h + 45, t.reach * 0.78, 11);
        ctx.fillRect(34, -t.h + 17, t.reach * 0.5, 7);
      } else if (t.kind === "superRush") {
        ctx.fillStyle = t.altColor || t.color;
        ctx.fillRect(-12, -t.h + 18, t.reach * 0.92, 22);
        ctx.fillStyle = t.color;
        ctx.fillRect(18, -t.h + 38, t.reach, 12);
        ctx.fillRect(36, -t.h + 8, t.reach * 0.58, 7);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(22, -t.h + 46, 74, -1.25, 0.95);
        ctx.stroke();
      } else if (t.kind === "slamSuper") {
        ctx.fillStyle = "#ffd15c";
        ctx.fillRect(4, -t.h + 22, t.reach * 0.68, 18);
        ctx.fillStyle = t.color;
        ctx.fillRect(24, -t.h + 44, t.reach * 0.92, 15);
        ctx.fillStyle = "rgba(255,255,255,0.82)";
        ctx.fillRect(16, -5, t.reach * 0.85, 5);
        ctx.fillRect(42, 8, t.reach * 0.44, 4);
        ctx.fillRect(72, -16, t.reach * 0.32, 3);
      } else if (t.kind === "coopSuper") {
        ctx.fillStyle = "#37f5ff";
        ctx.fillRect(-10, -t.h + 20, t.reach, 18);
        ctx.fillStyle = "#ff4fd8";
        ctx.fillRect(8, -t.h + 48, t.reach * 0.86, 14);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(30, -t.h + 34, t.reach * 0.76, 9);
        ctx.strokeStyle = "#ffd15c";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(28, -t.h + 55, 92, -1.2, 1.08);
        ctx.stroke();
      } else if (t.kind === "weaponSwing") {
        const weapon = WEAPONS[t.weapon] || WEAPONS.pipe;
        ctx.fillStyle = weapon.color;
        ctx.fillRect(8, -t.h + (t.heavy ? 8 : 26), t.reach, t.heavy ? 24 : 17);
        ctx.fillStyle = weapon.glow;
        ctx.fillRect(25, -t.h + (t.heavy ? -2 : 18), t.reach * 0.72, 8);
        ctx.strokeStyle = weapon.glow;
        ctx.lineWidth = t.heavy ? 7 : 5;
        ctx.beginPath();
        ctx.arc(22, -t.h + 54, t.heavy ? 78 : 62, -1.15, 0.42);
        ctx.stroke();
        if (t.weapon === "pipe") {
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.fillRect(18, -t.h + (t.heavy ? 22 : 36), t.reach * 0.75, 3);
        }
        if (t.weapon === "baton" || t.weapon === "gauntlet") {
          ctx.fillRect(12, -t.h + 50, t.reach * 0.88, 7);
          ctx.fillRect(42, -t.h + 10, t.reach * 0.45, 5);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(34, -t.h + 27, t.reach * 0.42, 4);
        }
        if (t.weapon === "sign" || t.weapon === "wrench") {
          ctx.fillRect(48, -t.h + (t.heavy ? 38 : 47), t.reach * 0.55, 15);
        }
        if (t.weapon === "sign") {
          ctx.fillStyle = "rgba(255,209,92,0.85)";
          ctx.fillRect(58, -t.h + 23, t.reach * 0.4, 8);
        }
        if (t.weapon === "wrench" && t.heavy) {
          ctx.fillStyle = "rgba(255,255,255,0.75)";
          ctx.fillRect(28, -4, t.reach * 0.58, 5);
          ctx.fillRect(52, 8, t.reach * 0.34, 4);
        }
      } else {
        ctx.fillRect(4, -t.h + 31, t.reach, 15);
      }
      if (t.kind === "kick" || t.kind === "dash" || t.kind === "launcher") ctx.fillRect(10, -t.h + 58, t.reach + 24, 14);
      if (t.kind === "jump" || t.kind === "sky") ctx.fillRect(12, -t.h + 54, t.reach + 18, 13);
      if (t.kind === "special") {
        ctx.strokeStyle = t.color;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(10, -42, 78, -1.35, 1.35);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(18, -42, 52, -1.15, 1.15);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawScreenOverlay(game) {
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    if (game.transitionWipeTimer > 0) {
      const p = Math.min(1, game.transitionWipeTimer / 0.9);
      ctx.fillStyle = "#05070d";
      for (let y = 0; y < height; y += 12) {
        const rowOffset = ((y / 12) % 2) * 22;
        ctx.fillRect(width * (1 - p) - rowOffset, y, width * p + rowOffset, 10);
      }
      ctx.fillStyle = "rgba(55, 245, 255, 0.28)";
      ctx.fillRect(width * (1 - p) - 8, 0, 8, height);
    }
    if (game.screenFlash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.45, game.screenFlash)})`;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    for (let y = 0; y < height; y += 2) ctx.fillRect(0, y, width, 1);
    ctx.fillStyle = "rgba(55, 245, 255, 0.028)";
    ctx.fillRect(0, 0, width, height);
  }

  drawDebugOverlay(game) {
    if (!game.debug) return;
    const ctx = this.ctx;
    const living = game.enemies.filter((enemy) => enemy.health > 0).length;
    const wave = game.waveManager?.currentLabel?.() || "none";
    ctx.save();
    ctx.fillStyle = "rgba(5, 7, 13, 0.78)";
    ctx.fillRect(6, 6, 142, 64);
    ctx.strokeStyle = "#37f5ff";
    ctx.strokeRect(6.5, 6.5, 142, 64);
    ctx.font = "7px monospace";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`FPS ${game.fps || 0}`, 12, 18);
    ctx.fillText(`MODE ${game.mode}`, 12, 29);
    ctx.fillText(`ENT ${living + game.players.length}  P ${game.particles.items.length}`, 12, 40);
    ctx.fillText(`STAGE ${game.stageIndex + 1}/${LEVELS.length}`, 12, 51);
    ctx.fillText(`WAVE ${wave.slice(0, 18)}`, 12, 62);
    ctx.restore();
  }

  frameFor(a) {
    const state = a.state || "idle";
    const sets = {
      idle: [{ d: 0.28, y: 0 }, { d: 0.28, y: -1 }, { d: 0.28, y: 0 }, { d: 0.28, y: 1 }],
      walk: [{ d: 0.12, leg: 8, arm: -5 }, { d: 0.12, leg: 0, arm: 0 }, { d: 0.12, leg: -8, arm: 5 }, { d: 0.12, leg: 0, arm: 0 }],
      run: [{ d: 0.08, leg: 13, arm: -8, lean: 3 }, { d: 0.08, leg: -13, arm: 8, lean: 5 }],
      dash: [{ d: 0.05, lean: 12, leg: 18, arm: 12 }, { d: 0.08, lean: 15, leg: 10, arm: 18 }],
      punch1: [{ d: 0.06, arm: 8 }, { d: 0.08, arm: 24, lean: 4 }, { d: 0.1, arm: 12 }],
      punch2: [{ d: 0.05, armBack: 8 }, { d: 0.08, arm: 30, lean: 5, high: -5 }, { d: 0.1, arm: 10 }],
      punch3: [{ d: 0.07, armBack: 14, lean: -2 }, { d: 0.09, arm: 42, lean: 8, squash: 1.08 }, { d: 0.14, arm: 18 }],
      kick: [{ d: 0.08, leg: 6 }, { d: 0.1, kick: 34, lean: -4 }, { d: 0.12, kick: 10 }],
      jump: [{ d: 0.18, leg: -8, y: -2 }, { d: 0.18, leg: 4, y: -1 }],
      jumpAttack: [{ d: 0.08, leg: -8, armBack: 8, y: -4 }, { d: 0.12, kick: 30, lean: 8, y: -2 }, { d: 0.08, leg: 4, y: -1 }],
      special: [{ d: 0.08, arm: 18, aura: 1 }, { d: 0.1, arm: 34, aura: 2, squash: 1.05 }, { d: 0.12, arm: 20, aura: 3 }],
      block: [{ d: 0.2, block: 1, squash: 0.94 }],
      hit: [{ d: 0.12, lean: -8, armBack: 10, y: 3 }],
      knockdown: [{ d: 0.18, lean: -18, armBack: 16, y: 15, squash: 0.58, knock: 1 }],
      getup: [{ d: 0.14, lean: -8, y: 8, squash: 0.82 }, { d: 0.14, y: 3, squash: 0.95 }],
      victory: [{ d: 0.18, arm: 10, high: -14, y: -3 }, { d: 0.18, arm: 16, high: -18, y: -5 }],
      attack: [{ d: 0.1, armBack: 8, lean: -4 }, { d: 0.12, arm: 24, lean: 5 }],
      ko: [{ d: 0.2, knock: 1, squash: 0.55 }]
    };
    const frames = sets[state] || sets.idle;
    const total = frames.reduce((sum, f) => sum + f.d, 0);
    let t = a.animTime % total;
    for (const frame of frames) {
      if (t <= frame.d) return frame;
      t -= frame.d;
    }
    return frames[0];
  }

  rect(ctx, color, x, y, w, h) {
    const grid = 2.5;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x / grid) * grid, Math.round(y / grid) * grid, Math.max(grid, Math.round(w / grid) * grid), Math.max(grid, Math.round(h / grid) * grid));
  }

  pixelRect(ctx, color, x, y, w, h) {
    const s = 4;
    this.rect(ctx, color, Math.round(x / s) * s, Math.round(y / s) * s, Math.max(s, Math.round(w / s) * s), Math.max(s, Math.round(h / s) * s));
  }

  drawActorGlow(ctx, a, sy, isPlayer) {
    const color = isPlayer ? a.fighter.colors.trim : a.maxHealth > 120 ? "#ff4055" : a.data.color;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const glow = ctx.createRadialGradient(a.x, sy - a.h * 0.48, 8, a.x, sy - a.h * 0.48, a.maxHealth > 120 ? 118 : 82);
    glow.addColorStop(0, `${color}55`);
    glow.addColorStop(0.45, `${color}1f`);
    glow.addColorStop(1, `${color}00`);
    ctx.fillStyle = glow;
    ctx.fillRect(a.x - 130, sy - a.h - 40, 260, a.h + 95);
    ctx.restore();
  }

  drawModernActorAccents(ctx, a, sy, isPlayer) {
    if (a.health <= 0) return;
    const accent = isPlayer ? a.fighter.colors.trim : a.maxHealth > 120 ? "#ffdf6e" : a.data.trim;
    const suit = isPlayer ? a.fighter.colors.suit : a.data.color;
    const torsoY = sy - a.h * 0.66;
    const headY = sy - a.h * 0.9;
    ctx.save();
    ctx.translate(a.x, 0);
    ctx.scale(a.facing, 1);
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `${accent}aa`;
    ctx.lineWidth = isPlayer ? 4 : a.maxHealth > 120 ? 6 : 3;
    ctx.beginPath();
    ctx.moveTo(-a.w * 0.22, torsoY);
    ctx.lineTo(a.w * 0.18, torsoY + a.h * 0.17);
    ctx.lineTo(a.w * 0.34, torsoY + a.h * 0.04);
    ctx.stroke();
    ctx.strokeStyle = `${suit}66`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, headY + 10, Math.max(9, a.w * 0.18), 0.15, Math.PI - 0.15);
    ctx.stroke();
    if (a.weapon || a.attackKind?.startsWith("weapon")) {
      const weapon = WEAPONS[a.weapon?.id] || WEAPONS.pipe;
      ctx.strokeStyle = `${weapon.glow}cc`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(12, sy - a.h * 0.45);
      ctx.quadraticCurveTo(48, sy - a.h * 0.72, 92, sy - a.h * 0.35);
      ctx.stroke();
    }
    if (a.state === "hit" || a.state === "hurt" || a.state === "knockdown") {
      ctx.fillStyle = "rgba(255,255,255,0.34)";
      ctx.fillRect(-a.w * 0.5, sy - a.h * 0.72, a.w, 4);
    }
    ctx.restore();
  }

  drawActor(a) {
    const ctx = this.ctx;
    const isPlayer = Boolean(a.fighter);
    const sheet = isPlayer ? a.fighter.id : a.maxHealth > 120 ? "boss" : a.type;
    const state = a.maxHealth > 120 && a.phase === 2 && (a.state === "idle" || a.state === "walk" || a.state === "attack") ? "phase2" : a.state;
    const sy = a.y - a.z + Math.sin(a.animTime * (a.state === "run" ? 16 : 9)) * (a.state === "idle" ? 1 : 2);
    const alpha = a.health <= 0 ? Math.max(0.25, 1 - a.deathTimer * 0.6) : 1;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.beginPath();
    const airborne = a.z > 0 || a.state === "jump" || a.state === "jumpAttack";
    ctx.ellipse(a.x, a.y + 4, a.w * (airborne ? 0.44 : 0.86), airborne ? 8 : 14 + Math.sin(a.animTime * 8) * 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
    this.drawActorGlow(ctx, a, sy, isPlayer);
    const showcaseState = ["special", "super", "voltRush", "groundSlam", "coopSuper", "weaponSpecial"].includes(a.state);
    if (showcaseState || (a.maxHealth > 120 && a.phase === 2)) {
      ctx.strokeStyle = a.maxHealth > 120 ? "#ffdf6e" : a.state === "coopSuper" ? "#ffffff" : a.fighter.colors.trim;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(a.x, sy - a.h * 0.56, (a.state === "coopSuper" ? 68 : 44) + Math.sin(a.animTime * 12) * 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineWidth = 2;
      ctx.strokeStyle = a.state === "groundSlam" ? "#ffd15c" : a.state === "voltRush" ? "#37f5ff" : "#ff4fd8";
      ctx.beginPath();
      ctx.arc(a.x, sy - a.h * 0.56, (a.state === "groundSlam" ? 58 : 32) + Math.sin(a.animTime * 18) * 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    }
    if (a.armorCrackTimer > 0) {
      ctx.save();
      ctx.strokeStyle = "#ffdce1";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(a.x - 20, sy - a.h * 0.78);
      ctx.lineTo(a.x - 6, sy - a.h * 0.65);
      ctx.lineTo(a.x - 13, sy - a.h * 0.53);
      ctx.moveTo(a.x + 18, sy - a.h * 0.76);
      ctx.lineTo(a.x + 4, sy - a.h * 0.61);
      ctx.lineTo(a.x + 16, sy - a.h * 0.48);
      ctx.stroke();
      ctx.restore();
    }
    this.sprites.draw(ctx, sheet, state, a.animTime, a.x, sy + 3, {
      flip: a.facing < 0,
      flash: a.hitFlash > 0,
      alpha,
      variant: a.maxHealth > 120 && a.phase === 2 ? "phase2" : "base"
    });
    this.drawModernActorAccents(ctx, a, sy, isPlayer);
    if (isPlayer && a.weapon && a.health > 0) this.drawHeldWeapon(ctx, a, sy);
    if (isPlayer) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "700 14px 'Courier New', monospace";
      ctx.fillStyle = "#05070d";
      ctx.fillText(a.playerLabel || "P1", a.x + 2, sy - a.h - 29);
      ctx.fillStyle = a.playerIndex === 1 ? "#ffd15c" : "#37f5ff";
      ctx.fillText(a.playerLabel || "P1", a.x, sy - a.h - 31);
      if (a.health <= 0 && a.lives > 0) {
        const pct = Math.max(0, Math.min(1, a.reviveProgress / 1.2));
        ctx.fillStyle = "#05070d";
        ctx.fillRect(a.x - 30, sy - a.h - 20, 60, 7);
        ctx.fillStyle = "#37f5ff";
        ctx.fillRect(a.x - 28, sy - a.h - 18, 56 * pct, 3);
      }
    }
    if (a.health > 0 && !isPlayer) {
      ctx.fillStyle = "#111";
      ctx.fillRect(a.x - 30, sy - a.h - 18, 60, 6);
      ctx.fillStyle = a.maxHealth > 120 ? "#ff4055" : "#7cff70";
      ctx.fillRect(a.x - 30, sy - a.h - 18, 60 * (a.health / a.maxHealth), 6);
    }
    ctx.restore();
  }

  drawHeldWeapon(ctx, a, sy) {
    const weapon = WEAPONS[a.weapon.id] || WEAPONS.pipe;
    const attacking = a.attackKind?.startsWith("weapon");
    const special = a.attackKind === "weaponSpecial";
    const heavy = a.attackKind === "weaponHeavy" || special;
    const lowDurability = a.weapon.uses <= Math.max(2, Math.ceil(a.weapon.maxUses * 0.28));
    const handX = a.x + a.facing * (attacking ? (heavy ? 52 : 44) : 28);
    const handY = sy - a.h * (attacking && heavy ? 0.56 : 0.45);
    ctx.save();
    ctx.translate(handX, handY);
    ctx.scale(a.facing * 1.34, 1.34);
    const baseRotation = weapon.id === "wrench" && heavy ? -1.08 : weapon.id === "sign" && heavy ? -0.86 : heavy ? -0.72 : attacking ? -0.3 : -0.16;
    ctx.rotate(baseRotation);
    ctx.shadowColor = weapon.glow;
    ctx.shadowBlur = special ? 24 : attacking ? 14 : weapon.id === "baton" ? 10 : 6;
    ctx.fillStyle = "#05070d";
    ctx.fillRect(-11, -10, 18, 18);
    ctx.fillStyle = "#ffd0a8";
    ctx.fillRect(-8, -7, 13, 13);
    ctx.fillStyle = "#05070d";
    for (let i = 0; i < 4; i++) ctx.fillRect(-5 + i * 3, -10, 2, 5);
    if (weapon.id === "pipe") {
      ctx.fillRect(-11, -9, 92, 14);
      ctx.fillStyle = weapon.color;
      ctx.fillRect(-6, -5, 82, 7);
      ctx.fillStyle = weapon.dark;
      ctx.fillRect(52, -3, 22, 3);
      ctx.fillStyle = weapon.glow;
      ctx.fillRect(10, -8, 42, 2);
      if (attacking) ctx.fillRect(72, -5, 8, 7);
    } else if (weapon.id === "baton") {
      ctx.fillRect(-8, -9, 78, 15);
      ctx.fillStyle = weapon.color;
      ctx.fillRect(-3, -5, 68, 7);
      ctx.fillStyle = weapon.dark;
      ctx.fillRect(-3, -1, 18, 5);
      ctx.fillStyle = weapon.glow;
      ctx.fillRect(14, -13, 42, 3);
      ctx.fillRect(18, 8, 38, 3);
      if (special || Math.sin(a.animTime * 22) > 0) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(25, -17, 12, 2);
        ctx.fillRect(44, 12, 15, 2);
      }
    } else if (weapon.id === "sign") {
      ctx.fillRect(-6, -6, 56, 10);
      ctx.fillRect(38, lowDurability ? -18 : -24, 52, 36);
      ctx.fillStyle = weapon.color;
      ctx.fillRect(42, lowDurability ? -15 : -21, 43, lowDurability ? 25 : 29);
      ctx.fillStyle = weapon.dark;
      ctx.fillRect(45, lowDurability ? 4 : 0, 35, 4);
      ctx.fillStyle = weapon.glow;
      ctx.fillRect(48, lowDurability ? -8 : -14, 29, 5);
      if (lowDurability) {
        ctx.fillStyle = "#05070d";
        ctx.fillRect(69, -3, 14, 3);
      }
    } else if (weapon.id === "gauntlet") {
      ctx.fillRect(-16, -18, 43, 35);
      ctx.fillStyle = weapon.color;
      ctx.fillRect(-11, -14, 34, 27);
      ctx.fillStyle = weapon.dark;
      ctx.fillRect(-7, 4, 25, 6);
      ctx.fillStyle = weapon.glow;
      ctx.fillRect(1, -7, 23, 12);
      if (attacking) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(21, -8, 13, 14);
        ctx.fillStyle = weapon.glow;
        ctx.fillRect(32, -3, 18, 5);
      }
    } else {
      ctx.fillRect(-10, -8, 68, 13);
      ctx.fillRect(47, -27, 35, 42);
      ctx.fillStyle = weapon.color;
      ctx.fillRect(-4, -4, 58, 6);
      ctx.fillRect(51, -22, 22, 31);
      ctx.fillStyle = weapon.dark;
      ctx.fillRect(58, -16, 8, 18);
      ctx.fillStyle = weapon.glow;
      ctx.fillRect(55, -15, 13, 7);
      if (heavy) ctx.fillRect(72, 10, 16, 4);
    }
    ctx.restore();
  }
}

export class Game {
  constructor(canvas, hud, overlay) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.input = new Input();
    this.audio = new AudioManager();
    this.ui = new UI(this, hud, overlay);
    this.progression = new Progression();
    this.monetization = new MonetizationSuite();
    this.particles = new ParticleSystem();
    this.mode = "start";
    this.runMode = "story";
    this.selectedFighter = 0;
    this.selectedFighters = [0, 1];
    this.playerCount = 2;
    this.stageIndex = 0;
    this.pendingStageIndex = 0;
    this.level = new Level(0);
    this.waveManager = new WaveManager(this.level);
    this.player = null;
    this.players = [];
    this.enemies = [];
    this.time = 0;
    this.last = 0;
    this.fps = 0;
    this.fpsTimer = 0;
    this.frameCount = 0;
    this.debug = false;
    this.shake = 0;
    this.freezeFrames = 0;
    this.screenFlash = 0;
    this.trails = [];
    this.popups = [];
    this.trailTimer = 0;
    this.lastPlayerZ = 0;
    this.dashDustTimer = 0;
    this.ambientTimer = 0;
    this.stageTitleTimer = 0;
    this.bossWarningTimer = 0;
    this.transitionWipeTimer = 0;
    this.stageCompleteTimer = 0;
    this.stageClearHandled = false;
    this.stageElapsed = 0;
    this.stageRunStats = this.emptyStageRunStats();
    this.stageSummary = null;
    this.tutorial = { active: false };
    this.superReadyTimer = 0;
    this.miniBossTeaseTimer = 0;
    this.pendingUpgrades = [];
    this.upgradePlayerIndex = 0;
    this.difficulty = this.progression.save.options.difficulty || "normal";
    this.audio.setMusicVolume(this.progression.save.options.musicVolume ?? this.audio.musicVolume);
    this.audio.setSfxVolume(this.progression.save.options.sfxVolume ?? this.audio.sfxVolume);
    this.audio.muted = Boolean(this.progression.save.options.muted);
    this.applyMobileControlSettings(this.progression.save.options, false);
  }

  start() {
    this.ui.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  menuAction(action) {
    this.audio.resume();
    if (!action) return;
    if (action === "story") {
      this.runMode = "story";
      this.pendingStageIndex = 0;
      this.mode = "select";
    }
    if (action === "select") this.mode = "select";
    if (action === "start") this.mode = "start";
    if (action === "stageSelect") this.mode = "stageSelect";
    if (action === "endless") this.mode = "endless";
    if (action === "upgrades") this.mode = "unlocks";
    if (action === "encyclopedia") this.mode = "encyclopedia";
    if (action === "options") this.mode = "options";
    if (action === "credits") this.mode = "credits";
    if (action === "stats") this.mode = "stats";
    if (action.startsWith("stage:")) {
      const index = Number(action.split(":")[1]);
      const maxStage = this.progression.save.unlockedStages || 1;
      if (Number.isFinite(index) && index < maxStage) {
        this.runMode = "stage";
        this.pendingStageIndex = index;
        this.mode = "select";
      }
    }
    if (action.startsWith("players:")) {
      const count = Number(action.split(":")[1]);
      if (count === 1 || count === 2) this.playerCount = count;
    }
    if (action === "play") this.newRun(this.pendingStageIndex || 0);
    if (action.startsWith("upgrade:")) this.chooseUpgrade(Number(action.split(":")[1]));
    if (action.startsWith("difficulty:")) this.setDifficulty(action.split(":")[1]);
    if (action.startsWith("control:")) this.setControlPreference(action.split(":")[1]);
    if (action.startsWith("touchSize:")) this.setMobileControlSize(action.split(":")[1]);
    if (action.startsWith("touchLayout:")) this.setMobileControlLayout(action.split(":")[1]);
    if (action.startsWith("touchOpacity:")) this.setMobileControlOpacity(Number(action.split(":")[1]));
    if (action.startsWith("unlock:")) this.buyUnlock(action.split(":")[1]);
    if (action === "resetSave") this.resetSaveWithConfirmation();
    if (action === "skipTutorial") this.skipTutorial();
    if (action === "resume") this.mode = "play";
    if (action === "restartStage") this.restartStage();
    if (action === "musicDown") this.setMusicVolume(this.audio.musicVolume - 0.1);
    if (action === "musicUp") this.setMusicVolume(this.audio.musicVolume + 0.1);
    if (action === "sfxDown") this.setSfxVolume(this.audio.sfxVolume - 0.1);
    if (action === "sfxUp") this.setSfxVolume(this.audio.sfxVolume + 0.1);
    if (action === "toggleMute") this.setMuted(!this.audio.muted);
    this.ui.render();
  }

  emptyStageRunStats() {
    return {
      enemiesDefeated: 0,
      pickupsCollected: 0,
      scrapEarned: 0,
      revives: 0,
      startTime: this.time || 0
    };
  }

  createTutorialState() {
    const status = this.progression.save.tutorial || {};
    const steps = TUTORIAL_STEPS.filter((step) => !step.coopOnly || this.playerCount > 1);
    return {
      active: this.stageIndex === 0 && !status.completed && !status.skipped,
      steps,
      index: 0,
      stepAge: 0,
      completed: new Set()
    };
  }

  currentTutorialStep() {
    if (!this.tutorial?.active) return null;
    return this.tutorial.steps[this.tutorial.index] || null;
  }

  skipTutorial() {
    this.tutorial = { active: false };
    this.progression.setTutorialStatus({ completed: true, skipped: true });
    this.addPopup("TUTORIAL SKIPPED", this.level.cameraX + 260, this.level.bounds.top - 44, "#ffd15c", 0.35, 0.75);
  }

  completeTutorial() {
    this.tutorial = { active: false };
    this.progression.setTutorialStatus({ completed: true, skipped: false });
    this.addPopup("READY TO BRAWL", this.level.cameraX + 260, this.level.bounds.top - 44, "#37f5ff", 0.48, 0.9);
  }

  advanceTutorial(id) {
    if (!this.tutorial?.active) return;
    const step = this.currentTutorialStep();
    if (!step || step.id !== id) return;
    this.tutorial.completed.add(id);
    this.tutorial.index++;
    this.tutorial.stepAge = 0;
    if (this.tutorial.index >= this.tutorial.steps.length) {
      this.completeTutorial();
      return;
    }
    const next = this.currentTutorialStep();
    if (next) this.addPopup(next.title.toUpperCase(), this.level.cameraX + 290, this.level.bounds.top - 42, "#ffd15c", 0.35, 0.7);
  }

  updateTutorial(dt) {
    if (!this.tutorial?.active || this.mode !== "play") return;
    const step = this.currentTutorialStep();
    if (!step) {
      this.completeTutorial();
      return;
    }
    this.tutorial.stepAge += dt;
    const moved = Math.hypot(this.input.axes.p1.x, this.input.axes.p1.y) > 0.25
      || Math.hypot(this.input.axes.p2.x, this.input.axes.p2.y) > 0.25;
    const attacked = this.players.some((player) => player.combo > 0 || ["punch1", "punch2", "punch3", "kick", "weaponLight", "weaponHeavy"].includes(player.attackKind));
    const armed = this.players.some((player) => Boolean(player.weapon));
    const usedSpecial = this.players.some((player) => ["special", "powerFinish", "voltRush", "groundSlam", "coopSuper", "weaponSpecial"].includes(player.attackKind));
    const revived = this.stageRunStats.revives > 0;
    if (step.id === "move" && moved) this.advanceTutorial("move");
    if (step.id === "attack" && attacked) this.advanceTutorial("attack");
    if (step.id === "weapon" && armed) this.advanceTutorial("weapon");
    if (step.id === "special" && usedSpecial) this.advanceTutorial("special");
    if (step.id === "revive" && (revived || this.tutorial.stepAge >= (step.autoCompleteAfter || 5))) this.advanceTutorial("revive");
  }

  updateSuperReadyCues(dt) {
    this.superReadyTimer = Math.max(0, this.superReadyTimer - dt);
    if (this.stageElapsed < 2.2) return;
    for (const player of this.activePlayers()) {
      const ready = player.specialCooldown <= 0;
      if (ready && !player.specialReadyCueShown) {
        player.specialReadyCueShown = true;
        this.superReadyTimer = 1.8;
        this.audio.sfx("phase");
        this.addPopup("SUPER READY", player.x, player.y - 104, "#ffd15c", 0.7, 1);
        this.particles.burst(player.x, player.y - 48, player.fighter.colors.trim, 22, 190, "ring");
        break;
      }
      if (!ready) player.specialReadyCueShown = false;
    }
  }

  showMiniBossTease() {
    if (this.stageIndex !== 0) return;
    this.miniBossTeaseTimer = 3.2;
    this.audio.sfx("boss");
    this.addPopup("MINI-BOSS SIGNAL", this.level.cameraX + 560, 160, "#ff4055", 0.58, 1.15);
  }

  newRun(stageIndex = 0) {
    this.stageIndex = Math.max(0, Math.min(LEVELS.length - 1, stageIndex));
    this.level = new Level(this.stageIndex);
    this.waveManager = new WaveManager(this.level);
    this.players = [
      this.createPlayer(0, FIGHTERS[this.selectedFighters[0] ?? 0], 100, this.level.bounds.top + 112)
    ];
    if (this.playerCount > 1) {
      this.players.push(this.createPlayer(1, FIGHTERS[this.selectedFighters[1] ?? 1], 165, this.level.bounds.top + 150));
    }
    if (this.progression.save.unlocks.startingPipe) {
      this.players.forEach((player) => player.equipWeapon("pipe"));
    }
    this.player = this.players[0];
    this.enemies = [];
    this.particles = new ParticleSystem();
    this.trails = [];
    this.popups = [];
    this.freezeFrames = 0;
    this.screenFlash = 0;
    this.lastPlayerZ = 0;
    this.dashDustTimer = 0;
    this.ambientTimer = 0;
    this.stageTitleTimer = 2.4;
    this.bossWarningTimer = 0;
    this.transitionWipeTimer = 0.9;
    this.stageCompleteTimer = 0;
    this.stageClearHandled = false;
    this.stageElapsed = 0;
    this.stageRunStats = this.emptyStageRunStats();
    this.stageSummary = null;
    this.tutorial = this.createTutorialState();
    this.superReadyTimer = 0;
    this.miniBossTeaseTimer = 0;
    this.pendingUpgrades = [];
    this.upgradePlayerIndex = 0;
    this.mode = "play";
  }

  restartStage() {
    const stage = this.stageIndex;
    this.level = new Level(stage);
    this.waveManager = new WaveManager(this.level);
    this.enemies = [];
    this.trails = [];
    this.popups = [];
    this.particles = new ParticleSystem();
    this.players.forEach((player, index) => {
      player.x = 100 + index * 78;
      player.y = this.level.bounds.top + 112 + index * 32;
      player.z = 0;
      player.vz = 0;
      player.health = Math.max(1, Math.ceil(player.maxHealth * 0.75));
      player.reviveProgress = 0;
      player.attackTimer = 0;
      player.attackWindow = 0;
      player.combo = 0;
      player.comboTimer = 0;
      player.invuln = 1.2;
      player.state = "getup";
    });
    this.syncPrimaryPlayer();
    this.stageTitleTimer = 2.0;
    this.transitionWipeTimer = 0.75;
    this.freezeFrames = 0;
    this.screenFlash = 0;
    this.stageClearHandled = false;
    this.stageElapsed = 0;
    this.stageRunStats = this.emptyStageRunStats();
    this.stageSummary = null;
    this.tutorial = this.createTutorialState();
    this.superReadyTimer = 0;
    this.miniBossTeaseTimer = 0;
    this.mode = "play";
  }

  createPlayer(index, fighter, x, y) {
    const player = new Player(fighter, x, y);
    player.playerIndex = index;
    player.playerLabel = `P${index + 1}`;
    player.inputId = index === 0 ? "p1" : "p2";
    player.specialReadyCueShown = false;
    ensurePlayerUpgrades(player);
    return player;
  }

  activePlayers() {
    return this.players.filter((player) => player && player.health > 0);
  }

  livingPlayersOrAll() {
    const active = this.activePlayers();
    return active.length ? active : this.players.filter(Boolean);
  }

  syncPrimaryPlayer() {
    this.player = this.activePlayers()[0] || this.players[0] || null;
  }

  allPlayersOut() {
    return this.players.length > 0 && this.players.every((player) => player.health <= 0 && player.lives <= 0);
  }

  leadingPlayerX() {
    if (!this.players.length) return this.player?.x || 0;
    return Math.max(...this.players.map((player) => player.x));
  }

  cameraFocusX() {
    const players = this.livingPlayersOrAll();
    if (!players.length) return this.player?.x || 0;
    const minX = Math.min(...players.map((player) => player.x));
    const maxX = Math.max(...players.map((player) => player.x));
    return (minX + maxX) * 0.5;
  }

  nearestPlayer(entity) {
    return this.activePlayers().reduce((closest, player) => {
      if (!closest) return player;
      return entity.distanceTo(player) < entity.distanceTo(closest) ? player : closest;
    }, null);
  }

  coopActive() {
    return this.players.filter(Boolean).length > 1;
  }

  scaleEnemyForCoop(enemy) {
    if (!this.coopActive()) return enemy;
    const boss = enemy.maxHealth > 120;
    const hpScale = boss ? 1.48 : enemy.type === "brute" ? 1.34 : 1.26;
    enemy.maxHealth = Math.ceil(enemy.maxHealth * hpScale);
    enemy.health = enemy.maxHealth;
    enemy.data.damage = Math.ceil(enemy.data.damage * (boss ? 1.1 : 1.08));
    enemy.data.cooldown *= boss ? 0.92 : 0.88;
    enemy.data.score = Math.ceil(enemy.data.score * 1.15);
    return enemy;
  }

  prepareEnemy(enemy) {
    const difficulty = DIFFICULTIES[this.difficulty] || DIFFICULTIES.normal;
    const boss = enemy.maxHealth > 120;
    enemy.maxHealth = Math.ceil(enemy.maxHealth * (boss ? difficulty.bossHp : difficulty.enemyHp));
    enemy.health = enemy.maxHealth;
    enemy.data.damage = Math.ceil(enemy.data.damage * difficulty.enemyDamage);
    enemy.data.speed = Math.round(enemy.data.speed * difficulty.enemySpeed);
    enemy.data.score = Math.ceil(enemy.data.score * difficulty.scrap);
    return this.scaleEnemyForCoop(enemy);
  }

  setMusicVolume(value) {
    this.audio.setMusicVolume(value);
    this.progression.setOption("musicVolume", this.audio.musicVolume);
  }

  setSfxVolume(value) {
    this.audio.setSfxVolume(value);
    this.progression.setOption("sfxVolume", this.audio.sfxVolume);
  }

  setMuted(value) {
    this.audio.muted = Boolean(value);
    this.progression.setOption("muted", this.audio.muted);
  }

  setDifficulty(value) {
    if (!DIFFICULTIES[value]) return;
    this.difficulty = value;
    this.progression.setOption("difficulty", value);
    this.addPopup(value.toUpperCase(), this.level.cameraX + 220, this.level.bounds.top - 40, "#ffd15c", 0.4, 0.8);
  }

  setControlPreference(value) {
    this.progression.setOption("controlDisplay", value || "auto");
  }

  setMobileControlSize(value) {
    this.applyMobileControlSettings({ mobileControlSize: value }, true);
  }

  setMobileControlLayout(value) {
    this.applyMobileControlSettings({ mobileControlLayout: value }, true);
  }

  setMobileControlOpacity(value) {
    this.applyMobileControlSettings({ mobileControlOpacity: value }, true);
  }

  applyMobileControlSettings(options = {}, persist = true) {
    const root = globalThis.document?.documentElement;
    const allowedSizes = new Set(["small", "medium", "large", "xl"]);
    const allowedLayouts = new Set(["classic", "compact", "arcade"]);
    const current = this.progression.save.options;
    const size = allowedSizes.has(options.mobileControlSize) ? options.mobileControlSize : current.mobileControlSize || "large";
    const layout = allowedLayouts.has(options.mobileControlLayout) ? options.mobileControlLayout : current.mobileControlLayout || "arcade";
    const opacity = Number.isFinite(options.mobileControlOpacity) ? Math.max(0.45, Math.min(1, options.mobileControlOpacity)) : current.mobileControlOpacity ?? 0.7;
    root?.setAttribute("data-touch-size", size);
    root?.setAttribute("data-touch-layout", layout);
    root?.style.setProperty("--touch-opacity", opacity.toFixed(2));
    if (!persist) return;
    this.progression.setOption("mobileControlSize", size);
    this.progression.setOption("mobileControlLayout", layout);
    this.progression.setOption("mobileControlOpacity", opacity);
  }

  resetSaveWithConfirmation() {
    const confirmed = globalThis.confirm?.("Reset all Neon Fists local save data, including Scrap, unlocks, options, and stage records?");
    if (!confirmed) return;
    this.progression.reset();
    this.difficulty = this.progression.save.options.difficulty || "normal";
    this.audio.setMusicVolume(this.progression.save.options.musicVolume ?? 1);
    this.audio.setSfxVolume(this.progression.save.options.sfxVolume ?? 1);
    this.audio.muted = Boolean(this.progression.save.options.muted);
    this.applyMobileControlSettings(this.progression.save.options, false);
    this.pendingStageIndex = 0;
    this.playerCount = 2;
    this.mode = "start";
    this.ui.overlayKey = "";
  }

  buyUnlock(id) {
    const costs = {
      supporterPalettes: 250,
      startingPipe: 450,
      bonusPortraits: 650,
      hardDifficulty: 0,
      soundTest: 300,
      encyclopediaPack: 220
    };
    if (this.progression.unlock(id, costs[id] || 250)) {
      this.addPopup("UNLOCKED", this.level.cameraX + 220, this.level.bounds.top - 40, "#37f5ff", 0.45, 0.9);
    } else {
      this.addPopup("NEED SCRAP", this.level.cameraX + 220, this.level.bounds.top - 40, "#ff4055", 0.35, 0.75);
    }
  }

  clampPlayersToCamera() {
    const left = this.level.cameraX + 44;
    const right = this.level.cameraX + this.renderer.world.width - 78;
    for (const player of this.players) {
      player.x = Math.max(left, Math.min(Math.min(this.level.length - 76, right), player.x));
    }
  }

  loop(ms) {
    const dt = Math.min(0.033, (ms - this.last) / 1000 || 0.016);
    this.last = ms;
    this.fpsTimer += dt;
    this.frameCount++;
    if (this.fpsTimer >= 0.5) {
      this.fps = Math.round(this.frameCount / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;
    }
    this.input.readAxes();
    if (this.input.pressed("debug")) this.debug = !this.debug;
    if (this.input.pressed("pause")) {
      if (this.mode === "play") this.mode = "pause";
      else if (this.mode === "pause") this.mode = "play";
      this.audio.resume();
    }
    if (this.mode === "play" && this.freezeFrames > 0) {
      this.freezeFrames--;
      this.screenFlash = Math.max(0, this.screenFlash - dt * 2.2);
    } else if (this.mode === "play") {
      this.update(dt);
    }
    this.renderer.render(this);
    this.ui.render();
    this.input.endFrame();
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    this.time += dt;
    this.stageElapsed += dt;
    this.shake = Math.max(0, this.shake - dt);
    this.screenFlash = Math.max(0, this.screenFlash - dt * 2.2);
    this.stageTitleTimer = Math.max(0, this.stageTitleTimer - dt);
    this.bossWarningTimer = Math.max(0, this.bossWarningTimer - dt);
    this.miniBossTeaseTimer = Math.max(0, this.miniBossTeaseTimer - dt);
    this.transitionWipeTimer = Math.max(0, this.transitionWipeTimer - dt);
    this.stageCompleteTimer = Math.max(0, this.stageCompleteTimer - dt);
    this.audio.update(dt, this.stageIndex);
    this.updatePopups(dt);
    this.updatePickups(dt);
    this.updateAmbient(dt);
    this.updateHazards(dt);
    this.handleWeaponDropInput();
    for (const player of this.players) {
      const wasZ = player.z;
      player.update(dt, this.input.controller(player.inputId), this.level, this.audio, this);
      if (wasZ > 0 && player.z === 0) this.particles.burst(player.x, player.y, "#c7d0dd", 18, 125, "line");
      player.dashDustTimer = Math.max(0, player.dashDustTimer - dt);
      if (player.state === "dash" && player.dashDustTimer <= 0) {
        this.particles.burst(player.x - player.facing * 24, player.y - 4, "#7f8798", 8, 90, "line");
        player.dashDustTimer = 0.055;
      }
    }
    this.handleRevives(dt);
    this.syncPrimaryPlayer();
    this.updateTrails(dt);
    this.spawnWaves(dt);
    for (const e of this.enemies) e.update(dt, this);
    this.resolveCombat();
    this.resolveObjects();
    this.resolvePickups();
    this.updateTutorial(dt);
    this.updateSuperReadyCues(dt);
    this.enemies = this.enemies.filter((e) => e.deathTimer < 1.5);
    this.particles.update(dt);
    this.level.objects.forEach((o) => (o.hitFlash = Math.max(0, o.hitFlash - dt)));
    this.level.updateCamera(this.cameraFocusX(), this.renderer.world.width);
    this.clampPlayersToCamera();
    if (this.allPlayersOut()) this.mode = "gameover";
  }

  handleRevives(dt) {
    const active = this.activePlayers();
    for (const downed of this.players.filter((player) => player.health <= 0)) {
      const ally = active.find((player) => player !== downed && player.distanceTo(downed) < 96);
      const reviving = ally && (this.input.down("pickup", ally.inputId) || this.input.down("block", ally.inputId));
      if (reviving && downed.lives > 0) {
        downed.reviveProgress += dt * (1 + (ally.upgrades?.reviveSpeed || 0));
        if (Math.floor(this.time * 8) % 5 === 0) this.particles.burst(downed.x, downed.y - 46, "#37f5ff", 2, 70, "ring");
        if (downed.reviveProgress >= 1.2) {
          downed.revive(downed.x, downed.y, 0.48);
          this.stageRunStats.revives++;
          this.audio.sfx("pickup");
          this.addPopup("REVIVED", downed.x, downed.y - 86, "#37f5ff", 0.55, 0.9);
          this.particles.burst(downed.x, downed.y - 42, "#37f5ff", 20, 190, "star");
        }
      } else {
        downed.reviveProgress = Math.max(0, downed.reviveProgress - dt * 0.55);
      }
      if (active.length > 0 && downed.health <= 0 && downed.lives > 0 && downed.koTimer > 4.2) {
        const slot = downed.playerIndex || 0;
        downed.revive(this.level.cameraX + 132 + slot * 70, this.level.bounds.top + 128 + slot * 28, 0.42);
        this.audio.sfx("pickup");
        this.addPopup("GET UP", downed.x, downed.y - 86, "#ffd15c", 0.45, 0.78);
        this.particles.burst(downed.x, downed.y - 38, "#ffd15c", 16, 150, "line");
      }
    }

    if (active.length > 0) return;
    for (const [index, player] of this.players.entries()) {
      if (player.health > 0 || player.lives <= 0 || player.koTimer < 1.65) continue;
      player.revive(this.level.cameraX + 130 + index * 70, this.level.bounds.top + 124 + index * 28, 0.58);
      this.addPopup("GET UP", player.x, player.y - 86, "#ffd15c", 0.45, 0.78);
      this.particles.burst(player.x, player.y - 36, "#ffd15c", 16, 150, "line");
    }
  }

  updateTrails(dt) {
    this.trailTimer = Math.max(0, this.trailTimer - dt);
    for (const p of this.players) {
      if (p.attackTimer > 0 && p.attackWindow > 0 && this.trailTimer <= 0) {
        const weaponKind = p.attackKind?.startsWith("weapon");
        const weapon = weaponKind ? WEAPONS[p.weapon?.id] : null;
        const weaponMode = { weaponLight: "light", weaponHeavy: "heavy", weaponSpecial: "special" }[p.attackKind];
        const reach = weapon ? (weapon[weaponMode]?.range || 110) : {
          punch1: 46,
          punch2: 58,
          punch3: 88,
          kick: 74,
          launchKick: 94,
          dash: 82,
          streetRush: 112,
          jump: 70,
          skyDrop: 96,
          special: 112,
          powerFinish: 146,
          voltRush: 166,
          groundSlam: 142,
          coopSuper: 196
        }[p.attackKind] || 52;
        const visualKind = weapon ? "weaponSwing" : {
          punch3: "finisher",
          launchKick: "launcher",
          streetRush: "dash",
          skyDrop: "sky",
          powerFinish: "special",
          voltRush: "superRush",
          groundSlam: "slamSuper",
          coopSuper: "coopSuper"
        }[p.attackKind] || p.attackKind;
        const trailColor = weapon ? weapon.color : p.attackKind === "groundSlam" ? "#ffd15c" : p.attackKind === "coopSuper" ? "#ffffff" : p.fighter.colors.trim;
        this.trails.push({
          x: p.x,
          y: p.y - p.z,
          h: p.h,
          facing: p.facing,
          reach,
          kind: visualKind,
          weapon: weapon?.id,
          heavy: p.attackKind === "weaponHeavy" || p.attackKind === "weaponSpecial",
          special: p.attackKind === "weaponSpecial" || p.attackKind === "voltRush" || p.attackKind === "groundSlam" || p.attackKind === "coopSuper",
          altColor: p.fighter.colors.suit,
          color: trailColor,
          age: 0,
          life: p.attackKind === "coopSuper" ? 0.34 : p.attackKind === "powerFinish" || p.attackKind === "weaponSpecial" || p.attackKind === "voltRush" || p.attackKind === "groundSlam" ? 0.27 : weapon ? 0.2 : 0.16
        });
        this.trailTimer = weapon ? 0.03 : 0.035;
      }
    }
    for (const e of this.enemies) {
      if (e.attackTimer > 0.1 && e.health > 0 && !e.trailTagged) {
        const kind = e.type === "blade" ? "enemySlash" : e.type === "brute" || e.maxHealth > 120 ? "slam" : "punch1";
        const color = e.type === "blade" ? "#37f5ff" : e.maxHealth > 120 ? "#ff4055" : e.data.color;
        this.trails.push({ x: e.x, y: e.y - e.z, h: e.h, facing: e.facing, reach: e.maxHealth > 120 ? 92 : e.type === "brute" ? 72 : 48, kind, color, age: 0, life: 0.2 });
        e.trailTagged = true;
      }
      if (e.attackTimer <= 0.02) e.trailTagged = false;
    }
    for (const t of this.trails) t.age += dt;
    this.trails = this.trails.filter((t) => t.age < t.life);
  }

  updatePopups(dt) {
    for (const popup of this.popups) popup.age += dt;
    this.popups = this.popups.filter((popup) => popup.age < popup.life);
  }

  addPopup(text, x, y, color = "#ffd15c", pop = 0.35, life = 0.72) {
    this.popups.push({ text, x, y, color, pop, life, age: 0 });
  }

  updatePickups(dt) {
    for (const pickup of this.level.pickups) {
      if (pickup.ttl != null) pickup.ttl -= dt;
      pickup.pickupCooldown = Math.max(0, (pickup.pickupCooldown || 0) - dt);
      pickup.inRange = false;
      pickup.hintPlayer = null;
    }
    this.level.pickups = this.level.pickups.filter((pickup) => !pickup.taken && (pickup.ttl == null || pickup.ttl > 0));
  }

  updateAmbient(dt) {
    this.ambientTimer = Math.max(0, this.ambientTimer - dt);
    if (this.ambientTimer > 0) return;
    const cam = this.level.cameraX;
    if (this.stageIndex === 0) {
      this.particles.burst(cam + 80 + Math.random() * this.renderer.world.width, this.level.bounds.bottom + 8, "#37f5ff", 2, 28, "line");
    } else if (this.stageIndex === 1) {
      this.particles.burst(cam + 90 + Math.random() * this.renderer.world.width, this.level.bounds.top - 28, "#7cff70", 3, 36, "ring");
    } else {
      this.particles.burst(cam + 40 + Math.random() * this.renderer.world.width, this.level.bounds.top - 20 - Math.random() * 70, "#c7d0dd", 2, 85, "line");
    }
    this.ambientTimer = 0.18 + Math.random() * 0.16;
  }

  addHazard(type, x, y, delay = 0, temporary = true) {
    const info = HAZARD_INFO[type] || HAZARD_INFO.explosive;
    this.level.hazards.push({
      id: `temp${Math.random().toString(16).slice(2)}`,
      type,
      x,
      y,
      w: info.w,
      h: info.h,
      damage: info.damage,
      color: info.color,
      cooldown: info.cooldown,
      activeTime: info.active,
      timer: delay,
      active: false,
      temporary,
      expired: false,
      hitTags: new Set()
    });
  }

  updateHazards(dt) {
    for (const hazard of this.level.hazards || []) {
      hazard.timer -= dt;
      if (hazard.timer <= 0) {
        if (hazard.active) {
          hazard.active = false;
          hazard.hitTags.clear();
          if (hazard.temporary) {
            hazard.expired = true;
            continue;
          }
          hazard.timer = hazard.cooldown;
        } else {
          hazard.active = true;
          hazard.hitTags.clear();
          hazard.timer = hazard.activeTime;
          this.particles.burst(hazard.x, hazard.y - hazard.h * 0.28, hazard.color, hazard.type === "explosive" ? 28 : 10, hazard.type === "crusher" ? 190 : 120, hazard.type === "explosive" ? "star" : "line");
          if (hazard.type === "explosive" || hazard.type === "crusher") {
            this.shake = Math.max(this.shake, 0.32);
            this.screenFlash = Math.max(this.screenFlash, 0.12);
          }
        }
      }
      if (!hazard.active) continue;
      for (const player of this.activePlayers()) this.applyHazardHit(hazard, player, `p${player.playerIndex}`);
      for (const enemy of this.enemies) {
        if (enemy.health > 0) this.applyHazardHit(hazard, enemy, `e${enemy.type}:${enemy.x.toFixed(0)}:${enemy.y.toFixed(0)}`);
      }
    }
    this.level.hazards = (this.level.hazards || []).filter((hazard) => !hazard.expired);
  }

  applyHazardHit(hazard, actor, tag) {
    if (!this.actorInHazard(actor, hazard) || hazard.hitTags.has(tag)) return;
    hazard.hitTags.add(tag);
    const info = HAZARD_INFO[hazard.type] || HAZARD_INFO.electric;
    const fromX = hazard.x - Math.sign(actor.x - hazard.x || 1) * 20;
    if (actor instanceof Player) {
      actor.takeHit(hazard.damage, fromX, info.push || 120, hazard.type === "crusher" ? 0.45 : 0.22, this.audio);
    } else {
      const spec = {
        id: `hazard:${hazard.id}:${tag}:${Math.floor(this.time * 10)}`,
        damage: Math.ceil(hazard.damage * 1.1),
        range: hazard.w,
        arc: hazard.h,
        knock: info.push || 130,
        stun: hazard.type === "electric" || hazard.type === "laser" ? 0.38 : 0.24,
        kind: "hazard",
        finisher: hazard.type === "explosive" || hazard.type === "crusher",
        reaction: hazard.type === "electric" || hazard.type === "laser" ? "shock" : hazard.type === "crusher" ? "slamCrush" : "hit"
      };
      actor.takeHit(spec, fromX);
    }
    this.particles.burst(actor.x, actor.y - actor.h * 0.5 - actor.z, hazard.color, hazard.type === "explosive" ? 22 : 11, 160, hazard.type === "electric" || hazard.type === "laser" ? "ring" : "line");
  }

  actorInHazard(actor, hazard) {
    const halfW = hazard.w * 0.5;
    const top = hazard.y - hazard.h;
    return actor.x > hazard.x - halfW && actor.x < hazard.x + halfW && actor.y > top && actor.y < hazard.y + Math.max(20, hazard.h * 0.18);
  }

  handleWeaponDropInput() {
    for (const player of this.players) {
      if (!player.weapon || !this.input.pressed("pickup", player.inputId) || player.attackTimer > 0 || player.health <= 0) continue;
      const nearPickup = this.level.pickups.some((pickup) => !pickup.taken && this.pickupInRange(player, pickup, true));
      if (nearPickup) continue;
      const dropped = player.dropWeapon();
      if (!dropped) continue;
      this.spawnPickup(player.x + player.facing * 42, player.y, "weapon", dropped.id, 7.5, { ownerId: player.playerLabel, pickupCooldown: 0.55 });
      this.addPopup("DROP", player.x, player.y - 82, "#c7d0dd", 0.3, 0.62);
    }
  }

  spawnPickup(x, y, type, weapon = null, ttl = null, options = {}) {
    this.level.pickups.push({
      id: `drop${Math.random().toString(16).slice(2)}`,
      x,
      y,
      type,
      weapon,
      taken: false,
      bob: Math.random() * 10,
      ttl,
      ownerId: options.ownerId || null,
      pickupCooldown: options.pickupCooldown || 0,
      inRange: false,
      hintPlayer: null
    });
  }

  randomWeaponId() {
    return WEAPON_IDS[Math.floor(Math.random() * WEAPON_IDS.length)];
  }

  consumeWeaponUse(spec, x, y, player) {
    if (!player || !spec.weapon || !player.weapon || player.weaponSwingId === spec.id) return;
    player.weaponSwingId = spec.id;
    const weapon = WEAPONS[player.weapon.id] || WEAPONS.pipe;
    player.weapon.uses = Math.max(0, player.weapon.uses - (spec.weaponMode === "special" ? 2 : 1));
    if (player.weapon.uses > 0) return;
    const broken = player.dropWeapon();
    player.attackKind = "weaponBreak";
    player.attackTimer = Math.max(player.attackTimer, 0.18);
    player.attackDuration = Math.max(player.attackDuration, 0.18);
    player.attackWindow = 0;
    this.freezeFrames = Math.max(this.freezeFrames, 6);
    this.screenFlash = Math.max(this.screenFlash, 0.12);
    this.audio.sfx("break");
    this.addPopup("BROKEN", x, y - 50, weapon.glow, 0.5, 0.85);
    this.particles.burst(x, y - 34, weapon.color, 26, 220, "star");
    this.particles.burst(x, y - 22, "#c7d0dd", 12, 170, "line");
    return broken;
  }

  spawnWaves(dt) {
    this.waveManager?.update(dt, this);
  }

  resolveCombat() {
    for (const player of this.activePlayers()) {
      const rawSpec = player.attackSpec();
      if (rawSpec) {
        const ps = { ...rawSpec, id: `${player.playerLabel}:${rawSpec.id}` };
        for (const e of this.enemies) {
          if (e.health <= 0) continue;
          const ahead = (e.x - player.x) * player.facing > -12;
          const inRange = Math.abs(e.x - player.x) < ps.range && Math.abs(e.y - player.y) < ps.arc;
          if (ahead && inRange && e.takeHit(ps, player.x)) {
            this.onHit(e, ps, player);
            if (e.health <= 0) {
              player.score += e.data.score;
              this.progression.recordEnemyDefeated(1);
              this.stageRunStats.enemiesDefeated++;
              this.awardScrap(Math.max(4, Math.ceil(e.data.score * 0.08)), "enemy");
              this.audio.sfx("ko");
              if (Math.random() < (e.maxHealth > 120 ? 0.65 : 0.28)) this.spawnPickup(e.x, e.y, "weapon", this.randomWeaponId(), 8.5);
            }
          }
        }
      }
    }
    for (const e of this.enemies) {
      const es = e.attackSpec();
      if (!es) continue;
      for (const player of this.activePlayers()) {
        const hitTag = `${player.playerLabel}:enemy:${es.id}`;
        if (e.hitBy.has(hitTag)) continue;
        const inRange = Math.abs(e.x - player.x) < es.range && Math.abs(e.y - player.y) < es.arc;
        const ahead = (player.x - e.x) * e.facing > -10;
        if (inRange && ahead && player.takeHit(es.damage, e.x, es.knock, es.stun, this.audio)) {
          e.hitBy.add(hitTag);
          if (es.grab) {
            e.grabTarget = player;
            e.grabTimer = 1.25;
            e.grabDamageTimer = 0.05;
            this.addPopup("GRABBED", player.x, player.y - 82, "#ff4055", 0.42, 0.78);
          }
          if (es.explosive) this.addHazard("explosive", player.x + e.facing * 22, player.y, 0.12);
          this.freezeFrames = Math.max(this.freezeFrames, e.maxHealth > 120 || e.type === "brute" ? 5 : 3);
          this.screenFlash = Math.max(this.screenFlash, e.maxHealth > 120 ? 0.14 : 0.07);
          this.shake = Math.max(this.shake, 0.18);
          this.particles.burst(player.x, player.y - 48, "#ff4e5d", 12, 170, "line");
        }
      }
    }
  }

  applyEnemyReaction(enemy, spec, player) {
    const dir = Math.sign(enemy.x - player.x || player.facing || 1);
    if (spec.reaction) enemy.setReaction?.(spec.reaction, spec.super ? 0.62 : spec.weapon ? 0.46 : 0.34);
    const leftWall = this.level.cameraX + 44;
    const rightWall = Math.min(this.level.length - 56, this.level.cameraX + this.renderer.world.width - 54);
    if (enemy.x <= leftWall || enemy.x >= rightWall) {
      enemy.x = Math.max(leftWall, Math.min(rightWall, enemy.x));
      enemy.z = Math.max(enemy.z, enemy.maxHealth > 120 ? 8 : 16);
      enemy.vz = Math.max(enemy.vz, enemy.maxHealth > 120 ? 120 : 240);
      enemy.stun = Math.max(enemy.stun, enemy.maxHealth > 120 ? 0.38 : 0.62);
      enemy.setReaction?.("wallBounce", 0.5);
      this.shake = Math.max(this.shake, 0.32);
      this.addPopup("WALL BOUNCE", enemy.x, enemy.y - enemy.h * 0.82, "#ffffff", 0.45, 0.82);
      this.particles.burst(enemy.x - dir * 14, enemy.y - enemy.h * 0.45, "#ffffff", 18, 230, "star");
    }
    if (spec.finisher && enemy.maxHealth <= 120 && enemy.z <= 2) {
      enemy.z = Math.max(enemy.z, 8);
      enemy.vz = Math.max(enemy.vz, spec.launch ? spec.launch * 0.52 : 170);
      if (spec.reaction === "slamCrush" || spec.reaction === "groundBounce") enemy.setReaction?.("groundBounce", 0.46);
    }
    if (enemy.maxHealth > 120 && spec.finisher) {
      enemy.stun = Math.max(enemy.stun, spec.weapon ? 0.42 : 0.34);
      enemy.setReaction?.("heavyStagger", 0.48);
      this.addPopup("STAGGER", enemy.x, enemy.y - enemy.h * 0.9, "#ffdf6e", 0.4, 0.72);
    }
    if (spec.reaction === "shock") {
      this.particles.burst(enemy.x, enemy.y - enemy.h * 0.55, "#baffff", spec.super ? 28 : 16, 260, "ring");
      this.particles.burst(enemy.x, enemy.y - enemy.h * 0.42, "#ffffff", 10, 190, "line");
    }
    if (spec.reaction === "spin") {
      this.particles.burst(enemy.x - dir * 18, enemy.y - enemy.h * 0.5, "#ff4fd8", 18, 230, "star");
    }
    if (spec.reaction === "slamCrush" || spec.reaction === "groundBounce") {
      this.particles.burst(enemy.x, enemy.y + 2, "#c7d0dd", spec.super ? 28 : 15, 190, "line");
    }
  }

  onHit(enemy, spec, player) {
    const kind = spec.kind;
    player.combo++;
    player.bestCombo = Math.max(player.bestCombo || 0, player.combo);
    player.comboTimer = 1.35;
    player.powerTimer = Math.min(10, player.powerTimer + 0.16 * (1 + (player.upgrades?.superGain || 0)));
    const previousHitPlayer = enemy.lastHitPlayer;
    const coopCombo = previousHitPlayer && previousHitPlayer !== player.playerLabel && this.time - (enemy.lastHitTime || 0) < 0.95;
    enemy.lastHitPlayer = player.playerLabel;
    enemy.lastHitTime = this.time;
    const finisher = Boolean(spec.finisher) || kind === "special" || kind === "dash";
    const power = kind === "powerFinish" || kind === "voltRush" || kind === "groundSlam" || kind === "coopSuper" || spec.super;
    const heavy = finisher || power || kind === "punch3";
    const weapon = spec.weapon ? WEAPONS[spec.weapon] : null;
    const label = weapon ? (spec.weaponMode === "special" ? `${weapon.short} BURST` : spec.weaponMode === "heavy" ? `${weapon.short} CRUSH` : `${weapon.short} HIT`) : player.lastMoveName
      || ({ punch3: "SMASH", launchKick: "LAUNCH KICK", streetRush: "STREET RUSH", skyDrop: "SKY DROP", powerFinish: "POWER FINISH", voltRush: "VOLT RUSH", groundSlam: "ANVIL SLAM", coopSuper: "DUAL OVERDRIVE" }[kind])
      || (player.combo >= 6 ? "HARD HIT" : player.combo >= 3 ? "NICE" : "");
    this.freezeFrames = Math.max(this.freezeFrames, kind === "coopSuper" ? 16 : coopCombo ? 9 : power ? 12 : finisher ? 7 : 4);
    this.screenFlash = Math.max(this.screenFlash, kind === "coopSuper" ? 0.38 : coopCombo ? 0.2 : power ? 0.3 : finisher ? 0.16 : 0.08);
    this.shake = Math.max(this.shake, kind === "coopSuper" ? 0.72 : coopCombo ? 0.38 : power ? 0.58 : finisher ? 0.28 : 0.16);
    const hitSound = spec.weapon ? (spec.weaponMode === "light" ? "weapon" : "weaponHeavy") : heavy ? "hitHeavy" : kind === "kick" || kind === "launchKick" || kind === "skyDrop" ? "kick" : "punch";
    this.audio.sfx(hitSound);
    const hitY = enemy.y - enemy.h * 0.58 - enemy.z;
    const hitColor = weapon?.color || (power ? "#ffd15c" : kind === "skyDrop" ? "#37f5ff" : enemy.data.color);
    this.particles.burst(enemy.x, hitY, hitColor, spec.weapon ? 30 : power ? 34 : finisher ? 24 : 14, spec.weapon ? 280 : power ? 300 : finisher ? 240 : 160, heavy || spec.weapon ? "star" : "line");
    if (heavy) {
      this.particles.burst(enemy.x, hitY + 10, hitColor, power ? 16 : 10, power ? 210 : 160, "ring");
      this.particles.burst(enemy.x, enemy.y, "#c7d0dd", power ? 18 : 10, 140, "line");
    }
    if (power) {
      this.particles.burst(enemy.x - player.facing * 24, hitY - 6, player.fighter.colors.trim, kind === "coopSuper" ? 42 : 28, kind === "coopSuper" ? 340 : 280, "star");
      this.particles.burst(enemy.x, enemy.y + 2, kind === "groundSlam" ? "#c7d0dd" : "#ffd15c", kind === "groundSlam" ? 34 : 20, 230, kind === "groundSlam" ? "line" : "ring");
    }
    if (coopCombo) {
      this.particles.burst(enemy.x, hitY - 4, "#ffffff", 22, 260, "star");
      this.particles.burst(enemy.x, hitY + 12, "#37f5ff", 16, 220, "ring");
      this.addPopup("CO-OP COMBO", enemy.x, hitY - 58, "#37f5ff", 0.62, 0.9);
    }
    if (spec.weapon) {
      this.particles.burst(enemy.x, hitY + 4, weapon.glow, spec.weaponMode === "special" ? 18 : 10, 230, "ring");
      this.consumeWeaponUse(spec, enemy.x, enemy.y, player);
    }
    this.applyEnemyReaction(enemy, spec, player);
    if (spec.crit) this.addPopup("CRIT", enemy.x + 20, hitY - 72, "#ffd15c", 0.52, 0.72);
    if (label) this.addPopup(label, enemy.x, hitY - 30, weapon?.glow || (power ? "#ffd15c" : "#ffffff"), power || spec.weaponMode === "special" ? 0.65 : 0.45, 0.82);
  }

  resolveObjects() {
    for (const player of this.activePlayers()) {
      const rawSpec = player.attackSpec();
      if (!rawSpec) continue;
      const spec = { ...rawSpec, id: `${player.playerLabel}:${rawSpec.id}` };
      for (const o of this.level.objects) {
        if (o.dead) continue;
        if (Math.abs(o.x - player.x) < spec.range && Math.abs(o.y - player.y) < spec.arc) {
          if (o.lastHit === spec.id) continue;
          o.lastHit = spec.id;
          this.freezeFrames = Math.max(this.freezeFrames, 3);
          o.health -= spec.damage;
          o.hitFlash = 0.12;
          this.particles.burst(o.x, o.y - 22, "#ffd15c", spec.finisher ? 18 : 10, spec.finisher ? 180 : 130, spec.finisher ? "star" : "line");
          this.consumeWeaponUse(spec, o.x, o.y, player);
          if (o.health <= 0) {
            o.dead = true;
            player.score += 45;
            this.awardScrap(o.type === "explosive" ? 14 : 7, "object");
            this.audio.sfx("ko");
            this.addPopup("BONUS", o.x, o.y - 48, "#ffd15c", 0.3, 0.7);
            if (o.type === "explosive") this.addHazard("explosive", o.x, o.y, 0.03);
            if (Math.random() < 0.42) this.spawnPickup(o.x, o.y, "weapon", this.randomWeaponId(), 9);
            else if (Math.random() < 0.75) this.spawnPickup(o.x, o.y, Math.random() < 0.55 ? "gem" : "health");
          }
        }
      }
    }
  }

  resolvePickups() {
    for (const pickup of this.level.pickups) {
      if (pickup.taken) continue;
      const candidates = this.activePlayers()
        .filter((player) => this.pickupInRange(player, pickup))
        .sort((a, b) => this.pickupDistance(a, pickup) - this.pickupDistance(b, pickup));
      if (candidates.length) {
        pickup.inRange = true;
        pickup.hintPlayer = candidates[0].playerLabel;
      }
      if (!candidates.length) continue;
      for (const player of candidates) {
        if (pickup.type === "weapon") {
          const wantsSwap = this.input.pressed("pickup", player.inputId);
          if (pickup.pickupCooldown > 0 && pickup.ownerId === player.playerLabel) continue;
          if (player.weapon && !wantsSwap) continue;
          if (player.weapon && wantsSwap) {
            const old = player.dropWeapon();
            this.spawnPickup(player.x - player.facing * 34, player.y, "weapon", old.id, 7.5, { ownerId: player.playerLabel, pickupCooldown: 0.55 });
          }
          pickup.taken = true;
          this.stageRunStats.pickupsCollected++;
          player.equipWeapon(pickup.weapon || "pipe");
          const weapon = WEAPONS[player.weapon.id] || WEAPONS.pipe;
          this.audio.sfx("weaponPickup");
          this.addPopup(weapon.short, pickup.x, pickup.y - 64, weapon.glow, 0.5, 0.85);
          this.particles.burst(pickup.x, pickup.y - 30, weapon.color, 22, 190, "star");
          this.particles.burst(pickup.x, pickup.y - 24, weapon.glow, 13, 150, "ring");
          break;
        }
        pickup.taken = true;
        this.stageRunStats.pickupsCollected++;
        if (pickup.type === "health") player.health = Math.min(player.maxHealth, player.health + 32);
        if (pickup.type === "gem") {
          player.score += 250;
          this.awardScrap(18, "gem");
        }
        if (pickup.type === "power") player.powerTimer = 8;
        this.audio.sfx("pickup");
        const label = pickup.type === "health" ? "HEALTH" : pickup.type === "power" ? "POWER" : "BONUS";
        const color = pickup.type === "health" ? "#7cff70" : pickup.type === "power" ? "#ff4fd8" : "#37f5ff";
        this.addPopup(label, pickup.x, pickup.y - 52, color, 0.42, 0.78);
        this.particles.burst(pickup.x, pickup.y - 26, "#ffffff", 18, 180, "star");
        this.particles.burst(pickup.x, pickup.y - 20, color, 12, 140, "ring");
        break;
      }
    }
  }

  pickupRadius(player, pickup, hint = false) {
    const base = pickup.type === "weapon" ? 138 : 124;
    const visualPadding = pickup.type === "weapon" ? 24 : 18;
    const magnet = player.upgrades?.magnet || 0;
    return base + visualPadding + magnet + (hint ? 18 : 0);
  }

  pickupDistance(player, pickup) {
    const dx = pickup.x - player.x;
    const dy = (pickup.y - player.y) * 0.55;
    return Math.hypot(dx, dy);
  }

  pickupInRange(player, pickup, hint = false) {
    if (!player || player.health <= 0 || pickup.taken) return false;
    const dx = Math.abs(pickup.x - player.x);
    const dy = Math.abs(pickup.y - player.y);
    const radius = this.pickupRadius(player, pickup, hint);
    const circular = this.pickupDistance(player, pickup) <= radius;
    const expandedRect = dx <= radius * 0.92 && dy <= radius * 0.68;
    return circular || expandedRect;
  }

  awardScrap(amount, source = "score") {
    const result = this.progression.addScrap(amount, source);
    const gained = result?.gained ?? result ?? 0;
    if (this.stageRunStats) this.stageRunStats.scrapEarned += gained;
    if (gained > 0 && (source === "wave" || source === "stage" || source === "boss")) {
      this.addPopup(`+${gained} SCRAP`, this.level.cameraX + 220, this.level.bounds.top - 46, "#ffd15c", 0.38, 0.85);
    }
    return gained;
  }

  onStageCleared() {
    if (this.stageClearHandled || this.mode !== "play") return;
    this.stageClearHandled = true;
    this.level.completed = true;
    this.stageCompleteTimer = 1.2;
    const score = stageScore(this.players);
    const combo = bestCombo(this.players);
    const clearScrap = 85 + this.stageIndex * 30 + Math.floor(score / 1200);
    this.awardScrap(clearScrap, this.stageIndex === LEVELS.length - 1 ? "boss" : "stage");
    this.stageSummary = {
      stageName: this.level.name,
      enemiesDefeated: this.stageRunStats.enemiesDefeated,
      comboMax: combo,
      scrapEarned: this.stageRunStats.scrapEarned,
      pickupsCollected: this.stageRunStats.pickupsCollected
    };
    this.progression.recordStage(this.stageIndex, score, combo, true);
    this.monetization.analytics.track("stage_cleared", { stage: this.stageIndex + 1, score, combo });
    this.screenFlash = Math.max(this.screenFlash, 0.22);
    this.shake = Math.max(this.shake, 0.24);
    this.players.forEach((player) => {
      if (player.health > 0) {
        player.state = "victory";
        player.health = Math.min(player.maxHealth, player.health + 18);
      }
    });
    if (this.stageIndex >= LEVELS.length - 1 || this.runMode === "stage") {
      this.mode = "victory";
      return;
    }
    this.setupUpgradeChoices(0);
  }

  setupUpgradeChoices(playerIndex) {
    const livingPlayers = this.players.filter(Boolean);
    if (playerIndex >= livingPlayers.length) {
      this.nextStage();
      return;
    }
    this.upgradePlayerIndex = playerIndex;
    this.pendingUpgrades = this.progression.randomUpgrades(playerIndex, this.stageIndex);
    this.mode = "upgrade";
  }

  chooseUpgrade(index) {
    if (this.mode !== "upgrade" || !this.pendingUpgrades.length) return;
    const card = this.pendingUpgrades[index] || this.pendingUpgrades[0];
    const player = this.players[this.upgradePlayerIndex] || this.players[0];
    applyUpgradeToPlayer(player, card);
    this.progression.analytics?.push?.({ type: "upgrade", id: card.id });
    this.addPopup(card.name.toUpperCase(), player.x, player.y - 92, "#37f5ff", 0.48, 0.9);
    this.setupUpgradeChoices(this.upgradePlayerIndex + 1);
  }

  nextStage() {
    if (this.stageIndex >= LEVELS.length - 1) {
      this.mode = "victory";
      return;
    }
    this.stageIndex++;
    this.level = new Level(this.stageIndex);
    this.waveManager = new WaveManager(this.level);
    this.players.forEach((player, index) => {
      player.x = 90 + index * 70;
      player.y = this.level.bounds.top + 112 + index * 30;
      player.z = 0;
      player.vz = 0;
      player.reviveProgress = 0;
      player.combo = 0;
      player.comboTimer = 0;
      player.attackTimer = 0;
      player.attackWindow = 0;
      player.invuln = 1.1;
      if (player.health <= 0 && player.lives > 0) player.revive(player.x, player.y, 0.55);
    });
    this.syncPrimaryPlayer();
    this.enemies = [];
    this.popups = [];
    this.stageElapsed = 0;
    this.stageRunStats = this.emptyStageRunStats();
    this.stageSummary = null;
    this.tutorial = this.createTutorialState();
    this.superReadyTimer = 0;
    this.miniBossTeaseTimer = 0;
    this.pendingUpgrades = [];
    this.stageTitleTimer = 2.4;
    this.transitionWipeTimer = 0.9;
    this.bossWarningTimer = 0;
    this.stageClearHandled = false;
    this.mode = "play";
    for (const player of this.players) this.particles.burst(player.x, player.y - 44, "#37f5ff", 18, 180);
  }
}
