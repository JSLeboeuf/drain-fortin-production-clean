#!/usr/bin/env bash
set -euo pipefail

BASE=${1:-}
SECRET=${2:-}

if [[ -z "${BASE:-}" ]]; then
  BASE=$(sed -n 's/^SUPABASE_URL=//p' .env.local | tr -d '\r' | head -n1)
fi
if [[ -z "${SECRET:-}" ]]; then
  SECRET=$(sed -n 's/^VAPI_WEBHOOK_SECRET=//p' .env.local | tr -d '\r' | head -n1)
fi
[[ -z "${SECRET:-}" ]] && SECRET='drain-fortin-secret-2024'

FUNC="${BASE%/}/functions/v1/vapi-webhook"

ts() { date -u +%Y-%m-%dT%H:%M:%SZ; }

echo "== Invalid HMAC (top-level) =="
PTL=$(printf '{"type":"test-security","timestamp":"%s"}' "$(ts)")
curl -s -i -X POST -H 'Content-Type: application/json' -H 'x-vapi-signature: wrong_signature' -H 'Origin: https://drainfortin.com' "$FUNC" -d "$PTL" | sed -n '1,40p'

echo "== Invalid HMAC (nested) =="
PN=$(printf '{"message":{"type":"test-security"},"timestamp":"%s"}' "$(ts)")
curl -s -i -X POST -H 'Content-Type: application/json' -H 'x-vapi-signature: wrong_signature' -H 'Origin: https://drainfortin.com' "$FUNC" -d "$PN" | sed -n '1,40p'

echo "== Valid HMAC (nested: status-update) =="
PV=$(printf '{"message":{"type":"status-update","note":"ping"},"timestamp":"%s"}' "$(ts)")
SIG=$(printf '%s' "$PV" | openssl dgst -sha256 -hmac "$SECRET" -binary | xxd -p -c 256)
curl -s -i -X POST -H 'Content-Type: application/json' -H "x-vapi-signature: $SIG" -H 'Origin: https://drainfortin.com' "$FUNC" -d "$PV" | sed -n '1,60p'

echo "== Valid HMAC (top-level: health-check) =="
PH=$(printf '{"type":"health-check","timestamp":"%s"}' "$(ts)")
SIG=$(printf '%s' "$PH" | openssl dgst -sha256 -hmac "$SECRET" -binary | xxd -p -c 256)
curl -s -i -X POST -H 'Content-Type: application/json' -H "x-vapi-signature: $SIG" -H 'Origin: https://drainfortin.com' "$FUNC" -d "$PH" | sed -n '1,60p'

echo "== OPTIONS and GET (no signature) =="
curl -s -i -X OPTIONS -H 'Origin: https://drainfortin.com' "$FUNC" | sed -n '1,40p'
curl -s -i -H 'Origin: https://drainfortin.com' "$FUNC" | sed -n '1,40p'

echo "Done"

