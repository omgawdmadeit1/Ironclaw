# Neon Fists: Sewer Clash

Original browser beat 'em up inspired by the energy and pacing of arcade brawlers, now pushed toward cleaner modern 2D arcade presentation. All characters, stages, code art, effects, and Web Audio sounds are original and generated locally.

## Run Locally

Open `index.html` directly in a modern browser, or serve the folder:

```powershell
python -m http.server 8080
```

Then visit `http://localhost:8080`.

If Python is not available, any static server works. The project has no build step and no runtime dependencies.

## Controls

- Player 1 move: WASD
- Player 1 actions: J punch, K kick, L jump, I block, U special, Shift dash, E pick up/drop weapon or assist revive
- Player 2 move: Arrow keys
- Player 2 actions: Numpad 1 punch, Numpad 2 kick, Numpad 3 jump, Numpad 4 block, Numpad 5 special, Numpad 0 dash, Numpad 6 or Numpad + pick up/drop weapon or assist revive
- Player 2 fallback actions for compact keyboards: top-row 1/2/3/4/5, 0 dash, 6 or = pickup/drop/revive
- Start/Pause: Enter or Escape
- Gamepad: pad 1 controls P1, pad 2 controls P2 where supported

## Game Systems

- Pseudo-3D side-scrolling street plane with vertical lane movement.
- Local two-player co-op is always available. P1 and P2 have independent health, lives, score, combo timers, power timers, special cooldowns, and weapon inventories.
- The camera tracks the active player group and clamps both fighters inside the visible brawler lane so partners cannot drift too far apart.
- Revive mechanic: when one player is down but still has lives, the other player can stand close and hold pickup or block to fill the revive meter. If both players are down but still have lives, they auto-get-up after a short KO beat.
- Co-op enemy scaling increases enemy health, score value, damage, and attack cadence so the two-player run keeps pressure without changing enemy roles or boss behavior.
- Three stages: Neon Back Alley, Toxic Sewer Tunnel, Rooftop Train Line.
- Four enemy roles: Canal Punk thug, Lumen Shiv fast attacker, Chrome Bulk heavy, and Overboss Vex.
- Player verbs: three-hit punch chain, kick, jump attack, dash attack, block, and special attack.
- Combo branches: punch, punch, punch triggers the SMASH finisher; punch, punch, kick triggers LAUNCH KICK; dash plus punch triggers STREET RUSH; airborne kick triggers SKY DROP; and special after a live 3-hit chain or power boost triggers a fighter-specific super. Jax uses VOLT RUSH, Rook uses ANVIL SLAM, and two powered players near each other can trigger DUAL OVERDRIVE. P2 uses the same routes on the Numpad actions.
- Temporary weapons: steel pipe, energy baton, street sign, shock gauntlet, and heavy wrench. Each player can carry one weapon independently. Each weapon has durability, light attack on punch, heavy attack on kick, and an enhanced weapon move on special when power boost is active.
- Hit reactions include knockback, stun, hurt/knockdown/get-up reads, hit flash, wall bounce near camera bounds, ground bounce on finishers, shocked frames from electric weapons, crushed/slammed poses from wrench and super impacts, spinning knockback from the street sign, boss armor-crack stagger, co-op combo bursts, health bars, score, combo counter, KO fade, hitstop, screen shake, sparks, attack trails, and dust-style particles.
- Pickups include larger animated health kits, score crystals, temporary power gauntlets, and weapon drops with bobbing, glow, pickup labels, blink-before-expire behavior, and flash bursts.
- Audio is synthesized with the Web Audio API: hits, jump, pickups, KO, boss warning, lightweight music loops, music/SFX volume controls, and mute.
- The pause menu includes Resume, Controls, Item Encyclopedia, Weapon Encyclopedia, Move List, Audio, Restart Stage, and Quit to Title.

## Visual and Animation System

The game uses Canvas-only original procedural art. There are no external sprites or copyrighted source assets.

