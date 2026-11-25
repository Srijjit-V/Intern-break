import { expect, test } from '@playwright/test';
import { createRoom, newUser, trackErrors } from './helpers';

test('phone-size viewport renders the room page without horizontal scroll', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  await page.goto('login');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await ctx.close();
});

test('server down: the UI shows an error state, not a blank page', async ({ browser }) => {
  const { ctx, page } = await newUser(browser, 'Offline Tester');
  const errors = trackErrors(page);
  await createRoom(page, 'Offline Co', 'Offline Tester');
  await page.route('**/api/**', (route) => route.abort());
  await page.goto('leaderboard');
  await expect(page.getByRole('alert')).toContainText(/reach the server|try again/i, { timeout: 15_000 });
  expect(errors).toEqual([]);
  await ctx.close();
});

test('API rejects unauthenticated calls and ignores client-supplied admin role', async ({ browser, request }) => {
  const anon = await request.get('api/company?roomCode=XXXXXX');
  expect(anon.status()).toBe(401);

  const a = await newUser(browser, 'Real Admin');
  const code = await createRoom(a.page, 'Role Co', 'Real Admin');
  const m = await newUser(browser, 'Sneaky Member');
  const res = await m.page.request.post('api/company', {
    data: { action: 'sync-member', roomCode: code, memberName: 'Sneaky Member', color: '#fff', role: 'admin' },
  });
  expect(res.status()).toBe(201);
  const roster = await (await m.page.request.get(`api/company?roomCode=${code}`)).json();
  const sneaky = roster.members.find((x: { name: string }) => x.name === 'Sneaky Member');
  expect(sneaky.role).toBe('employee');

  const neg = await m.page.request.post('api/company', { data: { action: 'redeem', roomCode: code, memberName: 'Sneaky Member', rewardName: 'x', points: -50 } });
  expect(neg.status()).toBe(400);
  await a.ctx.close(); await m.ctx.close();
});

test('no third-party scripts or trackers load, and security headers are present', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const hosts = new Set<string>();
  page.on('request', (r) => hosts.add(new URL(r.url()).host));
  const response = await page.goto('login');
  await page.waitForTimeout(1500);
  const allowed = new Set([new URL(page.url()).host, 'fonts.googleapis.com', 'fonts.gstatic.com']);
  expect([...hosts].filter((h) => !allowed.has(h))).toEqual([]);
  const headers = response!.headers();
  expect(headers['content-security-policy']).toContain("script-src 'self'");
  expect(headers['x-powered-by']).toBeUndefined();
  await ctx.close();
});

test('repeated wrong passwords are rate limited', async ({ request }) => {
  const email = `ratelimit-${Date.now()}@example.test`;
  let last = 0;
  for (let i = 0; i < 10; i++) {
    const res = await request.post('api/auth/sign-in/email', { data: { email, password: 'Wrong-Pass-1!' }, headers: { origin: new URL(process.env.E2E_BASE_URL ?? 'http://localhost:3000').origin } });
    last = res.status();
  }
  expect(last).toBe(429);
});
