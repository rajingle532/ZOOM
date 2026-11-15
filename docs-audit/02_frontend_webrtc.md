# Technical Audit Report 02: Frontend Architecture & WebRTC Core Engine

> **Audit Date:** 2026-11-15  
> **Repository:** PulseMeet (WebRTC Video Conferencing Platform)  
> **Auditor:** Senior Full-Stack Systems Engineer  
> **Scope:** Sections D (Frontend Application Architecture) & E (WebRTC Deep Dive)  
> **Rule Compliance:** Read-Only audit. Verified line numbers, code snippets, and exact architectural mechanics.

---

## Executive Summary

The PulseMeet frontend is a React 18 single-page application built on top of Create React App (`react-scripts` 5.0.1) and React Router v6. It features 5 distinct page views, with `/home` and `/history` protected by a `withAuth` route guard, and `/:url` (`VideoMeet`) accessible without mandatory authentication to facilitate frictionless guest joining.

The WebRTC implementation operates on an unmanaged, full $N \times (N - 1)$ mesh topology. All signaling takes place over Socket.io, media tracks are managed via native browser APIs, and active speaker monitoring uses Web Audio API `AudioContext` and `AnalyserNode` frequency analysis. Media recording is executed on the client side via the `MediaRecorder` API.

---

## Section D: Frontend Architecture

### 1. Client Routing Table

