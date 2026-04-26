export class RewardedAdManager {
  constructor() {
    this.enabled = false;
    this.placements = ["continue", "doubleScrap", "bonusWeaponCrate", "reviveBothPlayers"];
  }

  available() {
    return false;
  }

  requestReward() {
    return { ok: false, reason: "Rewarded ads are disabled in this local build." };
  }
}

export class SponsorSplash {
  constructor() {
    this.enabled = false;
    this.sponsorName = "Sponsor placeholder";
  }
}

export class PremiumUnlock {
  constructor() {
    this.enabled = false;
    this.products = [
      { id: "supporterSkins", name: "Supporter Skin Pack", enabled: false },
      { id: "challengeMode", name: "Bonus Challenge Mode", enabled: false },
      { id: "noAds", name: "No-Ad Mode", enabled: false },
      { id: "soundtrack", name: "Soundtrack Download", enabled: false }
    ];
  }

  owns() {
    return false;
  }
}

export class AnalyticsEvents {
  constructor() {
    this.enabled = false;
    this.events = [];
  }

  track(name, payload = {}) {
    if (!this.enabled) return;
    this.events.push({ name, payload, at: Date.now() });
  }
}

export class MonetizationSuite {
  constructor() {
    this.rewardedAds = new RewardedAdManager();
    this.sponsorSplash = new SponsorSplash();
    this.premium = new PremiumUnlock();
    this.analytics = new AnalyticsEvents();
  }
}
