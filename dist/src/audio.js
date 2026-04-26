export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicTimer = 0;
    this.enabled = true;
    this.muted = false;
    this.musicVolume = 1;
    this.sfxVolume = 1;
    this.stage = 0;
    this.step = 0;
  }

  resume() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.18;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  setMusicVolume(value) {
    this.musicVolume = Math.max(0, Math.min(1, value));
  }

  setSfxVolume(value) {
    this.sfxVolume = Math.max(0, Math.min(1, value));
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  channelVolume(channel) {
    if (this.muted) return 0;
    return channel === "music" ? this.musicVolume : this.sfxVolume;
  }

  tone(freq, duration, type = "square", volume = 0.35, slide = 1, channel = "sfx") {
    if (!this.ctx || !this.enabled || this.channelVolume(channel) <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), now + duration);
    gain.gain.setValueAtTime(volume * this.channelVolume(channel), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  noise(duration, volume = 0.25, channel = "sfx") {
    if (!this.ctx || !this.enabled || this.channelVolume(channel) <= 0) return;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    filter.type = "bandpass";
    filter.frequency.value = 900;
    gain.gain.setValueAtTime(volume * this.channelVolume(channel), this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    src.buffer = buffer;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();
  }

  sfx(name) {
    this.resume();
    const sounds = {
      punch: () => { this.tone(180, 0.07, "square", 0.25, 0.45); this.noise(0.04, 0.16); },
      kick: () => { this.tone(140, 0.1, "sawtooth", 0.28, 0.35); this.noise(0.05, 0.18); },
      jump: () => this.tone(360, 0.12, "triangle", 0.24, 1.8),
      pickup: () => { this.tone(520, 0.08, "square", 0.22, 1.3); setTimeout(() => this.tone(780, 0.08, "square", 0.2, 1.1), 65); },
      weaponPickup: () => { this.tone(330, 0.07, "square", 0.2, 1.7); setTimeout(() => this.tone(660, 0.07, "triangle", 0.18, 1.15), 55); },
      weapon: () => { this.tone(160, 0.07, "sawtooth", 0.22, 0.6); this.noise(0.045, 0.14); },
      weaponHeavy: () => { this.tone(88, 0.12, "sawtooth", 0.28, 0.45); this.tone(220, 0.05, "square", 0.16, 0.7); this.noise(0.08, 0.2); },
      break: () => { this.tone(260, 0.04, "square", 0.18, 0.45); setTimeout(() => this.tone(120, 0.12, "sawtooth", 0.24, 0.55), 40); this.noise(0.1, 0.22); },
      ko: () => { this.tone(110, 0.24, "sawtooth", 0.28, 0.25); this.noise(0.12, 0.2); },
      boss: () => { this.tone(90, 0.18, "square", 0.34, 1.4); setTimeout(() => this.tone(70, 0.22, "square", 0.34, 1.6), 180); },
      special: () => { this.tone(240, 0.18, "sawtooth", 0.3, 2.5); this.noise(0.08, 0.12); },
      block: () => this.tone(260, 0.05, "triangle", 0.18, 0.75),
      hitHeavy: () => {
        this.tone(95, 0.12, "triangle", 0.22, 0.55);
        this.tone(210, 0.05, "square", 0.2, 0.4);
        this.noise(0.055, 0.18);
      },
      phase: () => {
        this.tone(120, 0.22, "sawtooth", 0.24, 2.8);
        setTimeout(() => this.tone(180, 0.18, "square", 0.22, 2.4), 140);
        setTimeout(() => this.noise(0.14, 0.2), 220);
      }
    };
    sounds[name]?.();
  }

  update(dt, stageIndex) {
    if (!this.ctx || !this.enabled || this.muted || this.musicVolume <= 0) return;
    this.stage = stageIndex;
    this.musicTimer -= dt;
    if (this.musicTimer > 0) return;
    const patterns = [
      [110, 0, 147, 0, 165, 196, 165, 147],
      [82, 123, 0, 110, 0, 164, 147, 110],
      [98, 131, 147, 0, 196, 175, 147, 131]
    ];
    const note = patterns[stageIndex % patterns.length][this.step % 8];
    if (note) {
      this.tone(note, 0.09, "square", 0.08, 1, "music");
      if (this.step % 4 === 0) this.tone(note / 2, 0.12, "triangle", 0.09, 0.95, "music");
    }
    this.step++;
    this.musicTimer = 0.19;
  }
}
