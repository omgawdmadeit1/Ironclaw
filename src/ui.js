import { FIGHTERS } from "./player.js";
import { spritePortraitUrl } from "./sprites.js";
import { WEAPONS } from "./weapons.js";

export class UI {
  constructor(game, hud, overlay) {
    this.game = game;
    this.hud = hud;
    this.overlay = overlay;
    this.overlayKey = "";
    this.pausePage = "main";
  }

  render() {
    this.renderHud();
    this.renderOverlay();
  }

  renderHud() {
    const players = this.game.players?.length ? this.game.players : [this.game.player].filter(Boolean);
    const boss = this.game.enemies.find((e) => e.maxHealth > 120 && e.health > 0);
    if (!players.length || this.game.mode === "start" || this.game.mode === "select") {
      this.hud.innerHTML = "";
      return;
    }
    const playerCards = players.map((p) => {
      const hp = Math.max(0, Math.round((p.health / p.maxHealth) * 100));
      const weapon = p.weapon ? WEAPONS[p.weapon.id] : null;
      const weaponPct = weapon ? Math.max(0, (p.weapon.uses / p.weapon.maxUses) * 100) : 0;
      const revivePct = Math.max(0, Math.min(100, (p.reviveProgress / 1.2) * 100));
      return `
        <div class="hud-card player-card ${p.health <= 0 ? "ko" : ""}">
          <div class="player-head"><strong>${p.playerLabel} ${p.fighter.name}</strong><span>${p.health <= 0 ? "DOWN" : "READY"}</span></div>
          <div class="bar"><span style="width:${hp}%"></span></div>
          <div>Lives ${p.lives} &nbsp; Score ${p.score}</div>
          <div class="combo ${p.combo >= 3 ? "combo-hot" : ""}">${p.combo > 1 ? `${p.combo} HIT COMBO` : "&nbsp;"}</div>
          ${p.health <= 0 && p.lives > 0 ? `<div class="revive-meter"><span style="width:${revivePct}%"></span></div>` : ""}
          <div class="weapon-readout ${weapon ? "armed" : ""}">
            <span class="weapon-icon" style="--weapon:${weapon?.color || "#7f8798"}"></span>
            <span>${weapon ? `${weapon.short} ${p.weapon.uses}/${p.weapon.maxUses}` : "NO WEAPON"}</span>
            <div class="durability"><span style="width:${weaponPct}%"></span></div>
          </div>
        </div>`;
    }).join("");
    const specialReady = players.map((p) => `${p.playerLabel} ${p.specialCooldown <= 0 ? "READY" : Math.ceil(p.specialCooldown)}`).join(" / ");
    this.hud.innerHTML = `
      <div class="hud-row">
        <div class="player-hud-group">${playerCards}</div>
        <div class="hud-card">
          <strong>${this.game.level.name}</strong>
          <div>Stage ${this.game.stageIndex + 1}/3</div>
          <div>Special ${specialReady}</div>
          <div class="small">Revive: hold pickup or block near a downed partner</div>
        </div>
        ${boss ? `<div class="hud-card boss-card"><strong>${boss.data.name}</strong><div class="bar"><span style="width:${Math.max(0, (boss.health / boss.maxHealth) * 100)}%"></span></div><div>Phase ${boss.phase}</div></div>` : ""}
      </div>
      ${this.game.stageTitleTimer > 0 ? `<div class="stage-card">Stage ${this.game.stageIndex + 1}<br><strong>${this.game.level.name}</strong></div>` : ""}
      ${this.game.bossWarningTimer > 0 ? `<div class="boss-warning"><img src="${spritePortraitUrl("boss", "phase2", "phase2")}" alt="" />Boss Warning</div>` : ""}`;
  }

