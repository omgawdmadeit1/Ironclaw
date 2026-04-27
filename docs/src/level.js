const STAGE_BOUNDS = { top: 320, bottom: 532 };

function makeStage(index, name, palette, theme, length, hazards, waves, objects, pickups) {
  return {
    index,
    name,
    palette,
    theme,
    length,
    bounds: { ...STAGE_BOUNDS, top: STAGE_BOUNDS.top + (index % 3) * 4, bottom: STAGE_BOUNDS.bottom - (index % 2) * 8 },
    hazards,
    waves,
    objects,
    pickups
  };
}

function wave(id, gateX, label, enemies, extra = {}) {
  return {
    id,
    gateX,
    label,
    enemyCap: extra.enemyCap || 5,
    spawnDelay: extra.spawnDelay || 0.5,
    reward: extra.reward || null,
    boss: extra.boss || false,
    miniBoss: extra.miniBoss || false,
    groups: enemies.map((group, groupIndex) => ({
      delay: group.delay ?? groupIndex * 0.4,
      enemies: group.enemies || group
    }))
  };
}

export const STAGE_NAMES = [
  "Neon Back Alley",
  "Toxic Sewer Tunnel",
  "Rooftop Train Line",
  "Underground Fight Club",
  "Cyber Junkyard",
  "Mutant Lab",
  "Final Boss Tower"
];

export const HAZARD_INFO = {
  electric: { name: "Electric Puddle", color: "#37f5ff", active: 0.9, cooldown: 2.8, damage: 9, w: 135, h: 42 },
  steam: { name: "Steam Vent", color: "#c7d0dd", active: 0.72, cooldown: 2.35, damage: 8, w: 84, h: 96 },
  toxic: { name: "Toxic Splash", color: "#7cff70", active: 1.0, cooldown: 3.0, damage: 10, w: 120, h: 58 },
  debris: { name: "Falling Debris", color: "#ffd15c", active: 0.5, cooldown: 3.2, damage: 12, w: 82, h: 120 },
  gust: { name: "Train Gust", color: "#baffff", active: 1.0, cooldown: 3.5, damage: 5, w: 190, h: 76, push: 190 },
  laser: { name: "Lab Laser Sweep", color: "#ff4fd8", active: 0.58, cooldown: 2.6, damage: 13, w: 230, h: 26 },
  crusher: { name: "Crusher Trap", color: "#ff4055", active: 0.52, cooldown: 3.8, damage: 17, w: 118, h: 118 },
  explosive: { name: "Explosive Barrel", color: "#ff8b3d", active: 0.4, cooldown: 99, damage: 18, w: 128, h: 84 }
};

