# Remaster Phase R3 — Live Class Room (Durable Object + YouTube Live Unlisted)

> **Phase:** R3 (after R2; assumes the video provider router exists).
> **Theme:** First-class live class experience — pre-join lobby, in-app room with chat / raise-hand / reactions / attendance, **YouTube Unlisted Live as the $0 broadcast transport** (the DO still owns presence, raise-hand, attendance, Q&A, replay metadata), and replay via YouTube's auto-generated VOD.
> **Cost commitment:** **$0 paid.** YouTube Unlisted Live + Unlisted chat + VOD replay = free transport. The DO + R2 are the only infra we pay nothing for (free tiers). No WebRTC mesh required for >99% of cases.

Read `AGENTS.md`, `docs/MASTER_ROADMAP.md`, `docs/MASTER_REMASTER.md`, and [`FREE-TIER-REFERENCE.md`](./FREE-TIER-REFERENCE.md) first (especially §18b — YouTube as a free video backend).

---

## 1. Objectives

1. Stand up a **Durable Object** `ClassroomRoom` per `classSessionId` — authoritative state for presence, chat, raise-hand, reactions, attendance, and YouTube Live link metadata.
2. **YouTube Live Unlisted as the video stage**: when the teacher starts the class, the teacher's UI prompts them to "Start YouTube Live — Unlisted" (or paste the YouTube Live URL). The DO receives the `youtubeLiveVideoId` and broadcasts it to all joined students. The student's in-app "stage" is a `youtube-nocookie.com` embed of that unlisted stream. **Zero bandwidth cost to us.**
3. **In-app chat / raise-hand / Q&A** still flow through the DO WebSocket — independent of YouTube. The YouTube Live Chat iframe is **hidden** behind our UI so moderation stays in our hands.
4. **Attendance** captured server-side from WebSocket join/leave events; writes to `class_attendance` at session end.
5. **Recording / replay**: YouTube auto-archives unlisted live streams as unlisted VODs. After the stream ends, the teacher pastes the resulting YouTube VOD URL (or the system extracts it automatically from the same video id — YouTube reuses the live video id for the VOD). Replays live on the same replay page with our chat transcript overlay.
6. **Pre-join lobby**, **in-room UI** (split: stage + side rail for chat/Q&A/reactions), **post-class replay page** reusing the YouTube embed.
7. **Schedule** improvements: weekly routine view for student/teacher, iCal export of personal schedule, 15-min pre-class notification (queued via R0's NOTIFICATIONS_QUEUE, **email-delivered via Cloudflare Email Service** — free).

---

## 2. Data Model Changes

### Migration `0003_remaster_r3_live_class.sql`

```sql
-- Class sessions get richer fields — YouTube Live as the $0 default broadcast path.
ALTER TABLE class_sessions
  ADD COLUMN room_durable_object_id TEXT,             -- DO instance id (= classSessionId)
  ADD COLUMN youtube_live_video_id TEXT,               -- set when teacher starts YouTube Live (Unlisted)
  ADD COLUMN youtube_replay_video_id TEXT,            -- same id post-stream (YouTube auto-VOD); teacher may also paste a different unlisted VOD id
  ADD COLUMN replay_status         TEXT NOT NULL DEFAULT 'none', -- none|available
  ADD COLUMN max_participants      INTEGER NOT NULL DEFAULT 200,
  ADD COLUMN lobby_opens_at        TIMESTAMPTZ,
  ADD COLUMN ended_at              TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS class_sessions_scheduled_window_idx
  ON class_sessions (scheduled_at, status);

-- Per-session attendance
CREATE TABLE IF NOT EXISTS class_attendance (
  id              BIGSERIAL PRIMARY KEY,
  session_id      UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  student_id      TEXT NOT NULL REFERENCES users(id),
  joined_at       TIMESTAMPTZ NOT NULL,
  left_at         TIMESTAMPTZ,
  total_seconds   INTEGER NOT NULL DEFAULT 0,
  source          TEXT NOT NULL DEFAULT 'websocket', -- websocket|hls
  UNIQUE (session_id, student_id)
);
CREATE INDEX IF NOT EXISTS class_attendance_student_idx
  ON class_attendance (student_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS class_attendance_session_idx
  ON class_attendance (session_id, total_seconds DESC);

-- Reactions are short-lived, but persisted for analytics
CREATE TABLE IF NOT EXISTS class_reactions (
  id           BIGSERIAL PRIMARY KEY,
  session_id   UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL REFERENCES users(id),
  reaction     TEXT NOT NULL CHECK (reaction IN ('clap','heart','eyes','fire','laugh','raise_hand')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS class_reactions_session_idx ON class_reactions (session_id, created_at);

-- Chat persists for the session for transcript / replay overlay
CREATE TABLE IF NOT EXISTS class_chat (
  id           BIGSERIAL PRIMARY KEY,
  session_id   UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL REFERENCES users(id),
  body         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS class_chat_session_idx ON class_chat (session_id, created_at);
```

---

## 3. Durable Object — `ClassroomRoom`

### 3.1 Module: `src/durable-objects/classroom-room.ts`

Implements:
- `fetch(request)` — handles HTTP `/status` and WebSocket upgrade.
- `webSocketMessage(ws, msg)` — typed message routing:
  - `presence.join` / `presence.leave`
  - `chat.send` → broadcast + persist
  - `reaction.send` → broadcast + persist
  - `hand.raise` / `hand.lower` → broadcast
  - `host.set_youtube_live` (teacher-only) — DO stores `youtube_live_video_id` and broadcasts to all joined students; the student UI swaps the "stage" iframe to that id.
  - `host.set_youtube_replay` (teacher-only) — paste the YouTube VOD id after stream ends; DO broadcasts.
  - `host.end_class` (teacher-only)
  - `host.mute_user` / `host.kick_user` (teacher-only)
- State shape (in-memory + SQLite via `ctx.storage.sql`):
  ```ts
  type RoomState = {
    sessionId: string;
    teacherId: string;
    startedAt: number;
    endedAt?: number;
    youtubeLiveVideoId?: string;
    youtubeReplayVideoId?: string;
    participants: Map<userId, { ws: WebSocket; joinedAt: number; role: 'teacher'|'student'; hand: boolean; muted: boolean }>;
    chat: ChatMsg[];
    reactions: Reaction[];
    attendance: Map<userId, { joinedAt: number; leftAt?: number; totalSeconds: number }>;
  };
  ```
- On `close` (last WS gone for 5 min) → flush attendance rows to Postgres via `ctx.waitUntil(...)` and emit `class.ended` to NOTIFICATIONS_QUEUE.
- **No video bandwidth flows through the DO** — the YouTube iframe is purely client-side; we never proxy media.

### 3.2 SQLite storage
Use `ctx.storage.sql` for:
- `chat` history (last N messages; older ones flushed to Postgres `class_chat`).
- `attendance` final rollup (latest row per user is the live tally).

This keeps the DO responsive under heavy chat load without hitting Postgres on every message.

### 3.3 DO binding

`wrangler.jsonc`:

```jsonc
{
  "durable_objects": {
    "bindings": [
      { "name": "CLASSROOM_ROOM", "class_name": "ClassroomRoom" }
    ]
  },
  "migrations": [
    { "tag": "v1", "new_sqlite_classes": ["ClassroomRoom"] }
  ]
}
```

### 3.4 HTTP entry: `src/app/api/live/[sessionId]/[[...path]]/route.ts`
- `GET /api/live/[sessionId]` — 307 to lobby if `lobby_opens_at` not reached; otherwise returns a JSON room ticket + the current `youtube_live_video_id` if class has started.
- `POST /api/live/[sessionId]/start` — teacher-only; creates the DO instance.
- `POST /api/live/[sessionId]/youtube-live` — teacher-only; body `{ videoId }`; DO stores + broadcasts to joined students.
- `POST /api/live/[sessionId]/youtube-replay` — teacher-only; body `{ videoId }`; DO stores + broadcasts. Called after stream ends (YouTube reuses the live id for the auto-VOD, or teacher can paste a different unlisted VOD id).
- `POST /api/live/[sessionId]/end` — teacher-only; marks ended, flushes attendance, emits the replay-ready notification.
- `GET /api/live/[sessionId]/ws` — upgrades to WebSocket via `env.CLASSROOM_ROOM.idFromName(sessionId)`.

---

## 4. Service Layer

### 4.1 `src/services/classes/sessions.ts` (extend existing)
- `scheduleLiveSession({ courseId, scheduledAt, durationMinutes, mode, maxParticipants })`
- `startRecording(sessionId, teacherId)` — flips `recording_status='recording'`, mints R2 prefix for chunks, returns the prefix.
- `finalizeRecording(sessionId, teacherId)` — flushes the DO recorder manifest, enqueues `replay.transcode` to `EMBEDDINGS_QUEUE` (Actions cron runs `ffmpeg`, free).
- `markRecordingReady(sessionId, r2MasterKey)` — called when Actions worker reports HLS upload complete.
- `getRoutineForUser(userId, weekStart)` — returns Mon–Sun cells (used by dashboards).
- `exportIcalForUser(userId)` — emits RFC 5545 ICS string of enrolled/authored class sessions + assignment due-dates + exam windows.

### 4.2 `src/services/classes/attendance.ts`
- `finalizeSessionAttendance(sessionId)` — called from DO flush; writes `class_attendance` rows idempotently via `ON CONFLICT (session_id, student_id) DO UPDATE`.
- `getAttendanceForSession(sessionId)` — for teacher post-class view.
- `getAttendanceTrend(studentId, courseId)` — for student dashboard streak + for parent dashboard (R7).

### 4.3 `src/services/classes/replay.ts`
- `getReplayEmbed(sessionId)` — returns the YouTube embed URL for the replay (either the same `youtube_live_video_id` reused by YouTube for the auto-VOD, or the `youtube_replay_video_id` the teacher pasted). Used by the replay page; the in-app iframe is a `youtube-nocookie.com` embed. `Cache-Control: private, max-age=600`.

---

## 5. UI/UX Changes

### 5.1 Pre-join lobby
`/student/courses/[courseId]/live/[sessionId]` (also teacher route):
- Card with teacher name, course title, class description, scheduled time, "Class will start at HH:MM".
- Live status pill ("Starting in 12 min" / "Live now").
- "Join class" CTA disabled until `lobby_opens_at`.

### 5.2 In-room UI
Layout (desktop):
```
+--------------------------------+--------------------+
|        STAGE (16:9)            |  SIDEBAR (320px)   |
|  YouTube Live iframe           |  Tabs:             |
|  (youtube-nocookie.com)        |   • Chat           |
|                                |   • Q&A            |
|                                |   • Participants   |
|                                |                    |
|                                |                    |
+--------------------------------+--------------------+
| Reactions row (clap/heart/etc)                       |
+------------------------------------------------------+
```

Layout (mobile): tabs become a bottom sheet; stage takes full width; reactions become a swipe-up strip.

Keyboard shortcuts:
- `R` raise/lower hand
- `1`–`5` reactions (clap/heart/eyes/fire/laugh)
- `?` shows shortcuts
- *(Teacher-only)*: `S` start YouTube Live + paste video id; `E` end class; `P` paste replay video id.

Teacher controls (separate floating panel):
- **"Start YouTube Live"** — opens a modal with instructions ("Open YouTube Studio → Go Live → Unlisted → copy the watch URL and paste here"). On confirm, sends the video id to the DO; joined students see the live iframe replace the placeholder.
- **"Mark replay ready"** — after stream ends (teacher clicks this once YouTube has processed the VOD), DO stores the VOD id and broadcasts to all students. Replay becomes available.
- "Mute all" / "Mute {student}" / "Remove {student}".
- "Pin a message" (chat gets a pinned system message).
- Live attendance count (joined + watching-now).

### 5.3 Post-class replay
Built on top of the YouTube embed (R2). Adds:
- **Live chat transcript overlay** — synced to playback time via YouTube's `getCurrentTime()` API.
- **Q&A** tab — same Q&A from R4, scoped to this session.
- **Hand-raise moments** highlighted on the timeline (poll the YouTube player each second).
- **Attendance badge** ("You were present for 42 of 45 min").

### 5.4 Schedule views
- Student dashboard → "Today's routine" (vertical timeline) replaces the ad-hoc list.
- Teacher dashboard → "Today's classes" + "Tomorrow's classes" + "This week" tabs.
- `/student/routine` and `/teacher/routine` — full week view with export buttons (ICS, copy-to-clipboard for WhatsApp).

### 5.5 Notifications
- 15 min before class: NOTIFICATIONS_QUEUE producer emits `class.reminder` → in-app toast + bell + email via **Cloudflare Email Service** (free — replaces Resend/Postmark). Setup done in R10; for R3 we route via the same in-app channel and emit a `notifications` row; the email path is wired by R10 without API change.
- On class start: in-app banner for enrolled students.
- On class ended + recording ready: notification "Watch the replay now" with deep link to the replay page.

---

## 6. Security & Performance Considerations

- **WebSocket auth:** first message after upgrade must be `auth` carrying a short-lived ticket (signed by Worker using a `CLASSROOM_TICKET_SECRET`). DO rejects any `presence.join` without a valid ticket.
- **Ticket TTL:** 5 min. Includes `userId`, `sessionId`, `role`.
- **Rate-limit chat sends** (per-user 1 msg / 2s) inside the DO; violators muted for 60s.
- **Teacher-only actions** verified inside the DO against the `teacherId` of the session.
- **Recording opt-in/out per course** (`courses.recordingAllowed` boolean). Default on.
- **Webcam never leaves the user's device** unless `proctoring.enabled` for the session; that's separate from attendance and not used in R3.
- **DO capacity:** a single DO instance per session scales to ~10k concurrent WebSockets (Workers limit). For multi-region low-latency we accept the single-region deployment for now; later R9 can add regional routing.

---

## 7. i18n Keys Required (R3)

- `live.lobby.startingIn`, `live.lobby.liveNow`, `live.lobby.endsAt`, `live.lobby.join`
- `live.room.tabs.chat`, `live.room.tabs.qa`, `live.room.tabs.participants`
- `live.room.reactions.clap`, `heart`, `eyes`, `fire`, `laugh`, `raiseHand`
- `live.room.controls.mute`, `unmute`, `camera`, `raiseHand`, `shortcuts`
- `live.teacher.startRecording`, `stopRecording`, `muteAll`, `removeUser`
- `live.attendance.joined`, `left`, `totalMinutes`
- `live.recording.processing`, `ready`, `failed`
- `live.replay.chatTranscript`, `qaAt`, `handRaisedHere`
- `schedule.exportIcal`, `schedule.copyLink`, `schedule.weekOf`

---

## 8. Verification Checklist

1. `npm run check:i18n`, `npx tsc --noEmit`, `npm run lint`, `npm run build` green.
2. End-to-end smoke:
   - Teacher schedules a class for now.
   - Student joins → lobby opens 5 min before.
   - Student connects → DO presence + attendance row.
   - Teacher clicks "Start YouTube Live" → pastes unlisted live watch URL → DO receives `set_youtube_live` and broadcasts.
   - Student stage switches to the `youtube-nocookie.com` iframe within 1 s. **No video bytes cross our Worker / R2.**
   - Two students chat, raise hand, react → DO broadcasts and persists.
   - Teacher ends class on YouTube Studio → clicks "Mark replay ready" → DO stores + broadcasts replay id → students see the replay iframe + chat transcript overlay.
3. **Concurrency:** load test with `wrk`/`artillery` against the WebSocket endpoint — 500 concurrent students in one room (chat/raise-hand only). No video traffic on Workers.
4. **Reconnect:** kill student network mid-class for 30 s, reconnect → state intact (chat continues, attendance totals updated, YouTube iframe just resumes).
5. **Replay:** open replay page; chat transcript aligns with playback time via `getCurrentTime()` polling.
6. **iCal export** opens cleanly in Google Calendar / Apple Calendar.
7. **CSP** allows `frame-src https://www.youtube-nocookie.com https://www.youtube.com` and `script-src https://www.youtube.com/iframe_api` and WSS for `*.workers.dev`.
8. Worker invocations during a 60-min live class for 200 students ≤ 1k (vs. ≥ 200k pre-R3) — almost everything video-side is gone.
9. Attendance row appears in DB after class ends.
10. **YouTube bandwidth cost** to InsideJibon (via R2 metrics + Workers Analytics) stays at zero during the live class.
11. Confirm YouTube is Unlisted (not Private). Reject Private videos at the id-validation step.

---

## 9. Copy-Paste Prompt

```markdown
# Phase R3 — Live Class Room (Durable Object + YouTube Live Unlisted)

Read `AGENTS.md`, `docs/MASTER_READMAP.md`, `docs/MASTER_REMASTER.md`, and `docs/FREE-TIER-REFERENCE.md` first (especially §18b).

## Tasks
1. Run migration `0003_remaster_r3_live_class.sql`.
2. Add DO class `ClassroomRoom` at `src/durable-objects/classroom-room.ts` per §3.1.
3. Wire DO binding into `wrangler.jsonc` per §3.3.
4. Implement HTTP + WebSocket routes at `src/app/api/live/[sessionId]/[[...path]]/route.ts` per §3.4.
5. Build ticket signing helper `signClassroomTicket({ userId, sessionId, role, ttl })`.
6. Implement `src/services/classes/sessions.ts` extensions (schedule, finalize, ical export).
7. Build lobby page at `/student/courses/[courseId]/live/[sessionId]` (and teacher variant).
8. Build in-room UI per §5.2 — stage is a `youtube-nocookie.com` iframe; chat/Q&A/reactions live alongside.
9. Build teacher "Start YouTube Live" + "Mark replay ready" modals.
10. Build replay page using the YouTube embed + chat transcript overlay.
11. Build routine views + iCal export.
12. Wire NOTIFICATIONS_QUEUE producer for the 15-min-before and replay-ready events.
13. Update CSP (R0) for `frame-src https://www.youtube-nocookie.com https://www.youtube.com` + `script-src https://www.youtube.com/iframe_api`.
14. Add i18n keys per §7.
15. Run §8 verification checklist.
16. Commit + push.
```
10. Build routine views + iCal export.
11. Wire NOTIFICATIONS_QUEUE producer for the 15-min-before and on-start events.
12. Add i18n keys per §7.
13. Run §8 verification checklist.
14. Commit + push.
```
