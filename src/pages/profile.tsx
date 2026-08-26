import { useEffect, useState } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { Building2, DoorOpen, KeyRound, LogIn, Loader2, Mail, PlusCircle, Trash2, UserRound } from 'lucide-react';
import { Navigate, useNavigate } from "react-router";
import { changePassword, LogoutButton, useSession } from '@/lib/auth/auth-client';
import { leaveRoomMembership, loadAccountProfile, saveRoomMembership, type AccountRoomHistory } from '@/lib/account-api';
import { clearUser, getUser, getRoom, saveRoom, saveUser, setUserAvatarUrl, type IBSUser, type IBSRoom } from '@/lib/ibs-store';
import { loadCompanyData, syncCompanyMember } from '@/lib/company-api';
import PhotoUpload from '@/components/PhotoUpload';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
export default function ProfilePage() {
  const {
    user,
    isPending
  } = useSession();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<AccountRoomHistory[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [error, setError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [removingRoom, setRemovingRoom] = useState<string | null>(null);
  const [enteringRoom, setEnteringRoom] = useState<string | null>(null);
  const [ibsUser, setIbsUser] = useState<IBSUser | null>(null);
  const [enterRoomOpen, setEnterRoomOpen] = useState(false);
  useEffect(() => {
    setIbsUser(getUser());
  }, []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    void loadAccountProfile().then(result => {
      if (active) setRooms(result.rooms.filter(room => !room.leftAt));
    }).catch(() => {
      if (active) setError('Your room list could not be loaded right now.');
    }).finally(() => {
      if (active) setLoadingRooms(false);
    });
    return () => {
      active = false;
    };
  }, [user]);
  async function handlePasswordChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordStatus('');
    if (newPassword.length < 8) {
      setPasswordStatus('Use at least 8 characters for your new password.');
      return;
    }
    setPasswordBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setPasswordStatus('Password updated successfully.');
    } catch (changeError) {
      setPasswordStatus(changeError instanceof Error ? changeError.message : 'Unable to update password.');
    } finally {
      setPasswordBusy(false);
    }
  }
  async function handleDirectEnterRoom(room: AccountRoomHistory) {
    if (!user) return;
    setEnteringRoom(room.roomCode);
    try {
      // Fetch the latest member data from the server
      const shared = await loadCompanyData(room.roomCode);
      // Account identity is the source of truth. A display name can change or
      // be shared by two people, but the signed-in account always maps back to
      // the same room profile.
      const memberRecord = shared.members.find(member => member.accountId === user.id) ?? shared.members.find(member => member.name === room.displayName) ?? shared.members.find(member => member.name.toLowerCase() === room.displayName.toLowerCase());
      const savedProfile = memberRecord?.profile as Partial<IBSUser> | null | undefined;
      const cachedRoomMember = getRoom(room.roomCode)?.members?.find(member => member.id === user.id || member.name.toLowerCase() === room.displayName.toLowerCase());
      const canonicalName = memberRecord?.name ?? room.displayName;
      const color = memberRecord?.color ?? room.avatarColor ?? '#1BDBDB';
      const role = memberRecord?.role ?? room.role ?? 'employee';
      const points = memberRecord?.points ?? 0;
      const allTimePoints = Math.max(Number(memberRecord?.allTimePoints ?? 0), Number(memberRecord?.carryoverPoints ?? 0));

      // Prefer the room's saved profile. This keeps room-specific gold,
      // diamonds, avatar, and game progress intact after visiting the main profile.
      const localUser = getUser();
      const avatarUrl = savedProfile?.avatarUrl ?? cachedRoomMember?.avatarUrl ?? (localUser?.roomCode === room.roomCode ? localUser.avatarUrl : undefined) ?? undefined;
      const gold = Math.max(Number(savedProfile?.gold ?? 0), Number(cachedRoomMember?.gold ?? 0), Number(localUser?.roomCode === room.roomCode ? localUser.gold ?? 0 : 0));
      const diamonds = Math.max(Number(savedProfile?.diamonds ?? 0), Number(cachedRoomMember?.diamonds ?? 0), Number(localUser?.roomCode === room.roomCode ? localUser.diamonds ?? 0 : 0));

      // Rebuild the local room cache from server data
      const localRoom = getRoom(room.roomCode);
      const updatedRoom: IBSRoom = {
        ...(localRoom ?? {}),
        roomCode: room.roomCode,
        companyName: room.companyName,
        members: shared.members.map(m => {
          const memberProfile = m.profile as Partial<IBSUser> | null | undefined;
          return {
            ...memberProfile,
            id: m.accountId ?? undefined,
            name: m.name,
            color: m.color,
            role: m.role,
            points: m.points,
            allTimePoints: Math.max(Number(m.allTimePoints ?? 0), Number(m.carryoverPoints ?? 0)),
            avatarUrl: m.accountId === user.id ? avatarUrl : memberProfile?.avatarUrl,
            gold: m.accountId === user.id ? gold : Number(memberProfile?.gold ?? 0),
            diamonds: m.accountId === user.id ? diamonds : Number(memberProfile?.diamonds ?? 0)
          };
        }),
        challenges: localRoom?.challenges ?? {},
        flappyLeaderboard: localRoom?.flappyLeaderboard ?? [],
        createdAt: localRoom?.createdAt ?? new Date().toISOString()
      };
      saveRoom(room.roomCode, updatedRoom);

      // Restore the user session in localStorage
      const restoredUser: IBSUser = {
        ...savedProfile,
        id: user.id,
        name: canonicalName,
        color,
        avatarUrl,
        roomCode: room.roomCode,
        role,
        points,
        allTimePoints,
        gold,
        diamonds
      };
      saveUser(restoredUser);

      // Sync membership record so the server knows we're active
      await saveRoomMembership({
        roomCode: room.roomCode,
        companyName: room.companyName,
        displayName: canonicalName,
        avatarColor: color,
        role
      });
      await syncCompanyMember({
        roomCode: room.roomCode,
        companyName: room.companyName,
        memberName: canonicalName,
        color,
        role,
        points,
        allTimePoints,
        carryoverPoints: 0,
        profile: restoredUser
      });
      navigate('/challenges');
    } catch {
      setError('Unable to enter that room right now. Please try again.');
    } finally {
      setEnteringRoom(null);
    }
  }
  async function handleRemoveRoom(room: AccountRoomHistory) {
    if (!window.confirm(`Remove yourself from ${room.companyName}? This permanently removes your room membership and room profile.`)) return;
    setRemovingRoom(room.roomCode);
    try {
      await leaveRoomMembership(room.roomCode);
      if (getUser()?.roomCode === room.roomCode) clearUser();
      setRooms(current => current.filter(item => item.roomCode !== room.roomCode));
    } catch {
      setError('Unable to remove that room right now.');
    } finally {
      setRemovingRoom(null);
    }
  }
  if (isPending) {
    return <main className="ambient-stage flex min-h-screen items-center justify-center" aria-label="Loading your account">
        <span className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>
      <Helmet>
        <title>My Account | Intern Break Space</title>
        <meta name="description" content="Manage your Intern Break Space account and view the rooms you belong to." />
        <link rel="canonical" href="/profile" />
        <meta name="robots" content="noindex" />
      </Helmet>
      <main className="ambient-stage min-h-screen px-4 py-10">
        <section className="mx-auto w-full max-w-3xl space-y-5">
          <header className="landing-hero-panel rounded-3xl p-7 shadow-lg sm:p-9">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <UserRound size={30} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-muted-foreground">Main account</p>
                <h1 className="landing-hero-title mt-1 break-words text-3xl font-bold" style={{
                fontFamily: 'var(--font-heading)'
              }}>{user.name || 'Intern Break Space member'}</h1>
                <p className="landing-hero-copy mt-2 break-all text-sm">{user.email}</p>
              </div>
              <LogoutButton className="pressable inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition hover:bg-destructive hover:text-destructive-foreground">
                <DoorOpen size={15} aria-hidden="true" />
                Sign out
              </LogoutButton>
            </div>
          </header>

          {ibsUser?.roomCode && <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                <PhotoUpload value={ibsUser.avatarUrl} onChange={(dataUrl: string | null) => setIbsUser(setUserAvatarUrl(dataUrl))} name={ibsUser.name} color={ibsUser.color as string | undefined} size={72} label="Room photo" />
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <h2 className="text-lg font-bold text-foreground">Room avatar</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This photo shows up next to your name in the header, leaderboard, and closet for everyone in your room.
                  </p>
                </div>
              </div>
            </section>}

          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-bold text-foreground">Account settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your sign-in details are separate from every room profile.</p>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-muted p-4">
                <div className="flex items-center gap-2 text-foreground"><Mail size={17} aria-hidden="true" /><h3 className="font-semibold">Email address</h3></div>
                <p className="mt-2 break-all text-sm text-muted-foreground">{user.email}</p>
                <p className="mt-3 text-xs text-muted-foreground">Email changes are not available yet.</p>
              </div>
              <form onSubmit={handlePasswordChange} className="rounded-2xl border border-border bg-muted p-4">
                <div className="flex items-center gap-2 text-foreground"><KeyRound size={17} aria-hidden="true" /><h3 className="font-semibold">Change password</h3></div>
                <label className="mt-3 block text-xs font-semibold text-muted-foreground" htmlFor="current-password">Current password</label>
                <input id="current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground" />
                <label className="mt-3 block text-xs font-semibold text-muted-foreground" htmlFor="new-password">New password</label>
                <input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={event => setNewPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground" />
                {passwordStatus && <p className="mt-2 text-xs text-muted-foreground" role="status">{passwordStatus}</p>}
                <button type="submit" disabled={passwordBusy} className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60">{passwordBusy ? 'Updating…' : 'Update password'}</button>
              </form>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Your rooms</h2>
                <p className="mt-1 text-sm text-muted-foreground">Create or enter a room here — this is the only place that opens the ticket lobby.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setEnterRoomOpen(true)} className="pressable rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:bg-secondary">
                  Enter a room
                </button>
              </div>
            </div>

            {loadingRooms ? <div className="flex justify-center py-10"><span className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div> : error ? <p className="mt-5 rounded-xl bg-destructive px-4 py-3 text-sm font-semibold text-destructive-foreground">{error}</p> : rooms.length === 0 ? <p className="mt-5 rounded-2xl bg-muted p-5 text-sm text-muted-foreground">You have not joined any rooms yet. Tap <button type="button" onClick={() => setEnterRoomOpen(true)} className="font-bold text-primary hover:underline">Enter a room</button> to join or create one.</p> : <div className="mt-5 grid grid-cols-1 gap-3">
                {rooms.map(room => <article key={room.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-muted p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Building2 size={19} aria-hidden="true" /></div>
                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-foreground">{room.companyName}</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">Room code: {room.roomCode}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void handleDirectEnterRoom(room)} disabled={enteringRoom === room.roomCode} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-center text-sm font-bold text-foreground transition hover:bg-muted disabled:opacity-60">
                        {enteringRoom === room.roomCode ? <><Loader2 size={14} className="animate-spin" />Entering…</> : 'Enter room'}
                      </button>
                      <button type="button" onClick={() => void handleRemoveRoom(room)} disabled={removingRoom === room.roomCode} className="inline-flex items-center justify-center gap-1 rounded-full border border-destructive bg-card px-4 py-2 text-sm font-bold text-destructive transition hover:bg-destructive hover:text-destructive-foreground disabled:opacity-60"><Trash2 size={15} aria-hidden="true" />{removingRoom === room.roomCode ? 'Removing…' : 'Remove me'}</button>
                    </div>
                  </article>)}
              </div>}
          </section>
        </section>
      </main>

      <Dialog open={enterRoomOpen} onOpenChange={setEnterRoomOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join or create a room</DialogTitle>
            <DialogDescription>Pick one — you can always add more rooms later.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => {
            setEnterRoomOpen(false);
            setTimeout(() => navigate('/room?mode=join'), 0);
          }} className="pressable flex flex-col items-center gap-2 rounded-2xl border border-border bg-muted p-5 text-center transition hover:border-primary hover:bg-primary/10">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <LogIn size={20} aria-hidden="true" />
              </span>
              <span className="font-bold text-foreground">Join a room</span>
              <span className="text-xs text-muted-foreground">Have a 6-character room code? Hop in.</span>
            </button>
            <button type="button" onClick={() => {
            setEnterRoomOpen(false);
            setTimeout(() => navigate('/room?mode=create'), 0);
          }} className="pressable flex flex-col items-center gap-2 rounded-2xl border border-border bg-muted p-5 text-center transition hover:border-primary hover:bg-primary/10">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <PlusCircle size={20} aria-hidden="true" />
              </span>
              <span className="font-bold text-foreground">Create a room</span>
              <span className="text-xs text-muted-foreground">Start a fresh room for your team.</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>;
}
