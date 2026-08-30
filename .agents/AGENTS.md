# Campus Blink AI Assistant Rules
The rules in this file are STRICT CONSTRAINTS that must be followed by all AI agents working in this repository to prevent regressions and broken functionality.

## 1. Push Notifications (FCM / Web Push)
- **NEVER MODIFY `backend/src/services/push.js` or `frontend/src/sw.js` without explicit user permission.** The push notification system is highly fragile and perfectly tuned for iOS/Android cross-compatibility.
- **Payload Structure**: The FCM push payload MUST contain the root `notification` block so iOS Safari Web Push drops are prevented.
- **Duplicate Prevention**: The frontend `sw.js` must ALWAYS contain the early-return block `if (fcmNotification || payload?.webpush?.notification) return;` inside `onBackgroundMessage` to prevent duplicate notifications caused by Firebase Web SDK auto-rendering.
- **Urgency**: `webpush` headers MUST include `Urgency: 'high'` to bypass OS-level battery saving delays.

## 2. Notice Content Validation
- Notices in the `official_notices` table do NOT require the `title` or `content` fields to be populated. The UI allows submitting empty strings.
- Since the database has `NOT NULL` constraints on these columns, the frontend (`frontend/src/app/components/NoticeAdminPage.tsx`) conditionally bypasses this by saving a single space (`' '`) when left blank. DO NOT alter this fallback logic, and DO NOT add strict `.trim()` validation that prevents submission.
- The `NoticesPage.tsx` conditionally hides the title/content blocks if they evaluate to empty after trimming (`?.trim()`).

## 3. UI/UX Design System
- Always adhere to the project's strict `DESIGN.md` rules.
- **Theme**: Apple iOS Native Theme, light-mode ONLY.
- **Cards**: Pure white (`bg-white`) rounded cards (`rounded-2xl` or `rounded-3xl`) with ultra-soft shadows (`shadow-sm` or custom soft shadows).
- **Backgrounds**: The main app background must be `bg-gray-50` or `#F4F5F7`.
- **Interactions**: Always implement micro-interactions (e.g. `active:scale-[0.98]`, smooth transitions).

By following these rules, we ensure the core systems remain completely locked in and immune to breaking changes from future prompts.
