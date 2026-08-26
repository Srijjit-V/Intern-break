// ─── Avatar Catalog ────────────────────────────────────────────────────────────
// Pure TypeScript — no JSX, no React imports.

export type AvatarSlot = 'body' | 'shirt' | 'pants' | 'shoes' | 'hat';
export type CosmeticSlot = AvatarSlot;

export type AvatarItem = {
  id: string;
  name: string;
  slot: AvatarSlot;
  price: number;
  color: string;
  accent?: string;
};

/** Loadout stores item IDs per slot. */
export type AvatarLoadout = Record<AvatarSlot, string>;

/** Resolved loadout — each slot is the full AvatarItem. */
export type ResolvedLoadout = Record<AvatarSlot, AvatarItem>;

export const DEFAULT_LOADOUT: AvatarLoadout = {
  body: 'body_teal',
  shirt: 'shirt_white',
  pants: 'pants_navy',
  shoes: 'shoes_white',
  hat: 'hat_none',
};

export const AVATAR_CATALOG: AvatarItem[] = [
  // body
  { id: 'body_teal',   name: 'Teal',        slot: 'body',  price: 0,   color: '#1BDBDB' },
  { id: 'body_purple', name: 'Purple',       slot: 'body',  price: 100, color: '#8B5CF6' },
  { id: 'body_coral',  name: 'Coral',        slot: 'body',  price: 150, color: '#FB7185' },
  { id: 'body_lime',   name: 'Lime',         slot: 'body',  price: 200, color: '#84CC16' },
  { id: 'body_orange', name: 'Orange',       slot: 'body',  price: 250, color: '#F97316' },
  { id: 'body_sky',    name: 'Sky',          slot: 'body',  price: 300, color: '#38BDF8' },
  { id: 'body_gold',   name: 'Gold',         slot: 'body',  price: 500, color: '#F59E0B' },
  // shirt
  { id: 'shirt_white', name: 'White tee',    slot: 'shirt', price: 0,   color: '#F8FAFC' },
  { id: 'shirt_blue',  name: 'Blue tee',     slot: 'shirt', price: 75,  color: '#2563EB' },
  { id: 'shirt_gold',  name: 'Gold tee',     slot: 'shirt', price: 200, color: '#F59E0B' },
  { id: 'shirt_red',   name: 'Red tee',      slot: 'shirt', price: 150, color: '#EF4444' },
  { id: 'shirt_green', name: 'Green tee',    slot: 'shirt', price: 175, color: '#22C55E' },
  { id: 'shirt_black', name: 'Black tee',    slot: 'shirt', price: 250, color: '#0F172A', accent: '#334155' },
  { id: 'shirt_stripe',name: 'Striped',      slot: 'shirt', price: 350, color: '#E2E8F0', accent: '#1BDBDB' },
  // pants
  { id: 'pants_navy',  name: 'Navy pants',   slot: 'pants', price: 0,   color: '#1E3A5F' },
  { id: 'pants_black', name: 'Black pants',  slot: 'pants', price: 75,  color: '#111827' },
  { id: 'pants_khaki', name: 'Khaki pants',  slot: 'pants', price: 125, color: '#A3845A' },
  { id: 'pants_red',   name: 'Red pants',    slot: 'pants', price: 200, color: '#DC2626' },
  { id: 'pants_white', name: 'White pants',  slot: 'pants', price: 150, color: '#F1F5F9' },
  // shoes
  { id: 'shoes_white', name: 'White sneakers', slot: 'shoes', price: 0,   color: '#F8FAFC', accent: '#CBD5E1' },
  { id: 'shoes_red',   name: 'Red sneakers',   slot: 'shoes', price: 100, color: '#EF4444', accent: '#FCA5A5' },
  { id: 'shoes_black', name: 'Black sneakers', slot: 'shoes', price: 125, color: '#0F172A', accent: '#334155' },
  { id: 'shoes_gold',  name: 'Gold sneakers',  slot: 'shoes', price: 300, color: '#F59E0B', accent: '#FDE68A' },
  { id: 'shoes_blue',  name: 'Blue sneakers',  slot: 'shoes', price: 150, color: '#2563EB', accent: '#93C5FD' },
  // hat
  { id: 'hat_none',      name: 'No hat',      slot: 'hat', price: 0,   color: 'transparent' },
  { id: 'hat_cap',       name: 'Cap',         slot: 'hat', price: 125, color: '#0F172A', accent: '#1BDBDB' },
  { id: 'hat_crown',     name: 'Crown',       slot: 'hat', price: 500, color: '#F59E0B', accent: '#FDE68A' },
  { id: 'hat_beanie',    name: 'Beanie',      slot: 'hat', price: 175, color: '#8B5CF6' },
  { id: 'hat_propeller', name: 'Propeller',   slot: 'hat', price: 250, color: '#1BDBDB', accent: '#0FA8A8' },
];

export const CATALOG = AVATAR_CATALOG;
export const FREE_STARTER_IDS = AVATAR_CATALOG.filter((item) => item.price === 0).map((item) => item.id);

const FALLBACKS: Record<AvatarSlot, AvatarItem> = {
  body:  AVATAR_CATALOG.find((i) => i.id === 'body_teal')!,
  shirt: AVATAR_CATALOG.find((i) => i.id === 'shirt_white')!,
  pants: AVATAR_CATALOG.find((i) => i.id === 'pants_navy')!,
  shoes: AVATAR_CATALOG.find((i) => i.id === 'shoes_white')!,
  hat:   AVATAR_CATALOG.find((i) => i.id === 'hat_none')!,
};

export function itemsForSlot(slot: AvatarSlot): AvatarItem[] {
  return AVATAR_CATALOG.filter((item) => item.slot === slot);
}

/** Merge partial loadout with defaults, returning full AvatarLoadout (IDs). */
export function resolveLoadout(loadout?: Partial<AvatarLoadout>): ResolvedLoadout {
  const slots: AvatarSlot[] = ['body', 'shirt', 'pants', 'shoes', 'hat'];
  const result = {} as ResolvedLoadout;
  for (const slot of slots) {
    const id = loadout?.[slot] ?? DEFAULT_LOADOUT[slot];
    result[slot] = AVATAR_CATALOG.find((i) => i.id === id) ?? FALLBACKS[slot];
  }
  return result;
}
