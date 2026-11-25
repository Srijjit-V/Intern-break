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

  const neg = await m.page.request.post('api/company', { data: { action: 'redeem', roomCode: code, memberName: 'Sneaky Member', rewardName: 'Cozy Hoodie', points: -50 } });
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

test('an empty room cannot be taken over, and only the creator is admin', async ({ browser }) => {
  const a = await newUser(browser, 'Room Creator');
  const code = await createRoom(a.page, 'Takeover Co', 'Room Creator');
  const b = await newUser(browser, 'Late Joiner');

  // Creator leaves: the room is now empty.
  const left = await a.page.request.post('api/account', { data: { action: 'leave-room', roomCode: code } });
  expect(left.ok()).toBeTruthy();

  // A stranger who knows the code joins the empty room: they must NOT become admin.
  const joined = await b.page.request.post('api/company', {
    data: { action: 'sync-member', roomCode: code, memberName: 'Late Joiner', color: '#fff' },
  });
  expect(joined.status()).toBe(201);
  const roster = await (await b.page.request.get(`api/company?roomCode=${code}`)).json();
  expect(roster.members.find((m: { name: string }) => m.name === 'Late Joiner').role).toBe('employee');

  // The creator coming back is admin again.
  await a.page.request.post('api/company', { data: { action: 'sync-member', roomCode: code, memberName: 'Room Creator', color: '#fff' } });
  const roster2 = await (await a.page.request.get(`api/company?roomCode=${code}`)).json();
  expect(roster2.members.find((m: { name: string }) => m.name === 'Room Creator').role).toBe('admin');

  // An admin the creator appoints cannot demote the creator.
  const promoteB = await a.page.request.post('api/company', { data: { action: 'set-role', roomCode: code, memberName: 'Late Joiner', role: 'admin' } });
  expect(promoteB.ok()).toBeTruthy();
  const demote = await b.page.request.post('api/company', { data: { action: 'set-role', roomCode: code, memberName: 'Room Creator', role: 'employee' } });
  expect(demote.status()).toBe(403);
  await a.page.request.post('api/company', { data: { action: 'set-role', roomCode: code, memberName: 'Late Joiner', role: 'employee' } });

  // The stranger cannot grant themselves admin either.
  const promote = await b.page.request.post('api/company', { data: { action: 'set-role', roomCode: code, memberName: 'Late Joiner', role: 'admin' } });
  expect(promote.status()).toBe(403);
  await a.ctx.close(); await b.ctx.close();
});

test('forged points are capped, prices come from the server, and redemptions are limited', async ({ browser }) => {
  const u = await newUser(browser, 'Cheat Tester');
  const code = await createRoom(u.page, 'Cheat Co', 'Cheat Tester');
  const sync = (n: number) => u.page.request.post('api/company', {
    data: { action: 'sync-member', roomCode: code, memberName: 'Cheat Tester', color: '#fff', points: n, allTimePoints: n, carryoverPoints: n },
  });
  const me = async () => (await (await u.page.request.get(`api/company?roomCode=${code}`)).json()).members.find((m: { name: string }) => m.name === 'Cheat Tester');

  // A forged billion-point total is clamped to the hourly budget, and repeating it adds nothing.
  expect((await sync(999_999_999)).status()).toBe(201);
  const first = await me();
  expect(first.points).toBeLessThanOrEqual(150);
  expect(first.carryoverPoints).toBeLessThanOrEqual(400);
  await sync(999_999_999);
  await sync(999_999_999);
  const again = await me();
  expect(again.points).toBe(first.points);
  expect(again.carryoverPoints).toBe(first.carryoverPoints);

  // All-time-only syncs spend the same budget: repeating them cannot climb past the cap.
  for (let i = 0; i < 5; i++) {
    await u.page.request.post('api/company', { data: { action: 'sync-member', roomCode: code, memberName: 'Cheat Tester', color: '#fff', points: 0, allTimePoints: 999_999_999, carryoverPoints: 0 } });
  }
  expect((await me()).allTimePoints).toBeLessThanOrEqual(150);

  // A client cannot set its own price or invent a reward.
  const cheap = await u.page.request.post('api/company', { data: { action: 'redeem', roomCode: code, memberName: 'Cheat Tester', rewardName: 'Cozy Hoodie', points: 1 } });
  expect(cheap.status()).toBe(400);
  const fake = await u.page.request.post('api/company', { data: { action: 'redeem', roomCode: code, memberName: 'Cheat Tester', rewardName: 'Free Car', points: 1 } });
  expect(fake.status()).toBe(400);

  // Real redemptions work until the open-reward limit (3), then stop.
  const redeem = () => u.page.request.post('api/company', { data: { action: 'redeem', roomCode: code, memberName: 'Cheat Tester', rewardName: 'Team Lanyard', points: 75 } });
  expect([(await redeem()).status(), (await redeem()).status(), (await redeem()).status()]).toEqual([201, 201, 201]);
  expect((await redeem()).status()).toBe(429);
  await u.ctx.close();
});
