# Desktop Wrapper Refactor - Tracking Checklist

## Epic

Refactor desktop so Electron is only a wrapper, and move app UI/router to apps/web.

## Context

- Desktop is local-first and uses SQLite in Electron main process.
- There is no HTTP backend server for desktop.
- UI currently lives in desktop renderer and talks to main via IPC.
- Goal is to make apps/web the UI source of truth while keeping desktop integrations in Electron.

## Success Criteria

- Desktop runs the apps/web UI in development and production.
- SQLite, sync, updater, and file dialogs remain in Electron main process.
- Renderer uses IPC transport for tRPC in Electron runtime.
- Shared UI no longer depends directly on window.electron globals.
- Old desktop renderer app code is removed after parity validation.

## Runtime and Transport Rules

- Native runtime: use unstable_localLink (DB and context are in the same runtime).
- Desktop renderer runtime: keep IPC link (DB and context live in Electron main).
- Browser standalone web runtime: use HTTP link only if standalone web mode is required.

## Milestone 1 - Scaffold apps/web

- [x] Create apps/web package with Vite + React + TanStack Router setup.
- [x] Copy current desktop renderer UI/routes into apps/web.
- [x] Port styling, aliases, and route generation config.
- [x] Verify apps/web starts and renders base shell.
- [x] Add apps/web scripts to workspace and turbo pipeline.

Definition of Done:

- apps/web boots locally and route tree is generated.
- No desktop-only runtime errors during basic navigation.

## Milestone 2 - Platform Adapter Layer

- [x] Create capability interface for desktop-only features.
- [x] Implement Electron adapter using preload APIs.
- [x] Implement browser adapter with fallbacks/feature disable.
- [x] Replace direct window.electron usages in UI with adapter calls.
- [x] Add capability guards in Settings/Sync/Import-Export UI.

Definition of Done:

- UI compiles without direct window.electron references.
- Desktop capabilities still work via adapter.
- Unsupported features are gracefully handled in browser mode.

## Milestone 3 - tRPC Transport Split

- [x] Create shared tRPC client factory.
- [x] Electron runtime path uses IPC link.
- [x] Browser runtime path uses HTTP link (if standalone web is required).
- [x] Keep query client and error handling shared.
- [ ] Validate query/mutation parity across key screens.

Definition of Done:

- Desktop in Electron uses IPC transport end-to-end.
- No regression in transaction/category/account/app-setting flows.

## Milestone 4 - Convert Desktop to Thin Wrapper

- [x] Remove renderer ownership from desktop build config.
- [x] Keep only Electron main + preload build outputs.
- [x] Development mode loads apps/web dev server URL.
- [x] Production mode loads apps/web built static output.
- [x] Keep existing tRPC IPC handler in main process.

Definition of Done:

- Desktop app launches apps/web UI in dev and prod.
- Database migrations, seed, sync, updater, and dialogs still function.

## Milestone 5 - Cleanup and Docs

- [x] Remove obsolete desktop renderer source after parity signoff.
- [x] Update root README app descriptions and run commands.
- [x] Add architecture note explaining runtime boundaries.
- [x] Add troubleshooting notes for IPC-only desktop tRPC.

Definition of Done:

- Repo has one UI source of truth in apps/web.
- Docs reflect final architecture and run paths.

## QA Checklist

- [ ] Onboarding flow still works.
- [ ] Language/theme persistence still works.
- [ ] Transaction CRUD works.
- [ ] Budget/category/account flows work.
- [ ] Import/export works.
- [ ] Backup/restore works.
- [ ] Sync discovery/pairing/sync works.
- [ ] Updater checks/install prompts work.
- [ ] App version displays correctly.
- [ ] No listener leak after navigation and repeated actions.

## Risks

- [ ] Routing behavior under file-based production load.
- [ ] Desktop-only features visible in standalone browser mode.
- [ ] Event subscription cleanup regressions.
- [ ] Packaging path issues for apps/web artifacts.
- [ ] IPC channel mismatch during migration.

Mitigation:

- Add capability guards early.
- Keep IPC channel names stable.
- Validate dev and packaged builds separately.
- Use phased PR rollout with rollback points.

## Suggested PR Breakdown

- [x] PR 1: apps/web scaffold + UI copy (no behavior change).
- [x] PR 2: adapter layer + direct electron usage removal.
- [x] PR 3: tRPC transport factory split.
- [x] PR 4: desktop wrapper loading switch + build wiring.
- [x] PR 5: old renderer cleanup + docs.

## Issue Labels

- refactor
- desktop
- web
- electron
- trpc
- tanstack-router
- migration

## Owner Notes

- Keep desktop main process as source of truth for SQLite and system integrations.
- Do not move DB context into renderer.
- Keep IPC transport for Electron runtime even without HTTP server.
