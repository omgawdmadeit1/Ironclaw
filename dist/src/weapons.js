export const WEAPONS = {
  pipe: {
    id: "pipe",
    name: "Steel Pipe",
    short: "PIPE",
    color: "#c7d0dd",
    dark: "#556070",
    glow: "#ffffff",
    maxUses: 7,
    light: { damage: 20, range: 105, arc: 50, knock: 220, stun: 0.34, active: [0.1, 0.25], duration: 0.42 },
    heavy: { damage: 30, range: 118, arc: 58, knock: 320, stun: 0.48, active: [0.16, 0.36], duration: 0.58, finisher: true },
    special: { damage: 40, range: 132, arc: 72, knock: 390, stun: 0.65, active: [0.16, 0.48], duration: 0.72, finisher: true, launch: 180 }
  },
  baton: {
    id: "baton",
    name: "Energy Baton",
    short: "BATON",
    color: "#37f5ff",
    dark: "#0b6577",
    glow: "#baffff",
    maxUses: 9,
    light: { damage: 17, range: 116, arc: 48, knock: 190, stun: 0.38, active: [0.07, 0.23], duration: 0.34 },
    heavy: { damage: 23, range: 126, arc: 55, knock: 250, stun: 0.5, active: [0.12, 0.32], duration: 0.5, finisher: true },
    special: { damage: 35, range: 150, arc: 78, knock: 330, stun: 0.74, active: [0.12, 0.46], duration: 0.66, finisher: true, shock: true }
  },
  sign: {
    id: "sign",
    name: "Street Sign",
    short: "SIGN",
    color: "#ff4fd8",
    dark: "#5d245d",
    glow: "#ffd15c",
    maxUses: 5,
    light: { damage: 24, range: 124, arc: 62, knock: 260, stun: 0.42, active: [0.13, 0.34], duration: 0.54, finisher: true },
    heavy: { damage: 34, range: 138, arc: 74, knock: 350, stun: 0.58, active: [0.2, 0.42], duration: 0.68, finisher: true, launch: 160 },
    special: { damage: 44, range: 160, arc: 88, knock: 430, stun: 0.72, active: [0.2, 0.52], duration: 0.8, finisher: true, launch: 220 }
  },
  gauntlet: {
    id: "gauntlet",
    name: "Shock Gauntlet",
    short: "GAUNTLET",
    color: "#ffd15c",
    dark: "#7d5420",
    glow: "#fff1a3",
    maxUses: 8,
    light: { damage: 21, range: 92, arc: 52, knock: 250, stun: 0.42, active: [0.07, 0.2], duration: 0.32, shock: true },
    heavy: { damage: 30, range: 104, arc: 62, knock: 340, stun: 0.56, active: [0.13, 0.34], duration: 0.54, finisher: true, shock: true },
    special: { damage: 48, range: 128, arc: 86, knock: 470, stun: 0.82, active: [0.16, 0.52], duration: 0.78, finisher: true, launch: 260, shock: true }
  },
  wrench: {
    id: "wrench",
    name: "Heavy Wrench",
    short: "WRENCH",
    color: "#aeb8c4",
    dark: "#39404c",
    glow: "#ff4055",
    maxUses: 5,
    light: { damage: 26, range: 98, arc: 56, knock: 300, stun: 0.48, active: [0.14, 0.34], duration: 0.56, finisher: true },
    heavy: { damage: 40, range: 114, arc: 68, knock: 440, stun: 0.7, active: [0.24, 0.48], duration: 0.78, finisher: true, launch: 220 },
    special: { damage: 55, range: 136, arc: 90, knock: 520, stun: 0.9, active: [0.24, 0.58], duration: 0.92, finisher: true, launch: 320 }
  }
};

export const WEAPON_IDS = Object.keys(WEAPONS);

export function makeWeaponState(id) {
  const def = WEAPONS[id] || WEAPONS.pipe;
  return { id: def.id, name: def.name, short: def.short, uses: def.maxUses, maxUses: def.maxUses };
}
