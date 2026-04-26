export function stageScore(players) {
  return players.reduce((sum, player) => sum + (player.score || 0), 0);
}

export function bestCombo(players) {
  return players.reduce((best, player) => Math.max(best, player.bestCombo || player.combo || 0), 0);
}

export function formatNumber(value) {
  return Math.round(value || 0).toLocaleString("en-US");
}
