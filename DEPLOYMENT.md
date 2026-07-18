# Production Deployment Guide

Target setup: **one VPS running Docker Compose**, one domain you already own, LiveKit self-hosted
on the same machine. This assumes Ubuntu/Debian-style VPS; adjust package manager commands if
you're on something else.

## Architecture

```
Internet
   │
   ├── https://yourdomain.com          → nginx (443) → frontend (Next.js) / backend (Laravel API)
   ├── https://livekit.yourdomain.com  → nginx (443) → livekit (signaling, WebSocket)
   └── UDP 50000-50100, TCP 7881       → livekit directly (media/RTP — nginx can't proxy this)
```

Two DNS records, one server, one Let's Encrypt certificate covering both hostnames.

## 1. Prerequisites

- A VPS with Docker + the Compose plugin installed (`docker compose version` should work).
  Minimum realistically: 2 vCPU / 4GB RAM (MySQL + LiveKit + Next.js + Laravel all on one box).
- A domain you control, able to add DNS records.
- Ports **80, 443** open (HTTP/HTTPS), **7880, 7881** (TCP, LiveKit signaling/RTC), and
  **50000-50100/UDP** (LiveKit media) open in your VPS firewall / cloud security group.

### DNS

Point both of these at your VPS's public IP before doing anything else — Let's Encrypt validates
ownership over HTTP, so both must resolve before you request the certificate:

```
yourdomain.com          A    <VPS_IP>
livekit.yourdomain.com  A    <VPS_IP>
```

## 2. Get the code onto the server

```bash
git clone <your-repo-url> solid-video-verification
cd solid-video-verification
```

## 3. Configure environment files

```bash
cp .env.production.example .env
cp backend/.env.production.example backend/.env
```

Edit **`.env`** (repo root) and fill in every `CHANGE_ME`:

- `DOMAIN` — your real domain (no `https://`, no trailing slash)
- `CERTBOT_EMAIL` — used for Let's Encrypt expiry notices
- `DB_PASSWORD` / `DB_ROOT_PASSWORD` — generate with `openssl rand -hex 24`
- `LIVEKIT_API_KEY` — generate with `openssl rand -hex 16`
- `LIVEKIT_API_SECRET` — generate with `openssl rand -hex 32`

Edit **`backend/.env`** and fill in:

- `APP_URL`, `FRONTEND_URL`, `SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN`,
  `CORS_ALLOWED_ORIGINS` — replace `yourdomain.com` with your real domain
- `DB_PASSWORD` — must match `DB_PASSWORD` in the root `.env`
- Leave `APP_KEY` empty for now — the next step generates it

**Do not skip this step or leave any `CHANGE_ME` in place.** `APP_DEBUG=false` and
`SESSION_SECURE_COOKIE=true` are already set correctly in the template — don't flip them back.

## 4. Build the images

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
```

## 5. Generate the Laravel app key

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm backend \
  php artisan key:generate --show
```

Copy the `base64:...` output into `backend/.env`'s `APP_KEY=`.

## 6. Obtain the TLS certificate

```bash
chmod +x infrastructure/certbot/init-letsencrypt.sh \
          infrastructure/nginx/render-prod-conf.sh \
          infrastructure/livekit/render-prod-conf.sh
./infrastructure/certbot/init-letsencrypt.sh
```

This renders the nginx and LiveKit configs from your `.env`, starts nginx with a throwaway
certificate, requests the real one from Let's Encrypt for both `yourdomain.com` and
`livekit.yourdomain.com`, then reloads nginx onto it. It only needs to run once — renewal is
handled automatically afterwards by the `certbot` service's background loop (checks twice a day,
renews when within 30 days of expiry).

If it fails, the most common cause is DNS not having propagated yet, or port 80 not actually being
reachable from the internet (check your firewall/security group).

## 7. Start everything

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

The backend container's entrypoint automatically waits for MySQL, runs migrations, and caches
config/routes on every start — you don't need to run `migrate` by hand.

## 8. Create your first admin account

**Do not run `php artisan db:seed`** — the demo seeder creates fake accounts with the
well-known password `password`. Instead:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend \
  php artisan app:create-user --name="Nama Anda" --email="anda@yourdomain.com" --role=admin
```

You'll be prompted for a password (input hidden). Use this account to log in at
`https://yourdomain.com/login` and create staff accounts and real customer/meeting data from there.

## 9. Verify

- `https://yourdomain.com` — should load the login page over a valid HTTPS certificate (padlock,
  no warnings)
- Log in, check the dashboard loads
- Create a test customer + meeting, generate an invitation link, open it in a private window
- Start the meeting as staff and join as the customer — video should connect (check the browser
  console for `wss://livekit.yourdomain.com` connecting successfully, not `ERR_CONNECTION_REFUSED`)

## Updating / redeploying

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Migrations run automatically on container start. If a deploy ever needs a config change (new
`DOMAIN`, rotated LiveKit keys), re-run the two render scripts before restarting nginx/livekit:

```bash
./infrastructure/nginx/render-prod-conf.sh
./infrastructure/livekit/render-prod-conf.sh
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d nginx livekit
```

## Backups

The MySQL data lives in the `db_data` Docker volume. Back it up regularly:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec db \
  mysqldump -u root -p"$DB_ROOT_PASSWORD" solid_video_verification > backup-$(date +%F).sql
```

Automate this with a cron job and copy the dumps off the server (a bind-mounted host directory or
object storage — this repo doesn't set that up for you).

## Certificate renewal

Handled automatically by the `certbot` service (runs `certbot renew` every 12 hours in a loop and
reloads nothing itself — nginx picks up renewed certs on its own next TLS handshake since it reads
the cert files fresh; a full `nginx -s reload` isn't required for Let's Encrypt's in-place renewal,
but if you ever notice a stale cert being served, force it with:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec nginx nginx -s reload
```

## Security checklist

- [ ] No `CHANGE_ME` left in `.env` or `backend/.env`
- [ ] `APP_DEBUG=false`, `APP_ENV=production` in `backend/.env`
- [ ] `SESSION_SECURE_COOKIE=true` in `backend/.env` (requires HTTPS, which you now have)
- [ ] Demo seeder (`php artisan db:seed`) never run against this database
- [ ] First admin created via `php artisan app:create-user`, not the seeded `admin@example.local`
- [ ] `DB_PASSWORD` / `DB_ROOT_PASSWORD` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` are unique,
      generated values — not copied from any `.example` file
- [ ] Firewall only exposes 80, 443, 7880/7881, 50000-50100/udp, and SSH — not 3306 (MySQL) or
      9000 (php-fpm), which should stay internal to the Docker network
- [ ] A backup routine exists for the `db_data` volume and runs somewhere other than this server

## Known limitations that carry over from the MVP

Recording, WhatsApp/email delivery of invitation links, and multi-server/HA setups are out of
scope here too — see the README's "Known Limitations" section. This guide covers a single-VPS
deployment sized for an MVP's real traffic, not a highly-available production cluster.
