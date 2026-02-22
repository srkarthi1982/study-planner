⚠️ Mandatory: AI agents must read this file before writing or modifying any code.

MANDATORY: After completing each task, update this repo’s AGENTS.md Task Log (newest-first) before marking the task done.
This file complements the workspace-level Ansiversa-workspace/AGENTS.md (source of truth). Read workspace first.

⚠️ Mandatory: AI agents must read this file before writing or modifying any code in the study-planner repo.

# AGENTS.md
## Study Planner Repo – Session Notes (Codex)

This file records what was built/changed so far for the study-planner repo. Read first.

---

## 1. Current Architecture (Study Planner)

- Study Planner mini-app aligned to Ansiversa AppStarter standards.
- Auth + billing locals normalized in middleware with DEV_BYPASS support.
- AppShell includes parent notification unread count (SSR) and AppAdminShell for admin routes.
- Study Planner module uses Alpine store (`studyPlanner`) for Plans/Tasks/Logs/Today flows.
- Dashboard summary schema + webhook push wired for key events.
- Parent notification emits for task due/overdue/completed.

---

## 2. DB Tables

- `StudyPlans`
- `StudyPlanTasks`
- `StudyLogs`

---

## 3. Task Log (Newest first)

- 2026-02-02 Study Planner V1 — FROZEN (production-approved baseline).
- 2026-02-02 Aligned table naming (StudyPlanTasks/StudyLogs), removed admin pages, and extended dashboard summary (overdue + lastActivityAt).
- 2026-02-02 Prepared study-planner V1 for commit/push and handoff to Astra verification.
- 2026-02-02 Bootstrapped study-planner from AppStarter baseline (env, middleware, layouts, actions, modules).
- 2026-02-02 Implemented Study Planner V1 (Plans, Tasks, Logs, Today) with FREE_LIMITS + requirePro gating.
- 2026-02-02 Added dashboard summary builder + webhook push on key events.
- 2026-02-02 Added parent notification emits for due/overdue/completed tasks.
- 2026-02-02 Added help, admin pages, and notification unread-count proxy.

---

## 4. Verification Log

- 2026-02-02 `npm run typecheck` (pass; 7 hints in redirects/baseRepository/seed).
- 2026-02-02 `npm run build` (pass).
- 2026-02-02 `npm run db:push` (pass; remote schema updated).

---

## 5. Verification Checklist (Template)

- [x] Auth locals normalized
- [x] Billing flags present
- [x] `requirePro` guard works
- [x] Paywall UI pattern present
- [x] Dashboard webhook push works
- [x] Notifications helper wired
- [x] Admin guard works
- [x] Layout + `global.css` correct
- [x] Webhook timeouts + retries documented
- [x] Build/typecheck green

## Task Log (Recent)
- Keep newest first; include date and short summary.
- 2026-02-22 Mini-app bar label fix: upgraded `@ansiversa/components` to `0.0.146` to consume shared registry metadata for `study-planner` (`name: Study Planner`) so navbar title shows display name instead of slug; home-link/menu behavior unchanged. Verification: `npm run build` ✅.
- 2026-02-22 Mini-app navbar home-link rollout: upgraded `@ansiversa/components` to `0.0.145` so `AvMiniAppBar` app title/icon area is clickable and navigates to mini-app home (`links[0].href`, fallback `/`) with accessible aria-label + focus-visible state; verified no behavior changes to 3-dot menu. Verification: `npm run build` ✅.
- 2026-02-22 FAQ shared rollout: upgraded `@ansiversa/components` to `0.0.144` (shared `FaqManager` now includes debounced search + icon actions + no numeric order UI + no sort-order input), and updated `src/pages/api/admin/faqs.json.ts` GET to support `q` filtering across question/category/audience while preserving audience filter and existing CRUD/reorder behavior. Verification: `npm run build` ✅.
- 2026-02-22 Bookmarks V1 hardening: added `scripts/apply-bookmark-triggers.ts` using `@libsql/client` (`TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`) and wired `db:triggers` + `postdb:push`; applied trigger `bookmark_cleanup_study_plan_delete` (`StudyPlans` -> `Bookmark` cleanup for `entityType='plan'`). Verification: `npm run db:push` ✅, `npm run db:triggers` ✅, trigger query (`sqlite_master`) ✅, `npm run typecheck` ✅, `npm run build` ✅. Production checklist: pending manual smoke (delete bookmarked plan -> bookmark row auto-removed -> `/bookmarks` no orphan card).
- 2026-02-21 Dashboard Integration V1 shipped for parent dashboard consumption: added stable summary schema (`appId`, `updatedAt`, `totals`, `recent`) with defensive computed keys and bookmarks total; added protected endpoint `GET /api/dashboard/summary.json`; added action `studyPlanner.getDashboardSummary`; updated webhook push helper to parent URL + shared secret contract (`PARENT_APP_URL`/`ANSIVERSA_WEBHOOK_SECRET`) and ensured push failures never break primary mutations; wired bookmark toggle to emit non-blocking summary/activity push; aligned dashboard usage references to new summary keys; updated `.env.example` and env typings. Verification: `npm run typecheck` ✅, `npm run build` ✅. Caveat: manual cross-app smoke in production dashboard not executed from this CLI session.
- 2026-02-21 Study Planner Bookmarks V1 shipped (plan): added DB `Bookmark` table + indexes/unique and wired DB config; added bookmark actions (`listPlanBookmarks`/`toggleBookmark`) and exposed under studyPlanner actions namespace; added store bookmark Set with `initBookmarks`, `isBookmarked`, and optimistic `toggleBookmarkPlan`; added `AvBookmarkButton` to `/plans` cards; added protected `/bookmarks` page using `AvBookmarksEmpty`/`AvBookmarksList`; enabled gated mini-app menu link via `bookmarksHref=\"/bookmarks\"`; bumped `@ansiversa/components` to exact `0.0.142`. Verification: `npm run db:push` ✅, `npm run typecheck` ✅ (existing 7 hints), `npm run build` ✅. DB sanity: remote `Bookmark` table exists; rows currently empty in this environment. Caveat: production authenticated UI smoke test not executed from CLI-only session.
- 2026-02-19 Bumped `/components` to `0.0.141` and refreshed lockfile for latest shared FAQ order-arrow release; verification: `npm run build` ✅.
- 2026-02-19 Bumped `/components` to `0.0.140` and refreshed lockfile to consume the latest shared release; verification: `npm run build` ✅.
- 2026-02-19 Bumped `@ansiversa/components` to `0.0.139` (AvMiniAppBar AppLogo support) and verified with `npm run build` (pass).
- 2026-02-19 FAQ V1 added: faqs table + public endpoint + admin CRUD + /admin/faq using shared FaqManager.
- 2026-02-09 Enforced repo-level AGENTS mandatory task-log update rule for Codex/AI execution.
- 2026-02-09 Verified repo AGENTS contract linkage to workspace source-of-truth.
