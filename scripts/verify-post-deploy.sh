#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-leadspark}"
TARGET_URL="${TARGET_URL:-http://127.0.0.1:4321}"
HEALTH_PATH="${HEALTH_PATH:-/api/health}"
EXPECTED_PAGE_TEXT="${EXPECTED_PAGE_TEXT:-Centro Fisioterapia Movimento}"
EXPECTED_HEALTH_BODY="${EXPECTED_HEALTH_BODY:-\"status\":\"ok\"}"
ADMIN_PROBE_PATH="${ADMIN_PROBE_PATH:-/api/lead}"
ADMIN_PROBE_EXPECTED_BLOCKED_CODES="${ADMIN_PROBE_EXPECTED_BLOCKED_CODES:-401 503}"
ADMIN_PROBE_TOKEN="${ADMIN_PROBE_TOKEN:-}"
REGISTRY_URL="${REGISTRY_URL:-}"
IMAGE_NAME="${IMAGE_NAME:-}"
EXPECTED_TAG="${EXPECTED_TAG:-latest}"
EXPECTED_SHA_TAG="${EXPECTED_SHA_TAG:-}"
EXPECTED_RUNTIME_SHA="${EXPECTED_RUNTIME_SHA:-${EXPECTED_SHA_TAG}}"
REQUEST_TIMEOUT_SECONDS="${REQUEST_TIMEOUT_SECONDS:-5}"
EVIDENCE_DIR="${EVIDENCE_DIR:-ops/evidence/deploy-checks}"

TARGET_ROOT="${TARGET_URL%/}"
HEALTH_URL="${TARGET_ROOT}${HEALTH_PATH}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RELEASE_ID="${EXPECTED_SHA_TAG:-${EXPECTED_TAG}}"
SAFE_SERVICE_NAME="$(printf "%s" "${SERVICE_NAME}" | tr -cs '[:alnum:]-_' '-')"
SAFE_RELEASE_ID="$(printf "%s" "${RELEASE_ID}" | tr -cs '[:alnum:]-_' '-')"

if [[ -z "${SAFE_RELEASE_ID}" ]]; then
  SAFE_RELEASE_ID="unspecified-release"
fi

mkdir -p "${EVIDENCE_DIR}"
EVIDENCE_FILE="${EVIDENCE_DIR}/${TIMESTAMP}_${SAFE_SERVICE_NAME}_${SAFE_RELEASE_ID}.md"

HOMEPAGE_BODY_FILE="/tmp/${SERVICE_NAME}-${TIMESTAMP}-homepage.txt"
HOMEPAGE_STATUS_FILE="/tmp/${SERVICE_NAME}-${TIMESTAMP}-homepage-status.txt"
HEALTH_BODY_FILE="/tmp/${SERVICE_NAME}-${TIMESTAMP}-health.txt"
HEALTH_STATUS_FILE="/tmp/${SERVICE_NAME}-${TIMESTAMP}-health-status.txt"
ADMIN_BLOCKED_BODY_FILE="/tmp/${SERVICE_NAME}-${TIMESTAMP}-admin-blocked.txt"
ADMIN_BLOCKED_STATUS_FILE="/tmp/${SERVICE_NAME}-${TIMESTAMP}-admin-blocked-status.txt"
ADMIN_AUTH_BODY_FILE="/tmp/${SERVICE_NAME}-${TIMESTAMP}-admin-auth.txt"
ADMIN_AUTH_STATUS_FILE="/tmp/${SERVICE_NAME}-${TIMESTAMP}-admin-auth-status.txt"

cleanup() {
  rm -f \
    "${HOMEPAGE_BODY_FILE}" \
    "${HOMEPAGE_STATUS_FILE}" \
    "${HEALTH_BODY_FILE}" \
    "${HEALTH_STATUS_FILE}" \
    "${ADMIN_BLOCKED_BODY_FILE}" \
    "${ADMIN_BLOCKED_STATUS_FILE}" \
    "${ADMIN_AUTH_BODY_FILE}" \
    "${ADMIN_AUTH_STATUS_FILE}"
}
trap cleanup EXIT

log() {
  echo "$*" | tee -a "${EVIDENCE_FILE}"
}

fail() {
  local reason="$1"
  log ""
  log "Result: FAIL"
  log "Failure reason: ${reason}"
  log "Evidence file: ${EVIDENCE_FILE}"
  exit 1
}

