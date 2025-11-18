// You can fetch these parameters dynamically using a library like web3.js or ethers.js if desired.
// For now, they're hardcoded, so update these values if the contract levels change.
const thresholds = [7 * 86400, 14 * 86400, 30 * 86400]; // in seconds

function getTokenLevelInfo(stakeStart, lastClaim) {
  // Si el token no está staked (stakeStart es 0), retornar null
  if (stakeStart === 0) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const duration = now - stakeStart;
  
  // Check if the token was just claimed or newly staked
  const isFresh = stakeStart === lastClaim;
  
  // Determine the current level from the duration since last claim
  let level = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (duration >= thresholds[i]) level = i + 1;
  }
  
  // If levels change in the contract, update levelLabels accordingly
  const levelLabels = ["Recruit", "Adventurer", "Veteran", "Elite"];
  
  const nextLevel = level < thresholds.length ? level + 1 : null;
  const nextThreshold = nextLevel ? thresholds[nextLevel - 1] : null;
  const progressPercent = nextThreshold ? Math.min(100, (duration / nextThreshold) * 100) : 100;
  const readableDuration = Math.floor(duration / 86400) + " days";
  
  return {
    level,
    label: levelLabels[level],
    experience: readableDuration,
    progress: nextLevel
      ? `${Math.floor(progressPercent)}% toward level ${nextLevel}`
      : "Max level reached",
    note: isFresh ? "Just claimed or newly staked" : null
  };
}

// Export the function for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getTokenLevelInfo };
} 