  renderOverlay() {
    const mode = this.game.mode;
    const key = `${mode}:${this.game.selectedFighter}:${this.game.selectedFighters?.join("-")}:${this.pausePage}:${this.game.audio.musicVolume}:${this.game.audio.sfxVolume}:${this.game.audio.muted}`;
    if (key === this.overlayKey) return;
    this.overlayKey = key;
    if (mode === "play") {
      this.overlay.innerHTML = "";
      return;
    }
    if (mode === "start") {
      this.overlay.innerHTML = `
        <section class="menu">
          <h1 class="title">Neon Fists:<br>Sewer Clash</h1>
          <p class="subtitle">Original 16-bit inspired cyber brawler</p>
          <p class="small">Fight through alley gangs, toxic tunnel crews, and rooftop rail enforcers. All sprites and audio are procedural code art.</p>
          <div class="button-row">
            <button data-action="select">Start</button>
          </div>
          <p class="small">P1: WASD, J/K/L/I/U, Shift, E. P2: Arrows, Numpad or top-row 1/2/3/4/5, 0, 6 or +/= . Pause Enter.</p>
        </section>`;
      this.bindButtons();
      return;
    }
    if (mode === "select") {
      this.overlay.innerHTML = `
        <section class="menu">
          <h1 class="title">Choose Fighters</h1>
          <div class="menu-grid coop-select">
            ${[0, 1].map((playerIndex) => `
              <div class="select-column">
                <h2>${playerIndex === 0 ? "Player 1" : "Player 2"}</h2>
                ${FIGHTERS.map((f, i) => `<button class="fighter ${this.game.selectedFighters[playerIndex] === i ? "selected" : ""}" data-player="${playerIndex}" data-fighter="${i}">
                  <span class="portrait"><img src="${spritePortraitUrl(f.id, "idle")}" alt="" /></span>
                  <strong>${f.name}</strong><br><span class="small">${f.tagline}</span><br><span>${f.special}</span>
                </button>`).join("")}
              </div>`).join("")}
          </div>
          <div class="button-row">
            <button data-action="play">Fight</button>
            <button data-action="start">Back</button>
          </div>
        </section>`;
      this.bindButtons();
      return;
    }
    if (mode === "pause") {
      this.renderPauseOverlay();
      return;
    }
    const copy = {
      gameover: ["Game Over", "The sewer syndicate owns the night this time.", "Try Again", "select"],
      victory: ["Victory", "Vex is down and the rail line is free. Neon City owes you one.", "Play Again", "select"]
    }[mode];
    this.overlay.innerHTML = `
      <section class="menu">
        <h1 class="title">${copy[0]}</h1>
        <p class="subtitle">${copy[1]}</p>
        <div class="button-row">
          <button data-action="${copy[3]}">${copy[2]}</button>
          <button data-action="start">Title</button>
        </div>
      </section>`;
    this.bindButtons();
  }

  renderPauseOverlay() {
    const page = this.pausePage;
    const pauseNav = `
      <div class="pause-nav">
        <button data-action="resume">Resume</button>
        <button data-page="controls">Controls</button>
        <button data-page="items">Item Encyclopedia</button>
        <button data-page="weapons">Weapon Encyclopedia</button>
        <button data-page="moves">Move List</button>
        <button data-page="audio">Audio</button>
        <button data-action="restartStage">Restart Stage</button>
        <button data-action="start">Quit to Title</button>
      </div>`;
    const title = {
      main: "Paused",
      controls: "Controls",
      items: "Item Encyclopedia",
      weapons: "Weapon Encyclopedia",
      moves: "Move List",
      audio: "Audio"
    }[page] || "Paused";
    this.overlay.innerHTML = `
      <section class="menu pause-menu">
        <div class="pause-shell">
          ${pauseNav}
          <div class="pause-panel">
            <h1 class="title pause-title">${title}</h1>
            ${this.pauseContent(page)}
          </div>
        </div>
      </section>`;
    this.bindButtons();
  }

