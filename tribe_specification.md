# TRIBE: Real-Time Community Sports Matchmaking & Roster Management Platform
## Comprehensive Technical & Functional Specification

---

## 1. Executive Summary & Vision
**TRIBE** is a centralized, responsive web platform designed to bridge the gap between amateur athletes, university students, and local sports facilities. It facilitates organizing, discovering, and joining local sports fixtures—from 5-a-side futsal to full-squad cricket.

**The Problem:** Recreational sports organization suffers from the "Flake Factor" (last-minute dropouts), information overload in group chats, and high barriers to entry for newcomers trying to find local games.
**The Solution:** TRIBE solves this with custom match lobbies, advanced filtering, a structured request/approve workflow, real-time roster updates, and built-in communication systems.

---

## 2. System Architecture & Tech Stack

TRIBE is built on the **MERN stack**, augmented with **WebSockets** for real-time capabilities, **Redis** for horizontal scaling and job queues, and cloud messaging for async alerts.

### 2.1 Technology Stack Details
*   **Database:** MongoDB (NoSQL). Chosen for its flexible schema to accommodate polymorphic sports data (e.g., cricket uses "roles" like bowler/batter, football uses "positions" like GK/Striker).
*   **Backend Framework:** Node.js with Express.js. Provides a scalable REST API and serves as the middleware connecting the database to the client.
*   **Frontend Library:** React.js (with Context API or Redux for state management). Ensures a responsive, mobile-first, SPA (Single Page Application) experience.
*   **Real-Time Communications:** Socket.io for live lobby state sync, slot decrements, and in-app chat. For horizontal deployment across multiple Node.js instances, Socket.io uses `@socket.io/redis-adapter` with a **Redis pub/sub layer**. This ensures events emitted on Server A reach clients connected to Server B. Sticky sessions are configured at the load balancer level (e.g., NGINX `ip_hash`) to maintain connection affinity.
*   **Job Queue & Scheduling:** BullMQ backed by Redis for persistent, delayed job execution. Handles waitlist promotion timers, lobby expiry transitions, and ringer alert scheduling. Jobs persist across server restarts—no in-process `setTimeout` is used for any deferred operation.
*   **Asynchronous Notifications:** Firebase Cloud Messaging (FCM) for push notifications and SendGrid/AWS SES for email alerts, ensuring users are informed even when the app is closed.
*   **File Storage:** AWS S3 (or Cloudinary) for user avatars, venue photos, and squad logos. Presigned URLs are used for secure client-side uploads. Image processing (thumbnails, compression) is handled via Sharp.js middleware or a serverless function.
*   **Authentication & Security:** JSON Web Tokens (JWT) for stateless session management, bcrypt for password hashing, helmet for HTTP header security, and `express-rate-limit` with defined thresholds.
*   **Styling & Design System:** Custom CSS with CSS custom properties (design tokens) for a consistent, premium design system. Google Fonts for typography.

### 2.2 Design Language & Theme

**Aesthetic Philosophy: "Warm Precision"** — Inspired by the Linear/Stripe/Vercel design standard, TRIBE uses warm, human-centric minimalism. The interface feels sophisticated and alive without relying on gimmicky neon colors or aggressive dark themes.

*   **Color Palette:**
    *   **Primary Background:** Soft warm off-whites (`#FAF9F7`, `#F5F3EF`) for light mode. Deep, warm charcoal (`#1A1A1A`, `#232323`) for dark mode — not pure black. Dark mode feels atmospheric, not harsh.
    *   **Surface / Cards:** `#FFFFFF` with ultra-thin `1px` borders in `rgba(0,0,0,0.06)` for light mode. `#2A2A2A` with `rgba(255,255,255,0.06)` borders for dark mode. Subtle elevation via soft `box-shadow` instead of heavy borders.
    *   **Primary Accent (CTA / Active States):** A single warm, energetic hue — **Burnt Coral** (`#E8614D`) or **Warm Amber** (`#E09145`). Used sparingly for primary buttons, active nav items, and status indicators. Never splashed everywhere.
    *   **Secondary Accent:** **Teal** (`#2A9D8F`) for success states, confirmations, and secondary interactive elements.
    *   **Text:** Rich warm charcoal (`#1A1A1A`) on light, warm off-white (`#EDEDED`) on dark. Never pure #000 or #FFF.
    *   **Muted States:** Warm grays (`#9B9B9B`, `#C5C1BC`) for secondary text, timestamps, and disabled elements.

*   **Typography:**
    *   **Headings:** `"Outfit"` (Google Fonts) — geometric sans-serif with character. Semi-bold (600) for page titles, Medium (500) for section headers.
    *   **Body Text:** `"Inter"` (Google Fonts) — optimized for screen readability at small sizes. Regular (400) for body, Medium (500) for emphasis.
    *   **Monospace/Data:** `"JetBrains Mono"` for slot counters, stats, and any numerical data displays.

*   **Shapes & Layout:**
    *   **Border Radius:** Consistent soft rounding — `8px` for cards, `6px` for buttons, `12px` for modals. No sharp corners.
    *   **Spacing System:** 4px base unit (4, 8, 12, 16, 24, 32, 48, 64).
    *   **Cards:** Bento-box style modular layouts. Cards use subtle shadows (`0 1px 3px rgba(0,0,0,0.04)`) and thin borders for structure. Glassmorphism (`backdrop-filter: blur(12px)`) reserved exclusively for modals and overlays.

*   **Motion & Interaction:**
    *   **Transitions:** All interactive elements have `200ms ease` transitions on hover/focus. No jarring state changes.
    *   **Micro-animations:** Subtle scale-up (`1.02x`) on card hover. Smooth fade-in for new lobby cards entering the feed. Slot counter uses a counting animation when decrementing.
    *   **Loading States:** Skeleton screens (pulsing warm-gray placeholders) instead of spinners wherever possible.
    *   **Scroll Behavior:** Smooth scroll throughout. Feed uses infinite scroll with graceful loading indicators.

*   **Dark Mode:** A refined, low-energy atmospheric dark mode is a first-class citizen, not an afterthought. It uses deep warm-charcoal backgrounds with subtle warm gray borders, never pure black. UI transitions between modes via a smooth crossfade. User preference is persisted.

### 2.3 System Data Flow
The platform serves three distinct actor types, each with their own flow through the system:

