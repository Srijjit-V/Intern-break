import { Helmet } from '@dr.pogodin/react-helmet';
import { Link } from "react-router";
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/AppLayout';
import { Trophy, Lock, Play, Gamepad2, Gem, Star, Zap } from 'lucide-react';
import { getUser, getRoom, type IBSMember } from '@/lib/ibs-store';
import { GAME_LIST, type GameId } from '@/lib/game-registry';
const ORIGINAL_COPY: Record<GameId, {
  title: string;
  description: string;
}> = {
  flappy: {
    title: 'Flappy Bird',
    description: "Tap to flap through the pipes. Don't crash."
  },
  freezeria: {
    title: "Papa's Freezeria",
    description: 'Build sundaes, take orders, and keep the line moving.'
  },
  snake: {
    title: 'Snake',
    description: "Eat apples, grow longer, and don't bite yourself."
  },
  memory: {
    title: 'Memory Match',
    description: 'Flip cards and find matching pairs.'
  },
  trivia: {
    title: 'Trivia Blitz',
    description: 'Answer fast and climb the high-score board.'
  },
  set: {
    title: 'Set with Friends',
    description: 'Find sets of three cards before time runs out.'
  },
  crossy: {
    title: 'Crossy Road',
    description: 'Cross the road, dodge traffic, and keep hopping.'
  },
  typing: {
    title: 'Speed Typing',
    description: 'Type as fast and accurately as you can.'
  },
  'typing-race': {
    title: 'Typing Race',
    description: 'Pick a car, race your room, and use nitro to clear tough words.'
  }
};
export default function GamesPage() {
  const [topScores, setTopScores] = useState<IBSMember[]>([]);
  useEffect(() => {
    const user = getUser();
    if (!user) return;
    const room = getRoom(user.roomCode ?? "");
    if (!room) return;
    const sorted = [...(room.members ?? [])].filter(m => Number(m.gameHighScore ?? 0) > 0).sort((a, b) => Number(b.gameHighScore ?? 0) - Number(a.gameHighScore ?? 0)).slice(0, 5);
    setTopScores(sorted);
  }, []);
  const all = GAME_LIST.map(game => ({
    ...game,
    name: ORIGINAL_COPY[game.id].title,
    description: ORIGINAL_COPY[game.id].description
  }));
  const featured = all.find(game => game.id === 'flappy') ?? all[0];
  const topRow = all.filter(game => game.id !== featured?.id).slice(0, 4);
  const grid = all.filter(game => game.id !== featured?.id).slice(4);
  return <AppLayout title="Arcade">
      <Helmet>
        <title>Arcade - Intern Break Space</title>
        <meta name="description" content="Arcade floor for intern break games." />
        <link rel="canonical" href="/games" />
      </Helmet>

      <div className="page-shell space-y-8">
        <motion.div initial={{
        opacity: 0,
        y: 14
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1]
      }}>
          <span className="page-kicker">
            <Gamepad2 size={12} aria-hidden="true" />
            Arcade
          </span>
          <h1 className="page-title mt-3">Intern break</h1>
          <p className="page-subtitle">Take five. Play something. Come back with your brain slightly more powerful.</p>
        </motion.div>

        {/* HOW REWARDS WORK */}
        <motion.section initial={{
        opacity: 0,
        y: 12
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.45,
        delay: 0.18,
        ease: [0.22, 1, 0.36, 1]
      }} className="surface rounded-2xl overflow-hidden">
          <div className="border-b border-border px-5 py-4 flex items-center gap-2">
            <Gem size={15} className="text-sky-400" aria-hidden="true" />
            <p className="text-sm font-bold text-foreground">How rewards work</p>
          </div>
          <div className="grid gap-px bg-border sm:grid-cols-3">
            <div className="bg-card px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <Star size={14} className="text-amber-400" aria-hidden="true" />
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Quest points</p>
              </div>
              <p className="text-2xl font-extrabold text-foreground">5 – 25</p>
              <p className="text-xs text-muted-foreground mt-1">Points per completed challenge. Personal quests give 5–15 pts, group quests 10–25 pts.</p>
            </div>
            <div className="bg-card px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <Gem size={14} className="text-sky-400" aria-hidden="true" />
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Diamonds earned</p>
              </div>
              <p className="text-2xl font-extrabold text-foreground">~35%</p>
              <p className="text-xs text-muted-foreground mt-1">Every challenge awards diamonds equal to ~35% of its point value (minimum 1). Use them in the Closet and Rewards.</p>
            </div>
            <div className="bg-card px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={14} className="text-primary" aria-hidden="true" />
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Games</p>
              </div>
              <p className="text-2xl font-extrabold text-foreground">Score only</p>
              <p className="text-xs text-muted-foreground mt-1">Arcade games track your high score and room leaderboard. Diamonds come from challenges, not games.</p>
            </div>
          </div>
        </motion.section>

        {/* FEATURED + SCORES */}
        {featured && <motion.div initial={{
        opacity: 0,
        y: 16
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.5,
        delay: 0.05,
        ease: [0.22, 1, 0.36, 1]
      }} className="grid gap-4 lg:grid-cols-[1.45fr_0.75fr]">
            <Link to={featured.path} className="arcade-hero pressable group">
              <img src={featured.thumbnail} alt={featured.name} className="arcade-hero-img" />
              <div className="arcade-hero-scrim" />
              <div className="arcade-hero-copy">
                <span className="arcade-badge">#1 Featured</span>
                <h2 className="arcade-hero-title">{featured.name}</h2>
                <p className="arcade-hero-desc">{featured.description}</p>
                <span className="arcade-play">
                  <Play size={14} aria-hidden="true" />
                  Play now
                </span>
              </div>
            </Link>

            <div className="surface overflow-hidden">
              <div className="border-b border-border px-5 py-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Room high scores</p>
                <h3 className="text-lg font-bold" style={{
              fontFamily: 'var(--font-heading)'
            }}>Flappy board</h3>
              </div>
              {topScores.length === 0 ? <div className="px-5 py-10 text-center text-sm text-muted-foreground">No scores yet. Open a cabinet.</div> : <div className="divide-y divide-border">
                  {topScores.map((m, i) => <div key={m.name} className="flex items-center gap-3 px-5 py-3">
                      <span className="w-5 text-xs font-bold text-muted-foreground">{i + 1}</span>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{
                background: m.color
              }}>
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="flex-1 text-sm font-semibold">{m.name}</span>
                      <span className="points-pill">
                        <Trophy size={11} aria-hidden="true" />
                        {m.gameHighScore}
                      </span>
                    </div>)}
                </div>}
            </div>
          </motion.div>}

        {/* COMPACT HORIZONTAL ROWS — Cool Math list style */}
        {topRow.length > 0 && <section>
            <div className="mb-3 flex items-end justify-between">
              <h2 className="text-lg font-bold" style={{
            fontFamily: 'var(--font-heading)'
          }}>Quick picks</h2>
              <p className="text-xs font-semibold text-muted-foreground">Jump in fast</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {topRow.map((game, i) => {
            const art = game.thumbnail;
            const card = <div className="arcade-row pressable group">
                    <div className="arcade-row-thumb">
                      <img src={art} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                      <span className="arcade-rank">{i + 2}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-bold">{game.name}</h3>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{game.description}</p>
                    </div>
                  </div>;
            return game.live ? <Link key={game.id} to={game.path}>{card}</Link> : <div key={game.id} className="opacity-50">{card}</div>;
          })}
            </div>
          </section>}

        {/* SQUARE ART GRID */}
        {grid.length > 0 && <section>
            <div className="mb-3 flex items-end justify-between">
              <h2 className="text-lg font-bold" style={{
            fontFamily: 'var(--font-heading)'
          }}>More cabinets</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {grid.map((game, i) => {
            const art = game.thumbnail;
            const inner = <div className="arcade-tile group">
                    <div className="arcade-tile-art">
                      <img src={art} alt={game.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" loading="lazy" />
                      {!game.live && <span className="arcade-live arcade-live-muted">Soon</span>}
                      {!game.live && <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-bold text-white">
                          <Lock size={12} className="mr-1" /> Soon
                        </div>}
                    </div>
                    <h3 className="arcade-tile-title">{game.name}</h3>
                    <p className="arcade-tile-desc">{game.description}</p>
                  </div>;
            return <motion.div key={game.id} initial={{
              opacity: 0,
              y: 10
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              duration: 0.35,
              delay: 0.08 + i * 0.04,
              ease: [0.22, 1, 0.36, 1]
            }}>
                    {game.live ? <Link to={game.path} className="pressable block h-full">{inner}</Link> : <div className="h-full opacity-55">{inner}</div>}
                  </motion.div>;
          })}
            </div>
          </section>}
      </div>
    </AppLayout>;
}
