# Neon Fists: Sewer Clash

Original browser beat 'em up with local co-op, large modern arcade sprites, temporary weapons, wave-based stages, progression, and monetization-ready hooks. All characters, stages, code art, effects, and Web Audio sounds are original and generated locally.

## Run Locally

Serve the folder with any static server:

```powershell
python -m http.server 8080
```

Then open `http://127.0.0.1:8080/`.

There is no build step and no external runtime dependency. Opening `index.html` directly may work in some browsers, but a local server is recommended for ES modules.

## Public Web Release

The deployable static build lives in `dist/`. It contains only the runtime files needed for hosting:

- `index.html`
- `style.css`
- `src/*.js`
- `README.md`
- `LICENSE`
- `CHANGELOG.md`

The current build version is `2026.04.26-release.1`. The HTML entry point uses cache-busting query strings for `style.css` and `src/main.js`, and `src/platform.js` exports the same `BUILD_VERSION` constant for platform wrappers.

Release additions include:

- responsive mobile layout using safe-area-aware CSS
- touch controls for movement, attacks, dash, block, special, pickup/revive, and pause
- loading screen with status text and progress bar
- fullscreen toggle button
- reset-save button with browser confirmation
- privacy-friendly analytics placeholder disabled by default
- CrazyGames, Poki, itch.io, and GameDistribution SDK adapter placeholders disabled by default

## Controls

- Player 1 move: WASD
- Player 1 actions: J punch, K kick, L jump, I block, U special, Shift dash, E pick up/drop weapon or assist revive
- Player 2 move: Arrow keys
- Player 2 actions: Numpad 1 punch, Numpad 2 kick, Numpad 3 jump, Numpad 4 block, Numpad 5 special, Numpad 0 dash, Numpad 6 or Numpad + pick up/drop weapon or assist revive
- Player 2 fallback actions: top-row 1/2/3/4/5, 0 dash, 6 or = pickup/drop/revive
- Start/Pause: Enter or Escape
- Debug overlay: F3
- Gamepad: pad 1 controls P1, pad 2 controls P2 where supported

## Modes And Menus

- Story Mode: seven-stage run with upgrade choices between stages.
- Character Select: choose 1 Player or 2 Player Co-op, then pick fighters.
- Stage Select: unlocked stages are saved in localStorage after clears.
- Endless Mode: placeholder screen for future seeded survival waves.
- Upgrades: Scrap unlock shop for optional local rewards.
- Encyclopedia: enemy behavior, weakness, variants, and first-seen stage.
- Options: persistent music volume, SFX volume, mute, difficulty, and control display preference.
- Stats: total Scrap, enemies defeated, best score, best combo, and clears by stage.
- Credits: local/original asset and build notes.

The pause menu includes Resume, Controls, Item Encyclopedia, Weapon Encyclopedia, Enemy Encyclopedia, Move List, Options, Restart Stage, and Quit to Title.

## Stage List

1. Neon Back Alley: electric puddles, steam vents, explosive barrels, alley crews.
2. Toxic Sewer Tunnel: toxic splashes, pipe steam, mutant pressure, sewer pickups.
3. Rooftop Train Line: train gusts, falling debris, drones, rooftop enforcers.
4. Underground Fight Club: crowd lighting, crusher trap, elite bouncers.
5. Cyber Junkyard: debris drops, electric scrap pools, bomber and drone mixes.
6. Mutant Lab: laser sweeps, toxic pools, mutant-heavy late-game waves.
7. Final Boss Tower: laser/crusher/electric/debris hazard mix and final boss gate.

Each stage has five WaveManager waves: easy opener, mixed pressure, weapon or pickup challenge, elite wave, and mini-boss or boss encounter. Wave rewards drop pickups, weapons, power boosts, and Scrap.

## Enemies

Existing and new enemy classes now total twelve including the boss:

- Canal Punk: basic thug, melee pressure.
- Lumen Shiv: fast neon-blade attacker.
- Chrome Bulk: heavy brute with slow slam pressure.
- Latch Vandal: grabber that drains/holds until escaped.
- Riot Shell: shield punk that blocks frontal attacks.
- Bottle Byte: ranged thrower.
- Skitter Drone: flying low-health attacker.
- Patch Saint: medic that heals nearby enemies.
- Fuse Rat: bomber that drops explosive charges.
- Flash Runner: fast dodge enemy.
- Graft Hulk: late-game mutant heavy.
- Overboss Vex: large boss with phase-two rage behavior.

Variants are normal, elite, armored, and enraged. Variants change health, speed, damage, stun resistance, score/Scrap value, and accent colors.

## Progression

Scrap is the soft currency. Earn it from enemies, destructibles, gems, wave clears, boss clears, combo-driven scoring, and stage clears.

Between story stages each player chooses one of three upgrade cards:

- Reinforced Core: max health
- Weapon Tape: weapon durability
- Volt Capacitor: super/power gain
- Combo Focus: combo damage
- Scrap Magnet: pickup magnet range
- Field Medic: revive speed
- Phase Dash: dash invulnerability
- Critical Knuckles: critical hit chance

Unlocks are stored locally and currently include starting weapon, cosmetic/supporter placeholders, bonus portraits, sound test placeholder, and encyclopedia entries. Stage unlocks, best scores, best combos, total enemies defeated, total Scrap earned, and clear counts persist in localStorage under `neonFistsSave.v3`.

## Monetization-Ready Hooks

No real ads, payments, accounts, SDKs, or payment processing are implemented.

`src/monetization.js` contains disabled placeholder systems:

- `RewardedAdManager`: future continue, double Scrap, bonus weapon crate, revive-both hooks.
- `SponsorSplash`: future optional sponsor screen.
- `PremiumUnlock`: future supporter skin pack, no-ad mode, challenge mode, soundtrack link placeholder.
- `AnalyticsEvents`: local event hook surface for stage clear, upgrades, and future funnel events.

All monetization hooks are optional and disabled by default.

`src/platform.js` contains public release adapter placeholders for:

- CrazyGames
- Poki
- itch.io
- GameDistribution

These adapters expose safe no-op methods for initialization, gameplay start/stop, commercial breaks, rewarded breaks, happy-time events, and score submission. They are disabled until a real platform SDK is intentionally integrated.

## Combat Systems

- Local two-player co-op is always available. P1 and P2 have independent health, lives, score, combo, power timer, special cooldown, upgrades, and weapon inventory.
- Shared camera follows the player group and clamps both fighters inside the active brawler lane.
- Revive mechanic: stand near a downed partner and hold pickup or block. Revive speed upgrades shorten the timer.
- Co-op enemy scaling increases health, score value, damage, and attack cadence.
- Difficulty settings: Easy, Normal, Hard. Difficulty persists and affects enemy health, damage, speed, boss health, and Scrap/score tuning.
- Combo routes: punch-punch-punch SMASH, punch-punch-kick LAUNCH KICK, dash+punch STREET RUSH, jump+kick SKY DROP, special after a strong combo or power boost for fighter-specific supers.
- Temporary weapons: steel pipe, energy baton, street sign, shock gauntlet, heavy wrench. Punch uses light weapon attack, kick uses heavy weapon attack, special uses enhanced weapon move when powered.
- Reactions include stun, hurt, knockdown, launch, wall bounce, ground bounce, shocked frames, slammed poses, boss stagger, hitstop, camera shake, sparks, trails, and dust.

## Visual And Audio System

- Canvas-only rendering with a 384x216 internal canvas scaled sharply to the visible canvas with image smoothing disabled.
- `src/sprites.js` contains embedded indexed-color sprite-sheet data and cached frame canvases.
- `src/tiles.js` contains reusable tile-like stage details.
- `Renderer.drawStageSetPieces()` and `Renderer.drawStageIdentity()` add unique stage silhouettes and animated details for all seven stages.
- `Renderer.drawHazards()` telegraphs active hazards and draws distinct electric, steam, toxic, debris, gust, laser, crusher, and explosive effects.
- `ParticleSystem.burst()` supports square sparks, line dust, star impacts, and ring bursts.
- `AudioManager` synthesizes music and SFX with Web Audio.