- `src/sprites.js` contains the embedded indexed-color sprite-sheet system. It builds original high-detail ASCII/palette pixel maps for both fighters, all enemy roles, and boss phase variants, then caches rendered frames to offscreen canvases.
- Fighter and regular enemy source frames are 48x64 indexed pixel maps. Boss frames use 64x80 maps for a larger arcade silhouette. In-game sheet scales were increased again for a bigger modern brawler read: players are roughly 30% larger than the previous pass, regular enemies are 20-30% larger, and the boss is over 35% larger.
- Sprite maps use palette ramps for outline, shadow, midtone, highlight, accent, glow, gloves, boots, skin, and hair/helmet details. Shapes are built from tapered limbs, ellipses, dithered folds, and smear poses instead of large rectangular blocks.
- Character heads now draw state-aware eyes, brows or visors, noses, mouths, chins, KO faces, hurt grimaces, attack focus faces, and a rage face for boss phase two. Hands are no longer simple glove blobs: idle fists, punch follow-through fists, open blocking palms, weapon grips, and boss clawed hands are generated per pose.
- Body detail has been expanded with shoulder pads, elbows, knee pads, belts, jacket folds, armor seams, straps, highlights, and clearer left/right arm layering for attacks and weapon grips.
- Rendering uses a 384x216 internal Canvas, then scales sharply to the visible 960x540 canvas with image smoothing disabled. The renderer now draws modern glow layers, soft lighting gradients, larger shadows, brighter weapon trails, and cleaner HUD glass panels on top of the cached sprite frames.
- `PixelSpriteRenderer` supports indexed palettes, palette variants, frame durations, frame offsets, horizontal flipping, cached frame canvases, and optional hitbox metadata.
- Player palettes come from the embedded sprite sheets and `FIGHTERS` in `src/player.js`. Enemy palettes and silhouettes come from `src/sprites.js` and `ENEMY_TYPES` in `src/enemy.js`.
- `src/tiles.js` contains reusable indexed pixel tiles for bricks, pipes, vents, windows, signs, puddles, crates, and skyline chunks.
- Attack and weapon effects are generated with `Game.updateTrails()`, `Renderer.drawTrails()`, particle bursts, screen flash, freeze frames, and move-name popups. Combo finishers and weapon hits use larger modern arcs, brighter glow smears, star sparks, ring bursts, longer hitstop, stronger enemy recoil, wall/ground bounce, and co-op combo feedback.
- Super attacks use showcase animation states with anticipation, aura buildup, active impact frames, longer hitstop, screen flash, and recovery. Jax's VOLT RUSH emphasizes multi-hit electric rush silhouettes, Rook's ANVIL SLAM emphasizes ground cracks and heavy recovery, and DUAL OVERDRIVE combines both players' colors when both powered fighters are close.
- `src/weapons.js` defines original temporary weapon data: durability, damage, range, active windows, knockback, stun, labels, and color ramps. Weapon durability is consumed on successful hits and breaks into a pixel burst. Held weapons are drawn attached to the player's grip hand, with pipe shoulder swings, electric baton jabs, huge street-sign sweeps, shock-gauntlet fist blooms, and heavy wrench overhead slams. Low-durability street signs visibly bend.
- `Renderer.drawHealthPickup()`, `drawGemPickup()`, `drawPowerPickup()`, and `drawWeaponPickup()` draw the enlarged pickup icons directly in Canvas using original indexed-style pixel clusters.
- Stage set pieces are generated in `Renderer.drawStageSetPieces()`, `drawModernAtmosphere()`, `drawModernFloorLighting()`, and `Renderer.drawForeground()`: alley city depth, signage glow, rain and wet reflections; sewer tunnel glow, animated toxic reflections, steam and pipe layers; rooftop skyline haze, moving signs, wind streaks, train lights, and foreground machinery.
- Particles support square sparks, short line dust, star impact sparks, and expanding ring bursts through the `shape` argument in `ParticleSystem.burst()`.
- Stage starts and stage changes use a chunky low-res wipe driven by `transitionWipeTimer` and rendered in `Renderer.drawScreenOverlay()`.
- `src/ui.js` renders the modernized DOM HUD, character select, full pause menu, encyclopedia pages, move list, audio controls, game over, and victory screens. Item and weapon encyclopedia cards now include larger CSS-drawn icons and stat rows for weapon damage, range, speed, durability, and special effect.

## Code Layout

- `src/game.js`: main loop, two-player input routing, shared camera, revive logic, co-op enemy scaling, renderer, combat resolution, stage progression.
- `src/player.js`: `Entity`, `Player`, fighter definitions, player attack state.
- `src/enemy.js`: enemy archetypes, AI, boss phase behavior.
- `src/level.js`: stage data, wave spawning data, pickups, destructibles, particles.
- `src/sprites.js`: embedded sprite-sheet pixel maps, palettes, animations, and cached renderer.
- `src/tiles.js`: embedded stage tile maps and cached tile renderer.
- `src/weapons.js`: temporary weapon definitions and weapon state factory.
- `src/audio.js`: Web Audio sound effects, procedural music loop, mute, music volume, and SFX volume.
- `src/ui.js`: DOM start screen, character select, HUD, full pause menu, controls, encyclopedias, move list, audio, game over, victory.

## Extending Content

Add a new enemy by inserting a new entry in `ENEMY_TYPES` inside `src/enemy.js`, then spawn it from a level wave in `src/level.js`.

Add a new level by adding an object to `LEVELS` in `src/level.js`. Define `length`, `palette`, movement `bounds`, `waves`, `objects`, and `pickups`.

Add a new fighter by adding a record to `FIGHTERS` in `src/player.js`. The renderer uses the color palette and stats automatically.

Co-op player creation happens in `Game.newRun()` through `Game.createPlayer()`. The compatibility property `game.player` points at the first active player, while gameplay systems should use `game.players`, `activePlayers()`, or `nearestPlayer()` for new co-op-aware behavior.

Animation is driven by embedded sprite-sheet frame data. Add a new animation by adding maps and frame entries in `src/sprites.js`, then make the entity set that state. Combat timing uses startup/active/recovery windows in `Player.attackSpec()` and `Enemy.attackSpec()`.

Combo routes live in `Player.update()` and their active hit data lives in `Player.attackSpec()`. To add a new branch, create a new `attackKind`, map it to a visible animation state, define its startup/active/recovery timing in `attackSpec()`, then add any unique trail or popup behavior in `Game.updateTrails()` and `Game.onHit()`. Fighter-specific supers and co-op supers follow this same path.

Add a new weapon by adding an entry to `WEAPONS` in `src/weapons.js`, then reference it from level pickup data as `weapon:yourId` or from drop logic in `Game.randomWeaponId()`. The renderer will draw a pickup and held weapon using the entry's palette; unique silhouettes can be added in `Renderer.drawWeaponPickup()`, `Renderer.drawHeldWeapon()`, `Renderer.drawTrails()`, and the pause encyclopedia icon helpers in `src/ui.js`.
