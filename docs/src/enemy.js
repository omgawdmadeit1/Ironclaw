import { Entity } from "./player.js";

function parseEnemyType(type, variant) {
  if (typeof type === "string" && type.includes("@")) {
    const [base, parsedVariant] = type.split("@");
    return { type: base, variant: parsedVariant || variant || "normal" };
  }
  return { type, variant: variant || "normal" };
}

export const ENEMY_TYPES = {
  thug: { name: "Canal Punk", role: "Basic thug", behavior: "melee", weakness: "Launchers and finishers", firstStage: 1, sheet: "thug", color: "#69ff8f", trim: "#253b2d", hp: 54, speed: 88, damage: 9, range: 76, cooldown: 1.05, score: 120, w: 64, h: 106 },
  blade: { name: "Lumen Shiv", role: "Fast neon-blade attacker", behavior: "blade", weakness: "Blocks and jump attacks", firstStage: 1, sheet: "blade", color: "#d855ff", trim: "#37f5ff", hp: 40, speed: 132, damage: 11, range: 82, cooldown: 0.72, score: 170, w: 58, h: 100 },
  brute: { name: "Chrome Bulk", role: "Heavy brute", behavior: "brute", weakness: "Slow recovery after slams", firstStage: 1, sheet: "brute", color: "#ffb341", trim: "#e9e1bd", hp: 104, speed: 58, damage: 18, range: 96, cooldown: 1.35, score: 280, w: 88, h: 128 },
  grabber: { name: "Latch Vandal", role: "Grabber", behavior: "grabber", weakness: "Mash attacks or hit from partner", firstStage: 1, sheet: "thug", color: "#5cffbf", trim: "#ff4fd8", hp: 62, speed: 94, damage: 6, range: 66, cooldown: 1.15, score: 190, w: 66, h: 108 },
  shield: { name: "Riot Shell", role: "Shield Punk", behavior: "shield", weakness: "Back attacks, launchers, and supers", firstStage: 1, sheet: "brute", color: "#64a8ff", trim: "#c7d0dd", hp: 78, speed: 70, damage: 10, range: 72, cooldown: 1.18, score: 220, w: 78, h: 116 },
  thrower: { name: "Bottle Byte", role: "Ranged Thrower", behavior: "thrower", weakness: "Dash through the lane gap", firstStage: 1, sheet: "thug", color: "#ffd15c", trim: "#37f5ff", hp: 46, speed: 82, damage: 9, range: 210, cooldown: 1.25, score: 210, w: 62, h: 104 },
  drone: { name: "Skitter Drone", role: "Flying drone", behavior: "drone", weakness: "Jump attacks and launchers", firstStage: 3, sheet: "blade", color: "#37f5ff", trim: "#ffffff", hp: 28, speed: 122, damage: 7, range: 120, cooldown: 0.95, score: 180, w: 54, h: 82, flying: true },
  medic: { name: "Patch Saint", role: "Medic", behavior: "medic", weakness: "Focus first", firstStage: 2, sheet: "thug", color: "#7cff70", trim: "#ffffff", hp: 48, speed: 74, damage: 5, range: 66, cooldown: 1.4, score: 260, w: 62, h: 104 },
  bomber: { name: "Fuse Rat", role: "Bomber", behavior: "bomber", weakness: "Bait charges into enemies", firstStage: 2, sheet: "thug", color: "#ff8b3d", trim: "#ffd15c", hp: 52, speed: 84, damage: 12, range: 180, cooldown: 1.55, score: 240, w: 62, h: 104 },
  ninja: { name: "Flash Runner", role: "Ninja Runner", behavior: "ninja", weakness: "Wide kicks and weapon sweeps", firstStage: 3, sheet: "blade", color: "#b75cff", trim: "#baffff", hp: 44, speed: 155, damage: 12, range: 84, cooldown: 0.68, score: 260, w: 56, h: 100, dodge: 0.22 },
  mutant: { name: "Graft Hulk", role: "Mutant Heavy", behavior: "mutant", weakness: "Supers and shock weapons", firstStage: 5, sheet: "brute", color: "#7cff70", trim: "#ff4fd8", hp: 138, speed: 54, damage: 21, range: 102, cooldown: 1.45, score: 360, w: 94, h: 134, stunResist: 0.72 }
};

export const ENEMY_VARIANTS = {
  normal: { label: "Normal", hp: 1, speed: 1, damage: 1, stun: 1, score: 1, accent: null },
  elite: { label: "Elite", hp: 1.35, speed: 1.08, damage: 1.12, stun: 0.88, score: 1.4, accent: "#ffd15c" },
  armored: { label: "Armored", hp: 1.6, speed: 0.92, damage: 1.05, stun: 0.68, score: 1.55, accent: "#c7d0dd" },
  enraged: { label: "Enraged", hp: 1.25, speed: 1.18, damage: 1.25, stun: 0.82, score: 1.65, accent: "#ff4055" }
};

