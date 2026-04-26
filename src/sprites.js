const EMPTY = ".";

function blank(w, h) {
  return Array.from({ length: h }, () => Array(w).fill(EMPTY));
}

function setPx(map, x, y, c) {
  x = Math.round(x);
  y = Math.round(y);
  if (map[y] && x >= 0 && x < map[y].length && c !== EMPTY) map[y][x] = c;
}

function box(map, x, y, w, h, c) {
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) setPx(map, x + xx, y + yy, c);
}

function ellipse(map, cx, cy, rx, ry, c) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) setPx(map, x, y, c);
    }
  }
}

function outlinedEllipse(map, cx, cy, rx, ry, fill, outline = "o") {
  ellipse(map, cx, cy, rx + 1.6, ry + 1.4, outline);
  ellipse(map, cx, cy, rx, ry, fill);
}

function spanBody(map, cx, y, spans, fill, shadow = "d", light = "l", outline = "o") {
  spans.forEach((w, i) => {
    const yy = y + i;
    const x = Math.round(cx - w / 2);
    box(map, x - 1, yy, w + 2, 1, outline);
    box(map, x, yy, w, 1, fill);
    if (w > 8) {
      setPx(map, x + 2, yy, shadow);
      setPx(map, x + w - 3, yy, light);
    }
  });
}

function limb(map, x0, y0, x1, y1, width, fill, outline = "o", light = null) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const taper = width * (1 - Math.abs(t - 0.5) * 0.35);
    ellipse(map, x, y, taper + 1, taper * 0.72 + 1, outline);
    ellipse(map, x, y, taper, taper * 0.62, fill);
    if (light && i % 3 === 0) setPx(map, x + taper * 0.35, y - taper * 0.25, light);
  }
}

function boot(map, x, y, facing, heavy = false) {
  const w = heavy ? 8 : 6;
  box(map, x - 1, y - 1, w + 3, 4, "o");
  box(map, x, y, w, 3, "b");
  box(map, x + facing * 4, y + 1, heavy ? 7 : 5, 3, "o");
  box(map, x + facing * 4, y + 1, heavy ? 6 : 4, 2, "b");
}

function glove(map, x, y, w, h, c = "g") {
  outlinedEllipse(map, x, y, w, h, c);
  setPx(map, x + w * 0.2, y - h * 0.35, "l");
}

function faceMood(kind, pose) {
  if (pose === "KO" || pose === "ko") return "ko";
  if (pose === "hurt" || pose === "knockdown" || pose === "shock" || pose === "slamCrush" || pose === "groundBounce" || pose === "wallBounce") return "hurt";
  if (pose === "phase2" || pose === "phaseShift") return kind === "boss" ? "rage" : "attack";
  if (pose.includes("punch") || pose.includes("kick") || pose.includes("attack") || pose.includes("special") || pose.includes("super") || pose.includes("weapon")) return "attack";
  if (pose.includes("victory")) return "smirk";
  return "idle";
}

function drawFace(map, cx, headY, kind, pose) {
  const boss = kind === "boss";
  const thin = kind === "blade";
  const mood = faceMood(kind, pose);
  const y = headY + (boss ? 7 : 6);
  const eye = mood === "rage" ? "g" : kind === "jax" || thin ? "t" : kind === "rook" ? "l" : "d";
  const brow = mood === "rage" || mood === "attack" ? "o" : "d";
  const mouth = mood === "hurt" || mood === "ko" ? "o" : "d";

  if (mood === "ko") {
    setPx(map, cx - 4, y, "d");
    setPx(map, cx - 3, y + 1, "d");
    setPx(map, cx + 3, y, "d");
    setPx(map, cx + 4, y + 1, "d");
    box(map, cx - 4, y + 6, 8, 1, "d");
    setPx(map, cx + 5, y + 6, "s");
  } else if (kind === "jax" || thin) {
    box(map, cx - 6, y - 1, 5, 2, eye);
    box(map, cx + 1, y - 1, 6, 2, eye);
    setPx(map, cx - 5, y - 2, brow);
    setPx(map, cx + 4, y - 2, brow);
  } else if (boss) {
    box(map, cx - 6, y - 1, 5, 2, eye);
    box(map, cx + 2, y - 1, 5, 2, eye);
    box(map, cx - 8, y - 3, 6, 1, brow);
    box(map, cx + 2, y - 3, 6, 1, brow);
  } else {
    setPx(map, cx - 4, y, eye);
    setPx(map, cx + 4, y, eye);
    box(map, cx - 6, y - 2, 4, 1, brow);
    box(map, cx + 2, y - 2, 4, 1, brow);
  }

  setPx(map, cx + (mood === "hurt" ? -1 : 0), y + 3, "d");
  setPx(map, cx + 1, y + 4, "s");
  if (mood === "hurt") {
    box(map, cx - 4, y + 6, 8, 2, mouth);
    setPx(map, cx + 5, y + 7, "w");
  } else if (mood === "attack" || mood === "rage") {
    box(map, cx - 3, y + 6, 7, 1, mouth);
    setPx(map, cx + 4, y + 6, "w");
  } else if (mood === "smirk") {
    box(map, cx - 3, y + 6, 5, 1, mouth);
    setPx(map, cx + 3, y + 5, "w");
  } else {
    box(map, cx - 2, y + 6, 5, 1, mouth);
  }
  box(map, cx - 4, y + (boss ? 10 : 8), 8, 1, "d");
  if (boss && mood === "rage") {
    setPx(map, cx - 9, y + 1, "g");
    setPx(map, cx + 9, y + 1, "g");
    box(map, cx - 5, y + 8, 10, 2, "o");
    setPx(map, cx - 2, y + 9, "w");
    setPx(map, cx + 2, y + 9, "w");
  }
}

