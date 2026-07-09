Design a complete mobile and web UI for "Campus Blink" — a campus super-app for college students in India. The design must be extraordinarily bold, retro-modern, and eye-catching. Every screen should feel like it was designed by a world-class creative team. Students should feel excited to open this app every single day.

BRAND
Name: Campus Blink
Tagline: Your campus, supercharged.
Logo: Bold retro italic serif wordmark "Campus Blink" with a shooting star swoosh icon top-right. Four logo versions available in Figma assets:
- black_transparent: use on light/cream surfaces
- white_transparent: use on dark/black surfaces
- black (with bg): standalone use
- white (with bg): splash screen, dark overlays
Never place wrong logo version on wrong background.

COLORS
Background: #0A0A0A
Surface: #141414
Surface raised: #1C1C1C
Primary Accent: #FFD600
Accent soft: #FFF176
Text primary: #FFFFFF
Text secondary: #888888
Text muted: #444444
Border default: rgba(255,214,0,0.12)
Border subtle: rgba(255,255,255,0.06)
Success: #00E676
Warning: #FFD600
Error: #FF3D57
Overlay: rgba(0,0,0,0.85)
Glow yellow: 0 0 24px rgba(255,214,0,0.35)
Glow subtle: 0 0 48px rgba(255,214,0,0.08)

TYPOGRAPHY
Logo wordmark only: retro italic serif (as in logo files)
Hero headlines: Syne 800, tight letter-spacing -2px, white or yellow
Section titles: Syne 700, white
Card titles: Syne 600, white
Body and descriptions: DM Sans 300-400, #888888
Buttons and UI labels: DM Sans 500, white or black
Micro labels: DM Sans 500 uppercase 10px letter-spacing 2px yellow

DESIGN LANGUAGE — RETRO BOLD DARK
Thick yellow borders on featured cards and active states
Oversized Syne numerals as decorative background elements in sections
Diagonal yellow accent lines as section dividers
Cards have sharp corners OR heavily rounded — never in between, be decisive per screen
Yellow glow effect on primary CTA buttons and active nav elements
Shooting star logo icon used as decorative watermark at low opacity on dark sections
Background texture: very subtle noise grain at 3% opacity over #0A0A0A
Bold asymmetric hero layout — headline dominates left, visual dominates right
Yellow filled tags and badges on black — maximum contrast
Hover states: yellow border glow appears, card lifts slightly
Active nav: yellow pill indicator, white icon turns yellow

SCREENS

1. LANDING PAGE (1440px + 390px)
Navbar: white_transparent logo left on black bg. Nav links DM Sans white. Yellow pill CTA button right. Blur backdrop on scroll with yellow bottom border 1px.
Hero: Full viewport. Left side: oversize Syne 800 headline two lines. First line white "Your campus," second line solid yellow "supercharged." Yellow shooting star decorative element large faded behind text. Subheadline DM Sans 300 gray. Two CTAs: filled yellow pill "Get Early Access" black text + outlined white ghost "See Features". Right side: phone mockup on dark surface card with yellow glow behind it. Subtle noise grain background.
Ticker: Full-width solid yellow strip. Black DM Sans 500 text scrolling all features. Star separator between items.
Features: Dark section #141414. Diagonal yellow top divider. 2x2 oversized cards. Each card: #1C1C1C bg, yellow top border 2px, large icon top-right watermark low opacity, Syne 700 white module name, DM Sans gray description, yellow outlined feature pills.
Who it's for: #0A0A0A section. Large oversized section number "02" Syne 800 at 6% opacity background. 5 horizontal scroll cards each #141414 with yellow left border 3px, user type name Syne 700 white, feature list DM Sans gray.
How it works: 4 steps. Yellow numbered circles connected by dashed yellow line. Syne 600 white step title. DM Sans gray description. Shooting star icon walking along path faded.
Stats: Full-width #141414 section. 3 oversized Syne 800 yellow numbers. DM Sans gray labels below. Yellow glow behind each number.
CTA banner: #0A0A0A rounded-3xl with thick yellow border. white_transparent logo. Syne 800 white large headline. Yellow filled pill CTA button. Shooting star decorative large faded right side.

2. LOGIN & REGISTER (390px)
Full black page. Faded shooting star watermark large background 4% opacity. Centered #141414 card with yellow border 1px glow. white_transparent logo top. Yellow DM Sans tab toggle Login and Register with yellow underline indicator. Inputs: #1C1C1C bg, border rgba(255,214,0,0.2), yellow focus glow ring, white DM Sans text. No role selector. Role silently set to student. Full-width yellow pill button black DM Sans 500 text. After login redirect by role silently.

3. STUDENT DASHBOARD (390px)
Black top bar. white_transparent logo or wordmark. Bell icon white with yellow dot notification. Yellow reputation pill badge star icon. Hero greeting card: #141414 full-width rounded-2xl yellow border, Syne 700 white greeting, shooting star small icon right. 2x2 module cards: each #1C1C1C, yellow top border 2px, large faded icon watermark, Syne 600 white title, DM Sans gray status. Recent activity horizontal scroll dark cards. Bottom nav: #0A0A0A bar, yellow pill slides under active tab icon, active icon yellow, inactive icons #444444.