export class Enemy extends Entity {
  constructor(type, x, y, variant = "normal") {
    const parsed = parseEnemyType(type, variant);
    const data = ENEMY_TYPES[parsed.type] || ENEMY_TYPES.thug;
    super(x, y, data.w, data.h);
    this.type = parsed.type;
    this.variant = parsed.variant;
    this.variantData = ENEMY_VARIANTS[this.variant] || ENEMY_VARIANTS.normal;
    this.data = this.applyVariant({ ...data });
    this.health = this.data.hp;
    this.maxHealth = this.data.hp;
    this.cooldown = Math.random() * 0.7;
    this.stun = 0;
    this.attackTimer = 0;
    this.attackDuration = 0;
    this.attackId = 0;
    this.hitBy = new Set();
    this.deathTimer = 0;
    this.retreated = 0;
    this.reactionState = "";
    this.reactionTimer = 0;
    this.armorCrackTimer = 0;
    this.healPulse = 1.2 + Math.random() * 0.7;
    this.specialTimer = 0.8 + Math.random() * 0.8;
    this.grabTarget = null;
    this.grabTimer = 0;
    this.grabDamageTimer = 0;
    if (this.data.flying) this.z = 48;
  }

  applyVariant(data) {
    const v = this.variantData;
    data.hp = Math.ceil(data.hp * v.hp);
    data.speed = Math.round(data.speed * v.speed);
    data.damage = Math.ceil(data.damage * v.damage);
    data.score = Math.ceil(data.score * v.score);
    data.stunResist = (data.stunResist || 1) * v.stun;
    if (v.accent) data.trim = v.accent;
    data.variantLabel = v.label;
    return data;
  }

  update(dt, game) {
    this.animTime += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.reactionTimer = Math.max(0, this.reactionTimer - dt);
    this.armorCrackTimer = Math.max(0, this.armorCrackTimer - dt);
    if (this.reactionTimer <= 0) this.reactionState = "";
    const wasAirborne = this.z > 0;
    if (this.data.flying && this.health > 0) {
      this.z = Math.max(32, this.z + Math.sin(this.animTime * 5 + this.x) * 0.18);
    } else if (this.z > 0 || this.vz !== 0) {
      this.z += this.vz * dt;
      this.vz -= 980 * dt;
      if (this.z <= 0) {
        this.z = 0;
        this.vz = 0;
        if (wasAirborne) {
          game.particles.burst(this.x, this.y - 4, "#c7d0dd", this.maxHealth > 120 ? 18 : 11, 120, "line");
          if (this.health > 0) this.stun = Math.max(this.stun, 0.18);
        }
      }
    }
    if (this.health <= 0) {
      this.state = "ko";
      this.deathTimer += dt;
      this.y += dt * 8;
      return;
    }
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.stun = Math.max(0, this.stun - dt);
    const p = game.nearestPlayer?.(this) || game.player;
    if (!p) return;
    this.facing = p.x >= this.x ? 1 : -1;
    this.updateSpecialBehavior(dt, game, p);
    if (this.grabTarget?.health > 0) {
      this.state = "attack";
      this.grabTimer -= dt;
      this.grabDamageTimer -= dt;
      this.grabTarget.hurtTimer = Math.max(this.grabTarget.hurtTimer, 0.08);
      const targetInput = this.grabTarget.inputId;
      const escaped = game.input?.pressed("punch", targetInput) || game.input?.pressed("kick", targetInput) || game.input?.pressed("special", targetInput);
      if (escaped) {
        this.stun = Math.max(this.stun, 0.42);
        this.setReaction("hit", 0.32);
        game.addPopup?.("ESCAPE", this.grabTarget.x, this.grabTarget.y - 80, "#37f5ff", 0.35, 0.7);
        this.grabTarget = null;
        return;
      }
      if (this.grabDamageTimer <= 0) {
        this.grabDamageTimer = 0.42;
        this.grabTarget.takeHit(Math.max(2, Math.ceil(this.data.damage * 0.45)), this.x, 18, 0.08, game.audio);
      }
      if (this.grabTimer <= 0 || this.distanceTo(this.grabTarget) > 95) this.grabTarget = null;
      return;
    }
    if (this.stun > 0) {
      this.state = this.reactionState || (this.z > 0 ? "airborne" : "hit");
      return;
    }
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const close = Math.abs(dx) < this.data.range && Math.abs(dy) < 34;
    const crowd = this.crowding(game.enemies);
    if (this.attackTimer > 0) {
      this.state = "attack";
      return;
    }
    if (close && this.cooldown <= 0) {
      this.attackTimer = this.data.behavior === "brute" || this.data.behavior === "mutant" ? 0.48 : this.data.behavior === "thrower" || this.data.behavior === "bomber" ? 0.52 : 0.38;
      this.attackDuration = this.attackTimer;
      this.cooldown = this.data.cooldown + Math.random() * 0.45;
      this.attackId++;
      this.hitBy.clear();
      this.state = "attack";
      return;
    }
    const desiredY = p.y + Math.sin(this.animTime * 1.5 + this.x) * 42;
    const retreat = this.health < this.maxHealth * 0.32 && this.retreated < 1.4;
    this.retreated = retreat ? this.retreated + dt : Math.max(0, this.retreated - dt * 0.5);
    const ranged = this.data.behavior === "thrower" || this.data.behavior === "bomber" || this.data.behavior === "medic";
    const idealRange = this.data.range * (this.data.behavior === "blade" || this.data.behavior === "ninja" ? 0.9 : ranged ? 0.72 : 1.2);
    const tooClose = Math.abs(dx) < idealRange * (ranged ? 0.46 : 0.78) && Math.abs(dy) < 54;
    const dirX = tooClose ? -Math.sign(dx || this.facing) : Math.sign(dx) * (retreat ? -0.55 : ranged && Math.abs(dx) < idealRange ? 0.2 : 1);
    const dirY = Math.sign(desiredY - this.y);
    this.x += (dirX * this.data.speed + crowd.x * 150) * dt;
    this.y += (dirY * this.data.speed * 0.42 + crowd.y * 110) * dt;
    this.y = Math.max(game.level.bounds.top, Math.min(game.level.bounds.bottom, this.y));
    this.state = Math.abs(dx) > 12 || Math.abs(dy) > 10 ? "walk" : "idle";
  }

