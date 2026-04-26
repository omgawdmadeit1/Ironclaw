export const BUILD_VERSION = "2026.04.26-release.1";

export const RELEASE_CONFIG = {
  analyticsEnabled: false,
  platformSDKsEnabled: false,
  platforms: {
    crazyGames: false,
    poki: false,
    itch: false,
    gameDistribution: false
  }
};

export class PrivacyAnalytics {
  constructor({ enabled = false, version = BUILD_VERSION } = {}) {
    this.enabled = enabled;
    this.version = version;
    this.events = [];
  }

  track(name, payload = {}) {
    if (!this.enabled) return false;
    this.events.push({
      name,
      payload: this.redact(payload),
      version: this.version,
      timestamp: Date.now()
    });
    return true;
  }

  redact(payload) {
    const safe = {};
    for (const [key, value] of Object.entries(payload || {})) {
      if (/email|name|token|ip|address|location|id/i.test(key)) continue;
      safe[key] = typeof value === "object" ? JSON.parse(JSON.stringify(value)) : value;
    }
    return safe;
  }
}

class PlatformSDKAdapter {
  constructor(id, displayName, enabled = false) {
    this.id = id;
    this.displayName = displayName;
    this.enabled = enabled;
    this.readyState = "disabled";
  }

  init() {
    this.readyState = this.enabled ? "placeholder" : "disabled";
    return this.readyState;
  }

  gameplayStart() {
    return this.enabled;
  }

  gameplayStop() {
    return this.enabled;
  }

  happyTime() {
    return this.enabled;
  }

  commercialBreak() {
    return Promise.resolve(false);
  }

  rewardedBreak() {
    return Promise.resolve(false);
  }

  submitScore() {
    return false;
  }
}

export function createPlatformAdapters(config = RELEASE_CONFIG) {
  return {
    crazyGames: new PlatformSDKAdapter("crazyGames", "CrazyGames", config.platforms.crazyGames),
    poki: new PlatformSDKAdapter("poki", "Poki", config.platforms.poki),
    itch: new PlatformSDKAdapter("itch", "itch.io", config.platforms.itch),
    gameDistribution: new PlatformSDKAdapter("gameDistribution", "GameDistribution", config.platforms.gameDistribution)
  };
}

export function initializeReleaseServices(config = RELEASE_CONFIG) {
  const analytics = new PrivacyAnalytics({ enabled: config.analyticsEnabled, version: BUILD_VERSION });
  const platforms = createPlatformAdapters(config);
  Object.values(platforms).forEach((adapter) => adapter.init());
  return {
    version: BUILD_VERSION,
    analytics,
    platforms,
    config
  };
}
