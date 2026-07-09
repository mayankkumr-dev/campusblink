# Campus Blink - Project Context Document

## 1. Executive Summary
Campus Blink is a role-based campus platform built primarily as a React + Vite SPA that currently talks directly to Supabase from the frontend. The product includes student, professor, admin, canteen-owner, and print-shop experiences with modules for community feed, marketplace, canteen ordering, print ordering, notifications, and profile/social interactions.

The repository also contains a separate Node/Express backend service scaffold (`backend/`) for secured server-side integrations (payments, email, webhooks, admin operations), but the active frontend architecture still uses direct Supabase reads/writes for much of the business logic.

---

## 2. Tech Stack and Runtime Architecture

### Frontend (active primary app)
- Framework: React 18
- Build tooling: Vite 6
- Routing: React Router 7 (`createBrowserRouter`)
- Styling: Tailwind CSS v4 + CSS variables + custom theme tokens
- State management: Zustand (auth/theme/cart/notifications)
- Backend SDK: `@supabase/supabase-js` v2
- Realtime: Supabase Realtime channels (`postgres_changes`)
- PWA/offline: `vite-plugin-pwa` + Workbox + custom `src/sw.js`
- Offline storage: `localforage` (IndexedDB)

### Backend (separate service, partially integrated)
- Node.js + Express service in `backend/`
- Includes config/middleware/routes/services structure for:
  - auth/session handling
  - payments and webhooks
  - email workflows
  - admin/professor/canteen/print endpoints

### Current architectural posture
- **Observed reality in code:** frontend is still heavily Supabase-direct.
- **Repository direction:** backend exists for secure server-side capabilities and deployment separation.

---

## 3. Application Structure and Route Surface

### Workspace-level structure
- `frontend/` - active React app
- `backend/` - Express API service scaffold
- `sql/` - migration/policy/feature SQL scripts
- root utilities and patch scripts - one-off fix/update helpers

### Frontend module layout (`frontend/src`)
- `app/` - app shell, routing, route components
- `api/` - frontend-side Supabase data access modules
- `hooks/` - feature access and realtime hooks
- `lib/` - Supabase client and shared helpers
- `store/` - Zustand stores
- `styles/` - global/theme CSS

### Role-aware route groups
- Public routes: about/contact/privacy/terms/login/register/auth callback/search/post detail
- Student routes under `/student/*`: dashboard, marketplace, canteen, print, community, societies, profile/settings, notifications, bookmarks
- Professor routes under `/professor/*`: dashboard, canteen, print, societies, payments, profile
- Canteen owner dashboard: `/canteen-dashboard`
- Print shop dashboard: `/print-dashboard`
- Admin routes under `/admin/*`: broad operational hubs (users, invites, professors, canteen/print, marketplace, community, finance, legal, audit, announcements, contact issues, etc.)

---

## 4. Auth, Roles, Access Control, and State Flow

### Authentication and bootstrap flow
- Supabase Auth session is synchronized on app load and on auth-state changes.
- On missing profile row, app attempts profile upsert seeding from user metadata, then re-fetches.
- Restricted/banned users are force-signed-out and redirected to account restriction page.

### Role model observed in code
- `student`
- `professor`
- `admin`
- `canteen_owner`
- `print_shop`
- `society`
- `teacher` (legacy/request metadata and transition path)

### Feature gating model
- User-specific restrictions table + platform-level toggles.
- Frontend resolves access from:
  - `user_restrictions`
  - `platform_settings`
- Hooks subscribe realtime to both tables so admin changes propagate live.

### Client state stores
- `authStore`: user/profile/loading, role helper predicates, admin override logic
- `themeStore`: light/dark/system persistence + document theme attribute sync
- Additional stores for cart and notification UX

---

## 5. Data Model and Supabase Usage Snapshot

### Supabase entities referenced by frontend code
- `profiles`
- `posts`, `comments`, `comment_likes`, `post_likes`, `bookmarks`, `reposts`
- `community_posts`, `community_reports`
- `listings`, `listing_messages`, `wishlists`, `marketplace_reports`
- `canteen_shops`, `menu_items`, `canteen_orders`
- `print_shops`, `print_orders`, `print-files`
- `notifications`, `notification_preferences`, `push_subscriptions`
- `follows`, `conversations`, `direct_conversations`, `direct_messages`
- `invite_codes`, `waitlist`
- `user_restrictions`, `platform_settings`, `professor_feature_access`
- `announcements`, `contact_issues`, `app_feedback`, `feedback`
- `credits_log`, `professor_pending_payments`, `admin_audit_log`, `reports`, `colleges`

### Supabase RPC functions observed
- `check_username_availability`
- `get_email_by_username`
- `toggle_follow`
- `admin_approve_professor`
- `increment_post_likes`, `decrement_post_likes`
- `increment_post_comments_count`, `decrement_post_comments_count`
- `increment_comment_likes`, `decrement_comment_likes`
- `increment_comment_replies_count`, `decrement_comment_replies_count`
- `increment_listing_views`

