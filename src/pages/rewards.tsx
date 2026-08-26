import { useEffect, useState } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { Gift, Shirt, Tag, CheckCircle2, Clock3, FlaskConical, BriefcaseBusiness, Utensils, Gem } from 'lucide-react';
import { Link } from "react-router";
import AppLayout from '@/layouts/AppLayout';
import { getRoom, getUser, spendDiamonds, type IBSUser } from '@/lib/ibs-store';
import { loadCompanyData, redeemCompanyReward, syncCompanyMember, type SharedRedemption } from '@/lib/company-api';
import { rewards } from 'virtual:content';
const rewardIcons = {
  Shirt,
  Hoodie: Gift,
  Lanyard: Tag,
  Bottle: FlaskConical,
  BriefcaseBusiness,
  Utensils
} as const;
export default function RewardsPage() {
  const [user, setUser] = useState<IBSUser | null>(null);
  const [diamonds, setDiamonds] = useState(0);
  const [redemptions, setRedemptions] = useState<SharedRedemption[]>([]);
  const [message, setMessage] = useState('');
  async function refresh() {
    const currentUser = getUser();
    setUser(currentUser);
    if (!currentUser) return;
    const room = getRoom(currentUser.roomCode ?? '');
    if (!room) return;
    const member = room.members?.find(m => m.name === currentUser.name);
    setDiamonds(member?.diamonds ?? currentUser.diamonds ?? 0);
    try {
      await syncCompanyMember({
        roomCode: currentUser.roomCode ?? '',
        companyName: room.companyName ?? '',
        memberName: currentUser.name,
        color: currentUser.color ?? '#888',
        role: currentUser.role ?? 'employee',
        points: currentUser.points,
        allTimePoints: currentUser.allTimePoints,
        carryoverPoints: member?.diamonds ?? currentUser.diamonds ?? 0
      });
      const data = await loadCompanyData(currentUser.roomCode ?? '');
      setRedemptions(data.redemptions.filter(item => item.memberName === currentUser.name));
    } catch {
      // Local diamonds still work if company API is down
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  async function redeem(name: string, pointsLabel: string) {
    if (!user) return;
    const cost = Number.parseInt(pointsLabel, 10);
    if (!spendDiamonds(user.roomCode ?? '', user.name, cost)) {
      setMessage(rewards.labels.insufficient);
      await refresh();
      return;
    }
    try {
      await redeemCompanyReward({
        roomCode: user.roomCode ?? '',
        memberName: user.name,
        rewardName: name,
        points: cost
      });
      setMessage('Reward request sent to your admins for physical fulfillment. Diamonds spent.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Redeemed locally — admin sync pending.');
    }
    await refresh();
  }
  return <AppLayout title="Rewards">
      <Helmet>
        <title>Rewards | Intern Break Space</title>
        <meta name="description" content="Redeem Diamonds for team merchandise and physical rewards." />
        <link rel="canonical" href="/rewards" />
      </Helmet>
      <main className="max-w-6xl mx-auto p-5 md:p-7">
        <section className="rounded-2xl border-2 border-border bg-card p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold text-sky-400">Physical rewards · Diamonds</p>
              <h1 className="mt-2 text-3xl font-bold text-foreground">{rewards.hero.title}</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Diamonds unlock physical merch. For virtual clothes, spend Gold in the{' '}
                <Link to="/closet" className="font-semibold text-amber-500 hover:underline">Closet</Link>.
              </p>
            </div>
            <div className="min-w-44 rounded-xl border-2 border-sky-400/60 bg-sky-500/10 px-5 py-4">
              <div className="flex items-center gap-2 text-sky-400">
                <Gem size={18} />
                <span className="text-sm font-semibold">Diamonds</span>
              </div>
              <p className="mt-1 flex items-center gap-1 text-3xl font-bold text-foreground">{diamonds}</p>
              <p className="text-[10px] text-muted-foreground mt-1">You earn fewer diamonds than gold per win</p>
            </div>
          </div>
          {message && <p className="mt-5 rounded-lg px-4 py-3 text-sm font-medium bg-muted text-foreground">{message}</p>}
        </section>
        <section className="mt-7 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rewards.rewards.map(reward => {
          const Icon = rewardIcons[reward.icon as keyof typeof rewardIcons] ?? Gift;
          const points = Number.parseInt(reward.points, 10);
          return <article key={reward.id} className="flex flex-col rounded-2xl border-2 border-border bg-card p-5">
                <Icon size={32} className="text-sky-400" aria-hidden="true" />
                <h2 className="mt-5 text-xl font-bold text-foreground">{reward.name}</h2>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{reward.description}</p>
                <div className="mt-6 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1 rounded-full bg-sky-500 px-2 py-1 text-xs font-bold text-white">
                    <Gem size={12} aria-hidden="true" />{points} ♦
                  </span>
                  <button onClick={() => void redeem(reward.name, reward.points)} disabled={diamonds < points} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-secondary disabled:opacity-40">
                    {rewards.labels.redeem}
                  </button>
                </div>
              </article>;
        })}
        </section>
        <section className="mt-9">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={18} className="text-primary" />
            <h2 className="text-xl font-bold text-foreground">{rewards.labels.history}</h2>
          </div>
          {redemptions.length === 0 ? <div className="rounded-xl border border-dashed border-border p-7 text-center text-muted-foreground">{rewards.labels.emptyHistory}</div> : <div className="grid grid-cols-1 gap-3">
              {redemptions.map(redemption => <article key={redemption.id} className="flex items-center justify-between rounded-xl border-2 border-border bg-card px-4 py-3">
                  <div>
                    <p className="font-semibold text-foreground">{redemption.rewardName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(redemption.redeemedAt).toLocaleDateString()} · {redemption.fulfilled ? 'Fulfilled' : 'Awaiting physical fulfillment'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sky-400">
                    {redemption.fulfilled ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}
                    <span className="font-bold">-{redemption.points} ♦</span>
                  </div>
                </article>)}
            </div>}
        </section>
      </main>
    </AppLayout>;
}