http_get_with_single_retry() {
  local url="$1"
  local body_file="$2"
  local status_file="$3"
  local attempt=1

  while true; do
    if curl -sS \
      --connect-timeout "${REQUEST_TIMEOUT_SECONDS}" \
      --max-time "${REQUEST_TIMEOUT_SECONDS}" \
      -o "${body_file}" \
      -w "%{http_code}" \
      "${url}" > "${status_file}"; then
      return 0
    fi

    if (( attempt >= 2 )); then
      return 1
    fi

    attempt=$((attempt + 1))
    sleep 1
  done
}

http_get_with_headers_single_retry() {
  local url="$1"
  local body_file="$2"
  local status_file="$3"
  shift 3
  local attempt=1

  while true; do
    if curl -sS \
      --connect-timeout "${REQUEST_TIMEOUT_SECONDS}" \
      --max-time "${REQUEST_TIMEOUT_SECONDS}" \
      "$@" \
      -o "${body_file}" \
      -w "%{http_code}" \
      "${url}" > "${status_file}"; then
      return 0
    fi

    if (( attempt >= 2 )); then
      return 1
    fi

    attempt=$((attempt + 1))
    sleep 1
  done
}

write_header() {
  local registry_tags_url="n/a"
  if [[ -n "${REGISTRY_URL}" && -n "${IMAGE_NAME}" ]]; then
    registry_tags_url="${REGISTRY_URL%/}/v2/${IMAGE_NAME}/tags/list"
  fi

  cat > "${EVIDENCE_FILE}" <<HDR
# Deploy Verification Evidence

- Service: ${SERVICE_NAME}
- Timestamp (UTC): ${TIMESTAMP}
- Target URL: ${TARGET_URL}
- Health URL: ${HEALTH_URL}
- Release identifier: ${RELEASE_ID}
- Registry tags URL: ${registry_tags_url}
- Expected runtime SHA: ${EXPECTED_RUNTIME_SHA:-n/a}

## Checks
HDR
}

write_header

log "- Homepage availability: running"
if ! http_get_with_single_retry "${TARGET_ROOT}/" "${HOMEPAGE_BODY_FILE}" "${HOMEPAGE_STATUS_FILE}"; then
  fail "Cannot reach homepage ${TARGET_ROOT}/ after one retry"
fi
HOMEPAGE_STATUS="$(cat "${HOMEPAGE_STATUS_FILE}")"
if [[ "${HOMEPAGE_STATUS}" != "200" ]]; then
  fail "Homepage returned ${HOMEPAGE_STATUS} (expected 200)"
fi
HOMEPAGE_BODY="$(cat "${HOMEPAGE_BODY_FILE}")"
if [[ "${HOMEPAGE_BODY}" != *"${EXPECTED_PAGE_TEXT}"* ]]; then
  fail "Homepage content is missing expected marker: ${EXPECTED_PAGE_TEXT}"
fi
log "- Homepage availability: pass (status=${HOMEPAGE_STATUS})"
log "- Homepage marker text: pass (${EXPECTED_PAGE_TEXT})"

log "- Health endpoint: running"
if ! http_get_with_single_retry "${HEALTH_URL}" "${HEALTH_BODY_FILE}" "${HEALTH_STATUS_FILE}"; then
  fail "Cannot reach health endpoint ${HEALTH_URL} after one retry"
fi
HEALTH_STATUS="$(cat "${HEALTH_STATUS_FILE}")"
if [[ "${HEALTH_STATUS}" != "200" ]]; then
  fail "Health endpoint returned ${HEALTH_STATUS} (expected 200)"
fi
HEALTH_BODY="$(cat "${HEALTH_BODY_FILE}")"
if [[ "${HEALTH_BODY}" != *"${EXPECTED_HEALTH_BODY}"* ]]; then
  fail "Health payload is missing expected marker: ${EXPECTED_HEALTH_BODY}"
fi
log "- Health endpoint: pass (status=${HEALTH_STATUS})"
log "- Health marker text: pass (${EXPECTED_HEALTH_BODY})"

ADMIN_PROBE_URL="${TARGET_ROOT}${ADMIN_PROBE_PATH}"
log "- Admin endpoint unauth guard: running (${ADMIN_PROBE_URL})"
if ! http_get_with_single_retry "${ADMIN_PROBE_URL}" "${ADMIN_BLOCKED_BODY_FILE}" "${ADMIN_BLOCKED_STATUS_FILE}"; then
  fail "Cannot reach admin probe endpoint ${ADMIN_PROBE_URL} after one retry"
