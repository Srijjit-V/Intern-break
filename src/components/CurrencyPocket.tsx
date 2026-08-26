import { useEffect, useState } from 'react';
import { useLocation, Link } from "react-router";
import { motion } from 'motion/react';
import { Gem, Coins } from 'lucide-react';
import BeanAvatar from '@/components/BeanAvatar';
import { getUser, getRoom, type IBSUser } from '@/lib/ibs-store';
import { getEquippedLoadout } from '@/lib/avatar-store';
const HIDE_ON = new Set(['/flappy', '/crossy', '/freezeria', '/snake', '/memory', '/trivia', '/set', '/typing', '/typing-race', '/login', '/signup', '/room']);

/**
 * Top-right pocket: vibing bean + gold / diamonds.
 * Hidden on game canvases and auth/room flows.
 */
export default function CurrencyPocket() {
  const location = useLocation();
  const [user, setUser] = useState<IBSUser | null>(null);
  useEffect(() => {
    const sync = () => setUser(getUser());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('ibs-currency-updated', sync);
    const id = window.setInterval(sync, 1500);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('ibs-currency-updated', sync);
      window.clearInterval(id);
    };
  }, [location.pathname]);
  if (!user?.roomCode) return null;
  if (HIDE_ON.has(location.pathname)) return null;
  const room = getRoom(user.roomCode);
  const member = room?.members?.find(m => m.name === user.name);
  const diamonds = Number(member?.diamonds ?? user.diamonds ?? 0);
  const gold = Number(member?.gold ?? user.gold ?? 0);
  const loadout = getEquippedLoadout(String(user.name), String(user.roomCode));
  return <motion.div initial={{
    opacity: 0,
    x: 16,
    y: -8
  }} animate={{
    opacity: 1,
    x: 0,
    y: 0
  }} transition={{
    duration: 0.45,
    ease: [0.22, 1, 0.36, 1]
  }} className="pointer-events-auto fixed right-3 top-[4.5rem] z-30 flex items-center gap-2 sm:right-5">
      <Link to="/closet" className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card/95 py-1.5 pl-1.5 pr-3 shadow-lg backdrop-blur-md transition hover:-translate-y-0.5 hover:border-primary/50" title="Open Closet">
        <BeanAvatar loadout={loadout} size={52} dancing />
        <div className="leading-tight">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate max-w-[7rem]">{user.name}</p>
          <p className="text-xs font-extrabold text-foreground">Open Closet</p>
        </div>
      </Link>
      <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/95 px-3 py-2 shadow-lg backdrop-blur-md">
        <span className="flex items-center gap-1.5">
          <Coins size={15} className="text-yellow-400" aria-hidden="true" />
          <span className="text-sm font-extrabold text-foreground">{gold.toLocaleString()}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Gold</span>
        </span>
        <span className="h-4 w-px bg-border/60" />
        <span className="flex items-center gap-1.5">
          <Gem size={15} className="text-sky-400" aria-hidden="true" />
          <span className="text-sm font-extrabold text-foreground">{diamonds.toLocaleString()}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Diamonds</span>
        </span>
      </div>
    </motion.div>;
}
