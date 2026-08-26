import { Helmet } from '@dr.pogodin/react-helmet';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Trophy, RotateCcw, Timer } from 'lucide-react';
import GameBackButton from '@/components/GameBackButton';
import { motion, AnimatePresence } from 'motion/react';
import AppLayout from '@/layouts/AppLayout'
import HowToPlayGuide from '@/components/HowToPlayGuide';
import { getUser, recordMemoryScore } from '@/lib/ibs-store';
import { memory as memoryContent } from 'virtual:content';

// ─── Card data ────────────────────────────────────────────────────────────────
const EMOJIS = ['🍎', '🍌', '🍓', '🍇', '🍉', '🍒', '🍍', '🥝', '🍑', '🍋', '🥭', '🫐'];

interface Card {
  id: number;
  emoji: string;
  pairId: number;
  flipped: boolean;
  matched: boolean;
}

type Difficulty = 'Easy' | 'Medium' | 'Hard';
const DIFF_PAIRS: Record<Difficulty, number> = { Easy: 6, Medium: 10, Hard: 12 };
const DIFF_COLS:  Record<Difficulty, number> = { Easy: 4, Medium: 5,  Hard: 6  };

function buildDeck(pairs: number): Card[] {
  const emojis = EMOJIS.slice(0, pairs);
  const cards: Card[] = [];
  emojis.forEach((emoji, pairId) => {
    cards.push({ id: pairId * 2,     emoji, pairId, flipped: false, matched: false });
    cards.push({ id: pairId * 2 + 1, emoji, pairId, flipped: false, matched: false });
  });
  // Fisher-Yates shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

// ─── Score helpers ────────────────────────────────────────────────────────────
interface MemoryEntry { name: string; color: string; score: number; difficulty: Difficulty }

function getMemoryLeaderboard(): MemoryEntry[] {
  try { return JSON.parse(localStorage.getItem('ibs_memory_lb') || '[]'); }
  catch { return []; }
}

function saveMemoryScore(score: number, difficulty: Difficulty) {
  const user = getUser();
  if (!user) return;
  const lb = getMemoryLeaderboard();
  const idx = lb.findIndex((e) => e.name === user.name && e.difficulty === difficulty);
  if (idx >= 0) { if (score > lb[idx].score) lb[idx].score = score; }
  else lb.push({ name: user.name, color: user.color ?? '#888', score, difficulty });
  lb.sort((a, b) => b.score - a.score);
  localStorage.setItem('ibs_memory_lb', JSON.stringify(lb.slice(0, 30)));
  // Persist to room leaderboard
  recordMemoryScore(score);
}

function calcScore(pairs: number, moves: number, timeMs: number, difficulty: Difficulty): number {
  const base = pairs * 100;
  const movePenalty = Math.max(0, (moves - pairs) * 5);
  const timePenalty = Math.floor(timeMs / 1000) * 2;
  const diffBonus = difficulty === 'Hard' ? 200 : difficulty === 'Medium' ? 100 : 0;
  return Math.max(0, base - movePenalty - timePenalty + diffBonus);
}
function MemoryCard({ card, onClick, disabled }: { card: Card; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || card.matched}
      className="relative aspect-square w-full select-none"
      style={{ perspective: 600 }}
    >
      <motion.div
        className="relative h-full w-full"
        animate={{ rotateY: card.flipped || card.matched ? 180 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' as const }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Back face */}
        <div
          className="absolute inset-0 flex items-center justify-center rounded-xl border-2 border-border"
          style={{
            backfaceVisibility: 'hidden',
            background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
          }}
        >
          <span className="text-2xl opacity-40">GD</span>
        </div>
        {/* Front face */}
        <div
          className={`absolute inset-0 flex items-center justify-center rounded-xl border-2 text-3xl ${card.matched ? 'border-green-500/60' : 'border-primary/60'}`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: card.matched
              ? 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.2))'
              : 'linear-gradient(135deg, rgba(108,99,255,0.25), rgba(167,139,250,0.25))',
          }}
        >
          {card.emoji}
        </div>
      </motion.div>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MemoryPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [cards, setCards] = useState<Card[]>([]);
  const [phase, setPhase] = useState<'idle' | 'playing' | 'won'>('idle');
  const [flipped, setFlipped] = useState<number[]>([]); // ids of currently face-up unmatched cards
  const [moves, setMoves] = useState(0);
  const [matched, setMatched] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<MemoryEntry[]>([]);
  const [lbDiff, setLbDiff] = useState<Difficulty>('Medium');
  const [lockBoard, setLockBoard] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const startTime = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setLeaderboard(getMemoryLeaderboard().filter((e) => e.difficulty === lbDiff).slice(0, 5));
  }, [lbDiff]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  function startGame(diff: Difficulty = difficulty) {
    stopTimer();
    setDifficulty(diff);
    const pairs = DIFF_PAIRS[diff];
    const deck = buildDeck(pairs);
    setCards(deck);
    setFlipped([]);
    setMoves(0);
    setMatched(0);
    setElapsed(0);
    setLockBoard(false);
    setPhase('idle');

    // Brief preview: show all cards for 2s then flip back
    const flippedDeck = deck.map((c) => ({ ...c, flipped: true }));
    setCards(flippedDeck);
    setCountdown(2);

    let c = 2;
    const cdInterval = window.setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        window.clearInterval(cdInterval);
        setCountdown(0);
        setCards(deck.map((card) => ({ ...card, flipped: false })));
        setPhase('playing');
        startTime.current = Date.now();
        timerRef.current = window.setInterval(() => {
          setElapsed(Date.now() - startTime.current);
        }, 200);
      }
    }, 1000);
  }

  function handleCardClick(cardId: number) {
    if (lockBoard || phase !== 'playing') return;
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.flipped || card.matched) return;
    if (flipped.includes(cardId)) return;

    const newFlipped = [...flipped, cardId];
    setCards((prev) => prev.map((c) => c.id === cardId ? { ...c, flipped: true } : c));
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      setLockBoard(true);
      const [id1, id2] = newFlipped;
      const c1 = cards.find((c) => c.id === id1)!;
      const c2 = cards.find((c) => c.id === id2)!;

      if (c1.pairId === c2.pairId) {
        // Match!
        const newMatched = matched + 1;
        setTimeout(() => {
          setCards((prev) => prev.map((c) => newFlipped.includes(c.id) ? { ...c, matched: true } : c));
          setFlipped([]);
          setLockBoard(false);
          setMatched(newMatched);
          const { pairs } = { pairs: DIFF_PAIRS[difficulty] };
          if (newMatched === pairs) {
            stopTimer();
            const timeMs = Date.now() - startTime.current;
            const sc = calcScore(pairs, moves + 1, timeMs, difficulty);
            setFinalScore(sc);
            saveMemoryScore(sc, difficulty);
            setLeaderboard(getMemoryLeaderboard().filter((e) => e.difficulty === difficulty).slice(0, 5));
            setLbDiff(difficulty);
            setPhase('won');
          }
        }, 500);
      } else {
        // No match — flip back
        setTimeout(() => {
          setCards((prev) => prev.map((c) => newFlipped.includes(c.id) ? { ...c, flipped: false } : c));
          setFlipped([]);
          setLockBoard(false);
        }, 900);
      }
    }
  }

  const pairs = DIFF_PAIRS[difficulty];
  const cols  = DIFF_COLS[difficulty];
  const secs = Math.floor(elapsed / 1000);
  const mins = Math.floor(secs / 60);
  const timeStr = `${mins}:${String(secs % 60).padStart(2, '0')}`;

  return (
    <AppLayout title="Memory Match">
      <Helmet>
        <title>{memoryContent.title} — Intern Break Space</title>
        <meta name="description" content={memoryContent.description} />
        <link rel="canonical" href="/memory" />
      </Helmet>

      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <GameBackButton />
          <div className="flex items-center gap-2">
            {phase === 'playing' && (
              <>
                <span className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground">
                  <Timer size={13} className="text-primary" /> {timeStr}
                </span>
                <span className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground">
                  Moves <span className="ml-1 font-bold text-primary">{moves}</span>
                </span>
                <span className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground">
                  {matched}/{pairs} pairs
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Game area */}
          <div className="flex-1">
            {/* Difficulty selector */}
            {phase === 'idle' && countdown === 0 && (
              <div className="mb-5 flex flex-col items-center gap-5 rounded-2xl border border-border bg-card p-6 text-center">
                <div className="text-5xl">🃏</div>
                <div>
                  <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{memoryContent.title}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">{memoryContent.description}</p>
                </div>
                <div className="flex gap-3">
                  {memoryContent.difficulties.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDifficulty(d.id as Difficulty)}
                      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${difficulty === d.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted text-muted-foreground hover:border-primary/50'}`}
                    >
                      <span>{d.label}</span>
                      <span className="ml-1.5 text-xs opacity-70">{d.detail}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => startGame(difficulty)}
                  className="rounded-xl bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
                >
                  {memoryContent.startButton}
                </button>
              </div>
            )}

              {countdown > 0 && (
              <div className="mb-4 flex items-center justify-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
                {memoryContent.previewBanner.replace('{n}', String(countdown))}
              </div>
            )}

            {/* Card grid */}
            {(phase === 'playing' || phase === 'won' || countdown > 0) && cards.length > 0 && (
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
              >
                {cards.map((card) => (
                  <MemoryCard
                    key={card.id}
                    card={card}
                    onClick={() => handleCardClick(card.id)}
                    disabled={lockBoard || phase !== 'playing' || countdown > 0}
                  />
                ))}
              </div>
            )}

            {/* Win overlay */}
            <AnimatePresence>
              {phase === 'won' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-5 rounded-2xl border border-green-500/30 bg-card p-6 text-center shadow-xl"
                >
                  <div className="text-5xl mb-2">🎉</div>
                  <h3 className="text-xl font-bold text-foreground mb-1">You matched them all!</h3>
                  <p className="text-sm text-muted-foreground mb-1">{moves} moves · {timeStr}</p>
                  <p className="text-4xl font-black text-primary mb-5">{finalScore} <span className="text-lg text-muted-foreground">pts</span></p>
                  <div className="flex justify-center gap-3">
                    <button onClick={() => startGame(difficulty)} className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
                      <RotateCcw size={14} /> {memoryContent.playAgainButton}
                    </button>
                    <button onClick={() => { setPhase('idle'); setCards([]); }} className="rounded-xl border border-border bg-muted px-6 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/70">
                      {memoryContent.changeDiffButton}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Leaderboard panel */}
          <div className="w-full lg:w-64 shrink-0">
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <Trophy size={15} style={{ color: '#fbbf24' }} />
                <span className="text-sm font-semibold text-foreground">{memoryContent.topScoresTitle}</span>
              </div>
              {/* Difficulty tabs */}
              <div className="flex border-b border-border">
                {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setLbDiff(d)}
                    className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${lbDiff === d ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              {leaderboard.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">{memoryContent.noScoresText}</p>
              ) : (
                <div className="divide-y divide-border/30">
                  {leaderboard.map((entry, i) => (
                    <div key={`${entry.name}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="w-5 text-center text-xs font-bold" style={{ color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7c2f' : '#6b7280' }}>{i + 1}</span>
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: entry.color }}>{entry.name.charAt(0).toUpperCase()}</div>
                      <span className="flex-1 truncate text-sm text-foreground">{entry.name}</span>
                      <span className="text-sm font-bold" style={{ color: '#fbbf24' }}>{entry.score}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
                {memoryContent.scoreFormula}
              </div>
            </div>

            <HowToPlayGuide
              className="mt-4"
              title={memoryContent.howToPlayTitle}
              steps={memoryContent.howToPlay.map((tip, i) => ({
                title: (['Peek', 'Match', 'Score'] as const)[i] ?? `Tip ${i + 1}`,
                body: tip,
                icon: (['eye', 'click', 'trophy'] as const)[i] ?? 'trophy',
              }))}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