function detailedHand(map, x, y, facing, pose = "fist", heavy = false, kind = "") {
  const boss = kind === "boss";
  const claw = boss || pose === "claw";
  const fill = claw ? "a" : "g";
  const rw = boss ? 6.8 : heavy ? 4.8 : 3.8;
  const rh = boss ? 5.2 : heavy ? 4.1 : 3.2;
  outlinedEllipse(map, x, y, rw, rh, fill);
  setPx(map, x + facing * rw * 0.25, y - rh * 0.45, "l");

  if (pose === "open" || pose === "block") {
    for (let i = -2; i <= 2; i++) {
      box(map, x + facing * (rw + 1), y + i * 1.3 - 4, facing > 0 ? 3 : -3, 2, "o");
      box(map, x + facing * rw, y + i * 1.3 - 3, facing > 0 ? 2 : -2, 1, fill);
    }
    box(map, x - 1, y + rh - 1, 3, 2, "l");
    return;
  }

  if (pose === "grip") {
    box(map, x - 2, y - 4, 5, 8, "o");
    box(map, x - 1, y - 3, 3, 6, fill);
    box(map, x + facing * 3, y - 4, 2, 8, "d");
    setPx(map, x - facing * 4, y + 1, "l");
    return;
  }

  if (claw) {
    for (let i = -1; i <= 1; i++) {
      box(map, x + facing * (rw + 1), y + i * 3 - 3, facing > 0 ? 5 : -5, 2, "o");
      setPx(map, x + facing * (rw + 5), y + i * 3 - 3, "w");
    }
    box(map, x - facing * 3, y + 3, 4, 2, "d");
    return;
  }

  for (let i = 0; i < 4; i++) {
    const xx = x + facing * (i * 1.5 - 1);
    box(map, xx, y - rh + 1 + (i % 2), 2, 2, "l");
  }
  box(map, x - facing * 3, y + rh - 2, 4, 2, "d");
}

function jointPad(map, x, y, heavy = false, c = "t") {
  outlinedEllipse(map, x, y, heavy ? 2.7 : 2.1, heavy ? 2.1 : 1.7, c, "o");
  setPx(map, x + 1, y - 1, "l");
}

function addDither(map, x, y, w, h, c) {
  for (let yy = 0; yy < h; yy += 2) {
    for (let xx = yy % 4; xx < w; xx += 4) setPx(map, x + xx, y + yy, c);
  }
}