**Actor 1 — Player / Organizer (Standard User)**
1.  **Client Request:** The React frontend makes a RESTful HTTP request (e.g., creating a lobby, joining a match) to the Node/Express server.
2.  **Authentication Middleware:** Express middleware verifies the JWT and the user's roles.
3.  **Database Interaction:** Mongoose schemas interact with MongoDB to read/write data.
4.  **Real-time Event Emission:** Upon data mutation (e.g., player approved, slot decremented), the server uses Socket.io to emit an event targeting all users in that lobby "room" or the global "feed" room.
5.  **Client Update:** The React client receives the WebSocket event and updates its local state instantly without a page refresh.

**Actor 2 — Venue Owner (B2B Partner)**
1.  **Venue Dashboard Request:** The Venue Owner accesses their dedicated B2B dashboard and makes API calls to manage pitches, time slots, and view bookings.
2.  **Auth + Role Check:** Middleware verifies the JWT AND confirms the user has `"venue_owner"` in their `roles` array with a verified venue linked to their account.
3.  **Booking Sync:** When an Organizer books a time slot at their venue, the Venue Owner receives a real-time Socket.io notification and their booking calendar updates live.

**Actor 3 — Platform Admin**
1.  **Admin Panel Request:** The Admin accesses a protected dashboard to manage users, verify venue applications, and monitor platform health.
2.  **Auth + Admin Role Check:** Middleware confirms `"admin"` is in the user's `roles` array before granting access to any admin endpoint.

### 2.4 Database Scalability & Performance
To effortlessly handle 30,000 to 40,000 active users, the database and backend will incorporate the following architectural considerations:
*   **Indexing:** Essential MongoDB fields (e.g., `sport`, `dateTime`, and `location.coordinates` for `2dsphere` geospatial indexing) will be heavily indexed for rapid read operations and radial distance calculations during intense live feed filtering.
*   **Connection Pooling:** The Node.js server will manage an optimized pool of MongoDB connections to avoid handshake delays during high traffic.
*   **Pagination/Infinite Scroll:** The live feed API will utilize cursor-based pagination so that not all active lobbies are loaded simultaneously, preserving payload sizes and database read times.
*   **Concurrency Control:** All slot modifications use MongoDB's `findOneAndUpdate` with a guard condition `{ openSlots: { $gt: 0 } }` as an atomic operation. If the condition fails, the request is rejected with a `409 Conflict`. This prevents race conditions where two simultaneous approvals could drive `openSlots` negative.
*   **Derived Counts:** As an additional safety measure, `openSlots` can be validated against `totalSlots - confirmedPlayerIds.length` to detect and correct any drift between the counter and the actual roster.
*   **WebSocket Scaling:** For horizontal deployment, Socket.io uses `@socket.io/redis-adapter` with Redis pub/sub. Sticky sessions configured at the load balancer (NGINX `ip_hash`) maintain connection affinity across multiple Node.js processes.
*   **Timezone Handling:** All dates are stored in **UTC**. Each lobby and time slot carries an explicit `timezone` field (IANA format, e.g., `"Asia/Dubai"`, `"Europe/London"`) to preserve the original local timezone for display purposes. The frontend converts UTC to local display time using this field.

---

## 3. Page Blueprint & Feature Mapping

The platform will have the following structured pages:

### 3.1 Public Pages (Pre-Authentication)
*   **Landing Page (`/`)**
    *   **Features:** Hero section with dynamic video/image background of sports action, value proposition, "How it Works" section, and call-to-action (CTA) buttons to Login/Register.
*   **Authentication (`/login`, `/register`)**
    *   **Features:** JWT-based login, profile creation, password reset mechanisms. All users have player capabilities by default. Venue owners register through a separate application process.

### 3.2 Core Platform Pages (Authenticated)
*   **User Dashboard / Live Feed (`/feed`)**
    *   **Features:**
        *   **Live Match Feed:** A scrolling, cursor-paginated list of available lobbies updated in real-time.
        *   **Advanced Filters:** Sidebar/Top bar to filter by: Sport (Futsal, Cricket, Basketball, etc.), Date/Time range, Distance/Location (radial search using GeoJSON).
        *   **Actionable Cards:** Each match card shows sport, venue, time, open slots, and a "Request to Join" button.
        *   **Squad Discovery Panel:** Sidebar section to browse and search for squads with filters (sport, location).
*   **Match Lobby Creation (`/lobby/create`)**
    *   **Features:** Multi-step form for organizers.
        *   *Step 1:* Sport selection (Football, Cricket, Basketball, Tennis, Padel, Pickleball, Volleyball, Badminton, Table Tennis). For sports like Football or Cricket, the host manually selects the format (e.g., 5-a-side, 7-a-side, or 11-a-side). Date/Time selection with timezone auto-detected from browser and stored.
        *   *Step 2:* Venue configuration. The organizer can either select a **Verified Venue** from the platform's directory (which auto-fills location, shows the venue's supported sports, and displays live pitch availability filtered by the selected sport) OR manually type an address via Google Places API / Mapbox autocomplete.
        *   *Step 3:* Roster details. Total players needed for the organizer's team (see **Lobby Scope** below). Specific positions needed (e.g., "Need 1 Wicket Keeper").
        *   *Step 4:* Review & publish. Any pitch costs or payments are handled entirely offline between users—the platform does not manage financial transactions.
*   **Match Lobby Details (`/lobby/:id`)**
    *   **Features:**
        *   **Real-time State:** Live socket connection reflecting current slots.
        *   **Organizer View:** Dashboard to see pending join requests (from JoinRequests collection), chat with applicants, "Approve", "Reject", or manual "Decrement Slot" buttons.
        *   **Player View:** Status of their request (Pending/Accepted/Rejected/Dropped Out), WhatsApp connection link, roster list, and a "Leave Match" button for confirmed players.
        *   **In-Lobby Chat:** Socket-powered text chat for participants. Messages are stored in a separate `Messages` collection and loaded via paginated API calls (not embedded in the lobby document). Includes **WhatsApp-style read receipts**: single grey tick (sent), double grey tick (delivered), double blue tick (read).