### SQL / RLS hardening evidence
The `sql/` directory shows progressive migration and policy work including:
- feature additions (`add_*` scripts)
- core and module-specific RLS fixes (`fix_*_rls.sql`)
- policy recursion and profile policy repairs
- multi-college scoping updates
- trigger and storage policy fixes

Interpretation: the platform has evolved through iterative policy hardening, and production stability depends on applying the full SQL chain in the correct order.

---

## 6. Offline/PWA Implementation Status

### Current implementation
- PWA plugin configured with `injectManifest` strategy.
- Custom service worker (`frontend/src/sw.js`) includes:
  - precache manifest handling
  - cache policies for images/scripts/styles/fonts
  - API/content runtime caching (`NetworkFirst` for Supabase/API GET)
  - background sync queue for write methods (POST/PUT/PATCH/DELETE)
  - navigation route caching
  - push and notification click handlers

### Community feed offline behavior
- Feed state tracks online/offline (`navigator.onLine` + event listeners).
- Posts for each tab are cached in IndexedDB via `localforage`.
- When offline, feed prefers cache immediately.
- Offline banner indicates cached-mode feed rendering.

---

## 7. UI/Theming and Recent High-Impact Changes

### Theming model
- Theme persisted in Zustand (`campus-blink-theme` key)
- Supports `light`, `dark`, and `system`
- Applies `data-theme` on `<html>` and syncs to system dark-mode changes

### Loading UX modernization
- Custom reusable skeleton system added under UI components.
- Route-level loading states were migrated from spinner/text patterns to layout-matching skeletons for key student/professor surfaces.

### Recent product hardening themes (from repository state)
- Dark mode architecture improvements
- PWA app-shell/offline enhancements
- Community feed offline fallback
- Expanded role/dashboard consistency work

---

## 8. Realtime/Eventing Surface

Observed realtime subscriptions include:
- `canteen_orders` (shop-specific inserts/updates)
- `print_orders` (shop-specific inserts/updates)
- `posts` inserts for community feed updates
- `listing_messages` inserts for marketplace chats
- `notifications` inserts per user
- feature access updates from `user_restrictions` and `platform_settings`

Operational note: multiple modules rely on `postgres_changes`; ensure database replication/publication settings remain aligned with these channels.

---

## 9. Risks, Ambiguities, and Consultant Attention Areas

1. Dual-architecture drift risk:
   - Repo documents a separated backend model, but frontend still performs direct Supabase operations broadly.

2. SQL migration ordering risk:
   - Large number of incremental `fix_*` scripts implies environment drift can occur if scripts are partially applied.

3. Policy coupling risk:
   - Feature gating, role checks, and admin actions depend on correct RLS and policy-recursion-safe profile policies.

4. Offline semantics complexity:
   - Background sync + runtime caching + direct Supabase writes can produce edge cases around eventual consistency and conflict resolution.

5. Route surface complexity:
   - Significant route matrix across user roles; guard consistency and redirect rules require regression checks after auth/role changes.

---

## 10. Suggested Next Technical Audit Steps

1. Establish a definitive architecture target:
   - Decide whether to complete backend migration (frontend -> backend API) or formally standardize direct Supabase frontend patterns.

2. Produce canonical schema and policy baseline:
   - Consolidate SQL chain into environment-specific bootstrap/migration docs (or repeatable migration runner).

3. Build role-access contract tests:
   - Validate route guards + feature toggles for each role and account status (`active/restricted/banned/pending`).

4. Add offline consistency tests:
   - Verify write queue behavior, replay semantics, and stale cache handling across community/canteen/print modules.

5. Create module ownership map:
   - Define ownership for core verticals (auth, community, marketplace, canteen, print, admin) to reduce regression during rapid patch cycles.

---

## 11. Quick File Pointers for External Consultant

- Frontend router map: `frontend/src/app/routes.tsx`
- App bootstrap/auth sync: `frontend/src/app/App.tsx`
- Supabase client: `frontend/src/lib/supabase.js`
- Auth state store: `frontend/src/store/authStore.js`
- Feature access logic: `frontend/src/api/featureAccess.js`, `frontend/src/hooks/useFeatureAccess.ts`
- Realtime hooks: `frontend/src/hooks/useRealtime.js`
- PWA config: `frontend/vite.config.ts`
- Service worker: `frontend/src/sw.js`
- Community offline fallback: `frontend/src/app/components/CommunityFeed.tsx`
- SQL migrations and policy patches: `sql/`
- Backend scaffold: `backend/src/index.js`, `backend/src/routes/*`, `backend/src/services/*`

---

## 12. Context Confidence Note
This document is based on direct workspace/code inspection of route definitions, stores, API modules, service-worker/PWA config, and SQL inventories available in this repository state. It is intended as a high-signal consultant handoff and should be paired with environment-specific migration history before production policy changes.
