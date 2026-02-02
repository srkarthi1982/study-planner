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
- `StudyTasks`
- `StudySessions` (study logs)
- `StudyReminders`

---

## 3. Task Log (Newest first)

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

---

## 5. Verification Checklist (Template)

- [ ] Auth locals normalized
- [ ] Billing flags present
- [ ] `requirePro` guard works
- [ ] Paywall UI pattern present
- [ ] Dashboard webhook push works
- [ ] Notifications helper wired
- [ ] Admin guard works
- [ ] Layout + `global.css` correct
- [ ] Webhook timeouts + retries documented
- [ ] Build/typecheck green
