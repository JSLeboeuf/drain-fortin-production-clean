#!/usr/bin/env bash
set -euo pipefail

# Cross-platform webhook tester (bash)
# Usage: ./final/WEBHOOK-TEST.sh [API_URL] [VAPI_WEBHOOK_SECRET]
# If not provided, reads from .env.local

API_URL=${1:-}
SECRET=${2:-}

if [[ -z "${API_URL:-}" ]]; then
  if [[ -f .env.local ]]; then
    API_URL=$(sed -n 's/^API_URL=//p' .env.local | tr -d '\r' | head -n1)
  fi
fi

if [[ -z "${SECRET:-}" ]]; then
  if [[ -f .env.local ]]; then
    SECRET=$(sed -n 's/^VAPI_WEBHOOK_SECRET=//p' .env.local | tr -d '\r' | head -n1)
  fi
fi

if [[ -z "${API_URL:-}" ]]; then
  echo "API_URL is required (e.g., https://<ref>.supabase.co/functions/v1)" >&2
  exit 1
fi

WEBHOOK_URL="${API_URL%/}/vapi-webhook"

echo "== Invalid signature (top-level) (expect 401/403) =="
payload_invalid=$(printf '{"type":"test-security","timestamp":"%s"}' "$(date -u +%Y-%m-%dT%H:%M:%SZ)")
code=$(curl -s -o /tmp/resp_invalid.txt -w "%{http_code}" -H 'Content-Type: application/json' -H 'x-vapi-signature: wrong_signature' -H 'Origin: https://drainfortin.com' -X POST "$WEBHOOK_URL" -d "$payload_invalid" || true)
echo "HTTP $code"
head -c 400 /tmp/resp_invalid.txt || true
echo

echo "== Invalid signature (nested message) (expect 401/403) =="
payload_invalid_nested=$(printf '{"message":{"type":"test-security"},"timestamp":"%s"}' "$(date -u +%Y-%m-%dT%H:%M:%SZ)")
code=$(curl -s -o /tmp/resp_invalid2.txt -w "%{http_code}" -H 'Content-Type: application/json' -H 'x-vapi-signature: wrong_signature' -H 'Origin: https://drainfortin.com' -X POST "$WEBHOOK_URL" -d "$payload_invalid_nested" || true)
echo "HTTP $code"
head -c 400 /tmp/resp_invalid2.txt || true
echo

if [[ -n "${SECRET:-}" ]]; then
  echo "== Valid signature health-check (top-level) (expect 200) =="
  payload_valid=$(printf '{"type":"health-check","timestamp":"%s"}' "$(date -u +%Y-%m-%dT%H:%M:%SZ)")
  sig=$(printf '%s' "$payload_valid" | openssl dgst -sha256 -hmac "$SECRET" -binary | xxd -p -c 256)
  code=$(curl -s -o /tmp/resp_valid.txt -w "%{http_code}" -H 'Content-Type: application/json' -H "x-vapi-signature: $sig" -H 'Origin: https://drainfortin.com' -X POST "$WEBHOOK_URL" -d "$payload_valid" || true)
  echo "HTTP $code"
  head -c 400 /tmp/resp_valid.txt || true
  echo

  echo "== Valid signature (nested message: status-update) (expect 200) =="
  payload_nested=$(printf '{"message":{"type":"status-update","note":"ping"},"timestamp":"%s"}' "$(date -u +%Y-%m-%dT%H:%M:%SZ)")
  sig=$(printf '%s' "$payload_nested" | openssl dgst -sha256 -hmac "$SECRET" -binary | xxd -p -c 256)
  code=$(curl -s -o /tmp/resp_valid2.txt -w "%{http_code}" -H 'Content-Type: application/json' -H "x-vapi-signature: $sig" -H 'Origin: https://drainfortin.com' -X POST "$WEBHOOK_URL" -d "$payload_nested" || true)
  echo "HTTP $code"
  head -c 400 /tmp/resp_valid2.txt || true
  echo
else
  echo "(Skip valid test: no VAPI_WEBHOOK_SECRET provided)"
fi

echo "Done"
