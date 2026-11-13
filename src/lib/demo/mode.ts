/** Static demo build (GitHub Pages): no server, no login, data stays in the browser. */
export const DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

/** Join a path onto the Vite base path (`/` normally, `/Intern-break/` on Pages). */
export function withBase(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}

export const DEMO_ROOM_CODE = 'DEMO42';
const ACCOUNT_KEY = 'ibs-demo-account';

export interface DemoAccount {
  id: string;
  name: string;
  email: string;
}

export function getDemoAccount(): DemoAccount {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    if (raw) return JSON.parse(raw) as DemoAccount;
  } catch {
    /* storage unavailable: fall through to a fresh profile */
  }
  const account = { id: 'demo-user', name: 'Demo Intern', email: 'demo@example.test' };
  try {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  } catch {
    /* ignore */
  }
  return account;
}

export function resetDemoProfile(): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('ibs') || k.startsWith('ibs-demo'))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
