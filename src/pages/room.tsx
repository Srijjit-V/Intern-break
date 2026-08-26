import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams, Link } from "react-router";
import { saveRoomMembership } from '@/lib/account-api';
import { useSession } from '@/lib/auth/auth-client';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion } from 'motion/react';
import { Ticket, Zap, Users, ArrowRight, ArrowLeft } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PhotoUpload from '@/components/PhotoUpload';
import Logo from '@/components/Logo';
import { syncCompanyMember, loadCompanyData } from '@/lib/company-api';
import { generateRoomCode, getRooms, getRoom, getUser, saveRoom, saveUser, DEFAULT_ROOM_THEME, type IBSRoom, type IBSUser, type IBSRoomTheme } from '@/lib/ibs-store';
const AVATAR_COLORS = ['#0f9f8a', '#f43f5e', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'];

/**
 * Room join / create ticket — only reached from Profile (not the app home).
 */
export default function RoomPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    user: accountUser,
    isPending: isSessionPending
  } = useSession();
  const modeParam = searchParams.get('mode');
  const defaultTab = modeParam === 'create' ? 'create' : 'join';
  const [companyName, setCompanyName] = useState('');
  const [createName, setCreateName] = useState(accountUser?.name ?? '');
  const [createColor, setCreateColor] = useState(AVATAR_COLORS[0]);
  const [createPhoto, setCreatePhoto] = useState<string | null>(null);
  const [createError, setCreateError] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState(accountUser?.name ?? '');
  const [joinColor, setJoinColor] = useState(AVATAR_COLORS[2]);
  const [joinPhoto, setJoinPhoto] = useState<string | null>(null);
  const [joinError, setJoinError] = useState('');
  const [previewTheme, setPreviewTheme] = useState<IBSRoomTheme>(DEFAULT_ROOM_THEME);
  // Guards against double-click/double-tap firing handleCreate or handleJoin
  // twice in a row before the first request finishes — that race was one of
  // the ways a duplicate member row could get created.
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  useEffect(() => {
    // Priority for the join name: an explicit ?name= link param (from a known
    // room card on Profile), then the locally-saved room profile for this
    // exact room code, then the account's display name as a last resort.
    // This is what prevents "Enter room" from creating a duplicate member —
    // previously it always defaulted to the account name, which can differ
    // from the name you actually joined the room under (e.g. "pratsss" vs
    // "Prathiyanka").
    const linkedRoomCode = (searchParams.get('room') ?? '').trim().toUpperCase();
    const nameParam = searchParams.get('name');
    const localUser = getUser();
    const localName = localUser?.roomCode && localUser.roomCode.toUpperCase() === linkedRoomCode ? localUser.name : null;
    const bestName = nameParam || localName || accountUser?.name || '';
    if (bestName) {
      setCreateName(n => n || bestName);
      setJoinName(n => n || bestName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountUser?.name, searchParams]);
  useEffect(() => {
    const storedTheme = localStorage.getItem('ibs-theme');
    const theme = storedTheme === 'dark' ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
    if (!storedTheme) localStorage.setItem('ibs-theme', 'light');
  }, []);
  useEffect(() => {
    const linkedRoomCode = (searchParams.get('room') ?? '').trim().toUpperCase();
    if (/^[A-Z0-9]{6}$/.test(linkedRoomCode)) {
      void handleJoinCodeChange(linkedRoomCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  async function handleJoinCodeChange(val: string) {
    const code = val.toUpperCase();
    setJoinCode(code);
    if (code.length !== 6) {
      setPreviewTheme(DEFAULT_ROOM_THEME);
      return;
    }
    const localRoom = getRoom(code);
    if (localRoom) {
      setPreviewTheme(localRoom.roomTheme ?? DEFAULT_ROOM_THEME);
      return;
    }
    try {
      const response = await fetch(`/api/company?roomCode=${encodeURIComponent(code)}`);
      if (!response.ok) return setPreviewTheme(DEFAULT_ROOM_THEME);
      const data = (await response.json()) as {
        room: {
          companyName: string;
        };
      };
      setPreviewTheme({
        ...DEFAULT_ROOM_THEME,
        spaceName: data.room.companyName
      });
    } catch {
      setPreviewTheme(DEFAULT_ROOM_THEME);
    }
  }
  async function handleCreate() {
    if (isCreating) return;
    setCreateError('');
    if (!companyName.trim()) return setCreateError('Enter your company name.');
    if (!createName.trim()) return setCreateError('Enter your name.');
    setIsCreating(true);
    let code = generateRoomCode();
    const rooms = getRooms();
    while (rooms[code]) code = generateRoomCode();
    const room: IBSRoom = {
      roomCode: code,
      companyName: companyName.trim(),
      members: [{
        name: createName.trim(),
        color: createColor,
        avatarUrl: createPhoto ?? undefined,
        role: 'admin',
        points: 0,
        allTimePoints: 0,
        gold: 0,
        diamonds: 0,
        gameHighScore: 0,
        flappyRunsToday: 0,
        flappyRunDate: '',
        flappyOfficialScore: 0,
        typingHighScore: 0,
        triviaHighScore: 0
      }],
      challenges: {},
      flappyLeaderboard: [],
      createdAt: new Date().toISOString()
    };
    saveRoom(code, room);
    const user: IBSUser = {
      name: createName.trim(),
      color: createColor,
      avatarUrl: createPhoto ?? undefined,
      roomCode: code,
      role: 'admin',
      points: 0,
      allTimePoints: 0,
      gameHighScore: 0,
      flappyRunsToday: 0,
      flappyRunDate: '',
      flappyOfficialScore: 0,
      typingHighScore: 0,
      triviaHighScore: 0,
      gold: 0,
      diamonds: 0
    };
    saveUser(user);
    try {
      await saveRoomMembership({
        roomCode: code,
        companyName: room.companyName ?? '',
        displayName: user.name,
        avatarColor: user.color ?? '#888',
        role: user.role ?? 'admin'
      });
      const response = await fetch('/api/company', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync-member',
          roomCode: code,
          companyName: room.companyName,
          memberName: user.name,
          color: user.color,
          role: user.role,
          points: 0,
          allTimePoints: 0,
          carryoverPoints: 0,
          profile: user
        })
      });
      if (!response.ok) throw new Error('Unable to create shared room');
    } catch {
      setIsCreating(false);
      return setCreateError('Unable to create the shared room. Please try again.');
    }
    navigate('/challenges');
  }
  async function handleJoin() {
    if (isJoining) return;
    setJoinError('');
    const code = joinCode.trim().toUpperCase();
    const typedName = joinName.trim();
    if (code.length !== 6) return setJoinError('Room code must be 6 characters.');
    if (!typedName) return setJoinError('Enter your name.');
    setIsJoining(true);
    try {
      await handleJoinInner(code, typedName);
    } finally {
      setIsJoining(false);
    }
  }
  async function handleJoinInner(code: string, typedName: string) {
    // The authenticated account is the source of truth for a returning member.
    // A display name is profile data and must not be used to claim another
    // person's roster entry when two people share a name.
    const matchesName = (memberName: string) => memberName.toLowerCase() === typedName.toLowerCase();
    const matchesAccount = (member: {
      id?: string;
    }) => Boolean(accountUser?.id && member.id === accountUser.id);
    let room = getRoom(code);
    let existing = room?.members?.find(matchesAccount) ?? room?.members?.find(member => matchesName(member.name));
    if (!room) {
      try {
        const response = await fetch(`/api/company?roomCode=${encodeURIComponent(code)}`);
        if (!response.ok) return setJoinError('Room not found. Check the code and try again.');
        const company = (await response.json()) as {
          room: {
            companyName: string;
          };
          members: Array<{
            name: string;
            color: string;
            role: 'admin' | 'employee';
            points: number;
            allTimePoints: number;
            carryoverPoints: number;
            accountId?: string | null;
          }>;
        };
        room = {
          roomCode: code,
          companyName: company.room.companyName,
          members: company.members.map(member => ({
            ...member,
            // accountId -> id must be mapped here BEFORE the matchesAccount
            // lookup below runs. Without this, the very first time a room is
            // fetched fresh (not yet cached in localStorage), the lookup
            // could only ever match by typed display name — which is how a
            // brand-new joiner's account could get silently merged onto an
            // unrelated existing member row that happens to share a name
            // (e.g. joining as "Grant" lands on the profile someone else
            // created earlier under that name).
            id: member.accountId ?? undefined,
            allTimePoints: Math.max(Number(member.allTimePoints ?? 0), Number(member.carryoverPoints ?? 0)),
            gameHighScore: 0,
            flappyRunsToday: 0,
            flappyRunDate: '',
            flappyOfficialScore: 0,
            typingHighScore: 0,
            triviaHighScore: 0
          })),
          challenges: {},
          flappyLeaderboard: [],
          createdAt: new Date().toISOString()
        };
        // Account match must always win over name match — two people can
        // share a display name, but never an accountId.
        existing = (room.members ?? []).find(matchesAccount) ?? (room.members ?? []).find(member => matchesName(member.name));
      } catch {
        return setJoinError('Unable to reach this room. Please try again.');
      }
    }
    if (!room) return setJoinError('Room not found. Check the code and try again.');

    // Preserve the canonical name/casing already on file for this member —
    // never let a re-entry with slightly different casing rename them or
    // spin up a second profile.
    const name = existing?.name ?? typedName;
    if (!existing) {
      const newMember = {
        name,
        color: joinColor,
        avatarUrl: joinPhoto ?? undefined,
        role: 'employee' as const,
        points: 0,
        allTimePoints: 0,
        gameHighScore: 0,
        flappyRunsToday: 0,
        flappyRunDate: '',
        flappyOfficialScore: 0,
        typingHighScore: 0,
        triviaHighScore: 0,
        gold: 0,
        diamonds: 0
      };
      if (!room.members) room.members = [];
      room.members.push(newMember);
      existing = newMember;
      try {
        await fetch('/api/company', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sync-member',
            roomCode: code,
            companyName: room.companyName,
            memberName: name,
            color: joinColor,
            role: 'employee',
            points: 0,
            allTimePoints: 0,
            carryoverPoints: 0,
            profile: {
              ...newMember,
              id: accountUser?.id,
              roomCode: code
            }
          })
        });
      } catch {
        return setJoinError('Unable to join this room. Please try again.');
      }
    }
    try {
      await saveRoomMembership({
        roomCode: code,
        companyName: room.companyName ?? '',
        displayName: name,
        avatarColor: existing.color ?? '#888',
        role: existing.role ?? 'employee'
      });
      await syncCompanyMember({
        roomCode: code,
        companyName: room.companyName ?? '',
        memberName: name,
        color: existing.color ?? '#888',
        role: existing.role ?? 'employee',
        points: existing.points,
        allTimePoints: existing.allTimePoints,
        carryoverPoints: 0,
        profile: {
          ...existing,
          id: accountUser?.id,
          roomCode: code
        }
      });
      const shared = await loadCompanyData(code);
      // Photos aren't tracked server-side yet, so carry forward whatever we
      // already know locally (freshly picked, or previously saved) per member.
      room.members = (shared.members ?? []).map(member => {
        const memberProfile = member.profile as Partial<IBSUser> | null | undefined;
        return {
          ...memberProfile,
          id: member.accountId ?? undefined,
          name: member.name,
          color: member.color,
          role: member.role,
          points: member.points,
          allTimePoints: Math.max(Number(member.allTimePoints ?? 0), Number(member.carryoverPoints ?? 0)),
          avatarUrl: member.accountId === accountUser?.id ? joinPhoto ?? memberProfile?.avatarUrl ?? existing?.avatarUrl : memberProfile?.avatarUrl,
          gold: Number(memberProfile?.gold ?? 0),
          diamonds: Number(memberProfile?.diamonds ?? 0)
        };
      });
      existing = room.members.find(matchesAccount) ?? room.members.find(member => matchesName(member.name)) ?? existing;
    } catch {
      return setJoinError('Unable to join this room. Please try again.');
    }
    saveRoom(code, room as IBSRoom);
    saveUser({
      ...existing,
      id: accountUser?.id,
      name,
      color: existing.color,
      avatarUrl: joinPhoto ?? existing.avatarUrl,
      roomCode: code,
      role: existing.role,
      points: existing.points,
      allTimePoints: existing.allTimePoints,
      gold: existing.gold ?? 0,
      diamonds: existing.diamonds ?? 0
    });
    navigate('/challenges');
  }
  if (isSessionPending) {
    return <main className="ambient-stage flex min-h-screen items-center justify-center" aria-label="Loading your account">
        <span className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>;
  }
  if (!accountUser) {
    return <Navigate to="/login" replace />;
  }
  return <div className="ambient-stage">
      <Helmet>
        <title>{previewTheme.spaceName} — Join or create a room</title>
        <meta name="description" content="Join or create an Intern Break Space room." />
        <link rel="canonical" href="/room" />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="relative z-10 mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.15fr_0.85fr]">
        <motion.section initial={{
        opacity: 0,
        x: -20
      }} animate={{
        opacity: 1,
        x: 0
      }} transition={{
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1]
      }} className="relative flex flex-col justify-between overflow-hidden bg-[var(--rail)] px-8 py-10 text-[var(--cream)] md:px-12 md:py-14">
          <div className="absolute -right-20 top-16 h-72 w-72 rounded-full bg-primary/35 blur-[80px]" />
          <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-accent/25 blur-[70px]" />
          <div className="absolute right-1/3 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-sky-400/15 blur-[60px]" />

          <div className="relative">
            <Link to="/profile" className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 transition hover:bg-white/15">
              <ArrowLeft size={14} aria-hidden="true" />
              Back to profile
            </Link>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-md"><Logo size={56} /></span>
              Break Room Club
            </div>
            <h1 className="max-w-xl text-5xl font-bold leading-[0.95] md:text-6xl xl:text-7xl" style={{
            fontFamily: 'var(--font-heading)'
          }}>
              Grab your ticket.
              <span className="mt-2 block text-primary">Enter the room.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-white/70 md:text-lg">
              Challenges, arcade cabinets, leaderboards, and rewards for intern teams who want breaks that feel alive.
            </p>
          </div>

          <div className="relative mt-12 grid gap-3 sm:grid-cols-3">
            {[{
            t: 'Daily quests',
            d: 'Earn points with your crew',
            i: Zap
          }, {
            t: 'Live arcade',
            d: 'Nine games on the floor',
            i: Ticket
          }, {
            t: 'Shared rooms',
            d: 'One code. Any device.',
            i: Users
          }].map((item, idx) => <motion.div key={item.t} initial={{
            opacity: 0,
            y: 14
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            delay: 0.18 + idx * 0.07,
            duration: 0.45,
            ease: [0.22, 1, 0.36, 1]
          }} className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                <item.i size={18} className="mb-3 text-primary" aria-hidden="true" />
                <p className="text-sm font-bold">{item.t}</p>
                <p className="mt-1 text-xs text-white/55">{item.d}</p>
              </motion.div>)}
          </div>
        </motion.section>

        <motion.section initial={{
        opacity: 0,
        y: 24
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.55,
        delay: 0.1,
        ease: [0.22, 1, 0.36, 1]
      }} className="flex items-center justify-center p-5 sm:p-8 lg:p-10">
          <div className="w-full max-w-md">
            <div className="ticket">
              <div className="flex items-center justify-between border-b border-dashed border-border px-5 py-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Admit one</p>
                  <p className="text-lg font-extrabold" style={{
                  fontFamily: 'var(--font-heading)'
                }}>{previewTheme.spaceName}</p>
                </div>
                <Ticket className="text-primary" size={28} aria-hidden="true" />
              </div>

              <div className="surface-pad">
                <Tabs defaultValue={defaultTab}>
                  <TabsList className="mb-5 grid h-11 w-full grid-cols-2 rounded-full bg-muted p-1">
                    <TabsTrigger value="join" className="rounded-full text-sm font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm">Join</TabsTrigger>
                    <TabsTrigger value="create" className="rounded-full text-sm font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm">Create</TabsTrigger>
                  </TabsList>

                  <TabsContent value="join" className="mt-0 space-y-4">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Room code</label>
                      <Input placeholder="AB3X7K" value={joinCode} onChange={e => handleJoinCodeChange(e.target.value.slice(0, 6))} className="h-12 rounded-2xl border-border bg-muted font-mono text-lg uppercase tracking-[0.28em]" maxLength={6} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Your name</label>
                      <Input placeholder="Alex" value={joinName} onChange={e => setJoinName(e.target.value)} className="h-12 rounded-2xl border-border bg-muted" />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Color</label>
                        <div className="flex gap-2">
                          {AVATAR_COLORS.map(c => <button key={c} type="button" onClick={() => setJoinColor(c)} className="pressable h-8 w-8 rounded-full ring-offset-2" style={{
                          background: c,
                          boxShadow: joinColor === c ? `0 0 0 2px var(--cream), 0 0 0 4px ${c}` : undefined
                        }} aria-label={`Color ${c}`} />)}
                        </div>
                      </div>
                      <PhotoUpload value={joinPhoto} onChange={setJoinPhoto} name={joinName} color={joinColor} size={64} label="Photo" />
                    </div>
                    {joinError && <p className="rounded-2xl bg-destructive px-3 py-2 text-xs font-bold text-destructive-foreground">{joinError}</p>}
                    <Button onClick={handleJoin} disabled={isJoining} className="h-12 w-full rounded-full text-sm font-bold">
                      {isJoining ? 'Entering…' : <>Enter room <ArrowRight size={16} aria-hidden="true" /></>}
                    </Button>
                  </TabsContent>

                  <TabsContent value="create" className="mt-0 space-y-4">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Company</label>
                      <Input placeholder="Acme Corp" value={companyName} onChange={e => setCompanyName(e.target.value)} className="h-12 rounded-2xl border-border bg-muted" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Your name</label>
                      <Input placeholder="Jordan" value={createName} onChange={e => setCreateName(e.target.value)} className="h-12 rounded-2xl border-border bg-muted" />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Color</label>
                        <div className="flex gap-2">
                          {AVATAR_COLORS.map(c => <button key={c} type="button" onClick={() => setCreateColor(c)} className="pressable h-8 w-8 rounded-full" style={{
                          background: c,
                          boxShadow: createColor === c ? `0 0 0 2px var(--cream), 0 0 0 4px ${c}` : undefined
                        }} aria-label={`Color ${c}`} />)}
                        </div>
                      </div>
                      <PhotoUpload value={createPhoto} onChange={setCreatePhoto} name={createName} color={createColor} size={64} label="Photo" />
                    </div>
                    {createError && <p className="rounded-2xl bg-destructive px-3 py-2 text-xs font-bold text-destructive-foreground">{createError}</p>}
                    <Button onClick={handleCreate} disabled={isCreating} className="h-12 w-full rounded-full text-sm font-bold">
                      {isCreating ? 'Creating…' : <>Create room <ArrowRight size={16} aria-hidden="true" /></>}
                    </Button>
                    <p className="text-center text-[11px] text-muted-foreground">You will get a 6-character room code to share.</p>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="ticket-stub flex items-center justify-between px-5 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <span>Keep this stub</span>
                <span className="font-mono text-foreground">{joinCode || '------'}</span>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>;
}
