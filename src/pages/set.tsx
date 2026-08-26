import { set as setContent } from 'virtual:content';
import { Helmet } from '@dr.pogodin/react-helmet';
import { useEffect, useId, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RotateCcw, Clock, Gamepad2, Lightbulb } from 'lucide-react';
import AppLayout from '@/layouts/AppLayout'
import HowToPlayGuide from '@/components/HowToPlayGuide';
import { getUser, saveUser } from '@/lib/ibs-store';
import { getGameMetadata } from '@/lib/game-registry';
import GameBackButton from '@/components/GameBackButton';

type CardNumber = 1 | 2 | 3;
type CardColor = 'red' | 'green' | 'purple';
type CardShape = 'oval' | 'squiggle' | 'diamond';
type CardFill = 'solid' | 'striped' | 'empty';

interface SetCard {
  id: string;
  number: CardNumber;
  color: CardColor;
  shape: CardShape;
  fill: CardFill;
}

type Phase = 'intro' | 'countdown' | 'playing' | 'result';

function buildDeck(): SetCard[] {
  const deck: SetCard[] = [];
  const numbers: CardNumber[] = [1, 2, 3];
  const colors: CardColor[] = ['red', 'green', 'purple'];
  const shapes: CardShape[] = ['oval', 'squiggle', 'diamond'];
  const fills: CardFill[] = ['solid', 'striped', 'empty'];

  for (const number of numbers) {
    for (const color of colors) {
      for (const shape of shapes) {
        for (const fill of fills) {
          deck.push({
            id: `${number}-${color}-${shape}-${fill}`,
            number,
            color,
            shape,
            fill,
          });
        }
      }
    }
  }

  return deck;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];

  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }

  return a;
}

function isSet(a: SetCard, b: SetCard, c: SetCard): boolean {
  const check = (x: number, y: number, z: number) =>
    (x === y && y === z) || (x !== y && y !== z && x !== z);

  return (
    check(a.number, b.number, c.number) &&
    check(
      ['red', 'green', 'purple'].indexOf(a.color),
      ['red', 'green', 'purple'].indexOf(b.color),
      ['red', 'green', 'purple'].indexOf(c.color),
    ) &&
    check(
      ['oval', 'squiggle', 'diamond'].indexOf(a.shape),
      ['oval', 'squiggle', 'diamond'].indexOf(b.shape),
      ['oval', 'squiggle', 'diamond'].indexOf(c.shape),
    ) &&
    check(
      ['solid', 'striped', 'empty'].indexOf(a.fill),
      ['solid', 'striped', 'empty'].indexOf(b.fill),
      ['solid', 'striped', 'empty'].indexOf(c.fill),
    )
  );
}

function findAllSets(cards: SetCard[]): [number, number, number][] {
  const sets: [number, number, number][] = [];

  for (let i = 0; i < cards.length - 2; i += 1) {
    for (let j = i + 1; j < cards.length - 1; j += 1) {
      for (let k = j + 1; k < cards.length; k += 1) {
        if (isSet(cards[i], cards[j], cards[k])) {
          sets.push([i, j, k]);
        }
      }
    }
  }

  return sets;
}

function dealBoard(deck: SetCard[]): { board: SetCard[]; remaining: SetCard[] } {
  const remaining = [...deck];
  let board = remaining.splice(0, 12);

  while (findAllSets(board).length === 0 && remaining.length >= 3) {
    board = [...board, ...remaining.splice(0, 3)];
  }

  return { board, remaining };
}

const COLOR_MAP: Record<CardColor, string> = {
  red: '#ff1111',
  green: '#008000',
  purple: '#8b008b',
};

const SVG_OVAL =
  'M 18 40 Q 18 12 40 12 Q 62 12 62 40 Q 62 68 40 68 Q 18 68 18 40 Z';

const SVG_DIAMOND = 'M 40 8 L 66 40 L 40 72 L 14 40 Z';

