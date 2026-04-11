# Deploy Verification Evidence

- Service: leadspark
- Timestamp (UTC): 20260408T190812Z
- Target URL: http://127.0.0.1:4321
- Health URL: http://127.0.0.1:4321/api/health
- Release identifier: test-sha-123
- Registry tags URL: n/a
- Expected runtime SHA: test-sha-123

## Checks
- Homepage availability: running
- Homepage availability: pass (status=200)
- Homepage marker text: pass (Centro Fisioterapia Movimento)
- Health endpoint: running
- Health endpoint: pass (status=200)
- Health marker text: pass ("status":"ok")
- Runtime SHA marker: running (test-sha-123)
- Runtime SHA marker: pass (test-sha-123)
- Registry mutable tag: skipped (REGISTRY_URL and IMAGE_NAME not both set)
- Registry immutable tag: skipped (REGISTRY_URL and IMAGE_NAME not both set)

Result: PASS
Evidence file: ops/evidence/deploy-checks/20260408T190812Z_leadspark_test-sha-123.md
