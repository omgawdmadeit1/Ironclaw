export const LEVELS = [
  {
    name: "Neon Back Alley",
    length: 2200,
    palette: ["#060817", "#112040", "#1e375f", "#37f5ff", "#ff4fd8"],
    bounds: { top: 330, bottom: 528 },
    waves: [
      { x: 420, enemies: [["thug", 560, 390], ["thug", 660, 350], ["blade", 760, 430]] },
      { x: 1100, enemies: [["brute", 1260, 386], ["thug", 1370, 440], ["blade", 1460, 348]] }
    ],
    objects: [[360, 455, "crate"], [700, 372, "sign"], [1020, 455, "barrel"], [1380, 505, "crate"], [1600, 390, "crate"], [1880, 472, "barrel"]],
    pickups: [[560, 462, "weapon:pipe"], [820, 448, "gem"], [1180, 380, "health"], [1510, 504, "weapon:baton"], [1700, 456, "power"]]
  },
  {
    name: "Toxic Sewer Tunnel",
    length: 2350,
    palette: ["#03100f", "#12342f", "#1f6658", "#7cff70", "#ffd15c"],
    bounds: { top: 334, bottom: 532 },
    waves: [
      { x: 360, enemies: [["blade", 560, 360], ["thug", 680, 430], ["blade", 820, 390]] },
      { x: 1180, enemies: [["brute", 1340, 430], ["brute", 1480, 360], ["thug", 1580, 410]] }
    ],
    objects: [[480, 462, "barrel"], [760, 510, "crate"], [940, 390, "crate"], [1300, 482, "barrel"], [1520, 430, "barrel"], [1760, 380, "sign"]],
    pickups: [[620, 392, "health"], [890, 500, "weapon:wrench"], [1080, 468, "gem"], [1480, 402, "weapon:gauntlet"], [1620, 410, "power"]]
  },
  {
    name: "Rooftop Train Line",
    length: 2500,
    palette: ["#07101f", "#1a2442", "#49366e", "#ff4fd8", "#37f5ff"],
    bounds: { top: 320, bottom: 516 },
    waves: [
      { x: 420, enemies: [["thug", 590, 380], ["blade", 740, 430], ["brute", 880, 350]] },
      { x: 1260, enemies: [["blade", 1390, 360], ["blade", 1510, 420], ["brute", 1640, 385]] },
      { x: 1880, boss: true }
    ],
    objects: [[540, 452, "crate"], [820, 500, "barrel"], [980, 372, "sign"], [1320, 456, "barrel"], [1590, 408, "crate"], [1820, 396, "crate"]],
    pickups: [[760, 390, "health"], [1040, 504, "weapon:sign"], [1220, 462, "gem"], [1560, 420, "weapon:pipe"], [1740, 452, "power"]]
  }
];

export class Level {
  constructor(index) {
    const data = LEVELS[index];
    Object.assign(this, JSON.parse(JSON.stringify(data)));
    this.index = index;
    this.cameraX = 0;
    this.spawned = new Set();
    this.objects = this.objects.map(([x, y, type], i) => ({ id: `o${i}`, x, y, type, health: type === "sign" ? 28 : type === "barrel" ? 38 : 42, dead: false, hitFlash: 0, lastHit: -1 }));
    this.pickups = this.pickups.map(([x, y, rawType], i) => {
      const isWeapon = rawType.startsWith("weapon:");
      return { id: `p${i}`, x, y, type: isWeapon ? "weapon" : rawType, weapon: isWeapon ? rawType.split(":")[1] : null, taken: false, bob: Math.random() * 10, ttl: null };
    });
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