function poseOffsets(pose) {
  const data = {
    idle0: { bob: 0, lean: 0, arm: 0, step: 0 },
    idle1: { bob: -1, lean: 0, arm: 0, step: 0 },
    idle2: { bob: 0, lean: 0, arm: 1, step: 0 },
    walk0: { bob: 0, lean: 0, arm: -3, step: -4 },
    walk1: { bob: -1, lean: 0, arm: 0, step: 0 },
    walk2: { bob: 0, lean: 0, arm: 3, step: 4 },
    walk3: { bob: -1, lean: 0, arm: 0, step: 0 },
    run0: { bob: -1, lean: 3, arm: -5, step: -7 },
    run1: { bob: -2, lean: 5, arm: 0, step: 0 },
    run2: { bob: -1, lean: 3, arm: 5, step: 7 },
    punch1a: { bob: 0, lean: -1, arm: -5, step: -1 },
    punch1b: { bob: 0, lean: 2, arm: 8, step: 0, punch: 1 },
    punch1c: { bob: 0, lean: 0, arm: 2, step: 0 },
    punch2a: { bob: 0, lean: -2, arm: -6, step: 1 },
    punch2b: { bob: -1, lean: 3, arm: 10, step: -1, punch: 2 },
    punch2c: { bob: 0, lean: 0, arm: 1, step: 0 },
    punch3a: { bob: 1, lean: -4, arm: -8, step: -2 },
    punch3b: { bob: -1, lean: 5, arm: 14, step: 3, punch: 3, smear: 1 },
    punch3c: { bob: 0, lean: 1, arm: 4, step: 0 },
    kicka: { bob: 0, lean: -3, arm: -2, step: -1 },
    kickb: { bob: -1, lean: -5, arm: 2, step: 2, kick: 1 },
    kickc: { bob: 0, lean: 0, arm: 0, step: 0 },
    jump: { bob: -5, lean: 0, arm: 1, step: 0, jump: 1 },
    jumpAttack: { bob: -6, lean: 4, arm: 3, step: 0, kick: 1, jump: 1 },
    dashAttack: { bob: -1, lean: 8, arm: 10, step: 5, punch: 2, smear: 1 },
    block: { bob: 2, lean: -2, arm: 0, step: 0, block: 1 },
    hurt: { bob: 2, lean: -7, arm: -4, step: -2, hurt: 1 },
    knockdown: { bob: 18, lean: -9, arm: -4, step: 0, down: 1 },
    getUp: { bob: 7, lean: -3, arm: 0, step: 0, getup: 1 },
    speciala: { bob: -1, lean: 0, arm: 4, step: 0, special: 1 },
    specialb: { bob: -2, lean: 2, arm: 8, step: 0, special: 2 },
    specialc: { bob: -1, lean: -1, arm: 3, step: 0, special: 3 },
    superCharge: { bob: -3, lean: -3, arm: -8, step: -2, special: 1, super: 1 },
    superRush: { bob: -3, lean: 10, arm: 18, step: 6, punch: 3, special: 2, super: 2, smear: 1 },
    superImpact: { bob: -1, lean: 6, arm: 24, step: 4, punch: 3, special: 3, super: 3, smear: 1 },
    superRecover: { bob: 2, lean: -2, arm: 4, step: 0, special: 1, super: 1 },
    weaponLightA: { bob: 0, lean: -2, arm: -8, step: -1, weapon: 1 },
    weaponLightB: { bob: -1, lean: 5, arm: 14, step: 2, weapon: 2, punch: 2, smear: 1 },
    weaponLightC: { bob: 0, lean: 1, arm: 5, step: 0, weapon: 1 },
    weaponHeavyA: { bob: 2, lean: -8, arm: -12, step: -3, weapon: 1 },
    weaponHeavyB: { bob: -2, lean: 7, arm: 20, step: 3, weapon: 3, punch: 3, smear: 1 },
    weaponHeavyC: { bob: 1, lean: 0, arm: 5, step: 0, weapon: 1 },
    weaponSpecialA: { bob: -2, lean: -5, arm: -13, step: -2, weapon: 1, special: 1 },
    weaponSpecialB: { bob: -4, lean: 8, arm: 24, step: 4, weapon: 3, special: 3, smear: 1 },
    weaponSpecialC: { bob: 1, lean: 1, arm: 6, step: 0, weapon: 1, special: 2 },
    shock: { bob: -2, lean: -6, arm: 10, step: -2, hurt: 1, shock: 1 },
    slamCrush: { bob: 13, lean: -11, arm: -6, step: 0, down: 1, crush: 1 },
    spin: { bob: -1, lean: 9, arm: -12, step: 3, hurt: 1, spin: 1 },
    wallBounce: { bob: 4, lean: -14, arm: -10, step: -2, hurt: 1 },
    groundBounce: { bob: 16, lean: -7, arm: -4, step: 0, down: 1 },
    revive0: { bob: 10, lean: -7, arm: 2, step: 0, getup: 1 },
    revive1: { bob: 4, lean: -2, arm: 2, step: 0, getup: 1 },
    phaseShift: { bob: -3, lean: 1, arm: 12, step: 0, special: 3, super: 2 },
    KO: { bob: 18, lean: -10, arm: -6, step: 0, down: 1 },
    victory0: { bob: -3, lean: 0, arm: 0, step: 0, victory: 1 },
    victory1: { bob: -4, lean: 1, arm: 2, step: 0, victory: 1 }
  };
  return data[pose] || data.idle0;
}