## Code Layout

- `src/game.js`: main loop, renderer, input, co-op camera, combat, hazards, stage clear flow, difficulty, Scrap awards, debug overlay.
- `src/player.js`: `Entity`, `Player`, fighters, combo routes, supers, weapon use.
- `src/enemy.js`: enemy archetypes, variants, AI, reactions, boss phase behavior.
- `src/level.js`: seven stages, hazards, objects, pickups, wave definitions, particles.
- `src/waves.js`: WaveManager spawn groups, delays, caps, rewards, boss gates, stage completion.
- `src/progression.js`: localStorage save, options, difficulty, upgrades, Scrap, unlocks, stats.
- `src/monetization.js`: disabled rewarded-ad, sponsor, premium, and analytics placeholders.
- `src/stats.js`: score/combo helpers.
- `src/sprites.js`: embedded sprite sheets, palettes, animations, cached renderer.
- `src/tiles.js`: embedded stage tiles and cached tile renderer.
- `src/weapons.js`: weapon definitions and durability state.
- `src/audio.js`: synthesized sounds, music loop, volume and mute.
- `src/ui.js`: HUD, title menu, stage select, upgrade cards, encyclopedias, pause menu, options, stats, credits.

## Extending Content

Add an enemy by inserting an entry in `ENEMY_TYPES` in `src/enemy.js`, adding a sprite/palette in `src/sprites.js` if needed, and spawning it from a wave in `src/level.js`.

Add a stage by appending a `makeStage(...)` entry to `LEVELS` in `src/level.js`. Include palette, theme, hazards, waves, destructibles, pickups, and rewards.

Add a wave by adding a `wave(...)` entry with gate position, label, spawn groups, enemy cap, delays, reward, and boss/mini-boss flag.

Add an upgrade by adding a card to `UPGRADE_POOL` in `src/progression.js` and documenting its effect in the README/menu if it needs player-facing explanation.

Add an unlock by extending the `unlocks` save defaults in `src/progression.js`, adding a shop card in `src/ui.js`, and checking it from the gameplay or rendering system that should use it.

Add a monetization integration by replacing the disabled placeholder methods in `src/monetization.js`. Keep hooks optional so the web game remains playable without external services.

## Validation

Current validation pass:

```powershell
cmd /c "for %f in (src\*.js) do @node --check %f"
```

Browser checks covered title menu, Story Mode, character select, gameplay HUD, pause menu, options, enemy encyclopedia, stage select, unlocks, encyclopedia, stats, credits, endless placeholder, and console error check.

The release package was served from `dist/` at `http://127.0.0.1:8090/` and verified for title load, options, analytics/platform placeholder copy, reset-save button presence, Story Mode, 1P gameplay HUD, fullscreen button presence, touch-control DOM presence, and console errors `0`.

Data validation covered all seven levels, 35 waves, 12 enemy classes including boss, spawned wave groups, variants, hazards, and boss/mini-boss stage gates.

## Publishing Checklist

Before publishing a web build:

1. Run `cmd /c "for %f in (src\*.js) do @node --check %f"`.
2. Rebuild or refresh `dist/` so it contains only release files.
3. Serve `dist/` locally and verify the title screen, Story Mode, 1P, 2P, pause menu, options, touch controls, fullscreen, and reset-save confirmation.
4. Confirm browser console errors are `0`.
5. Confirm analytics and platform SDK adapters are disabled unless the target platform integration is intentionally enabled.
6. Upload the contents of `dist/` to the static host or platform portal.
7. On the hosted URL, test desktop keyboard, mobile/touch layout, fullscreen behavior, save persistence, and a hard refresh to confirm cache busting.
8. Keep platform-specific SDK changes isolated in `src/platform.js` and update the changelog with the release version.
