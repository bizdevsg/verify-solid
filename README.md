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
- One-to-one video calls via Agora (`agora-rtc-sdk-ng`) — Agora's own global network handles
  signaling/media, so there's no self-hosted media server to run or firewall ports to open for it
- Call recording: staff + customer combined into one file via Agora Cloud Recording, stored in
  MinIO (S3-compatible), and downloadable only through an authenticated Laravel route — never a
  public URL
- Meeting notes, verification result, and history
- Meeting event timeline (invitation opened, customer waiting, meeting started/ended, recording
  started/ready/failed, etc.)
- Docker Compose environment: nginx, frontend, backend, MySQL, Redis, MinIO

## Technology Stack

**Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, TanStack Query,
React Hook Form, Zod, `agora-rtc-sdk-ng`

**Backend:** Laravel 11, PHP 8.4+, Laravel Sanctum, MySQL

**Video:** Agora (managed — RTC + Cloud Recording; no self-hosted media server)

**Infra:** Docker Compose, nginx, MySQL, Redis, MinIO (recording storage)

## Folder Structure

```
.
├── backend/                  Laravel API (app/, routes/, database/, tests/)
│   └── app/Support/AgoraToken/  Vendored official Agora RTC token generator (no PHP package exists)
├── frontend/                 Next.js app (src/app, src/components, src/hooks, src/lib)
├── infrastructure/
│   └── nginx/default.conf    Reverse proxy: /api + /sanctum → backend, everything else → frontend
├── docker-compose.yml
└── .env.example              Root compose env (DB credentials, MinIO credentials)
```

## Local Installation (without Docker)

Requirements: PHP 8.4+, Composer, Node 20+, MySQL 8, and an Agora account (free tier) for real video calls.

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

### 3. Agora (required for actual video calls)

Without real Agora credentials, every other feature works (auth, CRUD, invitation links, device
check, waiting room) — only the live video connection itself will show "Menghubungkan..." and never
connect. Create a project in the [Agora Console](https://console.agora.io) and set in `backend/.env`:

- `AGORA_APP_ID` / `AGORA_APP_CERTIFICATE` — from the project itself
- `AGORA_CUSTOMER_ID` / `AGORA_CUSTOMER_SECRET` — separate credentials, generated under
  Agora Console > RESTful API; only used to authenticate Cloud Recording API calls

Video calls work as soon as `AGORA_APP_ID`/`AGORA_APP_CERTIFICATE` are set — no server to run
locally, since Agora's own network handles signaling and media. Recording additionally needs a
**publicly reachable** MinIO endpoint (Agora's Cloud Recording runs on Agora's servers, not your
machine, so it has to upload over the real internet) — realistically only practical via a real
deployment or a tunnel (e.g. ngrok) pointed at the `minio` container; see [DEPLOYMENT.md](DEPLOYMENT.md).

## Docker (local, self-hosted try-out — no HTTPS)

```bash
cp .env.example .env
cp backend/.env.example backend/.env   # already has a working APP_KEY — add your own Agora credentials
docker compose up -d --build
docker compose exec backend php artisan db:seed   # migrations run automatically on start
```

The app is then available at `http://localhost` (nginx routes `/api/*` and `/sanctum/*` to the
Laravel backend, everything else to the Next.js frontend). Video calls connect directly from the
browser to Agora's network — no media ports to publish for this stack.

`minio-init` creates the `recordings` bucket automatically on first start, but recording itself
won't complete end-to-end locally — see the Agora section above for why (Agora's servers can't
reach a docker-internal MinIO address).

To stop: `docker compose down` (add `-v` to also drop the MySQL and MinIO data volumes).

**Deploying to a real production server (domain + HTTPS + hardened config)?** See
[DEPLOYMENT.md](DEPLOYMENT.md) — don't reuse the seeded demo accounts or dev Agora credentials there.

## Environment Variables

See `.env.example` (root, for Docker Compose), `backend/.env.example`, and `frontend/.env.example`
for the full list. Notable ones:

