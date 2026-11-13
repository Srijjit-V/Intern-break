/**
 * Static demo build for GitHub Pages: client only, no server.
 * Output: dist/pages (index.html, 404.html copy for deep links).
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';

const base = process.env.VITE_BASE_PATH || '/Intern-break/';
const res = spawnSync('npx', ['vite', 'build', '--outDir', 'dist/pages'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_DEMO_MODE: 'true', VITE_BASE_PATH: base },
});
if (res.status !== 0) process.exit(res.status ?? 1);

// The SSR placeholders only make sense with the Express server.
const file = 'dist/pages/index.html';
writeFileSync(file, readFileSync(file, 'utf8').replace('<!--app-head-->', '').replace('<!--app-html-->', ''));
// GitHub Pages serves 404.html for unknown paths: same shell, so deep links load the SPA.
copyFileSync(file, 'dist/pages/404.html');
console.log(`demo build ready in dist/pages (base ${base})`);
