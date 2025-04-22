function getTokenLevelInfo(stakeStart) {
  const now = Math.floor(Date.now() / 1000);
  const duration = now - stakeStart;

  const thresholds = [7 * 86400, 14 * 86400, 30 * 86400]; // in seconds
  const levelLabels = ["Recruit", "Adventurer", "Veteran", "Elite"];

  let level = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (duration >= thresholds[i]) level = i + 1;
  }

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
  };
} 