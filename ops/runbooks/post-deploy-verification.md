# LeadSpark Post-Deploy Verification Runbook

This runbook applies the reusable starter from `../../../ops/templates/post-deploy-verification-starter.md` to `leadspark`.

## Why This Automation Exists

Manual post-deploy checks were inconsistent and easy to skip under time pressure. This verifier creates a deterministic go/no-go gate and an auditable evidence artifact for each deploy.

Starter score for this service:

| Dimension | Score | Notes |
| --- | --- | --- |
| Time savings | 4/5 | One command replaces repeated manual homepage and health checks |
| Operational importance | 4/5 | Reduces risk of closing deploys with broken lead capture endpoints |
| Dependency risk | 2/5 | Requires reachable target URL; registry checks are optional |
| Maintainability | 4/5 | Explicit env contract, simple Bash script, deterministic output |

Decision: automate. The operational value is higher than the maintenance cost.

## Filled System Contract

- Trigger: manual operator run immediately after deploy.
- Inputs:
  - `TARGET_URL`: deployed service URL (default `http://127.0.0.1:4321`)
  - `HEALTH_PATH`: health endpoint path (default `/api/health`)
  - `EXPECTED_PAGE_TEXT`: required homepage marker (default `Centro Fisioterapia Movimento`)
  - `EXPECTED_HEALTH_BODY`: required health payload marker (default `"status":"ok"`)
  - `REGISTRY_URL` / `IMAGE_NAME` / `EXPECTED_TAG` / `EXPECTED_SHA_TAG`: optional tag checks when image deploys are used
  - `EVIDENCE_DIR`: evidence output directory (default `ops/evidence/deploy-checks`)
- Outputs:
  - non-zero exit code on failure
  - timestamped markdown evidence file
  - explicit PASS/FAIL result with failure reason
- Side effects:
  - writes one artifact in `ops/evidence/deploy-checks/`
  - can block release closure when required checks fail

## Command

```bash
npm run verify:deploy
```

Example with explicit release identity:

```bash
TARGET_URL=https://leadspark.example.com EXPECTED_SHA_TAG=<git-sha> npm run verify:deploy
```

Example with optional registry checks enabled:

```bash
TARGET_URL=https://leadspark.example.com \
REGISTRY_URL=http://127.0.0.1:5000 \
IMAGE_NAME=leadspark \
EXPECTED_TAG=latest \
EXPECTED_SHA_TAG=<git-sha> \
npm run verify:deploy
```

## Operator Input Checklist

- Service name (`SERVICE_NAME`) if non-default identifier is required
- Target URL (`TARGET_URL`)
- Health path (`HEALTH_PATH`)
- Expected homepage marker (`EXPECTED_PAGE_TEXT`)
- Expected health marker (`EXPECTED_HEALTH_BODY`)
- Optional registry values (`REGISTRY_URL`, `IMAGE_NAME`, `EXPECTED_TAG`, `EXPECTED_SHA_TAG`)
- Evidence output directory (`EVIDENCE_DIR`)

## Evidence Location

- Directory: `ops/evidence/deploy-checks/`
- Filename convention: `<UTC-timestamp>_<service>_<release-id>.md`

## Rollback Checkpoint

Rollback after one retry when any required check fails:

- homepage status is not `200`
- homepage marker text is missing
- health endpoint status is not `200`
- health payload marker is missing
- registry checks are enabled and required tags are missing

Rollback note must include the known-good release identifier and failed evidence file path.

## Service-Specific Deltas (For Future Reuse)

- LeadSpark health contract uses `/api/health` (not `/health`).
- Homepage marker is Italian branding (`Centro Fisioterapia Movimento`) and must be updated if the hero/brand text changes.
- Registry verification is optional because some deploy paths are static-host or platform-native builds without image tag exposure.
