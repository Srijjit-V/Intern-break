import { Helmet } from '@dr.pogodin/react-helmet';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Trophy, RotateCcw } from 'lucide-react';
import AppLayout from '@/layouts/AppLayout';
import { awardGamePoints, getUser, recordSnakeScore } from '@/lib/ibs-store';
import { snake as snakeContent } from 'virtual:content';
import GameBackButton from '@/components/GameBackButton';

// ─── Constants ────────────────────────────────────────────────────────────────
const COLS = 20;
const ROWS = 20;
const CELL = 24; // px
const TICK_MS = 110;

type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Pt = { x: number; y: number };

function rand(max: number) { return Math.floor(Math.random() * max); }
function ptEq(a: Pt, b: Pt) { return a.x === b.x && a.y === b.y; }

function newApple(snake: Pt[]): Pt {
  let pt: Pt;
  do { pt = { x: rand(COLS), y: rand(ROWS) }; }
  while (snake.some((s) => ptEq(s, pt)));
  return pt;
}

function initSnake(): Pt[] {
  const cx = Math.floor(COLS / 2);
  const cy = Math.floor(ROWS / 2);
  return [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
}

// ─── Leaderboard helpers ──────────────────────────────────────────────────────
interface SnakeEntry { name: string; color: string; score: number }

function getSnakeLeaderboard(): SnakeEntry[] {
  try { return JSON.parse(localStorage.getItem('ibs_snake_lb') || '[]'); }
  catch { return []; }
}
function saveSnakeScore(score: number) {
  const user = getUser();
  if (!user) return;
  const lb = getSnakeLeaderboard();
  const idx = lb.findIndex((e) => e.name === user.name);
  if (idx >= 0) { if (score > lb[idx].score) lb[idx].score = score; }
  else lb.push({ name: user.name, color: user.color ?? '#888', score });
  lb.sort((a, b) => b.score - a.score);
  localStorage.setItem('ibs_snake_lb', JSON.stringify(lb.slice(0, 20)));
  // Persist to room leaderboard
  recordSnakeScore(score);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SnakePage() {
  const [snake, setSnake] = useState<Pt[]>(initSnake);
  const [apple, setApple] = useState<Pt>(() => newApple(initSnake()));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'playing' | 'dead'>('idle');
  const [leaderboard, setLeaderboard] = useState<SnakeEntry[]>([]);
  const [countdown, setCountdown] = useState(0);

  const dirRef = useRef<Dir>('RIGHT');
  const snakeRef = useRef<Pt[]>(initSnake());
  const appleRef = useRef<Pt>(newApple(initSnake()));
  const phaseRef = useRef<'idle' | 'playing' | 'dead'>('idle');
  const scoreRef = useRef(0);
  const tickRef = useRef<number | null>(null);
  const pendingDir = useRef<Dir | null>(null);

  const user = getUser();
  const userColor = user?.color ?? '#6c63ff';

  useEffect(() => {
    const lb = getSnakeLeaderboard();
    setLeaderboard(lb.slice(0, 5));
    const me = lb.find((e) => e.name === user?.name);
    if (me) setBest(me.score);
  }, []);

  const stopTick = useCallback(() => {
    if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
  }, []);

  const tick = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    // Apply pending direction change
    if (pendingDir.current) { dirRef.current = pendingDir.current; pendingDir.current = null; }
    const d = dirRef.current;
    const head = snakeRef.current[0];
    const next: Pt = {
      x: (head.x + (d === 'RIGHT' ? 1 : d === 'LEFT' ? -1 : 0) + COLS) % COLS,
      y: (head.y + (d === 'DOWN' ? 1 : d === 'UP' ? -1 : 0) + ROWS) % ROWS,
    };
    // Self collision
    if (snakeRef.current.some((s) => ptEq(s, next))) {
      phaseRef.current = 'dead';
      setPhase('dead');
      stopTick();
      saveSnakeScore(scoreRef.current);
      const updatedLeaderboard = getSnakeLeaderboard();
      const placement = Math.max(1, updatedLeaderboard.findIndex((entry) => entry.name === user?.name) + 1);
      if (user) awardGamePoints(user, placement);
      const lb = updatedLeaderboard;
      setLeaderboard(lb.slice(0, 5));
      const me = lb.find((e) => e.name === user?.name);
      if (me) setBest(me.score);
      return;
    }
    const ate = ptEq(next, appleRef.current);
    const newSnake = ate ? [next, ...snakeRef.current] : [next, ...snakeRef.current.slice(0, -1)];
    snakeRef.current = newSnake;
    setSnake([...newSnake]);
    if (ate) {
      const newApplePos = newApple(newSnake);
      appleRef.current = newApplePos;
      setApple(newApplePos);
      scoreRef.current += 10;
      setScore(scoreRef.current);
    }
  }, [stopTick, user?.name]);

  const startGame = useCallback(() => {
    stopTick();
    const s = initSnake();
    const a = newApple(s);
    snakeRef.current = s; appleRef.current = a;
    dirRef.current = 'RIGHT'; pendingDir.current = null;
    scoreRef.current = 0;
    setSnake(s); setApple(a); setScore(0);
    // 3-second countdown
    setCountdown(3);
    setPhase('idle');
    phaseRef.current = 'idle';
    let c = 3;
    const cdInterval = window.setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        window.clearInterval(cdInterval);
        setCountdown(0);
        phaseRef.current = 'playing';
        setPhase('playing');
        tickRef.current = window.setInterval(tick, TICK_MS);
      }
    }, 1000);
  }, [stopTick, tick]);

  useEffect(() => () => stopTick(), [stopTick]);

  // Keyboard controls
  useEffect(() => {
    const OPPOSITE: Record<Dir, Dir> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
    function onKey(e: KeyboardEvent) {
      const map: Record<string, Dir> = { ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT' };
      const next = map[e.key];
      if (!next) return;
      e.preventDefault();
      if (phaseRef.current !== 'playing') return;
      if (next !== OPPOSITE[dirRef.current]) pendingDir.current = next;
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // D-pad button handler
  function dpad(d: Dir) {
    const OPPOSITE: Record<Dir, Dir> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
    if (phaseRef.current !== 'playing') return;
    if (d !== OPPOSITE[dirRef.current]) pendingDir.current = d;
  }

  const W = COLS * CELL;
  const H = ROWS * CELL;

  return (
    <AppLayout title="Domain Dash">
      <Helmet>
        <title>{snakeContent.title} — Intern Break Space</title>
        <meta name="description" content={snakeContent.description} />
        <link rel="canonical" href="/snake" />
      </Helmet>

      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <GameBackButton />
          <div className="flex items-center gap-3">
            <span className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground">Score <span className="ml-1 font-bold text-primary">{score}</span></span>
            <span className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground">Best <span className="ml-1 font-bold" style={{ color: '#fbbf24' }}>{best}</span></span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
          {/* Game canvas */}
          <div className="flex flex-col items-center gap-4">
            <div
              className="relative overflow-hidden rounded-2xl border-2 border-border shadow-2xl"
              style={{ width: W, height: H, background: '#0a0a14' }}
            >
              {/* Grid lines */}
              <svg className="pointer-events-none absolute inset-0" width={W} height={H}>
                {Array.from({ length: COLS + 1 }).map((_, i) => (
                  <line key={`v${i}`} x1={i * CELL} y1={0} x2={i * CELL} y2={H} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
                ))}
                {Array.from({ length: ROWS + 1 }).map((_, i) => (
                  <line key={`h${i}`} x1={0} y1={i * CELL} x2={W} y2={i * CELL} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
                ))}
                {/* Domain pickup */}
                <g>
                  <rect x={apple.x * CELL + 3} y={apple.y * CELL + 5} width={CELL - 6} height={CELL - 10} rx={4} fill="hsl(var(--primary))" />
                  <text x={apple.x * CELL + CELL / 2} y={apple.y * CELL + CELL / 2 + 3} textAnchor="middle" fontSize="8" fontWeight="800" fill="white">.com</text>
                  <circle cx={apple.x * CELL + CELL - 6} cy={apple.y * CELL + 6} r={3} fill="#fbbf24" />
                </g>
                {/* Snake */}
                {snake.map((seg, i) => {
                  const isHead = i === 0;
                  const progress = i / Math.max(snake.length - 1, 1);
                  // Color fades from user color at head to darker at tail
                  const alpha = 1 - progress * 0.5;
                  return (
                    <rect
                      key={i}
                      x={seg.x * CELL + 2}
                      y={seg.y * CELL + 2}
                      width={CELL - 4}
                      height={CELL - 4}
                      rx={isHead ? 6 : 4}
                      fill={userColor}
                      opacity={alpha}
                    />
                  );
                })}
                {/* Head eyes */}
                {snake.length > 0 && (() => {
                  const h = snake[0];
                  const cx = h.x * CELL + CELL / 2;
                  const cy = h.y * CELL + CELL / 2;
                  const d = dirRef.current;
                  const e1 = d === 'UP' || d === 'DOWN'
                    ? [{ x: cx - 4, y: d === 'UP' ? cy - 4 : cy + 4 }, { x: cx + 4, y: d === 'UP' ? cy - 4 : cy + 4 }]
                    : [{ x: d === 'LEFT' ? cx - 4 : cx + 4, y: cy - 4 }, { x: d === 'LEFT' ? cx - 4 : cx + 4, y: cy + 4 }];
                  return e1.map((eye, ei) => (
                    <circle key={ei} cx={eye.x} cy={eye.y} r={2.5} fill="white" />
                  ));
                })()}
              </svg>

              {/* Overlay: idle / countdown / dead */}
              {phase !== 'playing' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl" style={{ background: 'rgba(10,10,20,0.82)', backdropFilter: 'blur(2px)' }}>
                  {countdown > 0 ? (
                    <div className="text-7xl font-black text-primary animate-ping" style={{ animationDuration: '0.8s' }}>{countdown}</div>
                  ) : phase === 'dead' ? (
                    <>
                      <div className="text-4xl mb-2">💀</div>
                      <p className="text-xl font-bold text-foreground mb-1">Game Over</p>
                      <p className="text-sm text-muted-foreground mb-5">Score: <span className="text-primary font-bold">{score}</span></p>
                      <button onClick={startGame} className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
                        <RotateCcw size={15} /> {snakeContent.playAgainButton}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-5xl mb-3">🌐</div>
                      <h1 className="text-xl font-bold text-foreground mb-1">Domain Dash</h1>
                      <p className="text-xs text-muted-foreground mb-5">{snakeContent.instructions}</p>
                      <button onClick={startGame} className="rounded-xl bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
                        {snakeContent.startButton}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Mobile D-pad */}
            <div className="grid grid-cols-3 gap-2 lg:hidden">
              {[
                [null, 'UP', null],
                ['LEFT', null, 'RIGHT'],
                [null, 'DOWN', null],
              ].map((row, ri) =>
                row.map((d, ci) =>
                  d ? (
                    <button
                      key={`${ri}-${ci}`}
                      onPointerDown={() => dpad(d as Dir)}
                      className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card text-lg font-bold text-foreground active:bg-primary active:text-primary-foreground select-none"
                    >
                      {d === 'UP' ? '↑' : d === 'DOWN' ? '↓' : d === 'LEFT' ? '←' : '→'}
                    </button>
                  ) : (
                    <div key={`${ri}-${ci}`} className="h-12 w-12" />
                  )
                )
              )}
            </div>
          </div>

          {/* Leaderboard panel */}
          <div className="w-full max-w-xs rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Trophy size={15} style={{ color: '#fbbf24' }} />
              <span className="text-sm font-semibold text-foreground">{snakeContent.topScoresTitle}</span>
            </div>
            {leaderboard.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">{snakeContent.noScoresText}</p>
            ) : (
              <div className="divide-y divide-border/30">
                {leaderboard.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-5 text-center text-xs font-bold" style={{ color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7c2f' : '#6b7280' }}>{i + 1}</span>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: entry.color }}>{entry.name.charAt(0).toUpperCase()}</div>
                    <span className="flex-1 text-sm text-foreground">{entry.name}</span>
                    <span className="text-sm font-bold" style={{ color: '#fbbf24' }}>{entry.score}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
              {snakeContent.pointsLabel}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
