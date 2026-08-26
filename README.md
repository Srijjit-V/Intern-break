# Intern Break Space

A shared social arcade and rewards space for internship teams — sign in, join your team's room, play quick mini-games between tasks, earn points, and climb the leaderboard.

## Features

- **Mini-game arcade** — Flappy Bird, Papa's Freezeria, Snake, Memory Match, Trivia Blitz, Set, Crossy Road, Typing, and Typing Race, each with its own scoring and leaderboard integration
- **Rooms** — interns join a shared room with their team using a room code
- **Points & rewards** — earn points from games and challenges, redeem them in an avatar shop and rewards catalog
- **Leaderboard** — live team and individual rankings
- **Custom avatars** — pick and customize an in-app avatar
- **Auth** — email-based sign in/sign up with session management
- **Admin panel** — manage rooms, users, and content
- **Server-side rendering** — Express-backed SSR for fast first loads and SEO-friendly pages

## Tech Stack

**Frontend:** React 19, TypeScript, Vite 6, React Router 7, Tailwind CSS, shadcn/ui (Radix primitives), Motion for animation

**Backend:** Express (API routes + SSR entry), Drizzle ORM over MySQL

**Tooling:** ESLint, Prettier, Vitest, TypeScript strict mode

> Requires Node.js 22+.

## Project Structure

```
src/
├── components/       # Shared UI components (incl. shadcn/ui primitives)
├── layouts/          # Root, Website, and Dashboard layout shells
├── pages/            # Route-level pages — games, profile, admin, auth, etc.
├── lib/              # Client utilities, auth, API clients, game registry
├── server/           # Express API routes, DB schema, SSR entry point
├── content/          # Structured page/content data
└── styles/           # Global styles
public/
├── games/            # Game thumbnail art
└── rewards/          # Reward item art
```

## Getting Started

```bash
# install dependencies
npm install

# copy environment variables and fill in the values you need
cp env.example .env

# start the dev server
npm run dev
```

Other useful scripts:

```bash
npm run build         # production build (client + SSR)
npm run preview        # preview a production build
npm run test            # run the test suite
npm run lint             # lint the codebase
npm run type-check    # TypeScript check with no emit
```

## License

This project is currently unlicensed for external use — all rights reserved.
