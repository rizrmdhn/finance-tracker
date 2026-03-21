# Finance Tracker

A personal finance tracking application built as a TypeScript monorepo, available on web, desktop (Electron), and mobile (Expo).

## Apps

| App | Description |
|-----|-------------|
| `apps/web` | Web frontend (React + TanStack Router) |
| `apps/desktop` | Desktop app (Electron, v0.3.3) — Windows/macOS/Linux |
| `apps/native` | Mobile app (React Native + Expo) |

## Packages

| Package | Description |
|---------|-------------|
| `packages/api` | tRPC router and API handlers |
| `packages/db` | Drizzle ORM setup, migrations, and SQLite database |
| `packages/schema` | Shared Zod schemas |
| `packages/queries` | Shared TanStack Query hooks |
| `packages/ui` | Shared shadcn/ui components and styles |
| `packages/types` | Shared TypeScript types |
| `packages/constants` | Shared constants |
| `packages/dictionaries` | i18n dictionaries |
| `packages/env` | Environment variable validation |
| `packages/utils` | Shared utility functions |
| `packages/config` | Shared tooling config (TypeScript, Biome, Tailwind) |

## Getting Started

Install dependencies:

```bash
bun install
```

Run all apps in development mode:

```bash
bun run dev
```

- Web: [http://localhost:3001](http://localhost:3001)
- Desktop: Electron window opens automatically
- Mobile: Use the Expo Go app after running `bun run dev:native`

## Available Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start all apps in development mode |
| `bun run dev:web` | Start only the web app |
| `bun run dev:desktop` | Start only the desktop app |
| `bun run dev:native` | Start the Expo/React Native dev server |
| `bun run build` | Build all apps |
| `bun run desktop:build` | Build the desktop app |
| `bun run desktop:pack` | Package the desktop app as an installer |
| `bun run db:migrate` | Run database migrations |
| `bun run db:generate` | Generate Drizzle migration files |
| `bun run db:studio` | Open Drizzle Studio |
| `bun run check-types` | Type-check all apps and packages |
| `bun run check` | Run Biome formatting and linting (with auto-fix) |

## Tech Stack

- **TypeScript** — end-to-end type safety
- **Turborepo** — monorepo task orchestration
- **tRPC** — fully typed API layer shared across apps
- **Drizzle ORM + SQLite** — local-first database
- **React + TanStack Router** — web and desktop UI
- **Electron + electron-vite** — desktop packaging
- **React Native + Expo** — mobile
- **TailwindCSS v4** — styling
- **shadcn/ui** — shared UI primitives (`packages/ui`)
- **Biome** — linting and formatting

## UI Components

Shared shadcn/ui primitives live in `packages/ui`. To add more:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components:

```tsx
import { Button } from "@finance-tracker/ui/components/button";
```

For app-specific blocks, run the shadcn CLI from the individual app directory.
