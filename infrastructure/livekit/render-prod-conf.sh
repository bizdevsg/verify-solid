#!/bin/sh
# Renders infrastructure/livekit/livekit.prod.yaml.template -> livekit.prod.yaml
# and egress.prod.yaml.template -> egress.prod.yaml, substituting
# LIVEKIT_API_KEY / LIVEKIT_API_SECRET / DOMAIN from the repo-root .env.
# Re-run this whenever those values change. Uses plain sed (no gettext/envsubst
# dependency).
set -eu

cd "$(dirname "$0")/../.."

if [ ! -f .env ]; then
    echo "Missing .env in repo root. Copy .env.production.example -> .env and fill it in first." >&2
    exit 1
fi

# shellcheck disable=SC1091
. ./.env

if [ -z "${LIVEKIT_API_KEY:-}" ] || [ -z "${LIVEKIT_API_SECRET:-}" ]; then
    echo "LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set in .env" >&2
    exit 1
fi

if [ -z "${DOMAIN:-}" ]; then
    echo "DOMAIN must be set in .env" >&2
    exit 1
fi

sed \
    -e "s/\${LIVEKIT_API_KEY}/${LIVEKIT_API_KEY}/g" \
    -e "s/\${LIVEKIT_API_SECRET}/${LIVEKIT_API_SECRET}/g" \
    -e "s/\${DOMAIN}/${DOMAIN}/g" \
    infrastructure/livekit/livekit.prod.yaml.template > infrastructure/livekit/livekit.prod.yaml

sed \
    -e "s/\${LIVEKIT_API_KEY}/${LIVEKIT_API_KEY}/g" \
    -e "s/\${LIVEKIT_API_SECRET}/${LIVEKIT_API_SECRET}/g" \
    -e "s/\${DOMAIN}/${DOMAIN}/g" \
    infrastructure/livekit/egress.prod.yaml.template > infrastructure/livekit/egress.prod.yaml

echo "Rendered infrastructure/livekit/livekit.prod.yaml"
echo "Rendered infrastructure/livekit/egress.prod.yaml"
