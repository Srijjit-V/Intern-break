/** Server-side price list in diamonds. The client's price is never trusted.
 * Must match src/content/pages/rewards.json (a test enforces it). */
const PRICES: Record<string, number> = {
  "Classic T-shirt": 150,
  "Cozy Hoodie": 300,
  "Team Lanyard": 75,
  "Insulated Water Bottle": 180,
  "Desk Essentials Kit": 225,
  "Team Lunch of Your Choice": 750,
};

export function rewardPrice(name: unknown): number | null {
  if (typeof name !== 'string' || !Object.prototype.hasOwnProperty.call(PRICES, name)) return null;
  return PRICES[name];
}

export const REWARD_NAMES = Object.keys(PRICES);
