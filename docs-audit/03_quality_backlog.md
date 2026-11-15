# Technical Audit Report 03: Security, Quality & Improvement Backlog

> **Audit Date:** 2026-11-15  
> **Repository:** PulseMeet (WebRTC Video Conferencing Platform)  
> **Auditor:** Senior Full-Stack Systems Engineer  
> **Scope:** Sections F (Security, Performance & Code Quality) & G (Ranked Improvement Backlog)  
> **Stack Constraints:** Fixed Stack (React 18, Node/Express, Socket.io, MongoDB/Mongoose, JWT, bcrypt, MUI, native WebRTC).

---

## Executive Summary

While the application features responsive modern front-facing UI and core WebRTC track streaming, the technical audit revealed several high-severity security vulnerabilities and reliability issues that must be resolved before production deployment. Key vulnerabilities include hardcoded fallback JWT secrets in source code, unauthenticated Socket.io connections, completely unrestricted CORS policies, the absence of HTTP rate limiting or security headers (Helmet), and multiple simultaneous `AudioContext` allocations.

The improvement backlog provides 28 concrete, prioritized engineering tasks that preserve the existing stack while hardening security, stabilizing peer connections, and improving UX.

---

## Section F: Quality, Security & Performance Audit

### 1. Security Findings Ranked by Severity

```
========================================================================================
SEVERITY  VULNERABILITY TITLE                              FILE & LINE LOCATION
========================================================================================
HIGH      Hardcoded Fallback JWT Secret in Source Code     backend/src/controllers/user.controller.js:7
                                                           backend/src/middlewares/auth.middleware.js:22
HIGH      Unauthenticated Socket.io Connections            backend/src/controllers/socketManager.js:23
HIGH      No Rate Limiting on Auth Endpoints (Brute Force) backend/src/app.js:20
HIGH      Wide-Open CORS Configuration (origin: "*")       backend/src/app.js:16
                                                           backend/src/controllers/socketManager.js:5-10
MEDIUM    JWT Token Stored in Insecure localStorage        frontend/src/contexts/AuthContext.jsx:56
MEDIUM    Missing Strict Input Validation (No Joi/Zod)     backend/src/controllers/user.controller.js:9,66
MEDIUM    Open Room Traversal (No Room Passwords or Auth)  backend/src/controllers/socketManager.js:26
MEDIUM    Missing Security Response Headers (No Helmet)    backend/src/app.js:10-19
LOW       Unsanitized Chat Input Relayed over Sockets      backend/src/controllers/socketManager.js:45
LOW       User Token Stored in Plaintext on User Schema    backend/src/models/user.model.js:8
LOW       No Express Centralized Error Handling Envelope   backend/src/app.js:20-25
========================================================================================
```

#### Detailed Security Analysis

