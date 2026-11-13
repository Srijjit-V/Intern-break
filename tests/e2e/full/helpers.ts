import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

export const PASSWORD = 'password-12345';
let counter = 0;
export const uniqueEmail = (tag: string) => `${tag}-${Date.now()}-${counter++}@example.test`;

/** Collects uncaught page errors so a test can assert there were none. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

export async function signUp(page: Page, name: string, email = uniqueEmail('user')) {
  await page.goto('signup');
  await page.getByPlaceholder(/name/i).first().fill(name);
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(PASSWORD);
  await page.locator('button[type=submit]').click();
  await page.waitForURL(/\/(profile|room|challenges)/);
  return email;
}

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto('login');
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.locator('button[type=submit]').click();
}

export async function createRoom(page: Page, company: string, name: string): Promise<string> {
  await page.goto('room');
  await page.getByRole('tab', { name: 'Create' }).click();
  await page.getByPlaceholder('Acme Corp').fill(company);
  await page.getByPlaceholder('Jordan').fill(name);
  await page.getByRole('button', { name: /Create room/ }).click();
  await page.waitForURL(/challenges/);
  await page.goto('admin');
  const code = (await page.getByText(/^[A-Z0-9]{6}$/).first().innerText()).trim();
  expect(code).toMatch(/^[A-Z0-9]{6}$/);
  return code;
}

export async function joinRoom(page: Page, code: string, name: string) {
  await page.goto('room');
  await page.getByRole('tab', { name: 'Join' }).click();
  await page.getByPlaceholder('AB3X7K').fill(code);
  await page.getByPlaceholder('Alex').fill(name);
  await page.getByRole('button', { name: /Enter room/ }).click();
  await page.waitForURL(/challenges/);
}

/** A fresh signed-in context+page, optionally already in a room. */
export async function newUser(browser: Browser, name: string): Promise<{ ctx: BrowserContext; page: Page; email: string }> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const email = await signUp(page, name);
  return { ctx, page, email };
}