fi
ADMIN_BLOCKED_STATUS="$(cat "${ADMIN_BLOCKED_STATUS_FILE}")"
if [[ " ${ADMIN_PROBE_EXPECTED_BLOCKED_CODES} " != *" ${ADMIN_BLOCKED_STATUS} "* ]]; then
  fail "Admin probe unauth returned ${ADMIN_BLOCKED_STATUS}; expected one of: ${ADMIN_PROBE_EXPECTED_BLOCKED_CODES}"
fi
log "- Admin endpoint unauth guard: pass (status=${ADMIN_BLOCKED_STATUS})"

if [[ -n "${ADMIN_PROBE_TOKEN}" ]]; then
  log "- Admin endpoint auth probe: running"
  if ! http_get_with_headers_single_retry \
    "${ADMIN_PROBE_URL}" \
    "${ADMIN_AUTH_BODY_FILE}" \
    "${ADMIN_AUTH_STATUS_FILE}" \
    -H "Authorization: Bearer ${ADMIN_PROBE_TOKEN}"; then
    fail "Cannot reach admin probe endpoint ${ADMIN_PROBE_URL} with auth after one retry"
  fi
  ADMIN_AUTH_STATUS="$(cat "${ADMIN_AUTH_STATUS_FILE}")"
  if [[ "${ADMIN_AUTH_STATUS}" != "200" ]]; then
    fail "Admin probe auth returned ${ADMIN_AUTH_STATUS} (expected 200)"
  fi
  log "- Admin endpoint auth probe: pass (status=${ADMIN_AUTH_STATUS})"
else
  log "- Admin endpoint auth probe: skipped (ADMIN_PROBE_TOKEN not set)"
fi

if [[ -n "${EXPECTED_RUNTIME_SHA}" ]]; then
  log "- Runtime SHA marker: running (${EXPECTED_RUNTIME_SHA})"
  if [[ "${HEALTH_BODY}" != *"\"gitSha\":\"${EXPECTED_RUNTIME_SHA}\""* ]]; then
    fail "Health payload is missing expected runtime SHA: ${EXPECTED_RUNTIME_SHA}"
  fi
  log "- Runtime SHA marker: pass (${EXPECTED_RUNTIME_SHA})"
else
  log "- Runtime SHA marker: skipped (EXPECTED_RUNTIME_SHA not set)"
fi

if [[ -n "${REGISTRY_URL}" && -n "${IMAGE_NAME}" ]]; then
  REGISTRY_TAGS_URL="${REGISTRY_URL%/}/v2/${IMAGE_NAME}/tags/list"
  log "- Registry mutable tag: running (${EXPECTED_TAG})"
  REGISTRY_RESPONSE="$(
    curl -fsS \
      --connect-timeout "${REQUEST_TIMEOUT_SECONDS}" \
      --max-time "${REQUEST_TIMEOUT_SECONDS}" \
      "${REGISTRY_TAGS_URL}"
  )" || fail "Cannot query registry tags endpoint ${REGISTRY_TAGS_URL}"

  if [[ "${REGISTRY_RESPONSE}" != *"\"${EXPECTED_TAG}\""* ]]; then
    fail "Required mutable tag not found in registry response: ${EXPECTED_TAG}"
  fi
  log "- Registry mutable tag: pass (${EXPECTED_TAG})"

  if [[ -n "${EXPECTED_SHA_TAG}" ]]; then
    log "- Registry immutable tag: running (${EXPECTED_SHA_TAG})"
    if [[ "${REGISTRY_RESPONSE}" != *"\"${EXPECTED_SHA_TAG}\""* ]]; then
      fail "Required immutable tag not found in registry response: ${EXPECTED_SHA_TAG}"
    fi
    log "- Registry immutable tag: pass (${EXPECTED_SHA_TAG})"
  else
    log "- Registry immutable tag: skipped (EXPECTED_SHA_TAG not set)"
  fi
else
  log "- Registry mutable tag: skipped (REGISTRY_URL and IMAGE_NAME not both set)"
  log "- Registry immutable tag: skipped (REGISTRY_URL and IMAGE_NAME not both set)"
fi

log ""
log "Result: PASS"
log "Evidence file: ${EVIDENCE_FILE}"
