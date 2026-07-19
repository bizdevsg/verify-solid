# Solid Video Verification

A lightweight one-to-one video meeting platform for Solid Gold staff to verify customer identity over
video, similar in spirit to Zoom but scoped to a single use case: **staff ↔ customer identity verification**.

This is an MVP. It intentionally does not include group calls, chat, screen sharing, or compliance
workflow features beyond what's listed below.

## Features

- Staff and admin login (Laravel Sanctum, cookie-based SPA auth)
- Role-based access: `admin` (manage staff, view everything) and `staff` (manage their own customers/meetings)
- Dashboard with real database-backed statistics and recent/upcoming meeting tables
- Customer (nasabah) management: create, edit, search, paginate, masked identity numbers
- Meeting scheduling: create, edit, cancel, start, end, with a generated meeting code
- Secure, single-use invitation links (hashed token, expiring, rotate-on-demand)
- Customer join flow with no login required: invitation → name confirmation → camera/mic check →
  waiting room → video call → completion page
- One-to-one video calls via LiveKit (`livekit-client` + `@livekit/components-react`)
- Call recording: the customer's audio+video is recorded via LiveKit Egress, stored in MinIO
  (S3-compatible), and downloadable only through an authenticated Laravel route — never a public URL
- Meeting notes, verification result, and history
- Meeting event timeline (invitation opened, customer waiting, meeting started/ended, recording
  started/ready/failed, etc.)
- Docker Compose environment: nginx, frontend, backend, MySQL, Redis, LiveKit, LiveKit Egress, MinIO

## Technology Stack

**Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, TanStack Query,
React Hook Form, Zod, `@livekit/components-react`

**Backend:** Laravel 11, PHP 8.4+, Laravel Sanctum, MySQL, `agence104/livekit-server-sdk`

**Video:** LiveKit (self-hosted via Docker)

**Infra:** Docker Compose, nginx, MySQL, Redis, MinIO (recording storage)

## Folder Structure

```
.
├── backend/                  Laravel API (app/, routes/, database/, tests/)
├── frontend/                 Next.js app (src/app, src/components, src/hooks, src/lib)
├── infrastructure/
│   ├── nginx/default.conf    Reverse proxy: /api + /sanctum → backend, everything else → frontend
│   ├── livekit/livekit.yaml  LiveKit server config (dev keys, includes webhook: for recording)
│   └── livekit/egress.yaml   LiveKit Egress worker config (dev keys)
├── docker-compose.yml
└── .env.example              Root compose env (DB credentials, LiveKit dev keys, MinIO credentials)
```

## Local Installation (without Docker)

Requirements: PHP 8.4+, Composer, Node 20+, MySQL 8, and (optionally) a LiveKit server for real video calls.

### 1. Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

Edit `.env` and point `DB_*` at a MySQL server you control, then:

```bash
php artisan migrate --seed
php artisan serve
# Backend now running at http://localhost:8000
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
# Frontend now running at http://localhost:3000
```

`NEXT_PUBLIC_API_URL` in `frontend/.env.local` should point at the backend root (no `/api/v1` suffix),
e.g. `http://localhost:8000`.

### 3. LiveKit (optional, required for actual video calls)

Without a running LiveKit server, every other feature works (auth, CRUD, invitation links, device
check, waiting room) — only the live video connection itself will show "Menghubungkan..." and never
connect. To run LiveKit locally:

```bash
docker run --rm -p 7880:7880 -p 7881:7881 -p 50000-50100:50000-50100/udp \
  -v "$(pwd)/infrastructure/livekit/livekit.yaml:/etc/livekit.yaml" \
  livekit/livekit-server:latest --config /etc/livekit.yaml
```

Make sure `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` in `backend/.env` match the `keys:` section of
`infrastructure/livekit/livekit.yaml`. Recording needs LiveKit Egress + MinIO too, which is
realistically only practical via the full Docker Compose stack below (Egress needs its own worker
process, and the webhook that flips a recording to "ready" needs a reachable callback URL) — running
LiveKit standalone like this gets you calls, but not recordings.

## Docker (local, self-hosted try-out — no HTTPS)

```bash
cp .env.example .env
cp backend/.env.example backend/.env   # already has a working APP_KEY + dev LiveKit keys
docker compose up -d --build
docker compose exec backend php artisan db:seed   # migrations run automatically on start
```

The app is then available at `http://localhost` (nginx routes `/api/*` and `/sanctum/*` to the
Laravel backend, everything else to the Next.js frontend). LiveKit's signaling/media ports
(`7880`, `7881`, `50000-50100/udp`) are also published on the host.

Recording works out of the box with this full stack: `minio-init` creates the `recordings` bucket
automatically on first start, `livekit-egress` picks up jobs from Redis, and the webhook route is
already configured in `infrastructure/livekit/livekit.yaml`. MinIO itself has no host port mapping
(same as MySQL/Redis) — it's only reachable from inside the compose network.

To stop: `docker compose down` (add `-v` to also drop the MySQL and MinIO data volumes).

**Deploying to a real production server (domain + HTTPS + hardened config)?** See
[DEPLOYMENT.md](DEPLOYMENT.md) — don't reuse the seeded demo accounts or dev LiveKit keys there.

## Environment Variables

See `.env.example` (root, for Docker Compose), `backend/.env.example`, and `frontend/.env.example`
for the full list. Notable ones:

| Variable | Where | Purpose |
|---|---|---|
| `SANCTUM_STATEFUL_DOMAINS` | backend | Origins allowed to use cookie-based (SPA) auth |
| `FRONTEND_URL` | backend | Used to build invitation links returned by the API |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` / `LIVEKIT_HOST` / `LIVEKIT_URL` | backend | Server-side token signing + room management. **Never exposed to the browser.** |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` / `MINIO_ENDPOINT` / `MINIO_BUCKET` | backend | Recording storage (the `recordings` disk). **Never exposed to the browser.** |
| `NEXT_PUBLIC_API_URL` | frontend | Backend root URL the browser talks to |

