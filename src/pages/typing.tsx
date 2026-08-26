import { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion, AnimatePresence } from 'motion/react';

import { RotateCcw, Trophy, Keyboard, Timer, Zap } from 'lucide-react';
import AppLayout from '@/layouts/AppLayout';
import { getGameMetadata } from '@/lib/game-registry';
import { getUser, getRoom, saveRoom, saveUser, persistCurrentRoomProfile, type IBSUser, type IBSRoom } from '@/lib/ibs-store';
import GameBackButton from '@/components/GameBackButton';

// ── Word bank ─────────────────────────────────────────────────────────────────
const WORD_BANK = [
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it',
  'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this',
  'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or',
  'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
  'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could',
  'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come',
  'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how',
  'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because',
  'any', 'these', 'give', 'day', 'most', 'us', 'great', 'between', 'need',
  'large', 'often', 'hand', 'high', 'place', 'hold', 'turn', 'help',
  'start', 'show', 'hear', 'play', 'run', 'move', 'live', 'believe',
  'hold', 'bring', 'happen', 'write', 'provide', 'sit', 'stand', 'lose',
  'pay', 'meet', 'include', 'continue', 'set', 'learn', 'change', 'lead',
  'understand', 'watch', 'follow', 'stop', 'create', 'speak', 'read',
  'spend', 'grow', 'open', 'walk', 'win', 'offer', 'remember', 'love',
  'consider', 'appear', 'buy', 'wait', 'serve', 'die', 'send', 'expect',
  'build', 'stay', 'fall', 'cut', 'reach', 'kill', 'remain', 'suggest',
  'raise', 'pass', 'sell', 'require', 'report', 'decide', 'pull', 'break',
];

const GAME_DURATION = 60; // seconds
const WORD_COUNT = 80;

function generateWords(): string[] {
  const words: string[] = [];
  for (let i = 0; i < WORD_COUNT; i++) {
    words.push(WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)]);
  }
  return words;
}

type GameState = 'idle' | 'countdown' | 'playing' | 'done';

interface RunResult {
  wpm: number;
  accuracy: number;
  correct: number;
  incorrect: number;
  isNewBest: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function saveTypingScore(wpm: number): { isNewBest: boolean } {
  const user = getUser();
  if (!user) return { isNewBest: false };
  const room = getRoom(user.roomCode ?? '');
  if (!room) return { isNewBest: false };

  const isNewBest = wpm > (user.typingHighScore ?? 0);
  if (isNewBest) {
    const goldGain = Math.max(1, Math.round(wpm * 0.5));
    const diamondGain = Math.max(1, Math.round(wpm * 0.25));
    user.typingHighScore = wpm;
    user.gold = Number(user.gold ?? 0) + goldGain;
    user.diamonds = Number(user.diamonds ?? 0) + diamondGain;
    saveUser(user);
    room.members = (room.members ?? []).map((m) =>
      m.name === user.name
        ? { ...m, typingHighScore: wpm, gold: Number(m.gold ?? 0) + goldGain, diamonds: Number(m.diamonds ?? 0) + diamondGain }
        : m
    );
    saveRoom(user.roomCode ?? '', room as IBSRoom);
    void persistCurrentRoomProfile(user);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('ibs-currency-updated'));
  }
  return { isNewBest };
}

