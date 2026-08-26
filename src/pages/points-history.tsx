import { useEffect, useState } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { CalendarDays, History, ShieldCheck, Gem } from 'lucide-react';
import AppLayout from '@/layouts/AppLayout';
import { getRoom, getUser, type IBSRoom } from '@/lib/ibs-store';
import { points_history } from 'virtual:content';

export default function PointsHistoryPage() {
  const [room, setRoom] = useState<IBSRoom | null>(null);

  useEffect(() => {
    const currentUser = getUser();
    setRoom(currentUser ? getRoom(currentUser.roomCode ?? '') : null);
  }, []);

  const weeklyHistory = (room?.weeklyPointHistory as Array<{ weekStart: string; weekEnd: string; members: Array<{ name: string; earned: number; carryover: number; closing: number }> }> | undefined) ?? [];

  const currentRows = (room?.members ?? []).map((member) => ({
    ...member,
    balance: Number(member.allTimePoints ?? 0),
  })).sort((a, b) => b.balance - a.balance);

  return (
    <AppLayout title="Points">
      <Helmet>
        <title>{points_history.meta.title}</title>
        <meta name="description" content={points_history.meta.description} />
        <link rel="canonical" href="/points-history" />
      </Helmet>
      <main className="page-shell space-y-8">
        <section className="quest-hero">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-foreground/80">
            <History size={12} /> Ledger
          </span>
          <h1 className="mt-2 text-4xl font-extrabold md:text-5xl" style={{ fontFamily: 'var(--font-heading)' }}>{points_history.hero.title}</h1>
          <p className="mt-3 max-w-2xl text-sm text-primary-foreground/85 md:text-base">{points_history.hero.description}</p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-extrabold" style={{ fontFamily: 'var(--font-heading)' }}>{points_history.live.title}</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {currentRows.map((member) => (
              <article key={member.name} className="surface surface-pad">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: member.color as string | undefined }}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold">{member.name}</h3>
                    <p className="text-xs text-muted-foreground">{points_history.live.available}</p>
                  </div>
                  <span className="points-pill"><Gem size={11} />{member.balance}</span>
                </div>
                <div className="mt-4 rounded-2xl bg-muted px-3 py-2 text-xs">
                  <span className="text-muted-foreground">{points_history.live.latest}</span>
                  <span className="mt-1 block text-sm font-bold">{member.points}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays size={16} className="text-primary" />
            <h2 className="text-xl font-extrabold" style={{ fontFamily: 'var(--font-heading)' }}>{points_history.history.title}</h2>
          </div>
          {weeklyHistory.length === 0 ? (
            <div className="surface surface-pad text-center text-muted-foreground">{points_history.history.empty}</div>
          ) : (
            <div className="space-y-4">
              {weeklyHistory.map((entry) => (
                <article key={entry.weekStart} className="surface overflow-hidden">
                  <header className="flex items-center gap-2 border-b border-border px-4 py-3">
                    <ShieldCheck size={15} className="text-primary" />
                    <h3 className="font-bold">{entry.weekStart} to {entry.weekEnd}</h3>
                  </header>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-medium">{points_history.history.headers.member}</th>
                          <th className="px-4 py-3 font-medium">{points_history.history.headers.earned}</th>
                          <th className="px-4 py-3 font-medium">{points_history.history.headers.carryover}</th>
                          <th className="px-4 py-3 font-medium">{points_history.history.headers.closing}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.members.map((member) => (
                          <tr key={member.name} className="border-t border-border">
                            <td className="px-4 py-3 font-semibold">{member.name}</td>
                            <td className="px-4 py-3">{member.earned}</td>
                            <td className="px-4 py-3">{member.carryover}</td>
                            <td className="px-4 py-3 font-bold text-primary">{member.closing}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </AppLayout>
  );
}