function makeHumanoid(kind, pose = "idle0") {
  const boss = kind === "boss";
  const heavy = kind === "rook" || kind === "brute" || boss;
  const thin = kind === "blade";
  const thug = kind === "thug";
  const w = boss ? 64 : 48;
  const h = boss ? 80 : 64;
  const map = blank(w, h);
  const p = poseOffsets(pose);
  const cx = Math.round(w / 2 + p.lean);
  const footY = h - 5 + Math.min(6, p.bob);

  if (p.down) {
    limb(map, cx - 15, footY - 10, cx + 15, footY - 7, heavy ? 4.4 : 3.5, "j", "o", "l");
    outlinedEllipse(map, cx - 10, footY - 17, heavy ? 6 : 5, 5, "s");
    drawFace(map, cx - 10, footY - 24, kind, pose);
    limb(map, cx - 21, footY - 5, cx - 8, footY - 5, heavy ? 4 : 3.4, "b");
    limb(map, cx + 6, footY - 4, cx + 21, footY - 4, heavy ? 4 : 3.4, "b");
    detailedHand(map, cx - 21, footY - 12, -1, pose === "slamCrush" ? "open" : "fist", heavy, kind);
    detailedHand(map, cx + 21, footY - 12, 1, pose === "groundBounce" ? "open" : "fist", heavy, kind);
    box(map, cx - 5, footY - 18, 7, 2, "l");
    if (p.crush) {
      box(map, cx - 25, footY - 1, 50, 2, "o");
      box(map, cx - 18, footY - 4, 36, 1, "t");
    }
    return map.map((r) => r.join(""));
  }

  const headY = footY - (boss ? 67 : 52) + p.bob;
  const torsoY = headY + (boss ? 17 : 13);
  const torsoH = boss ? 24 : heavy ? 19 : thin ? 17 : 18;
  const torsoSpans = [];
  for (let i = 0; i < torsoH; i++) {
    const q = i / Math.max(1, torsoH - 1);
    const shoulder = boss ? 28 : heavy ? 22 : thin ? 13 : thug ? 17 : 16;
    const waist = boss ? 17 : heavy ? 16 : thin ? 9 : 11;
    const width = Math.round(shoulder * (1 - q) + waist * q + Math.sin(q * Math.PI) * (heavy ? 3 : 2));
    torsoSpans.push(width);
  }

  outlinedEllipse(map, cx, headY + 7, boss ? 9 : heavy ? 7 : thin ? 5.5 : 6, boss ? 8 : 6.5, "s");
  ellipse(map, cx, headY + 3, boss ? 9 : heavy ? 7 : 6, 3, "h");
  if (kind === "jax") {
    box(map, cx - 8, headY + 6, 16, 2, "t");
    box(map, cx + 5, headY + 5, 8, 1, "l");
    box(map, cx - 12, headY + 7, 7, 2, "t");
  } else if (kind === "rook") {
    box(map, cx - 9, headY + 13, 18, 3, "t");
    box(map, cx - 4, headY + 7, 8, 2, "l");
  } else if (thin) {
    box(map, cx - 6, headY + 6, 13, 3, "t");
    box(map, cx + 5, headY + 7, 6, 2, "g");
  } else if (boss) {
    box(map, cx - 15, headY + 7, 9, 5, "a");
    box(map, cx + 6, headY + 7, 9, 5, "a");
    box(map, cx - 4, headY + 8, 8, 3, pose === "phase2" ? "g" : "t");
  } else {
    box(map, cx - 5, headY + 7, 3, 2, "d");
    box(map, cx + 2, headY + 7, 3, 2, "l");
  }
  drawFace(map, cx, headY, kind, pose);

  spanBody(map, cx, torsoY, torsoSpans, "j", "d", "l");
  addDither(map, cx - Math.round(torsoSpans[1] / 2) + 2, torsoY + 3, Math.max(7, torsoSpans[1] - 4), torsoH - 5, "d");
  box(map, cx - 3, torsoY + torsoH - 3, 6, 2, "o");
  box(map, cx - 2, torsoY + torsoH - 4, 4, 1, "t");
  for (let seam = 4; seam < torsoH - 4; seam += 5) {
    setPx(map, cx - Math.round(torsoSpans[Math.min(seam, torsoSpans.length - 1)] / 2) + 3, torsoY + seam, "l");
    setPx(map, cx + Math.round(torsoSpans[Math.min(seam, torsoSpans.length - 1)] / 2) - 4, torsoY + seam, "d");
  }
  if (kind === "jax") {
    box(map, cx - 6, torsoY + 4, 3, torsoH - 5, "t");
    box(map, cx + 4, torsoY + 12, 8, 2, "t");
    box(map, cx - 11, torsoY + 6, 5, 2, "l");
    box(map, cx + 7, torsoY + 5, 7, 2, "t");
  }
  if (kind === "rook") {
    box(map, cx - 13, torsoY + 3, 5, torsoH - 3, "d");
    box(map, cx + 8, torsoY + 3, 5, torsoH - 3, "d");
    box(map, cx - 5, torsoY + 7, 10, 3, "l");
    outlinedEllipse(map, cx - 12, torsoY + 4, 3, 3, "t");
    outlinedEllipse(map, cx + 12, torsoY + 4, 3, 3, "t");
  }
  if (thug) {
    box(map, cx - 8, torsoY + torsoH - 5, 16, 3, "d");
    box(map, cx - 5, torsoY + 2, 5, 3, "l");
  }
  if (boss) {
    outlinedEllipse(map, cx - 18, torsoY + 4, 8, 6, "a");
    outlinedEllipse(map, cx + 18, torsoY + 4, 8, 6, "a");
    outlinedEllipse(map, cx, torsoY + 11, 5, 5, pose === "phase2" || p.special ? "g" : "t");
    box(map, cx - 3, torsoY + 8, 6, 8, "g");
    box(map, cx - 20, torsoY + 14, 40, 2, "o");
    box(map, cx - 16, torsoY + 18, 32, 2, "a");
  }

  const shoulderY = torsoY + 6;
  const hipY = torsoY + torsoH - 1;
  let rHand = { x: cx + (boss ? 24 : heavy ? 18 : 13) + p.arm, y: shoulderY + 6 };
  let lHand = { x: cx - (boss ? 24 : heavy ? 18 : 13) - p.arm * 0.4, y: shoulderY + 6 };
  if (p.punch === 1) rHand = { x: cx + (heavy ? 25 : 22), y: shoulderY + 5 };
  if (p.punch === 2) rHand = { x: cx + (heavy ? 28 : 25), y: shoulderY + 1 };
  if (p.punch === 3) rHand = { x: cx + (heavy ? 32 : 29), y: shoulderY + 8 };
  if (p.block) {
    rHand = { x: cx + 8, y: shoulderY + 7 };
    lHand = { x: cx - 8, y: shoulderY + 8 };
  }
  if (p.special) {
    rHand = { x: cx + (heavy ? 24 : 21), y: shoulderY + 1 };
    lHand = { x: cx - (heavy ? 24 : 21), y: shoulderY + 1 };
  }
  if (p.weapon) {
    rHand = { x: cx + (heavy ? 28 : 25), y: shoulderY + (p.weapon >= 3 ? -2 : 3) };
    lHand = p.weapon >= 2 ? { x: cx + (heavy ? 13 : 11), y: shoulderY + 8 } : { x: cx - (heavy ? 18 : 14), y: shoulderY + 8 };
  }
  if (p.shock) {
    rHand = { x: cx + (heavy ? 23 : 18), y: shoulderY - 2 };
    lHand = { x: cx - (heavy ? 22 : 17), y: shoulderY + 12 };
  }
  if (p.spin) {
    rHand = { x: cx - (heavy ? 21 : 17), y: shoulderY + 2 };
    lHand = { x: cx + (heavy ? 20 : 16), y: shoulderY + 12 };
  }
  if (p.victory) rHand = { x: cx + 8, y: headY - 4 };
  limb(map, cx - Math.round(torsoSpans[3] / 2), shoulderY, lHand.x, lHand.y, heavy ? 3.6 : 2.8, "g", "o", "l");
  limb(map, cx + Math.round(torsoSpans[3] / 2), shoulderY, rHand.x, rHand.y, heavy ? 3.8 : 3, "g", "o", "l");
  jointPad(map, (cx - Math.round(torsoSpans[3] / 2) + lHand.x) / 2, (shoulderY + lHand.y) / 2, heavy, kind === "jax" ? "t" : "a");
  jointPad(map, (cx + Math.round(torsoSpans[3] / 2) + rHand.x) / 2, (shoulderY + rHand.y) / 2, heavy, kind === "jax" ? "t" : "a");
  const lPose = p.block ? "open" : p.weapon ? "grip" : p.special ? "open" : boss ? "claw" : p.hurt ? "open" : "fist";
  const rPose = p.block ? "open" : p.weapon ? "grip" : p.special ? "open" : boss ? "claw" : "fist";
  detailedHand(map, lHand.x, lHand.y, -1, lPose, heavy, kind);
  detailedHand(map, rHand.x, rHand.y, 1, rPose, heavy, kind);
  if (thin && (pose === "attack" || p.punch)) {
    limb(map, rHand.x + 3, rHand.y, rHand.x + 15, rHand.y - 3, 1.2, "g", "g", "l");
  }
  if (p.smear) {
    limb(map, rHand.x - 6, rHand.y + 2, rHand.x + 11, rHand.y + 1, 1.5, "g", "t", "l");
  }
  if (p.weapon) {
    limb(map, rHand.x + 3, rHand.y - 3, rHand.x + 20 + p.weapon * 4, rHand.y - 10 + p.weapon * 4, 1.3 + p.weapon * 0.15, p.weapon >= 3 ? "l" : "t", "o", "w");
    if (p.weapon >= 2) box(map, rHand.x + 15, rHand.y - 12 + p.weapon * 3, 17, 4, "g");
  }
  if (p.shock) {
    for (let i = -1; i <= 1; i++) box(map, cx + i * 8, torsoY - 2 + i * 3, 4, 2, "g");
  }

  let lKnee = { x: cx - (heavy ? 7 : 5) - p.step * 0.3, y: hipY + 12 };
  let rKnee = { x: cx + (heavy ? 7 : 5) + p.step * 0.3, y: hipY + 12 };
  let lFoot = { x: cx - (heavy ? 8 : 6) - p.step, y: footY };
  let rFoot = { x: cx + (heavy ? 8 : 6) + p.step, y: footY };
  if (p.jump) {
    lKnee.y -= 8; rKnee.y -= 6; lFoot.y -= 10; rFoot.y -= 8;
  }
  if (p.kick) {
    rKnee = { x: cx + 14, y: hipY + 8 };
    rFoot = { x: cx + 28, y: hipY + 9 };
  }
  limb(map, cx - 6, hipY, lKnee.x, lKnee.y, heavy ? 3.6 : 2.8, "j", "o", "l");
  limb(map, lKnee.x, lKnee.y, lFoot.x, lFoot.y - 2, heavy ? 3.2 : 2.6, "j", "o", "l");
  limb(map, cx + 6, hipY, rKnee.x, rKnee.y, heavy ? 3.6 : 2.8, "j", "o", "l");
  limb(map, rKnee.x, rKnee.y, rFoot.x, rFoot.y - 2, heavy ? 3.2 : 2.6, "j", "o", "l");
  jointPad(map, lKnee.x, lKnee.y, heavy, "t");
  jointPad(map, rKnee.x, rKnee.y, heavy, "t");
  boot(map, lFoot.x - (heavy ? 3 : 2), lFoot.y, -1, heavy);
  boot(map, rFoot.x - (heavy ? 1 : 1), rFoot.y, 1, heavy);

  if (p.special) {
    outlinedEllipse(map, cx - 19, torsoY + 4, 2.5, 2.5, "g", "t");
    outlinedEllipse(map, cx + 19, torsoY + 4, 2.5, 2.5, "g", "t");
    box(map, cx - 1, headY - 5, 3, 3, "g");
  }
  if (p.super) {
    box(map, cx - 26, torsoY + 3, 3, 16, "g");
    box(map, cx + 24, torsoY + 3, 3, 16, "g");
    box(map, cx - 14, headY - 4, 28, 2, "t");
    if (p.super >= 2) {
      box(map, cx + 18, shoulderY - 5, 16, 4, "g");
      box(map, cx + 28, shoulderY + 1, 9, 2, "w");
    }
  }
  if (pose === "phase2") {
    box(map, cx - 24, torsoY + 8, 2, 12, "g");
    box(map, cx + 22, torsoY + 8, 2, 12, "g");
  }
  return map.map((r) => r.join(""));
}

