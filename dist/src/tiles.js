const TILE_PALETTE = {
  ".": null,
  o: "#05070d",
  b: "#17243d",
  B: "#26395d",
  c: "#37f5ff",
  p: "#ff4fd8",
  y: "#ffd15c",
  g: "#7cff70",
  d: "#0f1728",
  m: "#6b3d25",
  r: "#9a6339",
  s: "#193f39",
  v: "#405266",
  w: "#d7f8ff"
};

export const TILE_MAPS = {
  brick: [
    "bbbbBBBBbbbbBBBB",
    "b..b....b..b....",
    "BBBBbbbbBBBBbbbb",
    "..b....b..b....b",
    "bbbbBBBBbbbbBBBB",
    "b..b....b..b....",
    "BBBBbbbbBBBBbbbb",
    "..b....b..b....b"
  ],
  pipe: [
    "oooooooooooooooo",
    "ssssssssssssssss",
    "sGGsGGsGGsGGsGGs",
    "ssssssssssssssss",
    "oooooooooooooooo",
    "....g.......g...",
    "...gg......gg...",
    "....g.......g..."
  ],
  vent: [
    "oooooooooooooooo",
    "ovvvvvvvvvvvvvo",
    "ov..v..v..v..vo",
    "ovvvvvvvvvvvvvo",
    "ov..v..v..v..vo",
    "ovvvvvvvvvvvvvo",
    "oooooooooooooooo",
    "................"
  ],
  window: [
    "oooooooooooooooo",
    "obbbbbbbbbbbbbo",
    "obbccbbccbbccbo",
    "obbbbbbbbbbbbbo",
    "obbccbbccbbccbo",
    "obbbbbbbbbbbbbo",
    "oooooooooooooooo",
    "................"
  ],
  sign: [
    "oooooooooooooooo",
    "opppppppppppppo",
    "opccccccccccppo",
    "opppppppppppppo",
    "oooooooooooooooo",
    "......cc........",
    "......cc........",
    "......cc........"
  ],
  puddle: [
    "................",
    "................",
    "...cccccccc.....",
    ".ccbbbbbbcc.....",
    "...ccbbbbcccc...",
    ".....cccc.......",
    "................",
    "................"
  ],
  crate: [
    "mmmmmmmmmmmmmmmm",
    "mrrrrrrrrrrrrrrm",
    "mryrrrrrrrrrryrm",
    "mrryrrrrrrrryrrm",
    "mrrryrrrrrryrrrm",
    "mrrrryrrrryrrrrm",
    "mrrrrryrryrrrrrm",
    "mmmmmmmmmmmmmmmm"
  ],
  skyline: [
    "....bbbb....BBBB",
    "....bbbb....BBBB",
    "....bbcc....BBcc",
    "bbbbbbbbBBBBBBBB",
    "bbccbbbbBBccBBBB",
    "bbbbbbbbBBBBBBBB",
    "bbbbbbbbBBBBBBBB",
    "bbbbbbbbBBBBBBBB"
  ]
};

export class PixelTileRenderer {
  constructor() {
    this.cache = new Map();
  }

  draw(ctx, key, x, y, scale = 3, alpha = 1) {
    const image = this.render(key);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, Math.round(x), Math.round(y), image.width * scale, image.height * scale);
    ctx.restore();
  }

  render(key) {
    if (this.cache.has(key)) return this.cache.get(key);
    const rows = TILE_MAPS[key] || TILE_MAPS.brick;
    const canvas = document.createElement("canvas");
    canvas.width = rows[0].length;
    canvas.height = rows.length;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        const color = TILE_PALETTE[rows[y][x]];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    this.cache.set(key, canvas);
    return canvas;
  }
}
