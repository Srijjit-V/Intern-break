import { Helmet } from '@dr.pogodin/react-helmet';
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from 'react';
import { RotateCcw, Star, Timer, Clock } from 'lucide-react';
import GameBackButton from '@/components/GameBackButton';
import AppLayout from '@/layouts/AppLayout'
import HowToPlayGuide from '@/components/HowToPlayGuide';
import { freezeria } from 'virtual:content';

type Station = 'home' | 'queue' | 'build' | 'mix' | 'top' | 'score';
type Size = 'Small' | 'Medium' | 'Large';

type Customer = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  picky: boolean;
  order: {
    size: Size;
    flavor: string;
    syrup: string;
    topping: string;
  };
  arrivedAt: number;
};

type Decoration = {
  id: string;
  kind: 'syrup' | 'whip' | 'topping';
  value: string;
  x: number;
  y: number;
};

type ActiveTool = {
  kind: Decoration['kind'];
  value: string;
};

const SYRUP_TARGET = 6;
const TOPPING_TARGET = 5;
const SYRUP_MAX_PTS = 15;
const TOPPING_MAX_PTS = 10;

const GRACE_SECS = 20;
const MAX_SECS = 90;
const TIME_MAX_PTS = 20;

const flavors = [
  {
    id: 'vanilla',
    label: 'Vanilla',
    emoji: '🍦',
    color: '#fef08a',
    body: '#fef3c7',
    r: 254,
    g: 240,
    b: 138,
  },
  {
    id: 'chocolate',
    label: 'Chocolate',
    emoji: '🍫',
    color: '#92400e',
    body: '#78350f',
    r: 146,
    g: 64,
    b: 14,
  },
  {
    id: 'strawberry',
    label: 'Strawberry',
    emoji: '🍓',
    color: '#fb7185',
    body: '#fda4af',
    r: 251,
    g: 113,
    b: 133,
  },
  {
    id: 'mint',
    label: 'Mint Chip',
    emoji: '🌿',
    color: '#4ade80',
    body: '#bbf7d0',
    r: 74,
    g: 222,
    b: 128,
  },
  {
    id: 'blueberry',
    label: 'Blueberry',
    emoji: '🫐',
    color: '#818cf8',
    body: '#c7d2fe',
    r: 129,
    g: 140,
    b: 248,
  },
  {
    id: 'mango',
    label: 'Mango',
    emoji: '🥭',
    color: '#fb923c',
    body: '#fed7aa',
    r: 251,
    g: 146,
    b: 60,
  },
];

const syrups = [
  {
    id: 'fudge',
    label: 'Hot Fudge',
    emoji: '🍫',
    color: '#3f1d0b',
    cap: '#1c0a03',
    body: '#6d3a1f',
    hex: '#3d1a08',
  },
  {
    id: 'berry',
    label: 'Berry Syrup',
    emoji: '🍓',
    color: '#e11d48',
    cap: '#881337',
    body: '#f43f5e',
    hex: '#be123c',
  },
  {
    id: 'caramel',
    label: 'Caramel',
    emoji: '🍯',
    color: '#b45309',
    cap: '#78350f',
    body: '#b45309',
    hex: '#92400e',
  },
];

const toppings = [
  {
    id: 'cherry',
    label: 'Cherry',
    emoji: '🍒',
    color: '#dc2626',
    rim: '#7f1d1d',
  },
  {
    id: 'sprinkles',
    label: 'Sprinkles',
    emoji: '🌈',
    color: '#fde68a',
    rim: '#92400e',
  },
  {
    id: 'cookie',
    label: 'Cookie Bits',
    emoji: '🍪',
    color: '#d97706',
    rim: '#78350f',
  },
  {
    id: 'banana',
    label: 'Banana',
    emoji: '🍌',
    color: '#fef08a',
    rim: '#92400e',
  },
  {
    id: 'nuts',
    label: 'Nuts',
    emoji: '🥜',
    color: '#78350f',
    rim: '#451a03',
  },
  {
    id: 'coconut',
    label: 'Coconut',
    emoji: '🥥',
    color: '#f1f5f9',
    rim: '#9ca3af',
  },
];

const CUSTOMER_POOL: Omit<Customer, 'arrivedAt'>[] = [
  {
    id: 'penny',
    name: 'Aman Bhutani',
    emoji: '🧑‍🎨',
    color: '#fde68a',
    picky: false,
    order: {
      size: 'Medium',
      flavor: 'chocolate',
      syrup: 'fudge',
      topping: 'sprinkles',
    },
  },
  {
    id: 'rico',
    name: 'Mark McCaffrey',
    emoji: '🧑‍💼',
    color: '#bfdbfe',
    picky: false,
    order: {
      size: 'Large',
      flavor: 'strawberry',
      syrup: 'berry',
      topping: 'banana',
    },
  },
  {
    id: 'mitch',
    name: 'Roger Chen',
    emoji: '🧑‍🍳',
    color: '#d1fae5',
    picky: true,
    order: {
      size: 'Small',
      flavor: 'mint',
      syrup: 'caramel',
      topping: 'nuts',
    },
  },
  {
    id: 'wendy',
    name: 'Fara Howard',
    emoji: '🧑‍💻',
    color: '#fce7f3',
    picky: false,
    order: {
      size: 'Large',
      flavor: 'vanilla',
      syrup: 'caramel',
      topping: 'cherry',
    },
  },
];

function createCustomerQueue(startAt = 0, count = 4): Customer[] {
  return Array.from({ length: count }, (_, index) => {
    const base = CUSTOMER_POOL[(startAt + index) % CUSTOMER_POOL.length];
    const cycle = Math.floor((startAt + index) / CUSTOMER_POOL.length) + 1;
    return {
      ...base,
      id: `${base.id}-${startAt + index}`,
      name: cycle === 1 ? base.name : `${base.name} · Round ${cycle}`,
      arrivedAt: startAt + index,
    };
  });
}

const SIZES = [
  {
    name: 'Small' as Size,
    emoji: '🥤',
    svgW: 90,
    svgH: 150,
    fillH: 42,
    path: 'M10,6 L80,6 L72,142 Q45,150 18,142 Z',
    rimX: 5,
    rimY: 2,
    rimW: 80,
    rimH: 9,
    rimRx: 4,
    pedW: 64,
    trap: {
      topY: 10,
      botY: 142,
      topX1: 10,
      topX2: 80,
      botX1: 18,
      botX2: 72,
    },
  },
  {
    name: 'Medium' as Size,
    emoji: '🧋',
    svgW: 115,
    svgH: 185,
    fillH: 72,
    path: 'M12,7 L103,7 L94,176 Q57,185 20,176 Z',
    rimX: 7,
    rimY: 3,
    rimW: 101,
    rimH: 10,
    rimRx: 5,
    pedW: 82,
    trap: {
      topY: 11,
      botY: 176,
      topX1: 12,
      topX2: 103,
      botX1: 20,
      botX2: 94,
    },
  },
  {
    name: 'Large' as Size,
    emoji: '🍺',
    svgW: 145,
    svgH: 225,
    fillH: 110,
    path: 'M14,8 L131,8 L119,214 Q72,225 26,214 Z',
    rimX: 8,
    rimY: 4,
    rimW: 128,
    rimH: 12,
    rimRx: 6,
    pedW: 100,
    trap: {
      topY: 12,
      botY: 214,
      topX1: 14,
      topX2: 131,
      botX1: 26,
      botX2: 119,
    },
  },
];

function getLabel(items: { id: string; label: string }[], id: string) {
  return items.find((item) => item.id === id)?.label ?? id;
}

function trapX(
  trap: {
    topY: number;
    botY: number;
    topX1: number;
    topX2: number;
    botX1: number;
    botX2: number;
  },
  y: number,
  side: 'left' | 'right',
) {
  const frac = Math.max(0, Math.min(1, (y - trap.topY) / (trap.botY - trap.topY)));

  return side === 'left'
    ? trap.topX1 + (trap.botX1 - trap.topX1) * frac
    : trap.topX2 + (trap.botX2 - trap.topX2) * frac;
}

function quantityScore(count: number, target: number, maxPts: number, correct: boolean) {
  if (!correct) return 0;
  if (count === 0) return 0;

  const diff = Math.abs(count - target);
  const ratio = Math.max(0.2, 1 - (diff / target) * 0.7);

  return Math.round(maxPts * ratio);
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;

  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
}

function FreezeriaLogo() {
  return (
    <div className="relative text-center">
      <div className="absolute inset-x-0 top-1/2 mx-auto h-16 max-w-[520px] -translate-y-1/2 rounded-full bg-white/90 shadow-xl" />

      <div
        className="relative inline-block rotate-[-1deg] text-5xl font-black leading-none tracking-tight sm:text-6xl"
        style={{
          fontFamily: 'var(--font-heading)',
          WebkitTextStroke: '2px #7f1d1d',
          color: '#ef4444',
          textShadow:
            '0 4px 0 #ffffff, 0 7px 0 #991b1b, 0 10px 18px rgba(0,0,0,0.25)',
        }}
      >
        Papa's
      </div>

      <div
        className="relative -mt-2 text-6xl font-black leading-none tracking-tight sm:text-7xl"
        style={{
          fontFamily: 'var(--font-heading)',
          WebkitTextStroke: '2px #7f1d1d',
          color: '#ef4444',
          textShadow:
            '0 4px 0 #ffffff, 0 8px 0 #991b1b, 0 12px 20px rgba(0,0,0,0.28)',
        }}
      >
        Freezeria
      </div>

      <div className="absolute right-[18%] top-2 hidden text-4xl sm:block">🍒</div>
    </div>
  );
}