function frame(pose, duration, extra = {}) {
  return { pose, duration, ...extra };
}

function anim(sheet, states) {
  for (const [state, poses] of Object.entries(states)) {
    sheet.animations[state] = poses.map((pose) => ({
      duration: pose.duration || 0.1,
      map: `${sheet.key}:${pose.pose}`,
      offsetX: pose.offsetX || 0,
      offsetY: pose.offsetY || 0,
      hitbox: pose.hitbox || null
    }));
  }
}

function sheet(key, kind, palette, size) {
  const out = { key, kind, palette, size, maps: {}, animations: {} };
  const poses = [
    "idle0", "idle1", "idle2", "walk0", "walk1", "walk2", "walk3", "run0", "run1", "run2",
    "punch1a", "punch1b", "punch1c", "punch2a", "punch2b", "punch2c", "punch3a", "punch3b", "punch3c",
    "kicka", "kickb", "kickc", "jump", "jumpAttack", "dashAttack", "block", "hurt", "knockdown",
    "getUp", "speciala", "specialb", "specialc", "superCharge", "superRush", "superImpact", "superRecover",
    "weaponLightA", "weaponLightB", "weaponLightC", "weaponHeavyA", "weaponHeavyB", "weaponHeavyC",
    "weaponSpecialA", "weaponSpecialB", "weaponSpecialC", "shock", "slamCrush", "spin", "wallBounce",
    "groundBounce", "revive0", "revive1", "phaseShift", "KO", "victory0", "victory1", "attack", "phase2"
  ];
  for (const pose of poses) out.maps[`${key}:${pose}`] = makeHumanoid(kind, pose);
  return out;
}

