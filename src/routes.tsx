import { Navigate, RouteObject } from "react-router";
import { lazy } from 'react';
import ProdNotFoundPage from './pages/_404';
import { ProtectedRoute, useSession } from './lib/auth/auth-client';
import { getUser } from './lib/ibs-store';
const protectedPage = (page: React.ReactNode) => <ProtectedRoute>{page}</ProtectedRoute>;

/** Smart root redirect:
 *  - logged out → /login
 *  - logged in + has room in localStorage → /challenges
 *  - logged in, no room → /profile
 */
function RootRedirect() {
  const {
    isAuthenticated,
    isPending
  } = useSession();
  if (isPending) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const user = getUser();
  if (user?.roomCode) return <Navigate to="/challenges" replace />;
  return <Navigate to="/profile" replace />;
}
const NotFoundPage = ProdNotFoundPage;
const RoomPage = lazy(() => import('./pages/room'));
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
const LoginPage = lazy(() => import('./pages/login'));
const SignupPage = lazy(() => import('./pages/signup'));
const AvatarShopPage = lazy(() => import('./pages/avatar-shop'));
export const routes: RouteObject[] = [{
  path: '/',
  element: <RootRedirect />
}, {
  path: '/room',
  element: protectedPage(<RoomPage />)
}, {
  path: '/rooms',
  element: protectedPage(<RoomPage />)
}, {
  path: '/login',
  element: <LoginPage />
}, {
  path: '/signup',
  element: <SignupPage />
}, {
  path: '/challenges',
  element: protectedPage(<ChallengesPage />)
}, {
  path: '/leaderboard',
  element: protectedPage(<LeaderboardPage />)
}, {
  path: '/weekly-recap',
  element: protectedPage(<Navigate to="/leaderboard?tab=week" replace />)
}, {
  path: '/points-history',
  element: protectedPage(<PointsHistoryPage />)
}, {
  path: '/rewards',
  element: protectedPage(<RewardsPage />)
}, {
  path: '/closet',
  element: protectedPage(<AvatarShopPage />)
}, {
  path: '/games',
  element: protectedPage(<GamesPage />)
}, {
  path: '/flappy',
  element: protectedPage(<FlappyPage />)
}, {
  path: '/typing',
  element: protectedPage(<TypingPage />)
}, {
  path: '/typing-race',
  element: protectedPage(<TypingRacePage />)
}, {
  path: '/freezeria',
  element: protectedPage(<FreezeriaPage />)
}, {
  path: '/snake',
  element: protectedPage(<SnakePage />)
}, {
  path: '/memory',
  element: protectedPage(<MemoryPage />)
}, {
  path: '/trivia',
  element: protectedPage(<TriviaPage />)
}, {
  path: '/set',
  element: protectedPage(<SetPage />)
}, {
  path: '/crossy',
  element: protectedPage(<CrossyPage />)
}, {
  path: '/profile',
  element: protectedPage(<ProfilePage />)
}, {
  path: '/admin',
  element: protectedPage(<AdminPage />)
}, {
  path: '*',
  element: <NotFoundPage />
}];
export type Path = '/' | '/login' | '/rooms' | '/signup' | '/challenges' | '/leaderboard' | '/weekly-recap' | '/points-history' | '/rewards' | '/games' | '/flappy' | '/typing' | '/typing-race' | '/freezeria' | '/snake' | '/memory' | '/trivia' | '/profile' | '/admin';
export type Params = Record<string, string | undefined>;