export const LEVELS = [
  makeStage(
    0,
    "Neon Back Alley",
    ["#060817", "#112040", "#1e375f", "#37f5ff", "#ff4fd8"],
    "alley",
    2450,
    [
      ["electric", 840, 492],
      ["steam", 1460, 468],
      ["explosive", 1870, 486]
    ],
    [
      wave("alley-1", 95, "First Clash", [[["thug", 430, 404], ["thug", 520, 456]]], { reward: "gem", spawnDelay: 0.25 }),
      wave("alley-2", 620, "Mixed Alley Crew", [[["blade", 770, 372], ["thug", 880, 438], ["grabber", 970, 476]]], { reward: "health" }),
      wave("alley-3", 1040, "Weapon Cache Challenge", [[["shield", 1210, 418], ["thrower", 1340, 372]], { delay: 0.8, enemies: [["blade", 1450, 472]] }], { reward: "weapon:pipe" }),
      wave("alley-4", 1510, "Elite Street Pressure", [[["thug", 1660, 400, "elite"], ["ninja", 1780, 462], ["shield", 1900, 422]]], { reward: "power" }),
      wave("alley-5", 2020, "Alley Mini-Boss", [[["brute", 2130, 426, "elite"], ["medic", 2240, 384]]], { miniBoss: true, reward: "weapon:baton" })
    ],
    [[360, 455, "crate"], [700, 372, "sign"], [1020, 455, "barrel"], [1380, 505, "crate"], [1600, 390, "crate"], [1880, 472, "explosive"]],
    [[300, 462, "weapon:pipe"], [820, 448, "gem"], [1180, 380, "health"], [1510, 504, "weapon:baton"], [1700, 456, "power"]]
  ),
  makeStage(
    1,
    "Toxic Sewer Tunnel",
    ["#03100f", "#12342f", "#1f6658", "#7cff70", "#ffd15c"],
    "sewer",
    2600,
    [
      ["toxic", 620, 500],
      ["steam", 1120, 454],
      ["toxic", 1720, 502],
      ["explosive", 2140, 488]
    ],
    [
      wave("sewer-1", 230, "Pipe Rats", [[["blade", 520, 360], ["thug", 680, 430], ["grabber", 780, 474]]], { reward: "health" }),
      wave("sewer-2", 680, "Toxic Mix", [[["thrower", 860, 390], ["shield", 980, 458]], { delay: 0.7, enemies: [["blade", 1100, 420]] }], { reward: "gem" }),
      wave("sewer-3", 1120, "Weapon Splash", [[["bomber", 1300, 390], ["thug", 1420, 470], ["medic", 1510, 420]]], { reward: "weapon:wrench" }),
      wave("sewer-4", 1590, "Armored Drain Crew", [[["brute", 1760, 430, "armored"], ["shield", 1870, 384, "elite"], ["grabber", 1980, 468]]], { reward: "power" }),
      wave("sewer-5", 2130, "Bulk Below", [[["mutant", 2250, 430], ["medic", 2350, 382], ["blade", 2420, 470, "elite"]]], { miniBoss: true, reward: "weapon:gauntlet" })
    ],
    [[480, 462, "barrel"], [760, 510, "crate"], [940, 390, "crate"], [1300, 482, "barrel"], [1520, 430, "explosive"], [1760, 380, "sign"]],
    [[620, 392, "health"], [890, 500, "weapon:wrench"], [1080, 468, "gem"], [1480, 402, "weapon:gauntlet"], [1620, 410, "power"]]
  ),
  makeStage(
    2,
    "Rooftop Train Line",
    ["#07101f", "#1a2442", "#49366e", "#ff4fd8", "#37f5ff"],
    "rooftop",
    2750,
    [
      ["gust", 730, 432],
      ["debris", 1260, 402],
      ["gust", 1820, 452],
      ["explosive", 2220, 488]
    ],
    [
      wave("roof-1", 260, "Rail Scouts", [[["ninja", 540, 380], ["blade", 700, 430], ["drone", 820, 350]]], { reward: "gem" }),
      wave("roof-2", 720, "Thrower Lane", [[["thrower", 920, 370], ["thrower", 1070, 455]], { delay: 0.7, enemies: [["shield", 1170, 416]] }], { reward: "health" }),
      wave("roof-3", 1200, "Sign Sweep", [[["blade", 1370, 360, "elite"], ["ninja", 1510, 426], ["bomber", 1640, 385]]], { reward: "weapon:sign" }),
      wave("roof-4", 1700, "Armored Line", [[["brute", 1860, 390, "elite"], ["shield", 1980, 452, "armored"], ["drone", 2080, 348]]], { reward: "power" }),
      wave("roof-5", 2250, "Overboss Vex", [[["brute", 2380, 410, "enraged"]]], { boss: true, reward: "weapon:pipe" })
    ],
    [[540, 452, "crate"], [820, 500, "barrel"], [980, 372, "sign"], [1320, 456, "barrel"], [1590, 408, "crate"], [1820, 396, "explosive"]],
    [[760, 390, "health"], [1040, 504, "weapon:sign"], [1220, 462, "gem"], [1560, 420, "weapon:pipe"], [1740, 452, "power"]]
  ),
  makeStage(
    3,
    "Underground Fight Club",
    ["#100611", "#2b1238", "#5c235e", "#ffd15c", "#ff4055"],
    "club",
    2850,
    [
      ["steam", 680, 464],
      ["electric", 1280, 492],
      ["crusher", 1880, 418],
      ["explosive", 2340, 486]
    ],
    [
      wave("club-1", 260, "Bouncers", [[["thug", 560, 402, "elite"], ["grabber", 690, 470]]], { reward: "health" }),
      wave("club-2", 720, "Shield Wall", [[["shield", 900, 426], ["shield", 1030, 462], ["thrower", 1160, 380]]], { reward: "gem" }),
      wave("club-3", 1220, "Weapon Ring", [[["bomber", 1420, 388], ["blade", 1540, 466, "elite"], ["ninja", 1640, 410]]], { reward: "weapon:gauntlet" }),
      wave("club-4", 1770, "Enraged Crowd", [[["brute", 1940, 424, "enraged"], ["medic", 2040, 384], ["grabber", 2160, 466, "elite"]]], { reward: "power" }),
      wave("club-5", 2360, "Champion Gearbox", [[["mutant", 2490, 426, "elite"], ["shield", 2600, 386, "armored"]]], { miniBoss: true, reward: "weapon:wrench" })
    ],
    [[420, 466, "crate"], [700, 390, "sign"], [1040, 492, "barrel"], [1460, 430, "explosive"], [1860, 386, "crate"], [2260, 488, "barrel"]],
    [[620, 402, "weapon:pipe"], [960, 486, "health"], [1330, 430, "gem"], [1700, 500, "weapon:gauntlet"], [2100, 420, "power"]]
  ),
  makeStage(
    4,
    "Cyber Junkyard",
    ["#070b0b", "#1b2930", "#495543", "#ff8b3d", "#37f5ff"],
    "junkyard",
    3000,
    [
      ["debris", 560, 392],
      ["electric", 1040, 492],
      ["crusher", 1650, 420],
      ["explosive", 2260, 488],
      ["debris", 2580, 404]
    ],
    [
      wave("junk-1", 250, "Scrap Pickers", [[["thug", 560, 408, "armored"], ["thrower", 700, 468], ["drone", 820, 350]]], { reward: "gem" }),
      wave("junk-2", 760, "Bomb Pile", [[["bomber", 970, 410], ["bomber", 1120, 468], ["shield", 1220, 392]]], { reward: "weapon:pipe" }),
      wave("junk-3", 1270, "Drone Nest", [[["drone", 1460, 350], ["drone", 1580, 400], ["ninja", 1690, 466]]], { reward: "health" }),
      wave("junk-4", 1840, "Armored Salvage", [[["mutant", 2020, 430], ["medic", 2140, 386], ["shield", 2240, 468, "elite"]]], { reward: "power" }),
      wave("junk-5", 2470, "Junkyard Crusher", [[["mutant", 2620, 424, "armored"], ["bomber", 2730, 466, "elite"]]], { miniBoss: true, reward: "weapon:sign" })
    ],
    [[430, 466, "crate"], [680, 390, "barrel"], [1040, 492, "explosive"], [1410, 430, "crate"], [1880, 386, "barrel"], [2360, 488, "explosive"]],
    [[600, 402, "weapon:wrench"], [980, 486, "health"], [1340, 430, "gem"], [1760, 500, "weapon:sign"], [2200, 420, "power"]]
  ),
  makeStage(
    5,
    "Mutant Lab",
    ["#071015", "#172b3c", "#355c73", "#7cff70", "#ff4fd8"],
    "lab",
    3150,
    [
      ["laser", 680, 418],
      ["toxic", 1180, 502],
      ["laser", 1760, 448],
      ["crusher", 2320, 414],
      ["toxic", 2740, 502]
    ],
    [
      wave("lab-1", 260, "Specimens Loose", [[["grabber", 560, 410, "enraged"], ["medic", 700, 454], ["drone", 820, 350]]], { reward: "health" }),
      wave("lab-2", 780, "Laser Drill", [[["thrower", 980, 370, "elite"], ["shield", 1100, 452, "armored"], ["ninja", 1220, 410]]], { reward: "gem" }),
      wave("lab-3", 1360, "Mutant Surge", [[["mutant", 1560, 432], ["mutant", 1700, 470], ["medic", 1820, 386]]], { reward: "weapon:baton" }),
      wave("lab-4", 1970, "Armored Experiments", [[["mutant", 2160, 430, "armored"], ["shield", 2280, 386, "elite"], ["bomber", 2400, 468]]], { reward: "power" }),
      wave("lab-5", 2620, "Lab Warden", [[["mutant", 2780, 430, "enraged"], ["medic", 2900, 386, "elite"], ["drone", 3000, 354]]], { miniBoss: true, reward: "weapon:gauntlet" })
    ],
    [[480, 466, "barrel"], [780, 390, "sign"], [1120, 492, "crate"], [1520, 430, "explosive"], [2020, 386, "crate"], [2480, 488, "barrel"]],
    [[640, 402, "health"], [1020, 486, "weapon:baton"], [1460, 430, "gem"], [1900, 500, "weapon:gauntlet"], [2360, 420, "power"]]
  ),
  makeStage(
    6,
    "Final Boss Tower",
    ["#080611", "#1a122d", "#3a245d", "#ff4055", "#ffd15c"],
    "tower",
    3300,
    [
      ["laser", 600, 424],
      ["crusher", 1120, 414],
      ["electric", 1640, 494],
      ["debris", 2140, 398],
      ["laser", 2680, 446],
      ["explosive", 2980, 486]
    ],
    [
      wave("tower-1", 260, "Tower Lobby", [[["shield", 560, 408, "elite"], ["ninja", 700, 468, "elite"], ["drone", 820, 350]]], { reward: "health" }),
      wave("tower-2", 820, "Security Stack", [[["thrower", 1040, 370, "armored"], ["bomber", 1160, 452, "elite"], ["medic", 1280, 410]]], { reward: "weapon:wrench" }),
      wave("tower-3", 1420, "Mutant Guard", [[["mutant", 1620, 432, "armored"], ["shield", 1760, 470, "armored"], ["grabber", 1880, 386, "enraged"]]], { reward: "power" }),
      wave("tower-4", 2060, "Executive Kill Floor", [[["mutant", 2260, 430, "enraged"], ["ninja", 2380, 386, "elite"], ["bomber", 2500, 468, "armored"], ["medic", 2600, 420, "elite"]]], { reward: "weapon:sign" }),
      wave("tower-5", 2760, "Overboss Vex Prime", [[["brute", 2960, 416, "enraged"]]], { boss: true, reward: "power" })
    ],
    [[470, 466, "crate"], [820, 390, "explosive"], [1160, 492, "barrel"], [1580, 430, "sign"], [2080, 386, "explosive"], [2640, 488, "barrel"]],
    [[620, 402, "health"], [1020, 486, "weapon:pipe"], [1480, 430, "gem"], [1960, 500, "weapon:wrench"], [2460, 420, "power"]]
  )
];

