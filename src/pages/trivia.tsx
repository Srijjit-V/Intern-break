import { trivia } from 'virtual:content';
import { Helmet } from '@dr.pogodin/react-helmet';
import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Trophy, RotateCcw, CheckCircle2, XCircle, Star } from 'lucide-react';
import AppLayout from '@/layouts/AppLayout';
import { getUser, getRoom, saveRoom, saveUser, type IBSUser } from '@/lib/ibs-store';
import GameBackButton from '@/components/GameBackButton';

// ── Types ─────────────────────────────────────────────────────────────────────

// ── Types ─────────────────────────────────────────────────────────────────────
type Question = (typeof trivia)[number];
type Phase = 'intro' | 'countdown' | 'playing' | 'result';
type AnswerState = 'unanswered' | 'correct' | 'wrong';

const TOTAL_QUESTIONS = 10;
const SECONDS_PER_QUESTION = 12;
const CATEGORY_COLORS: Record<string, string> = {
  Domains: '#38bdf8',
  Websites: '#4ade80',
  Marketing: '#1BDBDB',
  Internet: '#fb923c',
  InternLife: '#f472b6',
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickQuestions(): Question[] {
  return shuffle([...trivia]).slice(0, TOTAL_QUESTIONS);
}

function calcScore(correct: number, avgTimeMs: number): number {
  // Base: 100 pts per correct answer, speed bonus up to 50 pts per question
  const base = correct * 100;
  const speedBonus = correct > 0
    ? Math.round(correct * Math.max(0, 50 - (avgTimeMs / 1000) * 5))
    : 0;
  return base + speedBonus;
}

// ── Countdown overlay ─────────────────────────────────────────────────────────
function CountdownOverlay({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(3);
  useEffect(() => {
    if (count === 0) { onDone(); return; }
    const t = setTimeout(() => setCount((c) => c - 1), 900);
    return () => clearTimeout(t);
  }, [count, onDone]);
  return (
    <div className="absolute inset-0 flex items-center justify-center z-30 rounded-2xl"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' as const }}
          className="text-7xl font-black"
          style={{
            background: count === 0 ? 'linear-gradient(135deg,#fbbf24,#f97316)' : 'linear-gradient(135deg,#1BDBDB,#38bdf8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {count === 0 ? 'GO!' : count}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Timer ring ────────────────────────────────────────────────────────────────
function TimerRing({ seconds, total }: { seconds: number; total: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const pct = seconds / total;
  const color = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#fbbf24' : '#f87171';
  return (
    <svg width={56} height={56} className="shrink-0">
      <circle cx={28} cy={28} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4} />
      <circle
        cx={28} cy={28} r={r} fill="none"
        stroke={color} strokeWidth={4}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
        style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s' }}
      />
      <text x={28} y={33} textAnchor="middle" fontSize={14} fontWeight="bold" fill={color}>
        {seconds}
      </text>
    </svg>
  );
}

// ── Answer button ─────────────────────────────────────────────────────────────
function AnswerBtn({
  label, text, state, disabled, onClick,
}: {
  label: string; text: string; state: AnswerState; disabled: boolean; onClick: () => void;
}) {
  const base = 'relative flex items-center gap-3 w-full px-4 py-3 rounded-xl border text-left text-sm font-medium transition-all duration-200';
  let style: React.CSSProperties = {};
  let borderColor = 'rgba(255,255,255,0.1)';
  let bg = 'rgba(255,255,255,0.04)';
  let textColor = 'var(--foreground)';

  if (state === 'correct') {
    bg = 'rgba(74,222,128,0.15)';
    borderColor = 'rgba(74,222,128,0.5)';
    textColor = '#4ade80';
  } else if (state === 'wrong') {
    bg = 'rgba(248,113,113,0.12)';
    borderColor = 'rgba(248,113,113,0.4)';
    textColor = '#f87171';
  }
  style = { background: bg, borderColor, color: textColor };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.01 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      className={`${base} ${disabled ? 'cursor-default' : 'cursor-pointer hover:brightness-110'}`}
      style={{ ...style, border: `1px solid ${borderColor}` }}
    >
      <span
        className="flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold shrink-0"
        style={{ background: state === 'unanswered' ? 'rgba(27,219,219,0.2)' : 'transparent', color: state === 'unanswered' ? '#0fa8a8' : textColor }}
      >
        {label}
      </span>
      <span className="flex-1">{text}</span>
      {state === 'correct' && <CheckCircle2 size={16} className="shrink-0" style={{ color: '#4ade80' }} />}
      {state === 'wrong' && <XCircle size={16} className="shrink-0" style={{ color: '#f87171' }} />}
    </motion.button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TriviaPage() {
  const [user, setUser] = useState<IBSUser | null>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answerStates, setAnswerStates] = useState<AnswerState[]>([]);
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_QUESTION);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timings, setTimings] = useState<number[]>([]); // ms per question
  const [qStartTime, setQStartTime] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [prevBest, setPrevBest] = useState(0);
  const timerRef = useRef<number | null>(null);
  const answeredRef = useRef(false);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    setPrevBest(u?.triviaHighScore ?? 0);
  }, []);

  // ── Timer tick ──────────────────────────────────────────────────────────────
  const advanceQuestion = useCallback((timedOut = false) => {
    if (answeredRef.current && !timedOut) return;
    answeredRef.current = true;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    const elapsed = Date.now() - qStartTime;
    setTimings((prev) => [...prev, elapsed]);

    // Mark correct answer visible if timed out
    if (timedOut) {
      setAnswerStates((prev) => {
        const next = [...prev];
        const q = questions[qIndex];
        next[q.correct] = 'correct';
        return next;
      });
    }

    setTimeout(() => {
      if (qIndex + 1 >= TOTAL_QUESTIONS) {
        setPhase('result');
      } else {
        setQIndex((i) => i + 1);
        setSelected(null);
        setAnswerStates(Array(4).fill('unanswered'));
        setTimeLeft(SECONDS_PER_QUESTION);
        answeredRef.current = false;
        setQStartTime(Date.now());
      }
    }, timedOut ? 1200 : 900);
  }, [qIndex, qStartTime, questions]);

  useEffect(() => {
    if (phase !== 'playing') return;
    answeredRef.current = false;
    setQStartTime(Date.now());
    setTimeLeft(SECONDS_PER_QUESTION);
    setAnswerStates(Array(4).fill('unanswered'));
    setSelected(null);
  }, [qIndex, phase]);

  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          advanceQuestion(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, qIndex, advanceQuestion]);

  // ── Compute final score when result phase starts ────────────────────────────
  useEffect(() => {
    if (phase !== 'result') return;
    const avgMs = timings.length > 0 ? timings.reduce((a, b) => a + b, 0) / timings.length : 0;
    const finalScore = calcScore(correctCount, avgMs);
    setScore(finalScore);

    // Save high score + award currency
    if (user) {
      const prev = user.triviaHighScore ?? 0;
      if (finalScore > prev) {
        setIsNewBest(true);
        const goldGain = Math.max(1, Math.round(finalScore * 0.3));
        const diamondGain = Math.max(1, Math.round(finalScore * 0.15));
        const updated = {
          ...user,
          triviaHighScore: finalScore,
          gold: Number(user.gold ?? 0) + goldGain,
          diamonds: Number(user.diamonds ?? 0) + diamondGain,
        };
        saveUser(updated);
        setUser(updated);
        // Update room member
        const room = getRoom(user.roomCode ?? "");
        if (room) {
          room.members = (room.members ?? []).map((m) =>
            m.name === user.name
              ? { ...m, triviaHighScore: finalScore, gold: Number(m.gold ?? 0) + goldGain, diamonds: Number(m.diamonds ?? 0) + diamondGain }
              : m
          );
          saveRoom(user.roomCode ?? "", room);
        }
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('ibs-currency-updated'));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function startGame() {
    const qs = pickQuestions();
    setQuestions(qs);
    setQIndex(0);
    setSelected(null);
    setAnswerStates(Array(4).fill('unanswered'));
    setCorrectCount(0);
    setTimings([]);
    setScore(0);
    setIsNewBest(false);
    setPhase('countdown');
  }

  function handleAnswer(idx: number) {
    if (answeredRef.current || selected !== null) return;
    answeredRef.current = true;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    const q = questions[qIndex];
    const isCorrect = idx === q.correct;
    const elapsed = Date.now() - qStartTime;
    setTimings((prev) => [...prev, elapsed]);
    setSelected(idx);

    const next: AnswerState[] = Array(4).fill('unanswered');
    next[q.correct] = 'correct';
    if (!isCorrect) next[idx] = 'wrong';
    setAnswerStates(next);

    if (isCorrect) setCorrectCount((c) => c + 1);

    setTimeout(() => {
      if (qIndex + 1 >= TOTAL_QUESTIONS) {
        setPhase('result');
      } else {
        setQIndex((i) => i + 1);
        setSelected(null);
        setAnswerStates(Array(4).fill('unanswered'));
        setTimeLeft(SECONDS_PER_QUESTION);
        answeredRef.current = false;
        setQStartTime(Date.now());
      }
    }, 900);
  }

  const currentQ = questions[qIndex];
  const catColor = currentQ ? (CATEGORY_COLORS[currentQ.category] ?? '#1BDBDB') : '#1BDBDB';
  const avgMs = timings.length > 0 ? timings.reduce((a, b) => a + b, 0) / timings.length : 0;

  // ── Intro screen ────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <AppLayout title="Trivia Blitz">
        <Helmet>
          <title>Trivia Blitz — Intern Break Space</title>
          <meta name="description" content="Answer 10 trivia questions as fast as you can. Speed earns bonus points!" />
          <link rel="canonical" href="/trivia" />
        </Helmet>
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 py-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md text-center"
          >
            {/* Icon */}
            <div className="flex items-center justify-center w-20 h-20 rounded-2xl mx-auto mb-6"
              style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(249,115,22,0.2))', border: '1px solid rgba(251,191,36,0.3)' }}>
              <span className="text-4xl">⚡</span>
            </div>

            <h1 className="text-3xl font-black mb-2" style={{ fontFamily: 'var(--font-heading)', background: 'linear-gradient(135deg,#fbbf24,#f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Trivia Blitz
            </h1>
            <p className="text-muted-foreground text-sm mb-8">
              10 questions. 12 seconds each. Answer fast for bonus points.
            </p>

            {/* Rules */}
            <div className="rounded-2xl border border-border/30 p-5 mb-8 text-left space-y-3"
              style={{ background: 'var(--surface-card)' }}>
              {[
                ['⚡', 'Speed bonus', 'Faster answers earn more points per question'],
                ['✅', '100 pts each', 'Every correct answer is worth 100 base points'],
                ['⏱️', '12 seconds', 'Each question has a 12-second timer'],
                ['🏆', 'High score', 'Your best score is saved to the leaderboard'],
              ].map(([emoji, title, desc]) => (
                <div key={title} className="flex items-start gap-3">
                  <span className="text-lg shrink-0">{emoji}</span>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {user && (user.triviaHighScore ?? 0) > 0 && (
              <div className="flex items-center justify-center gap-2 mb-6 text-sm font-semibold" style={{ color: '#fbbf24' }}>
                <Trophy size={15} />
                Your best: {user.triviaHighScore ?? 0} pts
              </div>
            )}

            <button
              onClick={startGame}
              className="w-full py-3.5 rounded-2xl text-base font-bold text-white transition-all"
              style={{ background: 'linear-gradient(135deg,#fbbf24,#f97316)', boxShadow: '0 4px 20px rgba(251,191,36,0.35)' }}
            >
              Start Game
            </button>

            <GameBackButton />
          </motion.div>
        </div>
      </AppLayout>
    );
  }

  // ── Result screen ───────────────────────────────────────────────────────────
  if (phase === 'result') {
    const pct = Math.round((correctCount / TOTAL_QUESTIONS) * 100);
    const grade = pct >= 90 ? '🏆' : pct >= 70 ? '🌟' : pct >= 50 ? '👍' : '💪';
    return (
      <AppLayout title="Trivia Blitz">
        <Helmet>
          <title>Trivia Blitz — Intern Break Space</title>
          <meta name="description" content="Trivia Blitz results." />
          <link rel="canonical" href="/trivia" />
        </Helmet>
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 py-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' as const }}
            className="w-full max-w-md"
          >
            {/* Score card */}
            <div className="rounded-2xl border p-6 mb-5 text-center"
              style={{ background: 'var(--surface-card)', borderColor: 'rgba(251,191,36,0.3)' }}>
              <div className="text-5xl mb-3">{grade}</div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Final Score</p>
              <div className="text-5xl font-black mb-1" style={{ background: 'linear-gradient(135deg,#fbbf24,#f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {score}
              </div>
              <p className="text-sm text-muted-foreground">points</p>

              {isNewBest && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 flex items-center justify-center gap-2 text-sm font-bold"
                  style={{ color: '#fbbf24' }}
                >
                  <Star size={15} fill="#fbbf24" /> New Personal Best!
                </motion.div>
              )}
              {!isNewBest && prevBest > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">Best: {prevBest} pts</p>
              )}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Correct', value: `${correctCount}/${TOTAL_QUESTIONS}`, color: '#4ade80' },
                { label: 'Accuracy', value: `${pct}%`, color: '#38bdf8' },
                { label: 'Avg Speed', value: `${(avgMs / 1000).toFixed(1)}s`, color: '#1BDBDB' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl border border-border/30 p-3 text-center"
                  style={{ background: 'var(--surface-card)' }}>
                  <p className="text-lg font-black" style={{ color }}>{value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={startGame}
                className="w-full py-3 rounded-xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#fbbf24,#f97316)', boxShadow: '0 3px 14px rgba(251,191,36,0.3)' }}
              >
                <RotateCcw size={14} className="inline mr-2" />
                Play Again
              </button>
              <GameBackButton className="w-full justify-center py-3" />
            </div>
          </motion.div>
        </div>
      </AppLayout>
    );
  }

  // ── Playing / Countdown ─────────────────────────────────────────────────────
  return (
    <AppLayout title="Trivia Blitz">
      <Helmet>
        <title>Trivia Blitz — Intern Break Space</title>
        <meta name="description" content="Answer trivia questions as fast as you can." />
        <link rel="canonical" href="/trivia" />
      </Helmet>

      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-6">
        <div className="w-full max-w-lg relative">
          {/* Countdown overlay */}
          {phase === 'countdown' && (
            <CountdownOverlay onDone={() => setPhase('playing')} />
          )}

          {/* Progress bar */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex gap-1 flex-1">
              {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 flex-1 rounded-full transition-all duration-300"
                  style={{
                    background: i < qIndex
                      ? 'linear-gradient(90deg,#fbbf24,#f97316)'
                      : i === qIndex
                        ? 'rgba(251,191,36,0.4)'
                        : 'rgba(255,255,255,0.08)',
                  }}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground shrink-0 font-mono">
              {qIndex + 1}/{TOTAL_QUESTIONS}
            </span>
          </div>

          {/* Question card */}
          <AnimatePresence mode="wait">
            {currentQ && (
              <motion.div
                key={currentQ.id}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border border-border/30 p-5 mb-4"
                style={{ background: 'var(--surface-card)' }}
              >
                {/* Category + timer */}
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: `${catColor}18`, color: catColor, border: `1px solid ${catColor}33` }}
                  >
                    {currentQ.category}
                  </span>
                  <TimerRing seconds={timeLeft} total={SECONDS_PER_QUESTION} />
                </div>

                {/* Question text */}
                <p className="text-base font-semibold text-foreground leading-snug mb-5">
                  {currentQ.question}
                </p>

                {/* Answer buttons */}
                <div className="flex flex-col gap-2.5">
                  {currentQ.answers.map((ans, idx) => (
                    <AnswerBtn
                      key={idx}
                      label={['A', 'B', 'C', 'D'][idx]}
                      text={ans}
                      state={answerStates[idx] ?? 'unanswered'}
                      disabled={selected !== null || answeredRef.current}
                      onClick={() => handleAnswer(idx)}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Score + correct running tally */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 size={13} style={{ color: '#4ade80' }} />
              <span>{correctCount} correct</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#fbbf24' }}>
              <Zap size={13} />
              <span>{calcScore(correctCount, avgMs)} pts</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
