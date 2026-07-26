# 🎓 Campus Blink — Complete AI Reference Document
> **Purpose:** This document gives any AI model a full, detailed picture of the Campus Blink project so it can answer questions, debug issues, and suggest changes with accurate context.
> **Last Updated:** 2026-07-25

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Repository Layout](#2-repository-layout)
3. [Tech Stack](#3-tech-stack)
4. [Architecture: How Frontend and Backend Relate](#4-architecture-how-frontend-and-backend-relate)
5. [Authentication & User Roles](#5-authentication--user-roles)
6. [Frontend Deep Dive](#6-frontend-deep-dive)
7. [Backend Deep Dive](#7-backend-deep-dive)
8. [Feature Modules — What They Do](#8-feature-modules--what-they-do)
9. [Database & Supabase Schema](#9-database--supabase-schema)
10. [State Management (Zustand Stores)](#10-state-management-zustand-stores)
11. [PWA & Offline Support](#11-pwa--offline-support)
12. [Real-time Subscriptions](#12-real-time-subscriptions)
13. [Content Moderation Pipeline](#13-content-moderation-pipeline)
14. [Notifications (In-App + Push)](#14-notifications-in-app--push)
15. [File Upload Architecture (S3)](#15-file-upload-architecture-s3)
16. [Attendance System](#16-attendance-system)
17. [Messaging System](#17-messaging-system)
18. [SQL Migrations & RLS Policies](#18-sql-migrations--rls-policies)
19. [Routing — Every Route Explained](#19-routing--every-route-explained)
20. [Environment Variables](#20-environment-variables)
21. [Deployment](#21-deployment)
22. [Key Files Quick Reference](#22-key-files-quick-reference)
23. [Common Patterns & Conventions](#23-common-patterns--conventions)
24. [Known Architecture Risks](#24-known-architecture-risks)

---

## 1. Project Overview

**Campus Blink** (`campusblink.me`) is a role-based campus super-app for Indian colleges. It provides:
- A **social community feed** (posts, comments, likes, bookmarks, reposts)
- A **campus diary** (creative image/text cards with AI moderation)
- A **campus marketplace** (buy/sell listings, OLX-style, roommate finder)
- **Canteen ordering** (food menu, cart, real-time order tracking)
- **Print shop ordering** (file upload, print preferences, order tracking)
- **College societies** (society feed, society profiles)
- **Campus notices** (official notice board with role-based publish/view)
- **Professor attendance tracking** (QR/manual, dispute system)
- **Direct messaging** (DM between users, message requests)
- **Notifications** (in-app + web push)
- **Admin control panel** (full platform management)

The app is **invite-only** (students need invite codes) and designed for a **single college instance** (with multi-college scoping infrastructure added later).

---

## 2. Repository Layout

```
campus_blink_2/              <- Workspace root
├── frontend/                <- React/Vite SPA (PRIMARY app)
│   ├── src/
│   │   ├── api/             <- Supabase data-access modules (per feature)
│   │   ├── app/             <- App shell, router, shared page components
│   │   │   ├── App.tsx      <- Root component; auth bootstrap
│   │   │   ├── routes.tsx   <- createBrowserRouter() — ALL routes
│   │   │   └── components/  <- Dashboard/settings/admin pages
│   │   ├── assets/          <- Static images, icons
│   │   ├── bones/           <- boneyard-js registry (animation/tracking)
│   │   ├── features/        <- Feature slices (one folder per domain)
│   │   │   ├── auth/        <- Login, register, route guards
│   │   │   ├── canteen/     <- Canteen order UI
│   │   │   ├── community/   <- Feed, post detail, societies
│   │   │   ├── diary/       <- Diary editor and card viewer
│   │   │   ├── marketplace/ <- Buy/sell, listing detail, messages
│   │   │   ├── print/       <- Print order UI
│   │   │   └── profile/     <- Profile page, edit modal, header
│   │   ├── hooks/           <- Custom React hooks
│   │   ├── lib/             <- Supabase client, push helpers, S3 utils
│   │   ├── shared/          <- Shared UI components (NotFoundPage, etc.)
│   │   ├── store/           <- Zustand global stores
│   │   ├── styles/          <- Global CSS, theme tokens
│   │   ├── sw.js            <- Custom Service Worker (PWA/offline/push)
│   │   ├── types/           <- TypeScript type declarations
│   │   └── main.tsx         <- React entry point
│   ├── index.html           <- PWA manifest meta, app shell HTML
│   ├── vite.config.ts       <- Vite + PWA + Tailwind config
│   └── package.json         <- Frontend dependencies
│
├── backend/                 <- Node.js/Express API service
│   └── src/
│       ├── index.js         <- Express app entry, route mounting, socket init
│       ├── config/          <- Supabase admin client, socket.io, MongoDB
│       ├── controllers/     <- Route handler logic (diary, messaging, feed)
│       ├── middleware/       <- Auth middleware, rate limiting
│       ├── models/          <- Mongoose models (attendance only)
│       ├── routes/          <- Express route files
│       ├── services/        <- Business logic (attendance, email, push, moderation, S3, notifications)
│       └── utils/           <- Bloom filter, attendance calculator
│
├── sql/                     <- Feature SQL scripts & RLS policy patches
├── migrations/              <- Supabase migration SQL files
├── scripts/                 <- One-off utility scripts
└── vercel.json              <- Root-level Vercel config (proxy/redirect)
```

---

## 3. Tech Stack

### Frontend
| Concern | Technology |
|---|---|
| Framework | React 18.3.1 |
| Build tool | Vite 6.3.5 |
| Language | TypeScript (.tsx/.ts) + JavaScript (.js/.jsx) mixed |
| Routing | React Router 7 (createBrowserRouter) |
| Styling | Tailwind CSS v4 + CSS custom variables/tokens |
| Component library | Radix UI (headless) + custom components |
| State management | Zustand v5 |
| Backend SDK | @supabase/supabase-js v2 |
| Real-time | Supabase Realtime (postgres_changes channels) |
| PWA | vite-plugin-pwa + custom src/sw.js (Workbox injectManifest) |
| Offline storage | localforage (IndexedDB) |
| Animations | motion (Framer Motion successor), CSS transitions |
| Icons | lucide-react |
| Charts | recharts |
| Canvas/image editor | fabric.js (diary editor) |
| PDF preview | pdfjs-dist, react-pdf |
| Forms | react-hook-form |
| Drag and drop | react-dnd + react-rnd |
| Toasts | react-hot-toast |
| Socket client | socket.io-client |
| Analytics | @vercel/analytics |

### Backend
| Concern | Technology |
|---|---|
| Runtime | Node.js >= 20 |
| Framework | Express v5 |
| Auth | Supabase Auth (JWT verification) |
| Database ORM | @supabase/supabase-js (Postgres/Supabase) |
| Secondary DB | MongoDB via Mongoose (attendance sessions only) |
| File storage | AWS S3 via @aws-sdk/client-s3 |
| Image moderation | AWS Rekognition (DetectModerationLabels) |
| Email | Nodemailer |
| Push notifications | web-push library |
| Real-time | Socket.IO v4 |
| Rate limiting | express-rate-limit |
| Security | Helmet, CORS, HttpOnly cookies, JWT |
| Bloom filter | bloom-filters (username dedup optimization) |

---

## 4. Architecture: How Frontend and Backend Relate

### The Hybrid Reality

Campus Blink uses a **hybrid architecture**:

```
Browser (React App)
  |
  |---> Supabase (direct)    <- Most data reads/writes happen here
  |       - Auth (sign in/out/register)
  |       - Profiles, posts, comments, likes
  |       - Marketplace listings & messages
  |       - Canteen menus & orders
  |       - Notifications, bookmarks, follows
  |       - Real-time channels
  |
  |---> Backend Express API  <- Secure / privileged operations
          /api/diary          - Diary CRUD + AI moderation
          /api/uploads        - S3 presigned URLs
          /api/push           - Push subscription management
          /api/email          - Email sending
          /api/admin          - Admin mutations
          /api/professor      - Professor-specific APIs
          /api/attendance     - Attendance sessions (MongoDB)
          /api/messages       - Direct messaging (Socket.IO)
          /api/feed           - Feed ranking
```

### Why the Split?
- **Supabase direct:** Fast for simple CRUD + real-time, no server round-trip.
- **Backend for:** Things requiring service-role keys (e.g., bypassing RLS), AWS credentials, WebSockets, rate limiting, moderation pipelines.

### API Proxy (Dev Only)
In development, Vite proxies `/api/*` to `http://localhost:3000` (the backend). In production, `vercel.json` does the same.

---

## 5. Authentication & User Roles

### Auth Flow (App Bootstrap)

App.tsx mounts
  -> supabase.auth.getSession()       <- Check existing session
  -> supabase.auth.onAuthStateChange() <- Listen for login/logout events
  -> syncSession(session)
       -> No user? -> setAuth(null, null), stop
       -> getProfile(user.id)          <- Fetch from 'profiles' table
       -> No profile row? -> Upsert profile from user_metadata, retry 4x
       -> Admin + restricted/banned?  -> Auto-restore to active
       -> Historical professor pending? -> Sync role/metadata
       -> Status = restricted/banned? -> signOut() -> redirect /account-restricted
       -> setAuth(user, profile) -> app loads

### Roles
| Role | Description | Primary Routes |
|---|---|---|
| `student` | Default role for all regular users | /student/* |
| `professor` | Faculty member (requires admin approval) | /professor/* |
| `admin` | Platform administrator | /admin/* |
| `canteen_owner` | Canteen shop manager | /canteen-dashboard |
| `print_shop` | Print shop manager | /print-dashboard |
| `society` | Campus society account | Shares student routes |
| `teacher` | Legacy alias -> migrated to professor | — |

### Professor Approval Flow
1. Professor registers at /register/professor
2. Profile saved with role: 'professor', professor_status: 'pending'
3. Redirected to /professor/pending
4. Admin approves via /admin/professors/pending
5. Backend calls admin_approve_professor RPC -> updates status to 'approved'
6. Professor can now access full professor routes

### Account Status Values
- `active` — Normal access
- `restricted` — Specific features blocked (via user_restrictions table)
- `banned` — Force signed out, redirected to restriction page

### Route Guards
- `StudentProtectedLayout` — Wraps /student/*; redirects non-students
- `ProfessorProtectedLayout` — Wraps /professor/*; checks role + professor_status
- `AdminProtectedRoute` — Wraps /admin/*; requires role === 'admin'
- `CanteenDashboardProtectedRoute` — Wraps /canteen-dashboard
- `PrintDashboardProtectedRoute` — Wraps /print-dashboard

### Feature Gating
Beyond role guards, individual features can be toggled per user:
- `user_restrictions` table -> per-user disabled feature list
- `platform_settings` table -> global feature toggles
- `useFeatureAccess` hook -> subscribes to both tables via Realtime, exposes isAllowed(featureKey) and resolve(featureKey) helpers
- Changes propagate **live** without page refresh

---

## 6. Frontend Deep Dive

### Entry Point
`frontend/src/main.tsx` -> renders `<App />` wrapped in React.StrictMode.

`frontend/src/app/App.tsx` — Root component:
- Initializes theme
- Bootstraps Supabase auth session
- Renders: PushOnboardingModal, NotificationBanner, RouterProvider, Toaster, PWALayer, OfflineBanner
- Disables right-click context menu globally

### Frontend API Layer (frontend/src/api/)
Each file is a Supabase data-access module for one domain:
| File | Handles |
|---|---|
| auth.ts | Profile fetch/update, registration, username check |
| community.js | Posts, comments, likes, bookmarks, reposts |
| diary.js | Diary entries, likes |
| marketplace.js | Listings, wishlists, marketplace messages |
| canteen.js | Menus, orders, cart operations |
| print.js | Print orders, file management |
| notifications.js | Notification list, mark-read |
| follow.js | Follow/unfollow, followers/following lists |
| featureAccess.js | User restrictions + platform settings fetch |
| admin.js | Admin panel queries (users, reports, etc.) |
| professor.js | Professor dashboard data |
| attendance.ts | Student attendance fetch |
| messages.ts | Direct message conversations |
| notices.js | Official notice board operations |
| invites.js | Invite code management |
| credits.js | Campus credits log |
| search.js | Cross-entity search |
| announcements.js | Platform announcements |

### Custom Hooks (frontend/src/hooks/)
| Hook | Purpose |
|---|---|
| useFeatureAccess.ts | Real-time feature gating |
| useRealtime.js | Generic Supabase channel subscription wrapper |
| usePushNotifications.ts | Subscribe/unsubscribe to web push |
| usePWAInstall.ts | PWA install prompt handling |
| useBookmarks.ts | Bookmark state management |
| useNetworkStatus.ts | navigator.onLine with event listeners |
| useSmartNetworkStatus.ts | Enhanced online/offline detection |
| useScrollDirection.ts | Scroll direction for hide/show nav |
| useThemeColor.ts | Meta theme-color sync for mobile browsers |
| useWebShare.ts | Native Web Share API |

---

## 7. Backend Deep Dive

### Entry Point: backend/src/index.js
- Creates Express app + HTTP server
- Initializes Socket.IO on the HTTP server
- Connects to MongoDB (for attendance)
- Mounts all route groups under /api/*
- Rate limiting: adminMutationLimiter on admin POST/PUT/DELETE, generalLimiter elsewhere
- Hydrates Bloom Filter after startup (username caching)
- Validates JWT_SECRET presence at startup (fails hard if missing)

### Backend Routes -> Controllers
| Route Prefix | Route File | Controller / Handler |
|---|---|---|
| /api/auth | routes/auth.js | Session verify, profile check |
| /api/users | routes/users.js | Username check, public profile |
| /api/email | routes/email.js | Send email via Nodemailer |
| /api/admin | routes/admin.js | All admin CRUD operations |
| /api/professor | routes/professor.js | Professor data access |
| /api/canteen | routes/canteen.js | Menu, order management |
| /api/print | routes/print.js | Print orders, scheduling |
| /api/uploads | routes/uploads.js | S3 presigned URL generation |
| /api/push | routes/push.js | Push subscription CRUD |
| /api/feed | routes/feed.js + controllers/feedControllerPostgres.js | Feed ranking/pagination |
| /api/attendance | routes/attendance.js | Session CRUD, record marking, disputes |
| /api/messages | routes/messaging.js + controllers/messagingController.js | DM conversations/messages |
| /api/diary | routes/diary.js + controllers/diaryController.js | Diary CRUD + moderation |

### Backend Services
| Service | File | What it Does |
|---|---|---|
| Attendance | services/attendanceService.js | Hybrid MongoDB+JSON fallback attendance logic |
| Notifications | services/notifications.js | Insert notification rows + trigger push |
| Push | services/push.js | Web push via VAPID keys |
| Email | services/email.js | Send emails via Nodemailer SMTP |
| Moderation | services/moderation.js | Text blocklist + AWS Rekognition image check |
| S3 | services/s3.js | S3 upload, download, delete |
| Supabase | services/supabase.js | Admin-level DB helpers (profile, user, audit log) |

### Backend Config
- config/supabase.js — Creates supabaseAdmin client with service-role key (bypasses RLS)
- config/db.js — MongoDB/Mongoose connect + isDBConnected() helper
- config/socket.js — Socket.IO init, emitAttendanceUpdate() helper

### Backend Middleware
- middleware/auth.js — Verifies Supabase JWT from Authorization: Bearer header, attaches user to req.user
- middleware/rateLimit.js — authLimiter, generalLimiter, adminMutationLimiter

### Backend Models (Mongoose — Attendance Only)
- AttendanceSession — One session per subject/section/date/timeSlot
- AttendanceRecord — One record per student per session (present/absent/late)
- AttendanceDispute — Student dispute on a marked record

---

## 8. Feature Modules — What They Do

### 8.1 Community Feed (features/community/)
- CommunityFeed.tsx — Tabbed feed (All / Following / Trending), offline-aware
  - Fetches posts from Supabase posts table
  - Caches per-tab data in IndexedDB via localforage
  - Shows offline banner when navigator.onLine === false
  - Listens to Supabase Realtime for new post inserts
- FeedPost.tsx — Individual post card with like/comment/repost/bookmark/share actions
- PostDetailPage.tsx — Full post view with nested comments
- DiaryMasonryGrid.tsx — Masonry grid layout for diary/community cards
- DiaryCreatorPage.tsx — In-community diary card creator
- SocietiesFeedPage.tsx — Discover and follow campus societies
- SocietyProfilePage.tsx — Individual society profile page

### 8.2 Diary (features/diary/)
The "Diary" is a creative card feature — users create styled image/text cards (like Instagram stories but permanent).

- CreateDiaryFlow.tsx -> orchestrates: DiaryThemeSelector -> DiaryEditor -> DiaryPublishStep
- DiaryThemeSelector.tsx — Pick background gradient/color/image
- DiaryEditor.tsx — Canvas-based editor using fabric.js:
  - Drag/resize text elements (DiaryDraggableText.tsx)
  - Drag/resize stickers (DiaryDraggableSticker.tsx)
  - Image upload with compression
- DiaryPublishStep.tsx — Set visibility, submit to backend
- offlineQueue.ts — IndexedDB queue for draft diaries created offline

**Diary Publish Flow:**
1. User finishes editing -> clicks publish
2. Frontend uploads image to Supabase quarantine bucket (temp storage)
3. POST to /api/diary (backend)
4. Backend: moderation.js runs:
   a. Text moderation (regex patterns)
   b. AWS Rekognition DetectModerationLabels on the image
5. If safe: image moved from quarantine -> diaries bucket, entry inserted into diary_entries table
6. If unsafe: image deleted from quarantine, 403 returned

### 8.3 Marketplace (features/marketplace/)
OLX-style campus buy/sell:
- BuySellPage.tsx — Browse listings grid with category/price filters
- MarketplaceListingDetailPage.tsx — Full listing view with seller contact
- MarketplaceManagePage.tsx — Seller manages own listings
- MarketplaceMessagesPage.tsx — In-app messaging between buyer/seller
- MarketplaceWishlistPage.tsx — Saved/wishlisted listings
- RoommatePage.tsx — Roommate finder sub-feature

Data: listings, listing_messages, wishlists, marketplace_reports in Supabase

### 8.4 Canteen (features/canteen/)
Campus food ordering:
- CanteenMenuPage.tsx — Browse menu, add to cart, place order
  - Multiple canteen shops supported
  - Cart managed via cartStore (Zustand)
  - Real-time order status via Supabase Realtime on canteen_orders
- CanteenDashboardPage.tsx — Owner view: incoming orders, order acceptance, menu management
- CanteenReorderPage.tsx — Quick reorder from past order history

Data: canteen_shops, menu_items, canteen_orders in Supabase

### 8.5 Print Shop (features/print/)
Campus document printing service:
- PrintPage.tsx — Student: upload PDF, set print preferences (B&W/color, copies, binding), select shop, place order
  - PDF preview via pdfjs-dist
  - File uploaded to S3 via backend presigned URL
- PrintDashboardPage.tsx — Shop owner: manage incoming print orders, update status, schedule management
- PrintReorderPage.tsx — Reorder previous print job

Data: print_shops, print_orders, print-files (S3 bucket) in Supabase

### 8.6 Profile (features/profile/)
- ProfilePage.tsx — Own profile and other user profiles
- ProfileHeader.tsx — Avatar, cover, follow button, stats (followers/following/posts)
- ProfileEditModal.tsx — Edit name, bio, avatar, cover, social links, college, username
- ProfilePostsTab.tsx — User's posts grid
- ProfileSocialLinks.tsx — Render/edit social media links

### 8.7 Auth (features/auth/)
- LoginPage.tsx — Email/username login, Google OAuth, magic link
- RegisterPage.tsx — Student signup with invite code validation
- ProfessorRegisterPage.tsx — Professor signup with department/room details
- ResetPasswordPage.tsx — Password reset flow
- AuthCallbackPage.tsx — OAuth callback handler (sets session, redirects)
- AuthHomeGate.tsx — Root / gate: redirects based on role
- AccountRestrictedPage.tsx — Shown when account is restricted/banned

### 8.8 Campus Notices
- Students: Browse notices at /student/notices
- Notice admins (professors with permission): Publish at /student/notices/admin
- Professor: /professor/notices (campus) + /professor/notices/faculty
- Admin: Manage all notices at /admin/notices, manage notice admins at /admin/notice-admins

Data: official_notices table (see sql/official_notices_schema.sql)

### 8.9 Attendance (Professor Module)
Professor creates attendance sessions, students are marked present/absent:
- /professor/attendance — Professor attendance management page
- /admin/attendance — Admin view of attendance data

Backend handles everything:
- POST /api/attendance/session — Create/open session
- POST /api/attendance/record — Mark student present/absent
- POST /api/attendance/dispute — Student files dispute
- GET /api/attendance/student/:id — Student's attendance summary

Storage: MongoDB (primary) with JSON file fallback (backend/data/attendance_fallback.json)

Key Calculations (utils/attendanceCalculator.js):
- calculateAttendancePercentage(records) — % present
- computeSafeToMiss(total, present, threshold) — How many more can be missed
- Default threshold: 75%

### 8.10 Direct Messaging
- MessagesPage — Conversation list + active chat
- Built on messagingController.js (backend) + Socket.IO for real-time delivery
- Conversations stored in direct_conversations table (Supabase)
- Messages in direct_messages table
- Message request system: First DM is a "request" — recipient must accept before conversation opens

### 8.11 Admin Panel
Full-featured platform management under /admin/*:
- Accounts Hub: Users, professors, invites, waitlist, roles, bans
- Orders Hub: Canteen orders, print orders
- Community Hub: Posts, reports, flagged diaries, notices, announcements
- Marketplace: Listings overview, reported listings
- Finance: Credits log, revenue tracking, professor pending payments
- Email: Compose and send bulk emails, template management, history
- Settings: Platform-wide toggles (platform_settings table)
- Legal: GDPR export, terms/privacy management
- Audit: Full admin_audit_log viewer
- Smart Alerts: Flagged content alerts

---

## 9. Database & Supabase Schema

### Core Tables
| Table | Purpose |
|---|---|
| profiles | All user data (role, status, credits, avatar, college, etc.) |
| posts | Community feed posts |
| comments | Post comments (nested via parent_id) |
| post_likes | Post like junction table |
| comment_likes | Comment like junction |
| bookmarks | Post bookmarks |
| reposts | Post reposts |
| follows | User follow relationships |
| diary_entries | Diary cards (content, image, styling metadata) |
| listings | Marketplace buy/sell listings |
| listing_messages | Marketplace chat messages |
| wishlists | Saved marketplace listings |
| canteen_shops | Canteen shop profiles |
| menu_items | Food menu items per shop |
| canteen_orders | Canteen order records |
| print_shops | Print shop profiles |
| print_orders | Print order records |
| notifications | In-app notification rows |
| notification_preferences | Per-user push/email preferences |
| push_subscriptions | Web push endpoint subscriptions |
| direct_conversations | DM conversation metadata |
| direct_messages | Individual DM messages |
| invite_codes | Student invite codes |
| waitlist | Waitlist registrations |
| user_restrictions | Per-user disabled feature list |
| platform_settings | Global feature flags |
| professor_feature_access | Professor-specific feature overrides |
| announcements | Platform-wide announcements |
| contact_issues | User support tickets |
| app_feedback / feedback | User feedback submissions |
| credits_log | Campus credits transaction log |
| professor_pending_payments | Professor credit payment queue |
| admin_audit_log | Admin action audit trail |
| reports | Content report submissions |
| colleges | College registry |
| community_posts | Society/community posts |
| community_reports | Community content reports |
| marketplace_reports | Marketplace listing reports |
| official_notices | Campus notice board entries |

### Key RPC Functions (Supabase stored procedures)
- check_username_availability(username text) -> boolean
- get_email_by_username(username text) -> text
- toggle_follow(follower uuid, followee uuid) -> void
- admin_approve_professor(professor_id uuid) -> void
- increment_post_likes(post_id uuid) -> void
- decrement_post_likes(post_id uuid) -> void
- increment_post_comments_count(post_id uuid) -> void
- decrement_post_comments_count(post_id uuid) -> void
- increment_comment_likes(comment_id uuid) -> void
- decrement_comment_likes(comment_id uuid) -> void
- increment_comment_replies_count(comment_id uuid) -> void
- decrement_comment_replies_count(comment_id uuid) -> void
- increment_listing_views(listing_id uuid) -> void

### Storage Buckets (Supabase Storage / S3)
- avatars — Profile avatar images
- covers — Profile cover/banner images
- diaries — Published diary card images (public)
- quarantine — Temporary diary image upload before moderation (private)
- print-files — Uploaded print job PDFs

### RLS (Row Level Security)
All tables have RLS enabled. Key policies:
- Users read/write only their own rows (profiles, notifications, orders, etc.)
- Public read for posts, profiles (with filters)
- Admin bypasses RLS via service-role key (backend only)
- Shop owners access only their shop's orders/menu

---

## 10. State Management (Zustand Stores)

### authStore.js
```
{
  user: null,         // Supabase User object
  profile: null,      // Profile row from DB
  isLoading: true,    // Auth bootstrap in progress

  setAuth(user, profile),
  setUser(user),
  setProfile(profile),
  updateProfile(updates),     // Optimistic partial update
  logout(),                   // Signs out + clears state
  setIsLoading(bool),

  // Role predicates:
  isAdmin()           // profile.role === 'admin'
  isStudent()         // profile.role === 'student'
  isProfessor()       // profile.role === 'professor'
  isCanteenOwner()    // profile.role === 'canteen_owner'
  isPrintShop()       // profile.role === 'print_shop'
}
```
Persisted in sessionStorage (key: campus-blink-auth). Cleared on tab close.

### themeStore.js
```
{
  theme: 'system',    // 'light' | 'dark' | 'system'
  initTheme(),        // Reads from localStorage, applies to html[data-theme]
  setTheme(theme),
}
```

### cartStore.js
Shopping cart for canteen orders:
```
{
  items: [],          // { menuItemId, name, price, quantity, shopId }
  shopId: null,       // Active shop (only one shop per cart)
  addItem(item),
  removeItem(id),
  updateQuantity(id, qty),
  clearCart(),
  getTotal(),
}
```

### notificationStore.js
```
{
  unreadCount: 0,
  setUnreadCount(n),
  incrementUnread(),
  clearUnread(),
}
```

### chatStore.ts
Full DM state (conversations, messages map, active conversation, socket actions)

### followStore.ts
Set of user IDs the current user follows, with add/remove actions.

---

## 11. PWA & Offline Support

### Service Worker Strategy
- Uses vite-plugin-pwa with strategies: 'injectManifest'
- The entire custom service worker lives in frontend/src/sw.js
- Vite injects precache manifest at self.__WB_MANIFEST

### Caching Policies in sw.js
| Resource Type | Strategy |
|---|---|
| App shell / HTML | NetworkFirst |
| JS / CSS / Fonts | CacheFirst with expiry |
| Images | CacheFirst |
| Supabase API GETs | NetworkFirst, falls back to cache |
| Backend API GETs | NetworkFirst, falls back to cache |
| POST/PUT/PATCH/DELETE | Background Sync Queue (replayed when online) |

### Community Feed Offline Behavior
1. CommunityFeed.tsx monitors navigator.onLine
2. On each tab load, posts are saved to IndexedDB via localforage (keyed by tab: all/following/trending)
3. When offline: reads from cache immediately, shows OfflineBanner
4. When back online: refetches and updates cache

### Push Notifications
- VAPID keys stored as env vars in backend
- frontend/src/lib/pushNotifications.js — Service worker push registration, permission request
- Backend services/push.js — Sends via web-push library
- Subscriptions stored in push_subscriptions table
- PushOnboardingModal — Shown 4.5s after first login
- NotificationBanner — Fallback banner on subsequent visits

---

## 12. Real-time Subscriptions

The app uses Supabase Realtime (postgres_changes) for live updates:

| Channel | Table | Events | Used By |
|---|---|---|---|
| canteen-orders-{shopId} | canteen_orders | INSERT, UPDATE | Canteen dashboard + student tracking |
| print-orders-{shopId} | print_orders | INSERT, UPDATE | Print dashboard + student tracking |
| community-feed | posts | INSERT | Feed new post indicator |
| marketplace-{listingId} | listing_messages | INSERT | Marketplace chat |
| notifications-{userId} | notifications | INSERT | In-app notification badge |
| feature-access-{userId} | user_restrictions, platform_settings | * | Feature gate live updates |

Socket.IO (backend) is used for:
- Direct messaging (DM) real-time delivery
- Attendance update broadcasts (emitAttendanceUpdate)

---

## 13. Content Moderation Pipeline

### Text Moderation (backend/src/services/moderation.js)
Three-layer check:
1. Severe toxicity patterns — Slurs, death threats, CSAM references -> immediate reject
2. General profanity -> reject
3. Context-aware check

### Image Moderation (AWS Rekognition)
```
User uploads image -> Supabase quarantine bucket
      |
      v
Backend calls DetectModerationLabels API
      |
      v
Checks: Explicit Nudity, Violence, Suggestive, Visually Disturbing
      |
Safe? -> Move to diaries bucket -> Insert DB row -> Return success
Unsafe? -> Delete from quarantine -> Return 403
```

Currently: Diary entries only go through this pipeline (text + images).
Community feed posts do NOT use this pipeline (Supabase direct).

---

## 14. Notifications (In-App + Push)

### In-App Notifications
- Stored in notifications table (user_id, type, title, message, link, read)
- Visible at /student/notifications
- Real-time Supabase channel on notifications inserts -> updates badge count

### Push Notifications
- Web Push API with VAPID
- POST /api/push/subscribe — Save subscription
- DELETE /api/push/unsubscribe — Remove subscription
- Backend sendPushToUser(userId, payload) — Looks up subscriptions -> sends push
- Backend sendPushToAll(payload) — Broadcasts to all subscriptions

### Common Notification Types
- new_order — Canteen/print order received (shop owners)
- order_status — Order accepted/rejected/ready (students)
- follow — New follower
- like — Post liked
- comment — Post commented
- announcement — Platform announcement
- professor_approved / professor_rejected — Professor application result

---

## 15. File Upload Architecture (S3)

### Flow
```
Frontend -> POST /api/uploads/presign (backend)
             |
             v Backend generates presigned PUT URL (AWS S3)
             |   Returns { presignedUrl, publicUrl }
             v
Frontend -> PUT directly to S3 (presigned URL)
Frontend -> Saves publicUrl to database (Supabase)
```

### S3 Service (backend/src/services/s3.js)
- generatePresignedPutUrl(key, contentType, expiresIn) — For direct browser upload
- generatePresignedGetUrl(key, expiresIn) — For private file access (print PDFs)
- deleteObject(key) — Remove file
- moveObject(sourceKey, destKey) — Copy + delete (used in diary moderation)

---

## 16. Attendance System

### Data Flow
```
Professor opens session (POST /api/attendance/session)
  -> AttendanceSession saved to MongoDB

Professor marks each student (POST /api/attendance/record)
  -> AttendanceRecord per student in MongoDB
  -> Socket.IO emits update to connected clients

Student views own attendance (GET /api/attendance/student/:id)
  -> Aggregated from all sessions

Student files dispute (POST /api/attendance/dispute)
  -> AttendanceDispute in MongoDB

Professor resolves dispute (PATCH /api/attendance/dispute/:id)
```

### Hybrid Storage (MongoDB + JSON fallback)
- MongoDB as primary
- JSON file fallback: backend/data/attendance_fallback.json
- isDBConnected() check before every operation decides which path to use

### Calculations (backend/src/utils/attendanceCalculator.js)
- DEFAULT_THRESHOLD_PERCENT = 75
- calculateAttendancePercentage(records) -> { present, total, percentage }
- computeSafeToMiss(total, present, threshold) -> number of classes safe to miss

---

## 17. Messaging System

### Architecture
- Backend: messagingController.js handles REST + Socket.IO
- Frontend: chatStore.ts (Zustand) + Socket.IO client
- Storage: direct_conversations + direct_messages tables (Supabase Postgres)

### Conversation Rules
- DB constraint: participant_a < participant_b (alphabetical sort ensures uniqueness)
- First message creates a "request" (is_request: true, request_for: receiverId)
- Receiver must accept before full conversation opens
- accepted_by_a and accepted_by_b booleans track acceptance

---

## 18. SQL Migrations & RLS Policies

### Two Directories
- migrations/ — Core structural migrations (run in order for fresh setup)
- sql/ — Feature additions + RLS fixes (applied incrementally)

### Key SQL Files
| File | What it Sets Up |
|---|---|
| sql/fix_core_rls.sql | Core profiles + posts RLS policies |
| sql/fix_all_infinite_recursion.sql | Removes RLS policy self-referencing loops |
| sql/multi_college_scoping_update.sql | Adds college-scoped filtering |
| sql/add_invite_only_system.sql | Invite code tables and validation |
| sql/add_direct_chat_tables.sql | DM tables |
| sql/add_nested_comments.sql | Comment nesting (parent_id) |
| sql/add_marketplace_olx_features.sql | Listings enhancements |
| sql/official_notices_schema.sql | Notice board tables |
| sql/push_notifications.sql | Push subscription table |

---

## 19. Routing — Every Route Explained

### Public Routes
| Path | Purpose |
|---|---|
| / | Redirect based on role, or to login |
| /login | Email/OAuth login |
| /register | Student signup |
| /register/professor | Professor signup |
| /reset-password | Password reset |
| /auth/callback | OAuth/magic-link callback |
| /account-restricted | Banned/restricted notice |
| /professor/pending | Awaiting approval notice |
| /professor/rejected | Rejection notice |
| /about, /contact, /privacy, /terms | Static info pages |
| /search | Public search |
| /community/:postId | Public post view |
| /diary/create | Diary creator |

### Student Routes (/student/*) — Requires role: student
/student/home — Dashboard
/student/community — Social feed
/student/societies — Browse societies
/student/marketplace, /student/buy-sell — Marketplace
/student/canteen — Food ordering
/student/print — Print ordering
/student/notifications — Notifications
/student/messages — Direct messages
/student/profile — Own profile
/student/profile/:userId — Other user profile
/student/settings/* — Account settings
/student/bookmarks — Bookmarked posts
/student/notices — Official notices
/student/search — Search

### Professor Routes (/professor/*) — Requires role: professor + professor_status: approved
/professor/home — Dashboard
/professor/attendance — Manage attendance
/professor/canteen, /professor/print — Ordering
/professor/payments — View payments
/professor/notices — Campus notices
/professor/messages — DMs
/professor/settings — Settings

### Dashboard Routes
/canteen-dashboard — Canteen owner management
/print-dashboard — Print shop management

### Admin Routes (/admin/*) — Requires role: admin
/admin — Dashboard
/admin/accounts — Accounts hub
/admin/users, /admin/users/:userId — User management
/admin/invites, /admin/professors — Access management
/admin/orders — Orders hub
/admin/canteen, /admin/print — Service management
/admin/marketplace — Listings management
/admin/community-hub — Community management
/admin/notices, /admin/announcements — Content publishing
/admin/email — Email management
/admin/finance — Finance overview
/admin/settings — Platform settings
/admin/legal — Legal management
/admin/audit — Audit log
/admin/alerts — Smart alerts

---

## 20. Environment Variables

### Frontend (.env in frontend/)
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_BACKEND_URL=http://localhost:3000
VITE_ADMIN_EMAIL=contactus.mayank@gmail.com
```

### Backend (.env in backend/)
```
PORT=3000
NODE_ENV=development
JWT_SECRET=<min 32 chars — REQUIRED>
ALLOWED_ORIGINS=https://campusblink.me,http://localhost:5173

SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  (NEVER expose to client!)

AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xxxx
AWS_S3_BUCKET=campusblink-files

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=app-password

VAPID_PUBLIC_KEY=xxxx
VAPID_PRIVATE_KEY=xxxx
VAPID_SUBJECT=mailto:admin@campusblink.me

MONGODB_URI=mongodb://localhost:27017/campusblink
```

---

## 21. Deployment

### Frontend -> Vercel
- frontend/vercel.json — SPA fallback routing (/* -> index.html)
- Build: vite build
- @vercel/analytics integrated

### Backend -> Vercel / any Node host
- Root vercel.json proxies /api/* to the backend service
- Procfile present (Heroku/Railway): web: node backend/src/index.js

### Production URLs
- App: https://campusblink.me
- Also: https://campusblink.vercel.app

### Dev Setup (Local)
```
# Terminal 1 - Frontend
cd frontend && npm run dev   # Runs on :5173

# Terminal 2 - Backend
cd backend && npm run dev    # Runs on :3000

# Vite proxies /api/* -> localhost:3000
```

---

## 22. Key Files Quick Reference

| What You Need | File Path |
|---|---|
| All routes | frontend/src/app/routes.tsx |
| App bootstrap / auth sync | frontend/src/app/App.tsx |
| Supabase frontend client | frontend/src/lib/supabase.js |
| Auth Zustand store | frontend/src/store/authStore.js |
| Theme store | frontend/src/store/themeStore.js |
| Cart store | frontend/src/store/cartStore.js |
| Feature gating hook | frontend/src/hooks/useFeatureAccess.ts |
| Realtime hook | frontend/src/hooks/useRealtime.js |
| Community feed (offline) | frontend/src/features/community/CommunityFeed.tsx |
| Diary editor | frontend/src/features/diary/DiaryEditor.tsx |
| PWA config | frontend/vite.config.ts |
| Service worker | frontend/src/sw.js |
| Backend entry | backend/src/index.js |
| Moderation pipeline | backend/src/services/moderation.js |
| Attendance service | backend/src/services/attendanceService.js |
| Messaging controller | backend/src/controllers/messagingController.js |
| Diary controller | backend/src/controllers/diaryController.js |
| Push service | backend/src/services/push.js |
| S3 service | backend/src/services/s3.js |
| Supabase admin service | backend/src/services/supabase.js |
| SQL migrations | sql/ and migrations/ |

---

## 23. Common Patterns & Conventions

### Data Fetching Pattern (Frontend)
```js
// 1. Supabase direct (most common)
const { data, error } = await supabase
  .from('posts')
  .select('*, author:profiles!author_id(name, avatar_url)')
  .order('created_at', { ascending: false });

// 2. Via backend API (for sensitive/moderated operations)
const res = await fetch('/api/diary', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${session.access_token}` },
  body: JSON.stringify(payload),
});
```

### Auth Token Pattern (Backend)
- Client sends: Authorization: Bearer <supabase_jwt>
- Backend middleware verifies with supabaseAdmin.auth.getUser(token)
- Attaches req.user = { id, email, role }

### Optimistic Updates
Most likes, bookmarks, and follows use optimistic UI:
```js
setLiked(!liked);
setLikeCount(liked ? count - 1 : count + 1);
const { error } = await supabase.rpc('increment_post_likes', { post_id: id });
if (error) { setLiked(liked); setLikeCount(count); } // Revert on failure
```

### Lazy Loading Routes
Every route uses lazy: async () => ({ Component: (await import('./Page')).Page }) for code splitting.

### Real-time Channel Naming Convention
canteen-orders-{shopId}
print-orders-{shopId}
community-feed-{tabName}
notifications-{userId}
feature-access-{userId}
marketplace-messages-{listingId}

### CSS / Theming
- Tailwind v4 with CSS variables for theme tokens
- data-theme="dark" / data-theme="light" on html element
- Color tokens defined as CSS custom properties in frontend/src/styles/

---

## 24. Known Architecture Risks

1. **Dual-architecture drift** — Frontend uses Supabase directly for most operations, but backend exists for some. Keep these in sync or consolidate.

2. **SQL migration ordering** — With 46+ SQL files in sql/ and 18 in migrations/, partial application causes environment drift. No migration runner exists; scripts must be run manually in the correct order.

3. **Policy recursion risk** — RLS policies that reference profiles can cause infinite recursion (Supabase known issue). Multiple fix_all_infinite_recursion.sql patches exist.

4. **MongoDB + fallback complexity** — Attendance uses MongoDB with a JSON file fallback. Two sources of truth can diverge. If MongoDB reconnects mid-session, in-memory fallback data may be lost.

5. **Offline + Supabase write conflicts** — Background sync queue can replay writes out of order if multiple writes queue up offline.

6. **Service-role key exposure risk** — SUPABASE_SERVICE_ROLE_KEY must stay backend-only. It bypasses all RLS. Never expose in frontend env vars.

7. **Realtime publication alignment** — All postgres_changes subscriptions require the relevant tables to be in the Supabase replication publication. Newly added tables must be explicitly added to the publication.

---

*This document was generated by deep workspace inspection on 2026-07-25.*
*For code details, always verify against the actual source files listed in Section 22.*