Configured in [`frontend/src/App.js#L19-L28`](file:///d:/Desktop/ZOOM/frontend/src/App.js#L19-L28):

```
========================================================================================
PATH        COMPONENT             PROTECTION   HOC / GUARD     PURPOSE
========================================================================================
/           LandingPage           Public       None            Marketing & test launcher
/auth       Authentication        Public       None            Sign-in & sign-up forms
/home       HomeComponent         Protected    withAuth(Home)  Dashboard & meeting launcher
/history    History               Protected    withAuth(Hist)  User meeting history timeline
/:url       VideoMeetComponent    Public/Guest None            Lobby + In-Call WebRTC room
========================================================================================
```

---

### 2. Deep Component Analysis

#### A. Landing Page (`LandingPage`)
- **File:** [`frontend/src/pages/landing.jsx`](file:///d:/Desktop/ZOOM/frontend/src/pages/landing.jsx) (299 lines)
- **Purpose:** Public landing page featuring value proposition, zero-install branding, one-click guest join, and an interactive test room launcher.
- **Props:** None.
- **Local State:**
  - `testRoomCode`: Generated room code string via `useState(() => Math.random().toString(36).substring(2, 8))` ([`line 17`](file:///d:/Desktop/ZOOM/frontend/src/pages/landing.jsx#L17)).
  - `toastMessage` (string), `showToast` (boolean).
- **Hooks & Effects:** None (`useEffect` is not needed; static rendering).
- **API Calls:** None.
- **Socket Events:** None.
- **Child Components:** Material-UI `Button`, `TextField`, `Snackbar`, and MUI SVG icons.

#### B. Authentication Page (`Authentication`)
- **File:** [`frontend/src/pages/authentication.jsx`](file:///d:/Desktop/ZOOM/frontend/src/pages/authentication.jsx) (700 lines)
- **Purpose:** Linear/Vercel-grade split-screen authentication supporting login, registration, Caps Lock detection, password strength calculation, and an animated WebRTC hero preview.
- **Props:** None.
- **Local State:**
  - `username`, `password`, `confirmPassword`, `name` (form fields).
  - `showPassword` (boolean), `capsLockActive` (boolean).
  - `formState` (0 = Sign In, 1 = Create Account).
  - `error` (server message), `fieldErrors` (client validation dict), `message`, `open` (snackbar), `isLoading`, `shake` (spring animation trigger).
  - `recSeconds` (ticking elapsed time counter), `activeSpeakerIndex` (dynamic rotation 0-3), `isShortViewport` (boolean for `<860px` height).
- **Hooks & Effects:**
  - `useEffect([], [])` (`lines 45-53`): Listens for `window.innerHeight < 860` to adjust preview grid.
  - `useEffect([], [])` (`lines 56-61`): 1000ms interval incrementing `recSeconds`.
  - `useEffect([isShortViewport])` (`lines 64-69`): 4000ms interval rotating `activeSpeakerIndex`.
- **API Calls:**
  - `handleLogin(username, password)` via `AuthContext`.
  - `handleRegister(name, username, password)` via `AuthContext`.
- **Socket Events:** None (preview card is animated via React state and Framer Motion).
- **Child Components:** Framer Motion `motion.div`, `AnimatePresence`, Lucide React icons (`Lock`, `Zap`, `Video`, `Mic`, etc.), MUI `Snackbar`.

#### C. Home Dashboard (`HomeComponent`)
- **File:** [`frontend/src/pages/home.jsx`](file:///d:/Desktop/ZOOM/frontend/src/pages/home.jsx) (401 lines)
- **Purpose:** Protected dashboard for authenticated users. Provides one-click instant meeting creation, joining via room code or URL, and displaying recent meeting history.
- **Props:** Injected via `withAuth`.
- **Local State:**
  - `meetingCode` (string), `recentMeetings` (array), `toastMessage` (string), `showToast` (boolean).
- **Hooks & Effects:**
  - `useEffect([], [])` ([`lines 36-51`](file:///d:/Desktop/ZOOM/frontend/src/pages/home.jsx#L36-L51)): Calls `getHistoryOfUser()` on mount, slicing the top 4 entries for dashboard preview.
- **API Calls:**
  - `getHistoryOfUser()` -> `GET /api/v1/users/get_all_activity`.
  - `addToUserHistory(code)` -> `POST /api/v1/users/add_to_activity`.
- **Socket Events:** None.
- **Child Components:** MUI `Button`, `TextField`, `Avatar`, `Snackbar`, MUI icons.

#### D. Meeting History (`History`)
- **File:** [`frontend/src/pages/history.jsx`](file:///d:/Desktop/ZOOM/frontend/src/pages/history.jsx) (203 lines)
- **Purpose:** Displays a reverse-chronological list of all meetings recorded under the user's account with direct re-join links.
- **Props:** Injected via `withAuth`.
- **Local State:** `meetings` (array), `error` (string), `loading` (boolean).
- **Hooks & Effects:**
  - `useEffect([], [])` ([`lines 21-36`](file:///d:/Desktop/ZOOM/frontend/src/pages/history.jsx#L21-L36)): Fetches full history via `getHistoryOfUser()`.
- **API Calls:** `getHistoryOfUser()` -> `GET /api/v1/users/get_all_activity`.
- **Socket Events:** None.

#### E. Video Conference Core (`VideoMeetComponent`)
- **File:** [`frontend/src/pages/VideoMeet.jsx`](file:///d:/Desktop/ZOOM/frontend/src/pages/VideoMeet.jsx) (1,168 lines)
- **Purpose:** Dual-mode conference room containing both the Pre-Meeting Setup Lobby (device selection, audio sensitivity meter, display name) and the In-Call WebRTC room (mesh video grid, screen share, recording, floating reactions, hand raising, and chat drawer).
- **Props:** None (extracts room ID from `window.location.pathname`).
- **Local State (20+ states):**
  - Room Mode: `askForUsername` (boolean; `true` = Lobby, `false` = In-Call).
  - Media Controls: `video` (bool), `audio` (bool), `screen` (bool), `screenAvailable` (bool).
  - Remote Streams: `videos` (array of `{ socketId, stream, autoplay, playsinline }`).
  - Active Speaker: `isLocalSpeaking` (bool), `lobbyVolume` (number 0-100), `speakingPeers` (dict `{ [socketId]: bool }`).
  - Recording: `isRecording` (bool).
  - Reactions: `isHandRaised` (bool), `raisedHandUser` (string/null), `floatingReactions` (array), `reactionAnchorEl`.
  - Chat Drawer: `showModal` (bool), `messages` (array), `message` (string), `newMessages` (number).
  - User: `username` (string).
- **Refs:**
  - `socketRef`: Socket.io client instance.
  - `socketIdRef`: Local socket ID string.
  - `localVideoref`: HTML `<video>` element for local user in call.
  - `lobbyVideoref`: HTML `<video>` element for local user in lobby.
  - `localStreamRef`: Local `MediaStream` (camera + mic).
  - `screenStreamRef`: Screen capture `MediaStream`.
  - `mediaRecorderRef`: `MediaRecorder` instance.
  - `recordedChunksRef`: Array of recorded `Blob` data chunks.
  - `connections`: Object map `{ [socketId]: RTCPeerConnection }`.
- **Hooks & Effects:**
  1. `useEffect` (Mount/Unmount, [`lines 99-157`](file:///d:/Desktop/ZOOM/frontend/src/pages/VideoMeet.jsx#L99-L157)): Requests initial `getUserMedia({ video: true, audio: true })`. Cleans up tracks, connections, and sockets on unmount.
  2. `useEffect([audio, askForUsername])` ([`lines 160-210`](file:///d:/Desktop/ZOOM/frontend/src/pages/VideoMeet.jsx#L160-L210)): Creates local `AudioContext` and `AnalyserNode` to compute mic volume.
  3. `useEffect([videos])` ([`lines 213-262`](file:///d:/Desktop/ZOOM/frontend/src/pages/VideoMeet.jsx#L213-L262)): Creates `AudioContext` and `AnalyserNode` for each remote peer in `videos`.
- **API Calls:** None directly (history logging is done prior in `HomeComponent`).
- **Socket Events Emitted:** `join-call`, `signal`, `chat-message`, `send-reaction`, `raise-hand`.
- **Socket Events Listened:** `connect`, `signal`, `chat-message`, `user-reaction`, `user-raised-hand`, `user-joined`, `user-left`.

---

### 3. State Management & Authentication Flow

- **Approach:** Pure React Context (`AuthContext.jsx`) combined with local component state. No Redux, Zustand, or Recoil.
- **Persistence:**
  - `token`: Stored in `localStorage.getItem("token")`.
  - `user`: Serialized JSON in `localStorage.getItem("user")`.
- **Axios Request Interceptor:**
  ```javascript
  // frontend/src/contexts/AuthContext.jsx:9-20
  const client = axios.create({
      baseURL: `${server}/api/v1/users`
  });

  client.interceptors.request.use((config) => {
      const token = localStorage.getItem("token");
      if (token) {
          config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
  });
  ```
- **HOC Route Guard (`withAuth.jsx`):**
  Inspects `localStorage.getItem("token")`. If missing, immediately redirects to `/auth` using React Router's `useNavigate()`.

---

### 4. Styling System & Design Tokens

The application employs a **hybrid styling architecture** combining four distinct methodologies:

1. **Global CSS & Reset:**
   - [`frontend/src/index.css`](file:///d:/Desktop/ZOOM/frontend/src/index.css): Sets root clamp font scaling:
     ```css
     html {
       font-size: clamp(16px, 0.8333vw, 30px);
     }
     ```
   - Defines CSS custom properties (`--pm-bg: #111118`, `--pm-surface: #1c1c27`, `--pm-primary: #635bff`, `--pm-teal: #00d4aa`, etc.).
2. **CSS Modules:**
   - Scoped stylesheets: `auth.module.css` (842 lines), `videoComponent.module.css` (885 lines), `home.module.css` (363 lines), `landing.module.css` (364 lines).
3. **Material-UI System (`sx` props):**
   - Heavily utilized across components for button sizing, typography, border radiuses, and color overrides.
4. **Framer Motion Inline Styles:**
   - Animated elements in `authentication.jsx`.

#### Breakpoints Configured
- `@media (max-width: 1279px)`: Hides satellite chips on auth showcase.
- `@media (max-width: 1023px)`: Collapses 50/50 split on auth page to form-only; collapses desktop navbar.
- `@media (max-width: 899px)`: Stacks 2-column lobby into a single column.
- `@media (max-height: 859px)`: Switches auth preview card from 2x2 grid to 1x2 row.
- `@media (max-width: 768px)`: Stacks action cards on Home page.
- `@media (max-width: 500px)`: Mobile padding adjustments.

---

### 5. Accessibility Audit

| Area | Status | Findings |
| :--- | :--- | :--- |
| **Form Inputs** | **GOOD** | Auth and lobby inputs contain explicit `id`, `htmlFor`, and placeholder attributes. Password toggle includes `aria-label="Toggle password visibility"`. |
| **Error Feedback** | **GOOD** | Server error banner implements `role="alert"` and `aria-live="polite"`. |
| **Keyboard Navigation** | **PARTIAL** | Enter key submits auth, sends chat messages, and enters the room from the lobby. However, dock icon buttons lack accessible visible focus rings (`:focus-visible`). |
| **Color Contrast** | **WARNING** | Certain muted labels (`#6c6c80` on `#111118`) yield a contrast ratio of ~3.2:1, falling short of WCAG AA standard (4.5:1) for body text. |
| **Screen Reader Call State** | **POOR** | Joining/leaving participants, active speaker switches, and floating emoji reactions are purely visual with zero ARIA live region announcements. |

---

## Section E: WebRTC Core Engine

### 1. PeerConnection Configuration & STUN/TURN Setup

Defined in [`frontend/src/pages/VideoMeet.jsx#L37-L42`](file:///d:/Desktop/ZOOM/frontend/src/pages/VideoMeet.jsx#L37-L42):

```javascript
const peerConfigConnections = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
    ]
};
```

- **STUN Servers:** Public Google STUN endpoints.
- **TURN Relay Servers:** **NOT FOUND**. No credentials or TURN endpoints configured.
- **Architectural Consequence:** Clients located behind symmetric NAT routers (standard on corporate VPNs, university dorms, cellular 4G/5G, and enterprise firewalls) **cannot connect**. ICE gathering will fail to discover a relay candidate, causing media negotiation to timeout.

---

### 2. Connection Handshake & Signaling Lifecycle

```
========================================================================================
STEP  ACTION                 PAYLOAD / LOGIC
========================================================================================
1.    Local User Joins       socket.emit('join-call', roomCode)
2.    Server Broadcast       io.to(roomCode).emit('user-joined', newSocketId, clientsList)
3.    Peer Creation          Every client creates new RTCPeerConnection(peerConfigConnections)
4.    Track Addition         localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, stream))
5.    Offer Initiation       Newly joined peer (id === socket.id) initiates pc.createOffer()
6.    SDP Exchange           Offer relayed via socket.emit('signal', targetId, { sdp: offer })
7.    Answer Formulation     Remote peer receives offer -> pc.setRemoteDescription() -> 
                             pc.createAnswer() -> pc.setLocalDescription() -> emits answer
8.    ICE Trickle            pc.onicecandidate emits { ice: candidate } -> remote pc.addIceCandidate()
9.    Media Rendering        pc.ontrack fires -> remote stream appended to videos state array
========================================================================================
```

#### Detailed Signaling Code Snippets

```javascript
// frontend/src/pages/VideoMeet.jsx:344-389
socketRef.current.on('user-joined', (id, clients) => {
    clients.forEach((socketListId) => {
        if (connections.current[socketListId]) return;

        const pc = new RTCPeerConnection(peerConfigConnections);
        connections.current[socketListId] = pc;

        pc.onicecandidate = (event) => {
            if (event.candidate != null) {
                socketRef.current.emit(
                    'signal',
                    socketListId,
                    JSON.stringify({ ice: event.candidate })
                );
            }
        };

        pc.ontrack = (event) => {
            const remoteStream = event.streams[0];
            if (!remoteStream) return;

            setVideos((prev) => {
                const exists = prev.find((v) => v.socketId === socketListId);
                if (exists) {
                    return prev.map((v) =>
                        v.socketId === socketListId ? { ...v, stream: remoteStream } : v
                    );
                }
                return [
                    ...prev,
                    { socketId: socketListId, stream: remoteStream, autoplay: true, playsinline: true }
                ];
            });
        };

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current);
            });
        }
    });

    // Only the newly joined peer initiates offers to existing peers
    if (id === socketIdRef.current) {
        for (let peerId in connections.current) {
            if (peerId === socketIdRef.current) continue;
            const pc = connections.current[peerId];
            pc.createOffer()
                .then((description) => pc.setLocalDescription(description))
                .then(() => {
                    socketRef.current.emit(
                        'signal',
                        peerId,
                        JSON.stringify({ sdp: pc.localDescription })
                    );
                })
                .catch((e) => console.error("Error creating WebRTC offer:", e));
        }
    }
});
```

#### Glare & Collision Handling
- **Status:** **NOT FOUND**.
- **Analysis:** Standard WebRTC specification recommends the "Perfect Negotiation" pattern (using `makingOffer`, `ignoreOffer`, and signaling state rollback). In this implementation, if two peers send offers simultaneously or if network latency delays signaling, glare occurs, resulting in `InvalidStateError: Cannot set remote offer in state have-local-offer`.

---

### 3. Media Stream Storage & Track Muting Mechanics

- **Local Stream:** Kept in `localStreamRef.current`. Attached to `<video>` elements via DOM `ref.srcObject = localStreamRef.current`.
- **Remote Streams:** Stored in React component state `videos` as an array of objects.
- **Camera Toggle (`handleVideo`):**
  ```javascript
  // frontend/src/pages/VideoMeet.jsx:503-511
  const handleVideo = () => {
      if (localStreamRef.current) {
          const videoTrack = localStreamRef.current.getVideoTracks()[0];
          if (videoTrack) {
              videoTrack.enabled = !videoTrack.enabled;
              setVideo(videoTrack.enabled);
          }
      }
  };
  ```
  *Analysis:* Tracks are **not** stopped or removed from the peer connection; `track.enabled` is simply toggled false. The browser transmits black frames with zero frame rate, preserving the WebRTC connection without triggering SDP renegotiation.
- **Microphone Toggle (`handleAudio`):**
  Toggles `audioTrack.enabled = !audioTrack.enabled`. Transmits silence packets without breaking the connection.

---

### 4. Dynamic Screen Sharing Implementation

Defined in [`frontend/src/pages/VideoMeet.jsx#L524-L577`](file:///d:/Desktop/ZOOM/frontend/src/pages/VideoMeet.jsx#L524-L577):

```javascript
// frontend/src/pages/VideoMeet.jsx:524-547
const handleScreen = async () => {
    if (!screen) {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            const screenTrack = screenStream.getVideoTracks()[0];
            screenStreamRef.current = screenStream;

            for (let peerId in connections.current) {
                const pc = connections.current[peerId];
                const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
                if (sender) {
                    sender.replaceTrack(screenTrack);
                }
            }

            if (localVideoref.current) {
                localVideoref.current.srcObject = screenStream;
            }

            // Handles user clicking browser native "Stop Sharing" floating pill
            screenTrack.onended = () => {
                stopScreenShare();
            };

            setScreen(true);
        } catch (err) {
            console.error("Screen share cancelled or failed:", err);
        }
    } else {
        stopScreenShare();
    }
};
```

- **Reversion:** When `stopScreenShare()` executes, it iterates through all `RTCRtpSender` objects and swaps back `sender.replaceTrack(cameraTrack)` without requiring a full SDP renegotiation cycle.

---

### 5. Active Speaker Detection (Web Audio API)

- **Local Detection:**
  - Creates `AudioContext` and `AnalyserNode` (`fftSize = 256`).
  - Loops via `requestAnimationFrame`. Computes average frequency energy across 128 frequency bins.
  - Threshold: `avg > 18` sets `isLocalSpeaking(true)` ([`line 193`](file:///d:/Desktop/ZOOM/frontend/src/pages/VideoMeet.jsx#L193)).
  - Closes `audioContext` cleanly in cleanup callback.
- **Remote Peer Detection (Resource Bottleneck):**
  - In `useEffect([videos])` ([`lines 213-262`](file:///d:/Desktop/ZOOM/frontend/src/pages/VideoMeet.jsx#L213-L262)), a **new `AudioContext` is instantiated for every peer**.
  - **Critical Browser Limit:** Browsers enforce a strict cap on active `AudioContext` instances (typically **6 instances max** in Chromium). Once the 6th or 7th peer joins, `new AudioCtx()` throws an unhandled error, breaking audio detection for all subsequent peers.
  - **Recommended Solution:** A single master `AudioContext` must be shared across all audio sources.

---

### 6. Local Call Recording

Defined in [`frontend/src/pages/VideoMeet.jsx#L412-L470`](file:///d:/Desktop/ZOOM/frontend/src/pages/VideoMeet.jsx#L412-L470):

- **Stream Captured:** `screenStreamRef.current || localStreamRef.current`.
- **Mime Type:** `video/webm;codecs=vp9,opus` with fallback to `video/webm`.
- **Chunk Size:** Recorded in 1000ms timeslices (`recorder.start(1000)`).
- **Download Handler:** On `stop`, aggregates chunks into a `Blob`, creates an object URL, and triggers an anchor tag download:
  `pulse-meet-recording-YYYY-MM-DD-HH-mm-ss.webm`.
- **Limitation:** **Does NOT record remote participants.** Only the local presenter's video/screen and local mic audio are captured. Remote audio and remote video streams are excluded.

---

### 7. Teardown, Cleanup & Reconnection

- **Cleanup on Leave (`handleEndCall`):**
  1. Stops `mediaRecorderRef.current`.
  2. Stops all tracks in `localStreamRef.current` and `screenStreamRef.current`.
  3. Iterates through `connections.current` and invokes `pc.close()`.
  4. Disconnects `socketRef.current`.
  5. Redirects to `/` via `window.location.href`.
- **Reconnection on Network Drop:**
  - **Status:** **NOT FOUND**.
  - If a user's WiFi drops or reconnects, Socket.io will re-establish a connection with a *new socket ID*. Because room state is not reconciled, the existing peer connections become orphaned (`ICEConnectionState: disconnected/failed`). No automatic ICE restart (`pc.restartIce()`) is implemented.

---

### 8. Mesh Scalability & Performance Limits

PulseMeet uses a **Full Mesh Topology**:
- Every client maintains $N - 1$ peer connections.
- Number of peer connections in room: $\frac{N(N - 1)}{2}$.
- Number of media streams sent by each client: $N - 1$.
- Total media streams across room: $N(N - 1)$ ($O(N^2)$ complexity).

```
========================================================================================
PEERS (N)  CONNECTIONS PER PEER  TOTAL ROOM STREAMS  EST. CLIENT UPSTREAM (720p@1.5Mbps)
========================================================================================
2          1                     2                   1.5 Mbps
4          3                     12                  4.5 Mbps
6          5                     30                  7.5 Mbps (CPU/uplink choke point)
8          7                     56                  10.5 Mbps (severe packet loss)
10         9                     90                  13.5 Mbps (unusable in mesh)
========================================================================================
```

**What Breaks First:**
1. **Client Upstream Bandwidth:** Residential upload speeds saturate, leading to severe packet loss and WebRTC freezing.
2. **Client CPU Video Encoding:** Encoding 5 simultaneous video streams triggers CPU throttling and high fan noise.
3. **AudioContext Exhaustion:** Exceeding 6 remote audio contexts throws browser runtime exceptions.

