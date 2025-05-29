// punchTracker.js

function calculateTier(baselineSales, currentSales) {
  const growth = ((currentSales - baselineSales) / baselineSales) * 100;

  if (growth >= 120) return 90;
  if (growth >= 90) return 85;
  if (growth >= 60) return 80;
  if (growth >= 30) return 75;
  return 70;
}

function updateUserTier(user) {
  const baseline = user.baselineSales;
  const current = user.salesLast90Days;

  const newTier = calculateTier(baseline, current);

  if (newTier > (user.tier || 70)) {
    user.tier = newTier;
    user.highestTier = Math.max(user.highestTier || 70, newTier);
    return `Tier upgraded to ${newTier}%`;
  }

  return `No change. Current tier remains ${user.tier || 70}%`;
}