4. BUY & SELL (390px)
Black bg. Search bar #1C1C1C rounded-full yellow focus border. Horizontal chips: default #1C1C1C white text, active yellow bg black text. 2-column listing grid. Cards: #141414 rounded-2xl, image top, bottom section: title Syne 600 white, price Syne 700 yellow large, condition pill yellow outlined, seller row DM Sans gray, time ago. Yellow circular FAB "+" fixed bottom-right with glow. Post modal bottom sheet #141414 yellow border top.

5. CANTEEN MENU (390px)
Today's Special: full-width dark card yellow border, food image with dark overlay, Syne 700 white name, yellow price badge. Category tabs: yellow underline active, white inactive. Menu list: #141414 cards, food image left, name Syne 600 white, description DM Sans gray, price Syne 700 yellow, yellow stepper right. Sticky bottom cart bar: #1C1C1C yellow top border, total Syne 700 white, yellow pill View Cart button. Cart bottom sheet: items list, pickup time yellow chip selectors, payment toggle cards, yellow Order CTA.

6. CANTEEN DASHBOARD (Desktop)
Sidebar: #0A0A0A bg, white_transparent logo top, nav links DM Sans gray active=yellow, yellow left indicator on active, user info bottom. Main: #0A0A0A bg. Header: Syne 700 white title, green pulsing live dot, yellow order counter badge. Kanban: column headers yellow outlined pills. Order cards: #141414 yellow left border, student name Syne 600 white, items DM Sans gray, total yellow badge, yellow action button. Menu tab: dark image cards yellow border on available toggle active.

7. PRINT ORDER PAGE (390px)
#141414 upload zone: yellow dashed border, shooting star icon inside faded, DM Sans gray label. Drag-over state: yellow border solid glow. Options rows: #1C1C1C cards, DM Sans 500 white label left, yellow toggle or stepper right. Price breakdown card: #141414 yellow left border 3px, line items DM Sans gray, total Syne 800 yellow large. Full-width yellow pill Submit button black text. Success screen: large shooting star illustration, Syne 800 yellow order number, DM Sans gray details.

8. COMMUNITY FEED (390px)
Black bg. Tab bar yellow pill slides. Featured post: full-width #141414 yellow border card, type badge yellow filled, Syne 700 white title, DM Sans gray preview. Regular cards: #141414, color-coded type badge, avatar or Anonymous icon gray circle, Syne 600 white title, DM Sans gray preview, upvote row yellow number, comment count gray. Pinned: yellow left border 3px, slightly brighter surface. Yellow circular FAB. Post modal: type chips yellow active, inputs dark, anonymous toggle yellow.

9. PROFILE PAGE (390px)
Hero: #141414 full-width section yellow bottom border, avatar centered white ring, Syne 800 white name, DM Sans gray college, yellow role badge. Reputation card: #1C1C1C yellow border full glow, star icon yellow, Syne 800 yellow balance, DM Sans gray label, earn more yellow link. Stats: 3 equal #141414 cards yellow top border, Syne 800 white number, DM Sans gray label. My Listings horizontal dark scroll. Settings rows: #141414 chevron rows, red Logout bottom.

COMPONENTS
Primary Button: yellow #FFD600 pill, black DM Sans 500 text, yellow glow on hover
Secondary Button: yellow outlined border, yellow text, transparent bg
Ghost Button: white outlined, white text, subtle white fill hover
Danger Button: #FF3D57 fill, white text
Input: #1C1C1C bg, rgba(255,214,0,0.2) border, yellow glow focus ring
Card default: #141414 bg, rgba(255,255,255,0.06) border, rounded-2xl
Card featured: #141414 bg, yellow border 1px, yellow glow shadow
Glassmorphism: #ffffff08 bg, blur 20px, yellow border glow
Badge: yellow #FFD600 bg, black DM Sans text
Status Badge: Placed=blue, Preparing=amber, Ready=green, Collected=gray, Cancelled=red
Chip default: #1C1C1C bg, white text
Chip active: yellow bg, black text
Bottom Sheet: #141414 bg, yellow top border 1px, rounded-t-3xl, drag handle gray
Bottom Nav: #0A0A0A bar, yellow sliding pill indicator, active=yellow, inactive=#444444
Avatar: circular white ring, gray circle with star icon for anonymous

LOGO USAGE
Light surfaces: black_transparent logo
Dark surfaces: white_transparent logo
Splash screen: white logo on black bg
Never mix incorrectly

SPACING
Mobile: 16px padding, 8px grid
Desktop: 48px padding, 1280px max-width
Card gap: 12px mobile, 16px desktop
Section padding: 100px desktop, 60px mobile