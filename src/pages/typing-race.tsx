import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import {
  Clock,
  Gauge,
  Paintbrush,
  RotateCcw,
  Trophy,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';
import AppLayout from '@/layouts/AppLayout';
import { getGameMetadata } from '@/lib/game-registry';
import { getUser, type IBSUser } from '@/lib/ibs-store';
import { useSession } from '@/lib/auth/auth-client';
import GameBackButton from '@/components/GameBackButton';

const PASSAGES = [
  'Great teams make room for focused work thoughtful questions and small wins that build momentum every day. When everyone understands the goal and feels comfortable sharing ideas, progress becomes easier to see and easier to celebrate. A productive break can help reset your attention, strengthen team energy, and make the next challenge feel much more manageable.',
  'A clear plan helps people move quickly, share ideas openly, and celebrate progress together. Strong teammates do not need every answer before they begin. They ask useful questions, test small ideas, listen carefully, and improve the work one step at a time. The best projects often grow from steady communication and a willingness to learn from each other.',
  'The best break can reset your energy, spark a new idea, and make the next task feel possible. Even a few minutes away from a difficult problem can give your brain enough space to connect ideas in a new way. When you return with fresh focus, the work that felt stuck before can suddenly become much easier to approach.',
  'Curiosity turns ordinary moments into useful lessons, especially when teammates learn from one another. Every conversation, question, mistake, and small discovery can become part of a larger understanding. In a fast moving workplace, the people who keep learning are often the people who help the team adapt, improve, and succeed together.',
  'Internships are full of new tools, unfamiliar meetings, unexpected questions, and chances to grow faster than you expected. The goal is not to know everything on the first day. The goal is to stay curious, communicate clearly, take notes, ask thoughtful questions, and build confidence through consistent practice and reflection.',
  'A good racing mindset is useful far beyond the track. You watch the road ahead, react to what changes, keep your hands steady, and avoid panicking when another racer pulls ahead. Work can feel the same way. Focus on your lane, keep moving, and trust that small improvements repeated every day can create impressive results.',
  'Typing quickly is helpful, but typing with rhythm, accuracy, and patience is even better. A racer who rushes without control often makes mistakes that slow everything down. The same lesson applies to projects. Moving fast matters, but moving fast with care, intention, and attention to detail is what helps great work cross the finish line.',
  'Every strong team needs moments of focus and moments of fun. A quick game, a shared laugh, or a friendly challenge can make people feel more connected. When people feel connected, they communicate better, support each other more naturally, and bring more energy back into the work that matters most.',
  'Every race begins with a little uncertainty. You do not know exactly how fast the other drivers will move, when you might make a mistake, or where the hardest stretch will appear. The best strategy is to stay calm, keep your rhythm, and recover quickly when something goes wrong. A steady racer can still win even after a slow start.',
  'Great work is often built through repetition. You try something, notice what feels awkward, adjust your approach, and try again with a little more confidence. That process might not feel dramatic in the moment, but it adds up. Over time, small improvements become habits, and habits become skills that help you move faster with less stress.',
  'A good teammate notices when someone is stuck and offers help before being asked. Small check-ins, a shared resource, or a five minute pair session can save hours of frustration later. Support does not need to be dramatic to matter. Consistent, quiet reliability is often what keeps a team moving forward during a busy week.',
  'Fast fingers matter less than a steady mind. The racers who stay calm after a mistake recover their rhythm quickly, while the ones who panic often make the next word wrong too. Treat every stumble as data, not a disaster, and let your next keystroke be the correction rather than the second mistake.',
  'Momentum is built in small pieces. One finished task leads to the confidence for the next one, and that confidence compounds over a shift, a sprint, or an internship. Do not wait to feel fully ready before starting. Starting is usually what creates the readiness everyone is waiting to feel.',
  'A well organized inbox and a clear task list can feel like a small thing, but they remove friction from every decision that follows. When the boring parts of work are handled, there is more energy left for the interesting parts. Systems are not the opposite of creativity, they are what protects it.',
  'The fastest lap is rarely the one with the most aggressive start. Racers who pace themselves through the middle stretch tend to have more control when it counts near the finish line. The same is true of long projects, where an even, sustainable pace usually beats a burst of unsustainable speed.',
  'Good feedback is specific, timely, and kind at the same time. Vague praise does not help anyone improve, and harsh criticism without context just creates defensiveness. The best teammates learn to say exactly what worked, exactly what did not, and exactly what to try differently next time.',
  'Every intern eventually hits a stretch where nothing seems to work on the first try. That stretch is not a sign of falling behind, it is the normal shape of learning something new. The people who push through that stretch calmly are usually the ones who look confident again a few weeks later.',
  'A short walk between tasks does more than stretch your legs. It gives your brain a chance to file away what you just finished and arrive fresh for what comes next. Treat breaks as part of the work, not as time stolen from it, and the whole day tends to run smoother.',
  'Great drivers watch more than just the car directly in front of them. They track the whole field, anticipate openings, and adjust early instead of reacting late. Paying attention to the bigger picture, not just the task right in front of you, is what turns good contributors into great ones.',
  'Clear communication saves more time than almost any other habit at work. A short message that answers the obvious follow up question before it is asked keeps projects moving without extra back and forth. Say the useful thing once, clearly, and everyone downstream moves a little bit faster.',
];

const DEMO_RACERS = [
  { name: 'Jordyn', color: '#38bdf8', accent: '#bae6fd', trim: '#075985', model: 'sport' },
  { name: 'Maya', color: '#fb7185', accent: '#ffe4e6', trim: '#9f1239', model: 'muscle' },
  { name: 'Chris', color: '#a78bfa', accent: '#ede9fe', trim: '#5b21b6', model: 'formula' },
  { name: 'Avery', color: '#facc15', accent: '#fef9c3', trim: '#854d0e', model: 'buggy' },
  { name: 'Sam', color: '#4ade80', accent: '#dcfce7', trim: '#166534', model: 'sport' },
];

const CAR_MODELS = [
  {
    id: 'sport',
    name: 'Sport',
    description: 'Balanced speed racer',
  },
  {
    id: 'formula',
    name: 'Formula',
    description: 'Long nose open-wheel racer',
  },
  {
    id: 'muscle',
    name: 'Muscle',
    description: 'Wide body street car',
  },
  {
    id: 'buggy',
    name: 'Buggy',
    description: 'Compact off-road build',
  },
] as const;

type WordFeedback = 'correct' | 'wrong';
type Screen = 'garage' | 'race';
type CarModel = (typeof CAR_MODELS)[number]['id'];

type CustomCar = {
  model: CarModel;
  color: string;
  accent: string;
  trim: string;
};

type DisplayRacer = {
  name: string;
  color: string;
  accent: string;
  trim: string;
  model: CarModel;
  isUser: boolean;
};

type LiveRace = { id: string; roomCode: string; passage: string; status: string; startsAt: string | null };
type LiveParticipant = { accountId: string; displayName: string; color: string; progress: number; ready: boolean; accuracy: number; wpm: number; finishedAt: string | null };

function getNextPassage(currentPassage: string) {
  const availablePassages = PASSAGES.filter((item) => item !== currentPassage);
  return availablePassages[Math.floor(Math.random() * availablePassages.length)];
}

function carStyle(positionPercent: number) {
  const safePosition = Math.min(Math.max(positionPercent, 4), 76);
  return {
    left: `${safePosition}%`,
  };
}

function calculateCompletedWords(value: string) {
  const typedWords = value.trim().length ? value.trim().split(/\s+/) : [];
  return value.endsWith(' ')
    ? typedWords.length
    : Math.max(typedWords.length - 1, 0);
}

function getTypedWords(value: string) {
  return value.trim().length ? value.trim().split(/\s+/) : [];
}

function formatRaceTime(seconds: number) {
  if (!seconds || seconds <= 0) return '—';
  return `${seconds.toFixed(2)}s`;
}

function calculateWpm(wordsTyped: number, seconds: number) {
  if (!seconds || seconds <= 0) return 0;
  return Math.round((wordsTyped / seconds) * 60);
}

function getOrdinalRank(position: number) {
  const mod100 = position % 100;
  const mod10 = position % 10;
  if (mod100 >= 11 && mod100 <= 13) return `${position}th`;
  if (mod10 === 1) return `${position}st`;
  if (mod10 === 2) return `${position}nd`;
  if (mod10 === 3) return `${position}rd`;
  return `${position}th`;
}

function makeOpponentTime(index: number) {
  return 28 + index * 4 + Math.random() * 12;
}

function getFinishReveal(rawProgress: number) {
  if (rawProgress < 88) return 0;
  return Math.min(1, (rawProgress - 88) / 12);
}

function getUserCarPosition(
  rawProgress: number,
  raceElapsed: number,
  isRaceActive: boolean,
  finished: boolean,
) {
  // Cars idle past the finish line instead of freezing dead still — a small,
  // continuous engine-idle wobble so every car on the grid always looks
  // "alive," even the ones already done.
  if (finished) return 72 + Math.sin(raceElapsed * 3) * 0.7;

  const normalized = Math.min(Math.max(rawProgress / 100, 0), 1);
  const endPhase = rawProgress >= 88 ? (rawProgress - 88) / 12 : 0;
  const cruisePosition = 9 + Math.min(10, Math.pow(normalized, 0.4) * 10);
  const finishPush = Math.min(1, endPhase) * 52;
  const smallMotion = isRaceActive ? Math.sin(raceElapsed * 9) * 1.1 : 0;

  return cruisePosition + finishPush + smallMotion;
}

function getOpponentCarPosition(
  targetTime: number,
  raceElapsed: number,
  startedAt: number | null,
  index: number,
) {
  if (!startedAt) return 8 + index * 2;

  const progress = Math.min(1, raceElapsed / targetTime);

  if (progress < 0.88) {
    return 9 + progress * 14 + Math.sin(raceElapsed * 6 + index) * 0.8;
  }

  if (progress < 1) {
    return 23 + ((progress - 0.88) / 0.12) * 49;
  }

  // Idle wobble at the finish once done, same as the user's own car.
  return 72 + Math.sin(raceElapsed * 3 + index) * 0.7;
}

function hexToRgb(hex: string) {
  const cleanHex = hex.replace('#', '');
  const value = parseInt(cleanHex, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const safeR = Math.min(255, Math.max(0, r));
  const safeG = Math.min(255, Math.max(0, g));
  const safeB = Math.min(255, Math.max(0, b));

  return `#${[safeR, safeG, safeB]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
}

function FancyRaceCar({
  color,
  accent,
  trim,
  active,
  rank,
  model,
  preview = false,
}: {
  color: string;
  accent: string;
  trim: string;
  active: boolean;
  rank: number;
  model: CarModel;
  preview?: boolean;
}) {
  const rawId = useId().replace(/:/g, '');
  const bodyGradientId = `body-${rawId}`;
  const glassGradientId = `glass-${rawId}`;
  const glowId = `glow-${rawId}`;

  const isFormula = model === 'formula';
  const isMuscle = model === 'muscle';
  const isBuggy = model === 'buggy';

  const bodyPath = isFormula
    ? 'M20 26 C28 8 66 8 84 26 C66 44 28 44 20 26 Z'
    : isMuscle
      ? 'M15 15 C24 8 78 8 92 17 L96 26 L92 35 C78 44 24 44 15 37 L10 26 Z'
      : isBuggy
        ? 'M24 13 L78 13 C88 13 94 19 94 26 C94 33 88 39 78 39 L24 39 C14 39 8 33 8 26 C8 19 14 13 24 13 Z'
        : 'M14 26 C21 11 76 8 94 26 C76 44 21 41 14 26 Z';

  const cockpitX = isFormula ? 43 : isMuscle ? 48 : isBuggy ? 42 : 45;
  const cockpitWidth = isFormula ? 18 : isMuscle ? 24 : isBuggy ? 20 : 22;

  return (
    <div className="relative h-[52px] w-[118px]">
      {active && !preview && (
        <>
          <div className="absolute -left-9 top-[21px] h-3 w-11 rounded-full bg-orange-500 opacity-80 blur-md" />
          <div className="absolute -left-5 top-[22px] h-2.5 w-7 rounded-full bg-yellow-200 opacity-95 blur-[1px]" />
          <div className="absolute -left-3 top-[24px] h-1.5 w-4 rounded-full bg-white opacity-90" />
        </>
      )}

      <div className="absolute left-6 top-[39px] h-3 w-[82px] rounded-full bg-black/45 blur-md" />

      <svg
        viewBox="0 0 110 52"
        className="absolute inset-0 h-[52px] w-[118px] drop-shadow-[0_0_12px_rgba(255,255,255,0.12)]"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={bodyGradientId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={trim} />
            <stop offset="28%" stopColor={color} />
            <stop offset="68%" stopColor={color} />
            <stop offset="100%" stopColor={accent} />
          </linearGradient>

          <linearGradient id={glassGradientId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#dffaff" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#38bdf8" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.9" />
          </linearGradient>

          <filter id={glowId}>
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x="16" y="5" width="16" height="8" rx="4" fill="#050505" />
        <rect x="16" y="39" width="16" height="8" rx="4" fill="#050505" />
        <rect x="76" y="5" width="16" height="8" rx="4" fill="#050505" />
        <rect x="76" y="39" width="16" height="8" rx="4" fill="#050505" />

        <rect x="19" y="7" width="10" height="2" rx="1" fill="rgba(255,255,255,0.35)" />
        <rect x="19" y="43" width="10" height="2" rx="1" fill="rgba(255,255,255,0.35)" />
        <rect x="79" y="7" width="10" height="2" rx="1" fill="rgba(255,255,255,0.35)" />
        <rect x="79" y="43" width="10" height="2" rx="1" fill="rgba(255,255,255,0.35)" />

        {isBuggy && (
          <>
            <rect x="6" y="3" width="18" height="10" rx="5" fill="#050505" />
            <rect x="6" y="39" width="18" height="10" rx="5" fill="#050505" />
            <rect x="88" y="3" width="18" height="10" rx="5" fill="#050505" />
            <rect x="88" y="39" width="18" height="10" rx="5" fill="#050505" />
          </>
        )}

        <rect
          x={isFormula ? 8 : 6}
          y={isFormula ? 16 : 15}
          width={isFormula ? 9 : 8}
          height={isFormula ? 20 : 22}
          rx="2"
          fill={trim}
          stroke="rgba(255,255,255,0.35)"
        />

        {isFormula && (
          <>
            <rect
              x="91"
              y="8"
              width="11"
              height="36"
              rx="3"
              fill={trim}
              stroke="rgba(255,255,255,0.35)"
            />
            <rect x="96" y="22" width="10" height="8" rx="4" fill={accent} />
          </>
        )}

        <path
          d={bodyPath}
          fill={`url(#${bodyGradientId})`}
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1.25"
          filter={`url(#${glowId})`}
        />

        <path
          d={
            isFormula
              ? 'M76 20 L101 26 L76 32 Z'
              : 'M78 17 C92 18 101 22 104 26 C101 30 92 34 78 35 Z'
          }
          fill={accent}
          opacity="0.9"
          stroke="rgba(255,255,255,0.35)"
        />

        <path
          d={isFormula ? 'M22 24 L91 24 L96 26 L91 28 L22 28 Z' : 'M20 23 L88 23 L94 26 L88 29 L20 29 Z'}
          fill="rgba(255,255,255,0.62)"
        />

        <path
          d={isFormula ? 'M22 25 L89 25 L93 26 L89 27 L22 27 Z' : 'M22 24.5 L85 24.5 L89 26 L85 27.5 L22 27.5 Z'}
          fill={trim}
          opacity="0.7"
        />

        <rect
          x={cockpitX}
          y="15"
          width={cockpitWidth}
          height="22"
          rx="6"
          fill={`url(#${glassGradientId})`}
          stroke="rgba(255,255,255,0.55)"
        />

        <rect
          x={cockpitX + 3}
          y="18"
          width={cockpitWidth - 6}
          height="5"
          rx="2"
          fill="rgba(255,255,255,0.75)"
        />

        <rect
          x={cockpitX + 3}
          y="29"
          width={cockpitWidth - 6}
          height="5"
          rx="2"
          fill="rgba(15,23,42,0.55)"
        />

        <circle cx="98" cy="21" r="2.3" fill="#fef9c3" />
        <circle cx="98" cy="31" r="2.3" fill="#fef9c3" />
        <circle cx="16" cy="20" r="2.2" fill="#ef4444" />
        <circle cx="16" cy="32" r="2.2" fill="#ef4444" />

        {!isFormula && (
          <>
            <circle cx="34" cy="26" r="7" fill="rgba(255,255,255,0.9)" />
            <text
              x="34"
              y="29.5"
              textAnchor="middle"
              fontSize="9"
              fontWeight="900"
              fill="#0f172a"
            >
              {rank}
            </text>
          </>
        )}

        {isFormula && (
          <text
            x="35"
            y="29"
            textAnchor="middle"
            fontSize="10"
            fontWeight="900"
            fill="white"
          >
            {rank}
          </text>
        )}

        <path
          d="M29 14 C39 11 59 11 73 16"
          stroke="rgba(255,255,255,0.42)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />

        {isMuscle && (
          <>
            <rect x="70" y="18" width="5" height="3" rx="1" fill="rgba(0,0,0,0.35)" />
            <rect x="70" y="31" width="5" height="3" rx="1" fill="rgba(0,0,0,0.35)" />
            <rect x="78" y="18" width="5" height="3" rx="1" fill="rgba(0,0,0,0.35)" />
            <rect x="78" y="31" width="5" height="3" rx="1" fill="rgba(0,0,0,0.35)" />
          </>
        )}

        {isBuggy && (
          <>
            <path d="M33 13 L48 38" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
            <path d="M76 13 L61 38" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
          </>
        )}
      </svg>
    </div>
  );
}

function ColorEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const rgb = hexToRgb(value);

  function updateRgb(channel: 'r' | 'g' | 'b', nextValue: string) {
    const numericValue = Number(nextValue);

    const nextRgb = {
      ...rgb,
      [channel]: Number.isNaN(numericValue) ? 0 : numericValue,
    };

    onChange(rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b));
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-white">{label}</p>
          <p className="font-mono text-xs uppercase text-white/45">{value}</p>
        </div>

        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-14 cursor-pointer rounded-lg border border-white/20 bg-transparent p-1"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(['r', 'g', 'b'] as const).map((channel) => (
          <label key={channel} className="block">
            <span className="mb-1 block text-[10px] font-black uppercase text-white/40">
              {channel}
            </span>

            <input
              type="number"
              min={0}
              max={255}
              value={rgb[channel]}
              onChange={(event) => updateRgb(channel, event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-2 text-sm font-bold text-white outline-none focus:border-blue-400"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

export default function TypingRacePage() {
  const { user: account } = useSession();

  const [screen, setScreen] = useState<Screen>('garage');
  const [user, setUser] = useState<IBSUser | null>(null);

  const [customCar, setCustomCar] = useState<CustomCar>({
    model: 'sport',
    color: '#14b8a6',
    accent: '#67e8f9',
    trim: '#0f766e',
  });

  const [passage, setPassage] = useState(
    () => PASSAGES[Math.floor(Math.random() * PASSAGES.length)],
  );

  const [typed, setTyped] = useState('');
  const [nitro, setNitro] = useState(3);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [wordFeedback, setWordFeedback] = useState<Record<number, WordFeedback>>({});
  const [raceElapsed, setRaceElapsed] = useState(0);
  const [userFinishTime, setUserFinishTime] = useState<number | null>(null);
  const [opponentTargetTimes, setOpponentTargetTimes] = useState<Record<string, number>>({});
  const [showingLeaderboard, setShowingLeaderboard] = useState(false);
  const [liveRace, setLiveRace] = useState<LiveRace | null>(null);
  const [liveParticipants, setLiveParticipants] = useState<LiveParticipant[]>([]);
  const [liveStatus, setLiveStatus] = useState('');
  const [isSubmittingRace, setIsSubmittingRace] = useState(false);
  const liveRaceIdRef = useRef<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const passageBoxRef = useRef<HTMLDivElement>(null);
  const currentWordRef = useRef<HTMLSpanElement | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const feedbackTimersRef = useRef<Record<number, number>>({});
  // Throttle live progress pushes to at most once every 300ms to avoid
  // flooding the DB with a request on every single keystroke.
  const lastProgressPushRef = useRef<number>(0);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) return;

    setUser(currentUser);

  }, []);

  useEffect(() => {
    if (!user?.roomCode || screen !== 'race') return undefined;
    let active = true;
    const refreshLiveRace = async () => {
      try {
        const response = await fetch(`/api/races?roomCode=${encodeURIComponent(user.roomCode ?? "")}`, { credentials: 'include', cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json() as { race: LiveRace | null; participants: LiveParticipant[] };
        if (!active) return;
        setLiveRace(data.race);
        setLiveParticipants(data.participants);
        if (data.race && data.race.id !== liveRaceIdRef.current) {
          liveRaceIdRef.current = data.race.id;
          setPassage(data.race.passage);
          setTyped('');
          setFinished(false);
          setShowingLeaderboard(false);
          setStartedAt(null);
          setCountdown(null);
          setRaceElapsed(0);
          setUserFinishTime(null);
        }
        if (!data.race) {
          liveRaceIdRef.current = null;
          setLiveStatus('Waiting for a room race to start.');
          return;
        }
        const readyCount = data.participants.filter((p) => p.ready && p.progress !== -1).length;
        const activeCount = data.participants.filter((p) => p.progress !== -1).length;
        setLiveStatus(
          data.race.status === 'lobby'
            ? `${activeCount} racer${activeCount !== 1 ? 's' : ''} in lobby — ${readyCount}/${activeCount} ready.`
            : data.race.status === 'countdown'
              ? 'Everyone is ready. Race starting!'
              : `Race underway — ${data.participants.filter((p) => p.progress !== -1 && !p.finishedAt).length} still racing.`,
        );
      } catch { /* keep the last live state while reconnecting */ }
    };
    void refreshLiveRace();
    const interval = window.setInterval(refreshLiveRace, 1000);
    return () => { active = false; window.clearInterval(interval); };
  }, [screen, user?.roomCode]);

  useEffect(() => {
    const joinedLiveRace = liveParticipants.some((participant) => participant.accountId === account?.id);
    if (!liveRace?.startsAt || !['countdown', 'active'].includes(liveRace.status) || !joinedLiveRace || startedAt || finished) return;
    const startTime = new Date(liveRace.startsAt).getTime();
    const delay = startTime - Date.now();
    if (delay <= 0) {
      setCountdown(null);
      setStartedAt(startTime);
      setRaceElapsed(Math.max(0, (Date.now() - startTime) / 1000));
      window.setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }
    setCountdown(Math.max(1, Math.ceil(delay / 1000)));
    const timer = window.setInterval(() => {
      const remaining = Math.ceil((startTime - Date.now()) / 1000);
      if (remaining <= 0) {
        window.clearInterval(timer);
        setCountdown(null);
        setStartedAt(startTime);
        setRaceElapsed(0);
        window.setTimeout(() => inputRef.current?.focus(), 50);
      } else setCountdown(remaining);
    }, 250);
    return () => window.clearInterval(timer);
  }, [account?.id, finished, liveParticipants, liveRace?.id, liveRace?.startsAt, liveRace?.status, startedAt]);

  const words = useMemo(() => passage.split(/\s+/), [passage]);

  const completedWords = calculateCompletedWords(typed);

  // Recompute incorrect words from scratch based on already-completed words only.
  // This means backspacing and retyping a word correctly removes it from the count.
  const currentIncorrectWords = useMemo(() => {
    const typedWords = getTypedWords(typed);
    let count = 0;
    for (let i = 0; i < completedWords; i++) {
      if (typedWords[i] !== undefined && typedWords[i] !== words[i]) count++;
    }
    return count;
  }, [typed, completedWords, words]);

  const correctWords = Math.max(0, completedWords - currentIncorrectWords);
  const accuracy = completedWords ? Math.round((correctWords / completedWords) * 100) : 100;
  // accuracyMultiplier is kept for display-only use (accuracy badge) — NOT applied to WPM
  const charProgress = Math.min(100, Math.round((correctWords / words.length) * 100));
  const wordsLeft = Math.max(0, words.length - completedWords);

  const finishReveal = getFinishReveal(charProgress);
  const finishLeftPosition = 104 - finishReveal * 32;

  const typedVelocityBoost = typed.length * 34;
  const timeVelocityBoost = startedAt ? raceElapsed * 360 : 0;
  const trackOffset = startedAt ? timeVelocityBoost + typedVelocityBoost : 0;

  // Live races render only authenticated people who explicitly joined this grid.
  // DNF participants (progress === -1) are excluded from the track but shown in leaderboard.
  // Demo cars remain available only before a room race exists.
  const activeLiveParticipants = liveParticipants.filter((p) => p.progress !== -1);
  const isJoinedLiveRace = liveParticipants.some((participant) => participant.accountId === account?.id);
  const racers = liveRace
    ? activeLiveParticipants.map((participant) => ({ id: participant.accountId, name: participant.displayName, color: participant.color, role: 'employee' as const, points: 0, allTimePoints: 0, gameHighScore: 0, flappyRunsToday: 0, flappyRunDate: '', flappyOfficialScore: 0, typingHighScore: 0, triviaHighScore: 0 }))
    : user ? [{ ...user }] : [];

  const visibleRacers: DisplayRacer[] = useMemo(() => {
    if (racers.length) {
      return racers.slice(0, 5).map((racer, index) => {
        const demoStyle = DEMO_RACERS[index % DEMO_RACERS.length];
        const isCurrentUser = racer.id === account?.id || (!liveRace && racer.name === user?.name);

        return {
          name: racer.name,
          color: isCurrentUser ? customCar.color : racer.color || demoStyle.color,
          accent: isCurrentUser ? customCar.accent : demoStyle.accent,
          trim: isCurrentUser ? customCar.trim : demoStyle.trim,
          model: isCurrentUser ? customCar.model : (demoStyle.model as CarModel),
          isUser: isCurrentUser,
        };
      });
    }

    return [
      {
        name: user?.name ?? 'You',
        color: customCar.color,
        accent: customCar.accent,
        trim: customCar.trim,
        model: customCar.model,
        isUser: true,
      },
      ...DEMO_RACERS.slice(0, 4).map((racer) => ({
        name: racer.name,
        color: racer.color,
        accent: racer.accent,
        trim: racer.trim,
        model: racer.model as CarModel,
        isUser: false,
      })),
    ];
  }, [account, customCar, activeLiveParticipants, racers, user?.name]);

  // Bug 3 fix: header count always matches the actual rendered racer list length.
  // Demo bots only appear when there is no live room race AND the user object is loaded.
  const usingDemoBots = !liveRace && racers.length === 0 && user !== null;
  const displayedRacerCount = visibleRacers.length;
  const isCountdownRunning = countdown !== null;
  const isRaceActive = Boolean(startedAt) && !finished && !isCountdownRunning && !showingLeaderboard;
  const canGoGarage = !isRaceActive && !isCountdownRunning;
  const lobbyIsFull = Boolean(liveRace && liveRace.status === 'lobby' && !isJoinedLiveRace && activeLiveParticipants.length >= 5);
  const raceActionLabel = !liveRace
    ? 'Start Race'
    : liveRace.status === 'lobby'
      ? !isJoinedLiveRace
        ? lobbyIsFull
          ? 'Race full (5/5)'
          : 'Join Live Race'
        : liveParticipants.find((participant) => participant.accountId === account?.id)?.ready
          ? 'Waiting for racers'
          : 'Start Race'
      : liveRace.status === 'countdown'
        ? 'Countdown started'
        : 'Race in progress';

  const leaderboardRows = useMemo(() => {
    // Build rows for active participants
    const activeRows = visibleRacers
      .map((racer) => {
        const liveParticipant = liveParticipants.find((participant) => participant.displayName === racer.name);
        const isDnf = liveParticipant?.progress === -1;
        const time = racer.isUser
          ? userFinishTime ?? raceElapsed
          : liveRace && liveParticipant?.finishedAt && !isDnf
            ? Math.max(0.01, (new Date(liveParticipant.finishedAt).getTime() - new Date(liveRace.startsAt ?? Date.now()).getTime()) / 1000)
            : liveRace
              ? Number.POSITIVE_INFINITY
              : opponentTargetTimes[racer.name] ?? 45;
        const racerWpm = racer.isUser
          ? calculateWpm(correctWords, time)
          : liveRace
            ? Number(liveParticipant?.wpm ?? 0)
            : calculateWpm(words.length, time);
        const racerAccuracy = racer.isUser ? accuracy : Number(liveParticipant?.accuracy ?? 100);
        return { ...racer, time, wpm: racerWpm, accuracy: racerAccuracy, dnf: isDnf };
      });

    // Add DNF rows for participants who left mid-race (not in visibleRacers since they're off the track)
    const dnfRows = liveParticipants
      .filter((p) => p.progress === -1 && !visibleRacers.some((r) => r.name === p.displayName))
      .map((p) => ({
        name: p.displayName,
        color: p.color,
        accent: '#666',
        trim: '#333',
        model: 'sport' as CarModel,
        isUser: p.accountId === account?.id,
        time: Number.POSITIVE_INFINITY,
        wpm: 0,
        accuracy: 0,
        dnf: true,
      }));

    const allRows = [...activeRows, ...dnfRows];

    // Sort: finished (finite time) first by finish time, then unfinished by WPM desc, DNF last
    return allRows.sort((a, b) => {
      if (a.dnf && !b.dnf) return 1;
      if (!a.dnf && b.dnf) return -1;
      if (a.dnf && b.dnf) return 0;
      const aFinished = isFinite(a.time) && a.time > 0;
      const bFinished = isFinite(b.time) && b.time > 0;
      if (aFinished && bFinished) return a.time - b.time; // faster finish = higher rank
      if (aFinished && !bFinished) return -1;
      if (!aFinished && bFinished) return 1;
      // Both still racing — sort by WPM desc, then by progress desc as tiebreaker
      if (b.wpm !== a.wpm) return b.wpm - a.wpm;
      const aProgress = liveParticipants.find((p) => p.displayName === a.name)?.progress ?? 0;
      const bProgress = liveParticipants.find((p) => p.displayName === b.name)?.progress ?? 0;
      return bProgress - aProgress;
    });
  }, [account?.id, accuracy, correctWords, liveParticipants, liveRace, opponentTargetTimes, raceElapsed, userFinishTime, visibleRacers, words.length]);

  const userLeaderboardRow = leaderboardRows.find((racer) => racer.isUser);
  const userRankIndex = leaderboardRows.findIndex((racer) => racer.isUser);
  const userRank = userRankIndex >= 0 ? userRankIndex + 1 : 1;

  useEffect(() => {
    const box = passageBoxRef.current;
    const word = currentWordRef.current;

    if (!box || !word) return;

    const boxRect = box.getBoundingClientRect();
    const wordRect = word.getBoundingClientRect();
    const padding = 16;

    if (wordRect.bottom > boxRect.bottom - padding) {
      box.scrollTop += wordRect.bottom - boxRect.bottom + padding;
    } else if (wordRect.top < boxRect.top + padding) {
      box.scrollTop -= boxRect.top - wordRect.top + padding;
    }
  }, [completedWords, passage]);

  useEffect(() => {
    if (!startedAt || showingLeaderboard) return undefined;

    const timer = window.setInterval(() => {
      setRaceElapsed((Date.now() - startedAt) / 1000);
    }, 100);

    return () => window.clearInterval(timer);
  }, [startedAt, showingLeaderboard]);

  useEffect(() => {
    if (!liveRace || !startedAt || showingLeaderboard) return;
    const everyoneFinished = liveParticipants.length > 0 && liveParticipants.every((participant) => Boolean(participant.finishedAt));
    if (everyoneFinished) setShowingLeaderboard(true);
  }, [liveParticipants, liveRace, showingLeaderboard, startedAt]);

  useEffect(() => {
    if (liveRace || !startedAt || showingLeaderboard || !finished) return;
    const maxOpponentFinishTime = visibleRacers.reduce((maxTime, racer) => racer.isUser ? maxTime : Math.max(maxTime, opponentTargetTimes[racer.name] ?? 0), 0);
    if (raceElapsed >= maxOpponentFinishTime) setShowingLeaderboard(true);
  }, [finished, liveRace, opponentTargetTimes, raceElapsed, showingLeaderboard, startedAt, visibleRacers]);

  useEffect(() => {
    const leaveActiveRace = () => {
      if (!liveRaceIdRef.current || !user?.roomCode) return;
      const payload = JSON.stringify({ action: 'leave', roomCode: user.roomCode, raceId: liveRaceIdRef.current });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/races', new Blob([payload], { type: 'application/json' }));
      } else {
        void fetch('/api/races', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true });
      }
    };

    window.addEventListener('pagehide', leaveActiveRace);
    return () => {
      window.removeEventListener('pagehide', leaveActiveRace);
      if (countdownIntervalRef.current) {
        window.clearInterval(countdownIntervalRef.current);
      }

      Object.values(feedbackTimersRef.current).forEach((timerId) => {
        window.clearTimeout(timerId);
      });
    };
  }, [user?.roomCode]);

  function clearWordFeedback() {
    Object.values(feedbackTimersRef.current).forEach((timerId) => {
      window.clearTimeout(timerId);
    });

    feedbackTimersRef.current = {};
    setWordFeedback({});
  }

  function markWordFeedback(index: number, feedback: WordFeedback) {
    if (feedbackTimersRef.current[index]) {
      window.clearTimeout(feedbackTimersRef.current[index]);
    }

    setWordFeedback((current) => ({
      ...current,
      [index]: feedback,
    }));

    feedbackTimersRef.current[index] = window.setTimeout(() => {
      setWordFeedback((current) => {
        const next = { ...current };
        delete next[index];
        return next;
      });

      delete feedbackTimersRef.current[index];
    }, 550);
  }

  function createOpponentTargets() {
    const targets: Record<string, number> = {};

    visibleRacers.forEach((racer, index) => {
      if (!racer.isUser) {
        targets[racer.name] = makeOpponentTime(index);
      }
    });

    setOpponentTargetTimes(targets);
  }

  function resetRaceBeforeCountdown() {
    setPassage((currentPassage) => getNextPassage(currentPassage));
    setTyped('');
    setNitro(3);
    setFinished(false);
    setStartedAt(null);
    setRaceElapsed(0);
    setUserFinishTime(null);
    setShowingLeaderboard(false);
    clearWordFeedback();
    createOpponentTargets();

    if (passageBoxRef.current) {
      passageBoxRef.current.scrollTop = 0;
    }
  }

  async function beginCountdown() {
    if (isCountdownRunning || isSubmittingRace || !user?.roomCode || !account) return;
    if (liveRace?.status === 'lobby') {
      if (!isJoinedLiveRace) {
        await joinLiveRace();
        return;
      }
      await readyLiveRace(liveRace);
      return;
    }

    setIsSubmittingRace(true);
    resetRaceBeforeCountdown();
    try {
      const response = await fetch('/api/races', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', roomCode: user.roomCode, passage: getNextPassage(passage), displayName: user.name, color: customCar.color }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(errorData?.error ?? 'Unable to start race');
      }
      const data = await response.json() as { race: LiveRace; participants: LiveParticipant[] };
      liveRaceIdRef.current = data.race.id;
      setPassage(data.race.passage);
      setLiveRace(data.race);
      setLiveParticipants(data.participants);
      await readyLiveRace(data.race, true);
    } catch (error) {
      setLiveStatus(error instanceof Error ? error.message : 'Unable to start the room race. Please try again.');
    } finally {
      setIsSubmittingRace(false);
    }
  }

  async function joinLiveRace() {
    if (isSubmittingRace || !liveRace || !user?.roomCode || !account) return;
    setIsSubmittingRace(true);
    try {
      const response = await fetch('/api/races', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', roomCode: user.roomCode, raceId: liveRace.id, displayName: user.name, color: customCar.color }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(errorData?.error ?? 'Unable to join race');
      }
      const data = await response.json() as { participants: LiveParticipant[] };
      setLiveParticipants(data.participants);
      setLiveStatus('You are on the grid. Press Start Race when you are ready.');
    } catch (error) {
      setLiveStatus(error instanceof Error ? error.message : 'Unable to join this race.');
    } finally {
      setIsSubmittingRace(false);
    }
  }

  async function readyLiveRace(raceToReady = liveRace, alreadySubmitting = false) {
    if ((!alreadySubmitting && isSubmittingRace) || !raceToReady || !user?.roomCode || !account) return;
    if (!alreadySubmitting) setIsSubmittingRace(true);
    try {
      const response = await fetch('/api/races', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ready', roomCode: user.roomCode, raceId: raceToReady.id }),
      });
      if (!response.ok) throw new Error('Unable to ready race');
      const data = await response.json() as { race: LiveRace; participants: LiveParticipant[] };
      setLiveRace(data.race);
      setLiveParticipants(data.participants);
      setLiveStatus(['countdown', 'active'].includes(data.race.status) ? 'Everyone is ready. Countdown started.' : `Ready. Waiting for ${data.participants.filter((participant) => !participant.ready).length} racer${data.participants.filter((participant) => !participant.ready).length === 1 ? '' : 's'}.`);
    } catch {
      setLiveStatus('Unable to mark you ready.');
    } finally {
      if (!alreadySubmitting) setIsSubmittingRace(false);
    }
  }

  async function leaveLiveRace() {
    if (!liveRace || !user?.roomCode || !account) return;
    // Allow leaving from any race state — lobby, countdown, or active.
    // The server handles cleanup: if everyone leaves, the race is marked finished.
    try {
      const response = await fetch('/api/races', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave', roomCode: user.roomCode, raceId: liveRace.id }),
      });
      if (!response.ok) throw new Error('Unable to leave race');
      const data = await response.json() as { race: LiveRace | null; participants: LiveParticipant[] };
      setLiveRace(data.race);
      setLiveParticipants(data.participants);
      setLiveStatus(liveRace.status === 'lobby' ? 'You left the race lobby.' : '');
    } catch {
      setLiveStatus('Unable to leave the race.');
    }
  }

  function goToGarage() {
    void leaveLiveRace();
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    setCountdown(null);
    setStartedAt(null);
    setFinished(false);
    setShowingLeaderboard(false);
    setRaceElapsed(0);
    setUserFinishTime(null);
    setTyped('');
    setNitro(3);
    clearWordFeedback();
    setScreen('garage');
  }

  function finishRace(finalCompletedWords = completedWords, finalIncorrectWordsArg = currentIncorrectWords) {
    if (finished || finalCompletedWords < words.length) return;
    const finishTime = startedAt ? (Date.now() - startedAt) / 1000 : raceElapsed;
    const finalCorrectWords = Math.max(0, finalCompletedWords - finalIncorrectWordsArg);
    const finalAccuracy = finalCompletedWords ? Math.round((finalCorrectWords / finalCompletedWords) * 100) : 100;
    setUserFinishTime(finishTime);
    setRaceElapsed(finishTime);
    setFinished(true);
    if (liveRace && user?.roomCode && isJoinedLiveRace) {
      // WPM = correct words / minutes — no second accuracy discount
      const finalWpm = calculateWpm(finalCorrectWords, finishTime);
      void fetch('/api/races', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'progress', roomCode: user.roomCode, raceId: liveRace.id, progress: 100, accuracy: finalAccuracy, wpm: finalWpm, finished: true }),
      })
        .then(async (response) => {
          if (!response.ok) throw new Error('Unable to finish race');
          const data = await response.json() as { race?: LiveRace; participants?: LiveParticipant[] };
          if (data.race) setLiveRace(data.race);
          if (data.participants) setLiveParticipants(data.participants);
        })
        .catch(() => setLiveStatus('Your finish was saved locally. Reconnecting to the room race...'));
    } else if (!liveRace) {
      setShowingLeaderboard(true);
    }
  }

  function fireNitro() {
    if (!isRaceActive || nitro === 0) return;

    const nextWord = words[completedWords];
    if (!nextWord) return;

    const spacer = typed && !typed.endsWith(' ') ? ' ' : '';
    const nextTyped = `${typed}${spacer}${nextWord} `;

    markWordFeedback(completedWords, 'correct');
    setTyped(nextTyped);
    setNitro((value) => value - 1);

    const nitroCompletedWords = calculateCompletedWords(nextTyped);
    if (nitroCompletedWords >= words.length) {
      // Recompute incorrect words for the new typed value
      const nitroTypedWords = getTypedWords(nextTyped);
      let nitroIncorrect = 0;
      for (let i = 0; i < nitroCompletedWords; i++) {
        if (nitroTypedWords[i] !== undefined && nitroTypedWords[i] !== words[i]) nitroIncorrect++;
      }
      finishRace(nitroCompletedWords, nitroIncorrect);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      fireNitro();
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (!isRaceActive) return;

    const nextValue = event.target.value;
    const nextCompletedWords = calculateCompletedWords(nextValue);
    const nextTypedWords = getTypedWords(nextValue);

    // Recompute incorrect words from scratch for the new typed value
    let nextIncorrectWords = 0;
    for (let i = 0; i < nextCompletedWords; i++) {
      if (nextTypedWords[i] !== undefined && nextTypedWords[i] !== words[i]) nextIncorrectWords++;
    }

    // Show flash feedback only for newly completed words
    if (nextCompletedWords > completedWords) {
      for (let index = completedWords; index < nextCompletedWords; index += 1) {
        const expectedWord = words[index];
        const typedWord = nextTypedWords[index];
        if (!expectedWord || !typedWord) continue;
        markWordFeedback(index, typedWord === expectedWord ? 'correct' : 'wrong');
      }
    }

    setTyped(nextValue);
    if (liveRace && user?.roomCode && isJoinedLiveRace) {
      const correctCompletedWords = Math.max(0, nextCompletedWords - nextIncorrectWords);
      // Throttle to at most once every 300ms — no need to hit the DB on every keystroke
      const now = Date.now();
      if (now - lastProgressPushRef.current >= 300) {
        lastProgressPushRef.current = now;
        // WPM = correct words / minutes — no second accuracy discount
        void fetch('/api/races', {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'progress', roomCode: user.roomCode, raceId: liveRace.id, progress: Math.min(99, Math.round((correctCompletedWords / words.length) * 100)), accuracy: nextCompletedWords ? Math.round((correctCompletedWords / nextCompletedWords) * 100) : 100, wpm: calculateWpm(correctCompletedWords, Math.max(0.01, raceElapsed)), finished: false }),
        });
      }
    }

    if (nextCompletedWords >= words.length) {
      finishRace(nextCompletedWords, nextIncorrectWords);
    }
  }

  function updateCustomCar(partial: Partial<CustomCar>) {
    setCustomCar((current) => ({
      ...current,
      ...partial,
    }));
  }

  const game = getGameMetadata('typing-race');

  return (
    <AppLayout title={game.name}>
      <Helmet>
        <title>{game.name} — Intern Break Space</title>
        <meta name="description" content={game.description} />
        <link rel="canonical" href="/typing-race" />
      </Helmet>

      <main className="min-h-screen px-4 py-6 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),_transparent_36%),linear-gradient(180deg,_#161827,_#0b1020_45%,_#050712)]">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 flex items-center justify-between gap-4">
            <GameBackButton />
          </div>

          <div className="mb-5 text-center">
            <div
              className="inline-flex items-center gap-2 text-4xl font-black italic tracking-tight text-white drop-shadow-lg sm:text-5xl"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <span className="rounded-sm bg-red-500 px-2 py-0.5 text-white shadow-[5px_5px_0_rgba(255,255,255,0.2)]">
                N
              </span>
              <span>NITRO TYPE</span>
              <span className="h-12 w-1 rotate-12 rounded-full bg-red-500" />
            </div>

            <p className="mt-2 text-sm font-medium text-white/60">
              Build your car, race your room, and hit Enter for nitro.
            </p>
          </div>

          {screen === 'garage' ? (
            <section className="overflow-hidden rounded-3xl border border-white/15 bg-slate-950/80 shadow-2xl shadow-black/40 backdrop-blur">
              <div className="border-b border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-6 py-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
                      <Wrench size={16} />
                      Garage
                    </p>

                    <h1 className="mt-1 text-3xl font-black text-white">
                      Decorate Your Car
                    </h1>

                    <p className="mt-1 text-sm text-white/50">
                      Pick a model, tune the RGB colors, then head to the race lobby.
                    </p>
                  </div>

                  <button
                    onClick={() => setScreen('race')}
                    className="rounded-xl bg-lime-500 px-6 py-3 text-sm font-black text-slate-950 shadow-lg shadow-lime-500/20 transition hover:bg-lime-400"
                  >
                    Go to Race
                  </button>
                </div>
              </div>

              <div className="grid gap-6 p-6 lg:grid-cols-[1fr_1.25fr]">
                <div className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.18),_transparent_55%),linear-gradient(180deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.02))] p-6">
                  <p className="mb-5 flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-white/45">
                    <Paintbrush size={15} />
                    Preview
                  </p>

                  <div className="relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-[#23262e]">
                    <div className="absolute inset-0 opacity-25 [background-image:repeating-linear-gradient(90deg,transparent_0_44px,rgba(255,255,255,.16)_44px_46px)]" />
                    <div className="absolute left-0 right-0 top-1/2 h-px bg-white/20" />

                    <div className="scale-[1.9]">
                      <FancyRaceCar
                        color={customCar.color}
                        accent={customCar.accent}
                        trim={customCar.trim}
                        model={customCar.model}
                        active
                        preview
                        rank={1}
                      />
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm font-black text-white">
                      {CAR_MODELS.find((model) => model.id === customCar.model)?.name} Model
                    </p>

                    <p className="mt-1 text-sm text-white/50">
                      {CAR_MODELS.find((model) => model.id === customCar.model)?.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-white/45">
                      Car Model
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {CAR_MODELS.map((model, index) => (
                        <button
                          key={model.id}
                          onClick={() => updateCustomCar({ model: model.id })}
                          className={`rounded-2xl border p-4 text-left transition ${
                            customCar.model === model.id
                              ? 'border-lime-400 bg-lime-400/10'
                              : 'border-white/10 bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <div className="mb-4 flex h-20 items-center justify-center rounded-xl bg-slate-950/70">
                            <div className="scale-90">
                              <FancyRaceCar
                                color={customCar.color}
                                accent={customCar.accent}
                                trim={customCar.trim}
                                model={model.id}
                                active={false}
                                preview
                                rank={index + 1}
                              />
                            </div>
                          </div>

                          <p className="font-black text-white">{model.name}</p>
                          <p className="mt-1 text-xs text-white/45">{model.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-white/45">
                      RGB Paint
                    </p>

                    <div className="grid gap-3 md:grid-cols-3">
                      <ColorEditor
                        label="Body"
                        value={customCar.color}
                        onChange={(value) => updateCustomCar({ color: value })}
                      />

                      <ColorEditor
                        label="Accent"
                        value={customCar.accent}
                        onChange={(value) => updateCustomCar({ accent: value })}
                      />

                      <ColorEditor
                        label="Trim"
                        value={customCar.trim}
                        onChange={(value) => updateCustomCar({ trim: value })}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setScreen('race')}
                      className="rounded-xl bg-lime-500 px-6 py-3 text-sm font-black text-slate-950 shadow-lg shadow-lime-500/20 transition hover:bg-lime-400"
                    >
                      Go to Race
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section className="overflow-hidden rounded-3xl border border-white/15 bg-slate-950/70 shadow-2xl shadow-black/40 backdrop-blur">
              <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-r from-lime-700 via-green-500 to-lime-700 px-5 py-3">
                <div className="absolute inset-0 opacity-25 [background-image:repeating-linear-gradient(90deg,rgba(255,255,255,.35)_0_8px,transparent_8px_18px)]" />

                <div className="relative flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="rounded-xl bg-black/35 px-3 py-2 text-xs font-black uppercase tracking-widest text-white">
                      Starting Grid
                    </div>

                    <div className="rounded-xl bg-white/20 px-3 py-2 text-xs font-black uppercase tracking-widest text-white">
                      Campus Outings
                    </div>

                    {canGoGarage && (
                      <button
                        onClick={goToGarage}
                        className="rounded-xl border border-white/30 bg-slate-950/35 px-3 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-slate-950/55"
                      >
                        Go to Garage
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-white">
                    <span className="flex items-center gap-1.5">
                      <Users size={16} />
                      {liveRace ? `${displayedRacerCount}/5 racers` : `${displayedRacerCount} racer${displayedRacerCount !== 1 ? 's' : ''}`}
                    </span>
                    {usingDemoBots ? (
                      <span className="rounded-full bg-yellow-400/20 px-2 py-1 text-[11px] font-bold text-yellow-200">Practice — vs. bots</span>
                    ) : (
                      <span className="rounded-full bg-black/25 px-2 py-1 text-[11px] font-bold">Live room sync</span>
                    )}

                    <span className="flex items-center gap-1.5">
                      <Clock size={16} className="text-blue-100" />
                      {formatRaceTime(raceElapsed)}
                    </span>

                    <span className="flex items-center gap-1.5">
                      <Gauge size={16} className="text-lime-200" />
                      {calculateWpm(correctWords, userFinishTime ?? raceElapsed)} WPM
                    </span>

                    <span className="rounded-full bg-black/25 px-2 py-1 text-[11px] font-bold">
                      {accuracy}% accuracy
                    </span>

                    <span className="flex items-center gap-1.5">
                      <Zap size={16} className="text-yellow-300" />
                      {nitro} nitro
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="relative min-h-[500px] overflow-hidden bg-[#25282f]"
                style={{
                  backgroundImage:
                    'linear-gradient(180deg, #24272e 0%, #2d3037 45%, #202329 100%)',
                  backgroundPosition: `${-trackOffset * 0.2}px 0`,
                }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.07),_transparent_45%)]" />

                <div
                  className="pointer-events-none absolute inset-0 opacity-25"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, transparent 0px, transparent 56px, rgba(255,255,255,0.08) 57px, transparent 58px)',
                    backgroundPosition: `${-trackOffset * 0.75}px 0`,
                  }}
                />

                <div
                  className="pointer-events-none absolute inset-0 opacity-35"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, transparent 0px, transparent 110px, rgba(255,255,255,0.16) 111px, transparent 150px)',
                    backgroundPosition: `${-trackOffset * 1.6}px 0`,
                    filter: 'blur(1px)',
                  }}
                />

                <div className="absolute left-0 top-0 z-20 h-full w-14 border-r border-white/20 bg-black/30">
                  <div className="absolute left-5 top-0 h-full w-4 bg-[repeating-linear-gradient(45deg,#e5e7eb_0_8px,#111827_8px_16px)] opacity-90" />
                  <div className="absolute left-0 top-0 h-full w-full bg-gradient-to-r from-black/40 to-transparent" />
                </div>

                <div
                  className="absolute top-0 z-20 h-full w-16 border-l-4 border-yellow-400 bg-[repeating-conic-gradient(#f8fafc_0%_25%,#111827_0%_50%)_50%/20px_20px]"
                  style={{
                    left: `${finishLeftPosition}%`,
                    opacity: finishReveal,
                    transition: 'left 180ms ease-out, opacity 180ms ease-out',
                  }}
                >
                  <div className="absolute -left-24 top-3 rounded-l-full bg-yellow-400 px-4 py-1 text-xs font-black uppercase tracking-widest text-slate-950 shadow-lg">
                    Finish
                  </div>

                  <div className="absolute inset-y-0 -left-10 w-10 bg-gradient-to-l from-yellow-400/30 to-transparent" />
                </div>

                {isCountdownRunning && (
                  <div className="absolute left-1/2 top-24 z-40 flex -translate-x-1/2 items-center justify-center rounded-3xl border border-white/25 bg-black/45 px-10 py-5 shadow-2xl shadow-black/40 backdrop-blur">
                    <span className="text-7xl font-black text-white drop-shadow-lg">
                      {countdown}
                    </span>
                  </div>
                )}

                {showingLeaderboard && (
                  <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/75 px-3 py-6 backdrop-blur-sm sm:px-6">
                    <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-white/20 bg-slate-950/95 shadow-2xl shadow-black/80">
                      <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-r from-red-600 via-red-500 to-slate-900 px-6 py-4">
                        <div className="absolute inset-0 opacity-20 [background-image:repeating-linear-gradient(135deg,rgba(255,255,255,.45)_0_10px,transparent_10px_20px)]" />

                        <div className="relative flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-xs font-black uppercase tracking-[0.28em] text-white/75">
                                Race Results
                              </p>

                              <h2 className="text-4xl font-black italic text-white">
                                {getOrdinalRank(userRank)}
                              </h2>
                            </div>

                            {leaderboardRows[0]?.isUser && (
                              <div className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black uppercase tracking-widest text-slate-950 shadow-lg shadow-yellow-400/30">
                                Winner
                              </div>
                            )}
                          </div>

                          <Trophy size={38} className="text-yellow-300" />
                        </div>
                      </div>

                      <div className="grid gap-0 lg:grid-cols-[1.45fr_1fr]">
                        <div className="border-r border-white/10 bg-slate-900/70">
                          <div className="divide-y divide-white/10">
                            {leaderboardRows.map((racer, index) => {
                              const position = index + 1;
                              const isWinner = index === 0 && !('dnf' in racer && racer.dnf);
                              const isDnf = 'dnf' in racer && racer.dnf;
                              return (
                                <div
                                  key={racer.name}
                                  className={`relative flex items-center justify-between gap-4 px-5 py-4 ${racer.isUser ? 'bg-gradient-to-r from-yellow-400/25 via-yellow-500/15 to-transparent' : isDnf ? 'bg-slate-900/30 opacity-60' : 'bg-slate-900/50'}`}
                                >
                                  {isWinner && <div className="absolute inset-y-0 left-0 w-1.5 bg-yellow-400" />}
                                  <div className="flex min-w-0 items-center gap-4">
                                    <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/35">
                                      <div className="scale-75">
                                        <FancyRaceCar color={racer.color} accent={racer.accent} trim={racer.trim} model={racer.model} active={false} preview rank={position} />
                                      </div>
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="truncate text-lg font-black text-white">{racer.name}{racer.isUser ? ' (You)' : ''}</p>
                                        {isWinner && <span className="rounded-md bg-yellow-400 px-2 py-0.5 text-xs font-black uppercase text-slate-950">Winner</span>}
                                        {isDnf && <span className="rounded-md bg-red-500/80 px-2 py-0.5 text-xs font-black uppercase text-white">DNF</span>}
                                      </div>
                                      {isDnf ? (
                                        <p className="mt-1 text-xs italic text-red-400/80">Left the race</p>
                                      ) : liveRace ? (
                                        <p className="mt-1 text-xs italic text-white/50">Room racer</p>
                                      ) : (
                                        <p className="mt-1 text-xs italic text-orange-300/80">"Nitro Type Bot"</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <p className="text-sm font-black uppercase tracking-widest text-white/45">{isDnf ? 'DNF' : getOrdinalRank(position)}</p>
                                    {!isDnf && (
                                      <div className="mt-1 flex flex-wrap justify-end gap-x-4 gap-y-1 text-sm font-bold text-white/75">
                                        <span><span className="font-black text-white">{racer.wpm}</span> WPM</span>
                                        <span><span className="font-black text-white">{formatRaceTime(racer.time)}</span></span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                          </div>
                        </div>

                        <div className="bg-slate-800/80 p-5">
                          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                            <p className="mb-4 text-xl font-black text-white">Race Stats</p>

                            <div className="space-y-3 text-sm">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-white/55">Your Rank</span>
                                <span className="font-black text-yellow-300">
                                  {getOrdinalRank(userRank)}
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-4">
                                <span className="text-white/55">Your WPM</span>
                                <span className="font-black text-lime-300">
                                  {userLeaderboardRow?.wpm ?? 0} WPM
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-4">
                                <span className="text-white/55">Your Time</span>
                                <span className="font-black text-blue-300">
                                  {formatRaceTime(userLeaderboardRow?.time ?? 0)}
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-4">
                                <span className="text-white/55">Words Typed</span>
                                <span className="font-black text-white">{completedWords}</span>
                              </div>

                              <div className="flex items-center justify-between gap-4">
                                <span className="text-white/55">Accuracy</span>
                                <span className="font-black text-lime-300">{accuracy}%</span>
                              </div>

                              <div className="flex items-center justify-between gap-4">
                                <span className="text-white/55">Nitro Remaining</span>
                                <span className="font-black text-yellow-300">{nitro}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                            <p className="mb-4 text-xl font-black text-white">Actions</p>

                            <div className="space-y-3">
                              <button
                                onClick={beginCountdown}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-red-600/25 transition hover:bg-red-500"
                              >
                                <RotateCcw size={17} />
                                Race Again
                              </button>

                              <button
                                onClick={goToGarage}
                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-white/10"
                              >
                                <Wrench size={17} />
                                Go to Garage
                              </button>
                            </div>
                          </div>

                          <div className="mt-5 rounded-2xl border border-lime-400/20 bg-lime-400/10 p-5">
                            <p className="text-xs font-black uppercase tracking-[0.25em] text-lime-300">
                              Session Summary
                            </p>

                            <p className="mt-2 text-sm leading-6 text-white/60">
                              WPM is calculated using the full passage word count divided by
                              finish time. Nitro still counts toward your final speed.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-white/10 bg-slate-950 px-5 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.25em] text-white/40">
                              Season Level
                            </p>

                            <div className="mt-2 h-4 w-72 max-w-full overflow-hidden rounded-full border border-white/10 bg-white/10">
                              <div className="h-full w-[76%] bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300" />
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-xs font-black uppercase tracking-[0.25em] text-white/40">
                              Best Racer
                            </p>

                            <p className="mt-1 text-lg font-black text-white">
                              {leaderboardRows[0]?.name} · {leaderboardRows[0]?.wpm} WPM
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="relative z-10 px-8 pb-44 pt-10 sm:px-16">
                  <div className="space-y-3">
                    {visibleRacers.map((racer, index) => {
                      const opponentTarget = opponentTargetTimes[racer.name] ?? makeOpponentTime(index);

                      const liveParticipant = liveParticipants.find((participant) => participant.displayName === racer.name);
                      const racerPosition = racer.isUser
                        ? getUserCarPosition(charProgress, raceElapsed, isRaceActive, finished)
                        : liveRace
                          ? getUserCarPosition(liveParticipant?.progress ?? 0, raceElapsed, Boolean(startedAt), Boolean(liveParticipant?.finishedAt))
                          : getOpponentCarPosition(opponentTarget, raceElapsed, startedAt, index);

                      const hasFinished = racer.isUser
                        ? finished
                        : liveRace
                          ? Boolean(liveParticipant?.finishedAt)
                          : Boolean(startedAt && raceElapsed >= opponentTarget);

                      return (
                        <div
                          key={racer.name}
                          className="relative h-20 overflow-hidden rounded-sm border-y border-white/10 bg-[#30333a]"
                          style={{
                            backgroundImage:
                              'repeating-linear-gradient(90deg, rgba(255,255,255,0.035) 0px, transparent 2px, transparent 44px)',
                            backgroundPosition: `${-trackOffset}px 0`,
                          }}
                        >
                          <div
                            className="absolute left-0 right-0 top-1/2 h-px opacity-70"
                            style={{
                              backgroundImage:
                                'repeating-linear-gradient(90deg, rgba(255,255,255,0.35) 0px, rgba(255,255,255,0.35) 22px, transparent 22px, transparent 46px)',
                              backgroundPosition: `${-trackOffset * 1.15}px 0`,
                            }}
                          />

                          <div
                            className="absolute inset-0 opacity-25"
                            style={{
                              backgroundImage:
                                'repeating-linear-gradient(90deg, transparent 0px, transparent 42px, rgba(255,255,255,.16) 42px, rgba(255,255,255,.16) 44px)',
                              backgroundPosition: `${-trackOffset * 1.35}px 0`,
                            }}
                          />

                          <span className="absolute left-3 top-2 z-10 rounded bg-black/45 px-2 py-0.5 text-[10px] font-bold text-white/80">
                            {racer.name}
                          </span>

                          {liveRace?.status === 'lobby' && !startedAt && (
                            <span className={`absolute left-3 top-8 z-10 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${liveParticipant?.ready ? 'bg-lime-400 text-slate-950' : 'bg-white/15 text-white/70'}`}>
                              {liveParticipant?.ready ? 'Ready ✓' : 'Not ready'}
                            </span>
                          )}

                          {hasFinished && (
                            <span className="absolute right-8 top-2 z-20 rounded-full bg-lime-400 px-2 py-0.5 text-[10px] font-black uppercase text-slate-950">
                              Done
                            </span>
                          )}

                          <div
                            className="absolute top-[14px] z-20 transition-all duration-100 ease-out"
                            style={carStyle(racerPosition)}
                          >
                            <FancyRaceCar
                              color={racer.color}
                              accent={racer.accent}
                              trim={racer.trim}
                              model={racer.model}
                              active={racer.isUser ? isRaceActive : Boolean(startedAt && !hasFinished)}
                              rank={index + 1}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 z-30 border-t border-white/15 bg-gradient-to-r from-blue-950 via-slate-950 to-blue-950 px-4 py-4 shadow-[0_-20px_45px_rgba(0,0,0,0.45)]">
                  <div className="mx-auto max-w-4xl">
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">
                          Typing Console
                        </p>

                        <p className="text-xs text-white/50">
                          Correct words build speed. Wrong words reduce progress and accuracy until you correct your run.
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <p className="max-w-xs text-right text-xs text-white/55">{liveStatus}</p>
                        <button
                          onClick={() => void beginCountdown()}
                          disabled={isSubmittingRace || lobbyIsFull || Boolean(liveRace && liveRace.status !== 'lobby') || (isJoinedLiveRace && Boolean(liveParticipants.find((participant) => participant.accountId === account?.id)?.ready))}
                          className="rounded-xl bg-lime-500 px-5 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-lime-500/20 transition hover:bg-lime-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {raceActionLabel}
                        </button>
                      </div>
                    </div>

                    <div
                      ref={passageBoxRef}
                      className="h-28 overflow-y-auto overflow-x-hidden rounded-xl border border-white/20 bg-white px-4 py-3 shadow-inner"
                    >
                      <p className="w-full whitespace-normal break-words font-mono text-base leading-8 tracking-[0.12em] text-slate-500 [overflow-wrap:anywhere]">
                        {words.map((word, index) => {
                          const isDone = index < completedWords;
                          const isCurrent = index === completedWords;
                          const feedback = wordFeedback[index];

                          const color =
                            feedback === 'correct'
                              ? '#15803d'
                              : feedback === 'wrong'
                                ? '#dc2626'
                                : isDone
                                  ? '#2563eb'
                                  : isCurrent
                                    ? '#0f172a'
                                    : undefined;

                          const background =
                            feedback === 'correct'
                              ? 'rgba(34, 197, 94, 0.22)'
                              : feedback === 'wrong'
                                ? 'rgba(239, 68, 68, 0.22)'
                                : isCurrent
                                  ? 'rgba(59, 130, 246, 0.16)'
                                  : undefined;

                          return (
                            <span
                              key={`${word}-${index}`}
                              ref={isCurrent ? currentWordRef : null}
                              className="mr-2 inline rounded-sm transition-colors duration-150"
                              style={{
                                color,
                                background,
                                textDecoration: isCurrent ? 'underline' : undefined,
                                textUnderlineOffset: '4px',
                              }}
                            >
                              {word}
                            </span>
                          );
                        })}
                      </p>
                    </div>

                    <input
                      ref={inputRef}
                      value={typed}
                      onChange={handleChange}
                      onKeyDown={handleKeyDown}
                      disabled={!isRaceActive}
                      placeholder={
                        isCountdownRunning
                          ? 'Get ready...'
                          : showingLeaderboard
                            ? 'Race finished. Start a new game from the leaderboard.'
                            : startedAt
                              ? 'Start typing here. Press Enter to use nitro.'
                              : liveRace && !isJoinedLiveRace
                                ? 'Join the grid before the race begins.'
                                : liveRace?.status === 'lobby'
                                  ? 'Press Start Race when you are ready. The countdown begins once every racer is ready.'
                                  : 'Wait for the race to begin.'
                      }
                      className="mt-3 w-full rounded-xl border border-white/15 bg-slate-900 px-4 py-3 font-mono text-sm text-white outline-none transition placeholder:text-white/35 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/35 disabled:cursor-not-allowed disabled:opacity-60"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                    />

                    {finished && !showingLeaderboard && (
                      <div className="mt-3 flex items-center gap-2 rounded-xl border border-lime-400/30 bg-lime-400/15 p-3 text-sm font-bold text-lime-100">
                        <Gauge size={17} className="text-lime-300" />
                        Finish line crossed. Waiting for the rest of the racers...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 bg-slate-950 px-5 py-4">
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-white/45">
                    Your Car
                  </p>

                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <FancyRaceCar
                      color={customCar.color}
                      accent={customCar.accent}
                      trim={customCar.trim}
                      model={customCar.model}
                      active={false}
                      preview
                      rank={1}
                    />

                    <div>
                      <p className="text-sm font-black text-white">
                        {CAR_MODELS.find((model) => model.id === customCar.model)?.name} Custom
                      </p>

                      <p className="text-xs text-white/45">
                        Body {customCar.color} · Accent {customCar.accent}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/40">
                    Words Left
                  </p>

                  <p className="text-2xl font-black text-white">{wordsLeft}</p>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </AppLayout>
  );
}