1. **Hardcoded Fallback JWT Secret (CRITICAL / HIGH)**
   - **Location:** [`backend/src/controllers/user.controller.js#L7`](file:///d:/Desktop/ZOOM/backend/src/controllers/user.controller.js#L7) and [`backend/src/middlewares/auth.middleware.js#L22`](file:///d:/Desktop/ZOOM/backend/src/middlewares/auth.middleware.js#L22)
   - **Code:**
     ```javascript
     const JWT_SECRET = process.env.JWT_SECRET || "***";
     ```
   - **Risk:** If the server is deployed to an environment where `JWT_SECRET` is omitted or fails to load, the system falls back to a publicly visible string. Anyone with knowledge of this repository can forge administrative JWTs and impersonate any user.
   - **Remediation:** Throw an immediate process crash on server initialization if `process.env.JWT_SECRET` is undefined (`if (!process.env.JWT_SECRET) throw new Error(...)`).

2. **Unauthenticated Socket.io Connections & Open Rooms (HIGH)**
   - **Location:** [`backend/src/controllers/socketManager.js#L23`](file:///d:/Desktop/ZOOM/backend/src/controllers/socketManager.js#L23)
   - **Risk:** The Socket.io server does not authenticate handshakes (`io.use()` middleware is missing). Any external actor can connect via WebSocket, emit `join-call` into any meeting code, eavesdrop on chat messages, send spoofed reactions, or intercept signaling metadata.
   - **Remediation:** Implement socket handshake validation for authenticated users, and attach a cryptographic room access token or host approval queue (waiting room) for guests.

3. **Missing Rate Limiting (HIGH)**
   - **Location:** [`backend/src/app.js#L20`](file:///d:/Desktop/ZOOM/backend/src/app.js#L20)
   - **Risk:** The `/api/v1/users/login` and `/api/v1/users/register` endpoints have no rate limiting. Attackers can execute automated dictionary or credential stuffing attacks against user accounts without restriction.
   - **Remediation:** Introduce `express-rate-limit` (e.g., max 10 auth requests per 15-minute window per IP).

4. **Permissive CORS Configuration (HIGH)**
   - **Location:** [`backend/src/app.js#L16`](file:///d:/Desktop/ZOOM/backend/src/app.js#L16) and [`backend/src/controllers/socketManager.js#L5-L10`](file:///d:/Desktop/ZOOM/backend/src/controllers/socketManager.js#L5-L10)
   - **Code:** `app.use(cors());` and `io = new Server(server, { cors: { origin: "*" } });`
   - **Risk:** Any malicious third-party site loaded in an authenticated user's browser can make cross-origin requests or open socket tunnels to the backend.
   - **Remediation:** Restrict allowed origins to designated client URLs specified in environment variables (`process.env.CLIENT_URL`).

5. **Token Storage in `localStorage` (MEDIUM)**
   - **Location:** [`frontend/src/contexts/AuthContext.jsx#L56`](file:///d:/Desktop/ZOOM/frontend/src/contexts/AuthContext.jsx#L56)
   - **Risk:** Storing JWTs in `localStorage` makes them susceptible to extraction via Cross-Site Scripting (XSS).
   - **Remediation:** Move JWTs to `httpOnly`, `Secure`, `SameSite=Strict` cookies issued by Express upon authentication.

6. **Missing Helmet Security Headers (MEDIUM)**
   - **Location:** [`backend/src/app.js`](file:///d:/Desktop/ZOOM/backend/src/app.js)
   - **Risk:** The server sends default Express headers (including `X-Powered-By: Express`), lacking `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, and `Strict-Transport-Security`.
   - **Remediation:** Add `helmet` middleware.

---

### 2. Performance & Resource Bottlenecks

1. **Multiple `AudioContext` Instance Exhaustion**
   - **Location:** [`frontend/src/pages/VideoMeet.jsx#L225`](file:///d:/Desktop/ZOOM/frontend/src/pages/VideoMeet.jsx#L225)
   - **Issue:** Inside `useEffect([videos])`, the component instantiates `new AudioCtx()` for *every* remote peer.
   - **Impact:** Chromium-based browsers enforce an internal limit of 6 hardware audio contexts. In meetings with 6+ participants, this throws `DOMException: The number of hardware contexts, provided by the platform, is limited.` and terminates speaker detection.
   - **Fix:** Create a single shared `AudioContext` on mount, routing each remote peer stream through individual `createMediaStreamSource()` nodes connected to dedicated `AnalyserNode` instances.

2. **Full Re-renders of Video Grid on Any State Change**
   - **Location:** [`frontend/src/pages/VideoMeet.jsx#L937-L1039`](file:///d:/Desktop/ZOOM/frontend/src/pages/VideoMeet.jsx#L937-L1039)
   - **Issue:** The local video tile and all remote video tiles are rendered inline inside `VideoMeet.jsx` without React memoization (`React.memo`).
   - **Impact:** Every second, when the chat clock updates, an emoji reaction floats, or `isLocalSpeaking` toggles, the entire 1,168-line component and all `<video>` DOM nodes re-render.
   - **Fix:** Extract `<VideoTile />` into a standalone memoized subcomponent.

3. **$O(N^2)$ Mesh Scalability Choke**
   - **Location:** [`frontend/src/pages/VideoMeet.jsx#L345-L389`](file:///d:/Desktop/ZOOM/frontend/src/pages/VideoMeet.jsx#L345-L389)
   - **Impact:** Full mesh topology requires every user to encode and upload distinct video streams to every other participant. Beyond 4 to 6 peers, residential upload speeds choke, leading to dropped frames, audio desync, and runaway CPU fan utilization.

---

### 3. Bugs, Race Conditions & Dead Code

1. **Signaling Offer/Answer Glare Collision:**
   - In [`VideoMeet.jsx#L391-L406`](file:///d:/Desktop/ZOOM/frontend/src/pages/VideoMeet.jsx#L391-L406), newly joined peers immediately emit offers to all known clients. If two peers join simultaneously, or if network packets interleave, both peers emit offers to each other simultaneously. Without Perfect Negotiation (`pc.signalingState` check + rollback), the peer connection enters an unrecoverable state.
2. **Missing ICE Candidate Queueing:**
   - In [`VideoMeet.jsx#L296-L299`](file:///d:/Desktop/ZOOM/frontend/src/pages/VideoMeet.jsx#L296-L299), incoming ICE candidates are applied immediately: `pc.addIceCandidate(new RTCIceCandidate(signal.ice))`. If an ICE candidate arrives over Socket.io *before* `pc.setRemoteDescription()` completes, `addIceCandidate()` throws an exception and the candidate is permanently dropped.
3. **Dead / Redundant Package:**
   - `crypto` is declared in `backend/package.json` but is never imported or utilized.
4. **Monolithic Component Size:**
   - [`VideoMeet.jsx`](file:///d:/Desktop/ZOOM/frontend/src/pages/VideoMeet.jsx) is 1,168 lines long and conflates device selection, pre-call lobby, WebRTC peer signaling, audio spectrum analysis, screen capture, canvas recording, floating reactions, chat drawer, and meeting UI into a single file.

---

### 4. Tests, Linting, Formatting & CI Status

- **Unit / Integration Tests:**
  - Frontend: Only 1 basic test exists ([`frontend/src/App.test.js`](file:///d:/Desktop/ZOOM/frontend/src/App.test.js)), verifying whether `<App />` mounts without crashing.
  - Backend: **0 tests**. No test framework (Jest/Mocha/Vitest), supertest, or test script configured in `backend/package.json`.
- **Linting & Code Formatting:**
  - Frontend inherits default `eslint-config-react-app`.
  - Backend has no ESLint configuration, Prettier configuration, or `.editorconfig`.
- **Continuous Integration (CI):**
  - **NOT FOUND**. No `.github/workflows/`, GitLab CI, or build automation pipelines.

---

## Section G: Prioritized Improvement Backlog

*All recommendations strictly operate within the existing stack: React 18, Node/Express, Socket.io, MongoDB/Mongoose, JWT, bcrypt, MUI, and native WebRTC.*

### 1. Master Improvement Backlog (28 Items)

| # | Priority | Title | Category | Impact | Effort | Files Involved | Description |
| :- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | **Top 10** | Remove Hardcoded JWT Fallback Secret | Security | **HIGH** | **S** | `backend/src/controllers/user.controller.js`<br>`backend/src/middlewares/auth.middleware.js` | Crash server on startup if `process.env.JWT_SECRET` is unset; remove static fallback string. |
| **02** | **Top 10** | Implement Perfect Negotiation in WebRTC | Reliability | **HIGH** | **M** | `frontend/src/pages/VideoMeet.jsx` | Add `makingOffer`, `ignoreOffer`, and signaling rollback to eliminate offer/answer collisions. |
| **03** | **Top 10** | Queue Early ICE Candidates | Reliability | **HIGH** | **S** | `frontend/src/pages/VideoMeet.jsx` | Buffer incoming ICE candidates until `remoteDescription` is set to prevent dropped candidates. |
| **04** | **Top 10** | Singleton AudioContext for Speaker Detection | Performance | **HIGH** | **S** | `frontend/src/pages/VideoMeet.jsx` | Replace multi-instance `AudioContext` with one shared context to fix browser 6-context ceiling. |
| **05** | **Top 10** | Rate Limit Auth Endpoints | Security | **HIGH** | **S** | `backend/src/app.js`<br>`backend/package.json` | Add `express-rate-limit` to `/login` and `/register` to stop brute-force attacks. |
| **06** | **Top 10** | Add Security Headers with Helmet | Security | **MEDIUM** | **S** | `backend/src/app.js`<br>`backend/package.json` | Mount `helmet` middleware to set CSP, HSTS, and X-Content-Type headers. |
| **07** | **Top 10** | Restrict CORS to Configured Domains | Security | **HIGH** | **S** | `backend/src/app.js`<br>`backend/src/controllers/socketManager.js` | Replace `origin: "*"` with dynamic whitelist read from `process.env.ALLOWED_ORIGINS`. |
| **08** | **Top 10** | Input Validation via Joi/Zod | Security | **HIGH** | **M** | `backend/src/controllers/user.controller.js` | Validate username format, name length, and password complexity (min 8 chars, 1 number, 1 special). |
| **09** | **Top 10** | Extract & Memoize `<VideoTile />` Component | Performance | **HIGH** | **M** | `frontend/src/pages/VideoMeet.jsx`<br>`frontend/src/components/VideoTile.jsx` | Wrap video elements in `React.memo` to eliminate constant re-renders during speech or chat updates. |
| **10** | **Top 10** | Composite Multi-Peer Audio Recording | Feature | **HIGH** | **M** | `frontend/src/pages/VideoMeet.jsx` | Mix local mic track and all remote audio tracks into one `MediaStreamDestination` for recording. |
| **11** | Backlog | Socket.io Connection Authentication | Security | **HIGH** | **M** | `backend/src/controllers/socketManager.js` | Validate JWT in socket `io.use()` handshake; associate verified user data with socket. |
| **12** | Backlog | Compound Index on Meeting History Collection | Performance | **MEDIUM** | **S** | `backend/src/models/meeting.model.js` | Add `meetingSchema.index({ user_id: 1, date: -1 })` to accelerate history queries. |
| **13** | Backlog | Split VideoMeet into Lobby and Conference Views | Architecture | **MEDIUM** | **L** | `frontend/src/pages/VideoMeet.jsx`<br>`frontend/src/components/Lobby.jsx`<br>`frontend/src/components/Conference.jsx` | Break monolithic 1,168-line file into distinct, clean subcomponents. |
| **14** | Backlog | Automated ICE Restart on Connection Disconnect | Reliability | **HIGH** | **M** | `frontend/src/pages/VideoMeet.jsx` | Listen for `pc.onconnectionstatechange === "failed"` and execute `pc.restartIce()`. |
| **15** | Backlog | Add TURN Server Fallback (e.g. Free Coturn/Metered) | Reliability | **HIGH** | **M** | `frontend/src/pages/VideoMeet.jsx` | Add STUN/TURN configuration to allow connection through symmetric NATs and corporate firewalls. |
| **16** | Backlog | Remove Deprecated Backend `crypto` Package | Maintenance | **LOW** | **S** | `backend/package.json` | Run `npm rm crypto` on backend. |
| **17** | Backlog | Centralized Express Error Handling Middleware | Reliability | **MEDIUM** | **S** | `backend/src/app.js`<br>`backend/src/middlewares/error.middleware.js` | Implement `(err, req, res, next)` returning structured `{ error: { code, message } }` JSON. |
| **18** | Backlog | Move JWT to `httpOnly` Cookies | Security | **MEDIUM** | **M** | `backend/src/controllers/user.controller.js`<br>`frontend/src/contexts/AuthContext.jsx` | Eliminate `localStorage` XSS risk by transitioning auth token to secure cookies. |
| **19** | Backlog | In-Call Participant Count & Peer Roster Drawer | UX | **MEDIUM** | **S** | `frontend/src/pages/VideoMeet.jsx` | Add a side panel showing all connected participants with mute badges and hand-raised order. |
| **20** | Backlog | Network Quality & Ping Indicator per Peer | UX | **MEDIUM** | **M** | `frontend/src/pages/VideoMeet.jsx` | Poll `pc.getStats()` periodically for RTT and packet loss, rendering a 3-bar signal icon. |
| **21** | Backlog | Keyboard Accessibility Shortcuts (Space/M to Mute) | Accessibility| **MEDIUM** | **S** | `frontend/src/pages/VideoMeet.jsx` | Add global keyboard listener for `M` (toggle audio) and `V` (toggle video). |
| **22** | Backlog | Screen Reader Live Region for Call Events | Accessibility| **MEDIUM** | **S** | `frontend/src/pages/VideoMeet.jsx` | Add `<div aria-live="polite" className="sr-only">` announcing joins, leaves, and hand raises. |
| **23** | Backlog | Dockerize Full Stack (Dockerfile + docker-compose) | DevOps | **MEDIUM** | **M** | `Dockerfile`<br>`docker-compose.yml` | Create standard multi-stage build container for production deployment. |
| **24** | Backlog | Add GitHub Actions CI Pipeline | DevOps | **MEDIUM** | **S** | `.github/workflows/ci.yml` | Run lint checks and build verification on every pull request. |
| **25** | Backlog | Structured Backend Logging with Pino | Reliability | **LOW** | **S** | `backend/src/app.js` | Replace unstructured `console.log` with fast JSON logging. |
| **26** | Backlog | Device Selector Dropdowns in Lobby | UX | **MEDIUM** | **M** | `frontend/src/pages/VideoMeet.jsx` | Use `navigator.mediaDevices.enumerateDevices()` to allow selecting specific camera/mic inputs. |
| **27** | Backlog | Chat Sound Notification & Unread Counter | UX | **LOW** | **S** | `frontend/src/pages/VideoMeet.jsx` | Play a soft ping sound when a message arrives while the chat drawer is closed. |
| **28** | Backlog | Express Request Payload Compression | Performance | **LOW** | **S** | `backend/src/app.js`<br>`backend/package.json` | Add `compression` middleware to gzip static responses. |

---

### 2. Top 10 "Do First" Implementations

These 10 tasks resolve all critical security gaps, prevent WebRTC handshake crashes, and eliminate browser resource exhaustion:

1. **Item 01: Remove Hardcoded JWT Fallback Secret** — Blocks administrative credential forgery.
2. **Item 07: Restrict CORS to Specified Domains** — Prevents cross-origin socket and API hijacking.
3. **Item 05: Rate Limit Auth Endpoints** — Prevents automated credential stuffing and server denial-of-service.
4. **Item 04: Singleton AudioContext for Speaker Detection** — Resolves browser hard limit crashing 6+ participant calls.
5. **Item 03: Queue Early ICE Candidates** — Guarantees WebRTC media connects reliably under network latency.
6. **Item 02: Implement Perfect Negotiation in WebRTC** — Fixes race condition glare when peers join simultaneously.
7. **Item 08: Input Validation with Joi/Zod** — Enforces secure passwords and eliminates malformed DB documents.
8. **Item 06: Mount Helmet Security Headers** — Protects against clickjacking, MIME-sniffing, and XSS framing.
9. **Item 10: Composite Multi-Peer Audio Recording** — Ensures recorded WebM files contain all participants' voices, not just local presenter.
10. **Item 09: Extract & Memoize `<VideoTile />`** — Reduces UI thread jank by stopping unnecessary re-renders of the video grid.

---

### 3. Quick Wins (< 30 Minutes Each)

The following 8 improvements require minimal code changes and can be completed in under 30 minutes each:

1. **Purge Dummy `crypto` Package:**
   - Execute `npm rm crypto` in `/backend` to eliminate redundant dependency.
2. **Crash Server on Missing `JWT_SECRET`:**
   - Add 3 lines in `backend/src/app.js`:
     ```javascript
     if (!process.env.JWT_SECRET) {
         throw new Error("FATAL: JWT_SECRET environment variable is missing.");
     }
     ```
3. **Add Compound Database Index for History:**
   - Add `meetingSchema.index({ user_id: 1, date: -1 });` in `backend/src/models/meeting.model.js`.
4. **Install & Mount `helmet`:**
   - Run `npm i helmet` in `/backend` and add `app.use(helmet());` in `backend/src/app.js`.
5. **Add Global Enter/Space Shortcut for Mute:**
   - Add `window.addEventListener('keydown', (e) => { if (e.key === 'm' && !inChat) handleAudio(); })` in `VideoMeet.jsx`.
6. **Clean Up `console.log` in Socket Manager:**
   - Replace chat message logging (`console.log('[Chat] Room ...')`) to prevent sensitive chat messages from being written to plain server logs.
7. **Add MongoDB Connection Retry Loop:**
   - Wrap `mongoose.connect()` in an exponential backoff loop so backend survives brief database connection drops.
8. **Fix Audio Sensitivity Equalizer Normalization:**
   - In `VideoMeet.jsx#L194`, adjust `Math.min(100, Math.round((avg / 42) * 100))` with a floor clamp (`Math.max(0, ...)`) to avoid negative calculation artifacts.

