import { useState, useEffect } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion } from 'motion/react';
import { Star, Users, Zap, Bird, CircleHelp, Crown, Medal, Trophy, Turtle, Worm, Grid2x2, Keyboard } from 'lucide-react';
import AppLayout from '@/layouts/AppLayout';
import UserAvatar from '@/components/UserAvatar';
import BeanAvatar from '@/components/BeanAvatar';
import { leaderboard as lb } from 'virtual:content';
import { getUser, getRoom, type IBSMember, type IBSFlappyEntry } from '@/lib/ibs-store';
import { getEquippedLoadout } from '@/lib/avatar-store';

type Tab = 'overall' | 'challenges' | 'flappy' | 'trivia' | 'crossy' | 'snake' | 'memory' | 'typing' | 'alltime';

interface RankedMember extends IBSMember {
  rank: number;
  score: number;
}

interface RankedFlappy extends IBSFlappyEntry {
  rank: number;
}

function Avatar({ name, color, size = 40, emoji, avatarUrl }: { name: string; color?: string; size?: number; emoji?: string; avatarUrl?: string }) {
  return <UserAvatar name={name} color={color} size={size} emoji={emoji} avatarUrl={avatarUrl} />;
}

function PodiumSlot({ member, rank, isCurrentUser }: { member: RankedMember; rank: number; isCurrentUser: boolean }) {
  const heights: Record<number, string> = { 1: 'h-32', 2: 'h-24', 3: 'h-20' };
  const colors: Record<number, string> = { 1: '#fbbf24', 2: '#94a3b8', 3: '#cd7c2f' };
  const sizes: Record<number, number> = { 1: 88, 2: 72, 3: 64 };
  const order: Record<number, string> = { 1: 'order-2', 2: 'order-1', 3: 'order-3' };
  const loadout = getEquippedLoadout(member.name);

  return (
    <div className={`flex flex-col items-center gap-2 ${order[rank]}`}>
      <div className="relative">
        <BeanAvatar loadout={loadout} size={sizes[rank]} dancing={rank === 1} />
        {isCurrentUser && (
          <div className="absolute inset-0 rounded-full pointer-events-none" style={{ boxShadow: '0 0 0 2px hsl(var(--primary)), 0 0 16px hsl(var(--primary) / 0.53)' }} />
        )}
        {rank === 1 && (
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xl drop-shadow">👑</div>
        )}
      </div>
      <p className="text-xs font-black uppercase tracking-wide text-foreground max-w-[88px] truncate text-center">{member.name}</p>
      <p className="text-base font-black tabular-nums" style={{ color: colors[rank] }}>{member.score.toLocaleString()}</p>
      <div
        className={`w-20 rounded-t-xl flex items-end justify-center pb-2 ${heights[rank]}`}
        style={{
          background: `linear-gradient(180deg, ${colors[rank]}33, ${colors[rank]}11)`,
          border: `2px solid ${colors[rank]}66`,
          boxShadow: `0 0 24px ${colors[rank]}33`,
        }}
      >
        <span className="text-2xl font-black" style={{ color: colors[rank] }}>
          {rank}
        </span>
      </div>
    </div>
  );
}

