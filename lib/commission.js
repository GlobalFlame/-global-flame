// /lib/commission.js
export function calcCuts(user, amount) {
  const tiers = {
    Iron:     { self: 0.35, down: 0.05 },
    Bronze:   { self: 0.45, down: 0.10 },
    Silver:   { self: 0.60, down: 0.15 },
    Gold:     { self: 0.70, down: 0.20 },
    Platinum: { self: 0.80, down: 0.25 },
  };
  const cut = tiers[user.flame_tier] ?? tiers.Iron;
  return {
    toCreator: amount * cut.self,
    toUpline:  amount * cut.down,
    toPool:    amount - (amount * cut.self) - (amount * cut.down),
  };
}
