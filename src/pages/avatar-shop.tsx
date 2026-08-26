import { avatar_shop } from 'virtual:content';
import { useMemo, useState } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { Coins, Check, Lock, Sparkles } from 'lucide-react';
import AppLayout from '@/layouts/AppLayout';
import BeanAvatar from '@/components/BeanAvatar';
import { getUser, getRoom, saveRoom, saveUser, persistCurrentRoomProfile, type IBSUser } from '@/lib/ibs-store';
import { AVATAR_CATALOG, itemsForSlot, type AvatarSlot } from '@/lib/avatar-catalog';
import { equipItem, getEquippedLoadout, getOwnedItems, unlockItemWithGold } from '@/lib/avatar-store';

export default function AvatarShopPage() {
  const [user, setUser] = useState<IBSUser | null>(() => getUser());
  const room = user ? getRoom(user.roomCode ?? '') : null;
  const member = room?.members?.find((m) => m.name === user?.name);
  const [slot, setSlot] = useState<AvatarSlot>('shirt');
  const [message, setMessage] = useState('');
  const [tick, setTick] = useState(0);

  const loadout = useMemo(
    () => (user ? getEquippedLoadout(user.name) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.name, tick],
  );
  const owned = useMemo(
    () => (user ? getOwnedItems(user.name) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.name, tick],
  );

  if (!user || !loadout) return null;

  // Gold is the currency for cosmetics — it's what you earn from every game
  // and quest, so it actually has somewhere to go. Diamonds stay a rarer
  // bonus currency for now (no spend sink yet). Prefer server-synced value
  // from the member row.
  const gold = Number(member?.gold ?? user.gold ?? 0);
  const items = itemsForSlot(slot);

  function refresh(msg?: string) {
    setTick((t) => t + 1);
    if (msg) setMessage(msg);
  }

  function onBuyOrEquip(itemId: string) {
    if (!user) return;
    const item = AVATAR_CATALOG.find((i) => i.id === itemId);
    if (!item) return;

    // Already owned — just equip
    if (owned.includes(itemId)) {
      equipItem(user.name, user.roomCode ?? '', itemId);
      refresh(`Equipped ${item.name}!`);
      return;
    }

    // Check gold balance
    if (gold < item.price) {
      refresh(`Not enough Gold. You need ${item.price} 🪙 but have ${gold}.`);
      return;
    }

    // Deduct gold and update local state.
    // IMPORTANT: this must go through saveUser()/persistCurrentRoomProfile() —
    // not a hand-rolled localStorage.setItem('ibs_user', ...) — because the
    // real user record lives under the 'ibs-user' key (see ibs-store.ts), and
    // the server sync must patch `profile.gold`, never `carryoverPoints`
    // (that's the separate Rewards redemption balance). Writing to the wrong
    // key/field is what made currency look like it randomly reset before.
    const newGold = gold - item.price;
    const updatedUser: IBSUser = { ...user, gold: newGold };
    saveUser(updatedUser);
    setUser(updatedUser);

    // Update room member gold in local cache
    const currentRoom = getRoom(user.roomCode ?? '');
    if (currentRoom) {
      const updatedMembers = (currentRoom.members ?? []).map((m) =>
        m.name === user.name ? { ...m, gold: newGold } : m,
      );
      saveRoom(user.roomCode ?? '', { ...currentRoom, members: updatedMembers });
    }

    // Sync the real gold field (inside profile) to the server — never carryoverPoints.
    void persistCurrentRoomProfile(updatedUser);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('ibs-currency-updated'));

    // Unlock + equip in avatar store (gold already verified above)
    unlockItemWithGold(user.name, itemId, user.roomCode ?? '');
    refresh(`Unlocked ${item.name}! (${newGold} 🪙 remaining)`);
  }

  return (
    <AppLayout title="Closet">
      <Helmet>
        <title>Avatar Closet — Intern Break Space</title>
        <meta name="description" content="Unlock and equip 2D bean cosmetics with Gold." />
        <link rel="canonical" href="/closet" />
      </Helmet>

      <div className="p-5 md:p-7 max-w-6xl mx-auto space-y-5">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1">
              <Sparkles size={12} /> <span>{avatar_shop.cosmetics}</span>
            </p>
            <h1 className="text-3xl font-bold text-foreground mt-1"><span>{avatar_shop.heading}</span></h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              <span>{avatar_shop.subtitle}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-xl border-2 border-yellow-400/50 bg-yellow-500/10 px-4 py-3 min-w-[140px]">
              <div className="flex items-center gap-1.5 text-yellow-400 text-xs font-bold">
                <Coins size={14} /> <span>{avatar_shop.goldLabel}</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-0.5">{gold}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5"><span>{avatar_shop.goldHint}</span></p>
            </div>
          </div>
        </header>

        {message && (
          <p
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              message.includes('Not enough')
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'bg-muted text-foreground'
            }`}
          >
            {message}
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
          {/* Bean preview */}
          <section className="rounded-2xl border-2 border-border bg-card p-6 flex flex-col items-center justify-center min-h-[320px] bean-preview-card">
            <BeanAvatar loadout={loadout} size={180} dancing />
            <p className="mt-4 text-sm font-bold text-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground"><span>{avatar_shop.previewLabel}</span></p>
            <a href="/rewards" className="mt-4 text-xs font-semibold text-yellow-500 hover:underline">
              <span>{avatar_shop.rewardsLink}</span>
            </a>
          </section>

          {/* Item grid */}
          <section className="rounded-2xl border-2 border-border bg-card p-4 md:p-5 space-y-4">
            {/* Slot tabs */}
            <div className="flex flex-wrap gap-2">
              {avatar_shop.TABS.map((tab) => (
                <button
                  key={tab.slot}
                  type="button"
                  onClick={() => setSlot(tab.slot as AvatarSlot)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    slot === tab.slot
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {items.map((item) => {
                const isOwned = owned.includes(item.id);
                const isEquipped = loadout[item.slot] === item.id;
                const canAfford = gold >= item.price;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onBuyOrEquip(item.id)}
                    disabled={!isOwned && !canAfford}
                    className={`relative flex flex-col items-stretch rounded-xl border-2 p-3 text-left transition-all hover:scale-[1.02] disabled:opacity-45 disabled:hover:scale-100 ${
                      isEquipped
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-muted/20 hover:border-primary/40'
                    }`}
                  >
                    <div
                      className="h-16 rounded-lg mb-2 flex items-center justify-center"
                      style={{
                        background:
                          item.color === 'transparent' ? 'hsl(var(--muted))' : item.color,
                      }}
                    >
                      <Coins size={22} className="text-white/90 drop-shadow" />
                    </div>
                    <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                    <div className="mt-1 flex items-center justify-between">
                      {isEquipped ? (
                        <span className="text-[10px] font-bold text-primary flex items-center gap-0.5">
                          <Check size={10} /> <span>{avatar_shop.equippedLabel}</span>
                        </span>
                      ) : isOwned ? (
                        <span className="text-[10px] font-bold text-emerald-400"><span>{avatar_shop.ownedLabel}</span></span>
                      ) : (
                        <span className="text-[10px] font-bold text-yellow-500 flex items-center gap-0.5">
                          {canAfford ? <Coins size={10} /> : <Lock size={10} />}
                          {item.price === 0 ? <span>{avatar_shop.freeLabel}</span> : `${item.price} 🪙`}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      <style>{`
        .bean-preview-card {
          background: radial-gradient(circle at 50% 40%, hsl(var(--primary) / 0.12), transparent 60%),
                      hsl(var(--card));
        }
      `}</style>
    </AppLayout>
  );
}