const jax = sheet("jax", "jax", {
  o: "#05060a", s: "#ffd0a8", h: "#121529", j: "#1fd7ff", d: "#07506b", t: "#ff4fd8", g: "#ff4fd8", b: "#101727", l: "#baffff", a: "#37f5ff"
}, { w: 48, h: 64, scale: 2.72 });

const rook = sheet("mira", "rook", {
  o: "#05060a", s: "#d6a07a", h: "#18111f", j: "#b75cff", d: "#4a2f78", t: "#ffd15c", g: "#ffd15c", b: "#31283b", l: "#fff1a3", a: "#ffd15c"
}, { w: 48, h: 64, scale: 2.92 });

const thug = sheet("thug", "thug", {
  o: "#05060a", s: "#f2c08e", h: "#151312", j: "#69ff8f", d: "#253b2d", t: "#253b2d", g: "#222222", b: "#151515", l: "#a5ff80", a: "#69ff8f"
}, { w: 48, h: 64, scale: 2.38 });

const blade = sheet("blade", "blade", {
  o: "#05060a", s: "#f2c08e", h: "#11071a", j: "#d855ff", d: "#572061", t: "#37f5ff", g: "#37f5ff", b: "#14141f", l: "#f2d6ff", a: "#37f5ff"
}, { w: 48, h: 64, scale: 2.28 });

const brute = sheet("brute", "brute", {
  o: "#05060a", s: "#f2c08e", h: "#19120b", j: "#ffb341", d: "#7d5124", t: "#e9e1bd", g: "#e9e1bd", b: "#161616", l: "#fff0a8", a: "#ffb341"
}, { w: 48, h: 64, scale: 2.78 });

const boss = sheet("boss", "boss", {
  o: "#05060a", s: "#f0b19a", h: "#160a0d", j: "#ff4055", d: "#8c2738", t: "#37f5ff", g: "#ffdf6e", b: "#111622", l: "#ffdce1", a: "#4b587c"
}, { w: 64, h: 80, scale: 3.18 });

