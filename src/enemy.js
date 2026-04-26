import { Entity } from "./player.js";

export const ENEMY_TYPES = {
  thug: { name: "Canal Punk", color: "#69ff8f", trim: "#253b2d", hp: 54, speed: 88, damage: 9, range: 76, cooldown: 1.05, score: 120, w: 64, h: 106 },
  blade: { name: "Lumen Shiv", color: "#d855ff", trim: "#37f5ff", hp: 40, speed: 132, damage: 11, range: 82, cooldown: 0.72, score: 170, w: 58, h: 100 },
  brute: { name: "Chrome Bulk", color: "#ffb341", trim: "#e9e1bd", hp: 104, speed: 58, damage: 18, range: 96, cooldown: 1.35, score: 280, w: 88, h: 128 }
};

export class Enemy extends Entity {
  constructor(type, x, y) {
    const data = ENEMY_TYPES[type];
    super(x, y, data.w, data.h);
    this.type = type;
    this.data = { ...data };
    this.health = data.hp;
    this.maxHealth = data.hp;
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
  }

  update(dt, game) {
    this.animTime += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.reactionTimer = Math.max(0, this.reactionTimer - dt);
    this.armorCrackTimer = Math.max(0, this.armorCrackTimer - dt);
    if (this.reactionTimer <= 0) this.reactionState = "";
    const wasAirborne = this.z > 0;
    if (this.z > 0 || this.vz !== 0) {
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
      this.attackTimer = this.type === "brute" ? 0.46 : 0.38;
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
    const idealRange = this.data.range * (this.type === "blade" ? 0.92 : 1.18);
    const tooClose = Math.abs(dx) < idealRange * 0.76 && Math.abs(dy) < 48;
    const dirX = tooClose ? -Math.sign(dx || this.facing) : Math.sign(dx) * (retreat ? -0.55 : 1);
    const dirY = Math.sign(desiredY - this.y);
    this.x += (dirX * this.data.speed + crowd.x * 95) * dt;
    this.y += (dirY * this.data.speed * 0.42 + crowd.y * 70) * dt;
    this.y = Math.max(game.level.bounds.top, Math.min(game.level.bounds.bottom, this.y));
    this.state = Math.abs(dx) > 12 || Math.abs(dy) > 10 ? "walk" : "idle";
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
      if (dist > 0 && dist < 78) {
        const force = (78 - dist) / 78;
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
      arc: 32,
      knock: this.type === "brute" ? 190 : 105,
      stun: 0.28,
      id: this.attackId
    };
  }

  takeHit(spec, fromX) {
    if (this.health <= 0 || this.hitBy.has(spec.id)) return false;
    this.hitBy.add(spec.id);
    this.health = Math.max(0, this.health - spec.damage);
    const boss = this.maxHealth > 120;
    const dir = Math.sign(this.x - fromX || 1);
    const knockScale = spec.finisher ? 0.062 : 0.045;
    this.x += dir * spec.knock * (boss ? knockScale * 0.55 : knockScale);
    const stunValue = boss && spec.weapon ? spec.stun * 0.55 : spec.stun;
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
  constructor(x, y) {
    super("brute", x, y);
    this.data = { ...this.data, name: "Overboss Vex", color: "#ff4055", trim: "#37f5ff", damage: 20, speed: 78, range: 86, cooldown: 1.05, score: 1200 };
    this.w = 128;
    this.h = 174;
    this.health = 220;
    this.maxHealth = 220;
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