  updateSpecialBehavior(dt, game, player) {
    this.specialTimer = Math.max(0, this.specialTimer - dt);
    if (this.data.behavior === "medic") {
      this.healPulse -= dt;
      if (this.healPulse <= 0) {
        this.healPulse = 1.45;
        const ally = game.enemies.find((enemy) => enemy !== this && enemy.health > 0 && enemy.health < enemy.maxHealth && this.distanceTo(enemy) < 165);
        if (ally) {
          ally.health = Math.min(ally.maxHealth, ally.health + 8);
          ally.hitFlash = 0.08;
          game.particles.burst(ally.x, ally.y - ally.h * 0.55, "#7cff70", 8, 90, "ring");
        }
      }
    }
    if (this.data.behavior === "bomber" && this.specialTimer <= 0 && Math.abs(player.x - this.x) < 260) {
      this.specialTimer = 2.25;
      game.addHazard?.("explosive", player.x + (Math.random() - 0.5) * 80, player.y, 0.55);
      game.addPopup?.("BOMB", player.x, player.y - 80, "#ff8b3d", 0.32, 0.62);
    }
  }

  setReaction(reaction, duration = 0.32) {
    if (!reaction) return;
    const boss = this.maxHealth > 120;
    const state = boss && (reaction === "wallBounce" || reaction === "groundBounce" || reaction === "slamCrush") ? "heavyStagger" : reaction;
    this.reactionState = state;
    this.reactionTimer = Math.max(this.reactionTimer, boss ? duration * 0.78 : duration);
    if (boss && reaction !== "shock") this.armorCrackTimer = Math.max(this.armorCrackTimer, 0.55);
  }

  crowding(enemies) {
    const push = { x: 0, y: 0 };
    for (const other of enemies) {
      if (other === this || other.health <= 0) continue;
      const dx = this.x - other.x;
      const dy = (this.y - other.y) * 1.4;
      const dist = Math.hypot(dx, dy);
      const minDist = Math.max(78, (this.w + other.w) * 0.58);
      if (dist > 0 && dist < minDist) {
        const force = (minDist - dist) / minDist;
        push.x += (dx / dist) * force;
        push.y += (dy / dist) * force;
      }
    }
    return push;
  }

  attackSpec() {
    if (this.health <= 0) return null;
    const elapsed = Math.max(0, this.attackDuration - this.attackTimer);
    if (elapsed < 0.14 || elapsed > 0.28) return null;
    return {
      damage: this.data.damage,
      range: this.data.range,
      arc: this.data.behavior === "thrower" || this.data.behavior === "bomber" ? 58 : 34,
      knock: this.data.behavior === "brute" || this.data.behavior === "mutant" ? 205 : this.data.behavior === "drone" ? 80 : 115,
      stun: this.data.behavior === "grabber" ? 0.18 : 0.28,
      id: this.attackId,
      grab: this.data.behavior === "grabber",
      ranged: this.data.behavior === "thrower",
      explosive: this.data.behavior === "bomber"
    };
  }