function PalmTree({ className = '' }: { className?: string }) {
  return (
    <div className={`relative h-32 w-20 ${className}`}>
      <div className="absolute bottom-0 left-1/2 h-24 w-4 -translate-x-1/2 rotate-6 rounded-full bg-amber-800" />
      <div className="absolute bottom-12 left-1/2 h-24 w-4 -translate-x-1/2 rotate-6 rounded-full bg-amber-700/50" />

      {[-55, -30, 0, 30, 55].map((deg) => (
        <div
          key={deg}
          className="absolute left-1/2 top-2 h-10 w-24 origin-left rounded-full bg-green-500"
          style={{
            transform: `rotate(${deg}deg)`,
            clipPath: 'polygon(0 45%, 100% 0, 82% 50%, 100% 100%, 0 58%)',
          }}
        />
      ))}
    </div>
  );
}

function FreezeriaHomeScreen({
  tips,
  served,
  score,
  onStart,
}: {
  tips: number;
  served: number;
  score: number;
  onStart: () => void;
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg,#fbcfe8 0%,#fde68a 31%,#67e8f9 31%,#5eead4 58%,#fde68a 58%,#fcd34d 78%,#a16207 78%,#78350f 100%)',
        }}
      />

      <div className="absolute inset-0 opacity-25">
        <div className="absolute left-10 top-12 h-16 w-16 rounded-full border-4 border-white/70" />
        <div className="absolute right-20 top-20 h-20 w-20 rounded-full border-4 border-white/50" />
        <div className="absolute left-1/2 top-8 h-12 w-12 rounded-full border-4 border-white/50" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-28 bg-[repeating-linear-gradient(90deg,#8b5e34_0_34px,#6b3f21_34px_38px)] shadow-[0_-8px_20px_rgba(0,0,0,0.25)]" />
      <div className="absolute bottom-24 left-0 right-0 h-4 bg-amber-900/50" />

      <div
        className="absolute bottom-20 left-[38%] h-40 w-72 rounded-t-full bg-amber-100/80"
        style={{ transform: 'rotate(-14deg)' }}
      />

      <PalmTree className="absolute bottom-24 left-10 scale-90" />
      <PalmTree className="absolute bottom-20 right-24 scale-75" />

      <div className="absolute bottom-24 left-20 h-36 w-44 rounded-t-3xl border-4 border-purple-700 bg-gradient-to-b from-violet-300 to-violet-500 shadow-2xl">
        <div className="absolute -top-8 left-1/2 flex h-12 w-32 -translate-x-1/2 items-center justify-center rounded-t-3xl border-4 border-purple-800 bg-pink-400 text-center text-xs font-black text-white shadow">
          GoDaddy
          <br />
          Sundae Studio
        </div>

        <div className="absolute left-4 top-12 h-20 w-12 rounded-t-lg border-2 border-cyan-700 bg-cyan-200">
          <div className="mt-2 text-center text-[9px] font-black text-green-700">
            OPEN
          </div>
        </div>

        <div className="absolute right-4 top-12 h-20 w-16 rounded-t-lg border-2 border-purple-900 bg-white/80" />

        <div className="absolute left-1/2 top-7 h-12 w-28 -translate-x-1/2 overflow-hidden rounded-t-full border-2 border-red-700 bg-white">
          <div className="grid h-full grid-cols-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className={i % 2 === 0 ? 'bg-red-500' : 'bg-white'} />
            ))}
          </div>
        </div>

        <div className="absolute -top-12 left-7 h-12 w-1 bg-red-700" />
        <div className="absolute -top-14 left-5 text-xl">🍒</div>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-8 pb-20">
        <FreezeriaLogo />

        <div className="mt-8 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl border border-white/70 bg-white/75 px-5 py-3 shadow-lg">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
              Score
            </p>
            <p className="text-2xl font-black text-red-600">{score}</p>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/75 px-5 py-3 shadow-lg">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
              Tips
            </p>
            <p className="text-2xl font-black text-green-600">${tips}</p>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/75 px-5 py-3 shadow-lg">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
              Served
            </p>
            <p className="text-2xl font-black text-blue-600">{served}</p>
          </div>
        </div>

        <button
          onClick={onStart}
          className="mt-8 rounded-full border-4 border-white bg-gradient-to-b from-lime-400 to-green-600 px-10 py-4 text-xl font-black text-white shadow-[0_8px_0_#166534,0_14px_25px_rgba(0,0,0,0.3)] transition hover:-translate-y-1 active:translate-y-1 active:shadow-[0_4px_0_#166534]"
        >
          Build. Serve. Grow.
        </button>
      </div>
    </div>
  );
}

function OrderTicket({
  customer,
  order,
  queuePos,
  totalInQueue,
}: {
  customer: Customer;
  order: Customer['order'];
  queuePos?: number;
  totalInQueue?: number;
}) {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs shadow dark:border-amber-700 dark:bg-amber-950">
      <div className="mb-2 flex items-center gap-2 border-b border-dashed border-amber-300 pb-2 dark:border-amber-700">
        <span className="text-xl">{customer.emoji}</span>

        <div>
          <p className="text-[10px] text-amber-700 dark:text-amber-300">Order for</p>
          <p className="font-bold text-amber-900 dark:text-amber-100">
            {customer.name}
          </p>
        </div>

        {customer.picky && (
          <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-bold text-white">
            Picky
          </span>
        )}

        {queuePos !== undefined && totalInQueue !== undefined && (
          <span className="ml-auto rounded-full bg-amber-600 px-2 py-0.5 text-[9px] font-bold text-white">
            #{queuePos + 1}/{totalInQueue}
          </span>
        )}
      </div>

      <div className="space-y-1 font-medium text-amber-800 dark:text-amber-200">
        <div className="flex items-center gap-1.5">
          {SIZES.find((s) => s.name === order.size)?.emoji}
          <span>{order.size} Cup</span>
        </div>

        <div className="flex items-center gap-1.5">
          {flavors.find((f) => f.id === order.flavor)?.emoji}
          <span>{getLabel(flavors, order.flavor)}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {syrups.find((s) => s.id === order.syrup)?.emoji}
          <span>{getLabel(syrups, order.syrup)}</span>
          <span className="ml-auto text-[9px] text-amber-600">
            ~{SYRUP_TARGET} drizzles
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {toppings.find((t) => t.id === order.topping)?.emoji}
          <span>{getLabel(toppings, order.topping)}</span>
          <span className="ml-auto text-[9px] text-amber-600">
            ~{TOPPING_TARGET} drops
          </span>
        </div>
      </div>
    </div>
  );
}

function StationNav({
  station,
  canMix,
  canTop,
  onStation,
  onFinish,
}: {
  station: Station;
  canMix: boolean;
  canTop: boolean;
  onStation: (s: Station) => void;
  onFinish: () => void;
}) {
  const tabs = [
    {
      id: 'queue',
      label: 'Order',
      icon: '📋',
      color: 'from-lime-400 to-green-600',
      disabled: false,
    },
    {
      id: 'build',
      label: 'Build',
      icon: '🥤',
      color: 'from-fuchsia-400 to-purple-700',
      disabled: false,
    },
    {
      id: 'mix',
      label: 'Mix',
      icon: '🌀',
      color: 'from-orange-300 to-orange-600',
      disabled: !canMix,
    },
    {
      id: 'top',
      label: 'Top',
      icon: '🍒',
      color: 'from-sky-300 to-blue-700',
      disabled: !canTop,
    },
  ] as {
    id: Station;
    label: string;
    icon: string;
    color: string;
    disabled: boolean;
  }[];

  return (
    <div className="flex items-center gap-2 border-t-4 border-black bg-[radial-gradient(circle,#2f2f2f_1px,transparent_1px)] bg-[length:12px_12px] px-4 py-3">
      <button
        onClick={() => onStation('home')}
        className="rounded-full border-4 border-white bg-black px-4 py-2 text-xs font-black text-white shadow"
      >
        Menu
      </button>

      <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-lime-200 bg-lime-400 text-2xl font-black text-slate-950 shadow">
        1
      </div>

      {tabs.map((tab) => {
        const active = station === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onStation(tab.id)}
            disabled={tab.disabled}
            className={`relative flex min-w-[118px] items-center justify-center gap-2 rounded-full border-4 px-4 py-2 text-sm font-black uppercase text-white shadow-lg transition-all ${
              active
                ? 'scale-105 border-white brightness-110'
                : 'border-black/50 hover:-translate-y-0.5'
            } ${tab.disabled ? 'cursor-not-allowed opacity-35 grayscale' : ''}`}
          >
            <span className={`absolute inset-0 rounded-full bg-gradient-to-b ${tab.color}`} />
            <span className="relative text-xl">{tab.icon}</span>
            <span className="relative leading-none">
              {tab.label}
              <br />
              <span className="text-[10px]">Station</span>
            </span>
          </button>
        );
      })}

      <button
        onClick={onFinish}
        disabled={!canTop}
        className="ml-auto rounded-full border-4 border-white bg-gradient-to-b from-lime-400 to-green-600 px-6 py-2 text-sm font-black uppercase text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-35 disabled:grayscale"
      >
        Finish ✔
      </button>
    </div>
  );
}

