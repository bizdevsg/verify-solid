#!/bin/bash
# One-time bootstrap for Let's Encrypt certificates.
#
# Nginx refuses to start without a certificate file at the path it's
# configured to use, and Certbot's webroot challenge needs nginx already
# serving HTTP — so a real cert can't exist before nginx starts, and nginx
# can't start before a cert exists. This script breaks that chicken-and-egg
# problem: it creates a throwaway self-signed cert first, starts nginx with
# that, requests the real certificate over HTTP, then reloads nginx onto it.
#
# Run from the repository root, after copying .env.production -> .env:
#   ./infrastructure/certbot/init-letsencrypt.sh
#
# Requires DNS A records for both DOMAIN and livekit.DOMAIN pointing at this
# server's public IP before running (the livekit subdomain is what gives the
# video call signaling connection its own wss:// endpoint — see DEPLOYMENT.md).
set -euo pipefail

cd "$(dirname "$0")/../.."

if [ ! -f .env ]; then
    echo "Missing .env in repo root. Copy .env.production.example -> .env and fill it in first." >&2
    exit 1
fi

# shellcheck disable=SC1091
source .env

if [ -z "${DOMAIN:-}" ] || [ -z "${CERTBOT_EMAIL:-}" ]; then
    echo "DOMAIN and CERTBOT_EMAIL must be set in .env" >&2
    exit 1
fi

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

echo "== Rendering nginx config for ${DOMAIN} =="
./infrastructure/nginx/render-prod-conf.sh

echo "== Rendering LiveKit config =="
./infrastructure/livekit/render-prod-conf.sh

echo "== Creating a temporary self-signed certificate for ${DOMAIN} =="
$COMPOSE run --rm --entrypoint "sh -c '\
  mkdir -p /etc/letsencrypt/live/${DOMAIN} && \
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/${DOMAIN}/privkey.pem \
    -out /etc/letsencrypt/live/${DOMAIN}/fullchain.pem \
    -subj /CN=localhost'" certbot

echo "== Starting nginx with the temporary certificate =="
$COMPOSE up -d nginx

echo "== Removing the temporary certificate so Certbot issues a fresh one =="
$COMPOSE run --rm --entrypoint "sh -c '\
  rm -rf /etc/letsencrypt/live/${DOMAIN} \
         /etc/letsencrypt/archive/${DOMAIN} \
         /etc/letsencrypt/renewal/${DOMAIN}.conf'" certbot

echo "== Requesting the real certificate from Let's Encrypt (covers ${DOMAIN} and livekit.${DOMAIN}) =="
$COMPOSE run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --email ${CERTBOT_EMAIL} -d ${DOMAIN} -d livekit.${DOMAIN} \
    --rsa-key-size 2048 --agree-tos --non-interactive --force-renewal" certbot

echo "== Reloading nginx with the real certificate =="
$COMPOSE exec nginx nginx -s reload

echo "Done. ${DOMAIN} should now be serving a valid Let's Encrypt certificate."
echo "Set up renewal with a cron entry, e.g.:"
echo "  0 3 * * * cd $(pwd) && $COMPOSE run --rm certbot renew --quiet && $COMPOSE exec nginx nginx -s reload"
