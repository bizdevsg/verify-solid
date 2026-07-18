#!/bin/sh
# Renders infrastructure/nginx/prod.conf.template -> prod.conf, substituting
# ${DOMAIN} with the value from the repo-root .env file. Re-run this whenever
# DOMAIN changes. Uses plain sed (no gettext/envsubst dependency).
set -eu

cd "$(dirname "$0")/../.."

if [ ! -f .env ]; then
    echo "Missing .env in repo root. Copy .env.production.example -> .env and fill it in first." >&2
    exit 1
fi

# shellcheck disable=SC1091
. ./.env

if [ -z "${DOMAIN:-}" ]; then
    echo "DOMAIN must be set in .env" >&2
    exit 1
fi

sed "s/\${DOMAIN}/${DOMAIN}/g" infrastructure/nginx/prod.conf.template > infrastructure/nginx/prod.conf

echo "Rendered infrastructure/nginx/prod.conf for domain: ${DOMAIN}"
