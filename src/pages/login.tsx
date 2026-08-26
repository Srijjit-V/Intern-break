import { Helmet } from '@dr.pogodin/react-helmet';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { CircleHelp, Sparkles, UsersRound } from 'lucide-react';
import { auth } from 'virtual:content';
import { signIn, useSession } from '@/lib/auth/auth-client';
import { getUser } from '@/lib/ibs-store';
import Logo from '@/components/Logo';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

function getPostAuthPath(from: string | undefined): string {
  if (from && from !== '/' && from !== '/login') return from;
  return getUser()?.roomCode ? '/challenges' : '/profile';
}

export default function LoginPage() {
  const {
    isAuthenticated,
    isPending
  } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  if (isAuthenticated) return <Navigate to={getPostAuthPath(from)} replace />;
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message || auth.login.invalidCredentials);
        return;
      }
      navigate(getPostAuthPath(from), { replace: true });
    } catch {
      setError(auth.login.genericError);
    } finally {
      setLoading(false);
    }
  }
  return <>
      <Helmet>
        <title>Sign In | Intern Break Space</title>
        <meta name="description" content="Sign in to access your Intern Break Space account and room history." />
        <link rel="canonical" href="https://sprtslp.com/login" />
        <meta name="robots" content="noindex" />
      </Helmet>
      <main className="ambient-stage min-h-screen px-4 py-10">
        <section className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
          <motion.div initial={{
          opacity: 0,
          y: 28
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.55,
          ease: [0.22, 1, 0.36, 1]
        }} className="landing-hero-panel w-full rounded-[2rem] p-7 shadow-lg sm:p-10">
            <div className="relative mb-8 text-center">
              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="icon" aria-label="Learn about Break Space" className="absolute right-0 top-0 h-10 w-10 rounded-full border-primary bg-background text-primary shadow-sm hover:bg-muted">
                    <CircleHelp className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md rounded-3xl border-border bg-card p-0 text-card-foreground">
                  <div className="border-b border-border bg-muted p-6 pr-14">
                    <DialogHeader>
                      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                        <Sparkles className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <DialogTitle className="text-2xl font-bold" style={{
                      fontFamily: 'var(--font-heading)'
                    }}>{auth.login.aboutTitle}</DialogTitle>
                      <DialogDescription className="pt-2 text-sm leading-6 text-muted-foreground">{auth.login.aboutIntro}</DialogDescription>
                    </DialogHeader>
                  </div>
                  <div className="grid gap-4 p-6">
                    {auth.login.aboutPoints.map((point, index) => <article key={point.id} className="flex gap-3 rounded-2xl border border-border bg-background p-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                          {index === 0 ? <UsersRound className="h-4 w-4" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                        </div>
                        <div>
                          <h2 className="font-bold text-foreground">{point.title}</h2>
                          <p className="mt-1 text-sm leading-5 text-muted-foreground">{point.description}</p>
                        </div>
                      </article>)}
                  </div>
                  <div className="flex justify-end border-t border-border p-5">
                    <DialogTrigger asChild>
                      <Button type="button" className="rounded-xl bg-primary font-bold text-primary-foreground hover:bg-secondary">{auth.login.aboutClose}</Button>
                    </DialogTrigger>
                  </div>
                </DialogContent>
              </Dialog>
              <div className="mx-auto flex h-20 w-20 items-center justify-center"><Logo size={80} /></div>
              <h1 className="landing-hero-title mt-5 text-3xl font-bold" style={{
              fontFamily: 'var(--font-heading)'
            }}>{auth.login.title}</h1>
              <p className="landing-hero-copy mt-2 text-sm">{auth.login.subtitle}</p>
            </div>

            {isPending ? <div className="flex justify-center py-10"><span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div> : <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p className="rounded-xl bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground">{error}</p>}
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-foreground">{auth.login.emailLabel}</span>
                  <input value={email} onChange={event => setEmail(event.target.value)} type="email" autoComplete="email" required placeholder={auth.login.emailPlaceholder} className="h-12 w-full rounded-xl border border-border bg-muted px-3 text-foreground outline-none ring-offset-background transition focus:border-primary focus:ring-2 focus:ring-primary" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-foreground">{auth.login.passwordLabel}</span>
                  <input value={password} onChange={event => setPassword(event.target.value)} type="password" autoComplete="current-password" required placeholder={auth.login.passwordPlaceholder} className="h-12 w-full rounded-xl border border-border bg-muted px-3 text-foreground outline-none ring-offset-background transition focus:border-primary focus:ring-2 focus:ring-primary" />
                </label>
                <button type="submit" disabled={loading} className="flex h-14 w-full items-center justify-center rounded-xl bg-primary px-6 text-base font-extrabold text-primary-foreground shadow-md transition hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? auth.login.loading : auth.login.submit}
                </button>
              </form>}
            <p className="mt-6 text-center text-sm text-muted-foreground"><span>{auth.login.noAccount} </span><Link to="/signup" className="font-bold text-primary hover:underline">{auth.login.createAccount}</Link></p>
          </motion.div>
        </section>
      </main>
    </>;
}