function StatChip({ icon: Icon, value, label, color }: { icon: React.ElementType; value: string | number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl flex-1 min-w-0 bg-card border border-primary/20">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0" style={{ background: `${color}22` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-base font-bold text-foreground leading-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground truncate">{label}</p>
      </div>
    </div>
  );
}

function MemberRow({
  m,
  i,
  isMe,
  maxScore,
  showChampion,
  scoreLabel,
  subLabel,
}: {
  m: RankedMember;
  i: number;
  isMe: boolean;
  maxScore: number;
  showChampion: boolean;
  scoreLabel: string;
  subLabel?: string;
}) {
  const pct = maxScore > 0 ? (m.score / maxScore) * 100 : 0;
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0"
      style={{
        borderColor: 'hsl(var(--primary) / 0.1)',
        background: isMe ? 'hsl(var(--primary) / 0.08)' : 'transparent',
        boxShadow: isMe ? 'inset 0 0 0 1px hsl(var(--primary) / 0.3)' : 'none',
      }}
    >
      <div className="w-7 text-center shrink-0">
        {m.rank <= 3 ? (
          <span className="text-base">{m.rank === 1 ? '🥇' : m.rank === 2 ? '🥈' : '🥉'}</span>
        ) : (
          <span className="text-xs font-bold text-muted-foreground">#{m.rank}</span>
        )}
      </div>
      <div className="relative shrink-0">
        <Avatar name={m.name} color={typeof m.color === 'string' ? m.color : undefined} size={34} emoji={typeof m.emoji === 'string' ? m.emoji : undefined} avatarUrl={typeof m.avatarUrl === 'string' ? m.avatarUrl : undefined} />
        {isMe && <div className="absolute inset-0 rounded-full" style={{ boxShadow: '0 0 0 2px hsl(var(--primary))' }} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground truncate">{m.name}</span>
          {showChampion && m.rank === 1 && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-secondary-foreground">
              <Crown size={11} aria-hidden="true" />
              Champion
            </span>
          )}
          {isMe && (
            <span className="shrink-0 rounded-full bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">
              You
            </span>
          )}
        </div>
        {subLabel && <p className="text-[11px] text-muted-foreground mt-0.5">{subLabel}</p>}
        <div className="mt-1 h-1 rounded-full overflow-hidden bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ delay: i * 0.05 + 0.2, duration: 0.5 }}
          />
        </div>
      </div>
      <div className="text-right shrink-0">
        <span className="text-sm font-bold text-foreground">{scoreLabel}</span>
      </div>
    </div>
  );
}

function FlappyRow({ entry, i, isMe }: { entry: RankedFlappy; i: number; isMe: boolean }) {
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dateStr = (() => {
    const d = entry.date ?? '';
    const parts = d.split('-');
    if (parts.length === 3) {
      const m = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return `${monthNames[m]} ${day}`;
    }
    return d;
  })();

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.05, duration: 0.3 }}
      className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0"
      style={{
        borderColor: 'hsl(var(--primary) / 0.1)',
        background: isMe ? 'hsl(var(--primary) / 0.08)' : 'transparent',
        boxShadow: isMe ? 'inset 0 0 0 1px hsl(var(--primary) / 0.3)' : 'none',
      }}
    >
      <div className="w-7 text-center shrink-0">
        {entry.rank <= 3 ? (
          <span className="text-base">{entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}</span>
        ) : (
          <span className="text-xs font-bold text-muted-foreground">#{entry.rank}</span>
        )}
      </div>
      <div className="relative shrink-0">
        <Avatar name={entry.name} color={entry.color} size={34} />
        {isMe && <div className="absolute inset-0 rounded-full" style={{ boxShadow: '0 0 0 2px hsl(var(--primary))' }} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground truncate">{entry.name}</span>
          {isMe && (
            <span className="shrink-0 rounded-full bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">
              You
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">{dateStr}</p>
      </div>
      <div className="text-right shrink-0">
        <span className="text-sm font-bold text-foreground">🐦 {entry.score.toLocaleString()}</span>
      </div>
    </motion.div>
  );
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>('overall');
  const [members, setMembers] = useState<IBSMember[]>([]);
  const [flappyBoard, setFlappyBoard] = useState<IBSFlappyEntry[]>([]);
  const [currentUserName, setCurrentUserName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getUser();
    if (!user) { setLoading(false); return; }
    setCurrentUserName(user.name);
    // Seed from localStorage immediately so the board isn't blank on first render
    const room = getRoom(user.roomCode ?? '');
    if (room) {
      setMembers(room.members ?? []);
      setFlappyBoard(room.flappyLeaderboard ?? []);
    }
    // Then fetch fresh data from the server
    import('@/lib/company-api').then(({ loadCompanyData }) => {
      void loadCompanyData(user.roomCode ?? '').then((data) => {
        const serverMembers = (data.members ?? []).map((m) => ({
          id: m.accountId ?? m.name,
          name: m.name,
          color: m.color,
          role: m.role as IBSMember['role'],
          points: Number(m.points ?? 0),
          allTimePoints: Number(m.allTimePoints ?? 0),
          gameHighScore: Number((m.profile as Record<string, unknown> | null)?.gameHighScore ?? 0),
          flappyOfficialScore: Number((m.profile as Record<string, unknown> | null)?.flappyOfficialScore ?? 0),
          flappyRunsToday: 0,
          flappyRunDate: '',
          typingHighScore: Number((m.profile as Record<string, unknown> | null)?.typingHighScore ?? 0),
          triviaHighScore: Number((m.profile as Record<string, unknown> | null)?.triviaHighScore ?? 0),
          crossyHighScore: Number((m.profile as Record<string, unknown> | null)?.crossyHighScore ?? 0),
          snakeHighScore: Number((m.profile as Record<string, unknown> | null)?.snakeHighScore ?? 0),
          memoryHighScore: Number((m.profile as Record<string, unknown> | null)?.memoryHighScore ?? 0),
        } as IBSMember));
        if (serverMembers.length > 0) setMembers(serverMembers);
      }).catch(() => { /* keep local data */ }).finally(() => setLoading(false));
    }).catch(() => setLoading(false));
  }, []);

  function getRanked(scoreFn: (m: IBSMember) => number): RankedMember[] {
    return [...members]
      .map((m) => ({ ...m, score: scoreFn(m) }))
      .sort((a, b) => b.score - a.score)
      .map((m, i) => ({ ...m, rank: i + 1 }));
  }

  const overallRanked = getRanked((m) =>
    Number(m.allTimePoints ?? 0) +
    Number(m.gameHighScore ?? 0) +
    Number(m.triviaHighScore ?? 0) +
    Number(m.crossyHighScore ?? 0) +
    Number(m.snakeHighScore ?? 0) +
    Number(m.memoryHighScore ?? 0) +
    Number(m.typingHighScore ?? 0),
  );
  const challengeRanked = getRanked((m) => Number(m.allTimePoints ?? 0));
  const alltimeRanked = getRanked((m) => Number(m.allTimePoints ?? 0));
  const triviaRanked = getRanked((m) => Number(m.triviaHighScore ?? 0));
  const crossyRanked = getRanked((m) => Number(m.crossyHighScore ?? 0));
  const snakeRanked = getRanked((m) => Number(m.snakeHighScore ?? 0));
  const memoryRanked = getRanked((m) => Number(m.memoryHighScore ?? 0));
  const typingRanked = getRanked((m) => Number(m.typingHighScore ?? 0));

  const flappyRanked: RankedFlappy[] =
    flappyBoard.length > 0
      ? flappyBoard.map((e, i) => ({ ...e, rank: i + 1, name: e.name, score: e.score, color: e.color, date: e.date ?? '' }))
      : [...members]
          .sort((a, b) => Number(b.gameHighScore ?? 0) - Number(a.gameHighScore ?? 0))
          .map((m, i) => ({ name: m.name, color: m.color, score: Number(m.gameHighScore ?? 0), date: '', rank: i + 1 }));

  const flappyEmpty = flappyBoard.length === 0 && members.every((m) => (m.gameHighScore ?? 0) === 0);

  const totalPoints = members.reduce((s, m) => s + Number(m.allTimePoints ?? 0), 0);
  const activeToday = members.filter((m) => Number(m.points ?? 0) > 0).length;
  const topFlappy = flappyBoard[0]?.score ?? Math.max(0, ...members.map((m) => Number(m.gameHighScore ?? 0)));

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = lb.tabList.map((t) => ({
    key: t.key as Tab,
    label: t.label,
    icon: ({ overall: Trophy, challenges: Star, flappy: Bird, trivia: CircleHelp, crossy: Turtle, snake: Worm, memory: Grid2x2, typing: Keyboard, alltime: Medal } as Record<string, React.ElementType>)[t.key] ?? Trophy,
  }));

  type TabConfig = {
    ranked: RankedMember[];
    showPodium: boolean;
    showChampion: boolean;
    scoreLabel: (m: RankedMember) => string;
    subLabel?: (m: RankedMember) => string;
  };

  const configs: Record<Exclude<Tab, 'flappy'>, TabConfig> = {
    overall: {
      ranked: overallRanked,
      showPodium: true,
      showChampion: false,
      scoreLabel: (m) => m.score.toLocaleString(),
      subLabel: (m) => `${m.allTimePoints} pts + ${m.gameHighScore ?? 0} 🐦 + ${m.triviaHighScore ?? 0} ⚡`,
    },
    challenges: {
      ranked: challengeRanked,
      showPodium: true,
      showChampion: false,
      scoreLabel: (m) => `${m.score.toLocaleString()} pts`,
    },
    trivia: {
      ranked: triviaRanked,
      showPodium: true,
      showChampion: false,
      scoreLabel: (m) => `${m.score.toLocaleString()} pts`,
      subLabel: () => 'Trivia Blitz high score',
    },
    crossy: {
      ranked: crossyRanked,
      showPodium: true,
      showChampion: false,
      scoreLabel: (m) => m.score.toLocaleString(),
      subLabel: () => 'Crossy Road high score',
    },
    snake: {
      ranked: snakeRanked,
      showPodium: true,
      showChampion: false,
      scoreLabel: (m) => m.score.toLocaleString(),
      subLabel: () => 'Snake high score',
    },
    memory: {
      ranked: memoryRanked,
      showPodium: true,
      showChampion: false,
      scoreLabel: (m) => m.score.toLocaleString(),
      subLabel: () => 'Memory Match high score',
    },
    typing: {
      ranked: typingRanked,
      showPodium: true,
      showChampion: false,
      scoreLabel: (m) => `${m.score} WPM`,
      subLabel: () => 'Speed Typing high score',
    },
    alltime: {
      ranked: alltimeRanked,
      showPodium: true,
      showChampion: true,
      scoreLabel: (m) => `${m.score.toLocaleString()} pts`,
    },
  };

  const cfg = tab !== 'flappy' ? configs[tab] : null;
  const top3 = cfg ? cfg.ranked.slice(0, 3) : [];

  if (loading && members.length === 0) {
    return (
      <AppLayout title="Leaderboard">
        <div className="p-6 text-muted-foreground text-sm"><span>{lb.loading}</span></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Leaderboard">
      <Helmet>
        <title>Leaderboard — Intern Break Space</title>
        <meta name="description" content="See overall rankings, challenge scores, Flappy Bird high scores, and all-time standings." />
        <link rel="canonical" href="/leaderboard" />
      </Helmet>

      <div className="p-6 max-w-2xl mx-auto space-y-6 text-foreground">
        <div className="rounded-2xl border-2 border-primary/30 px-5 py-5 overflow-hidden relative leaderboard-hero-card">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-400 flex items-center gap-1.5">
            <Trophy size={12} /> <span>{lb.hero.eyebrow}</span>
          </p>
          <h1 className="text-3xl font-black text-foreground mt-1 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            <span>{lb.hero.title}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1"><span>{lb.hero.subtitle}</span></p>
        </div>

        <div className="w-full overflow-x-auto rounded-xl border border-border bg-card p-1">
          <div className="flex gap-1 min-w-max">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
                  tab === t.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon size={15} aria-hidden="true" />
                {t.label}
              </button>
            );
          })}
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <StatChip icon={Users} value={members.length} label={lb.stats.membersLabel} color="#1BDBDB" />
          <StatChip icon={Star} value={totalPoints.toLocaleString()} label={lb.stats.totalPtsLabel} color="#0fa8a8" />
          <StatChip icon={Bird} value={topFlappy.toLocaleString()} label={lb.stats.topFlappyLabel} color="#38bdf8" />
          <StatChip icon={Zap} value={activeToday} label={lb.stats.activeTodayLabel} color="#fbbf24" />
        </div>

        {tab === 'flappy' && (
          <>
            {flappyEmpty ? (
              <div className="flex flex-col items-center justify-center py-16 rounded-2xl gap-3 bg-card border border-primary/15">
                <span className="text-5xl">🐦</span>
                <p className="text-muted-foreground text-sm text-center px-4">
                  <span>{lb.empty.noFlappy}</span><br />
                  <span className="text-muted-foreground/60">{lb.empty.flappyHint}</span>
                </p>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden bg-card border border-primary/15">
                {flappyRanked.map((entry, i) => (
                  <FlappyRow key={`${entry.name}-${i}`} entry={entry} i={i} isMe={entry.name === currentUserName} />
                ))}
              </div>
            )}
          </>
        )}

        {tab !== 'flappy' && cfg && (
          <>
            {cfg.showPodium && top3.length >= 1 && (
              <div className="rounded-2xl p-6 bg-card border border-primary/20">
                <div className="flex items-end justify-center gap-4">
                  {top3.map((m) => (
                    <PodiumSlot key={m.name} member={m} rank={m.rank} isCurrentUser={m.name === currentUserName} />
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl overflow-hidden bg-card border border-primary/15">
              {cfg.ranked.map((m, i) => (
                <MemberRow
                  key={m.name}
                  m={m}
                  i={i}
                  isMe={m.name === currentUserName}
                  maxScore={cfg.ranked[0]?.score ?? 1}
                  showChampion={cfg.showChampion}
                  scoreLabel={cfg.scoreLabel(m)}
                  subLabel={cfg.subLabel ? cfg.subLabel(m) : undefined}
                />
              ))}
              {cfg.ranked.length === 0 && (
                <div className="py-12 text-center text-muted-foreground text-sm"><span>{lb.empty.noMembers}</span></div>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        .leaderboard-hero-card {
          background:
            radial-gradient(circle at 20% 0%, hsl(45 96% 56% / 0.18), transparent 45%),
            radial-gradient(circle at 90% 30%, hsl(var(--primary) / 0.2), transparent 40%),
            hsl(var(--card));
        }
      `}</style>
    </AppLayout>
  );
}