// ── Stat chip ─────────────────────────────────────────────────────────────────
function StatChip({ icon: Icon, value, label, color }: { icon: React.ElementType; value: string | number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl flex-1 min-w-[120px]"
      style={{ background: 'var(--surface-card)', border: '1px solid rgba(27,219,219,0.2)' }}>
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TypingPage() {
  const [user, setUser] = useState<IBSUser | null>(null);
  const [room, setRoom] = useState<IBSRoom | null>(null);

  const [gameState, setGameState] = useState<GameState>('idle');
  const [words, setWords] = useState<string[]>(() => generateWords());
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameDuration, setGameDuration] = useState(GAME_DURATION);
  const [wordGoal, setWordGoal] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [correctWords, setCorrectWords] = useState(0);
  const [incorrectWords, setIncorrectWords] = useState(0);
  const [wordStatuses, setWordStatuses] = useState<Record<number, 'correct' | 'incorrect'>>({});
  const [result, setResult] = useState<RunResult | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const endedRef = useRef(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const wordListRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) return;
    setUser(u);
    const r = u.roomCode ? getRoom(u.roomCode) : null;
    setRoom(r);
  }, []);

  // Scroll active word into view
  useEffect(() => {
    if (gameState !== 'playing') return;
    const el = document.getElementById(`word-${currentWordIdx}`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [currentWordIdx, gameState]);

  const endGame = useCallback((correct: number, incorrect: number) => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    const totalTyped = correct + incorrect;
    const accuracy = totalTyped > 0 ? Math.round((correct / totalTyped) * 100) : 0;
    const elapsedMinutes = Math.max((Date.now() - (startedAtRef.current ?? Date.now())) / 60000, 1 / 60);
    const wpm = Math.round(correct / elapsedMinutes);
    const { isNewBest } = saveTypingScore(wpm);
    setResult({ wpm, accuracy, correct, incorrect, isNewBest });
    setGameState('done');
    const u = getUser();
    if (u) { setUser(u); const r = u.roomCode ? getRoom(u.roomCode) : null; if (r) setRoom(r); }
  }, []);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState]);

  // End game when timer hits 0
  useEffect(() => {
    if (gameState === 'playing' && timeLeft === 0) {
      endGame(correctWords, incorrectWords);
    }
  }, [timeLeft, gameState, correctWords, incorrectWords, endGame]);

  // Countdown
  useEffect(() => {
    if (gameState !== 'countdown') return;
    setCountdown(3);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countdownRef.current!);
          startedAtRef.current = Date.now();
          setGameState('playing');
          setTimeout(() => inputRef.current?.focus(), 50);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [gameState]);

  function startGame() {
    const newWords = generateWords().slice(0, wordGoal ?? WORD_COUNT);
    setWords(newWords);
    setCurrentWordIdx(0);
    setInputValue('');
    setTimeLeft(gameDuration);
    setCorrectWords(0);
    setIncorrectWords(0);
    setWordStatuses({});
    setResult(null);
    startedAtRef.current = null;
    endedRef.current = false;
    setGameState('countdown');
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (gameState !== 'playing') return;

    // Space or Enter = submit word
    if (val.endsWith(' ') || val.endsWith('\n')) {
      const typed = val.trim();
      const expected = words[currentWordIdx];
      const isCorrect = typed === expected;

      const newCorrect = correctWords + (isCorrect ? 1 : 0);
      const newIncorrect = incorrectWords + (isCorrect ? 0 : 1);

      setWordStatuses((prev) => ({ ...prev, [currentWordIdx]: isCorrect ? 'correct' : 'incorrect' }));
      setCorrectWords(newCorrect);
      setIncorrectWords(newIncorrect);
      setCurrentWordIdx((i) => i + 1);
      setInputValue('');

      // Ran out of words
      if (currentWordIdx + 1 >= words.length) {
        endGame(newCorrect, newIncorrect);
      }
      return;
    }
    setInputValue(val);
  }

  // Leaderboard: top typing scores from room
  const typingLeaderboard = room
    ? [...(room.members ?? [])]
        .filter((m) => (m.typingHighScore ?? 0) > 0)
        .sort((a, b) => (b.typingHighScore ?? 0) - (a.typingHighScore ?? 0))
        .slice(0, 5)
    : [];

  const myBest = user?.typingHighScore ?? 0;
  const timerPct = wordGoal ? Math.max(0, 100 - (currentWordIdx / wordGoal) * 100) : (timeLeft / gameDuration) * 100;
  const timerColor = timeLeft > 20 ? '#1BDBDB' : timeLeft > 10 ? '#fbbf24' : '#ef4444';

  const game = getGameMetadata('typing');

  return (
    <AppLayout title={game.name}>
      <Helmet>
        <title>{game.name} — Intern Break Space</title>
        <meta name="description" content={game.description} />
        <link rel="canonical" href="/typing" />
      </Helmet>

      <div className="p-6 max-w-3xl mx-auto space-y-6" style={{ color: 'var(--text-primary)' }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
              {game.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Type as many words as you can in 60 seconds</p>
          </div>
          <GameBackButton />
        </motion.div>

        {/* Stats row */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}
          className="flex gap-3 flex-wrap">
          <StatChip icon={Keyboard} value={myBest > 0 ? `${myBest} WPM` : '—'} label="Your Best" color="#1BDBDB" />
          <StatChip icon={Trophy} value={typingLeaderboard[0] ? `${typingLeaderboard[0].typingHighScore ?? 0} WPM` : '—'} label="Room Best" color="#fbbf24" />
          <StatChip icon={Timer} value={wordGoal ? `${wordGoal} words` : `${gameDuration}s`} label="Mode" color="#38bdf8" />
          <StatChip icon={Zap} value={typingLeaderboard.length} label="Players" color="#1BDBDB" />
        </motion.div>

        {/* Game area */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl border overflow-hidden"
          style={{ background: 'var(--surface-card)', borderColor: 'rgba(27,219,219,0.2)' }}>

          <div className="px-5 pt-4 flex flex-wrap gap-2" role="group" aria-label="Speed Typing game mode">
            {[15, 30, 60].map((duration) => (
              <button key={duration} disabled={gameState === 'playing'} onClick={() => { setGameDuration(duration); setWordGoal(null); setTimeLeft(duration); }} className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50" style={{ borderColor: !wordGoal && gameDuration === duration ? 'var(--brand-primary)' : 'var(--surface-card-border)', background: !wordGoal && gameDuration === duration ? 'rgba(27,219,219,0.15)' : 'transparent' }}>{duration}s</button>
            ))}
            {[10, 20, 30].map((goal) => (
              <button key={goal} disabled={gameState === 'playing'} onClick={() => { setWordGoal(goal); setTimeLeft(GAME_DURATION); }} className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50" style={{ borderColor: wordGoal === goal ? 'var(--brand-primary)' : 'var(--surface-card-border)', background: wordGoal === goal ? 'rgba(27,219,219,0.15)' : 'transparent' }}>{goal} words</button>
            ))}
          </div>

          {/* Timer bar */}
          <div className="h-1 w-full mt-4" style={{ background: 'var(--surface-input)' }}>
            <motion.div className="h-full transition-all duration-1000"
              style={{ width: `${timerPct}%`, background: timerColor }} />
          </div>

          {/* Timer + WPM display */}
          <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'rgba(27,219,219,0.15)' }}>
            <div className="flex items-center gap-2">
              <Timer size={14} style={{ color: timerColor }} />
              <span className="text-lg font-black tabular-nums" style={{ color: timerColor, fontFamily: 'var(--font-heading)' }}>
                {wordGoal ? `${Math.min(currentWordIdx, wordGoal)}/${wordGoal}` : `${gameState === 'playing' || gameState === 'done' ? timeLeft : gameDuration}s`}
              </span>
            </div>
            {gameState === 'playing' && (
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  <span className="text-green-400 font-bold">{correctWords}</span> correct
                </span>
                <span className="text-muted-foreground">
                  <span className="text-red-400 font-bold">{incorrectWords}</span> wrong
                </span>
              </div>
            )}
          </div>

          {/* Word display */}
          <div className="relative px-5 py-5 min-h-[140px] flex flex-col justify-center">

            {/* IDLE */}
            {gameState === 'idle' && (
              <div className="flex flex-col items-center gap-4 py-4">
                <span className="text-5xl">⌨️</span>
                <p className="text-muted-foreground text-sm text-center">
                  Type the words as fast as you can.<br />
                  Press <kbd className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'var(--surface-input)', border: '1px solid var(--surface-card-border)' }}>Space</kbd> after each word.
                </p>
                <button onClick={startGame}
                  className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-secondary">
                  Start Game
                </button>
              </div>
            )}

            {/* COUNTDOWN */}
            <AnimatePresence>
              {gameState === 'countdown' && (
                <motion.div key="countdown" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.5 }}
                  className="flex flex-col items-center gap-2 py-4">
                  <span className="text-7xl font-black tabular-nums" style={{ fontFamily: 'var(--font-heading)', color: '#1BDBDB' }}>
                    {countdown}
                  </span>
                  <p className="text-muted-foreground/60 text-sm">Get ready…</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* PLAYING — word list */}
            {(gameState === 'playing') && (
              <div ref={wordListRef}
                className="flex flex-wrap gap-x-2 gap-y-1.5 max-h-[110px] overflow-hidden select-none"
                style={{ lineHeight: '1.8' }}>
                {words.map((word, i) => {
                  const status = wordStatuses[i];
                  const isCurrent = i === currentWordIdx;
                  return (
                    <span key={i} id={`word-${i}`}
                      className="text-base font-medium px-0.5 rounded transition-colors duration-100"
                      style={{
                        color: status === 'correct' ? '#4ade80' : status === 'incorrect' ? '#f87171' : isCurrent ? 'var(--text-primary)' : 'var(--text-muted)',
                        background: isCurrent ? 'rgba(27,219,219,0.25)' : 'transparent',
                        outline: isCurrent ? '1px solid rgba(27,219,219,0.5)' : 'none',
                        borderRadius: 4,
                      }}>
                      {word}
                    </span>
                  );
                })}
              </div>
            )}

            {/* DONE — result */}
            {gameState === 'done' && result && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                className="flex flex-col items-center gap-4 py-2">
                {result.isNewBest && (
                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: 'spring' }}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
                    style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                    🏆 New Personal Best!
                  </motion.div>
                )}
                <div className="flex items-end gap-2">
                  <span className="text-6xl font-black tabular-nums text-primary"
                    style={{ fontFamily: 'var(--font-heading)' }}>
                    {result.wpm}
                  </span>
                  <span className="text-xl font-bold text-muted-foreground mb-2">WPM</span>
                </div>
                <div className="flex gap-6 text-sm text-muted-foreground">
                  <span><span className="text-green-400 font-bold">{result.correct}</span> correct</span>
                  <span><span className="text-red-400 font-bold">{result.incorrect}</span> wrong</span>
                  <span><span className="text-foreground font-bold">{result.accuracy}%</span> accuracy</span>
                </div>
                <div className="flex gap-3 mt-1">
                  <button onClick={startGame}
                    className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-secondary">
                    <RotateCcw size={14} /> Play Again
                  </button>
                  <GameBackButton />
                </div>
              </motion.div>
            )}
          </div>

          {/* Input */}
          {gameState === 'playing' && (
            <div className="px-5 pb-5">
              <input
                ref={inputRef}
                value={inputValue}
                onChange={handleInput}
                onKeyDown={(e) => { if (e.key === 'Enter') { const fakeEvent = { target: { value: inputValue + ' ' } } as React.ChangeEvent<HTMLInputElement>; handleInput(fakeEvent); } }}
                placeholder="Start typing…"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="w-full rounded-xl px-4 py-3 text-base text-foreground placeholder-muted-foreground outline-none"
                style={{ background: 'var(--surface-input)', border: `1px solid rgba(27,219,219,0.4)`, boxShadow: '0 0 0 2px rgba(27,219,219,0.15)' }}
              />
            </div>
          )}
        </motion.div>

        {/* Leaderboard */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl border overflow-hidden"
          style={{ background: 'var(--surface-card)', borderColor: 'rgba(27,219,219,0.15)' }}>
          <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: 'rgba(27,219,219,0.15)' }}>
            <Trophy size={15} style={{ color: '#fbbf24' }} />
            <h2 className="text-sm font-semibold text-foreground">Room Leaderboard</h2>
          </div>
          {typingLeaderboard.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              No scores yet — be the first to play!
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(27,219,219,0.1)' }}>
              {typingLeaderboard.map((m, i) => {
                const isMe = m.name === user?.name;
                const medalColors = ['#fbbf24', '#94a3b8', '#cd7c2f'];
                return (
                  <div key={m.name} className="flex items-center gap-3 px-5 py-3"
                    style={{ background: isMe ? 'rgba(27,219,219,0.08)' : 'transparent' }}>
                    <span className="w-6 text-center text-sm">
                      {i < 3 ? ['🥇', '🥈', '🥉'][i] : <span className="text-xs text-muted-foreground">#{i + 1}</span>}
                    </span>
                    <div className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white shrink-0"
                      style={{ background: m.color }}>
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm text-foreground">{m.name}</span>
                    {isMe && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ background: 'rgba(27,219,219,0.2)', color: '#0fa8a8', border: '1px solid rgba(27,219,219,0.3)' }}>
                        You
                      </span>
                    )}
                    <span className="text-sm font-bold tabular-nums" style={{ color: i < 3 ? medalColors[i] : 'var(--text-primary)' }}>
                      {m.typingHighScore ?? 0} WPM
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
