// ─── Avatar / Cosmetic Store ──────────────────────────────────────────────────
// Persists per-user (name+roomCode key) in localStorage.
// Currency: allTimePoints — items are unlocked when allTimePoints >= price.

import { CATALOG, DEFAULT_LOADOUT, type AvatarLoadout, type CosmeticSlot } from './avatar-catalog';

export type BeanLoadout = AvatarLoadout;

interface AvatarData {
  owned: string[];
  equipped: BeanLoadout;
}

function storageKey(userName: string, roomCode: string) {
  return `ibs_avatar__${roomCode}__${userName}`;
}

function defaultData(): AvatarData {
  const freeIds = CATALOG.filter((item) => item.price === 0).map((item) => item.id);
  return { owned: freeIds, equipped: { ...DEFAULT_LOADOUT } };
}

export function getAvatarData(userName: string, roomCode = 'default'): AvatarData {
  try {
    const raw = localStorage.getItem(storageKey(userName, roomCode));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AvatarData>;
      const def = defaultData();
      return {
        owned: Array.isArray(parsed.owned) ? parsed.owned : def.owned,
        equipped: { ...def.equipped, ...(parsed.equipped ?? {}) },
      };
    }
  } catch { /* ignore */ }
  return defaultData();
}

function saveAvatarData(userName: string, roomCode: string, data: AvatarData) {
  localStorage.setItem(storageKey(userName, roomCode), JSON.stringify(data));
}

export function getEquippedLoadout(userName: string, roomCode = 'default'): BeanLoadout {
  return getAvatarData(userName, roomCode).equipped;
}

export function getOwnedItems(userName: string, roomCode = 'default'): string[] {
  return getAvatarData(userName, roomCode).owned;
}

/** Returns true if the item was newly unlocked, false if already owned or not enough points */
export function unlockItem(
  userName: string,
  roomCode: string,
  itemId: string,
  allTimePoints: number,
): boolean {
  const item = CATALOG.find((c: { id: string }) => c.id === itemId);
  if (!item) return false;
  const data = getAvatarData(userName, roomCode);
  if (data.owned.includes(itemId)) return false;
  if (allTimePoints < item.price) return false;
  data.owned = [...data.owned, itemId];
  saveAvatarData(userName, roomCode, data);
  return true;
}

/** Equip an owned item. Returns true on success. */
export function equipItem(
  userName: string,
  roomCode: string,
  itemId: string,
): boolean {
  const item = CATALOG.find((c: { id: string }) => c.id === itemId);
  if (!item) return false;
  const data = getAvatarData(userName, roomCode);
  if (!data.owned.includes(itemId)) return false;
  data.equipped = { ...data.equipped, [item.slot as CosmeticSlot]: itemId };
  saveAvatarData(userName, roomCode, data);
  return true;
}

/** Unlock + equip in one call (used when price === 0 or already owned) */
export function equipFree(userName: string, roomCode: string, itemId: string) {
  const item = CATALOG.find((c: { id: string }) => c.id === itemId);
  if (!item) return;
  const data = getAvatarData(userName, roomCode);
  if (!data.owned.includes(itemId)) data.owned = [...data.owned, itemId];
  data.equipped = { ...data.equipped, [item.slot as CosmeticSlot]: itemId };
  saveAvatarData(userName, roomCode, data);
}

/** Unlock with gold (deducts from allTimePoints via caller). Returns message. */
export function unlockItemWithGold(
  userName: string,
  itemId: string,
  roomCode = 'default',
): { ok: boolean; message: string } {
  const item = CATALOG.find((c: { id: string }) => c.id === itemId);
  if (!item) return { ok: false, message: 'Item not found.' };
  const data = getAvatarData(userName, roomCode);
  if (data.owned.includes(itemId)) return { ok: false, message: 'Already owned.' };
  data.owned = [...data.owned, itemId];
  data.equipped = { ...data.equipped, [item.slot as CosmeticSlot]: itemId };
  saveAvatarData(userName, roomCode, data);
  return { ok: true, message: `Unlocked ${item.name}!` };
}
