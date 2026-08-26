import { Helmet } from '@dr.pogodin/react-helmet';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from "react-router";
import { motion } from 'motion/react';
import { auth } from 'virtual:content';
import { signUp, useSession } from '@/lib/auth/auth-client';
import Logo from '@/components/Logo';
function validatePassword(password: string): string | null {
  if (password.length < 8) return auth.signup.passwordLength;
  if (!/[A-Z]/.test(password)) return auth.signup.passwordUppercase;
  if (!/[0-9]/.test(password)) return auth.signup.passwordNumber;
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/`~]/.test(password)) return auth.signup.passwordSpecial;
  return null;
}
export default function SignupPage() {
  const {
    isAuthenticated,
    isPending
  } = useSession();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  if (isAuthenticated) return <Navigate to="/profile" replace />;
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    setLoading(true);
    try {
      const result = await signUp.email({
        email,
        password,
        name: name.trim()
      });
      if (result.error) {
        setError(result.error.message || auth.signup.genericError);
        return;
      }
      navigate('/profile', {
        replace: true
      });
    } catch {
      setError(auth.signup.genericError);
    } finally {
      setLoading(false);
    }
  }
  return <>
      <Helmet>
        <title>Create Account | Intern Break Space</title>
        <meta name="description" content="Create an Intern Break Space account to keep your rooms and profiles together." />
        <link rel="canonical" href="https://sprtslp.com/signup" />
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
            <div className="mb-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center"><Logo size={64} /></div>
              <h1 className="landing-hero-title mt-5 text-3xl font-bold" style={{
              fontFamily: 'var(--font-heading)'
            }}>{auth.signup.title}</h1>
              <p className="landing-hero-copy mt-2 text-sm">{auth.signup.subtitle}</p>
            </div>

            {isPending ? <div className="flex justify-center py-10"><span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div> : <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p className="rounded-xl bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground">{error}</p>}
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-foreground">{auth.signup.nameLabel}</span>
                  <input value={name} onChange={event => setName(event.target.value)} type="text" autoComplete="name" required placeholder={auth.signup.namePlaceholder} className="h-12 w-full rounded-xl border border-border bg-muted px-3 text-foreground outline-none ring-offset-background transition focus:border-primary focus:ring-2 focus:ring-primary" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-foreground">{auth.signup.emailLabel}</span>
                  <input value={email} onChange={event => setEmail(event.target.value)} type="email" autoComplete="email" required placeholder={auth.signup.emailPlaceholder} className="h-12 w-full rounded-xl border border-border bg-muted px-3 text-foreground outline-none ring-offset-background transition focus:border-primary focus:ring-2 focus:ring-primary" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-foreground">{auth.signup.passwordLabel}</span>
                  <input value={password} onChange={event => setPassword(event.target.value)} type="password" autoComplete="new-password" required placeholder={auth.signup.passwordPlaceholder} className="h-12 w-full rounded-xl border border-border bg-muted px-3 text-foreground outline-none ring-offset-background transition focus:border-primary focus:ring-2 focus:ring-primary" />
                  <span className="mt-1.5 block text-xs text-muted-foreground">{auth.signup.passwordHint}</span>
                </label>
                <button type="submit" disabled={loading} className="landing-quests-button flex h-12 w-full items-center justify-center rounded-full px-6 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? auth.signup.loading : auth.signup.submit}
                </button>
              </form>}
            <p className="mt-6 text-center text-sm text-muted-foreground"><span>{auth.signup.hasAccount} </span><Link to="/login" className="font-bold text-primary hover:underline">{auth.signup.signIn}</Link></p>
          </motion.div>
        </section>
      </main>
    </>;
}
