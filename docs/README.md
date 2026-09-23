# YouTube Utility Platform - Documentation

This is the source-of-truth product/architecture/API/database reference for the
monorepo. Sections below: [Product](#product), [Architecture](#architecture),
[API](#api), [Database](#database).

## Product

### Scope

Accepts a YouTube single-video or playlist URL and provides: video info, transcript
extraction, audio/video processing, playlist processing, transcript/media export,
processing history, collections, batch processing, usage limits, API access, and
admin management.

**Explicitly out of scope for now:** AI Summary, AI Chat, Video Chat, RAG, Embeddings,
AI processing. These can be added later as an additional worker/service without
restructuring the Video → Transcript → Job → Worker → Storage pipeline.

### Core workflow

```
YouTube URL → Analyze → Select Tool → Create Job → Process → Preview → Export / Save
```

### Architecture principle

```
Frontend → API → Job → Queue → Worker → Processing → Storage → Result
```

Never: `Frontend → API → heavy yt-dlp/FFmpeg process → wait`. All expensive
processing runs in `apps/worker`, never inside the Express API process.

### Monorepo layout

```
youtube-platform/
├── apps/
│   ├── web/       React + Vite customer app
│   ├── api/       Express + TypeScript REST API
│   ├── worker/    BullMQ + yt-dlp + FFmpeg processing
│   └── admin/     React + Vite internal admin app
├── packages/
│   ├── ui/ types/ validators/ config/ utils/ logger/ eslint-config/ tsconfig/
├── docs/
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

### Development phases (delivery order)

1. Turborepo foundation - `pnpm dev` starts web/api/worker/admin against local Mongo/Redis.
2. Authentication - email/password, Google OAuth, refresh tokens, roles.
3. URL Analyzer - smart URL input, video/playlist detection, metadata preview.
4. Job infrastructure - Job model, BullMQ queues, Socket.IO progress events.
5. Transcript - extraction, normalization, viewer, TXT/SRT/VTT/JSON/Markdown export.
6. Single video media processing - yt-dlp + FFmpeg audio/video jobs, storage, cleanup.
7. Playlist - bulk selection, bulk transcript/audio/video/export.
8. History & Collections.
9. Export Center - all export formats through BullMQ.
10. Billing & Usage - Stripe, plans, rate limits.
11. Admin - user/job/queue/worker monitoring, audit logs.
12. Public API - API keys, rate limits, webhooks.

### MVP scope

Auth, Dashboard, Smart URL Analyzer, video metadata, playlist detection, transcript
extraction + viewer + TXT/SRT/VTT/JSON export, job queue (Redis/BullMQ/worker), basic
audio processing, history. Explicitly deferred: AI features, video/audio beyond basic,
batch/ZIP export, collections, billing, admin, public API - those land in V1/V2.

### Full feature matrix, API routes, database collections, security rules

See the [API](#api) and [Database](#database) sections below for the as-built detail
(per-module API contracts, Mongoose-shaped models); the original long-form spec
(navigation layout, screen wireframes, subscription plans, rate limits, storage
layout, and the V1/V2 roadmap) is kept in this repo's history as the canonical
long-form reference.

## Architecture

Turborepo monorepo (pnpm workspaces) with four apps and shared packages.

- `apps/web` - React + Vite + Tailwind customer SPA, talks to `apps/api` over REST + Socket.IO.
- `apps/api` - Express REST API. Owns MongoDB and issues jobs onto BullMQ/Redis queues. Never runs yt-dlp/FFmpeg itself.
- `apps/worker` - BullMQ workers (one per queue: metadata, transcript, audio, video, playlist, export) that run yt-dlp/FFmpeg and write to object storage.
- `apps/admin` - React + Vite internal dashboard for users/jobs/queues/workers/storage/abuse.

Shared packages (`packages/*`) hold cross-app types (`@ytp/types`), Zod validation
schemas used by both the API and the web forms (`@ytp/validators`), Mongoose models
shared between the API and worker (`@ytp/db`), a local-filesystem storage client
shared the same way (`@ytp/storage` - see [Storage](#storage) below), the design
system (`@ytp/ui`), env loading (`@ytp/config`), logging (`@ytp/logger`), and
lint/tsconfig presets.

There is no subscription/plan system and no third-party auth - every account is
a plain email/password login (see the [API](#api) section's Auth entry) with the
same, unrestricted access; there's nothing left in the codebase for `plan`,
Stripe, or Google OAuth to hook into.

### Job progress: worker → browser

The worker holds no live WebSocket connections (only the API does), so it can't
call `io.emit()` directly. Progress instead flows over Redis: the API's Socket.IO
server uses `@socket.io/redis-adapter`, and the worker publishes into the same
channels via `@socket.io/redis-emitter` (`apps/worker/src/realtime/emitter.ts`).
Each authenticated socket joins a `user:<id>` room at connect time (JWT verified at
the handshake), so `job:*` events reach only that user's own connected clients -
this also means the API can scale to multiple instances later without changing
this code, since the adapter already broadcasts through Redis rather than in-memory.

### Storage

`@ytp/storage`'s `StorageService` stores files on the local filesystem, under
`STORAGE_ROOT` - no cloud bucket (R2/S3/MinIO) involved. Both `apps/api` and
`apps/worker` instantiate their own copy, so `STORAGE_ROOT` must point both
processes at the exact same absolute directory (they're expected to run on the
same machine). A `MediaFile.storage.key` (e.g.
`users/<id>/jobs/<id>/audio/song.mp3`) is a path relative to that root.

Downloads work like a cloud presigned URL, self-hosted and permanent: `GET
/files/:id` (authenticated) returns an HMAC-signed URL pointing at the API's
own `GET /files/raw?key=...&signature=...`, which is _not_ behind auth - the
signature (verified in `StorageService.verifySignedRequest`) is what limits
access. There's no `expires` component and no cleanup sweep: a generated file
and its signed link are permanent (they only go away if the user explicitly
deletes the file) - a deliberate choice over the S3/R2-style short-lived
presigned URL + TTL cleanup this replaced. Only that route ever needs to
resolve a key back to an on-disk path.

### Media pipeline gotcha (learned the hard way)

**yt-dlp needs to be told where FFmpeg is.** When a video format requires
merging separate video+audio streams, yt-dlp shells out to FFmpeg itself -
and it finds it via its own PATH lookup, not this app's `FFMPEG_PATH` env var.
Without `--ffmpeg-location`, it silently downloads both streams and leaves
them unmerged instead of erroring, so a naive "find the output file in this
directory" helper can pick the audio-only leftover and produce a video-less
file with no warning. Fixed by always passing `--ffmpeg-location` (see
`ffmpegLocationArgs()` in `ytdlp.service.ts`) and by making the file-picker
choose the _largest_ match in the temp dir rather than the first one, as a
second line of defense.

### Local dev infrastructure

`docker-compose.yml` runs MongoDB and Redis only - no storage service, since
`@ytp/storage` reads/writes the local filesystem directly.

## API

Base URL: `/api/v1`, served by `apps/api`.

### Implemented

- **Auth** (`/auth`): `POST /register`, `POST /login`, `POST /refresh`, `POST /logout`.
  JWT access tokens (short-lived, returned in the response body) plus a rotating
  refresh token stored as an HttpOnly cookie scoped to `/api/v1/auth`. Reuse of an
  already-rotated or forged refresh token revokes every session for that user.
  `login`/`refresh` both 403 `ACCOUNT_DISABLED` for a user an admin has disabled
  (see Admin below) - disabling also proactively revokes every outstanding
  refresh token, so an already-issued one can't keep the session alive.
- **Users** (`/users`): `GET /me`, `PATCH /me` - behind `requireAuth`.
- **Analyzer** (`/analyzer`): `POST /` - validates the URL, detects video vs.
  playlist, and enqueues a `metadata` job onto BullMQ. Uses `optionalAuth`: signed-in
  callers get a persisted `Job` (shows up in `/jobs`, History, Dashboard, and gets
  live progress over Socket.IO); anonymous callers get the same result but no Job
  record - a one-off preview. Either way the request awaits the worker's result
  (`job.waitUntilFinished` via `QueueEvents`) before responding. The worker shells
  out to yt-dlp (never the API process - see `apps/worker/src/services/youtube`),
  upserts a `Video`/`Playlist`(+`PlaylistItem`s) document via `@ytp/db`, and returns
  an `AnalyzerResult`. Typical latency is 1–3s (yt-dlp extraction time), surfaced to
  the frontend as a loading state, not a synchronous "instant" call.
- **Jobs** (`/jobs`, all behind `requireAuth`): `GET /` (paginated, newest first;
  `?parentJobId=` filters to one playlist batch's fanned-out children,
  `?trashed=true` lists only soft-deleted jobs instead of the normal list),
  `GET /:id`, `POST /:id/cancel`. Cancelling a still-queued/delayed BullMQ job
  removes it outright; cancelling an already-active one just marks the Mongo record
  `cancelled` and the worker's own completion/failure handler is guarded to never
  overwrite a terminal status. A job already `completed`/`failed`/`cancelled`
  returns 409 on cancel. `DELETE /:id` soft-deletes (sets `deletedAt`, excluded
  from the normal list but recoverable) and `POST /:id/restore` clears it - this
  is History's "Delete"/"Restore" pair from the spec, deliberately reversible
  rather than a permanent hard-delete.
- **Realtime**: Socket.IO on the same HTTP server, JWT-authenticated at the
  handshake (`socket.handshake.auth.token`), each client joins a `user:<id>` room.
  Events: `job:created`, `job:started`, `job:progress`, `job:completed`,
  `job:failed`, `job:cancelled` (payload: `JobEventPayload` from `@ytp/types`).
  Because the worker process holds no live WebSocket connections, it publishes into
  the same Redis channels the API's `@socket.io/redis-adapter` subscribes to, via
  `@socket.io/redis-emitter` - see `apps/worker/src/realtime/emitter.ts`.
- **Transcripts** (`/transcripts`, all behind `requireAuth`): `POST /` (body
  `{videoId, language}` - `videoId` is actually the YouTube id, matching the
  spec's job-creation contract) enqueues a `transcript` job and responds `202
{jobId, status}` **without** awaiting it - unlike the analyzer, this is a real
  async job from the start, tracked the same way Phase 6 audio/video jobs will be.
  `GET /:youtubeId?language=en` returns the stored transcript once the job
  completes. The worker (`apps/worker/src/services/transcript`) fetches the
  video's caption track via yt-dlp's info JSON, preferring a manually-created
  track over an auto-generated (ASR) one, and always in the exact requested
  language before ever falling back to whatever else is available - it downloads
  and parses YouTube's `json3` timedtext format directly (its `vtt` entry for
  auto-captions turned out to be an HLS-wrapped manifest, not raw VTT).
- **Media** (`/media`, all behind `requireAuth`): `POST /audio` and `POST /video`
  (body `{videoId, format, quality}`) each enqueue an `audio`/`video` job and
  respond `202 {jobId, status}` without awaiting - these are real long-running
  jobs (downloads can run minutes for a long video). The worker
  (`apps/worker/src/workers/{audio,video}.worker.ts`) downloads via yt-dlp into a
  per-job scratch temp dir (always cleaned up, even on failure), transcodes with
  FFmpeg (audio: re-encodes to the exact requested codec/bitrate since the source
  is never already in that format; video: remuxes only - `-c copy`, no re-encode
  - into the exact requested container), uploads the result to object storage via
    `@ytp/storage`, and creates a `MediaFile` record. The job's `result` carries
    `mediaFileId`, not a URL - the URL is fetched separately (see `/files` below).
- **Files** (`/files/:id`, behind `requireAuth`): returns a signed download URL
  for a `MediaFile` the caller owns - 404 if not theirs. The link never
  expires and the file is never auto-deleted (no plan tiers, no cleanup sweep
  - see the [Storage](#storage) section above). The URL points at
    `GET /files/raw` (not behind auth - an HMAC signature in the query string is
    what limits access), so the frontend never touches the filesystem path
    directly.
- **Playlists** (`/playlists`, all behind `requireAuth`): `GET /:youtubeId`
  returns the playlist plus its full item list (for the selection UI).
  `POST /jobs` (body `{playlistId, videoIds, operation, ...}`, a Zod
  discriminated union on `operation` so `format`/`quality` are required for
  `audio`/`video` and `language` is optional for `transcript`) creates a
  `playlist`-type orchestrator `Job` and enqueues it - responds `202
{jobId, status}` without awaiting. The playlist worker then fans out: for
  each selected video it upserts a lightweight `Video` doc from the playlist
  item's own data (`$setOnInsert`, so it never clobbers a fuller record a prior
  individual `/analyzer` call may have made), creates a **child** `Job`
  (`parentJobId` set to the orchestrator's id) and enqueues it onto the normal
  `transcript`/`audio`/`video` queue - the exact same worker code from Phases
  5–6 processes it, unmodified. The orchestrator's own `status: "completed"`
  means fan-out finished (every item got its own job queued), **not** that
  those jobs finished processing - real per-video progress is tracked through
  the children themselves via `GET /jobs?parentJobId=`. Bulk export (CSV/JSON
  manifest, combined transcript, ZIP of combined media) is handled by the
  Export Center - see `/exports` below.
- **Collections** (`/collections`, all behind `requireAuth`): `GET /`, `POST /`
  (`{name, description?}`), `GET /:id` (returns the collection plus its items
  **resolved** - each `CollectionItem` only stores `{itemType, refId}`, so this
  endpoint looks up the underlying `Video`/`Playlist`/`Transcript`/`MediaFile`
  to attach `title`/`thumbnail`/`subtitle`/`youtubeId` for display; an item
  whose underlying doc has since disappeared is silently dropped from the
  response rather than erroring), `PATCH /:id`, `DELETE /:id` (cascades to its
  items), `POST /:id/items` (`{itemType, refId}`, 409 `ALREADY_SAVED` if
  already present, 404 if the referenced item doesn't exist), `DELETE
/:id/items/:itemId`. `refId` means different things per `itemType`: the
  YouTube id for `video`/`playlist` (shared, unowned content - no ownership
  check), the Mongo `_id` for `transcript` (unowned) and `media` (ownership
  checked, since `MediaFile` is user-specific).
- **Exports** (`/exports`, all behind `requireAuth`): `POST /` takes a Zod
  discriminated union on `exportKind`: `playlist-manifest` (`{playlistId,
format: "csv"|"json"}`, no job dependency - just the playlist's own item
  list), `combined-transcript` (`{playlistJobId, format: "txt"|"markdown"
|"json"}` - `playlistJobId` must be a `playlist`-type job the caller owns
  whose `options.operation` is `"transcript"`), or `media-bundle`
  (`{playlistJobId, format: "zip"}` - same ownership/type check, but
  `operation` must be `"audio"` or `"video"`). Enqueues an `export` job and
  responds `202 {jobId, status}` without awaiting, reusing the exact same
  `Job`/Socket.IO progress machinery as every other job type - the frontend's
  existing `/media/:jobId` result page works unmodified since an export's
  result also carries a `mediaFileId`. The worker
  (`apps/worker/src/workers/export.worker.ts`) builds the requested output in
  a scratch temp dir: the manifest and combined-transcript kinds read
  directly from Mongo (`PlaylistItem`s, or every completed `transcript`-type
  child job under `playlistJobId`) and format in-memory; `media-bundle`
  downloads each completed child job's `MediaFile` from storage and streams
  them into a zip via `archiver`. The finished file is uploaded to storage
  and recorded as a `MediaFile` with `type: "export"`, same as any other
  generated file - permanent, no expiry.
- **Admin** (`/admin`): route group gated to `admin`/`support` roles. All routes
  are readable by both roles; mutating routes additionally require
  `requireRole("admin")` - `support` is a read-only viewer. `GET /dashboard`
  (user/job counts, "active users" = distinct `userId`s with a job in the last
  7 days, queue length). `GET /users` (paginated, `?search=` matches
  name/email), `GET /users/:id` (profile + job/file/storage counts), `PATCH
/users/:id/role` (`{role}`, admin-only, can't target yourself - avoids
  locking yourself out), `POST /users/:id/disable` / `/enable` (admin-only,
  can't target yourself; disabling revokes all the user's refresh tokens so
  they're signed out everywhere, not just blocked from a future login). `GET
/jobs` (every user's jobs, `?type=`/`?status=`/`?userId=` filters), `POST
/jobs/:id/cancel` / `DELETE /jobs/:id` (admin-only - the same cancel/soft-
  delete semantics as the user-facing `/jobs` routes, just without an
  ownership check, and the affected user still gets the normal Socket.IO
  `job:cancelled` event). `GET /queues` (live BullMQ `getJobCounts()` per
  queue). `GET /workers` - worker processes write a heartbeat
  (`worker:heartbeat:<instanceId>`, 20s TTL, refreshed every 10s - see
  `apps/worker/src/services/heartbeat.service.ts`) directly into Redis since
  they have no other channel back to the API; this route just reads whatever
  heartbeat keys haven't expired, so a crashed worker silently disappears
  within ~20s with no separate liveness check needed. `GET /storage`
  (aggregate `MediaFile` counts/bytes by type, plus top users by bytes used -
  computed from Mongo, not a filesystem walk). `GET /system` (Mongo/Redis
  connectivity, API process uptime). `GET /audit-logs` (`?action=` filter) -
  every role change, disable/enable, admin cancel, and admin delete writes an
  `AuditLog` entry (`apps/api/src/database/models/auditLog.model.ts`;
  `actorId`/`actorEmail`, `action`, `targetType`/`targetId`, optional
  `metadata`) via `recordAuditLog()`, so those four mutation routes are the
  only ones that show up there - everything else on this router is read-only
  and unaudited.

### Not yet implemented

Billing and usage limits are out of scope entirely - there's no subscription/plan
system (see [Architecture](#architecture)). API keys and webhooks (a public,
programmatic API) were removed - every route is session-auth (JWT) only now. See
the [Product](#product) section above for the full per-route request/response
contracts and the phase each lands in.

## Database

MongoDB via Mongoose, one database per environment.

### Implemented

- `User`, `RefreshToken`, `AuditLog` - defined in
  `apps/api/src/database/models/` (auth and admin are the API's exclusive
  domain; the worker never touches these). `User.isDisabled` (default
  `false`) is set by an admin (`POST /admin/users/:id/disable`);
  `login`/`refresh` both reject a disabled user. `AuditLog` records every
  admin mutation - role changes, disable/enable, admin job cancel/delete - as
  `{actorId, actorEmail, action, targetType, targetId, metadata?}`; it's
  written, never updated, and only ever queried by `GET /admin/audit-logs`.
- `Video`, `Playlist`, `PlaylistItem` - defined in `packages/db` (`@ytp/db`) since
  both the worker (writes, via the metadata job) and the API (will read, in a later
  phase) need the same shape. `connectDatabase()` also lives here and is what both
  `apps/api` and `apps/worker` call on startup.
- `Job` - also in `@ytp/db`, for the same reason: the API creates/reads/cancels
  jobs, the worker updates their `status`/`progress`/`result` as it processes them.
  `type`/`status` are Mongoose enums built from `as const` string tuples (not the
  `@ytp/types` unions directly - Mongoose needs a runtime array - but the literal
  values are kept in sync by hand). `parentJobId` (optional, self-referencing)
  links a playlist batch's fanned-out per-video jobs back to the orchestrator job
  that created them - both the API (`jobs.service.ts`, top-level jobs) and the
  worker (`create-child-job.service.ts`, playlist fan-out) can create a `Job`,
  which is why the worker also carries its own `Queue` instances for
  `transcript`/`audio`/`video` (`apps/worker/src/queues/queues.ts`) even though
  normally only the API enqueues work. `deletedAt` (optional) is History's soft
  delete - `null`/missing means visible, set means trashed-but-recoverable.
- `Transcript` - also `@ytp/db`. Unique on `{videoId, language}`, not on `videoId`
  alone, so the same video can hold transcripts in more than one language; a
  second request for the same pair overwrites (upsert) rather than duplicating.
- `MediaFile` - also `@ytp/db`. Written once by the audio/video worker after a
  successful upload; there's no expiry or automatic cleanup - a generated file
  and its signed download link are permanent until the user deletes it
  themselves. `type` is `"audio" | "video" | "export"` - the Export Center
  worker writes one of these too (manifest/combined-transcript/media-bundle
  output), reusing the exact same record shape and signed-download flow
  (`/files/:id`) as an audio/video download; `format` is widened to `string`
  for this case since export formats (`csv`, `markdown`, `zip`, ...) aren't
  part of the `AudioFormat`/`VideoFormat` unions. `storage` is just `{key}` -
  a path relative to `STORAGE_ROOT` on local disk, no cloud bucket/provider
  involved (see the [Storage](#storage) section above).
- `Collection`, `CollectionItem` - also `@ytp/db`. A `CollectionItem` is just
  `{collectionId, itemType, refId}` (unique on the triple, so saving the same
  thing twice 409s instead of duplicating) - it deliberately does **not**
  denormalize a title/thumbnail onto itself; the API resolves those live from
  the referenced `Video`/`Playlist`/`Transcript`/`MediaFile` on every read
  (`collections.service.ts`), so a saved item's display always reflects the
  current state of the thing it points to (e.g. a video's title if it were ever
  corrected) rather than a stale snapshot. `Collection.itemCount` is a
  denormalized counter, kept in sync by `addItemToCollection`/
  `removeItemFromCollection` rather than counted on every read.

`@ytp/types` defines the shared TypeScript shapes (`Video`, `Playlist`, `Job`,
`Transcript`, `MediaFile`, `Collection`, etc.) that these Mongoose schemas are
modeled after, so the API and web app never drift on field names - but note the
types package holds plain interfaces, not the Mongoose schemas themselves.

### Not yet implemented

`usageRecords`, `subscriptions` - out of scope entirely, no plan/billing
system exists (see [Architecture](#architecture)). See the [Product](#product)
section above for the original field-level spec.