| Variable | Where | Purpose |
|---|---|---|
| `SANCTUM_STATEFUL_DOMAINS` | backend | Origins allowed to use cookie-based (SPA) auth |
| `FRONTEND_URL` | backend | Used to build invitation links returned by the API |
| `AGORA_APP_ID` / `AGORA_APP_CERTIFICATE` | backend | Server-side RTC token generation. App ID alone is sent to the browser at join time; the certificate never is. |
| `AGORA_CUSTOMER_ID` / `AGORA_CUSTOMER_SECRET` | backend | Authenticates Cloud Recording REST API calls only. **Never exposed to the browser.** |
| `AGORA_RECORDING_STORAGE_ENDPOINT` | backend | Public hostname for the MinIO bucket — must be reachable from Agora's servers, not just this compose network. |
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
(a staff member cannot view or act on another staff member's meeting), Agora join-token
authorization, invitation validity (valid/invalid/expired/cancelled), the full public join flow, and
recording (Cloud Recording starts on meeting start and survives a failed start, stops and marks
`ready`/`failed` synchronously on meeting end — Agora's stop call responds with the final file
directly, no webhook needed — and the download route enforces `ready` status + staff/admin
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

## Video & Recording (Agora)

The app originally self-hosted LiveKit for video and recording. It migrated to Agora (a managed
service) after production reports of calls randomly disconnecting for both parties — diagnostics
ruled out the server (no crashes, low CPU/RAM, clean logs) and pointed at client-side networks
blocking/throttling the direct UDP media path. Agora's globally distributed network gives clients a
much larger set of relay paths to fall back on, which is exactly the kind of intermittent
NAT/firewall issue a single self-hosted media server struggles with.

Practical effect of the move: no media server to run, no UDP port range to open in the firewall, no
livekit subdomain/TURN config to maintain — Agora's SDK connects directly from the browser to
Agora's network. The tradeoff is a small per-minute cost past a monthly free tier, versus a flat VPS
bill either way.

Recording uses Agora's **Cloud Recording** REST API in composite (`mix`) mode — staff and customer
combined into a single file. Unlike the old LiveKit Egress setup, this doesn't run on this VPS at
all (no CPU/RAM cost to us), so there was no longer a reason to record only one side.

Flow:

1. `MeetingController::start()` calls `AgoraService::startRecording()`, which acquires a resource ID
   and starts the recording job, storing `agora_resource_id` + `agora_recording_sid` on the meeting;
   `recording_status` becomes `recording`. If starting fails for any reason, that's logged and
   `recording_status` becomes `failed` — it never blocks the meeting itself from starting.
2. `MeetingController::end()`/`cancel()` call `AgoraService::stopRecording()`. Unlike LiveKit's async
   egress + webhook, **Agora's stop call responds synchronously** with the final uploaded file once
   it's ready — so `recording_status` goes straight to `ready` (or `failed`), no webhook or polling
   needed.
3. Staff/admin download the file via `GET /api/v1/meetings/{meeting}/recording`
   (`MeetingController::downloadRecording()`), which streams straight from the MinIO bucket through
   Laravel's own auth check — there is no signed bucket URL or public link at any point, matching the
   original spec's requirement.

The recording never touches MySQL — only status/metadata (`recording_status`, `recording_url`,
`agora_resource_id`, `agora_recording_sid`) live there; the actual file lives in the `recordings`
MinIO bucket (`backend/config/filesystems.php`), configured as vendor `11` ("self-built S3-compatible
storage") in Agora's `storageConfig` — see `AgoraService::startRecording()`.

RTC token generation uses the official Agora token algorithm (`RtcTokenBuilder2`/`AccessToken2`),
vendored directly into `backend/app/Support/AgoraToken/` since Agora doesn't publish a Composer
package for it (only a GitHub sample), loaded via a `files` autoload entry in `composer.json`.

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
- **Agora usage is metered.** Video calls and recording both draw from a monthly free-minute pool,
  then bill per minute past it — cost scales with call volume, unlike the old flat-VPS-cost LiveKit
  setup. Budget for this if daily verification volume grows significantly.
- **MinIO is internet-reachable in production.** Required so Agora's Cloud Recording servers can
  upload to it — access is gated entirely by the access key/secret (see DEPLOYMENT.md's security
  checklist), there's no additional network-level restriction on who can reach the endpoint.