const SVG_SQUIGGLE =
  'M 21 58 C 8 42 21 19 35 21 C 49 23 47 9 61 14 C 75 19 69 38 58 47 C 47 56 52 72 35 69 C 23 67 30 70 21 58 Z';

function getShapePath(shape: CardShape): string {
  if (shape === 'oval') return SVG_OVAL;
  if (shape === 'diamond') return SVG_DIAMOND;
  return SVG_SQUIGGLE;
}

function SymbolShape({
  shape,
  fill,
  color,
}: {
  shape: CardShape;
  fill: CardFill;
  color: CardColor;
}) {
  const reactId = useId().replace(/:/g, '');
  const c = COLOR_MAP[color];
  const patternId = `stripe-${reactId}`;
  const clipId = `clip-${reactId}`;

  return (
    <svg viewBox="0 0 80 80" width="100%" height="100%" aria-hidden="true">
      {fill === 'striped' && (
        <defs>
          <pattern id={patternId} patternUnits="userSpaceOnUse" width="7" height="7">
            <line x1="0" y1="0" x2="80" y2="0" stroke={c} strokeWidth="3" />
          </pattern>

          <clipPath id={clipId}>
            <path d={getShapePath(shape)} />
          </clipPath>
        </defs>
      )}

      {fill === 'striped' && (
        <path d={getShapePath(shape)} fill={`url(#${patternId})`} clipPath={`url(#${clipId})`} />
      )}

      <path
        d={getShapePath(shape)}
        fill={fill === 'solid' ? c : 'none'}
        stroke={c}
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CardSymbols({ card }: { card: SetCard }) {
  const symbols = Array.from({ length: card.number });

  return (
    <div className="flex h-full w-full items-center justify-center gap-3 px-6 py-4">
      {symbols.map((_, i) => (
        <div
          key={i}
          className="flex shrink-0 items-center justify-center"
          style={{
            width: card.number === 1 ? 112 : card.number === 2 ? 88 : 72,
            height: 112,
          }}
        >
          <SymbolShape shape={card.shape} fill={card.fill} color={card.color} />
        </div>
      ))}
    </div>
  );
}

function SetCardTile({
  card,
  selected,
  hinted,
  flash,
  onClick,
}: {
  card: SetCard;
  selected: boolean;
  hinted: boolean;
  flash: 'correct' | 'wrong' | null;
  onClick: () => void;
}) {
  const borderColor =
    flash === 'correct'
      ? '#16a34a'
      : flash === 'wrong'
        ? '#dc2626'
        : selected
          ? '#2563eb'
          : hinted
            ? '#f59e0b'
            : '#222222';

  const bg =
    flash === 'correct'
      ? '#ecfdf5'
      : flash === 'wrong'
        ? '#fef2f2'
        : selected
          ? '#eff6ff'
          : hinted
            ? '#fffbeb'
            : '#ffffff';

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      animate={flash === 'wrong' ? { x: [0, -7, 7, -5, 5, 0] } : {}}
      transition={{ duration: 0.35 }}
      className="flex cursor-pointer select-none items-center justify-center rounded-xl"
      style={{
        border: `2px solid ${borderColor}`,
        background: bg,
        aspectRatio: '5 / 3',
        minHeight: 128,
        boxShadow: selected
          ? `0 0 0 4px rgba(37,99,235,0.18), 0 10px 22px rgba(0,0,0,0.12)`
          : hinted
            ? `0 0 0 4px rgba(245,158,11,0.2), 0 10px 22px rgba(0,0,0,0.08)`
            : '0 2px 6px rgba(0,0,0,0.04)',
      }}
    >
      <CardSymbols card={card} />
    </motion.button>
  );
}

function CountdownOverlay({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(3);

  useEffect(() => {
    if (n <= 0) {
      const t = setTimeout(onDone, 450);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => setN((v) => v - 1), 850);
    return () => clearTimeout(t);
  }, [n, onDone]);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        <motion.span
          key={n}
          initial={{ scale: 0.55, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.35, opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="text-8xl font-black text-neutral-900"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {n === 0 ? 'GO!' : n}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function Sidebar({
  elapsed,
  setsFound,
  deckCount,
  availableSets,
  highScore,
  currentScore,
  playerName,
  phase,
}: {
  elapsed: number;
  setsFound: number;
  deckCount: number;
  availableSets: number;
  highScore: number;
  currentScore: number;
  playerName: string;
  phase: Phase;
}) {
  const displayName = playerName || 'Anonymous Fe...';

  return (
    <aside className="w-full rounded-xl border border-neutral-200 bg-white p-5 shadow-md lg:w-[380px]">
      <div className="flex items-center justify-center gap-5 py-3">
        <Clock size={44} className="text-red-600" strokeWidth={2.2} />
        <div className="font-mono text-6xl leading-none tracking-tight text-neutral-900">
          {formatTime(elapsed)}
        </div>
      </div>

      <div className="my-5 h-px bg-neutral-200" />

      <h2 className="mb-5 text-center text-2xl font-light text-neutral-800">Scoreboard</h2>

      <div className="space-y-3">
        <div className="grid grid-cols-[42px_96px_1fr_40px] items-center gap-3 text-sm">
          <div className="flex items-center justify-center text-neutral-500">
            <Gamepad2 size={28} />
          </div>

          <div className="rounded-md bg-blue-500 px-2 py-1 text-center text-2xl leading-none text-white">
            {highScore || 1200}
          </div>

          <div className="truncate text-xl font-semibold text-red-700">
            {displayName}
          </div>

          <div className="text-right text-xl font-bold text-neutral-800">
            {phase === 'playing' ? currentScore : setsFound}
          </div>
        </div>

        <div className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">
          <div className="flex justify-between">
            <span>Sets found</span>
            <span className="font-bold text-neutral-900">{setsFound}</span>
          </div>

          <div className="mt-1 flex justify-between">
            <span>Available sets</span>
            <span className="font-bold text-neutral-900">{availableSets}</span>
          </div>

          <div className="mt-1 flex justify-between">
            <span>Deck remaining</span>
            <span className="font-bold text-neutral-900">{deckCount}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function SetPage() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [deck, setDeck] = useState<SetCard[]>([]);
  const [board, setBoard] = useState<SetCard[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [flash, setFlash] = useState<{ indices: number[]; type: 'correct' | 'wrong' } | null>(
    null,
  );
  const [setsFound, setSetsFound] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [hint, setHint] = useState<number[] | null>(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [playerName, setPlayerName] = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  useEffect(() => {
    const user = getUser();

    if (user) {
      setHighScore((user as { setHighScore?: number }).setHighScore ?? 0);
      setPlayerName(user.name || 'Anonymous Fe...');
    }
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  function initGame() {
    const d = shuffle(buildDeck());
    const { board: b, remaining } = dealBoard(d);

    setDeck(remaining);
    setBoard(b);
    setSelected([]);
    setFlash(null);
    setSetsFound(0);
    setElapsed(0);
    setFinalScore(0);
    setHint(null);
    setHintUsed(false);
  }

  function handleStart() {
    initGame();
    setPhase('countdown');
  }

  function handleCountdownDone() {
    setPhase('playing');
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 500);
  }

  function endGame(sets: number) {
    stopTimer();

    const finalElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setElapsed(finalElapsed);

    const timeBonus = Math.max(0, Math.round(300 - finalElapsed));
    const score = sets * 100 + timeBonus;

    setFinalScore(score);

    const user = getUser();

    if (user) {
      const prev = (user as { setHighScore?: number }).setHighScore ?? 0;

      if (score > prev) {
        (user as { setHighScore?: number }).setHighScore = score;
        saveUser(user);
        setHighScore(score);
      }
    }

    setPhase('result');
  }

  function handleCardClick(idx: number) {
    if (flash || phase !== 'playing') return;

    if (hint) setHint(null);

    setSelected((prev) => {
      if (prev.includes(idx)) return prev.filter((i) => i !== idx);

      const next = [...prev, idx];

      if (next.length === 3) {
        const [a, b, c] = next.map((i) => board[i]);

        if (isSet(a, b, c)) {
          const newSetsFound = setsFound + 1;

          setFlash({ indices: next, type: 'correct' });

          setTimeout(() => {
            setFlash(null);
            setSelected([]);

            setBoard((prevBoard) => {
              const newBoard = [...prevBoard];
              const sorted = [...next].sort((x, y) => y - x);
              const newDeck = [...deck];

              for (const i of sorted) {
                if (newDeck.length > 0) {
                  newBoard[i] = newDeck.shift()!;
                } else {
                  newBoard.splice(i, 1);
                }
              }

              while (findAllSets(newBoard).length === 0 && newDeck.length >= 3) {
                newBoard.push(...newDeck.splice(0, 3));
              }

              setDeck(newDeck);

              if (findAllSets(newBoard).length === 0 && newDeck.length === 0) {
                endGame(newSetsFound);
              }

              return newBoard;
            });

            setSetsFound(newSetsFound);
          }, 600);
        } else {
          setFlash({ indices: next, type: 'wrong' });
          setTimeout(() => {
            setFlash(null);
            setSelected([]);
          }, 700);
        }

        return next;
      }

      return next;
    });
  }

  function handleHint() {
    const sets = findAllSets(board);

    if (sets.length > 0) {
      setHint(sets[0]);
      setHintUsed(true);
    }
  }

  const availableSets = phase === 'playing' ? findAllSets(board).length : 0;
  const currentScore = setsFound * 100 + Math.max(0, 300 - elapsed);

  const game = getGameMetadata('set');

  return (
    <AppLayout title={game.name}>
      <Helmet>
        <title>{game.name} — Intern Break Space</title>
        <meta name="description" content={game.description} />
        <link rel="canonical" href="/set" />
      </Helmet>

      <main className="min-h-screen bg-neutral-50 px-4 py-5 text-neutral-900">
        <div className="mx-auto max-w-[1320px]">
          <div className="mb-4 flex items-center gap-3">
            <GameBackButton />

            <span className="text-neutral-300">/</span>
            <span className="text-xs font-semibold text-neutral-800">{setContent.title}</span>
          </div>

          {phase === 'intro' && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid min-h-[72vh] gap-6 lg:grid-cols-[1fr_380px]"
            >
              <section className="rounded-xl border border-neutral-200 bg-white p-8 shadow-md">
                <div className="mx-auto flex max-w-3xl flex-col items-center justify-center text-center">
                  <div className="mb-5 text-7xl">🃠</div>

                  <h1
                    className="mb-2 text-5xl font-black text-neutral-900"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {setContent.title}
                  </h1>

                  <p className="max-w-xl text-sm text-neutral-500">{setContent.subtitle}</p>

                  <HowToPlayGuide
                    className="mt-8 w-full text-left"
                    title={setContent.howToPlay.heading}
                    steps={setContent.howToPlay.rules.map((rule, i) => ({
                      title: rule.attr,
                      body: rule.desc,
                      icon: (['number', 'color', 'shape', 'fill'] as const)[i] ?? 'trophy',
                    }))}
                  />

                  <motion.button
                    whileHover={{ scale: 1.035 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleStart}
                    className="mt-8 rounded-xl bg-neutral-900 px-10 py-3 text-base font-bold text-white shadow-lg transition-colors hover:bg-neutral-800"
                  >
                    {setContent.buttons.start}
                  </motion.button>
                </div>
              </section>

              <Sidebar
                elapsed={0}
                setsFound={0}
                deckCount={81}
                availableSets={0}
                highScore={highScore}
                currentScore={0}
                playerName={playerName}
                phase={phase}
              />
            </motion.div>
          )}

          {phase === 'countdown' && (
            <div className="relative min-h-[72vh] rounded-xl border border-neutral-200 bg-white shadow-md">
              <CountdownOverlay onDone={handleCountdownDone} />
            </div>
          )}

          {phase === 'playing' && (
            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-md">
                <div className="grid grid-cols-3 gap-5">
                  {board.map((card, idx) => (
                    <SetCardTile
                      key={card.id + idx}
                      card={card}
                      selected={selected.includes(idx)}
                      hinted={Boolean(hint?.includes(idx))}
                      flash={flash?.indices.includes(idx) ? flash.type : null}
                      onClick={() => handleCardClick(idx)}
                    />
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1">
                  <div className="text-center text-xl text-neutral-800">
                    <span className="font-black">{deck.length}</span>{' '}
                    <span>cards remaining in the deck</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleHint}
                      disabled={hintUsed}
                      className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Lightbulb size={14} />
                      {hintUsed ? setContent.buttons.hintUsed : setContent.buttons.hint}
                    </button>

                    <button
                      onClick={() => {
                        stopTimer();
                        setPhase('intro');
                      }}
                      className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-50"
                    >
                      {setContent.buttons.quit}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {hint && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-3 rounded-lg bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-700"
                    >
                      Hint: cards {hint.map((i) => i + 1).join(', ')} form a set
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              <Sidebar
                elapsed={elapsed}
                setsFound={setsFound}
                deckCount={deck.length}
                availableSets={availableSets}
                highScore={highScore}
                currentScore={currentScore}
                playerName={playerName}
                phase={phase}
              />
            </div>
          )}

          {phase === 'result' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid min-h-[72vh] gap-6 lg:grid-cols-[1fr_380px]"
            >
              <section className="flex items-center justify-center rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-md">
                <div className="w-full max-w-lg">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}
                    className="mb-5 text-7xl"
                  >
                    {setsFound >= 10 ? '🏆' : setsFound >= 6 ? '🎉' : '🃠'}
                  </motion.div>

                  <h2
                    className="mb-1 text-4xl font-black text-neutral-900"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {setContent.status.gameOver}
                  </h2>

                  <p className="mb-6 text-sm text-neutral-500">{setContent.status.noMoreSets}</p>

                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                    {[
                      {
                        label: setContent.score.setsFound,
                        value: `${setsFound} × 100`,
                        pts: setsFound * 100,
                        color: '#2563eb',
                      },
                      {
                        label: setContent.score.timeBonus,
                        value: formatTime(elapsed),
                        pts: Math.max(0, 300 - elapsed),
                        color: '#dc2626',
                      },
                    ].map(({ label, value, pts, color }) => (
                      <div key={label} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-neutral-500">{label}</span>
                        <span className="mx-2 text-xs text-neutral-400">{value}</span>
                        <span className="font-bold" style={{ color }}>
                          {pts >= 0 ? '+' : ''}
                          {pts}
                        </span>
                      </div>
                    ))}

                    <div className="mt-2 flex items-center justify-between border-t border-neutral-200 pt-4">
                      <span className="font-bold text-neutral-900">{setContent.score.total}</span>
                      <span className="text-2xl font-black text-neutral-900">
                        {finalScore.toLocaleString()}
                      </span>
                    </div>

                    {finalScore >= highScore && finalScore > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-amber-600"
                      >
                        <Trophy size={12} />
                        {setContent.status.newBest}
                      </motion.div>
                    )}
                  </div>

                  <div className="mt-6 flex justify-center gap-3">
                    <motion.button
                      whileHover={{ scale: 1.035 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleStart}
                      className="flex items-center gap-2 rounded-xl bg-neutral-900 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-neutral-800"
                    >
                      <RotateCcw size={14} />
                      {setContent.buttons.playAgain}
                    </motion.button>

                    <GameBackButton />
                  </div>
                </div>
              </section>

              <Sidebar
                elapsed={elapsed}
                setsFound={setsFound}
                deckCount={deck.length}
                availableSets={0}
                highScore={Math.max(highScore, finalScore)}
                currentScore={finalScore}
                playerName={playerName}
                phase={phase}
              />
            </motion.div>
          )}
        </div>
      </main>
    </AppLayout>
  );
}