export class Level {
  constructor(index) {
    const data = LEVELS[index] || LEVELS[0];
    Object.assign(this, JSON.parse(JSON.stringify(data)));
    this.index = data.index;
    this.cameraX = 0;
    this.spawned = new Set();
    this.completed = false;
    this.waveIndex = -1;
    this.objects = this.objects.map(([x, y, type], i) => ({
      id: `o${i}`,
      x,
      y,
      type,
      health: type === "sign" ? 28 : type === "barrel" ? 38 : type === "explosive" ? 24 : 42,
      dead: false,
      hitFlash: 0,
      lastHit: -1
    }));
    this.pickups = this.pickups.map(([x, y, rawType], i) => this.createPickup(`p${i}`, x, y, rawType));
    this.hazards = (this.hazards || []).map(([type, x, y], i) => {
      const info = HAZARD_INFO[type] || HAZARD_INFO.electric;
      return {
        id: `h${i}`,
        type,
        x,
        y,
        w: info.w,
        h: info.h,
        damage: info.damage,
        color: info.color,
        cooldown: info.cooldown,
        activeTime: info.active,
        timer: (i + 1) * 0.55,
        active: false,
        hitTags: new Set()
      };
    });
  }

  createPickup(id, x, y, rawType, ttl = null) {
    const isWeapon = rawType.startsWith("weapon:");
    return {
      id,
      x,
      y,
      type: isWeapon ? "weapon" : rawType,
      weapon: isWeapon ? rawType.split(":")[1] : null,
      taken: false,
      bob: Math.random() * 10,
      ttl
    };
  }

  updateCamera(playerX, canvasWidth) {
    const target = Math.max(0, Math.min(this.length - canvasWidth, playerX - canvasWidth * 0.37));
    this.cameraX += (target - this.cameraX) * 0.1;
  }
}

export class ParticleSystem {
  constructor() {
    this.items = [];
  }

  burst(x, y, color, count = 12, speed = 150, shape = "square") {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.25 + Math.random());
      this.items.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35 + Math.random() * 0.35, age: 0, color, size: 2 + Math.random() * 5, shape });
    }
  }

  update(dt) {
    for (const p of this.items) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 320 * dt;
    }
    this.items = this.items.filter((p) => p.age < p.life);
  }
}