const playerStates = {
  idle: [frame("idle0", 0.16), frame("idle1", 0.16), frame("idle2", 0.16), frame("idle1", 0.16)],
  walk: [frame("walk0", 0.09), frame("walk1", 0.08), frame("walk2", 0.09), frame("walk3", 0.08)],
  run: [frame("run0", 0.065), frame("run1", 0.06), frame("run2", 0.065), frame("run1", 0.06)],
  punch1: [frame("punch1a", 0.045), frame("punch1a", 0.035, { offsetX: 1 }), frame("punch1b", 0.07, { hitbox: { x: 25, y: 22, w: 20, h: 10 } }), frame("punch1c", 0.085)],
  punch2: [frame("punch2a", 0.045), frame("punch2a", 0.035, { offsetX: -1 }), frame("punch2b", 0.075, { hitbox: { x: 25, y: 18, w: 22, h: 10 } }), frame("punch2c", 0.09)],
  punch3: [frame("punch3a", 0.06), frame("punch3a", 0.045, { offsetX: -2 }), frame("punch3b", 0.09, { hitbox: { x: 26, y: 24, w: 24, h: 12 } }), frame("punch3c", 0.13)],
  kick: [frame("kicka", 0.055), frame("kicka", 0.04, { offsetY: -1 }), frame("kickb", 0.105, { hitbox: { x: 28, y: 39, w: 20, h: 9 } }), frame("kickc", 0.12)],
  jump: [frame("jump", 0.13), frame("jump", 0.13, { offsetY: -2 })],
  jumpAttack: [frame("jump", 0.055), frame("jumpAttack", 0.085, { hitbox: { x: 28, y: 34, w: 20, h: 12 } }), frame("jumpAttack", 0.045, { offsetX: 2, hitbox: { x: 28, y: 34, w: 20, h: 12 } }), frame("jump", 0.08)],
  dash: [frame("run0", 0.04, { offsetX: -2 }), frame("dashAttack", 0.075, { hitbox: { x: 25, y: 22, w: 24, h: 14 } }), frame("run1", 0.08)],
  dashAttack: [frame("run0", 0.04, { offsetX: -2 }), frame("dashAttack", 0.075, { hitbox: { x: 25, y: 22, w: 24, h: 14 } }), frame("run1", 0.08)],
  block: [frame("block", 0.16)],
  hit: [frame("hurt", 0.12), frame("idle1", 0.08)],
  hurt: [frame("hurt", 0.12), frame("idle1", 0.08)],
  knockdown: [frame("hurt", 0.08), frame("knockdown", 0.18)],
  getup: [frame("getUp", 0.12), frame("idle1", 0.1)],
  getUp: [frame("getUp", 0.12), frame("idle1", 0.1)],
  special: [frame("superCharge", 0.09, { offsetX: -1 }), frame("speciala", 0.075, { offsetY: -1 }), frame("specialb", 0.12, { hitbox: { x: 4, y: 16, w: 40, h: 26 } }), frame("specialc", 0.13), frame("superRecover", 0.09)],
  super: [frame("superCharge", 0.12, { offsetX: -2 }), frame("superCharge", 0.08, { offsetY: -2 }), frame("superRush", 0.075, { hitbox: { x: 9, y: 15, w: 43, h: 28 } }), frame("superImpact", 0.11, { hitbox: { x: 5, y: 19, w: 46, h: 31 } }), frame("superRecover", 0.14)],
  voltRush: [frame("superCharge", 0.08, { offsetX: -2 }), frame("superRush", 0.065, { hitbox: { x: 8, y: 16, w: 44, h: 25 } }), frame("superRush", 0.055, { offsetX: 3, hitbox: { x: 8, y: 16, w: 44, h: 25 } }), frame("superImpact", 0.09, { hitbox: { x: 5, y: 18, w: 46, h: 30 } }), frame("superRecover", 0.12)],
  groundSlam: [frame("superCharge", 0.12, { offsetY: -2 }), frame("weaponHeavyA", 0.09, { offsetX: -2 }), frame("superImpact", 0.14, { hitbox: { x: 2, y: 26, w: 50, h: 30 } }), frame("groundBounce", 0.09, { offsetY: 3 }), frame("superRecover", 0.16)],
  coopSuper: [frame("phaseShift", 0.11, { offsetY: -3 }), frame("superCharge", 0.08), frame("superRush", 0.08, { hitbox: { x: 5, y: 12, w: 48, h: 32 } }), frame("superImpact", 0.14, { hitbox: { x: 0, y: 16, w: 52, h: 34 } }), frame("victory1", 0.16)],
  weaponLight: [frame("weaponLightA", 0.065), frame("weaponLightB", 0.11, { hitbox: { x: 28, y: 18, w: 22, h: 12 } }), frame("weaponLightC", 0.12)],
  weaponHeavy: [frame("weaponHeavyA", 0.11, { offsetX: -2 }), frame("weaponHeavyB", 0.14, { hitbox: { x: 27, y: 15, w: 24, h: 18 } }), frame("weaponHeavyC", 0.18)],
  weaponSpecial: [frame("weaponSpecialA", 0.12, { offsetY: -2 }), frame("weaponSpecialB", 0.16, { hitbox: { x: 18, y: 10, w: 34, h: 28 } }), frame("weaponSpecialC", 0.2)],
  weaponBreak: [frame("weaponHeavyC", 0.11), frame("hurt", 0.13)],
  revive: [frame("revive0", 0.14), frame("revive1", 0.14), frame("getUp", 0.1)],
  ko: [frame("KO", 0.2)],
  KO: [frame("KO", 0.2)],
  victory: [frame("victory0", 0.18), frame("victory1", 0.18)]
};

for (const s of [jax, rook]) anim(s, playerStates);
for (const s of [thug, blade, brute]) {
  anim(s, {
    idle: [frame("idle0", 0.18), frame("idle1", 0.18), frame("idle2", 0.18)],
    walk: [frame("walk0", 0.11), frame("walk1", 0.1), frame("walk2", 0.11), frame("walk3", 0.1)],
    attack: [frame("punch1a", 0.08), frame("attack", 0.1, { hitbox: { x: 24, y: 21, w: 22, h: 12 } }), frame("punch1c", 0.12)],
    hit: [frame("hurt", 0.14)],
    hurt: [frame("hurt", 0.14)],
    shock: [frame("shock", 0.07), frame("hurt", 0.06), frame("shock", 0.08)],
    slamCrush: [frame("slamCrush", 0.2)],
    spin: [frame("spin", 0.08), frame("wallBounce", 0.08), frame("spin", 0.08)],
    wallBounce: [frame("wallBounce", 0.14)],
    groundBounce: [frame("groundBounce", 0.16)],
    airborne: [frame("jumpAttack", 0.12)],
    knockdown: [frame("knockdown", 0.18)],
    ko: [frame("KO", 0.2)],
    KO: [frame("KO", 0.2)]
  });
}

