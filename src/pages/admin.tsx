import { useEffect, useState, useCallback } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion } from 'motion/react';
import {
  ShieldCheck, Lock, Users, Zap, RefreshCw, Copy, Check,
  Trash2, Crown, CheckCircle2, Palette, Gift,
} from 'lucide-react';
import AppLayout from '@/layouts/AppLayout';
import { useTheme } from '@/lib/use-theme';
import {
  getUser, getRoom, saveRoom, saveUser, todayStr,
  getPersonalChallengeStatus, applyRoomTheme, DEFAULT_ROOM_THEME,
  type IBSUser, type IBSRoom, type IBSMember, type IBSCompanyChallenge, type IBSRoomTheme,
} from '@/lib/ibs-store';
import { fulfillCompanyRedemption, loadCompanyData, syncCompanyMember, updateCompanyRole, type SharedRedemption } from '@/lib/company-api';

const COMPANY_POOL = [
  'Post a GIF in Slack that describes your mood',
  'Share your current desktop wallpaper',
  'React to everyone\'s last message with an emoji',
  'Share your go-to productivity tip',
  'Post a photo of your workspace setup',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function Avatar({ name, color, size = 8 }: { name: string; color?: string; size?: number }) {
  return (
    <div
      className={`flex items-center justify-center w-${size} h-${size} rounded-full text-xs font-bold text-white shrink-0`}
      style={{ background: color ?? '#888' }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function CopyChip({ value, label = 'Copy value' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      onClick={handleCopy}
      aria-label={label}
      className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 font-mono text-sm font-bold text-secondary-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {value}
      {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
    </button>
  );
}

export default function AdminPage() {
  const [user, setUser] = useState<IBSUser | null>(null);
  const [room, setRoom] = useState<IBSRoom | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);
  const [ccTask, setCcTask] = useState('');
  const [ccPoints, setCcPoints] = useState<10 | 25 | 50>(25);
  const [showCcForm, setShowCcForm] = useState(false);
  // Theme state
  const [themeDraft, setThemeDraft] = useState<IBSRoomTheme>(DEFAULT_ROOM_THEME);
  const [themeSaved, setThemeSaved] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');
  const [sharedRedemptions, setSharedRedemptions] = useState<SharedRedemption[]>([]);
  const [shareCopied, setShareCopied] = useState(false);
  const { setTheme } = useTheme();

  function previewMode(mode: 'light' | 'dark') {
    setThemeDraft((draft) => ({ ...draft, defaultMode: mode, mode }));
    setTheme(mode);
  }

  const [rosterRefreshing, setRosterRefreshing] = useState(false);

  const reload = useCallback(() => {
    const u = getUser();
    setUser(u);
    if (u?.roomCode) {
      const r = getRoom(u.roomCode);
      setRoom(r);
      setThemeDraft(r?.roomTheme ?? DEFAULT_ROOM_THEME);
    }
  }, []);

  // Fetch fresh roster + redemptions from the server and merge into local state
  const refreshFromServer = useCallback(async (showSpinner = false) => {
    const currentUser = getUser();
    if (!currentUser?.roomCode) return;
    const currentRoom = getRoom(currentUser.roomCode);
    if (!currentRoom) return;
    if (showSpinner) setRosterRefreshing(true);
    try {
      const data = await loadCompanyData(currentUser.roomCode);
      setSharedRedemptions(data.redemptions);
      // Merge server members into local room so new joiners appear immediately
      const seenMembers = new Set<string>();
      const serverMembers = data.members.filter((member) => {
        const key = member.accountId ? `account:${member.accountId}` : `legacy:${member.name.trim().toLowerCase()}`;
        if (seenMembers.has(key)) return false;
        seenMembers.add(key);
        return true;
      });
      const updatedRoom: IBSRoom = {
        ...currentRoom,
        members: serverMembers.map((m) => {
          const local = (currentRoom.members ?? []).find((lm) => (m.accountId && lm.id === m.accountId) || lm.name === m.name);
          const profile = m.profile ?? {};
          return {
            ...profile,
            id: m.accountId ?? local?.id,
            name: m.name,
            color: m.color,
            role: m.role,
            points: m.points,
            allTimePoints: Math.max(Number(m.allTimePoints ?? 0), Number(m.carryoverPoints ?? 0)),
            avatarUrl: String(profile.avatarUrl ?? local?.avatarUrl ?? '') || undefined,
            gameHighScore: Number(profile.gameHighScore ?? local?.gameHighScore ?? 0),
            flappyRunsToday: Number(profile.flappyRunsToday ?? local?.flappyRunsToday ?? 0),
            flappyRunDate: String(profile.flappyRunDate ?? local?.flappyRunDate ?? ''),
            flappyOfficialScore: Number(profile.flappyOfficialScore ?? local?.flappyOfficialScore ?? 0),
            typingHighScore: Number(profile.typingHighScore ?? local?.typingHighScore ?? 0),
            triviaHighScore: Number(profile.triviaHighScore ?? local?.triviaHighScore ?? 0),
            gold: Number(profile.gold ?? local?.gold ?? 0),
            diamonds: Number(profile.diamonds ?? local?.diamonds ?? 0),
          };
        }),
      };
      saveRoom(currentUser.roomCode, updatedRoom);
      setRoom(updatedRoom);
    } catch {
      // silently ignore — stale data is better than a crash
    } finally {
      if (showSpinner) setRosterRefreshing(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Initial server sync
  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) return;
    const currentRoom = getRoom(currentUser.roomCode ?? '');
    if (!currentRoom) return;
    void (async () => {
      try {
        await syncCompanyMember({ roomCode: currentUser.roomCode ?? '', companyName: currentRoom.companyName ?? '', memberName: currentUser.name, color: currentUser.color ?? '#888', role: currentUser.role ?? 'employee' });
      } catch { /* ignore */ }
      void refreshFromServer();
    })();
  }, [refreshFromServer]);

  // Poll every 8 seconds so new members appear without manual refresh
  useEffect(() => {
    const interval = setInterval(() => { void refreshFromServer(); }, 8000);
    return () => clearInterval(interval);
  }, [refreshFromServer]);

  if (!user) return <AppLayout title="Admin Panel"><div /></AppLayout>;

  const isAdmin = ['admin', 'coadmin'].includes(user.role ?? '');

  if (!isAdmin) {
    return (
      <AppLayout title="Admin Panel">
        <Helmet>
          <title>Admin Panel – Intern Break Space</title>
          <meta name="description" content="Admin controls for room management, challenge generation, and member oversight." />
          <link rel="canonical" href="/admin" />
        </Helmet>
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 border border-destructive/30">
            <Lock size={28} className="text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            You need admin privileges to view this page. Ask your room admin for access.
          </p>
        </div>
      </AppLayout>
    );
  }

  if (!room) return <AppLayout title="Admin Panel"><div className="p-6 text-muted-foreground">Room not found.</div></AppLayout>;

  const today = todayStr();
  const challenges = Object.values(room.challenges ?? {});
  const todayGroup = challenges.filter((c) => c.type === 'group' && c.date === today);
  const companyChallenge = room.companyChallenge?.date === today ? room.companyChallenge : null;

  function copyRoomLink() {
    if (!user) return;
    const roomLink = `${window.location.origin}/?room=${encodeURIComponent(user.roomCode ?? '')}`;
    navigator.clipboard.writeText(roomLink).catch(() => {});
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 1500);
  }

  function setCompanyChallenge() {
    if (!room || !user || !ccTask.trim()) return;
    const cc: IBSCompanyChallenge = {
      task: ccTask.trim(),
      date: today,
      points: ccPoints,
      completedBy: [],
    };
    const updated: IBSRoom = { ...room, companyChallenge: cc };
    saveRoom(user.roomCode ?? "", updated);
    setRoom(updated);
    setCcTask('');
    setShowCcForm(false);
  }

  function generateCompanyChallenge() {
    if (!room || !user) return;
    const companyTask = pick(COMPANY_POOL);
    const cc: IBSCompanyChallenge = {
      task: companyTask,
      date: today,
      points: 25,
      completedBy: [],
    };
    const updated: IBSRoom = { ...room, companyChallenge: cc };
    saveRoom(user.roomCode ?? "", updated);
    setRoom(updated);
    setGenerated(true);
    setTimeout(() => setGenerated(false), 2000);
  }

  function resetDailyScores() {
    if (!room || !user) return;
    const updated: IBSRoom = {
      ...room,
      members: (room.members ?? []).map((m) => ({ ...m, points: 0 })),
    };
    saveRoom(user.roomCode ?? "", updated);
    // Also reset current user points
    const updatedUser: IBSUser = { ...user, points: 0 };
    saveUser(updatedUser);
    setRoom(updated);
    setUser(updatedUser);
    setConfirmReset(false);
  }

  async function setMemberRole(memberId: string | undefined, memberName: string, nextRole: 'admin' | 'coadmin' | 'manager' | 'employee') {
    if (!room || !user) return;
    const target = room.members?.find((member) => (memberId && member.id === memberId) || member.name === memberName);
    if (!target || target.role === nextRole) return;
    try {
      const result = await updateCompanyRole({ roomCode: user.roomCode ?? "", actorName: user.name, memberName: target.name, accountId: memberId, role: nextRole });
      const updated: IBSRoom = {
        ...room,
        members: (room.members ?? []).map((member) => (memberId && member.id === memberId) || member.name === memberName ? { ...member, role: result.member.role } : member),
      };
      saveRoom(user.roomCode ?? "", updated);
      if ((memberId && memberId === user.id) || memberName === user.name) {
        const updatedUser = { ...user, role: result.member.role };
        saveUser(updatedUser);
        setUser(updatedUser);
      }
      setRoom(updated);
      await refreshFromServer();
    } catch {
      await refreshFromServer();
    }
  }

  function removeMember(memberName: string) {
    if (!room || !user) return;
    const updated: IBSRoom = {
      ...room,
      members: (room.members ?? []).filter((m) => m.name !== memberName),
    };
    saveRoom(user.roomCode ?? "", updated);
    setRoom(updated);
    setConfirmRemove(null);
  }

  function getMemberStatus(member: IBSMember) {
    const mc = todayGroup.filter(
      (c) => (c.groupCompletedBy ?? []).includes(member.name)
    );
    if (mc.length > 0) return 'confirmed';
    return 'pending';
  }

  const statusColor: Record<string, string> = {
    confirmed: 'bg-green-500/20 text-green-400 border-green-500/30',
    submitted: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    pending: 'bg-muted/40 text-muted-foreground border-border/40',
    none: 'bg-muted/20 text-muted-foreground/50 border-border/20',
  };
  const statusLabel: Record<string, string> = {
    confirmed: 'Confirmed', submitted: 'Submitted', pending: 'Pending', none: '—',
  };

  function saveTheme() {
    if (!room || !user) return;
    const updated: IBSRoom = { ...room, roomTheme: themeDraft };
    saveRoom(user.roomCode ?? "", updated);
    setRoom(updated);
    applyRoomTheme(themeDraft);
    setTheme(themeDraft.defaultMode ?? themeDraft.mode ?? 'dark');
    setThemeSaved(true);
    setTimeout(() => setThemeSaved(false), 2000);
  }

  async function handleBackgroundUpload(file: File) {
    if (!room || !user) return;
    setImageUploadError('');
    try {
      const source = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(file);
        image.onload = () => { URL.revokeObjectURL(objectUrl); resolve(image); };
        image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Unable to read image')); };
        image.src = objectUrl;
      });
      const scale = Math.min(1, 1600 / source.naturalWidth);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Unable to process image');
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      const backgroundImage = canvas.toDataURL('image/jpeg', 0.72);
      const nextTheme = { ...themeDraft, backgroundImage };
      const updated: IBSRoom = { ...room, roomTheme: nextTheme };
      saveRoom(user.roomCode ?? "", updated);
      setThemeDraft(nextTheme);
      setRoom(updated);
      applyRoomTheme(nextTheme);
    } catch {
      setImageUploadError('Image is too large to save. Try a smaller photo.');
    }
  }

  return (
    <AppLayout title="Admin Panel">
      <Helmet>
        <title>Admin Panel – Intern Break Space</title>
        <meta name="description" content="Admin controls for room management, challenge generation, and member oversight." />
        <link rel="canonical" href="/admin" />
      </Helmet>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            <CopyChip value={user.roomCode ?? ""} label="Copy room code" />
            <button
              onClick={copyRoomLink}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-secondary"
            >
              {shareCopied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
              {shareCopied ? 'Link copied' : 'Copy room link'}
            </button>
          </div>
          <p className="text-sm text-muted-foreground">Manage your room, challenges, members, and shared access.</p>
        </motion.div>

        {/* Room Info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}
          className="rounded-xl border border-border/40 bg-card/60 p-5 space-y-3"
          style={{ background: 'var(--surface-card)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={16} className="text-primary" />
            <h2 className="font-semibold text-sm text-foreground">Room Info</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Room Code</p>
              <CopyChip value={user.roomCode ?? ""} label="Copy room code" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Company</p>
              <p className="text-sm font-semibold text-foreground">{room.companyName}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Members</p>
              <p className="text-sm font-semibold text-foreground">{(room.members ?? []).length}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Created</p>
              <p className="text-sm font-semibold text-foreground">
                {room.createdAt ? new Date(String(room.createdAt)).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Challenge Management */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-xl border border-border/40 p-5 space-y-4"
          style={{ background: 'var(--surface-card)' }}
        >
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-primary" />
            <h2 className="font-semibold text-sm text-foreground">Company Challenge</h2>
          </div>

          {/* Current company challenge */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Today's Company Challenge</p>
            {companyChallenge ? (
              <div className="px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-foreground flex items-center justify-between gap-2">
                <span>{companyChallenge.task}</span>
                <span className="text-xs text-yellow-400 font-semibold shrink-0">
                  +{companyChallenge.points} pts · {(companyChallenge.completedBy ?? []).length} done
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No company challenge set for today.</p>
            )}
          </div>

          {/* Set custom challenge */}
          {showCcForm ? (
            <div className="rounded-xl border border-primary/20 p-3 space-y-2" style={{ background: 'rgba(27,219,219,0.07)' }}>
              <input
                value={ccTask}
                onChange={(e) => setCcTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setCompanyChallenge()}
                placeholder="e.g. Post a GIF in Slack that describes your mood"
                className="w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none"
                style={{ background: 'var(--surface-input)', border: '1px solid var(--surface-card-border)' }}
              />
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Points:</span>
                  {([10, 25, 50] as const).map((p) => (
                    <button key={p} onClick={() => setCcPoints(p)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                      style={ccPoints === p ? { background: '#1BDBDB', color: '#0a1628' } : { background: 'var(--surface-input)', color: 'var(--text-secondary)' }}
                    >{p}</button>
                  ))}
                </div>
                <div className="ml-auto flex gap-2">
                  <button onClick={() => setShowCcForm(false)} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                  <button onClick={setCompanyChallenge} disabled={!ccTask.trim()}
                    className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
                  >Set Challenge</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                onClick={() => setShowCcForm(true)}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-secondary"
              >
                <Crown size={14} /> Set Custom Challenge
              </button>
              <button
                onClick={generateCompanyChallenge}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
              >
                {generated ? <Check size={14} /> : <RefreshCw size={14} />}
                {generated ? 'Generated!' : 'Random Challenge'}
              </button>
              {!confirmReset ? (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <RefreshCw size={14} /> Reset Daily Scores
                </button>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-destructive/40 bg-destructive/10 text-sm">
                  <span className="text-destructive text-xs font-medium">Are you sure?</span>
                  <button onClick={resetDailyScores} className="px-2 py-0.5 rounded bg-destructive text-white text-xs font-semibold">Yes</button>
                  <button onClick={() => setConfirmReset(false)} className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs">No</button>
                </div>
              )}
            </div>
          )}

          {/* Group challenges today */}
          {todayGroup.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/20">
              <p className="text-xs text-muted-foreground font-medium">Group Challenges Today ({todayGroup.length})</p>
              {todayGroup.map((c) => (
                <div key={c.id} className="px-3 py-2 rounded-lg bg-primary/5 border border-primary/15 text-sm text-foreground flex items-center justify-between gap-2">
                  <span className="truncate">{c.task}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {(c.groupCompletedBy ?? []).length} done · by {c.fromName}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Member Management */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }}
          className="rounded-xl border border-border/40 p-5 space-y-3"
          style={{ background: 'var(--surface-card)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-primary" />
            <h2 className="font-semibold text-sm text-foreground">Member Management</h2>
            <span className="ml-1 text-[11px] text-muted-foreground">{(room.members ?? []).length} members</span>
            <button
              onClick={() => void refreshFromServer(true)}
              disabled={rosterRefreshing}
              aria-label="Refresh member list"
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-border/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40 disabled:opacity-50"
            >
              <RefreshCw size={12} className={rosterRefreshing ? 'animate-spin' : ''} aria-hidden="true" />
              {rosterRefreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Admins have full room access. Co-admins can manage members and rewards. Managers have limited member oversight.</p>

          <div className="space-y-2">
            {(room.members ?? []).map((member) => {
              const isSelf = member.name === user.name;
              return (
                <div key={member.name}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/20 border border-border/30"
                >
                  <Avatar name={member.name} color={member.color} size={8} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground truncate">{member.name}</span>
                      {member.role === 'admin' && <Crown size={11} className="text-yellow-400 shrink-0" />}
                      {member.role === 'coadmin' && <ShieldCheck size={11} className="text-primary shrink-0" />}
                      {member.role === 'manager' && <span className="text-[10px] font-semibold text-primary">Manager</span>}
                      {isSelf && <span className="text-[10px] text-muted-foreground">(you)</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Daily: {member.points} pts · All-time: {member.allTimePoints} pts
                    </p>
                  </div>

                  {!isSelf && (
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={member.role}
                        onChange={(event) => void setMemberRole(member.id, member.name, event.target.value as 'admin' | 'coadmin' | 'manager' | 'employee')}
                        aria-label={`Set ${member.name}'s role`}
                        className="rounded-md border border-primary/40 bg-card px-2 py-1 text-xs font-medium text-foreground"
                      >
                        <option value="employee">Member</option>
                        <option value="manager">Manager</option>
                        <option value="coadmin">Co-admin</option>
                        <option value="admin">Admin</option>
                      </select>

                      {confirmRemove === member.name ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-destructive">Sure?</span>

        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.18 }} className="rounded-xl border border-border p-5 bg-card">
          <div className="flex items-center gap-2 mb-1"><Gift size={16} className="text-primary" /><h2 className="font-semibold text-sm text-foreground">Reward fulfillment queue</h2></div>
          <p className="text-xs text-muted-foreground mb-4">Redeemed rewards appear here so an admin can hand them out physically.</p>
          {sharedRedemptions.filter((redemption) => !redemption.fulfilled).length === 0 ? <p className="text-sm text-muted-foreground">No rewards are waiting for fulfillment.</p> : <div className="grid grid-cols-1 gap-3">{sharedRedemptions.filter((redemption) => !redemption.fulfilled).map((redemption) => <article key={redemption.id} className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-foreground">{redemption.rewardName}</p><p className="text-xs text-muted-foreground">{redemption.memberName} · {redemption.points} points · Awaiting handoff</p></div><button onClick={() => void (async () => { if (!user) return; await fulfillCompanyRedemption({ roomCode: user.roomCode ?? "", actorName: user.name, redemptionId: redemption.id }); const data = await loadCompanyData(user.roomCode ?? ""); setSharedRedemptions(data.redemptions); })()} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Mark handed out</button></article>)}</div>}
        </motion.section>

                          <button onClick={() => removeMember(member.name)} className="px-1.5 py-0.5 rounded bg-destructive text-white text-[10px] font-semibold">Yes</button>
                          <button onClick={() => setConfirmRemove(null)} className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">No</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmRemove(member.name)}
                          className="p-1.5 rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Challenge Overview */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}
          className="rounded-xl border border-border/40 p-5"
          style={{ background: 'var(--surface-card)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-primary" />
            <h2 className="font-semibold text-sm text-foreground">Challenge Overview</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(room.members ?? []).map((member) => {
              const status = getMemberStatus(member);
              const companyDone = companyChallenge?.completedBy?.includes(member.name) ?? false;
              const groupDoneCount = todayGroup.filter((c) => (c.groupCompletedBy ?? []).includes(member.name)).length;
              return (
                <div key={member.name}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/20 border border-border/30"
                >
                  <Avatar name={member.name} color={member.color} size={7} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{member.name}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${statusColor[status]}`}>
                        {statusLabel[status]}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                        companyDone
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-muted/30 text-muted-foreground border-border/30'
                      }`}>
                        {companyDone ? '✓ Company' : 'Company —'}
                      </span>
                      {groupDoneCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium bg-blue-500/20 text-blue-400 border-blue-500/30">
                          {groupDoneCount} group
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Personal Daily Challenges Breakdown */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.25 }}
          className="rounded-xl border border-border/40 p-5"
          style={{ background: 'var(--surface-card)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">⭐</span>
            <h2 className="font-semibold text-sm text-foreground">Personal Daily Challenges</h2>
            <span className="ml-auto text-[10px] text-muted-foreground">{today}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Each employee gets a unique challenge generated for them today.</p>

          <div className="flex flex-col gap-2">
            {(room.members ?? []).map((member) => {
              const { challenge, completed } = getPersonalChallengeStatus(room, member.name, today);
              return (
                <div key={member.name}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl border"
                  style={{
                    background: completed ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)',
                    borderColor: completed ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.08)',
                  }}
                >
                  <Avatar name={member.name} color={member.color} size={8} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-semibold text-foreground truncate">{member.name}</span>
                      {member.role === 'admin' && <Crown size={10} className="text-yellow-400 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm">{challenge.emoji}</span>
                      <span className="text-[11px] text-muted-foreground truncate">{challenge.task}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)' }}
                    >
                      {challenge.points} pts
                    </span>
                    {completed ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: '#4ade80' }}>
                        <CheckCircle2 size={11} /> Done
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Pending</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Points summary */}
          <div className="mt-4 pt-3 border-t border-border/20">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Points Breakdown (today)</p>
            <div className="flex flex-col gap-1.5">
              {(room.members ?? [])
                .slice()
                .sort((a, b) => Number(b.points ?? 0) - Number(a.points ?? 0))
                .map((member) => {
                  const { completed, challenge } = getPersonalChallengeStatus(room, member.name, today);
                  const companyPts = companyChallenge?.completedBy?.includes(member.name) ? companyChallenge.points ?? 0 : 0;
                  const groupPts = todayGroup
                    .filter((c) => (c.groupCompletedBy ?? []).includes(member.name))
                    .reduce((sum, c) => sum + (c.points ?? 0), 0);
                  const personalPts = completed ? challenge.points : 0;
                  return (
                    <div key={member.name} className="flex items-center gap-2 text-xs">
                      <Avatar name={member.name} color={member.color} size={5} />
                      <span className="font-medium text-foreground w-24 truncate">{member.name}</span>
                      <div className="flex gap-1.5 flex-wrap flex-1">
                        {personalPts > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8' }}>
                            ⭐ {personalPts}
                          </span>
                        )}
                        {companyPts > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>
                            👑 {companyPts}
                          </span>
                        )}
                        {groupPts > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'rgba(27,219,219,0.12)', color: '#0fa8a8' }}>
                            👥 {groupPts}
                          </span>
                        )}
                        {personalPts + companyPts + groupPts === 0 && (
                          <span className="text-muted-foreground text-[10px]">No points yet</span>
                        )}
                      </div>
                      <span className="font-bold text-foreground ml-auto">{member.points} pts</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </motion.div>

        {/* Theme Customizer */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }}
          className="rounded-xl border border-border/40 p-5 space-y-5"
          style={{ background: 'var(--surface-card)' }}
        >
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-primary" />
            <h2 className="font-semibold text-sm text-foreground">Space Theme</h2>
            <span className="ml-auto text-[10px] text-muted-foreground">Customize to match your company</span>
          </div>

          {/* Space name + tagline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Space Name</label>
              <input
                value={themeDraft.spaceName}
                onChange={(e) => setThemeDraft((d) => ({ ...d, spaceName: e.target.value }))}
                placeholder="Intern Break Space"
                className="w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none"
                style={{ background: 'var(--surface-input)', border: '1px solid var(--surface-card-border)' }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Tagline</label>
              <input
                value={themeDraft.tagline}
                onChange={(e) => setThemeDraft((d) => ({ ...d, tagline: e.target.value }))}
                placeholder="Your daily dose of fun between the work."
                className="w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none"
                style={{ background: 'var(--surface-input)', border: '1px solid var(--surface-card-border)' }}
              />
            </div>
          </div>

          {/* Color presets */}
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Brand Color</label>
            <div className="flex flex-wrap gap-2 items-center">
              {[
                { label: 'Teal', hex: '#1BDBDB' },
                { label: 'Indigo', hex: '#6366f1' },
                { label: 'Violet', hex: '#8b5cf6' },
                { label: 'Rose', hex: '#f43f5e' },
                { label: 'Orange', hex: '#f97316' },
                { label: 'Amber', hex: '#f59e0b' },
                { label: 'Emerald', hex: '#10b981' },
                { label: 'Sky', hex: '#0ea5e9' },
                { label: 'Pink', hex: '#ec4899' },
              ].map(({ label, hex }) => (
                <button
                  key={hex}
                  title={label}
                  onClick={() => setThemeDraft((d) => ({ ...d, primaryColor: hex }))}
                  className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110"
                  style={{
                    background: hex,
                    borderColor: themeDraft.primaryColor === hex ? '#fff' : 'transparent',
                    boxShadow: themeDraft.primaryColor === hex ? `0 0 0 2px ${hex}` : 'none',
                  }}
                />
              ))}
              {/* Custom hex input */}
              <div className="flex items-center gap-1.5 ml-1">
                <div
                  className="w-7 h-7 rounded-full border-2 shrink-0"
                  style={{ background: themeDraft.primaryColor, borderColor: 'rgba(255,255,255,0.3)' }}
                />
                <input
                  type="text"
                  value={themeDraft.primaryColor}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setThemeDraft((d) => ({ ...d, primaryColor: v }));
                  }}
                  className="w-24 rounded-lg px-2 py-1.5 text-xs font-mono text-foreground outline-none"
                  style={{ background: 'var(--surface-input)', border: '1px solid var(--surface-card-border)' }}
                  placeholder="#1BDBDB"
                />
              </div>
            </div>
          </div>

          {/* Default mode */}
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Default Mode</label>
            <div className="flex gap-2">
              {(['light', 'dark'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => previewMode(mode)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all capitalize"
                  style={themeDraft.defaultMode === mode
                    ? { background: themeDraft.primaryColor + '22', borderColor: themeDraft.primaryColor, color: themeDraft.primaryColor }
                    : { background: 'var(--surface-input)', borderColor: 'var(--surface-card-border)', color: 'var(--text-secondary)' }
                  }
                >
                  {mode === 'light' ? '☀️' : '🌙'} {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Background image */}
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Background Image</label>
            <div className="flex items-start gap-3">
              {/* Preview thumbnail */}
              <div
                className="w-20 h-14 rounded-lg shrink-0 border border-border/40 overflow-hidden flex items-center justify-center text-xs text-muted-foreground"
                style={themeDraft.backgroundImage
                  ? { backgroundImage: `url("${themeDraft.backgroundImage}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : { background: 'var(--surface-input)' }
                }
              >
                {!themeDraft.backgroundImage && <span className="text-[10px]">No image</span>}
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <label
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all border border-dashed border-border/50 hover:border-primary/50"
                  style={{ background: 'var(--surface-input)' }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleBackgroundUpload(file);
                      e.currentTarget.value = '';
                    }}
                  />
                  Upload image
                </label>
                {imageUploadError && <p className="text-[11px] text-destructive">{imageUploadError}</p>}
                {themeDraft.backgroundImage && (
                  <button
                    onClick={() => setThemeDraft((d) => ({ ...d, backgroundImage: '' }))}
                    className="text-[11px] text-muted-foreground hover:text-destructive transition-colors text-left"
                  >
                    Remove image
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Preview strip */}
          <div
            className="rounded-lg px-4 py-3 flex items-center gap-3 text-sm font-medium overflow-hidden relative"
            style={themeDraft.backgroundImage
              ? { border: `1px solid ${themeDraft.primaryColor}44` }
              : { background: themeDraft.primaryColor + '18', border: `1px solid ${themeDraft.primaryColor}44` }
            }
          >
            {themeDraft.backgroundImage && (
              <>
                <div className="absolute inset-0" style={{ backgroundImage: `url("${themeDraft.backgroundImage}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} />
              </>
            )}
            <div className="relative w-3 h-3 rounded-full shrink-0" style={{ background: themeDraft.primaryColor }} />
            <span className="relative" style={{ color: themeDraft.backgroundImage ? '#fff' : themeDraft.primaryColor }}>{themeDraft.spaceName || 'Space Name'}</span>
            <span className="relative text-xs font-normal ml-1" style={{ color: themeDraft.backgroundImage ? 'rgba(255,255,255,0.7)' : undefined }} >{themeDraft.tagline ? `— ${themeDraft.tagline}` : '— Tagline'}</span>
          </div>

          {/* Save */}
          <div className="flex justify-end pt-1">
            <button
              onClick={saveTheme}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-secondary"
            >
              {themeSaved ? <><Check size={14} /> Applied!</> : <><Palette size={14} /> Apply Theme</>}
            </button>
          </div>
        </motion.div>

      </div>
    </AppLayout>
  );
}
