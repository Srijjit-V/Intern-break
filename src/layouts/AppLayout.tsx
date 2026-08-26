import { type ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from "react-router";
import { Trophy, Gamepad2, User, ShieldCheck, LogOut, Sun, Moon, History, Gift, Target, Shirt, Plus, Check, Menu, X } from 'lucide-react';
import { gameIcons, GAME_REGISTRY_ENTRIES, type PlayableGameId } from '@/lib/game-icons';
import { getUser, getRoom, clearUser, applyRoomTheme, DEFAULT_ROOM_THEME, getPinnedGames, savePinnedGames, type IBSUser, type IBSRoomTheme } from '@/lib/ibs-store';
import { useTheme } from '@/lib/use-theme';
import UserAvatar from '@/components/UserAvatar';
import CurrencyPocket from '@/components/CurrencyPocket';
import Logo from '@/components/Logo';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}
const primaryLinks = [{
  label: 'Quests',
  path: '/challenges',
  icon: Target
}, {
  label: 'Arcade',
  path: '/games',
  icon: Gamepad2
}, {
  label: 'Board',
  path: '/leaderboard',
  icon: Trophy
}, {
  label: 'History',
  path: '/points-history',
  icon: History
}, {
  label: 'Rewards',
  path: '/rewards',
  icon: Gift
}, {
  label: 'Closet',
  path: '/closet',
  icon: Shirt
}];
export default function AppLayout({
  children,
  title
}: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<IBSUser | null>(null);
  const [roomTheme, setRoomTheme] = useState<IBSRoomTheme>(DEFAULT_ROOM_THEME);
  const [companyName, setCompanyName] = useState('');
  const [pinnedIds, setPinnedIds] = useState<PlayableGameId[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const {
    theme,
    setTheme,
    toggle
  } = useTheme();
  function syncThemeFromStorage() {
    const u = getUser();
    if (!u?.roomCode) return;
    const room = getRoom(u.roomCode);
    const t = room?.roomTheme ?? DEFAULT_ROOM_THEME;
    setRoomTheme(t);
    applyRoomTheme(t);
  }
  useEffect(() => {
    const u = getUser();
    if (!u || !u.roomCode) {
      navigate('/profile');
      return;
    }
    setUser(u);
    const room = getRoom(u.roomCode);
    setCompanyName(room?.companyName ?? 'Intern Break');
    const t = room?.roomTheme ?? DEFAULT_ROOM_THEME;
    setRoomTheme(t);
    applyRoomTheme(t);
    if (!localStorage.getItem('ibs-theme')) {
      setTheme(t.defaultMode ?? 'dark');
    }
    setPinnedIds(getPinnedGames());
    setMobileNavOpen(false);
  }, [navigate, setTheme, location.pathname]);

  // Listen for theme changes saved by the admin panel so the background
  // updates instantly across all open pages without a full reload.
  useEffect(() => {
    function onThemeUpdated() {
      syncThemeFromStorage();
    }
    window.addEventListener('ibs-theme-updated', onThemeUpdated);
    return () => window.removeEventListener('ibs-theme-updated', onThemeUpdated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function togglePinned(id: PlayableGameId) {
    setPinnedIds(current => {
      const next = current.includes(id) ? current.filter(g => g !== id) : [...current, id];
      savePinnedGames(next);
      return next;
    });
  }
  function handleLeave() {
    clearUser();
    navigate('/profile');
  }
  if (!user) return null;
  const gameQuick = pinnedIds.map(id => GAME_REGISTRY_ENTRIES.find(game => game.id === id)).filter((game): game is (typeof GAME_REGISTRY_ENTRIES)[number] => Boolean(game));
  return <div className="club-shell" style={roomTheme.backgroundImage ? {
    backgroundImage: `url("${roomTheme.backgroundImage}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed'
  } : undefined}>
      {roomTheme.backgroundImage && <div className="absolute inset-0 pointer-events-none z-0" style={{
      background: 'rgba(0,0,0,0.55)'
    }} />}

      {/* Mobile overlay backdrop */}
      {mobileNavOpen && <div className="fixed inset-0 z-20 bg-black/50 sm:hidden" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />}

      {/* LEFT ICON RAIL — expands on hover (CSS-only), slides in on mobile */}
      <div className="club-rail-slot">
        <aside className={`club-rail${mobileNavOpen ? ' rail-open' : ''}`} aria-label="Primary navigation">
          <Link to="/profile" className="club-rail-brand pressable" aria-label="Intern Break Space">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary text-primary-foreground">
              <Logo size={44} />
            </div>
            <span className="rail-label">Intern Break</span>
          </Link>

          <nav className="flex flex-1 flex-col gap-1.5">
            {primaryLinks.map(item => {
            const active = location.pathname === item.path || item.path === '/games' && GAME_REGISTRY_ENTRIES.some(g => g.path === location.pathname);
            const Icon = item.icon;
            return <Link key={item.path} to={item.path} title={item.label} aria-label={item.label} className={`rail-btn pressable ${active ? 'rail-btn-active' : ''}`}>
                  <Icon size={18} aria-hidden="true" />
                  <span className="rail-label">{item.label}</span>
                </Link>;
          })}

            <div className="rail-divider" />
            <div className="rail-label px-2 text-[10px] font-bold">Quick picks</div>

            {gameQuick.map(g => {
            const active = location.pathname === g.path;
            const Icon = gameIcons[g.id].icon;
            return <Link key={g.path} to={g.path} title={g.label} aria-label={g.label} className={`rail-game pressable ${active ? 'rail-game-active' : ''}`}>
                  <Icon size={15} aria-hidden="true" />
                  <span className="rail-game-label">{g.short}</span>
                </Link>;
          })}

            <button type="button" onClick={() => setPickerOpen(true)} title="Customize quick games" aria-label="Customize quick games" className="rail-game rail-game-add pressable">
              <Plus size={15} aria-hidden="true" />
              <span className="rail-game-label">Add</span>
            </button>
          </nav>

          <div className="mt-auto flex flex-col gap-1.5">
            <Link to="/profile" title="Profile" aria-label="Profile" className={`rail-btn pressable ${location.pathname === '/profile' ? 'rail-btn-active' : ''}`}>
              <User size={18} aria-hidden="true" />
              <span className="rail-label">Profile</span>
            </Link>
            {['admin', 'coadmin'].includes(user.role ?? '') && <Link to="/admin" title="Admin" aria-label="Admin" className={`rail-btn pressable ${location.pathname === '/admin' ? 'rail-btn-active' : ''}`}>
                <ShieldCheck size={18} aria-hidden="true" />
                <span className="rail-label">Admin</span>
              </Link>}
          </div>
        </aside>
      </div>

      {/* MAIN COLUMN */}
      <div className="club-main">
        <header className="club-hud">
          {/* Hamburger — mobile only */}
          <button type="button" onClick={() => setMobileNavOpen(o => !o)} className="pressable -ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card sm:hidden" aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}>
            {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Intern Break Portal
            </p>
            <div className="mt-0.5 flex items-center gap-2">
              <h1 className="truncate text-base font-bold md:text-lg" style={{
              fontFamily: 'var(--font-heading)'
            }}>
                {title ?? companyName}
              </h1>
              <span className="hidden rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] font-bold text-foreground sm:inline">
                {user.roomCode}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-border bg-muted px-2 py-1 sm:flex">
              <button type="button" onClick={() => theme !== 'light' && toggle()} className={`pressable rounded-full p-1.5 ${theme === 'light' ? 'bg-card shadow-xs' : 'text-muted-foreground'}`} aria-label="Light mode">
                <Sun size={14} />
              </button>
              <button type="button" onClick={() => theme !== 'dark' && toggle()} className={`pressable rounded-full p-1.5 ${theme === 'dark' ? 'bg-card shadow-xs' : 'text-muted-foreground'}`} aria-label="Dark mode">
                <Moon size={14} />
              </button>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3">
              <UserAvatar name={user.name} color={user.color as string | undefined} emoji={user.avatarEmoji as string | undefined} avatarUrl={user.avatarUrl as string | undefined} size={32} />
              <div className="hidden leading-tight md:block">
                <p className="text-xs font-bold">{user.name}</p>
                <p className="text-[10px] capitalize text-muted-foreground">{user.role}</p>
              </div>
            </div>

            <button type="button" onClick={handleLeave} className="pressable inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-bold hover:bg-destructive hover:text-destructive-foreground">
              <LogOut size={13} aria-hidden="true" />
              <span className="hidden sm:inline">Leave</span>
            </button>
          </div>
        </header>

        <CurrencyPocket />

        <main className="club-scroll">{children}</main>
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Customize your quick games</DialogTitle>
            <DialogDescription>
              Pick the games that show up in your sidebar for one-tap access. Tap again to remove.
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto pr-1">
            {GAME_REGISTRY_ENTRIES.map(g => {
            const Icon = gameIcons[g.id].icon;
            const pinned = pinnedIds.includes(g.id);
            return <button key={g.id} type="button" onClick={() => togglePinned(g.id)} className={`pressable flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${pinned ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-muted'}`}>
                  <Icon size={18} className={gameIcons[g.id].className} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{g.label}</span>
                  {pinned ? <Check size={16} className="shrink-0 text-primary" aria-hidden="true" /> : <Plus size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />}
                </button>;
          })}
          </div>
        </DialogContent>
      </Dialog>
    </div>;
}
