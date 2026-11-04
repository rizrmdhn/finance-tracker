# Finance Tracker

A personal finance tracking application built as a TypeScript monorepo, available on web, desktop (Electron), and mobile (Expo).

## Apps

| App            | Description                                                                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`     | Web UI (React + Vite + TanStack Router) — the single UI source of truth, runs standalone in the browser and is loaded by the desktop Electron wrapper     |
| `apps/desktop` | Desktop app (Electron) — thin wrapper around `apps/web` — Windows/macOS/Linux — releases at [rizrmdhn/finance-tracker](https://github.com/rizrmdhn/finance-tracker/releases) |
| `apps/native`  | Mobile app (React Native + Expo) — Android APK releases at [rizrmdhn/finance-tracker-mobile](https://github.com/rizrmdhn/finance-tracker-mobile/releases) |

## Packages

| Package                 | Description                                         |
| ----------------------- | --------------------------------------------------- |
| `packages/api`          | tRPC router and API handlers                        |
| `packages/db`           | Drizzle ORM setup, migrations, and SQLite database  |
| `packages/schema`       | Shared Zod schemas                                  |
| `packages/queries`      | Shared TanStack Query hooks                         |
| `packages/ui`           | Shared shadcn/ui components and styles              |
| `packages/types`        | Shared TypeScript types                             |
| `packages/constants`    | Shared constants                                    |
| `packages/dictionaries` | i18n dictionaries                                   |
| `packages/env`          | Environment variable validation                     |
| `packages/utils`        | Shared utility functions                            |
| `packages/config`       | Shared tooling config (TypeScript, Biome, Tailwind) |

## Getting Started

Install dependencies:

```bash
bun install
```

**Desktop + Web development** (most common):

```bash
bun run dev:desktop-web
```

This starts `apps/web` on [http://localhost:3000](http://localhost:3000) and the Electron main/preload watcher simultaneously. The Electron window loads the web dev server automatically.

**Standalone web** (browser only):

```bash
bun run dev:web
```

**Mobile**:

```bash
bun run dev:native
```

## Available Scripts

| Script                     | Description                                                        |
| -------------------------- | ------------------------------------------------------------------ |
| `bun run dev:desktop-web`  | Start apps/web dev server + Electron main/preload watcher together |
| `bun run dev:web`          | Start only the web app (browser standalone)                        |
| `bun run dev:desktop`      | Start only the Electron main/preload watcher                       |
| `bun run dev:native`       | Start the Expo/React Native dev server                             |
| `bun run build`            | Build all apps and packages                                        |
| `bun run desktop:build`    | Build apps/web then package it into the Electron output            |
| `bun run desktop:pack`     | Build and produce a platform installer                             |
| `bun run db:migrate`       | Run database migrations                                            |
| `bun run db:generate`      | Generate Drizzle migration files                                   |
| `bun run db:studio`        | Open Drizzle Studio                                                |
| `bun run check-types`      | Type-check all apps and packages                                   |
| `bun run check`            | Run Biome formatting and linting (with auto-fix)                   |

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

## Architecture

### Runtime Boundaries

```
┌─────────────────────────────────────────────────┐
│  Electron main process                          │
│  - SQLite database (better-sqlite3 + cr-sqlite) │
│  - Drizzle ORM + migrations                     │
│  - tRPC router (appRouter)                      │
│  - Auto-updater (electron-updater)              │
│  - Sync server (mDNS + WebSocket)               │
│  - File dialogs (backup/restore/import/export)  │
└────────────────┬────────────────────────────────┘
                 │ IPC (trpc-electron)
┌────────────────▼────────────────────────────────┐
│  Electron preload                               │
│  - Exposes tRPC IPC bridge (exposeElectronTRPC) │
│  - Exposes window.electronApp / electronSync /  │
│    electronDataManager / electronUpdater        │
└────────────────┬────────────────────────────────┘
                 │ contextBridge globals
┌────────────────▼────────────────────────────────┐
│  apps/web (renderer / standalone browser)       │
│  - React + TanStack Router                      │
│  - Platform adapter detects runtime:            │
│    • Electron → IPC link + native capability    │
│    • Browser  → HTTP link + browser fallbacks   │
└─────────────────────────────────────────────────┘
```

### tRPC Transport

| Runtime           | Transport               | Where DB lives     |
| ----------------- | ----------------------- | ------------------ |
| Electron renderer | `ipcLink` (trpc-electron) | Electron main      |
| Browser standalone | `httpBatchLink`         | External API server |

The transport is selected automatically at startup via `window.electronApp` detection in `apps/web/src/lib/trpc.ts`.

### Platform Adapter (`apps/web/src/platform/`)

All Electron-specific capabilities (updater, native file dialogs, sync) are accessed through a capability interface. The correct adapter is injected at runtime:

- `electron.ts` — delegates to `window.electronApp`, `window.electronDataManager`, `window.electronSync`, `window.electronUpdater`
- `browser.ts` — safe fallbacks; uses `<a download>` for export and `<input type="file">` for import
- UI uses `platform.updater.isSupported` / `platform.dataManager.supportsNativeDialogs` / `platform.sync.isSupported` guards to hide Electron-only sections

### Development Workflow

In development, `apps/desktop` does **not** build its own renderer. Instead, `electron-vite dev` watches only `main` and `preload`, and the Electron window loads the `apps/web` Vite dev server at `http://localhost:3000` (overridable via `WEB_DEV_URL` env var).

In production, `bun run build` in `apps/desktop` first builds `apps/web` with Vite, then copies the static output into `out/renderer/`, which `electron-builder` includes in the packaged app.

### Troubleshooting Desktop tRPC (IPC)

- **Queries return undefined / tRPC not connected**: confirm `exposeElectronTRPC()` is called in `apps/desktop/src/preload/index.ts` and `createIPCHandler` is called in `apps/desktop/src/main/index.ts`.
- **IPC link used in browser by mistake**: open DevTools → Console and check for `window.electronApp`. It must be `undefined` in a plain browser and defined in Electron.
- **`ipcLink` throws at import in browser**: this should not happen because the link is only instantiated when `isElectron` is true. If it does, check for a bundler polyfill issue.
- **HMR causes double-registration errors in preload**: the preload uses `if (!("electronApp" in window))` guards around each `contextBridge.exposeInMainWorld` call to handle this safely.

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
