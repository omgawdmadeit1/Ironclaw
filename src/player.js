import { WEAPONS, makeWeaponState } from "./weapons.js";

export const FIGHTERS = [
  {
    id: "jax",
    name: "Jax Volt",
    tagline: "balanced street karate with charged elbows",
    colors: { suit: "#1fd7ff", trim: "#ff4fd8", skin: "#ffd0a8", hair: "#121529", dark: "#071425", boot: "#101727", light: "#baffff" },
    maxHealth: 120,
    speed: 185,
    power: 1,
    special: "Volt Spiral"
  },
  {
    id: "mira",
    name: "Rook Iron",
    tagline: "heavy street brawler with armored counters",
    colors: { suit: "#b75cff", trim: "#ffd15c", skin: "#d6a07a", hair: "#18111f", dark: "#21172e", boot: "#31283b", light: "#fff1a3" },
    maxHealth: 140,
    speed: 165,
    power: 1.15,
    special: "Anvil Burst"
  }
];

export class Entity {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.z = 0;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.w = w;
    this.h = h;
    this.facing = 1;
    this.health = 100;
    this.maxHealth = 100;
    this.state = "idle";
    this.animTime = 0;
    this.invuln = 0;
    this.hitFlash = 0;
    this.dead = false;
    this.shadowScale = 1;
  }

  distanceTo(other) {
    return Math.hypot(this.x - other.x, (this.y - other.y) * 1.4);
  }

  depth() {
    return this.y + this.z * 0.1;
  }
}

export class Player extends Entity {
  constructor(fighter, x, y) {
    super(x, y, fighter.id === "mira" ? 78 : 70, fighter.id === "mira" ? 126 : 118);
    this.fighter = fighter;
    this.maxHealth = fighter.maxHealth;
    this.health = this.maxHealth;
    this.speed = fighter.speed;
    this.power = fighter.power;
    this.lives = 3;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.attackTimer = 0;
    this.attackDuration = 0;
    this.attackWindow = 0;
    this.attackKind = "";
    this.attackId = 0;
    this.punchChain = 0;
    this.punchChainTimer = 0;
    this.lastMoveName = "";
    this.specialCooldown = 0;
    this.dashTimer = 0;
    this.blocking = false;
    this.koTimer = 0;
    this.powerTimer = 0;
    this.hurtTimer = 0;
    this.hurtKind = "hit";
    this.weapon = null;
    this.weaponSwingId = -1;
    this.playerIndex = 0;
    this.playerLabel = "P1";
    this.inputId = "p1";
    this.reviveProgress = 0;
    this.dashDustTimer = 0;
  }

