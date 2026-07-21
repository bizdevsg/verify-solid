# Production Deployment Guide

Target setup: **one VPS running Docker Compose**, one domain you already own, video calls/recording
handled by Agora (managed — no self-hosted media server). This assumes Ubuntu/Debian-style VPS;
adjust package manager commands if you're on something else.

## Architecture

```
Internet
   │
   ├── https://yourdomain.com          → nginx (443) → frontend (Next.js) / backend (Laravel API)
   ├── https://storage.yourdomain.com  → nginx (443) → minio (recording storage)
   └── (video/audio itself never touches this server — browsers connect directly
        to Agora's network; Agora's Cloud Recording servers upload finished
        recordings to storage.yourdomain.com over the internet)
```

Two DNS records, one server, one Let's Encrypt certificate covering both hostnames. Notably
smaller than a self-hosted-media-server setup: no media port range to open, no TURN server to run.

## 1. Prerequisites

- A VPS with Docker + the Compose plugin installed (`docker compose version` should work).
  Minimum realistically: 2 vCPU / 4GB RAM (MySQL + Next.js + Laravel all on one box — video
  encoding/recording happens on Agora's infrastructure, not here).
- A domain you control, able to add DNS records.
- An [Agora](https://console.agora.io) account and project — see step 3 below for exactly which
  credentials you need.
- Ports **80, 443** open (HTTP/HTTPS) and SSH in your VPS firewall / cloud security group. Nothing
  else needs to be opened — video/audio media never touches this server directly.

### DNS

Point both of these at your VPS's public IP before doing anything else — Let's Encrypt validates
ownership over HTTP, so both must resolve before you request the certificate:

```
yourdomain.com          A    <VPS_IP>
storage.yourdomain.com  A    <VPS_IP>
```

## 2. Get the code onto the server

```bash
git clone <your-repo-url> solid-video-verification
cd solid-video-verification
```

## 3. Set up Agora

1. Create a project in the [Agora Console](https://console.agora.io). Copy its **App ID** and
   enable/copy its **App Certificate** (needed so tokens are properly signed — don't run in
   "App ID only" testing mode for production).
2. Under **Agora Console > RESTful API**, generate a **Customer ID** / **Customer Secret** pair —
   these are separate from the App ID/Certificate above, and are only used to authenticate Cloud
   Recording API calls.
3. Note your expected call volume — Agora bills per participant-minute past a monthly free tier;
   see the README's "Video & Recording (Agora)" section for the cost model.

## 4. Configure environment files

```bash
cp .env.production.example .env
cp backend/.env.production.example backend/.env
```

Edit **`.env`** (repo root) and fill in every `CHANGE_ME`:

- `DOMAIN` — your real domain (no `https://`, no trailing slash)
- `CERTBOT_EMAIL` — used for Let's Encrypt expiry notices
- `DB_PASSWORD` / `DB_ROOT_PASSWORD` — generate with `openssl rand -hex 24`
- `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` — generate with `openssl rand -hex 24`. This bucket is
  reachable from the public internet (see Architecture above), so don't reuse the `minioadmin` dev
  default here.

Edit **`backend/.env`** and fill in:

- `APP_URL`, `FRONTEND_URL`, `SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN`,
  `CORS_ALLOWED_ORIGINS` — replace `yourdomain.com` with your real domain
- `DB_PASSWORD` — must match `DB_PASSWORD` in the root `.env`
- `AGORA_APP_ID` / `AGORA_APP_CERTIFICATE` / `AGORA_CUSTOMER_ID` / `AGORA_CUSTOMER_SECRET` — from
  step 3
- `AGORA_RECORDING_STORAGE_ENDPOINT` — this one is actually overridden automatically by
  `docker-compose.prod.yml` from your root `.env`'s `DOMAIN` (as `storage.$DOMAIN`), so you can
  leave the placeholder here; it only matters if you ever run the backend outside Docker
- Leave `APP_KEY` empty for now — the next step generates it

**Do not skip this step or leave any `CHANGE_ME` in place.** `APP_DEBUG=false` and
`SESSION_SECURE_COOKIE=true` are already set correctly in the template — don't flip them back.

## 5. Build the images

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
```

## 6. Generate the Laravel app key

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm backend \
  php artisan key:generate --show
```

Copy the `base64:...` output into `backend/.env`'s `APP_KEY=`.

## 7. Obtain the TLS certificate

```bash
chmod +x infrastructure/certbot/init-letsencrypt.sh \
          infrastructure/nginx/render-prod-conf.sh
./infrastructure/certbot/init-letsencrypt.sh
```

This renders the nginx config from your `.env`, starts nginx with a throwaway certificate, requests
the real one from Let's Encrypt for both `yourdomain.com` and `storage.yourdomain.com`, then reloads
nginx onto it. It only needs to run once — renewal is handled automatically afterwards by the
`certbot` service's background loop (checks twice a day, renews when within 30 days of expiry).

If it fails, the most common cause is DNS not having propagated yet, or port 80 not actually being
reachable from the internet (check your firewall/security group).

## 8. Start everything

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

The backend container's entrypoint automatically waits for MySQL, runs migrations, and caches
config/routes on every start — you don't need to run `migrate` by hand. `minio-init` creates the
`recordings` bucket automatically on first start too.

## 9. Create your first admin account

**Do not run `php artisan db:seed`** — the demo seeder creates fake accounts with the
well-known password `password`. Instead:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend \
  php artisan app:create-user --name="Nama Anda" --email="anda@yourdomain.com" --role=admin
```

You'll be prompted for a password (input hidden). Use this account to log in at
`https://yourdomain.com/login` and create staff accounts and real customer/meeting data from there.

## 10. Verify

- `https://yourdomain.com` — should load the login page over a valid HTTPS certificate (padlock,
  no warnings)
- Log in, check the dashboard loads
- Create a test customer + meeting, generate an invitation link, open it in a private window
- Start the meeting as staff and join as the customer — video should connect. Check the browser
  console for Agora's `connection-state-change` log settling on `CONNECTED`, not stuck on
  `CONNECTING`/`RECONNECTING`
- End the meeting, wait a few seconds, then refresh the meeting detail page — "Rekaman" should move
  straight to a working "Unduh Rekaman" link (no "Sedang diproses..." limbo state, since Agora's
  stop call responds synchronously). If it flips to "Gagal diproses", check the backend log:
  `docker compose -f docker-compose.yml -f docker-compose.prod.yml logs backend | grep -i agora`
  — this usually means either the Customer ID/Secret are wrong (Cloud Recording API calls get
  rejected) or `storage.yourdomain.com` isn't actually reachable from the internet yet (DNS not
  propagated, or the cert/nginx block isn't live) so Agora's upload fails.

## Updating / redeploying

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Migrations run automatically on container start. If a deploy ever needs a config change (new
`DOMAIN`), re-render nginx and restart it:

```bash
./infrastructure/nginx/render-prod-conf.sh
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d nginx
```

## Backups

The MySQL data lives in the `db_data` Docker volume. Back it up regularly:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec db \
  mysqldump -u root -p"$DB_ROOT_PASSWORD" solid_video_verification > backup-$(date +%F).sql
```

Automate this with a cron job and copy the dumps off the server (a bind-mounted host directory or
object storage — this repo doesn't set that up for you).

Call recordings live separately, in the `minio_data` Docker volume. There's no retention/cleanup
policy configured (see README "Known Limitations") — recordings accumulate indefinitely, so back up
and/or prune `minio_data` according to whatever policy you land on.

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
- [ ] `DB_PASSWORD` / `DB_ROOT_PASSWORD` / `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` /
      `AGORA_APP_CERTIFICATE` / `AGORA_CUSTOMER_SECRET` are unique, generated values — not copied
      from any `.example` file
- [ ] Firewall only exposes 80, 443, and SSH — not 3306 (MySQL), 9000 (php-fpm), or MinIO's raw
      9000/9001, all of which should stay internal to the Docker network (MySQL/Redis/MinIO have no
      host port mapping at all by default — nothing to double-check there unless you added one
      yourself; MinIO is only reachable via nginx's `storage.yourdomain.com` TLS proxy)
- [ ] `storage.yourdomain.com` is only reachable with a valid MinIO access key/secret — there's no
      additional network-level restriction, so that credential pair is the entire access boundary
- [ ] A backup routine exists for the `db_data` volume and runs somewhere other than this server
- [ ] Agora billing/usage alerts are configured in the Agora Console if call volume could grow
      unexpectedly — usage is metered, unlike the rest of this stack's flat VPS cost

## Known limitations that carry over from the MVP

WhatsApp/email delivery of invitation links, multi-server/HA setups, and a recording
retention/cleanup policy are out of scope here too — see the README's "Known Limitations" section.
This guide covers a single-VPS deployment sized for an MVP's real traffic, not a highly-available
production cluster.
