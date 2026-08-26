import { RouteObject } from "react-router";
import { lazy, createElement } from 'react';
import HomePage from './pages/index';
import ProdNotFoundPage from './pages/_404';
const NotFoundPage = ProdNotFoundPage;
const ChallengesPage = lazy(() => import('./pages/challenges'));
const LeaderboardPage = lazy(() => import('./pages/leaderboard'));
const PointsHistoryPage = lazy(() => import('./pages/points-history'));
const RewardsPage = lazy(() => import('./pages/rewards'));
const GamesPage = lazy(() => import('./pages/games'));
const FlappyPage = lazy(() => import('./pages/flappy'));
const TypingPage = lazy(() => import('./pages/typing'));
const TypingRacePage = lazy(() => import('./pages/typing-race'));
const FreezeriaPage = lazy(() => import('./pages/freezeria'));
const SnakePage = lazy(() => import('./pages/snake'));
const MemoryPage = lazy(() => import('./pages/memory'));
const TriviaPage = lazy(() => import('./pages/trivia'));
const SetPage = lazy(() => import('./pages/set'));
const CrossyPage = lazy(() => import('./pages/crossy'));
const ProfilePage = lazy(() => import('./pages/profile'));
const AdminPage = lazy(() => import('./pages/admin'));
const AvatarShopPage = lazy(() => import('./pages/avatar-shop'));
export const routes: RouteObject[] = [{
  path: '/',
  element: createElement(HomePage)
}, {
  path: '/challenges',
  element: createElement(ChallengesPage)
}, {
  path: '/leaderboard',
  element: createElement(LeaderboardPage)
}, {
  path: '/points-history',
  element: createElement(PointsHistoryPage)
}, {
  path: '/rewards',
  element: createElement(RewardsPage)
}, {
  path: '/closet',
  element: createElement(AvatarShopPage)
}, {
  path: '/games',
  element: createElement(GamesPage)
}, {
  path: '/flappy',
  element: createElement(FlappyPage)
}, {
  path: '/typing',
  element: createElement(TypingPage)
}, {
  path: '/typing-race',
  element: createElement(TypingRacePage)
}, {
  path: '/freezeria',
  element: createElement(FreezeriaPage)
}, {
  path: '/snake',
  element: createElement(SnakePage)
}, {
  path: '/memory',
  element: createElement(MemoryPage)
}, {
  path: '/trivia',
  element: createElement(TriviaPage)
}, {
  path: '/set',
  element: createElement(SetPage)
}, {
  path: '/crossy',
  element: createElement(CrossyPage)
}, {
  path: '/profile',
  element: createElement(ProfilePage)
}, {
  path: '/admin',
  element: createElement(AdminPage)
}, {
  path: '*',
  element: createElement(NotFoundPage)
}];
export type Path = '/' | '/challenges' | '/leaderboard' | '/points-history' | '/rewards' | '/games' | '/flappy' | '/typing' | '/typing-race' | '/freezeria' | '/snake' | '/memory' | '/trivia' | '/profile' | '/admin';
export type Params = Record<string, string | undefined>;