  update(dt, input, level, audio, game = null) {
    this.animTime += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.attackWindow = Math.max(0, this.attackWindow - dt);
    this.specialCooldown = Math.max(0, this.specialCooldown - dt);
    this.dashTimer = Math.max(0, this.dashTimer - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    this.punchChainTimer = Math.max(0, this.punchChainTimer - dt);
    this.powerTimer = Math.max(0, this.powerTimer - dt);
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    if (this.comboTimer <= 0) this.combo = 0;
    if (this.punchChainTimer <= 0) this.punchChain = 0;

    if (this.health <= 0) {
      this.state = "ko";
      this.koTimer += dt;
      return;
    }

    this.blocking = input.down("block") && this.z <= 0 && this.attackTimer <= 0;

    if (this.z > 0 || this.vz !== 0) {
      this.z += this.vz * dt;
      this.vz -= 950 * dt;
      if (this.z <= 0) {
        this.z = 0;
        this.vz = 0;
        if (this.state === "jump" || this.state === "jumpAttack") this.state = "idle";
      }
    }

    if (this.attackTimer <= 0 && !this.blocking) {
      if (input.pressed("kick") && this.z > 20) {
        this.beginAttack("skyDrop", 0.42, "SKY DROP");
        audio.sfx("kick");
      } else if (input.pressed("punch") && this.z > 20) {
        this.beginAttack("jump", 0.3);
        audio.sfx("kick");
      } else if (input.pressed("jump") && this.z <= 0) {
        this.vz = 470;
        this.state = "jump";
        audio.sfx("jump");
      } else if (input.pressed("punch") && (this.dashTimer > 0 || input.down("dash"))) {
        this.dashTimer = Math.max(this.dashTimer, 0.22);
        this.beginAttack("streetRush", 0.34, "STREET RUSH");
        audio.sfx("kick");
      } else if (this.weapon && input.pressed("punch")) {
        this.beginWeaponAttack("light", audio);
      } else if (this.weapon && input.pressed("kick")) {
        this.beginWeaponAttack("heavy", audio);
      } else if (this.weapon && input.pressed("special") && this.powerTimer > 0 && this.specialCooldown <= 0) {
        this.beginWeaponAttack("special", audio);
        this.specialCooldown = 3.2;
      } else if (input.pressed("punch")) {
        this.punchChain = this.punchChainTimer > 0 ? (this.punchChain % 3) + 1 : 1;
        this.punchChainTimer = 0.72;
        this.beginAttack(`punch${this.punchChain}`, this.punchChain === 3 ? 0.42 : 0.25, this.punchChain === 3 ? "SMASH" : "");
        audio.sfx("punch");
      } else if (input.pressed("kick") && this.punchChain === 2 && this.punchChainTimer > 0) {
        this.beginAttack("launchKick", 0.46, "LAUNCH KICK");
        this.punchChain = 0;
        this.punchChainTimer = 0;
        audio.sfx("kick");
      } else if (input.pressed("kick")) {
        this.beginAttack("kick", 0.34);
        audio.sfx("kick");
      } else if (input.pressed("special") && this.specialCooldown <= 0) {
        const ally = this.coopSuperPartner(game);
        if (ally) {
          this.beginAttack("coopSuper", 0.92, "DUAL OVERDRIVE");
          ally.specialCooldown = Math.max(ally.specialCooldown, 1.3);
          ally.powerTimer = Math.max(0, ally.powerTimer - 2.5);
          this.powerTimer = Math.max(0, this.powerTimer - 2.5);
        } else {
          const enhanced = this.combo >= 3 || this.punchChain === 3 || this.powerTimer > 0;
          const uniqueSuper = this.fighter.id === "mira" ? "groundSlam" : "voltRush";
          this.beginAttack(enhanced ? uniqueSuper : "special", enhanced ? 0.84 : 0.62, enhanced ? (this.fighter.id === "mira" ? "ANVIL SLAM" : "VOLT RUSH") : "");
        }
        this.specialCooldown = 4.5;
        audio.sfx("special");
      } else if (input.down("dash") && (Math.abs(input.axisX) > 0.2 || this.dashTimer > 0)) {
        this.dashTimer = 0.22;
        this.beginAttack("dash", 0.22);
      }
    }

    const lockMovement = this.attackTimer > 0 && this.attackKind !== "dash" && this.attackKind !== "streetRush";
    let mx = input.axisX;
    let my = input.axisY;
    if (this.hurtTimer > 0) {
      mx = 0;
      my = 0;
    }
    if (lockMovement || this.blocking) {
      mx *= 0.15;
      my *= 0.15;
    }
    if (Math.abs(mx) > 0.1) this.facing = Math.sign(mx);
    const dashBoost = this.dashTimer > 0 ? 1.85 : 1;
    this.x += mx * this.speed * dashBoost * dt;
    this.y += my * this.speed * 0.62 * dt;
    this.x = Math.max(level.cameraX + 38, Math.min(level.length - 76, this.x));
    this.y = Math.max(level.bounds.top, Math.min(level.bounds.bottom, this.y));

    if (this.hurtTimer > 0) this.state = this.hurtKind === "knockdown" && this.hurtTimer < 0.25 ? "getup" : this.hurtKind;
    else if (this.attackTimer > 0) {
      const aliases = {
        dash: "dash",
        streetRush: "dashAttack",
        launchKick: "kick",
        skyDrop: "jumpAttack",
        powerFinish: "super",
        voltRush: "voltRush",
        groundSlam: "groundSlam",
        coopSuper: "coopSuper",
        jump: "jumpAttack",
        weaponLight: "weaponLight",
        weaponHeavy: "weaponHeavy",
        weaponSpecial: "weaponSpecial",
        weaponBreak: "weaponBreak"
      };
      this.state = aliases[this.attackKind] || this.attackKind;
    }
    else if (this.blocking) this.state = "block";
    else if (this.z > 0) this.state = "jump";
    else if (this.dashTimer > 0 || Math.abs(mx) > 0.75) this.state = "run";
    else if (Math.abs(mx) + Math.abs(my) > 0.15) this.state = "walk";
    else this.state = "idle";
  }

  beginAttack(kind, duration, moveName = "") {
    this.attackKind = kind;
    this.attackTimer = duration;
    this.attackDuration = duration;
    this.attackWindow = duration * 0.72;
    this.attackId++;
    this.lastMoveName = moveName;
    if (kind === "dash") this.vx = this.facing * 250;
  }

  beginWeaponAttack(mode, audio) {
    const def = WEAPONS[this.weapon?.id];
    if (!def) return;
    const weaponSpec = def[mode] || def.light;
    const name = mode === "special" ? `${def.short} BURST` : mode === "heavy" ? `${def.short} CRUSH` : `${def.short} SWING`;
    this.beginAttack(`weapon${mode[0].toUpperCase()}${mode.slice(1)}`, weaponSpec.duration, name);
    audio.sfx(mode === "special" || mode === "heavy" ? "weaponHeavy" : "weapon");
  }

  equipWeapon(id) {
    this.weapon = makeWeaponState(id);
    this.weaponSwingId = -1;
  }

  coopSuperPartner(game) {
    if (!game?.players || this.powerTimer <= 0) return null;
    return game.players.find((ally) => ally !== this
      && ally.health > 0
      && ally.powerTimer > 0
      && ally.specialCooldown <= 1
      && this.distanceTo(ally) < 150);
  }

  dropWeapon() {
    const dropped = this.weapon;
    this.weapon = null;
    this.weaponSwingId = -1;
    return dropped;
  }

  revive(x = this.x, y = this.y, healthRatio = 0.45) {
    this.health = Math.max(1, Math.ceil(this.maxHealth * healthRatio));
    this.x = x;
    this.y = y;
    this.z = 0;
    this.vz = 0;
    this.koTimer = 0;
    this.reviveProgress = 0;
    this.invuln = 1.4;
    this.hurtTimer = 0.25;
    this.hurtKind = "revive";
    this.state = "revive";
  }

  attackSpec() {
    if (this.attackWindow <= 0 || this.health <= 0) return null;
    const boost = this.powerTimer > 0 ? 1.5 : 1;
    const weaponKind = { weaponLight: "light", weaponHeavy: "heavy", weaponSpecial: "special" }[this.attackKind];
    if (weaponKind && this.weapon) {
      const def = WEAPONS[this.weapon.id];
      const base = def?.[weaponKind];
      if (!base) return null;
      const elapsed = Math.max(0, this.attackDuration - this.attackTimer);
      if (elapsed < base.active[0] || elapsed > base.active[1]) return null;
      const powerBoost = weaponKind === "special" ? 1.25 : 1;
      return {
        ...base,
        damage: Math.round(base.damage * this.power * boost * powerBoost),
        range: Math.round(base.range * 1.16),
        arc: Math.round(base.arc * 1.14),
        id: this.attackId,
        kind: this.attackKind,
        weapon: this.weapon.id,
        weaponMode: weaponKind,
        reaction: this.weaponReaction(this.weapon.id, weaponKind),
        finisher: base.finisher || weaponKind !== "light"
      };
    }
    const specs = {
      punch: { damage: 13, range: 64, arc: 34, knock: 120, stun: 0.22, active: [0.07, 0.17] },
      punch1: { damage: 12, range: 72, arc: 38, knock: 118, stun: 0.2, active: [0.07, 0.16] },
      punch2: { damage: 14, range: 80, arc: 40, knock: 145, stun: 0.24, active: [0.06, 0.17] },
      punch3: { damage: 23, range: 92, arc: 48, knock: 285, stun: 0.44, active: [0.12, 0.27], finisher: true, launch: 180 },
      kick: { damage: 18, range: 90, arc: 46, knock: 180, stun: 0.3, active: [0.1, 0.24] },
      launchKick: { damage: 22, range: 98, arc: 52, knock: 170, stun: 0.46, active: [0.14, 0.31], launch: 360, finisher: true },
      dash: { damage: 16, range: 86, arc: 42, knock: 245, stun: 0.28, active: [0.02, 0.16] },
      streetRush: { damage: 24, range: 106, arc: 46, knock: 330, stun: 0.42, active: [0.06, 0.24], finisher: true },
      jump: { damage: 21, range: 84, arc: 50, knock: 205, stun: 0.34, active: [0.05, 0.22] },
      skyDrop: { damage: 25, range: 94, arc: 58, knock: 260, stun: 0.44, active: [0.1, 0.32], launch: 120, finisher: true },
      special: { damage: 30, range: 136, arc: 88, knock: 305, stun: 0.55, active: [0.12, 0.42] },
      powerFinish: { damage: 42, range: 156, arc: 100, knock: 410, stun: 0.72, active: [0.18, 0.55], launch: 260, finisher: true, reaction: "slamCrush", super: true },
      voltRush: { damage: 40, range: 168, arc: 92, knock: 430, stun: 0.78, active: [0.18, 0.64], launch: 250, finisher: true, reaction: "shock", super: true },
      groundSlam: { damage: 50, range: 148, arc: 112, knock: 480, stun: 0.9, active: [0.28, 0.66], launch: 340, finisher: true, reaction: "slamCrush", super: true },
      coopSuper: { damage: 64, range: 194, arc: 122, knock: 560, stun: 1.05, active: [0.22, 0.72], launch: 390, finisher: true, reaction: "shock", super: true }
    };
    const spec = specs[this.attackKind];
    if (!spec) return null;
    const elapsed = Math.max(0, this.attackDuration - this.attackTimer);
    if (elapsed < spec.active[0] || elapsed > spec.active[1]) return null;
    return spec && {
      ...spec,
      damage: Math.round(spec.damage * this.power * boost),
      range: Math.round(spec.range * 1.18),
      arc: Math.round(spec.arc * 1.15),
      id: this.attackId,
      kind: this.attackKind
    };
  }

  weaponReaction(id, mode) {
    if (id === "baton" || id === "gauntlet") return "shock";
    if (id === "sign") return mode === "light" ? "spin" : "wallBounce";
    if (id === "wrench") return mode === "light" ? "slamCrush" : "groundBounce";
    if (id === "pipe" && mode !== "light") return "wallBounce";
    return mode === "heavy" || mode === "special" ? "stagger" : "";
  }

  takeHit(amount, fromX, knock, stun, audio) {
    if (this.invuln > 0 || this.health <= 0) return false;
    const wasAlive = this.health > 0;
    if (this.blocking) {
      amount = Math.ceil(amount * 0.25);
      knock *= 0.35;
      audio.sfx("block");
    }
    this.health = Math.max(0, this.health - amount);
    this.x += Math.sign(this.x - fromX || 1) * knock * 0.035;
    this.invuln = 0.35;
    this.hitFlash = 0.15;
    this.hurtKind = amount >= 16 || knock > 180 ? "knockdown" : "hit";
    this.hurtTimer = this.hurtKind === "knockdown" ? Math.max(0.55, stun) : Math.max(0.22, stun * 0.75);
    this.state = this.health <= 0 ? "ko" : this.hurtKind;
    if (wasAlive && this.health <= 0) {
      this.lives = Math.max(0, this.lives - 1);
      this.koTimer = 0;
      this.reviveProgress = 0;
    }
    this.attackTimer = 0;
    this.attackDuration = 0;
    this.attackWindow = 0;
    return true;
  }
}
