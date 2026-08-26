import { useEffect, useState, useRef } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Plus, Users, Gem, RefreshCw, Crown, X, Target, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from "react-router";
import AppLayout from '@/layouts/AppLayout';
import { challenges as c } from 'virtual:content';
import { getUser, getRoom, saveRoom, awardChallengePoints, completePersonalChallenge, getPersonalChallengeStatus, completeMoveChallenge, getMoveChallengeStatus, recordWeeklyActivity, todayStr, type IBSUser, type IBSRoom, type IBSChallenge, type IBSQuestGroup, type IBSMember } from '@/lib/ibs-store';
function Avatar({
  name,
  color = '#888',
  size = 28
}: {
  name: string;
  color?: string;
  size?: number;
}) {
  return <div className="flex shrink-0 items-center justify-center rounded-full font-bold text-white" style={{
    width: size,
    height: size,
    fontSize: size * 0.38,
    background: color
  }}>
      {name.charAt(0).toUpperCase()}
    </div>;
}
function ProgressBar({
  value,
  max,
  showLabel
}: {
  value: number;
  max: number;
  showLabel?: boolean;
}) {
  const pct = max > 0 ? Math.min(100, Math.round(value / max * 100)) : 0;
  const full = pct === 100;
  return <div className="flex flex-col gap-1">
      {showLabel && <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="text-muted-foreground">{value} of {max} done</span>
          <span className={full ? 'text-primary' : 'text-muted-foreground'}>{pct}%</span>
        </div>}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <motion.div className="h-full rounded-full bg-primary" style={{
        boxShadow: pct > 0 ? '0 0 8px hsl(var(--primary) / 0.5)' : 'none'
      }} animate={{
        width: `${pct}%`
      }} transition={{
        duration: 0.55,
        ease: [0.23, 1, 0.32, 1] as const
      }} />
      </div>
    </div>;
}
export default function ChallengesPage() {
  const [user, setUser] = useState<IBSUser | null>(null);
  const [room, setRoom] = useState<IBSRoom | null>(null);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [groupError, setGroupError] = useState('');
  const [assignGroupId, setAssignGroupId] = useState<string | null>(null);
  const [newTask, setNewTask] = useState('');
  const [newPoints, setNewPoints] = useState<number>(10);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const groupNameRef = useRef<HTMLInputElement>(null);
  function loadLocal() {
    const u = getUser();
    if (!u) return;
    setUser(u);
    const r = getRoom(u.roomCode ?? '');
    setRoom(r);
  }

  /** Push the current room's quest/challenge state to the server so all clients stay in sync. */
  async function pushRoomData(updatedRoom: IBSRoom) {
    const u = getUser();
    if (!u?.roomCode) return;
    // Only push the quest-relevant fields — not member scores or theme
    const roomData = {
      companyChallenge: updatedRoom.companyChallenge,
      groupChallenges: updatedRoom.groupChallenges,
      movementChallenge: updatedRoom.movementChallenge,
      questGroups: updatedRoom.questGroups,
      challenges: updatedRoom.challenges,
    };
    try {
      const res = await fetch('/api/company', {
        method: 'POST',
        credentials: 'include',          // ← send session cookie so server accepts the request
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync-room-data',
          roomCode: u.roomCode,
          roomData
        })
      });
      if (!res.ok) {
        console.warn('[challenges] sync-room-data failed', res.status);
      }
    } catch {
      // best-effort — local state is already saved
    }
  }

  /** Pull latest roomData from server and merge into local state. */
  async function fetchFromServer() {
    const u = getUser();
    if (!u?.roomCode) return;
    try {
      const res = await fetch(`/api/company?roomCode=${encodeURIComponent(u.roomCode)}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        room?: { roomData?: Record<string, unknown> | null };
        roomData?: Record<string, unknown> | null;
        members?: Array<{ name: string; color?: string; role?: string; points?: number; allTimePoints?: number; carryoverPoints?: number; accountId?: string; profile?: Record<string, unknown> | null }>;
      };
      const currentRoom = getRoom(u.roomCode);
      if (!currentRoom) return;

      // Support both response shapes: { room: { roomData } } (GET) and { roomData } (legacy)
      const serverRoomData = data.room?.roomData ?? data.roomData ?? null;
      const merged: IBSRoom = {
        ...currentRoom,
        companyChallenge: serverRoomData?.companyChallenge as IBSRoom['companyChallenge'] ?? currentRoom.companyChallenge,
        groupChallenges: serverRoomData?.groupChallenges as IBSRoom['groupChallenges'] ?? currentRoom.groupChallenges,
        movementChallenge: serverRoomData?.movementChallenge as IBSRoom['movementChallenge'] ?? currentRoom.movementChallenge,
        questGroups: serverRoomData?.questGroups as IBSRoom['questGroups'] ?? currentRoom.questGroups,
      };

      // Merge server member list so the teammate picker shows everyone in the room,
      // not just whoever has joined on this device.
      if (Array.isArray(data.members) && data.members.length > 0) {
        const localMembers = currentRoom.members ?? [];
        const localByName = new Map(localMembers.map(m => [m.name.toLowerCase(), m]));
        const serverNames = new Set(data.members.map(m => m.name.toLowerCase()));

        // Build merged list: server members enriched with any extra local fields
        const mergedMembers = data.members.map(sm => {
          const local = localByName.get(sm.name.toLowerCase());
          return {
            ...(local ?? {}),
            // Server values always win for identity + balance fields
            id: sm.accountId ?? sm.name,
            name: sm.name,
            color: sm.color ?? local?.color ?? '#888',
            role: (sm.role ?? local?.role ?? 'employee') as IBSMember['role'],
            points: sm.points ?? local?.points ?? 0,
            allTimePoints: sm.allTimePoints ?? local?.allTimePoints ?? 0,
            // Diamonds live inside the member's `profile` JSON blob, not
            // `carryoverPoints` (that field is the separate Rewards
            // redemption balance). Reading carryoverPoints here overwrote
            // the real diamond total with an unrelated number on every 4s
            // poll, which is what made diamonds look like they were
            // randomly changing on the Quests page.
            diamonds: Number(sm.profile?.diamonds ?? local?.diamonds ?? 0),
            gold: Number(sm.profile?.gold ?? local?.gold ?? 0),
          };
        });

        // Keep any local-only members not yet on the server (e.g. just joined)
        const localOnly = localMembers.filter(m => !serverNames.has(m.name.toLowerCase()));
        merged.members = [...mergedMembers, ...localOnly] as IBSRoom['members'];
      }

      saveRoom(u.roomCode, merged);
      setRoom(merged);
    } catch {
      // network hiccup — keep local state
    }
  }
  useEffect(() => {
    loadLocal();
    void fetchFromServer();
    // Poll server every 4 s for live cross-client quest updates
    const serverId = window.setInterval(fetchFromServer, 4000);
    // Re-fetch immediately when the tab regains focus
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void fetchFromServer();
    };
    window.addEventListener('storage', loadLocal);
    window.addEventListener('ibs-room-updated', loadLocal);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(serverId);
      window.removeEventListener('storage', loadLocal);
      window.removeEventListener('ibs-room-updated', loadLocal);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (assignGroupId) setTimeout(() => inputRef.current?.focus(), 50);
  }, [assignGroupId]);
  if (!user || !room) {
    return <AppLayout title={c.pageTitle}>
        <div className="p-6 text-muted-foreground text-sm">Loading…</div>
      </AppLayout>;
  }
  const today = todayStr();
  const questGroups = room.questGroups ?? [];
  const myGroups = questGroups.filter(g => g.memberNames.includes(user.name));
  const cc = room.companyChallenge?.date === today ? room.companyChallenge : null;
  const ccDone = cc ? (cc.completedBy ?? []).includes(user.name) : false;
  const ccCompletedCount = cc ? (cc.completedBy ?? []).length : 0;
  function completeCompanyChallenge() {
    if (!room || !user || !cc || ccDone) return;
    const updated: IBSRoom = {
      ...room,
      companyChallenge: {
        ...cc,
        completedBy: [...(cc.completedBy ?? []), user.name]
      }
    };
    saveRoom(user.roomCode ?? "", updated);
    awardChallengePoints(user.roomCode ?? "", user.name, cc.points ?? 0);
    recordWeeklyActivity(user.roomCode ?? "", user.name, "quest", cc.points ?? 0);
    setRoom(updated);
    void pushRoomData(updated).then(() => fetchFromServer());
  }
  const groupChallenges = Object.values(room.challenges ?? {}).filter(c => c.type === 'group' && c.date === today);
  function completeGroupChallenge(c: IBSChallenge) {
    if (!room || !user) return;
    const already = (c.groupCompletedBy ?? []).includes(user.name);
    if (already) return;
    const updated: IBSRoom = {
      ...room,
      challenges: {
        ...room.challenges,
        [c.id]: {
          ...c,
          groupCompletedBy: [...(c.groupCompletedBy ?? []), user.name]
        }
      }
    };
    saveRoom(user.roomCode ?? "", updated);
    awardChallengePoints(user.roomCode ?? "", user.name, c.points ?? 0);
    recordWeeklyActivity(user.roomCode ?? "", user.name, "quest", c.points ?? 0);
    setRoom(updated);
    void pushRoomData(updated).then(() => fetchFromServer());
  }
  function toggleMember(name: string) {
    setSelectedMembers(current => current.includes(name) ? current.filter(n => n !== name) : [...current, name]);
    setGroupError('');
  }
  function createQuestGroup() {
    if (!room || !user) return;
    const name = groupName.trim();
    if (!name) {
      setGroupError('Enter a group name.');
      groupNameRef.current?.focus();
      return;
    }
    if (questGroups.some(g => g.name.toLowerCase() === name.toLowerCase())) {
      setGroupError('A group with that name already exists.');
      return;
    }
    const others = selectedMembers.length > 0 ? selectedMembers : (room.members ?? []).map(m => m.name).filter(n => n !== user.name);
    const members = Array.from(new Set([user.name, ...others]));
    const group: IBSQuestGroup = {
      id: `qg-${Date.now()}`,
      name,
      memberNames: members,
      createdBy: user.name,
      createdAt: new Date().toISOString()
    };
    const updated: IBSRoom = {
      ...room,
      questGroups: [...questGroups, group]
    };
    saveRoom(user.roomCode ?? "", updated);
    setGroupName('');
    setSelectedMembers([]);
    setGroupError('');
    setRoom(updated);          // update UI immediately on this client
    void pushRoomData(updated).then(() => fetchFromServer()); // push then re-fetch to confirm
  }
  function deleteQuestGroup(groupId: string) {
    if (!room || !user) return;
    const updated: IBSRoom = {
      ...room,
      questGroups: questGroups.filter(g => g.id !== groupId)
    };
    saveRoom(user.roomCode ?? "", updated);
    if (assignGroupId === groupId) setAssignGroupId(null);
    setRoom(updated);
    void pushRoomData(updated).then(() => fetchFromServer());
  }
  function createGroupChallenge() {
    if (!room || !user || !newTask.trim() || !assignGroupId) return;
    const group = questGroups.find(g => g.id === assignGroupId);
    if (!group || !group.memberNames.includes(user.name)) return;
    setSubmitting(true);
    const id = `group-${Date.now()}`;
    const challenge: IBSChallenge = {
      id,
      type: 'group',
      fromName: user.name,
      toName: '',
      task: newTask.trim(),
      completed: false,
      points: newPoints,
      date: today,
      groupCompletedBy: [],
      groupTitle: group.name,
      questGroupId: group.id
    };
    const updated: IBSRoom = {
      ...room,
      challenges: {
        ...room.challenges,
        [id]: challenge
      }
    };
    saveRoom(user.roomCode ?? "", updated);
    setNewTask('');
    setNewPoints(10);
    setAssignGroupId(null);
    setSubmitting(false);
    setRoom(updated);
    void pushRoomData(updated).then(() => fetchFromServer());
  }
  const member = (room.members ?? []).find(m => m.name === user.name);
  const pointsToday = member?.points ?? 0;
  const {
    challenge: personalChallenge,
    completed: personalDone
  } = getPersonalChallengeStatus(room, user.name, today);
  function completeMyPersonalChallenge() {
    if (!user || personalDone) return;
    completePersonalChallenge(user.roomCode ?? "", user.name, today);
    loadLocal();
  }
  const {
    challenge: moveChallenge,
    partner: movePartner,
    completed: moveDone
  } = getMoveChallengeStatus(room, user.name, today);
  function completeMyMoveChallenge() {
    if (!user || moveDone) return;
    completeMoveChallenge(user.roomCode ?? "", user.name, today);
    const updatedRoom = getRoom(user.roomCode ?? "");
    if (updatedRoom) {
      setRoom(updatedRoom);
      void pushRoomData(updatedRoom).then(() => fetchFromServer());
    } else {
      loadLocal();
    }
  }
  const canCreateGroup = groupName.trim().length > 0;
  const assignGroup = assignGroupId ? questGroups.find(g => g.id === assignGroupId) : null;
  const otherMembers = (room.members ?? []).filter(m => m.name !== user.name);
  return <AppLayout title={c.pageTitle}>
      <Helmet>
        <title>Quests - Intern Break Space</title>
        <meta name="description" content="Daily quests, company challenge, and group quests." />
        <link rel="canonical" href="/challenges" />
      </Helmet>

      <div className="page-shell space-y-7">
        <motion.div initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="page-kicker">
              <Target size={12} aria-hidden="true" /> <span>{c.pageKicker}</span>
            </span>
            <h1 className="page-title mt-3">{c.pageTitle}</h1>
            <p className="page-subtitle">{c.pageSubtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {pointsToday > 0 && <span className="points-pill">
                <Gem size={12} aria-hidden="true" />
                <span>{pointsToday}</span> <span>{c.pointsTodayLabel}</span>
              </span>}
            <button onClick={loadLocal} className="pressable rounded-full border border-border bg-card p-2.5" title={c.refreshLabel} type="button">
              <RefreshCw size={14} className="text-muted-foreground" />
            </button>
          </div>
        </motion.div>

        <Link to="/leaderboard?tab=week" className="surface surface-pad pressable flex items-center justify-between gap-3 no-underline">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Sparkles size={16} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                <span>{c.weeklyRecapTitle}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground"><span>{c.weeklyRecapSubtitle}</span></p>
            </div>
          </div>
          <ArrowRight size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
        </Link>

        <div className="grid gap-4 lg:grid-cols-[1.45fr_0.85fr]">
          <motion.section initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.35, delay: 0.05, ease: [0.23, 1, 0.32, 1] }} className="quest-hero" aria-labelledby="daily-challenge-heading">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p id="daily-challenge-heading" className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary-foreground/75">
                  <span>{c.personalQuest.eyebrow}</span>
                </p>
                <h2 className="mt-2 max-w-xl text-2xl font-extrabold leading-tight md:text-3xl" style={{ fontFamily: 'var(--font-heading)' }}>
                  {personalChallenge.task}
                </h2>
              </div>
              <span className="points-pill shrink-0 bg-[var(--ink)] text-[var(--cream)]">
                <Gem size={12} aria-hidden="true" />
                {personalChallenge.points}
              </span>
            </div>
            <div className="mt-6">
              {personalDone ? <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-4 py-2 text-sm font-bold">
                  <CheckCircle2 size={16} /> <span>{c.personalQuest.completedLabel}</span>
                </div> : <button type="button" onClick={completeMyPersonalChallenge} className="pressable rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-bold text-[var(--cream)]">
                  <span>{c.personalQuest.markComplete}</span>
                </button>}
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.35, delay: 0.1, ease: [0.23, 1, 0.32, 1] }} className="surface surface-pad" aria-labelledby="company-challenge-heading">
            <div className="mb-3 flex items-center gap-2">
              <Crown size={15} className="text-amber-500" />
              <h2 id="company-challenge-heading" className="text-sm font-extrabold" style={{ fontFamily: 'var(--font-heading)' }}>
                <span>{c.companyQuest.eyebrow}</span>
              </h2>
            </div>
            {cc ? <>
                <p className="text-sm font-semibold leading-snug">{cc.task}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {ccCompletedCount}/{(room.members ?? []).length} <span>{c.companyQuest.doneSuffix}</span> · {cc.points} <span>{c.companyQuest.ptsSuffix}</span>
                </p>
                <div className="mt-3">
                  <ProgressBar value={ccCompletedCount} max={(room.members ?? []).length} />
                </div>
                <div className="mt-4">
                  {ccDone ? <div className="flex items-center gap-1.5 text-sm font-bold text-primary">
                      <CheckCircle2 size={15} /> <span>{c.companyQuest.doneLabel}</span>
                    </div> : <button type="button" onClick={completeCompanyChallenge} className="pressable rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground">
                      <span>{c.companyQuest.markComplete}</span> · {cc.points} <span>{c.companyQuest.ptsSuffix}</span>
                    </button>}
                </div>
              </> : <p className="text-sm text-muted-foreground">
                <span>{c.companyQuest.noQuestToday}</span>
                {user.role === 'admin' ? <span>{c.companyQuest.setInAdmin}</span> : ''}
              </p>}
          </motion.section>
        </div>

        <motion.section initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.35, delay: 0.12, ease: [0.23, 1, 0.32, 1] }} className="surface overflow-hidden" aria-labelledby="move-break-heading">
          <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
            <div className="surface-pad space-y-4 border-b border-border md:border-b-0 md:border-r">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-lg" aria-hidden="true">👟</span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground"><span>{c.moveBreak.eyebrow}</span></p>
                  <h2 id="move-break-heading" className="text-lg font-extrabold" style={{ fontFamily: 'var(--font-heading)' }}><span>{c.moveBreak.title}</span></h2>
                </div>
                <span className="ml-auto points-pill">
                  <Gem size={11} aria-hidden="true" />
                  {moveChallenge.points} {moveChallenge.points === 1 ? 'pt' : 'pts'}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-3xl" aria-hidden="true">{moveChallenge.emoji}</span>
                <div>
                  <p className="text-base font-bold leading-snug md:text-lg">{moveChallenge.task}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    ~{moveChallenge.minutes} <span>{c.moveBreak.minutesSuffix}</span>
                    {movePartner ? <> · <span>{c.moveBreak.withPrefix}</span> {movePartner}</> : ''}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground"><span>{c.moveBreak.altHeading}</span></p>
                <p className="mt-1 text-sm text-foreground">{moveChallenge.alt}</p>
              </div>
              {moveDone ? <div className="inline-flex items-center gap-2 text-sm font-bold text-emerald-600">
                  <CheckCircle2 size={16} /> <span>{c.moveBreak.doneLabel}</span>
                </div> : <button type="button" onClick={completeMyMoveChallenge} className="pressable rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
                  <span>{c.moveBreak.iDidIt}</span> · {moveChallenge.points} {moveChallenge.points === 1 ? 'pt' : 'pts'}
                </button>}
            </div>
            <div className="surface-pad flex flex-col justify-between gap-4 bg-emerald-500/[0.06]">
              <div>
                <p className="text-sm font-extrabold" style={{ fontFamily: 'var(--font-heading)' }}><span>{c.moveBreak.whyTitle}</span></p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground"><span>{c.moveBreak.whyBody}</span></p>
              </div>
            </div>
          </div>
        </motion.section>

        <section aria-labelledby="group-challenges-heading" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-primary" />
              <h2 id="group-challenges-heading" className="text-xl font-extrabold" style={{ fontFamily: 'var(--font-heading)' }}>
                <span>{c.groupQuests.heading}</span>{' '}
                {groupChallenges.length > 0 && <span className="text-muted-foreground">({groupChallenges.length})</span>}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {assignGroupId && <button type="button" onClick={() => { setAssignGroupId(null); setNewTask(''); setNewPoints(10); }} className="pressable inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-bold">
                  <X size={12} /> <span>{c.groupQuests.cancelLabel}</span>
                </button>}
              <button type="button" disabled={!assignGroupId} onClick={createGroupChallenge} className="pressable inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40">
                <Plus size={12} /> <span>{c.groupQuests.assignQuestLabel}</span>
              </button>
            </div>
          </div>

          <div className="surface surface-pad space-y-4">
            <div>
              <h3 className="text-base font-extrabold" style={{ fontFamily: 'var(--font-heading)' }}><span>{c.groupQuests.createGroupHeading}</span></h3>
              <p className="mt-1 text-sm text-muted-foreground"><span>{c.groupQuests.createGroupDescription}</span></p>
            </div>
            <input ref={groupNameRef} value={groupName} onChange={e => { setGroupName(e.target.value); setGroupError(''); }} onKeyDown={e => e.key === 'Enter' && createQuestGroup()} placeholder={c.groupQuests.groupNamePlaceholder} className="w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm outline-none" aria-label="Quest group name" />
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>{c.groupQuests.chooseTeammatesLabel}</span> <span className="font-normal normal-case tracking-normal">{c.groupQuests.chooseTeammatesOptional}</span>
              </p>
              <p className="mb-2 text-[11px] text-muted-foreground"><span>{c.groupQuests.chooseTeammatesHint}</span></p>
              <div className="flex flex-wrap gap-2">
                {otherMembers.map(m => {
                  const selected = selectedMembers.includes(m.name);
                  return <button key={m.name} type="button" onClick={() => toggleMember(m.name)} className="pressable inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors" style={{ background: selected ? 'hsl(var(--primary) / 0.15)' : 'var(--surface-input)', borderColor: selected ? 'hsl(var(--primary))' : 'hsl(var(--border))', color: selected ? 'hsl(var(--primary))' : undefined }}>
                      <Avatar name={m.name} color={m.color} size={18} />
                      {m.name}
                      {selected && <CheckCircle2 size={12} />}
                    </button>;
                })}
                {otherMembers.length === 0 && <p className="text-xs text-muted-foreground"><span>{c.groupQuests.noTeammatesYet}</span></p>}
              </div>
            </div>
            {groupError && <p className="text-xs font-medium text-destructive">{groupError}</p>}
            <div className="flex justify-end">
              <button type="button" onClick={createQuestGroup} disabled={!canCreateGroup} className="pressable rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-40">
                <span>{c.groupQuests.createGroupButton}</span>
              </button>
            </div>
          </div>

          {questGroups.length > 0 && <div className="grid gap-3 md:grid-cols-2">
              {questGroups.map(g => {
                const inGroup = g.memberNames.includes(user.name);
                return <div key={g.id} className="surface surface-pad space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-extrabold" style={{ fontFamily: 'var(--font-heading)' }}>{g.name}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {g.memberNames.length} <span>{c.groupQuests.membersSuffix}</span> · <span>{c.groupQuests.byPrefix}</span> {g.createdBy}
                        </p>
                      </div>
                      {g.createdBy === user.name && <button type="button" onClick={() => deleteQuestGroup(g.id)} className="text-[11px] font-bold text-muted-foreground hover:text-destructive">
                          <span>{c.groupQuests.removeLabel}</span>
                        </button>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {g.memberNames.map(name => {
                        const m = (room.members ?? []).find(mem => mem.name === name);
                        return <span key={name} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">
                            <Avatar name={name} color={m?.color ?? '#888'} size={14} />
                            {name}
                          </span>;
                      })}
                    </div>
                    {inGroup ? <button type="button" onClick={() => setAssignGroupId(g.id)} className={`pressable rounded-full px-4 py-1.5 text-xs font-bold ${assignGroupId === g.id ? 'bg-primary text-primary-foreground' : 'border border-border bg-card'}`}>
                        {assignGroupId === g.id ? <span>{c.groupQuests.assigningLabel}</span> : <span>{c.groupQuests.assignQuestButton}</span>}
                      </button> : <p className="text-[11px] text-muted-foreground"><span>{c.groupQuests.notInGroup}</span></p>}
                  </div>;
              })}
            </div>}

          <AnimatePresence>
            {assignGroup && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="surface surface-pad space-y-3">
                  <p className="text-sm font-bold">
                    <span>{c.groupQuests.assignGroupLabel}</span> <span className="text-primary">{assignGroup.name}</span>
                  </p>
                  <input ref={inputRef} value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && createGroupChallenge()} placeholder={c.groupQuests.questPlaceholder} className="w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm outline-none" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground"><span>{c.groupQuests.pointsLabel}</span></span>
                    {([5, 10, 25] as const).map(pt => <button key={pt} type="button" onClick={() => setNewPoints(pt)} className={`rounded-full px-3 py-1 text-xs font-bold ${newPoints === pt ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                        {pt} <span>{c.groupQuests.ptsSuffix}</span>
                      </button>)}
                    <button type="button" onClick={createGroupChallenge} disabled={!newTask.trim() || submitting} className="ml-auto rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40">
                      <span>{c.groupQuests.postQuestButton}</span> · {newPoints} <span>{c.groupQuests.ptsSuffix}</span>
                    </button>
                  </div>
                </div>
              </motion.div>}
          </AnimatePresence>

          {groupChallenges.length === 0 ? <div className="surface flex flex-col items-center px-6 py-12 text-center">
              <Target size={28} className="mb-2 text-primary" />
              <p className="text-sm text-muted-foreground"><span>{c.groupQuests.noQuestsEmpty}</span></p>
            </div> : <div className="grid gap-3 md:grid-cols-2">
              {groupChallenges.map((gc, i) => {
                const group = gc.questGroupId ? questGroups.find(g => g.id === gc.questGroupId) : null;
                const audience = group?.memberNames ?? (room.members ?? []).map(m => m.name);
                const completedBy = gc.groupCompletedBy ?? [];
                const isDone = completedBy.includes(user.name);
                const canComplete = audience.includes(user.name);
                const creator = (room.members ?? []).find(m => m.name === gc.fromName);
                const total = audience.length;
                return <motion.article key={gc.id} initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.3, delay: i * 0.05, ease: [0.23, 1, 0.32, 1] }} className={`surface surface-pad ${isDone ? 'ring-2 ring-primary/30' : ''}`}>
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        {gc.groupTitle && <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{gc.groupTitle}</p>}
                        <p className="text-sm font-bold leading-snug">{gc.task}</p>
                      </div>
                      <span className="points-pill shrink-0"><Gem size={11} />{gc.points}</span>
                    </div>
                    <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                      {creator && <Avatar name={gc.fromName} color={creator.color ?? '#888'} size={18} />}
                      <span>{c.groupQuests.byPrefix}</span> {gc.fromName}
                    </div>
                    <div className="mb-3"><ProgressBar value={completedBy.length} max={total} showLabel /></div>
                    {!canComplete ? <p className="text-xs text-muted-foreground"><span>{c.groupQuests.notInQuestGroup}</span></p>
                      : isDone ? <div className="flex items-center gap-1.5 text-sm font-bold text-primary"><CheckCircle2 size={15} /> <span>{c.groupQuests.doneLabel}</span></div>
                      : <button type="button" onClick={() => completeGroupChallenge(gc)} className="pressable rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground">
                          <span>{c.groupQuests.postQuestButton}</span> · {gc.points} {gc.points === 1 ? 'pt' : <span>{c.groupQuests.ptsSuffix}</span>}
                        </button>}
                  </motion.article>;
              })}
            </div>}

          {myGroups.length === 0 && questGroups.length > 0 && <p className="text-xs text-muted-foreground"><span>{c.groupQuests.tipText}</span></p>}
        </section>
      </div>
    </AppLayout>;
}