## Database Migration & Seeder

```bash
php artisan migrate --seed
```

Seeds an admin, a staff member, a demo customer, and three demo meetings (scheduled, completed,
cancelled) so the dashboard and lists aren't empty on first run.

## Login Credentials (local development only)

| Role  | Email                  | Password   |
|-------|------------------------|------------|
| Admin | admin@example.local    | password   |
| Staff | wpb@example.local      | password   |

**These are local development fixtures only. Never use them in a real deployment.**

## How to Create a Meeting

1. Log in as staff or admin.
2. Go to **Data Nasabah** and create a customer if one doesn't exist yet.
3. Go to **Jadwal Verifikasi → Buat Meeting**, pick the customer, a schedule, and a title.
4. On the meeting detail page, click **Buat Link Undangan** to generate a one-time invitation link,
   then **Salin Link** to copy it. (Clicking this again rotates the token — the previous link stops
   working, by design, since only a hash of the token is stored server-side.)
5. Send the link to the customer through whatever channel you normally use (this app does not send
   it for you — no WhatsApp/email integration in this MVP).
6. When it's time, open the meeting detail page and click **Mulai Meeting**, then **Gabung Meeting**
   to enter the video room.

## How Customers Join

1. Customer opens the invitation link (`/join/{token}`) — no account or login needed.
2. They see the meeting title/time and confirm their name.
3. Camera/microphone permission check with a live preview.
4. They land in a waiting room that polls for staff to start the meeting.
5. Once staff clicks **Mulai Meeting**, the customer is automatically moved into the video call.
6. After staff ends the meeting, the customer sees a simple completion screen.

Invitation links are single-purpose (tied to one meeting), hashed at rest, expire automatically, and
are rejected once the meeting is cancelled or completed.

## Testing

Backend:

```bash
cd backend
composer test
# or: php artisan test
```

Covers: login (success/failure/inactive account), unauthorized dashboard access, customer CRUD,
customer identity masking, meeting creation/start/end/cancel, staff-scoped authorization
(a staff member cannot view or act on another staff member's meeting), LiveKit join-token
authorization, invitation validity (valid/invalid/expired/cancelled), the full public join flow, and
recording (egress starts on meeting start and survives egress-start failure, egress stops and marks
`processing` on meeting end, the signed LiveKit webhook flips status to `ready`/`failed`, an invalid
webhook signature is rejected, and the download route enforces `ready` status + staff/admin
ownership + file-presence).

Frontend:

```bash
cd frontend
npm run test        # Vitest + React Testing Library
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run build        # next build (production build)
```

Covers: login form validation/submission, dashboard rendering from query data, customer form
validation/submission, meeting form (including role-based staff selector visibility), device
permission check (granted/denied), waiting room content, video room connection-error state, and
meeting notes save flow.

## Recording

Starting a meeting kicks off a LiveKit **Participant Egress** job scoped to the customer's identity
only — not a Room Composite (headless-Chrome) recording of both staff and customer. That choice is
deliberate: Room Composite egress renders the call through a Chrome instance per recording, which is
real CPU/RAM overhead a small VPS (e.g. 2 vCPU / 4 GB RAM) doesn't have much room for. Participant
Egress just muxes the customer's existing audio/video tracks straight to a file — the verification
review only needs the customer's face on camera anyway.

Flow:

1. `MeetingController::start()` calls `LiveKitService::startRecording()`, which starts the egress job
   and stores the returned `egress_id` on the meeting; `recording_status` becomes `recording`. If
   starting the egress fails for any reason, that's logged and `recording_status` becomes `failed` —
   it never blocks the meeting itself from starting.
2. `MeetingController::end()`/`cancel()` call `LiveKitService::stopEgress()`; `recording_status`
   becomes `processing`.
3. LiveKit calls back to `POST /api/v1/webhooks/livekit` (signature-verified via
   `Agence104\LiveKit\WebhookReceiver`, no Sanctum session involved — LiveKit is the caller, not a
   browser) once the file finishes uploading. On `egress_ended`, `recording_status` becomes `ready`
   (or `failed`) and the object key is stored in `recording_url`.
4. Staff/admin download the file via `GET /api/v1/meetings/{meeting}/recording`
   (`MeetingController::downloadRecording()`), which streams straight from the MinIO bucket through
   Laravel's own auth check — there is no signed bucket URL or public link at any point, matching the
   original spec's requirement.

The recording never touches MySQL — only status/metadata (`recording_status`, `recording_url`,
`egress_id`) live there; the actual file lives in the `recordings` MinIO bucket
(`backend/config/filesystems.php`).

## Known Limitations

- **No WhatsApp/email delivery of invitation links.** Staff must copy and send the link manually.
- **Single MySQL server, no queue workers required.** Redis is included in Docker Compose for parity
  with the requested stack, but nothing in the app currently requires it (cache/session/queue all use
  the `database` driver).
- **"Copy invitation link" always rotates the token.** Because only a hash of the invitation token is
  stored (not the plaintext), there's no way to redisplay a previously issued link — clicking
  "Buat Link Undangan" again issues a new one and invalidates the old one.
- **No recording retention/cleanup policy yet.** Recordings accumulate in the MinIO bucket
  indefinitely; add a scheduled job (e.g. delete recordings past a retention window) once a policy is
  decided.
- **Recording adds real CPU/RAM load** (LiveKit Egress runs GStreamer per active recording). On a
  2 vCPU/4 GB VPS this is fine for a handful of concurrent calls, but watch server load if usage grows.