  takeHit(spec, fromX) {
    if (this.health <= 0 || this.hitBy.has(spec.id)) return false;
    if (this.data.behavior === "shield") {
      const frontal = Math.sign(fromX - this.x || this.facing) === this.facing;
      if (frontal && !spec.launch && !spec.super && spec.kind !== "skyDrop") {
        this.hitBy.add(spec.id);
        this.health = Math.max(0, this.health - Math.ceil(spec.damage * 0.25));
        this.stun = Math.max(this.stun, 0.12);
        this.hitFlash = 0.1;
        this.setReaction("shock", 0.14);
        return true;
      }
    }
    if (this.data.dodge && !spec.launch && !spec.super && Math.random() < this.data.dodge) {
      this.x += Math.sign(this.x - fromX || 1) * 54;
      this.setReaction("spin", 0.18);
      return false;
    }
    this.hitBy.add(spec.id);
    this.health = Math.max(0, this.health - Math.ceil(spec.damage));
    const boss = this.maxHealth > 120;
    const dir = Math.sign(this.x - fromX || 1);
    const knockScale = spec.finisher ? 0.062 : 0.045;
    this.x += dir * spec.knock * (boss ? knockScale * 0.55 : knockScale);
    const stunValue = (boss && spec.weapon ? spec.stun * 0.55 : spec.stun) * (this.data.stunResist || 1);
    if (spec.reaction) this.setReaction(spec.reaction, spec.super ? 0.58 : spec.weapon ? 0.42 : 0.3);
    if (spec.launch && !boss) {
      this.z = Math.max(this.z, 4);
      this.vz = Math.max(this.vz, spec.launch);
      this.stun = Math.max(stunValue, 0.58);
      this.state = this.health <= 0 ? "ko" : this.reactionState || "airborne";
    } else if (spec.launch && boss) {
      this.z = Math.max(this.z, 6);
      this.vz = Math.max(this.vz, 90);
      this.stun = Math.max(stunValue, 0.34);
      this.state = this.health <= 0 ? "ko" : this.reactionState || "hit";
    } else {
      this.stun = stunValue;
      this.state = this.health <= 0 ? "ko" : this.reactionState || "hit";
    }
    this.hitFlash = spec.finisher ? 0.22 : 0.14;
    this.attackTimer = 0;
    return true;
  }
}

export class Boss extends Enemy {
  constructor(x, y, variant = "normal") {
    super("brute", x, y, variant);
    this.data = { ...this.data, name: "Overboss Vex", color: "#ff4055", trim: "#37f5ff", damage: 20, speed: 78, range: 86, cooldown: 1.05, score: 1200 };
    this.w = 128;
    this.h = 174;
    const hpBoost = variant === "enraged" ? 1.35 : variant === "elite" ? 1.18 : 1;
    this.health = Math.ceil(220 * hpBoost);
    this.maxHealth = this.health;
    this.phase = 1;
    this.pattern = "slam";
  }

  update(dt, game) {
    if (this.health > 0 && this.phase === 1 && this.health <= this.maxHealth * 0.5) {
      this.phase = 2;
      this.cooldown = 0.15;
      this.setReaction("phaseShift", 0.85);
      this.stun = Math.max(this.stun, 0.35);
      this.armorCrackTimer = 1.1;
      game.audio.sfx("phase");
      game.shake = 0.65;
      game.screenFlash = 0.55;
      game.particles.burst(this.x, this.y - 48, "#ff4055", 42, 280, "ring");
      game.particles.burst(this.x, this.y - 58, "#ffd15c", 24, 240, "star");
      game.addPopup?.("PHASE TWO", this.x, this.y - 132, "#ff4055", 0.65, 1.05);
    }
    super.update(dt, game);
    if (this.health <= 0) return;
    if (this.phase === 2 && this.state === "walk") this.x += this.facing * 38 * dt;
  }

  attackSpec() {
    if (this.attackTimer <= 0.11 || this.health <= 0) return null;
    const enraged = this.phase === 2;
    this.pattern = enraged && this.attackId % 2 === 0 ? "charge" : "slam";
    return {
      damage: enraged ? 26 : 21,
      range: this.pattern === "charge" ? 120 : 92,
      arc: this.pattern === "charge" ? 46 : 58,
      knock: enraged ? 260 : 210,
      stun: 0.42,
      id: this.attackId
    };
  }
}
