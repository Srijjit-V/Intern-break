import { Navigate } from "react-router";
import { useSession } from '@/lib/auth/auth-client';
import { getUser } from '@/lib/ibs-store';

/**
 * App entry — never the room ticket lobby.
 * Not signed in → email login.
 * Signed in + active room → challenges.
 * Signed in, no room → profile (create / enter room from there).
 */
export default function HomePage() {
  const {
    user: accountUser,
    isPending
  } = useSession();
  if (isPending) {
    return <main className="ambient-stage flex min-h-screen items-center justify-center" aria-label="Loading">
        <span className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>;
  }
  if (!accountUser) {
    return <Navigate to="/login" replace />;
  }
  const roomUser = getUser();
  if (roomUser?.roomCode) {
    return <Navigate to="/challenges" replace />;
  }
  return <Navigate to="/profile" replace />;
}