function OrderTimerBar({ elapsed }: { elapsed: number }) {
  const pct = Math.min(100, (elapsed / MAX_SECS) * 100);
  const color =
    elapsed <= GRACE_SECS ? '#4ade80' : elapsed <= MAX_SECS * 0.6 ? '#facc15' : '#f87171';

  const timePts =
    elapsed <= GRACE_SECS
      ? TIME_MAX_PTS
      : Math.max(
          0,
          Math.round(TIME_MAX_PTS * (1 - (elapsed - GRACE_SECS) / (MAX_SECS - GRACE_SECS))),
        );

  return (
    <div className="flex items-center gap-2 border-b border-white/10 bg-black/50 px-4 py-1.5">
      <Clock size={11} className="shrink-0" style={{ color }} />

      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-none" style={{ width: `${pct}%`, background: color }} />
        <div
          className="absolute top-0 h-full w-0.5 bg-white/40"
          style={{ left: `${(GRACE_SECS / MAX_SECS) * 100}%` }}
        />
      </div>

      <span className="shrink-0 text-[10px] font-bold" style={{ color }}>
        {formatTime(elapsed)}
      </span>

      <span className="shrink-0 text-[10px] text-white/50">⏱ {timePts}pts</span>
    </div>
  );
}

function CupSVG({
  size,
  flavor,
  blend,
  className,
}: {
  size: Size | null;
  flavor: string | null;
  blend: number;
  className?: string;
}) {
  const sz = SIZES.find((s) => s.name === size) ?? SIZES[1];
  const fl = flavors.find((f) => f.id === flavor);
  const t = sz.trap;
  const fillBotY = t.botY - 2;
  const fills: { d: string; fill: string }[] = [];

  if (fl) {
    const fillH = Math.round(sz.fillH * Math.max(0.3, Math.min(1, (blend || 40) / 100)));
    const y0 = fillBotY - fillH;
    const y1 = fillBotY;
    const xL0 = trapX(t, y0, 'left');
    const xR0 = trapX(t, y0, 'right');
    const xL1 = trapX(t, y1, 'left');
    const xR1 = trapX(t, y1, 'right');

    fills.push({
      d: `M${xL0},${y0} L${xR0},${y0} L${xR1},${y1} L${xL1},${y1} Z`,
      fill: fl.color,
    });

    const sw = Math.max(4, (xR0 - xL0) * 0.12);

    fills.push({
      d: `M${xL0 + 1},${y0} L${xL0 + 1 + sw},${y0} L${xL1 + 1 + sw},${y1} L${xL1 + 1},${y1} Z`,
      fill: 'rgba(255,255,255,0.12)',
    });
  }

  return (
    <svg
      width={sz.svgW}
      height={sz.svgH}
      viewBox={`0 0 ${sz.svgW} ${sz.svgH}`}
      className={className}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <clipPath id={`cc-${sz.name}`}>
          <path d={sz.path} />
        </clipPath>

        <linearGradient id={`cs-${sz.name}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="38%" stopColor="rgba(255,255,255,0.42)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      <g clipPath={`url(#cc-${sz.name})`}>
        {fills.map((f, i) => (
          <path key={i} d={f.d} fill={f.fill} />
        ))}
      </g>

      <path
        d={sz.path}
        fill="rgba(200,230,255,0.06)"
        stroke="rgba(255,255,255,0.8)"
        strokeWidth="2.5"
      />

      <path d={sz.path} fill={`url(#cs-${sz.name})`} pointerEvents="none" />

      <rect
        x={sz.rimX}
        y={sz.rimY}
        width={sz.rimW}
        height={sz.rimH}
        rx={sz.rimRx}
        fill="rgba(255,255,255,0.5)"
        stroke="rgba(255,255,255,0.8)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function DragGhost({ tool, pos }: { tool: ActiveTool; pos: { x: number; y: number } }) {
  if (tool.kind === 'syrup') {
    const s = syrups.find((x) => x.id === tool.value);

    return (
      <div
        className="pointer-events-none fixed z-[9999] select-none"
        style={{
          left: pos.x,
          top: pos.y,
          transform: 'translate(-50%,-20%) rotate(180deg)',
          transformOrigin: '50% 0%',
        }}
      >
        <span className="text-3xl">{s?.emoji}</span>
      </div>
    );
  }

  if (tool.kind === 'whip') {
    return (
      <div
        className="pointer-events-none fixed z-[9999] select-none"
        style={{
          left: pos.x,
          top: pos.y,
          transform: 'translate(-50%,-20%) rotate(180deg)',
          transformOrigin: '50% 0%',
        }}
      >
        <span className="text-3xl">🍦</span>
      </div>
    );
  }

  const tp = toppings.find((x) => x.id === tool.value);

  return (
    <div
      className="pointer-events-none fixed z-[9999] select-none"
      style={{
        left: pos.x,
        top: pos.y,
        transform: 'translate(-50%,-50%)',
      }}
    >
      <span className="text-4xl drop-shadow-lg">{tp?.emoji}</span>
    </div>
  );
}

function QueueScreen({
  tips,
  served,
  queue,
  onServeNext,
}: {
  tips: number;
  served: number;
  queue: Customer[];
  onServeNext: () => void;
}) {
  const next = queue[0];

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg,#7dd3fc 0%,#38bdf8 34%,#fef3c7 34%,#fde68a 48%,#4b5563 48%,#374151 76%,#1f2937 76%,#111827 100%)',
        }}
      />

      <div className="relative z-10 flex items-center gap-4 border-b-4 border-slate-900 bg-gradient-to-b from-slate-700 to-slate-900 px-5 py-2 text-sm text-white">
        <span className="rounded-xl bg-black/40 px-3 py-1 font-black">💰 ${tips}</span>
        <span className="rounded-xl bg-black/40 px-3 py-1 font-black">🍦 {served} served</span>
        <span className="rounded-xl bg-black/40 px-3 py-1 font-black">👥 {queue.length} waiting</span>

        <div className="ml-auto rounded-full bg-amber-300 px-4 py-1 text-xs font-black text-amber-950 shadow">
          Order Station
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 h-28 border-t-4 border-slate-500 bg-[repeating-linear-gradient(90deg,#6b7280_0_44px,#4b5563_44px_48px)] shadow-[0_-10px_25px_rgba(0,0,0,0.25)]" />
        <div className="absolute inset-x-0 bottom-28 h-5 bg-gradient-to-b from-slate-300 to-slate-600" />

        <div className="absolute bottom-28 left-8 h-28 w-16 rounded-t-xl border-4 border-amber-900 bg-gradient-to-b from-amber-700 to-amber-950 shadow-lg">
          <div className="absolute right-2 top-12 h-3 w-3 rounded-full bg-amber-300" />
          <div className="absolute inset-x-2 top-3 text-center text-xs font-black text-amber-100">
            OPEN
          </div>
        </div>

        <div className="absolute bottom-28 left-28 flex items-end gap-9">
          {queue.map((customer, i) => {
            const isNext = i === 0;
            const patience = Math.max(15, 100 - i * 22);

            return (
              <div
                key={customer.id}
                className="flex flex-col items-center gap-1"
                style={{
                  transform: `scale(${isNext ? 1.08 : 0.96})`,
                  transformOrigin: 'bottom center',
                }}
              >
                <div
                  className={`rounded-full px-2 py-0.5 text-[9px] font-black text-white ${
                    isNext ? 'bg-green-500' : 'bg-slate-600'
                  }`}
                >
                  #{i + 1}
                </div>

                <div className="relative">
                  <div
                    className={`absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[10px] font-black text-white ${
                      customer.picky ? 'bg-red-500' : 'bg-green-500'
                    }`}
                  >
                    {customer.picky ? '!' : '✓'}
                  </div>

                  {isNext && <div className="absolute -inset-2 rounded-full bg-yellow-300/40 blur-md" />}

                  <div
                    className={`relative flex h-20 w-16 items-center justify-center rounded-[48%_48%_35%_35%] border-4 text-4xl shadow-xl ${
                      isNext ? 'animate-bounce border-yellow-300' : 'border-white/50'
                    }`}
                    style={{ background: customer.color }}
                  >
                    {customer.emoji}
                  </div>
                </div>

                <p className="rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-black text-white">
                  {customer.name}
                </p>

                <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-900 shadow-inner">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${patience}%`,
                      background:
                        patience > 65 ? '#4ade80' : patience > 35 ? '#facc15' : '#f87171',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {next && (
          <div className="absolute right-5 top-5 w-56 rotate-2 rounded-2xl border-4 border-white bg-amber-50 p-3 shadow-2xl">
            <OrderTicket
              customer={next}
              order={next.order}
              queuePos={0}
              totalInQueue={queue.length}
            />
          </div>
        )}

        <div className="absolute inset-x-0 top-4 flex justify-center">
          <span className="rounded-full border border-white/30 bg-black/55 px-5 py-2 text-xs font-black text-amber-200 shadow">
            Serve customers in order — {next ? `${next.name} is next!` : 'All done!'}
          </span>
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between border-t-4 border-black bg-slate-950 px-5 py-3">
        <p className="text-xs text-white/55">
          🟢 Regular = forgiving &nbsp;|&nbsp; 🔴 Picky = stricter &nbsp;|&nbsp; ⏱ Faster = more points
        </p>

        {next ? (
          <button
            onClick={onServeNext}
            className="rounded-full border-4 border-white bg-gradient-to-b from-lime-400 to-green-600 px-7 py-2 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5"
          >
            Serve {next.name} →
          </button>
        ) : (
          <span className="rounded-full bg-amber-500 px-7 py-2 text-sm font-black text-white">
            All customers served! 🎉
          </span>
        )}
      </div>
    </div>
  );
}

function BuildStation({
  size,
  flavor,
  buildGauge,
  buildLocked,
  onSize,
  onFlavor,
  onStartPour,
  onStopPour,
  onNext,
  onTrash,
  customer,
  order,
  elapsed,
}: {
  size: Size | null;
  flavor: string | null;
  buildGauge: number;
  buildLocked: boolean;
  onSize: (s: Size) => void;
  onFlavor: (f: string) => void;
  onStartPour: () => void;
  onStopPour: () => void;
  onNext: () => void;
  onTrash: () => void;
  customer: Customer | null;
  order: Customer['order'] | null;
  elapsed: number;
}) {
  const perfMin = 45;
  const perfMax = 65;
  const gaugeColor =
    buildGauge < perfMin ? '#ef4444' : buildGauge <= perfMax ? '#4ade80' : '#f97316';

  const leftFlavors = flavors.slice(0, 3);
  const rightFlavors = flavors.slice(3, 6);
  const sz = SIZES.find((s) => s.name === size) ?? SIZES[1];

  return (
    <div
      className="flex h-full flex-col"
      style={{
        background:
          'radial-gradient(circle at 20% 25%, rgba(255,255,255,0.15) 0 8px, transparent 9px), radial-gradient(circle at 80% 35%, rgba(255,255,255,0.12) 0 10px, transparent 11px), linear-gradient(180deg,#c026d3 0%,#9333ea 42%,#7e22ce 42%,#581c87 100%)',
        backgroundSize: '120px 120px, 160px 160px, 100% 100%',
      }}
    >
      <OrderTimerBar elapsed={elapsed} />

      <div className="flex flex-1 overflow-hidden">
        <div className="grid w-[190px] shrink-0 grid-cols-2 grid-rows-3 gap-2 p-3">
          {leftFlavors.map((fl) => (
            <button
              key={fl.id}
              onClick={() => !buildLocked && onFlavor(fl.id)}
              disabled={buildLocked}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 p-2 transition-all ${
                flavor === fl.id
                  ? 'border-yellow-400 bg-yellow-400/20 shadow-[0_0_0_3px_rgba(250,204,21,0.35)]'
                  : 'border-white/20 bg-white/10 hover:border-white/40 hover:bg-white/20'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <span className="text-2xl">{fl.emoji}</span>
              <span className="text-[10px] font-bold leading-tight text-white">{fl.label}</span>
            </button>
          ))}

          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border-2 border-black/10 bg-black/10" />
          ))}
        </div>

        <div className="relative flex flex-1 flex-col items-center pt-3">
          <div className="mb-3 flex gap-2">
            {SIZES.map((s) => (
              <button
                key={s.name}
                onClick={() => !buildLocked && onSize(s.name)}
                disabled={buildLocked}
                className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold transition-all ${
                  size === s.name
                    ? 'border-green-400 bg-green-400/25 text-green-300'
                    : 'border-white/25 bg-white/10 text-white hover:bg-white/20'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {s.emoji} {s.name}
              </button>
            ))}
          </div>

          <div className="flex flex-col items-center">
            <div className="h-6 w-8 rounded-t-md border-2 border-b-0 border-gray-400 bg-gradient-to-r from-gray-400 via-gray-200 to-gray-400" />

            <div
              className="flex w-36 flex-col items-center rounded-xl border-2 border-gray-400 pb-2 shadow-xl"
              style={{
                background:
                  'linear-gradient(180deg,#e5e7eb,#d1d5db 10%,#374151 10%,#1f2937 78%,#4b5563 100%)',
              }}
            >
              <div
                className="flex w-full items-center justify-center gap-2 rounded-t-xl border-b-2 border-gray-400 py-1.5"
                style={{ background: 'linear-gradient(180deg,#f9fafb,#e5e7eb)' }}
              >
                {[buildGauge > 0, buildGauge >= perfMin, buildGauge >= perfMin && buildGauge <= perfMax].map(
                  (on, i) => (
                    <div
                      key={i}
                      className="h-2 w-2 rounded-full border border-black/20"
                      style={{
                        background: on ? '#4ade80' : '#6b7280',
                        boxShadow: on ? '0 0 5px #4ade80' : 'none',
                      }}
                    />
                  ),
                )}
              </div>

              <div className="relative mx-2 my-2 h-5 w-28 overflow-hidden rounded-md border-2 border-gray-600 bg-gray-900">
                <div className="h-full rounded transition-none" style={{ width: `${buildGauge}%`, background: `${gaugeColor}cc` }} />

                <div
                  className="absolute top-0 h-full border-l-2 border-r-2 border-green-400 bg-green-400/25"
                  style={{ left: `${perfMin}%`, width: `${perfMax - perfMin}%` }}
                />

                <div
                  className="absolute top-0 h-full w-0.5 bg-white shadow-[0_0_4px_white]"
                  style={{ left: `${buildGauge}%` }}
                />
              </div>

              <div
                className="min-h-4 px-2 text-center text-[10px] font-bold"
                style={{
                  color: flavor
                    ? flavors.find((f) => f.id === flavor)?.color ?? 'white'
                    : 'rgba(255,255,255,0.4)',
                }}
              >
                {flavor
                  ? `${flavors.find((f) => f.id === flavor)?.emoji} ${
                      flavors.find((f) => f.id === flavor)?.label
                    }`
                  : '← Pick a flavor'}
              </div>

              <div
                onMouseDown={onStartPour}
                onMouseUp={onStopPour}
                onPointerDown={onStartPour}
                onPointerUp={onStopPour}
                className={`my-2 flex w-28 cursor-pointer select-none items-center justify-center rounded-lg py-2.5 transition-all ${
                  !flavor || !size || buildLocked
                    ? 'cursor-not-allowed opacity-40'
                    : 'hover:brightness-110'
                }`}
                style={{
                  background: 'linear-gradient(180deg,#4ade80,#16a34a)',
                  border: '3px solid #14532d',
                  borderBottomWidth: '5px',
                  borderBottomColor: '#052e16',
                  boxShadow: '0 0 12px rgba(74,222,128,0.35)',
                }}
              >
                <svg width="38" height="20" viewBox="0 0 44 24">
                  <polygon
                    points="4,2 40,2 34,12 40,22 4,22 10,12"
                    fill="rgba(255,255,255,0.9)"
                  />
                  <polygon points="8,6 36,6 30,12 36,18 8,18 14,12" fill="#16a34a" />
                </svg>
              </div>

              <div className="flex w-24 justify-between">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-4 w-2.5 rounded-b-md border border-gray-500 bg-gradient-to-b from-gray-400 to-gray-600"
                  />
                ))}
              </div>
            </div>

            <div className="h-5 w-5 border border-t-0 border-gray-500 bg-gradient-to-r from-gray-400 via-gray-200 to-gray-400" />

            <div
              className="h-3 w-7"
              style={{
                background: 'linear-gradient(180deg,#9ca3af,#6b7280)',
                clipPath: 'polygon(15% 0,85% 0,100% 100%,0 100%)',
              }}
            />
          </div>

          <div className="mt-3 flex flex-col items-center">
            <div
              className="mb-[-2px] rounded-b-full border-2 border-t-0 border-gray-500 bg-gradient-to-b from-gray-400 to-gray-600 transition-all"
              style={{ width: sz.pedW, height: 14 }}
            />

            <CupSVG
              size={size}
              flavor={buildLocked ? flavor : buildGauge > 5 ? flavor : null}
              blend={buildGauge}
            />
          </div>
        </div>

        <div className="grid w-[190px] shrink-0 grid-cols-2 grid-rows-3 gap-2 p-3">
          {rightFlavors.map((fl) => (
            <button
              key={fl.id}
              onClick={() => !buildLocked && onFlavor(fl.id)}
              disabled={buildLocked}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 p-2 transition-all ${
                flavor === fl.id
                  ? 'border-yellow-400 bg-yellow-400/20 shadow-[0_0_0_3px_rgba(250,204,21,0.35)]'
                  : 'border-white/20 bg-white/10 hover:border-white/40 hover:bg-white/20'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <span className="text-2xl">{fl.emoji}</span>
              <span className="text-[10px] font-bold leading-tight text-white">{fl.label}</span>
            </button>
          ))}

          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border-2 border-black/10 bg-black/10" />
          ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-white/10 bg-black/30 px-3 py-1.5">
        {customer && order && (
          <div className="w-40 shrink-0">
            <OrderTicket customer={customer} order={order} />
          </div>
        )}

        <div className="flex shrink-0 gap-1 text-[10px] text-white/60">
          {size && (
            <span className="rounded bg-white/10 px-1.5 py-0.5">
              {SIZES.find((s) => s.name === size)?.emoji} {size}
            </span>
          )}

          {flavor && (
            <span className="rounded bg-white/10 px-1.5 py-0.5">
              {flavors.find((f) => f.id === flavor)?.emoji} {getLabel(flavors, flavor)}
            </span>
          )}

          {buildLocked && (
            <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-green-300">
              ✓ {buildGauge}%
            </span>
          )}
        </div>

        <p className="flex-1 text-[10px] text-white/40">
          {!size
            ? 'Pick the cup size from the ticket'
            : !flavor
              ? 'Pick the ordered flavor'
              : buildLocked
                ? 'Cup locked — go to the Mix Station'
                : 'Hold the green button and release inside the green zone'}
        </p>

        <button
          onClick={onTrash}
          className="shrink-0 rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-red-500"
        >
          ✖ Trash
        </button>

        <button
          onClick={onNext}
          disabled={!buildLocked}
          className="shrink-0 rounded-lg bg-orange-500 px-3 py-1 text-xs font-bold text-white enabled:hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Mix It! →
        </button>
      </div>
    </div>
  );
}

function MixStation({
  flavor,
  blend,
  mixLocked,
  mixing,
  onStartMix,
  onStopMix,
  onNext,
  onBack,
  customer,
  order,
  elapsed,
}: {
  flavor: string | null;
  blend: number;
  mixLocked: boolean;
  mixing: boolean;
  onStartMix: () => void;
  onStopMix: () => void;
  onNext: () => void;
  onBack: () => void;
  customer: Customer | null;
  order: Customer['order'] | null;
  elapsed: number;
}) {
  const fl = flavors.find((f) => f.id === flavor);
  const bMin = 45;
  const bMax = 65;
  const blendColor = fl ? `rgb(${fl.r},${fl.g},${fl.b})` : 'rgb(180,200,220)';

  const msg = mixLocked
    ? blend >= bMin && blend <= bMax
      ? '🟢 Perfect blend!'
      : blend < bMin
        ? '🟡 Under-blended'
        : '🟡 Over-blended'
    : mixing
      ? `Blending… ${blend}%`
      : 'Hold ▶ to blend!';

  const gaugeRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cv = gaugeRef.current;

    if (!cv) return;

    const ctx = cv.getContext('2d');

    if (!ctx) return;

    const canvasW = cv.width;
    const canvasH = cv.height;
    const cx = canvasW / 2;
    const cy = canvasH - 8;
    const r = canvasH - 14;

    ctx.clearRect(0, 0, canvasW, canvasH);

    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI);
    ctx.lineWidth = 9;
    ctx.strokeStyle = '#374151';
    ctx.lineCap = 'round';
    ctx.stroke();

    [
      { from: 0, to: bMin, c: '#ef4444' },
      { from: bMin, to: bMax, c: '#4ade80' },
      { from: bMax, to: 100, c: '#f97316' },
    ].forEach((z) => {
      ctx.beginPath();
      ctx.arc(
        cx,
        cy,
        r,
        Math.PI + (z.from / 100) * Math.PI,
        Math.PI + (z.to / 100) * Math.PI,
      );
      ctx.lineWidth = 9;
      ctx.strokeStyle = z.c;
      ctx.lineCap = 'butt';
      ctx.stroke();
    });

    const na = Math.PI + (blend / 100) * Math.PI;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(na) * (r - 4), cy + Math.sin(na) * (r - 4));
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#e5e7eb';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#374151';
    ctx.fill();

    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    ctx.fillText(`${Math.round(blend)}%`, cx, cy - r + 13);
  }, [blend]);

  return (
    <div
      className="flex h-full flex-col"
      style={{
        background:
          'radial-gradient(circle at 15% 20%, rgba(255,255,255,0.12) 0 18px, transparent 19px), radial-gradient(circle at 72% 30%, rgba(255,255,255,0.10) 0 22px, transparent 23px), linear-gradient(180deg,#f59e0b 0%,#ea8a04 62%,#7c4a21 62%,#5f3517 100%)',
        backgroundSize: '180px 180px, 220px 220px, 100% 100%',
      }}
    >
      <OrderTimerBar elapsed={elapsed} />

      <div className="flex flex-1 gap-4 overflow-hidden px-6 pt-5">
        <div className="flex flex-col items-center gap-2">
          <div
            className="flex w-48 flex-col items-center rounded-xl border-2 border-gray-400 shadow-xl"
            style={{
              background:
                'linear-gradient(180deg,#e5e7eb,#d1d5db 8%,#374151 8%,#1f2937 82%,#4b5563 100%)',
            }}
          >
            <div
              className="flex w-full items-center justify-center gap-2 rounded-t-xl border-b-2 border-gray-400 py-1.5"
              style={{ background: 'linear-gradient(180deg,#f9fafb,#e5e7eb)' }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-4 w-4 rounded-full border-2 border-gray-500"
                  style={{ background: 'radial-gradient(circle at 35% 35%,#e5e7eb,#9ca3af)' }}
                />
              ))}
            </div>

            <div className="relative mx-3 my-2 h-40 w-40 overflow-hidden rounded-md border border-white/10">
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
                <svg width="112" height="150" viewBox="0 0 108 144">
                  <defs>
                    <clipPath id="mc2">
                      <path d="M7,4 L101,4 L92,137 Q54,146 16,137 Z" />
                    </clipPath>

                    <linearGradient id="agrd" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#9ca3af" />
                      <stop offset="50%" stopColor="#e5e7eb" />
                      <stop offset="100%" stopColor="#9ca3af" />
                    </linearGradient>
                  </defs>

                  <g clipPath="url(#mc2)">
                    {fl && !mixing && blend < 30 && (
                      <rect
                        x="7"
                        y={4 + (137 - Math.round(110 * 0.82))}
                        width="94"
                        height={Math.round(110 * 0.82)}
                        fill={fl.color}
                      />
                    )}

                    {(mixing || blend >= 30) && fl && (
                      <rect
                        x="7"
                        y={4 + (137 - Math.round(110 * 0.82))}
                        width="94"
                        height={Math.round(110 * 0.82)}
                        fill={blendColor}
                        opacity={Math.min(0.96, 0.4 + (blend / 100) * 0.56)}
                      />
                    )}
                  </g>

                  <path
                    d="M7,4 L101,4 L92,137 Q54,146 16,137 Z"
                    fill="rgba(220,240,255,0.08)"
                    stroke="rgba(255,255,255,0.7)"
                    strokeWidth="2.5"
                  />

                  <rect
                    x="3"
                    y="1"
                    width="102"
                    height="9"
                    rx="4"
                    fill="rgba(255,255,255,0.42)"
                    stroke="rgba(255,255,255,0.7)"
                    strokeWidth="1.5"
                  />

                  {!mixLocked && (
                    <>
                      <rect
                        x="51"
                        y="4"
                        width="5"
                        height="50"
                        rx="2"
                        fill="url(#agrd)"
                        style={{
                          transform: mixing ? 'translateX(3px)' : 'none',
                          transition: 'transform 0.05s',
                        }}
                      />

                      <rect x="37" y="52" width="33" height="12" rx="4" fill="url(#agrd)" />
                    </>
                  )}
                </svg>
              </div>
            </div>
          </div>

          <div
            className="flex w-48 flex-col items-center gap-1.5 rounded-xl border-2 border-gray-400 px-3 py-2 shadow-xl"
            style={{ background: 'linear-gradient(180deg,#9ca3af,#6b7280,#4b5563)' }}
          >
            <div className="relative w-full">
              <canvas ref={gaugeRef} width={110} height={52} />
            </div>

            <p className="text-center text-xs font-bold text-white">{msg}</p>

            <div
              onMouseDown={onStartMix}
              onMouseUp={onStopMix}
              onPointerDown={onStartMix}
              onPointerUp={onStopMix}
              className={`flex h-8 w-8 cursor-pointer select-none items-center justify-center rounded-full border-4 text-sm font-bold text-white transition-all ${
                mixLocked
                  ? 'cursor-default border-amber-500 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,.7)]'
                  : mixing
                    ? 'translate-y-0.5 border-green-900 bg-green-400 shadow-sm'
                    : 'border-green-900 bg-green-500 shadow-[0_3px_0_#052e16] hover:bg-green-400'
              }`}
            >
              {mixLocked ? '★' : '▶'}
            </div>
          </div>

          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex w-14 flex-col items-center gap-1 opacity-50">
                <div className="h-24 w-full rounded-lg border border-gray-500 bg-gray-800" />
                <div className="h-8 w-full rounded-md border border-gray-500 bg-gray-700" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3">
          {customer && order && <OrderTicket customer={customer} order={order} />}

          {mixLocked && (
            <div className="rounded-xl border border-green-400/40 bg-black/30 p-3 text-center text-sm font-bold text-green-300">
              {blend >= bMin && blend <= bMax ? '🟢 Perfect blend!' : '✓ Blend complete'}
            </div>
          )}

          <div className="mt-auto flex gap-2">
            <button
              onClick={onBack}
              className="rounded-xl bg-gray-600 px-3 py-2 text-xs font-bold text-white hover:bg-gray-500"
            >
              ← Back
            </button>

            <button
              onClick={onNext}
              disabled={!mixLocked}
              className="flex-1 rounded-xl bg-blue-500 px-3 py-2 text-xs font-bold text-white enabled:hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Add Toppings! →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopStation({
  size,
  flavor,
  blend,
  decorations,
  sundaeRef,
  onPointerDown,
  onTrash,
  onFinish,
  appliedSyrup,
  appliedTopping,
  whipped,
  customer,
  order,
  elapsed,
  syrupCount,
  toppingCount,
}: {
  size: Size | null;
  flavor: string | null;
  blend: number;
  decorations: Decoration[];
  sundaeRef: RefObject<HTMLDivElement | null>;
  onPointerDown: (kind: ActiveTool['kind'], value: string, e: PointerEvent) => void;
  onTrash: () => void;
  onFinish: () => void;
  appliedSyrup: string | null;
  appliedTopping: string | null;
  whipped: boolean;
  customer: Customer | null;
  order: Customer['order'] | null;
  elapsed: number;
  syrupCount: number;
  toppingCount: number;
}) {
  const sz = SIZES.find((s) => s.name === size) ?? SIZES[1];

  function syrupCountColor(count: number) {
    const diff = Math.abs(count - SYRUP_TARGET);

    return diff === 0 ? '#4ade80' : diff <= 2 ? '#facc15' : '#f87171';
  }

  function toppingCountColor(count: number) {
    const diff = Math.abs(count - TOPPING_TARGET);

    return diff === 0 ? '#4ade80' : diff <= 2 ? '#facc15' : '#f87171';
  }

  return (
    <div
      className="flex h-full flex-col"
      style={{
        background:
          'repeating-linear-gradient(90deg,rgba(255,255,255,0.06)_0_22px,transparent_22px_44px), linear-gradient(180deg,#312e81 0%,#3730a3 42%,#38bdf8 42%,#0ea5e9 74%,#334155 74%,#1f2937 100%)',
      }}
    >
      <OrderTimerBar elapsed={elapsed} />

      <div className="flex flex-1 overflow-hidden">
        <div
          className="flex w-[180px] shrink-0 flex-col border-r border-white/10"
          style={{
            background:
              'linear-gradient(180deg,#1e40af,#1d4ed8 33%,#374151 33%,#1f2937 100%)',
          }}
        >
          <div
            className="flex h-24 shrink-0 items-center justify-center border-b-4 border-gray-400 text-xs font-bold text-white/50"
            style={{ background: 'linear-gradient(180deg,#374151,#4b5563 60%,#6b7280)' }}
          >
            🍬 Toppings
          </div>

          <div className="flex flex-col items-center gap-2 overflow-y-auto p-2">
            {toppings.map((tp) => (
              <div
                key={tp.id}
                className={`flex w-full cursor-grab flex-col items-center gap-0.5 rounded-xl border-2 p-1.5 transition-all ${
                  appliedTopping === tp.id
                    ? 'border-yellow-300 bg-yellow-300/15'
                    : 'border-white/15 bg-white/10 hover:bg-white/15'
                }`}
                onPointerDown={(e) => onPointerDown('topping', tp.id, e)}
              >
                <svg width="44" height="32" viewBox="0 0 52 37">
                  <ellipse cx="26" cy="35" rx="23" ry="3" fill="rgba(0,0,0,0.2)" />
                  <path d="M3,14 Q2,35 26,35 Q50,35 49,14 Z" fill={tp.rim} />
                  <path d="M5,14 Q4,32 26,32 Q48,32 47,14 Z" fill={tp.color} />
                  <path d="M3,14 Q4,9 26,8 Q48,9 49,14" fill="none" stroke={tp.rim} strokeWidth="3" />
                  <text x="26" y="24" textAnchor="middle" dominantBaseline="middle" fontSize="14">
                    {tp.emoji}
                  </text>
                </svg>

                <p className="text-center text-[9px] font-bold text-white/80">{tp.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div
            className="flex h-28 shrink-0 items-end gap-3 overflow-x-auto border-b-4 border-gray-400 px-4 pb-2"
            style={{ background: 'linear-gradient(180deg,#374151,#4b5563 60%,#6b7280)' }}
          >
            {syrups.map((s) => {
              const w = Math.round(88 * 0.43);

              return (
                <div
                  key={s.id}
                  className={`flex shrink-0 cursor-grab flex-col items-center transition-transform hover:-translate-y-1 hover:scale-105 ${
                    appliedSyrup === s.id ? 'drop-shadow-[0_0_8px_gold]' : ''
                  }`}
                  onPointerDown={(e) => onPointerDown('syrup', s.id, e)}
                >
                  <svg width={w} height={88} viewBox={`0 0 ${w} 88`}>
                    <rect x={w * 0.3} y="0" width={w * 0.4} height={88 * 0.1} rx={w * 0.1} fill={s.cap} />
                    <ellipse cx={w / 2} cy={88 * 0.1} rx={w * 0.22} ry={88 * 0.025} fill={s.cap} />

                    <path
                      d={`M${w * 0.15},${88 * 0.1} Q${w * 0.05},${88 * 0.22} ${w * 0.08},${88 * 0.3} L${w * 0.92},${88 * 0.3} Q${w * 0.95},${88 * 0.22} ${w * 0.85},${88 * 0.1} Z`}
                      fill={s.body}
                    />

                    <rect
                      x={w * 0.08}
                      y={88 * 0.28}
                      width={w * 0.84}
                      height={88 * 0.62}
                      rx={w * 0.1}
                      fill={s.body}
                    />

                    <rect
                      x={w * 0.14}
                      y={88 * 0.15}
                      width={w * 0.16}
                      height={88 * 0.65}
                      rx={w * 0.06}
                      fill="rgba(255,255,255,0.22)"
                    />

                    <circle cx={w / 2} cy={88 * 0.58} r={w * 0.25} fill="rgba(0,0,0,0.18)" />

                    <text x={w / 2} y={88 * 0.62} textAnchor="middle" fontSize={w * 0.37}>
                      {s.emoji}
                    </text>
                  </svg>

                  <p className="text-center text-[8px] text-white/75">{s.label}</p>
                </div>
              );
            })}

            <div
              className={`flex shrink-0 cursor-grab flex-col items-center transition-transform hover:-translate-y-1 hover:scale-105 ${
                whipped ? 'drop-shadow-[0_0_8px_gold]' : ''
              }`}
              onPointerDown={(e) => onPointerDown('whip', 'whip', e)}
            >
              <svg width="38" height="88" viewBox="0 0 38 88">
                <rect x="11" y="0" width="16" height="9" rx="4" fill="#e5e7eb" />
                <ellipse cx="19" cy="9" rx="10" ry="4" fill="#e5e7eb" />
                <rect x="5" y="8" width="28" height="66" rx="10" fill="#f8fafc" />
                <rect x="8" y="8" width="8" height="58" rx="4" fill="rgba(255,255,255,0.35)" />
                <text x="19" y="50" textAnchor="middle" fontSize="18">
                  🍦
                </text>
              </svg>

              <p className="text-center text-[8px] text-white/75">Whip</p>
            </div>
          </div>

          <div
            className="relative flex flex-1 items-center justify-center overflow-hidden"
            style={{
              background:
                'linear-gradient(180deg,#7dd3fc 0%,#38bdf8 40%,#4b5563 40%,#374151 100%)',
            }}
          >
            <div
              ref={sundaeRef}
              className="relative touch-none"
              style={{
                width: sz.svgW + 40,
                height: sz.svgH + 40,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
              }}
            >
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2"
                style={{
                  width: sz.pedW,
                  height: 14,
                  marginBottom: -2,
                  background: 'linear-gradient(180deg,#9ca3af,#6b7280)',
                  borderRadius: '0 0 50% 50%',
                  border: '2px solid #6b7280',
                  borderTop: 'none',
                }}
              />

              <div className="relative" style={{ marginBottom: 14 }}>
                <CupSVG size={size} flavor={flavor} blend={blend} />

                {decorations
                  .filter((d) => d.kind === 'syrup')
                  .map((d) => {
                    const s = syrups.find((x) => x.id === d.value);

                    return (
                      <span
                        key={d.id}
                        className="pointer-events-none absolute"
                        style={{
                          left: `${d.x}%`,
                          top: `${d.y}%`,
                          transform: 'translate(-50%,-50%)',
                        }}
                      >
                        <span
                          className="block h-2 w-8 rounded-full shadow-sm"
                          style={{ background: s?.color }}
                        />
                      </span>
                    );
                  })}

                {decorations
                  .filter((d) => d.kind === 'whip')
                  .slice(-3)
                  .map((d) => (
                    <span
                      key={d.id}
                      className="pointer-events-none absolute text-2xl"
                      style={{
                        left: `${d.x}%`,
                        top: `${d.y}%`,
                        transform: 'translate(-50%,-50%)',
                      }}
                    >
                      ☁️
                    </span>
                  ))}

                {decorations
                  .filter((d) => d.kind === 'topping')
                  .map((d) => {
                    const tp = toppings.find((x) => x.id === d.value);

                    return (
                      <span
                        key={d.id}
                        className="pointer-events-none absolute text-xl"
                        style={{
                          left: `${d.x}%`,
                          top: `${d.y}%`,
                          transform: 'translate(-50%,-50%)',
                        }}
                      >
                        {tp?.emoji}
                      </span>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/10 bg-gray-900 px-6 py-3">
            <button
              onClick={onTrash}
              className="flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-500"
            >
              ✖ Trash
            </button>

            <button
              onClick={onFinish}
              className="flex items-center gap-2 rounded-2xl bg-green-600 px-5 py-2 text-sm font-bold text-white hover:bg-green-500"
            >
              Finish ✔
            </button>
          </div>
        </div>

        <div
          className="flex w-[180px] shrink-0 flex-col overflow-hidden border-l border-white/10"
          style={{ background: 'linear-gradient(180deg,#ffe4e6,#fce7f3)' }}
        >
          {customer && order && (
            <div className="p-2">
              <OrderTicket customer={customer} order={order} />
            </div>
          )}

          <div className="mt-2 px-2 text-center text-[9px] font-bold text-pink-700">
            Applied so far
          </div>

          <div className="space-y-1 px-2 py-1 text-xs">
            {appliedSyrup && (
              <div>
                <p className="text-green-700">✓ {getLabel(syrups, appliedSyrup)}</p>

                <div className="mt-0.5 flex items-center gap-1">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-pink-200">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (syrupCount / (SYRUP_TARGET * 2)) * 100)}%`,
                        background: syrupCountColor(syrupCount),
                      }}
                    />
                  </div>

                  <span
                    className="shrink-0 text-[9px] font-bold"
                    style={{ color: syrupCountColor(syrupCount) }}
                  >
                    {syrupCount}/{SYRUP_TARGET}
                  </span>
                </div>
              </div>
            )}

            {whipped && <p className="text-green-700">✓ Whipped cream</p>}

            {appliedTopping && (
              <div>
                <p className="text-green-700">✓ {getLabel(toppings, appliedTopping)}</p>

                <div className="mt-0.5 flex items-center gap-1">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-pink-200">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (toppingCount / (TOPPING_TARGET * 2)) * 100)}%`,
                        background: toppingCountColor(toppingCount),
                      }}
                    />
                  </div>

                  <span
                    className="shrink-0 text-[9px] font-bold"
                    style={{ color: toppingCountColor(toppingCount) }}
                  >
                    {toppingCount}/{TOPPING_TARGET}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-auto space-y-0.5 px-2 pb-2 text-[9px] text-pink-600">
            <p>🎯 Aim for ~{SYRUP_TARGET} syrup drizzles</p>
            <p>🎯 Aim for ~{TOPPING_TARGET} topping drops</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FreezeriaPage() {
  const [station, setStation] = useState<Station>('home');

  const [queue, setQueue] = useState<Customer[]>(() => createCustomerQueue());
  const [nextCustomerIndex, setNextCustomerIndex] = useState(4);

  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [order, setOrder] = useState<Customer['order'] | null>(null);

  const [size, setSize] = useState<Size | null>(null);
  const [flavor, setFlavor] = useState<string | null>(null);
  const [buildGauge, setBuildGauge] = useState(0);
  const [buildLocked, setBuildLocked] = useState(false);

  const [blend, setBlend] = useState(0);
  const [mixLocked, setMixLocked] = useState(false);
  const [mixing, setMixing] = useState(false);

  const [decorations, setDecorations] = useState<Decoration[]>([]);
  const [activeTool, setActiveTool] = useState<ActiveTool | null>(null);
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });
  const [syrup, setSyrup] = useState<string | null>(null);
  const [topping, setTopping] = useState<string | null>(null);
  const [whipped, setWhipped] = useState(false);

  const [score, setScore] = useState(0);
  const [tips, setTips] = useState(0);
  const [served, setServed] = useState(0);
  const [lastScore, setLastScore] = useState(0);
  const [lastBreakdown, setLastBreakdown] = useState<
    { label: string; val: number; max: number; note?: string }[]
  >([]);

  const [orderElapsed, setOrderElapsed] = useState(0);

  const orderTimerRef = useRef<number | null>(null);
  const orderStartRef = useRef<number>(0);
  const activeToolRef = useRef<ActiveTool | null>(null);
  const lastDropPos = useRef<{ x: number; y: number } | null>(null);
  const buildTimer = useRef<number | null>(null);
  const mixTimer = useRef<number | null>(null);
  const buildPouring = useRef(false);
  const mixBlending = useRef(false);
  const sundaeRef = useRef<HTMLDivElement | null>(null);

  const ticket = activeCustomer;
  const activeOrder = order;
  const canMix = Boolean(size && flavor && buildLocked);
  const canTop = canMix && mixLocked;

  const syrupCount = decorations.filter((d) => d.kind === 'syrup').length;
  const toppingCount = decorations.filter((d) => d.kind === 'topping').length;

  const buildQuality =
    buildGauge >= 45 && buildGauge <= 65 ? 10 : buildGauge >= 30 && buildGauge <= 80 ? 5 : 0;

  const blendQuality = blend >= 45 && blend <= 65 ? 25 : blend >= 30 && blend <= 80 ? 16 : 6;

  function startOrderTimer() {
    orderStartRef.current = Date.now();
    setOrderElapsed(0);

    if (orderTimerRef.current) {
      window.clearInterval(orderTimerRef.current);
    }

    orderTimerRef.current = window.setInterval(() => {
      setOrderElapsed(Math.floor((Date.now() - orderStartRef.current) / 1000));
    }, 500);
  }

  function stopOrderTimer() {
    if (orderTimerRef.current) {
      window.clearInterval(orderTimerRef.current);
      orderTimerRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      if (buildTimer.current) window.clearInterval(buildTimer.current);
      if (mixTimer.current) window.clearInterval(mixTimer.current);
      if (orderTimerRef.current) window.clearInterval(orderTimerRef.current);
    };
  }, []);

  useEffect(() => {
    function onMove(e: globalThis.PointerEvent) {
      setGhostPos({ x: e.clientX, y: e.clientY });

      const tool = activeToolRef.current;

      if (!tool || !sundaeRef.current) return;

      const bounds = sundaeRef.current.getBoundingClientRect();
      const px = ((e.clientX - bounds.left) / bounds.width) * 100;
      const py = ((e.clientY - bounds.top) / bounds.height) * 100;
      const isSyrupZone = px >= 28 && px <= 72 && py >= 10 && py <= 82;
      const isToppingZone = px >= 28 && px <= 72 && py >= 25 && py <= 82;

      if (tool.kind === 'syrup' && isSyrupZone) {
        setDecorations((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            kind: 'syrup',
            value: tool.value,
            x: px,
            y: py,
          },
        ]);

        setSyrup(tool.value);
      } else if (tool.kind === 'whip' && isSyrupZone) {
        setDecorations((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            kind: 'whip',
            value: 'whip',
            x: px,
            y: py,
          },
        ]);

        setWhipped(true);
      } else if (tool.kind === 'topping' && isToppingZone) {
        const last = lastDropPos.current;
        const dist = last ? Math.hypot(px - last.x, py - last.y) : Infinity;

        if (dist >= 9) {
          lastDropPos.current = { x: px, y: py };

          setDecorations((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random()}`,
              kind: 'topping',
              value: tool.value,
              x: px,
              y: py,
            },
          ]);

          setTopping(tool.value);
        }
      }
    }

    function onUp() {
      if (activeToolRef.current) {
        activeToolRef.current = null;
        lastDropPos.current = null;
        setActiveTool(null);
      }

      if (buildPouring.current) {
        buildPouring.current = false;

        if (buildTimer.current) {
          window.clearInterval(buildTimer.current);
          buildTimer.current = null;
        }

        setBuildGauge((v) => {
          if (v >= 5) setBuildLocked(true);
          return v;
        });
      }

      if (mixBlending.current) {
        mixBlending.current = false;

        if (mixTimer.current) {
          window.clearInterval(mixTimer.current);
          mixTimer.current = null;
        }

        setMixing(false);

        setBlend((v) => {
          if (v >= 5) setMixLocked(true);
          return v;
        });
      }
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  function resetOrder() {
    setSize(null);
    setFlavor(null);
    setDecorations([]);
    setActiveTool(null);
    setBuildGauge(0);
    setBuildLocked(false);
    setBlend(0);
    setMixLocked(false);
    setMixing(false);
    setSyrup(null);
    setTopping(null);
    setWhipped(false);

    activeToolRef.current = null;
    lastDropPos.current = null;
  }

  function serveNextCustomer() {
    if (queue.length === 0) return;

    const next = queue[0];

    setActiveCustomer(next);
    setOrder(next.order);
    resetOrder();
    startOrderTimer();
    setStation('build');
  }

  function startBuild() {
    if (!size || !flavor || buildLocked) return;
    if (buildPouring.current) return;

    buildPouring.current = true;

    buildTimer.current = window.setInterval(() => {
      setBuildGauge((v) => {
        if (v >= 100) {
          if (buildTimer.current) window.clearInterval(buildTimer.current);
          buildTimer.current = null;
          buildPouring.current = false;
          setBuildLocked(true);
          return 100;
        }

        return v + 2;
      });
    }, 55);
  }

  function stopBuild() {
    if (!buildPouring.current) return;

    buildPouring.current = false;

    if (buildTimer.current) {
      window.clearInterval(buildTimer.current);
      buildTimer.current = null;
    }

    setBuildGauge((v) => {
      if (v >= 5 && size && flavor) setBuildLocked(true);
      return v;
    });
  }

  function startMix() {
    if (mixLocked || mixBlending.current) return;

    mixBlending.current = true;
    setMixing(true);

    mixTimer.current = window.setInterval(() => {
      setBlend((v) => {
        if (v >= 100) {
          if (mixTimer.current) window.clearInterval(mixTimer.current);
          mixTimer.current = null;
          mixBlending.current = false;
          setMixing(false);
          setMixLocked(true);
          return 100;
        }

        return v + 2;
      });
    }, 55);
  }

  function stopMix() {
    if (!mixBlending.current) return;

    mixBlending.current = false;

    if (mixTimer.current) {
      window.clearInterval(mixTimer.current);
      mixTimer.current = null;
    }

    setMixing(false);

    setBlend((v) => {
      if (v >= 5) setMixLocked(true);
      return v;
    });
  }

  function beginDecoration(kind: ActiveTool['kind'], value: string, e: PointerEvent) {
    e.preventDefault();

    const tool: ActiveTool = { kind, value };

    activeToolRef.current = tool;
    lastDropPos.current = null;
    setGhostPos({ x: e.clientX, y: e.clientY });
    setActiveTool(tool);
  }

  function finishOrder() {
    if (!activeCustomer || !order) return;

    stopOrderTimer();

    const elapsed = Math.floor((Date.now() - orderStartRef.current) / 1000);

    const tScore =
      elapsed <= GRACE_SECS
        ? TIME_MAX_PTS
        : Math.max(
            0,
            Math.round(TIME_MAX_PTS * (1 - (elapsed - GRACE_SECS) / (MAX_SECS - GRACE_SECS))),
          );

    const sScore = quantityScore(syrupCount, SYRUP_TARGET, SYRUP_MAX_PTS, syrup === order.syrup);
    const tpScore = quantityScore(
      toppingCount,
      TOPPING_TARGET,
      TOPPING_MAX_PTS,
      topping === order.topping,
    );

    const rawScore =
      (size === order.size ? 20 : 0) +
      (flavor === order.flavor ? 20 : 0) +
      buildQuality +
      blendQuality +
      sScore +
      tpScore +
      tScore;

    const finalScore = Math.min(
      100,
      activeCustomer.picky ? Math.round(rawScore * 0.92) : rawScore,
    );

    const breakdown: { label: string; val: number; max: number; note?: string }[] = [
      {
        label: 'Cup Size',
        val: size === order.size ? 20 : 0,
        max: 20,
      },
      {
        label: 'Flavor',
        val: flavor === order.flavor ? 20 : 0,
        max: 20,
      },
      {
        label: 'Pour',
        val: buildQuality,
        max: 10,
      },
      {
        label: 'Blend',
        val: blendQuality,
        max: 25,
      },
      {
        label: 'Syrup',
        val: sScore,
        max: SYRUP_MAX_PTS,
        note:
          syrup !== order.syrup
            ? 'wrong type'
            : syrupCount === 0
              ? 'none applied'
              : `${syrupCount} drizzles (aim ${SYRUP_TARGET})`,
      },
      {
        label: 'Topping',
        val: tpScore,
        max: TOPPING_MAX_PTS,
        note:
          topping !== order.topping
            ? 'wrong type'
            : toppingCount === 0
              ? 'none applied'
              : `${toppingCount} drops (aim ${TOPPING_TARGET})`,
      },
      {
        label: 'Speed',
        val: tScore,
        max: TIME_MAX_PTS,
        note: elapsed <= GRACE_SECS ? 'full bonus!' : elapsed >= MAX_SECS ? 'too slow' : `${formatTime(elapsed)}`,
      },
    ];

    setLastScore(finalScore);
    setLastBreakdown(breakdown);
    setScore((v) => v + finalScore);
    setTips((v) => v + (finalScore >= 85 ? 6 : finalScore >= 65 ? 3 : 1));
    setServed((v) => v + 1);
    setStation('score');
  }

  function nextCustomer() {
    setQueue((prev) => {
      const remaining = prev.slice(1);
      return remaining.length === 0 ? createCustomerQueue(nextCustomerIndex) : remaining;
    });
    setNextCustomerIndex((index) => index + 4);
    setActiveCustomer(null);
    setOrder(null);
    resetOrder();
    setOrderElapsed(0);
    setStation('queue');
  }

  function restart() {
    setQueue(createCustomerQueue());
    setNextCustomerIndex(4);

    setActiveCustomer(null);
    setOrder(null);
    resetOrder();
    setScore(0);
    setTips(0);
    setServed(0);
    setLastScore(0);
    setLastBreakdown([]);
    setOrderElapsed(0);
    stopOrderTimer();
    setStation('home');
  }

  const stars = Math.max(1, Math.ceil(lastScore / 20));

  return (
    <AppLayout title="Freezeria">
      <Helmet>
        <title>{freezeria.title} — Intern Break Space</title>
        <meta name="description" content={freezeria.subtitle} />
        <link rel="canonical" href="/freezeria" />
      </Helmet>

      {activeTool && <DragGhost tool={activeTool} pos={ghostPos} />}

      <div
        className="mx-auto max-w-6xl p-4 sm:p-6"
        style={{ userSelect: activeTool ? 'none' : undefined }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <GameBackButton />

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">
              <Star className="mr-1 inline text-primary" size={14} />
              {score}
            </span>

            <span className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">
              Tips ${tips}
            </span>

            <span className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">
              Served {served}
            </span>

            <button
              onClick={restart}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground hover:bg-muted"
            >
              <RotateCcw size={15} />
              <span>{freezeria.buttons.restart}</span>
            </button>
          </div>
        </div>

        <section className="overflow-hidden rounded-[2rem] border-4 border-slate-950 bg-card shadow-[0_18px_0_rgba(0,0,0,0.35),0_28px_45px_rgba(0,0,0,0.35)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted px-5 py-3">
            <div>
              <p className="text-xs font-semibold text-primary">{freezeria.status.day}</p>

              <h1
                className="mt-0.5 text-xl font-bold text-foreground"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {freezeria.title}
              </h1>

              <p className="text-xs text-muted-foreground">{freezeria.subtitle}</p>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Timer size={13} />
              <span>{freezeria.status.patience}</span>

              {station !== 'queue' && station !== 'score' && station !== 'home' && (
                <span
                  className="ml-2 flex items-center gap-1 font-bold"
                  style={{
                    color:
                      orderElapsed <= GRACE_SECS
                        ? '#4ade80'
                        : orderElapsed <= 60
                          ? '#facc15'
                          : '#f87171',
                  }}
                >
                  <Clock size={12} /> {formatTime(orderElapsed)}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col overflow-hidden" style={{ height: 620 }}>
            {station === 'home' && (
              <FreezeriaHomeScreen
                tips={tips}
                served={served}
                score={score}
                onStart={() => setStation('queue')}
              />
            )}

            {station === 'queue' && (
              <QueueScreen
                tips={tips}
                served={served}
                queue={queue}
                onServeNext={serveNextCustomer}
              />
            )}

            {station === 'build' && (
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-hidden">
                  <BuildStation
                    size={size}
                    flavor={flavor}
                    buildGauge={buildGauge}
                    buildLocked={buildLocked}
                    onSize={setSize}
                    onFlavor={setFlavor}
                    onStartPour={startBuild}
                    onStopPour={stopBuild}
                    onNext={() => setStation('mix')}
                    onTrash={resetOrder}
                    customer={ticket}
                    order={activeOrder}
                    elapsed={orderElapsed}
                  />
                </div>

                <StationNav
                  station={station}
                  canMix={canMix}
                  canTop={canTop}
                  onStation={setStation}
                  onFinish={finishOrder}
                />
              </div>
            )}

            {station === 'mix' && (
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-hidden">
                  <MixStation
                    flavor={flavor}
                    blend={blend}
                    mixLocked={mixLocked}
                    mixing={mixing}
                    onStartMix={startMix}
                    onStopMix={stopMix}
                    onNext={() => setStation('top')}
                    onBack={() => setStation('build')}
                    customer={ticket}
                    order={activeOrder}
                    elapsed={orderElapsed}
                  />
                </div>

                <StationNav
                  station={station}
                  canMix={canMix}
                  canTop={canTop}
                  onStation={setStation}
                  onFinish={finishOrder}
                />
              </div>
            )}

            {station === 'top' && (
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-hidden">
                  <TopStation
                    size={size}
                    flavor={flavor}
                    blend={blend}
                    decorations={decorations}
                    sundaeRef={sundaeRef}
                    onPointerDown={beginDecoration}
                    onTrash={resetOrder}
                    onFinish={finishOrder}
                    appliedSyrup={syrup}
                    appliedTopping={topping}
                    whipped={whipped}
                    customer={ticket}
                    order={activeOrder}
                    elapsed={orderElapsed}
                    syrupCount={syrupCount}
                    toppingCount={toppingCount}
                  />
                </div>

                <StationNav
                  station={station}
                  canMix={canMix}
                  canTop={canTop}
                  onStation={setStation}
                  onFinish={finishOrder}
                />
              </div>
            )}

            {station === 'score' && activeCustomer && (
              <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-6 dark:from-pink-950/30 dark:via-purple-950/30 dark:to-blue-950/30">
                <div className="w-full max-w-md rounded-3xl border border-border bg-card p-7 text-center shadow-2xl">
                  <div className="text-5xl">{activeCustomer.emoji}</div>

                  <h2 className="mt-2 text-2xl font-bold text-foreground">
                    Order complete!
                  </h2>

                  <div className="my-2 text-2xl tracking-widest">
                    {'⭐'.repeat(stars)}
                    {'☆'.repeat(5 - stars)}
                  </div>

                  <p className="text-6xl font-black text-primary">
                    {lastScore}
                    <span className="text-2xl text-muted-foreground">/100</span>
                  </p>

                  <div className="my-4 grid grid-cols-3 gap-2 text-xs">
                    {lastBreakdown.map((c) => (
                      <div key={c.label} className="rounded-xl border border-border bg-muted p-2">
                        <p className="text-[9px] text-muted-foreground">{c.label}</p>

                        <p
                          className={`text-lg font-bold ${
                            c.val === c.max
                              ? 'text-green-500'
                              : c.val > 0
                                ? 'text-amber-500'
                                : 'text-red-500'
                          }`}
                        >
                          {c.val}
                        </p>

                        <p className="text-[9px] text-muted-foreground">/{c.max}</p>

                        {c.note && (
                          <p className="mt-0.5 text-[8px] leading-tight text-muted-foreground/70">
                            {c.note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {activeCustomer.picky && (
                    <p className="mb-2 text-xs text-red-400">
                      ⚠️ Picky customer — 8% penalty applied
                    </p>
                  )}

                  <p className="mb-4 text-sm text-muted-foreground">
                    {lastScore >= 85
                      ? freezeria.status.perfect
                      : lastScore >= 60
                        ? freezeria.status.good
                        : freezeria.status.miss}
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={restart}
                      className="flex-1 rounded-xl border border-border bg-muted py-3 font-semibold text-foreground hover:bg-muted/70"
                    >
                      <RotateCcw className="mr-1 inline" size={15} />
                      {freezeria.buttons.restart}
                    </button>

                    {queue.length > 1 ? (
                      <button
                        onClick={nextCustomer}
                        className="flex-1 rounded-xl bg-green-600 py-3 font-bold text-white hover:bg-green-500"
                      >
                        {freezeria.buttons.next} ({queue.length - 1} left)
                      </button>
                    ) : (
                      <button
                        onClick={nextCustomer}
                        className="flex-1 rounded-xl bg-amber-600 py-3 font-bold text-white hover:bg-amber-500"
                      >
                        See Final Score 🏆
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <HowToPlayGuide
          className="mt-4"
          title={freezeria.instructions.title}
          steps={
            (freezeria.instructions.steps ??
            freezeria.instructions.items.map((item, i) => ({
              title: `Tip ${i + 1}`,
              body: item,
              icon: (['trophy', 'trophy', 'trophy'] as const)[i] ?? ('trophy' as const),
            }))) as { title: string; body: string; icon?: 'eye' | 'click' | 'trophy' | 'number' | 'color' | 'shape' | 'fill' }[]
          }
        />
      </div>
    </AppLayout>
  );
}