import { Gamepad2, type LucideIcon } from 'lucide-react';
import { GAME_LIST, GAME_REGISTRY, type GameId } from '@/lib/game-registry';

export type GameIconKey = 'all-games' | GameId;

export interface GameIconDefinition {
  icon: LucideIcon;
  className: string;
}

export const gameIcons: Record<GameIconKey, GameIconDefinition> = {
  'all-games': { icon: Gamepad2, className: 'text-foreground' },
  ...Object.fromEntries(
    GAME_LIST.map((game) => [game.id, { icon: game.icon, className: game.iconClassName }]),
  ) as Record<GameId, GameIconDefinition>,
};

export type PlayableGameId = GameId;

export interface GameRegistryEntry {
  id: GameId;
  path: string;
  label: string;
  short: string;
}

export const GAME_REGISTRY_ENTRIES: GameRegistryEntry[] = GAME_LIST.map((game) => ({
  id: game.id,
  path: game.path,
  label: game.name,
  short: game.shortName,
}));

export { GAME_REGISTRY };
export { DEFAULT_PINNED_GAMES } from '@/lib/game-registry';
