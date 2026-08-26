import {
  Bird,
  Brain,
  CarFront,
  CircleHelp,
  IceCreamBowl,
  Keyboard,
  Shapes,
  Worm,
  type LucideIcon,
} from 'lucide-react';

export const GAME_IDS = [
  'flappy',
  'freezeria',
  'snake',
  'memory',
  'trivia',
  'set',
  'crossy',
  'typing',
  'typing-race',
] as const;

export type GameId = (typeof GAME_IDS)[number];

export interface GameMetadata {
  id: GameId;
  path: string;
  legacyName?: string;
  name: string;
  shortName: string;
  description: string;
  concept: string;
  accent: string;
  icon: LucideIcon;
  iconClassName: string;
  thumbnail: string;
  live: boolean;
}

export const GAME_REGISTRY: Record<GameId, GameMetadata> = {
  flappy: {
    id: 'flappy', path: '/flappy', name: 'Flappy Bird', shortName: 'Flappy',
    description: "Tap to flap through the pipes. Don't crash.",
    concept: 'Arcade flight challenge', accent: '#38bdf8', icon: Bird, iconClassName: 'text-sky-600', thumbnail: '/airo-assets/images/games/flappy-thumbnail', live: true,
  },
  freezeria: {
    id: 'freezeria', path: '/freezeria', name: "Papa's Freezeria", shortName: 'Freezeria',
    description: 'Build sundaes, take orders, and keep the line moving.',
    concept: 'Sundae shop challenge', accent: '#fb7185', icon: IceCreamBowl, iconClassName: 'text-pink-600', thumbnail: '/airo-assets/images/games/freezeria-thumbnail', live: true,
  },
  snake: {
    id: 'snake', path: '/snake', name: 'Snake', shortName: 'Snake',
    description: "Eat apples, grow longer, and don't bite yourself.",
    concept: 'Classic arcade challenge', accent: '#10b981', icon: Worm, iconClassName: 'text-emerald-600', thumbnail: '/airo-assets/images/games/snake-thumbnail', live: true,
  },
  memory: {
    id: 'memory', path: '/memory', name: 'Memory Match', shortName: 'Memory',
    description: 'Flip cards and find matching pairs.',
    concept: 'Card matching challenge', accent: '#a78bfa', icon: Brain, iconClassName: 'text-violet-600', thumbnail: '/airo-assets/images/games/memory-thumbnail', live: true,
  },
  trivia: {
    id: 'trivia', path: '/trivia', name: 'Trivia Blitz', shortName: 'Trivia',
    description: 'Answer fast and climb the high-score board.',
    concept: 'Fast trivia challenge', accent: '#fbbf24', icon: CircleHelp, iconClassName: 'text-amber-600', thumbnail: '/airo-assets/images/games/trivia-thumbnail', live: true,
  },
  set: {
    id: 'set', path: '/set', name: 'Set with Friends', shortName: 'Set',
    description: 'Find sets of three cards before time runs out.',
    concept: 'Pattern-matching challenge', accent: '#e879f9', icon: Shapes, iconClassName: 'text-rose-600', thumbnail: '/airo-assets/images/games/set-with-friends-thumbnail', live: true,
  },
  crossy: {
    id: 'crossy', path: '/crossy', name: 'Crossy Road', shortName: 'Crossy',
    description: 'Cross the road, dodge traffic, and keep hopping.',
    concept: 'Road-crossing challenge', accent: '#fb923c', icon: Bird, iconClassName: 'text-orange-600', thumbnail: '/airo-assets/images/games/crossy-thumbnail', live: true,
  },
  typing: {
    id: 'typing', path: '/typing', name: 'Speed Typing', shortName: 'Typing',
    description: 'Type as fast and accurately as you can.',
    concept: 'Typing speed challenge', accent: '#6366f1', icon: Keyboard, iconClassName: 'text-indigo-600', thumbnail: '/airo-assets/images/games/typing-thumbnail', live: true,
  },
  'typing-race': {
    id: 'typing-race', path: '/typing-race', name: 'Typing Race', shortName: 'Race',
    description: 'Pick a car, race your room, and use nitro to clear tough words.',
    concept: 'Competitive typing race', accent: '#0891b2', icon: CarFront, iconClassName: 'text-cyan-700', thumbnail: '/airo-assets/images/games/typing-race-thumbnail', live: true,
  },
};

export const GAME_LIST = GAME_IDS.map((id) => GAME_REGISTRY[id]);

export const LEGACY_GAME_NAME_MAP = Object.fromEntries(
  GAME_LIST.flatMap((game) => game.legacyName ? [[game.legacyName, game.name]] : []),
) as Record<string, string>;

export function getGameMetadata(id: GameId): GameMetadata {
  return GAME_REGISTRY[id];
}

export function getGameMetadataByPath(path: string): GameMetadata | undefined {
  return GAME_LIST.find((game) => game.path === path);
}

export const DEFAULT_PINNED_GAMES: GameId[] = ['flappy', 'freezeria', 'trivia', 'typing'];
