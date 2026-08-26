/**
 * Auto-synced registry of publicly-crawlable routes. Consumed by the
 * /sitemap.xml handler in src/server/entry.ts.
 *
 * DO NOT add or remove paths by hand. Static paths are mirrored here from
 * src/routes.tsx automatically whenever that file is edited (any manual
 * path edit would be overwritten on the next routes.tsx change). For sync
 * to pick up a route, its `path` must be a literal string starting with "/";
 * template literals and identifier refs are skipped, and dynamic-param routes
 * like "/products/:id" are excluded.
 *
 * The only fields safe to hand-edit are the per-entry metadata below, after a
 * sync:
 * - `priority` (0.0–1.0): Home = 1.0, main sections = 0.8, deep pages = 0.5.
 * - `changefreq` and `lastmod`.
 */

export interface SeoRoute {
  path: string;
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
  lastmod?: string;
}

export const seoRoutes: SeoRoute[] = [
  { path: "/", changefreq: "weekly", priority: 1.0 },
  { path: "/room", changefreq: "monthly", priority: 0.8 },
  { path: "/rooms", changefreq: "monthly", priority: 0.8 },
  { path: "/login", changefreq: "monthly", priority: 0.8 },
  { path: "/signup", changefreq: "monthly", priority: 0.8 },
  { path: "/challenges", changefreq: "monthly", priority: 0.8 },
  { path: "/leaderboard", changefreq: "monthly", priority: 0.8 },
  { path: "/weekly-recap", changefreq: "monthly", priority: 0.8 },
  { path: "/points-history", changefreq: "monthly", priority: 0.8 },
  { path: "/rewards", changefreq: "monthly", priority: 0.8 },
  { path: "/closet", changefreq: "monthly", priority: 0.8 },
  { path: "/games", changefreq: "monthly", priority: 0.8 },
  { path: "/flappy", changefreq: "monthly", priority: 0.8 },
  { path: "/typing", changefreq: "monthly", priority: 0.8 },
  { path: "/typing-race", changefreq: "monthly", priority: 0.8 },
  { path: "/freezeria", changefreq: "monthly", priority: 0.8 },
  { path: "/snake", changefreq: "monthly", priority: 0.8 },
  { path: "/memory", changefreq: "monthly", priority: 0.8 },
  { path: "/trivia", changefreq: "monthly", priority: 0.8 },
  { path: "/set", changefreq: "monthly", priority: 0.8 },
  { path: "/crossy", changefreq: "monthly", priority: 0.8 },
  { path: "/profile", changefreq: "monthly", priority: 0.8 },
  { path: "/admin", changefreq: "monthly", priority: 0.8 },
];