  pauseContent(page) {
    if (page === "controls") {
      return `
        <div class="info-grid">
          ${this.infoCard("Player 1", ["Move: WASD", "Punch/Kick/Jump: J / K / L", "Block/Special: I / U", "Dash: Shift", "Pick up, drop, revive: E"])}
          ${this.infoCard("Player 2", ["Move: Arrow keys", "Punch/Kick/Jump: Numpad 1 / 2 / 3", "Block/Special: Numpad 4 / 5", "Dash: Numpad 0", "Pick up, drop, revive: Numpad 6 or +"])}
          ${this.infoCard("Fallback", ["Top-row 1/2/3/4/5 work for P2 actions", "0 dashes", "6 or = picks up, drops, or revives", "Enter or Escape pauses"])}
        </div>`;
    }
    if (page === "items") {
      return `
        <div class="info-grid">
          ${this.itemCard("Health Kit", "health", ["Large medical pickup with HP label", "Restores 32 health", "Triggers a bright pickup burst"])}
          ${this.itemCard("Score Gem", "gem", ["Large faceted crystal", "Adds 250 score to the collecting player", "Sparkles and bobs while idle"])}
          ${this.itemCard("Power Boost", "power", ["Layered energy core", "Temporarily boosts damage", "Unlocks enhanced weapon and co-op supers"])}
          ${this.itemCard("Extra Life", "life", ["Not currently spawned", "Reserved for future stages", "HUD and item encyclopedia are ready for it"])}
        </div>`;
    }
    if (page === "weapons") {
      return `<div class="info-grid weapon-info">
        ${Object.values(WEAPONS).map((w) => this.weaponCard(w)).join("")}
      </div>`;
    }
    if (page === "moves") {
      return `
        <div class="info-grid">
          ${this.infoCard("Basic Routes", ["Punch, punch, punch: SMASH finisher", "Punch, punch, kick: LAUNCH KICK", "Kick: wide lane control", "Block reduces incoming damage"])}
          ${this.infoCard("Mobility Routes", ["Dash plus punch: STREET RUSH", "Jump plus kick: SKY DROP", "Air punch: quick dive attack", "Finishers trigger larger hitstop"])}
          ${this.infoCard("Power and Co-op", ["Special after a live 3-hit combo: POWER FINISH", "Weapon plus power: enhanced weapon special", "Two players hitting the same target can trigger CO-OP COMBO", "Hold pickup or block near a downed partner to revive"])}
        </div>`;
    }
    if (page === "audio") {
      return `
        <div class="audio-menu">
          ${this.volumeRow("Music", this.game.audio.musicVolume, "musicDown", "musicUp")}
          ${this.volumeRow("SFX", this.game.audio.sfxVolume, "sfxDown", "sfxUp")}
          <button data-action="toggleMute">${this.game.audio.muted ? "Unmute" : "Mute"}</button>
        </div>`;
    }
    return `
      <p class="subtitle">Modern arcade co-op brawler</p>
      <p class="small">Use the menu on the left for controls, item details, weapon data, move routes, audio controls, restart, or title return.</p>
      <div class="pause-callout">Enter or Escape resumes play. Partner revive uses pickup or block near a downed player.</div>`;
  }

  itemCard(title, type, lines) {
    const colors = { health: "#7cff70", gem: "#37f5ff", power: "#ff4fd8", life: "#ffd15c" };
    return this.infoCard(title, lines, colors[type], this.itemIcon(type));
  }

  weaponCard(w) {
    const effect = w.special.shock ? "Shock stun" : w.special.launch ? "Launcher" : "Power burst";
    return this.infoCard(w.name, [
      `${w.short}: ${w.maxUses} durability`,
      `<span class="stat-row"><b>Damage</b><span>${w.light.damage} / ${w.heavy.damage} / ${w.special.damage}</span></span>`,
      `<span class="stat-row"><b>Range</b><span>${w.light.range} / ${w.heavy.range} / ${w.special.range}</span></span>`,
      `<span class="stat-row"><b>Speed</b><span>${this.speedLabel(w.light.duration)} light, ${this.speedLabel(w.heavy.duration)} heavy</span></span>`,
      `<span class="stat-row"><b>Effect</b><span>${effect}</span></span>`
    ], w.color, this.weaponIcon(w));
  }

  speedLabel(duration) {
    if (duration <= 0.36) return "Fast";
    if (duration <= 0.6) return "Medium";
    return "Heavy";
  }

  itemIcon(type) {
    return `<div class="ency-icon item-icon ${type}"><span></span><i></i></div>`;
  }

  weaponIcon(w) {
    return `<div class="ency-icon weapon-large ${w.id}" style="--accent:${w.color};--glow:${w.glow};--dark:${w.dark}"><span></span><i></i><em></em></div>`;
  }

  infoCard(title, lines, color = null, icon = "") {
    return `
      <article class="info-card" ${color ? `style="--accent:${color}"` : ""}>
        ${icon}
        <h2>${title}</h2>
        ${lines.map((line) => `<p>${line}</p>`).join("")}
      </article>`;
  }

  volumeRow(label, value, downAction, upAction) {
    const pct = Math.round(value * 100);
    return `
      <div class="volume-row">
        <strong>${label}</strong>
        <button data-action="${downAction}">-</button>
        <div class="volume-track"><span style="width:${pct}%"></span></div>
        <button data-action="${upAction}">+</button>
        <span>${pct}%</span>
      </div>`;
  }

  bindButtons() {
    this.overlay.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        const page = button.getAttribute("data-page");
        if (page !== null) {
          this.pausePage = page;
          this.render();
          return;
        }
        const fighter = button.getAttribute("data-fighter");
        if (fighter !== null) {
          const playerIndex = Number(button.getAttribute("data-player") || 0);
          this.game.selectedFighters[playerIndex] = Number(fighter);
          this.game.selectedFighter = Number(fighter);
          this.render();
          return;
        }
        this.game.menuAction(button.dataset.action);
      });
    });
  }
}
