import { Boss, Enemy } from "./enemy.js";

export class WaveManager {
  constructor(level) {
    this.level = level;
    this.index = -1;
    this.activeWave = null;
    this.pendingGroups = [];
    this.completed = false;
    this.clearTimer = 0;
  }

  currentLabel() {
    if (this.completed) return "Stage clear";
    if (!this.activeWave) return "Advance";
    return this.activeWave.label || `Wave ${this.index + 1}`;
  }

  update(dt, game) {
    if (this.completed) return;
    if (!this.activeWave) {
      const next = this.level.waves[this.index + 1];
      if (next && game.leadingPlayerX() >= next.gateX) this.startWave(next, game);
      return;
    }

    this.pendingGroups.forEach((group) => (group.delay -= dt));
    for (const group of this.pendingGroups.filter((group) => group.delay <= 0 && !group.spawned)) {
      if (game.enemies.filter((enemy) => enemy.health > 0).length >= this.activeWave.enemyCap) continue;
      group.spawned = true;
      this.spawnGroup(group, game);
    }
    this.pendingGroups = this.pendingGroups.filter((group) => !group.spawned);

    const waiting = this.pendingGroups.length > 0;
    const living = game.enemies.some((enemy) => enemy.health > 0);
    if (!waiting && !living) {
      this.clearTimer += dt;
      if (this.clearTimer > 0.8) this.clearWave(game);
    } else {
      this.clearTimer = 0;
    }
  }

  startWave(wave, game) {
    this.index++;
    this.activeWave = wave;
    this.level.waveIndex = this.index;
    this.pendingGroups = wave.groups.map((group) => ({ ...group, spawned: false }));
    this.clearTimer = 0;
    game.addPopup?.(`WAVE ${this.index + 1}`, game.level.cameraX + 560, 170, "#ffd15c", 0.55, 1);
    game.addPopup?.(wave.label || "FIGHT", game.level.cameraX + 560, 215, "#37f5ff", 0.42, 0.9);
    if (wave.boss || wave.miniBoss) {
      game.audio.sfx(wave.boss ? "boss" : "phase");
      game.bossWarningTimer = wave.boss ? 2.2 : 1.2;
    }
  }

  spawnGroup(group, game) {
    for (const entry of group.enemies) {
      const [type, x, y, variant = "normal"] = entry;
      if (this.activeWave.boss) {
        const boss = new Boss(x || game.leadingPlayerX() + 360, y || game.level.bounds.top + 88, variant);
        game.enemies.push(game.prepareEnemy(boss));
      } else {
        game.enemies.push(game.prepareEnemy(new Enemy(type, x, y, variant)));
      }
    }
  }

  clearWave(game) {
    const wave = this.activeWave;
    const reward = wave.reward;
    if (reward) {
      const x = Math.min(game.level.length - 180, game.leadingPlayerX() + 170);
      const y = game.level.bounds.top + 110 + (this.index % 3) * 36;
      if (reward.startsWith("weapon:")) game.spawnPickup(x, y, "weapon", reward.split(":")[1], 11);
      else game.spawnPickup(x, y, reward, null, 11);
    }
    const scrap = wave.boss ? 220 : wave.miniBoss ? 130 : 45 + this.index * 15;
    game.awardScrap(scrap, `wave-${this.index + 1}`);
    game.addPopup?.(`WAVE CLEAR +${scrap} SCRAP`, game.level.cameraX + 560, 190, "#ffd15c", 0.42, 1);
    this.activeWave = null;
    if (this.index >= this.level.waves.length - 1) {
      this.completed = true;
      this.level.completed = true;
      game.onStageCleared();
    }
  }
}