anim(boss, {
  idle: [frame("idle0", 0.18), frame("idle1", 0.18), frame("idle2", 0.18)],
  walk: [frame("walk0", 0.13), frame("walk1", 0.12), frame("walk2", 0.13), frame("walk3", 0.12)],
  attack: [frame("block", 0.12), frame("punch3a", 0.1), frame("attack", 0.14, { hitbox: { x: 32, y: 29, w: 28, h: 16 } }), frame("idle1", 0.14)],
  phase2: [frame("phase2", 0.12), frame("punch3a", 0.08), frame("attack", 0.14, { hitbox: { x: 32, y: 29, w: 28, h: 16 } }), frame("phase2", 0.12)],
  phaseShift: [frame("phaseShift", 0.1), frame("phase2", 0.08), frame("superImpact", 0.12), frame("phase2", 0.12)],
  hit: [frame("hurt", 0.16)],
  hurt: [frame("hurt", 0.16)],
  shock: [frame("shock", 0.08), frame("phase2", 0.08)],
  slamCrush: [frame("slamCrush", 0.18)],
  spin: [frame("wallBounce", 0.14)],
  wallBounce: [frame("wallBounce", 0.14)],
  groundBounce: [frame("groundBounce", 0.16)],
  heavyStagger: [frame("hurt", 0.1), frame("phaseShift", 0.12)],
  ko: [frame("KO", 0.2)],
  KO: [frame("KO", 0.2)]
});

export const SPRITE_SHEETS = { jax, mira: rook, thug, blade, brute, boss };

export class PixelSpriteRenderer {
  constructor() {
    this.cache = new Map();
  }

  frame(sheetKey, state, time = 0, variant = "base") {
    const sheet = SPRITE_SHEETS[sheetKey] || SPRITE_SHEETS.thug;
    const frames = sheet.animations[state] || sheet.animations.idle;
    const total = frames.reduce((sum, f) => sum + f.duration, 0);
    let t = total > 0 ? time % total : 0;
    for (const frameDef of frames) {
      if (t <= frameDef.duration) return { sheet, frame: frameDef, variant };
      t -= frameDef.duration;
    }
    return { sheet, frame: frames[0], variant };
  }

  draw(ctx, sheetKey, state, time, x, y, options = {}) {
    const { sheet, frame: frameDef, variant } = this.frame(sheetKey, state, time, options.variant || "base");
    const image = this.renderFrame(sheet, frameDef.map, variant);
    const scale = options.scale || sheet.size.scale || 1.25;
    const w = image.width * scale;
    const h = image.height * scale;
    const dx = Math.round(x - w / 2 + (frameDef.offsetX || 0));
    const dy = Math.round(y - h + (frameDef.offsetY || 0));
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (options.alpha != null) ctx.globalAlpha = options.alpha;
    if (options.flash) ctx.globalCompositeOperation = "lighter";
    if (options.flip) {
      ctx.translate(Math.round(x), 0);
      ctx.scale(-1, 1);
      ctx.drawImage(image, Math.round(-w / 2 - (frameDef.offsetX || 0)), dy, Math.round(w), Math.round(h));
    } else {
      ctx.drawImage(image, dx, dy, Math.round(w), Math.round(h));
    }
    ctx.restore();
    return { hitbox: frameDef.hitbox, width: w, height: h };
  }

  renderFrame(sheet, mapKey, variant) {
    const key = `${sheet.key}:${mapKey}:${variant}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const rows = sheet.maps[mapKey] || sheet.maps[`${sheet.key}:idle0`];
    const w = Math.max(...rows.map((r) => r.length));
    const h = rows.length;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const palette = variant === "phase2" ? { ...sheet.palette, j: "#ff4055", d: "#99243a", t: "#ffdf6e", g: "#fff2a0" } : sheet.palette;
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        const c = rows[y][x];
        if (c === EMPTY) continue;
        ctx.fillStyle = palette[c] || "#ffffff";
        ctx.fillRect(x, y, 1, 1);
      }
    }
    this.cache.set(key, canvas);
    return canvas;
  }
}

const PORTRAIT_CACHE = new Map();

export function spritePortraitUrl(sheetKey, state = "idle", variant = "base") {
  const key = `${sheetKey}:${state}:${variant}`;
  if (PORTRAIT_CACHE.has(key)) return PORTRAIT_CACHE.get(key);
  const renderer = new PixelSpriteRenderer();
  const { sheet, frame: frameDef } = renderer.frame(sheetKey, state, 0, variant);
  const image = renderer.renderFrame(sheet, frameDef.map, variant);
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = image.width * scale;
  canvas.height = image.height * scale;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL("image/png");
  PORTRAIT_CACHE.set(key, url);
  return url;
}
