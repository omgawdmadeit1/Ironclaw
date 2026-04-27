export const SAVE_KEY = "neonFistsSave.v3";

export const DIFFICULTIES = {
  easy: { label: "Easy", enemyHp: 0.82, enemyDamage: 0.78, enemySpeed: 0.92, bossHp: 0.82, scrap: 0.9 },
  normal: { label: "Normal", enemyHp: 1, enemyDamage: 1, enemySpeed: 1, bossHp: 1, scrap: 1 },
  hard: { label: "Hard", enemyHp: 1.28, enemyDamage: 1.18, enemySpeed: 1.08, bossHp: 1.25, scrap: 1.25 }
};

export const UPGRADE_POOL = [
  { id: "maxHealth", name: "Reinforced Core", desc: "+20 max health", apply: (p) => { p.maxHealth += 20; p.health += 20; } },
  { id: "weaponDurability", name: "Weapon Tape", desc: "+2 weapon durability", apply: (p) => { p.upgrades.weaponDurability += 2; } },
  { id: "superGain", name: "Volt Capacitor", desc: "+30% super/power gain", apply: (p) => { p.upgrades.superGain += 0.3; } },
  { id: "comboDamage", name: "Combo Focus", desc: "+10% combo damage", apply: (p) => { p.upgrades.comboDamage += 0.1; } },
  { id: "magnet", name: "Scrap Magnet", desc: "+48 pickup range", apply: (p) => { p.upgrades.magnet += 48; } },
  { id: "reviveSpeed", name: "Field Medic", desc: "+35% revive speed", apply: (p) => { p.upgrades.reviveSpeed += 0.35; } },
  { id: "dashInvuln", name: "Phase Dash", desc: "Brief dash invulnerability", apply: (p) => { p.upgrades.dashInvuln = true; } },
  { id: "critChance", name: "Critical Knuckles", desc: "+8% critical hit chance", apply: (p) => { p.upgrades.critChance += 0.08; } }
];

const DEFAULT_SAVE = {
  options: {
    musicVolume: 1,
    sfxVolume: 1,
    muted: false,
    difficulty: "normal",
    controlDisplay: "auto",
    mobileControlSize: "large"
  },
  scrap: 0,
  unlockedStages: 1,
  unlocks: {
    hardMode: true,
    startingPipe: false,
    starterPipe: false,
    supporterPalettes: false,
    soundTest: false,
    bonusPortraits: false,
    encyclopediaPack: true
  },
  stats: {
    totalEnemiesDefeated: 0,
    totalScrapEarned: 0,
    bestScoreByStage: {},
    bestComboByStage: {},
    clearsByStage: {},
    lastDaily: "",
    dailySeed: ""
  }
};

export class Progression {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.save = this.load();
  }

  load() {
    try {
      const raw = this.storage?.getItem(SAVE_KEY);
      if (!raw) return structuredClone(DEFAULT_SAVE);
      return this.mergeDefaults(JSON.parse(raw));
    } catch {
      return structuredClone(DEFAULT_SAVE);
    }
  }

  mergeDefaults(data) {
    return {
      ...structuredClone(DEFAULT_SAVE),
      ...data,
      options: { ...DEFAULT_SAVE.options, ...(data.options || {}) },
      unlocks: { ...DEFAULT_SAVE.unlocks, ...(data.unlocks || {}) },
      stats: { ...DEFAULT_SAVE.stats, ...(data.stats || {}) }
    };
  }

  persist() {
    try {
      this.storage?.setItem(SAVE_KEY, JSON.stringify(this.save));
    } catch {
      // Local storage can be unavailable in private modes; the game remains playable.
    }
  }

  reset() {
    try {
      this.storage?.removeItem(SAVE_KEY);
    } catch {
      // Local storage can be unavailable; resetting simply restores in-memory defaults.
    }
    this.save = this.load();
    this.persist();
    return this.save;
  }

  setOption(key, value) {
    this.save.options[key] = value;
    this.persist();
  }

  addScrap(amount, source = "gameplay") {
    const gained = Math.max(0, Math.round(amount));
    this.save.scrap += gained;
    this.save.stats.totalScrapEarned += gained;
    this.persist();
    return { gained, source };
  }

  spendScrap(amount) {
    if (this.save.scrap < amount) return false;
    this.save.scrap -= amount;
    this.persist();
    return true;
  }

  unlock(id, cost) {
    if (this.save.unlocks[id]) return true;
    if (!this.spendScrap(cost)) return false;
    this.save.unlocks[id] = true;
    this.persist();
    return true;
  }

  recordStage(stageIndex, score, combo, cleared = false) {
    const key = String(stageIndex);
    this.save.stats.bestScoreByStage[key] = Math.max(this.save.stats.bestScoreByStage[key] || 0, score);
    this.save.stats.bestComboByStage[key] = Math.max(this.save.stats.bestComboByStage[key] || 0, combo);
    if (cleared) {
      this.save.stats.clearsByStage[key] = (this.save.stats.clearsByStage[key] || 0) + 1;
      this.save.unlockedStages = Math.max(this.save.unlockedStages, stageIndex + 2);
    }
    this.persist();
  }

  recordEnemyDefeated(count = 1) {
    this.save.stats.totalEnemiesDefeated += count;
    this.persist();
  }

  randomUpgrades(playerIndex, stageIndex) {
    const seed = (playerIndex + 1) * 97 + (stageIndex + 3) * 131 + this.save.stats.totalEnemiesDefeated;
    const pool = [...UPGRADE_POOL];
    const picks = [];
    let cursor = seed;
    while (picks.length < 3 && pool.length) {
      cursor = (cursor * 1103515245 + 12345) & 0x7fffffff;
      const index = cursor % pool.length;
      picks.push(pool.splice(index, 1)[0]);
    }
    return picks;
  }

  dailyChallenge() {
    const today = new Date().toISOString().slice(0, 10);
    return {
      title: "Daily Clash",
      seed: today.replaceAll("-", ""),
      desc: "Placeholder daily ruleset: one seeded stage, boosted Scrap, locked upgrades.",
      available: false
    };
  }
}

export function ensurePlayerUpgrades(player) {
  if (!player.upgrades) {
    player.upgrades = {
      weaponDurability: 0,
      superGain: 0,
      comboDamage: 0,
      magnet: 0,
      reviveSpeed: 0,
      dashInvuln: false,
      critChance: 0
    };
  }
  return player.upgrades;
}

export function applyUpgradeToPlayer(player, upgrade) {
  ensurePlayerUpgrades(player);
  upgrade?.apply?.(player);
}