*   **User Profile (`/profile/:id`)**
    *   **Features:** Stats (matches played), sports preferences, contact info (WhatsApp number visibility controls), and ability to toggle "Ringer Mode."
    *   **Notification Preferences:** Granular controls for email vs. push vs. in-app notifications, with toggles per notification type (match updates, ringer alerts, squad invites).
    *   **Personal & Request History:** Users can securely view a full historical log of their past match lobbies and all previously submitted join requests.
    *   **Squad Memberships:** Lists any squads the user manages or is part of. *Crucial Note: Joining or creating a squad does not bind or restrict a user; they maintain the full freedom to continue participating in regular matches as a solo player at any time.*
*   **Squad Profile (`/squad/:id`)**
    *   **Features:** Persistent team identity (e.g., "Northside FC"), squad logo, shared roster, match history, and ability for the Captain to post open Squad vs. Squad challenges.
*   **Squad Discovery (`/squads`)**
    *   **Features:** Browsable, filterable directory of all squads on the platform. Filter by sport, location. Each card shows squad name, sport, member count, and a "View Profile" / "Request to Join" button.
*   **Venue Profile (`/venue/:id`)**
    *   **Features:** Verified local sports complex pages showing amenities (Showers, Parking), photos, pricing (informational only), and map location (Google Maps integration via fetched coordinates). Lists which sports the venue supports and upcoming open lobbies hosted there.
*   **Notifications Hub / Inbox (Sidebar / Dropdown)**
    *   **Features:** Consolidated inbox querying the `Notifications` collection for historical alerts ("Request Approved", "Waitlist Turn", "Ringer Alert"). Respects user's notification preferences.

### 3.3 Verified Venue Pages (B2B Partner Dashboard)
*   **Venue Directory (`/venues`)**
    *   **Features:** A public-facing, browsable list of all verified venues on the platform. Users can filter by sport, location, and amenities. Each card shows the venue name, sports supported, amenities, and a link to the full venue profile.
*   **Venue Profile (`/venue/:id`)** *(public view)*
    *   **Features:** Detailed page showing the venue's address (with embedded Google Map), amenities (Showers, Parking, Floodlights), pricing (display only), photos, and a list of upcoming open lobbies hosted at that venue.
*   **Venue Owner Dashboard (`/venue/dashboard`)** *(authenticated, venue_owner role only)*
    *   **Features:**
        *   **Live Booking Calendar:** Visual grid showing which pitches are booked, available, or under maintenance. Each pitch displays its supported sport(s) — a single pitch may support multiple sports (e.g., a multi-purpose court) or a single sport.
        *   **Booking Details:** For each booked slot, the venue sees Match Format, Date/Time, and Organizer contact info. They do NOT see individual player data or chat history (Separation of Concerns).
        *   **Venue Booking History & Analytics:** Unlimited access to a filterable, historical log of all past bookings at their venue to track peak traffic and repeat Organizers. Booking volume tracking and utilization metrics.
        *   **Approval Workflow:** Toggle between "Instant Book" and "Request to Book" mode.
        *   **Pitch & Slot Management:** Venue owners can create, edit, and deactivate pitches. Each pitch specifies the sport(s) it supports. Time slots are managed per-pitch via the `TimeSlots` collection — venue owners can bulk-generate recurring time slots or create one-off availability.
        *   **Tournament Creation:** Ability to create Tournament Lobbies where Squads apply to enter (see Section 10).

### 3.4 Tournament Pages
*   **Tournament Directory (`/tournaments`)**
    *   **Features:** Top-level browsable list of upcoming tournaments. Filter by sport, venue, dates, and registration status.
*   **Tournament Details (`/tournament/:id`)**
    *   **Features:** Tournament info, registered squads, bracket visualization (when generated), schedule, and "Register Squad" button for eligible captains.

### 3.5 Admin Panel Pages
*   **Admin Dashboard (`/admin`)**
    *   **Features:** System-wide metrics (active lobbies, user accounts, total bookings), user moderation tools (banning toxic users), and **Venue Verification Queue** (reviewing and approving/rejecting venue applications).

---

## 4. Workflows & Interactions

### 4.1 The "Join Request & Approval" Workflow
1.  **Request:** Player clicks "Join". A `POST` request creates a new document in the `JoinRequests` collection. A unique compound index `{ lobbyId, userId }` prevents duplicate join requests.
2.  **Notification:** Organizer receives an instant Socket.io notification if online, AND an async FCM/Email notification if offline (respecting their notification preferences).
3.  **Review:** Organizer views the player's profile and sports preferences.
4.  **Action:** Organizer clicks "Approve".
5.  **State Change:** The backend uses `findOneAndUpdate` with `{ openSlots: { $gt: 0 } }` to atomically decrement `openSlots`, add the user to `confirmedPlayerIds`, and update the JoinRequest status to `APPROVED`. If the atomic condition fails (slots already full), the approval returns a `409 Conflict`. A `lobbyUpdated` socket event is emitted.
6.  **Lockdown:** Once `openSlots` reaches 0, the lobby status changes to "LOCKED". No further requests can be made.

### 4.2 Automated Waitlists & Ringer Alerts
*   **Waitlist Cascade:** If a lobby is LOCKED (full), users can still join a Waitlist by creating a JoinRequest with `type: "WAITLIST"`. If a confirmed player drops out (see Section 4.7), a **BullMQ delayed job** is enqueued to notify Waitlist User #1. They have 5 minutes to accept by clicking an "Accept Promotion" button in their notification. If the timer expires without acceptance, the job fires and promotes the next waitlisted user. Jobs persist across server restarts.
*   **Ringer Mode:** Users can turn on a "Ready to Play Now" toggle on their profile. If a lobby suddenly loses a player within 2 hours of kick-off, the system sends an emergency "Ringer Alert" to nearby users with this toggle active.

### 4.3 Squad vs. Squad Challenge Workflow
A challenge is a distinct workflow from regular lobby matchmaking.

1.  **Post Challenge:** A Squad Captain creates a **Challenge** document via `POST /api/squads/:id/challenge`. The challenge specifies sport, match format, proposed date/time, and optionally a proposed venue.
2.  **Discovery:** Open challenges appear in a browsable feed at `GET /api/challenges?sport=Football`. Squads can also be notified of relevant challenges based on their sport preferences.
3.  **Accept:** Another Squad Captain accepts via `PATCH /api/challenges/:id/accept`.
4.  **Lobby Auto-Creation:** Upon acceptance, the system automatically creates a new Match Lobby linked to both squads. `confirmedPlayerIds` is pre-populated from both squad rosters. Slot counts are pre-calculated based on squad sizes vs. required match format.
5.  **Finalization:** Both captains receive Socket.io notifications. The lobby appears in both squads' match history. The Challenge status transitions to `ACCEPTED`.
6.  **Expiry:** Challenges that receive no acceptance expire automatically after their proposed date/time passes (managed by BullMQ or a TTL index on `expiresAt`).

