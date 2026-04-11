# Deploy Verification Evidence

- Service: leadspark-staging
- Timestamp (UTC): 20260408T193002Z
- Target URL: http://192.168.1.158:8086
- Health URL: http://192.168.1.158:8086/api/health
- Release identifier: latest
- Registry tags URL: n/a
- Expected runtime SHA: n/a

## Checks
- Homepage availability: running
- Homepage availability: pass (status=200)
- Homepage marker text: pass (Centro Fisioterapia Movimento)
- Health endpoint: running
- Health endpoint: pass (status=200)
- Health marker text: pass ("status":"ok")
- Admin endpoint unauth guard: running (http://192.168.1.158:8086/api/lead)
- Admin endpoint unauth guard: pass (status=503)
- Admin endpoint auth probe: skipped (ADMIN_PROBE_TOKEN not set)
- Runtime SHA marker: skipped (EXPECTED_RUNTIME_SHA not set)
- Registry mutable tag: skipped (REGISTRY_URL and IMAGE_NAME not both set)
- Registry immutable tag: skipped (REGISTRY_URL and IMAGE_NAME not both set)

Result: PASS
Evidence file: ops/evidence/deploy-checks/20260408T193002Z_leadspark-staging_latest.md