### 4.4 B2B Venue Integration
To provide a premium experience, local sports complexes can claim a Verified Venue Profile. This shifts the platform from a simple matching tool to a complete booking ecosystem.

**A. Admin Verification & Onboarding**
*   All venues must be manually approved by the platform Admin to ensure legitimacy.
*   Once verified, the Venue is granted access to a specialized B2B Venue Dashboard.

**B. Separation of Concerns (Venue vs. Organizer)**
To prevent overlapping responsibilities, the platform enforces strict boundaries between facility management and roster management:
*   **The Venue Controls: Inventory.** They manage pitch availability, time slots, and overarching facility rules. Each pitch specifies which sport(s) it supports — a venue with 3 pitches might have two football pitches and one padel court, or a multi-purpose court that supports both basketball and volleyball. Time slots are managed independently per pitch at any given hour.
*   **The Organizer Controls: The Roster.** The user who books the pitch retains total control over matchmaking, slot filling, waitlists, and in-lobby chat.
*   **Pricing is Informational Only.** `hourlyRate` displayed on venue profiles and pitches is for reference purposes only and does not represent a platform transaction. All actual payments are handled entirely offline between users and venues.

**C. The B2B Venue Dashboard Features**
Instead of seeing granular player data, the Venue Dashboard provides a high-level operational view:
*   **Live Booking Calendar:** Visual grid showing which pitches are booked, available, or under maintenance. Filterable by sport and pitch.
*   **Booking Details:** For each booked slot, the venue can see the Match Format (e.g., 5-a-side), Date/Time, and the Organizer's contact info.
*   **Match History & Analytics:** Access to historical booking data to track peak hours, repeat Organizers, and overall booking volume.
*   **Approval Workflow:** Venues can toggle "Instant Book" or "Request to Book" (allowing them to approve or reject a user's booking request based on facility availability).

**D. Automated Venue Matching**
*   When an Organizer creates a lobby (`/lobby/create`), instead of manually typing an address, they can select a Verified Venue.
*   The venue's pitches are filtered to show only those supporting the selected sport. The organizer then sees live available time slots for eligible pitches. Once selected, the venue is automatically notified, and the lobby is linked directly to the venue's master calendar.

**E. Venue-Hosted Tournaments & Leagues**
*   Venues are not limited to one-off bookings. They have the authority to generate Tournament Lobbies (see Section 10).

### 4.5 Manual Offline Override & Early Closure
*   **Manual Decrement:** If an organizer recruits a player offline (e.g., a friend confirms on WhatsApp), they can click "Friend Joined Offline." The backend decrements the slot count by 1 using the same atomic `findOneAndUpdate` with `{ openSlots: { $gt: 0 } }` to keep the live feed accurate without requiring the friend to use the app. If the guard condition fails, the organizer is notified that no slots remain.
*   **Instant Close:** Organizers have absolute control over their lobbies. They can manually switch the lobby status to "LOCKED"/Closed at any time, instantly stopping any further requests, regardless of whether the slots are completely filled.

### 4.6 Lobby Lifecycle & Expiry
Lobbies are not permanent. The system enforces automatic lifecycle transitions to prevent stale data:
*   **`expiresAt` Field:** Each lobby has a computed `expiresAt` timestamp set to `dateTime + 2 hours` (covering the expected match duration).
*   **Automatic Transition:** A BullMQ recurring job runs every 15 minutes, querying for lobbies where `expiresAt < now()` and `status` is still `OPEN` or `LOCKED`. These lobbies are transitioned to `COMPLETED` (if they had confirmed players) or `EXPIRED` (if they never filled).
*   **Feed Exclusion:** The live feed query filters on `status: "OPEN"` and `dateTime: { $gte: now() }`, ensuring expired/completed lobbies never appear in search results.
*   **Archival:** Completed and expired lobbies remain in the database for historical records (user match history, squad stats) but are excluded from all active queries via indexed status filtering.

### 4.7 Cancellation & Dropout Workflow
A confirmed player can voluntarily leave a match, triggering an automated cascade:
1.  **Dropout:** The player calls `PATCH /api/requests/:id/dropout`. Their JoinRequest status transitions from `APPROVED` to `DROPPED_OUT`.
2.  **Roster Update:** The player is removed from the lobby's `confirmedPlayerIds` array. `openSlots` is incremented by 1.
3.  **Status Unlock:** If the lobby was `LOCKED` (full), it transitions back to `OPEN`.
4.  **Waitlist Cascade:** The waitlist promotion logic fires (Section 4.2) — next waitlisted user is notified with a 5-minute acceptance window.
5.  **Ringer Alert:** If the match is within 2 hours, a Ringer Alert is additionally triggered for nearby users.
6.  **Cancel Pending:** A player with a `PENDING` request can cancel it via `PATCH /api/requests/:id/cancel`, transitioning status to `CANCELLED`.

### 4.8 Venue Booking Cancellation
An organizer who has booked a venue time slot can cancel that booking:
1.  **Time Restriction:** Cancellations are only permitted up to **24 hours before** the booked start time.
2.  **Endpoint:** `DELETE /api/venues/:venueId/bookings/:slotId`
3.  **Effect:** The `TimeSlot` document's status reverts from `BOOKED` to `AVAILABLE`, `bookedByLobbyId` and `bookedByUserId` are cleared.
4.  **Notification:** The venue owner receives a Socket.io notification and email alert about the cancellation.

---

## 5. System API Design (RESTful)

### 5.1 Authentication & User Space (`/api/users`)
*   `POST /auth/register`: Create new user. All users receive `roles: ["player"]` by default.
*   `POST /auth/login`: Generate JWT.
*   `GET /users/me`: Get current authenticated user profile.
*   `GET /users/me/history`: Retrieve full historical log of past played matches and join requests.
*   `GET /users/me/squads`: Retrieve a list of all squads the user manages or belongs to.
*   `PATCH /users/me/notification-preferences`: Update notification preferences (email/push/in-app toggles per notification type).

### 5.2 Lobbies (`/api/lobbies`)
*   `GET /`: Retrieve all active lobbies (supports pagination `?cursor=<id>&limit=20`, distance, sport filters).
*   `POST /`: Create a new lobby (Organizer or Venue for tournaments). Server-side sport validation enforces allowed `matchFormat` values for the selected sport (see Section 9).
*   `GET /:id`: Get specific lobby details.
*   `GET /:id/messages`: Paginated chat messages for this lobby (`?cursor=<timestamp>&limit=50`).
*   `PATCH /:id`: Update lobby details.
*   `PATCH /:id/close`: Organizer manually locks/closes the lobby at any time.
*   `DELETE /:id`: Cancel a lobby.

### 5.3 Join Requests (`/api/requests`)
*   `POST /lobby/:id/request`: Submit a join request (individual or as a Squad). Fails with `409 Conflict` if a request from this user already exists for this lobby.
*   `PATCH /request/:id/approve`: Organizer approves application. Uses atomic `findOneAndUpdate` with slot guard.
*   `PATCH /request/:id/reject`: Organizer rejects application.
*   `PATCH /request/:id/dropout`: Confirmed player voluntarily leaves. Triggers waitlist cascade.
*   `PATCH /request/:id/cancel`: Player cancels a pending or waitlisted request.
*   `POST /lobby/:id/manual-decrement`: Organizer manually reduces slots (atomic operation with slot guard).
*   `POST /lobby/:id/waitlist`: Join the waitlist on a LOCKED lobby. Fails with `409 Conflict` if the user already has a pending request or is on the waitlist.

### 5.4 Squads (`/api/squads`)
*   `GET /`: Browse/search squads with filters (sport, location).
*   `POST /`: Create a new Squad.
*   `GET /:id`: Get Squad profile.
*   `GET /:id/history`: View the complete, dedicated history of past matches fought by this Squad.
*   `PATCH /:id`: Update Squad details (Captain only).
*   `POST /:id/invite`: Invite a user to the Squad.
*   `POST /:id/challenge`: Post an open Squad vs. Squad challenge.

### 5.5 Challenges (`/api/challenges`)
*   `GET /`: Browse open squad challenges with filters (sport, location, date).
*   `GET /:id`: Get challenge details.
*   `PATCH /:id/accept`: Another squad accepts the challenge. Auto-creates a linked lobby.
*   `PATCH /:id/cancel`: Challenger cancels their open challenge.

### 5.6 Venues (`/api/venues`)
*   `GET /`: List all verified venues (public, supports filters by sport, location, amenities).
*   `POST /apply`: Submit a venue verification application.
*   `GET /:id`: Get venue profile (public view).
*   `GET /:id/history`: Fetch complete log of all past bookings (Authenticated Venue Owner only).
*   `PATCH /:id`: Update venue details (Venue Owner only).
*   `GET /:id/slots`: Get live available time slots for a venue. Supports filter by sport, pitch, and date range.
*   `POST /:id/book`: Organizer books a time slot at the venue.
*   `DELETE /:id/bookings/:slotId`: Cancel a venue booking (24-hour minimum notice required).

### 5.7 Tournaments (`/api/tournaments`)
*   `GET /`: List upcoming tournaments with filters (sport, venue, status).
*   `POST /`: Create a new tournament (Venue Owner or Admin only).
*   `GET /:id`: Get tournament details, registered squads, and bracket.
*   `PATCH /:id`: Update tournament details.
*   `POST /:id/register`: Register a squad for the tournament (Squad Captain only).
*   `PATCH /:id/bracket`: Update bracket results (Tournament organizer only).

### 5.8 Admin (`/api/admin`)
*   `GET /dashboard`: Platform-wide metrics (active lobbies, user accounts, total bookings).
*   `PATCH /venues/:id/verify`: Approve a venue application.
*   `PATCH /venues/:id/reject`: Reject a venue application.
*   `PATCH /users/:id/ban`: Ban a user.

---

## 6. Real-Time Socket Events & Notifications

**Lobby Events**
*   `join_lobby_room`: Client joins an isolated communication channel for a specific match.
*   `request_received`: Broadcast to organizer when someone applies.
*   `roster_updated`: Broadcast to all users viewing the lobby when a slot count drops.
*   `lobby_locked`: Broadcast when slots hit 0.
*   `new_message`: In-lobby chat routing (messages persisted to Messages collection).
*   `message_delivered`: Client emits when a message arrives in their socket. Server updates the message's `deliveredTo` array and broadcasts delivery status back to the sender.
*   `message_read`: Client emits when the chat panel is in focus and messages are visible in the viewport. Server updates the `readBy` array and broadcasts read status (blue tick) back to the sender.
*   `waitlist_promoted`: Notify the next waitlisted user when a slot opens (triggered by BullMQ job).
*   `ringer_alert`: Emergency broadcast to nearby users with Ringer Mode active.
*   `player_dropped`: Broadcast when a confirmed player leaves, triggering UI updates for all lobby viewers.

**Venue Events**
*   `booking_received`: Notify Venue Owner when an Organizer books a slot.
*   `booking_confirmed`: Notify the Organizer when a venue confirms their booking (Request to Book mode).
*   `booking_cancelled`: Notify Venue Owner when an Organizer cancels a booking.
*   `calendar_updated`: Live refresh of the Venue Owner's booking calendar.

**Challenge Events**
*   `challenge_posted`: Broadcast to squads matching the sport criteria.
*   `challenge_accepted`: Notify the challenger squad that their challenge was accepted and a lobby was created.

---

## 7. Security & Risk Mitigation
*   **Authentication:** Strictly enforced JWTs passed via HTTP-only cookies or Authorization headers.
*   **Authorization Middleware:** Role-based access control (RBAC) using the `roles` array. A user with `roles: ["player", "venue_owner"]` can both play in matches and manage their venue. Only the designated `organizer_id` can approve requests or decrement slots for a specific lobby. Only verified `venue_owner` accounts can access the B2B dashboard.
*   **Input Validation:** `express-validator` or `Joi` handles all incoming POST/PATCH requests to prevent NoSQL injection and XSS (Cross-Site Scripting).
*   **Server-Side Sport Validation:** A `sportConfig` map on the server defines allowed `matchFormat` values per sport. During lobby creation, the API validates that the submitted `matchFormat` is within the allowed range for the selected sport. For example, Tennis only allows `matchFormat: 1` (Singles) or `matchFormat: 2` (Doubles). A Football lobby with `matchFormat: 2` would be rejected. Invalid combinations return `400 Bad Request`. This prevents circumvention of frontend-only validation.
*   **Rate Limiting:** API rate limiting via `express-rate-limit` with defined thresholds:
    *   Authentication endpoints: **10 requests/minute** per IP
    *   Join request submission: **5 requests/minute** per user
    *   Lobby creation: **3 requests/hour** per user
    *   Venue booking: **5 requests/hour** per user
    *   Chat messages: **30 messages/minute** per user
    *   General API: **100 requests/minute** per user
*   **Concurrency Safety:** All slot-modifying operations use atomic `findOneAndUpdate` with guard conditions. Duplicate join requests are prevented by a unique compound index on `{ lobbyId, userId }` in the JoinRequests collection.
*   **Privacy:** WhatsApp numbers and precise contact info are only exposed *after* a player is approved by the organizer. Venue Owners cannot see individual player data or in-lobby chat (Separation of Concerns).

---

## 8. Database Schema Outline (MongoDB)

### User Collection
```json
{
  "_id": "ObjectId",
  "name": "String",
  "email": "String (unique)",
  "passwordHash": "String",
  "whatsappNumber": "String",
  "avatarUrl": "String (S3/Cloudinary URL) [Optional]",
  "roles": ["String"],
  "ringerMode": "Boolean (default: false)",
  "preferences": ["String"],
  "notificationPreferences": {
    "email": { "matchUpdates": true, "ringerAlerts": true, "squadInvites": true },
    "push": { "matchUpdates": true, "ringerAlerts": true, "squadInvites": true },
    "inApp": { "matchUpdates": true, "ringerAlerts": true, "squadInvites": true }
  },
  "location": {
    "type": "Point",
    "coordinates": ["longitude", "latitude"]
  },
  "createdAt": "Date",
  "updatedAt": "Date"
}
```
**Indexes:** `{ email: 1 }` (unique), `{ "location": "2dsphere" }` (for Ringer proximity queries)

### Match Lobby Collection
*To ensure sub-millisecond query efficiency for 40k+ concurrent users, this collection utilizes robust compound indexing on `{ sport: 1, status: 1, dateTime: 1 }` and a strict `2dsphere` index on `location`. This acts as the heavy-lifting backbone of the entire live feed architecture.*

**Lobby Scope:** A lobby represents **one team/side** seeking players. `totalSlots` is the number of players the organizer needs for their side. For a 5-a-side football match, `totalSlots = 4` (organizer is player #1 + 4 open slots). The opposing team is either managed via a Squad vs. Squad challenge (Section 4.3) or arranged entirely outside the platform.

```json
{
  "_id": "ObjectId",
  "organizerId": "ObjectId (Ref: User)",
  "squadId": "ObjectId (Ref: Squad) [Optional]",
  "sport": "String (Football, Cricket, Padel, etc.)",
  "matchFormat": "Number (e.g., 5 for 5-a-side, 2 for Doubles)",
  "location": {
    "type": "Point",
    "coordinates": ["longitude", "latitude"],
    "address": "String (Verified autocomplete address label)",
    "venueId": "ObjectId (Ref: Venue) [Optional]"
  },
  "dateTime": "Date (UTC)",
  "timezone": "String (IANA, e.g., Asia/Dubai)",
  "expiresAt": "Date (UTC)",
  "totalSlots": "Number",
  "openSlots": "Number",
  "confirmedPlayerIds": ["ObjectId (Ref: User)"],
  "status": "String (OPEN, LOCKED, CANCELLED, COMPLETED, EXPIRED)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```
**Indexes:**
- `{ sport: 1, status: 1, dateTime: 1 }` — compound index for feed queries
- `{ "location": "2dsphere" }` — geospatial queries
- `{ status: 1, expiresAt: 1 }` — lobby expiry job queries
- `{ organizerId: 1 }` — organizer's lobby history

### JoinRequests Collection
*Separated from the lobby document to prevent unbounded array growth and allow independent querying of request history.*

```json
{
  "_id": "ObjectId",
  "lobbyId": "ObjectId (Ref: Match Lobby)",
  "userId": "ObjectId (Ref: User)",
  "squadId": "ObjectId (Ref: Squad) [Optional]",
  "type": "String (JOIN, WAITLIST)",
  "status": "String (PENDING, APPROVED, REJECTED, DROPPED_OUT, CANCELLED, EXPIRED)",
  "respondedAt": "Date [Optional]",
  "createdAt": "Date"
}
```
**Indexes:**
- `{ lobbyId: 1, userId: 1 }` — **unique compound index** preventing duplicate join requests
- `{ lobbyId: 1, type: 1, status: 1, createdAt: 1 }` — querying pending requests and waitlist order
- `{ userId: 1, status: 1 }` — user's request history

### Messages Collection
*Chat messages are stored in a dedicated collection, paginated independently from the lobby document. This prevents the 16MB document size limit issue caused by unbounded chat arrays.*

```json
{
  "_id": "ObjectId",
  "lobbyId": "ObjectId (Ref: Match Lobby)",
  "userId": "ObjectId (Ref: User)",
  "message": "String",
  "status": "String (SENT, DELIVERED, READ)",
  "deliveredTo": ["ObjectId (Ref: User)"],
  "readBy": ["ObjectId (Ref: User)"],
  "createdAt": "Date"
}
```

**Read Receipt Logic:**
- **SENT** (🕐 clock / single grey ✓): Message saved to database. Default status on creation.
- **DELIVERED** (✓✓ double grey): At least one recipient's client emits `message_delivered`. `deliveredTo` array is updated. Status transitions to `DELIVERED` when `deliveredTo.length > 0`.
- **READ** (✓✓ double blue): Recipient's chat panel is visible/focused in the viewport. Client emits `message_read`. `readBy` array is updated. Status transitions to `READ` when all active lobby members have read the message.

**Indexes:**
- `{ lobbyId: 1, createdAt: -1 }` — paginated message retrieval (newest first)

### Notification Collection
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (Ref: User)",
  "lobbyId": "ObjectId (Ref: Match Lobby) [Optional]",
  "type": "String (e.g., APPROVAL, REQUEST, ALERT, WAITLIST_PROMOTION, RINGER, CHALLENGE, BOOKING)",
  "message": "String",
  "isRead": "Boolean",
  "createdAt": "Date"
}
```
**Indexes:**
- `{ userId: 1, isRead: 1, createdAt: -1 }` — user's unread notifications feed

### Squad Collection
```json
{
  "_id": "ObjectId",
  "captainId": "ObjectId (Ref: User)",
  "name": "String (e.g., Northside FC)",
  "logoUrl": "String (S3/Cloudinary URL) [Optional]",
  "sport": "String (primary sport)",
  "roster": ["ObjectId (Ref: User)"],
  "location": {
    "type": "Point",
    "coordinates": ["longitude", "latitude"]
  },
  "stats": {
    "wins": "Number",
    "losses": "Number",
    "matchesPlayed": "Number"
  },
  "createdAt": "Date"
}
```
**Indexes:**
- `{ sport: 1, "location": "2dsphere" }` — squad discovery by sport and proximity

### Challenges Collection
*A separate document type for Squad vs. Squad matchmaking (not embedded in lobbies).*

```json
{
  "_id": "ObjectId",
  "challengerSquadId": "ObjectId (Ref: Squad)",
  "sport": "String",
  "matchFormat": "Number",
  "proposedDateTime": "Date (UTC)",
  "timezone": "String (IANA)",
  "proposedVenueId": "ObjectId (Ref: Venue) [Optional]",
  "proposedLocation": {
    "type": "Point",
    "coordinates": ["longitude", "latitude"],
    "address": "String [Optional]"
  },
  "status": "String (OPEN, ACCEPTED, EXPIRED, CANCELLED)",
  "acceptedBySquadId": "ObjectId (Ref: Squad) [Optional]",
  "lobbyId": "ObjectId (Ref: Match Lobby) [Optional]",
  "expiresAt": "Date (UTC)",
  "createdAt": "Date"
}
```
**Indexes:**
- `{ sport: 1, status: 1, proposedDateTime: 1 }` — browsing open challenges
- `{ status: 1, expiresAt: 1 }` — expiry job queries

### Venue Collection (B2B Partners)
```json
{
  "_id": "ObjectId",
  "ownerId": "ObjectId (Ref: User)",
  "name": "String",
  "isVerified": "Boolean (default: false, set to true by Admin)",
  "bookingMode": "String (INSTANT_BOOK, REQUEST_TO_BOOK)",
  "sportsSupported": ["String"],
  "location": {
    "type": "Point",
    "coordinates": ["longitude", "latitude"],
    "address": "String"
  },
  "amenities": ["String"],
  "photos": ["String (S3/Cloudinary URL)"],
  "pitches": [
    {
      "name": "String (e.g., Pitch A, Court 1)",
      "sports": ["String"],
      "hourlyRate": "Number (informational only, display purposes)"
    }
  ],
  "createdAt": "Date"
}
```
**Indexes:**
- `{ isVerified: 1, "location": "2dsphere" }` — public venue discovery
- `{ ownerId: 1 }` — venue owner lookup

**Note on `pitches.sports`:** Each pitch within a venue independently declares which sport(s) it supports. A venue with 4 pitches might configure them as:
- Pitch A: `["Football"]` (dedicated football field)
- Pitch B: `["Football"]` (dedicated football field)
- Court 1: `["Padel"]` (dedicated padel court)
- Multi-Court: `["Basketball", "Volleyball"]` (multi-purpose court)

This allows the platform to show only relevant pitches when an organizer selects a sport during lobby creation.

### TimeSlots Collection
*Separated from the Venue document to prevent unbounded array growth. Indexed for efficient querying of available slots by venue, pitch, sport, and date range.*

```json
{
  "_id": "ObjectId",
  "venueId": "ObjectId (Ref: Venue)",
  "pitchName": "String (matches a name in the Venue's pitches array)",
  "startTime": "Date (UTC)",
  "endTime": "Date (UTC)",
  "timezone": "String (IANA, e.g., Asia/Dubai)",
  "status": "String (AVAILABLE, BOOKED, MAINTENANCE)",
  "bookedByLobbyId": "ObjectId (Ref: Match Lobby) [Optional]",
  "bookedByUserId": "ObjectId (Ref: User) [Optional]",
  "createdAt": "Date"
}
```
**Indexes:**
- `{ venueId: 1, pitchName: 1, startTime: 1, status: 1 }` — primary query index for slot availability
- `{ status: 1, bookedByUserId: 1 }` — user's booking history

### Tournament Collection
*See Section 10 for full tournament architecture.*

```json
{
  "_id": "ObjectId",
  "venueId": "ObjectId (Ref: Venue)",
  "createdBy": "ObjectId (Ref: User)",
  "name": "String (e.g., Sunday 5-a-Side League)",
  "sport": "String",
  "matchFormat": "Number",
  "format": "String (SINGLE_ELIMINATION, DOUBLE_ELIMINATION, ROUND_ROBIN, GROUP_STAGE)",
  "maxTeams": "Number",
  "registeredSquads": ["ObjectId (Ref: Squad)"],
  "bracket": {},
  "status": "String (REGISTRATION_OPEN, IN_PROGRESS, COMPLETED, CANCELLED)",
  "startDate": "Date (UTC)",
  "endDate": "Date (UTC)",
  "timezone": "String (IANA)",
  "rules": "String (free-text rules and description)",
  "createdAt": "Date"
}
```
**Indexes:**
- `{ sport: 1, status: 1, startDate: 1 }` — tournament discovery
- `{ venueId: 1 }` — venue's tournaments

---

## 9. Supported Sports & Dynamic Configurations

TRIBE's robust `matchFormat` architecture is designed to accommodate the varied realities of recreational sports. The platform supports 9 primary sports, each with context-aware setup configurations controlled entirely by the host.

**Server-Side Validation:** A `sportConfig` map defines the allowed `matchFormat` values per sport. During lobby creation, the API validates that the submitted `matchFormat` falls within the allowed range or set for the selected sport. Attempts to create a lobby with an invalid format (e.g., a Tennis lobby with `matchFormat: 7`) return `400 Bad Request`. This validation cannot be bypassed by API clients — it is enforced server-side independent of any frontend checks.

```javascript
// Server-side sport configuration map
const sportConfig = {
  Football:    { type: "variable", min: 3, max: 11, label: "X-a-side" },
  Cricket:     { type: "variable", min: 5, max: 11, label: "X-a-side" },
  Basketball:  { type: "fixed-set", allowed: [1, 3, 5], labels: { 1: "1v1", 3: "3v3", 5: "5v5" } },
  Volleyball:  { type: "fixed-set", allowed: [2, 3, 4, 6], labels: { 2: "2v2 Beach", 6: "6v6" } },
  Padel:       { type: "fixed-set", allowed: [1, 2], labels: { 1: "Singles", 2: "Doubles" } },
  Tennis:      { type: "fixed-set", allowed: [1, 2], labels: { 1: "Singles", 2: "Doubles" } },
  Pickleball:  { type: "fixed-set", allowed: [1, 2], labels: { 1: "Singles", 2: "Doubles" } },
  Badminton:   { type: "fixed-set", allowed: [1, 2], labels: { 1: "Singles", 2: "Doubles" } },
  TableTennis: { type: "fixed-set", allowed: [1, 2], labels: { 1: "Singles", 2: "Doubles" } }
};
```

### 9.1 Variable Roster Sports (Fully Custom Limit)
For these sports, team sizes are highly subjective to the specific venue size and local community rules.
*   **Football / Futsal:** The host manually inputs the format. This can be any number within the allowed range (3 to 11)—whether it's an intimate 5-a-side game, an 8-a-side match, or a full 11-a-side pitch game. The host decides the exact cap.
*   **Cricket:** Similar to football, the user manually types in the format within the allowed range (5 to 11). It relies entirely on the host's discretion (e.g., standard 11-a-side, or a modified 8-a-side tape-ball match).

### 9.2 Traditional Court Sports (Fixed & Semi-Fixed Formats)
For court sports, the host selects from a standard set of universally recognized formats, preventing confusion:
*   **Padel:** Host selects either Singles (1v1) or Doubles (2v2).
*   **Tennis:** Host selects either Singles (1v1) or Doubles (2v2).
*   **Pickleball:** Host selects either Singles (1v1) or Doubles (2v2).
*   **Badminton:** Host selects either Singles (1v1) or Doubles (2v2).
*   **Table Tennis:** Host selects either Singles (1v1) or Doubles (2v2).

### 9.3 Variable Court Sports
*   **Basketball:** Host manually selects standard setups: 1v1, 3v3 (half-court), or 5v5 (full-court).
*   **Volleyball:** Host manually selects setups from 2v2 (beach format) up to standard 6v6 or relaxed rotational formats.

---

## 10. Tournament Architecture

Tournaments are a first-class feature enabling venues and admins to organize competitive multi-team events. Tournaments have their own dedicated pages, schema, and workflow — separate from regular lobby matchmaking.

### 10.1 Tournament Types & Formats
The tournament system supports flexible bracket structures:
*   **Single Elimination:** Teams are eliminated after one loss. Bracket auto-generates based on registered teams.
*   **Double Elimination:** Teams must lose twice to be eliminated. Winners and losers brackets run in parallel.
*   **Round Robin:** Every team plays every other team. Standings are computed from results.
*   **Group Stage + Knockout:** Teams are divided into groups for round-robin play. Top teams from each group advance to a single-elimination knockout phase.

### 10.2 Tournament Workflow
1.  **Creation:** A Venue Owner or Admin creates a tournament via `POST /api/tournaments`. They specify sport, match format, maximum teams, start/end dates, format (elimination/round-robin/etc.), and free-text rules.
2.  **Registration:** Squad Captains register their squad via `POST /api/tournaments/:id/register`. Registration is open until `maxTeams` is reached or the tournament organizer closes registration.
3.  **Bracket Generation:** Once registration closes, the tournament organizer triggers bracket generation. The system auto-generates the bracket structure based on the selected format and number of registered teams.
4.  **Match Scheduling:** Individual tournament matches are created as regular Match Lobbies linked to the tournament. Time slots are assigned from the venue's available inventory.
5.  **Result Recording:** After each match, the tournament organizer updates the bracket results via `PATCH /api/tournaments/:id/bracket`. The bracket advances automatically.
6.  **Completion:** When all matches are played, the tournament status transitions to `COMPLETED`. Final standings and results are preserved for history.

### 10.3 Tournament Page Blueprint
*   **Tournament Directory (`/tournaments`):** Top-level page listing upcoming tournaments. Filterable by sport, venue, date range, and registration status. Each card shows tournament name, sport, format, venue, dates, and spots remaining.
*   **Tournament Details (`/tournament/:id`):** Full tournament page showing description, rules, registered squads, bracket visualization (interactive bracket diagram), match schedule, and results. Squad Captains see a "Register" button if registration is open.

### 10.4 Flexibility Notes
*   The `bracket` field in the Tournament schema is **schema-less** (a plain Object) to accommodate the vastly different data structures required by different tournament formats (binary tree for elimination, matrix for round-robin, nested groups for group stages).
*   Tournament matches reuse the existing Match Lobby infrastructure — each tournament match is a regular lobby that happens to be linked to a tournament. This ensures all existing lobby features (chat, waitlists, ringer alerts) work within tournament contexts.
*   A venue's available time slots for tournament scheduling are queried from the same `TimeSlots` collection used for regular bookings, preventing double-booking.

---

## 11. Future Considerations (Not In Scope for V1)

The following features are acknowledged but intentionally deferred to keep the initial launch focused:
*   **In-App Payment Processing:** A potential Stripe/payment gateway integration for venue booking deposits, cancellation fees, or match entry fees. Not included in V1 — all financial transactions remain offline.
*   **Internationalization (i18n):** Multi-language support for the UI. V1 targets English only, but the architecture (externalized strings, timezone-aware dates) is designed to support future i18n.
*   **Native Mobile App:** V1 is a responsive web app. React Native or Flutter apps may follow based on user adoption metrics.
*   **AI-Powered Match Recommendations:** Using player history and preferences to suggest relevant lobbies. Deferred until sufficient usage data is collected.
