# CI -> Registry -> Coolify Deploy Runbook

Service: `leadspark`
Owner: Automation Engineering
Last updated: `2026-04-08`

## 1. Why this automation exists

This workflow standardizes LeadSpark releases so the same audited path handles build, image push, and redeploy.

Process risk if bypassed:
- Manual builds can drift from the repository state used for production.
- Direct Coolify redeploys without an immutable image tag slow rollback and fault isolation.

## 2. Automation score

| Dimension | Score (1-5) | Notes |
| --- | --- | --- |
| Time savings | 4 | Removes repeated release packaging and redeploy work. |
| Operational importance | 5 | Controls a live lead capture and automation demo service. |
| Dependency risk | 3 | Depends on runner, registry, and Coolify credentials. |
| Maintainability | 4 | Workflow is explicit and reuses the repo-native verification script. |

Decision: keep automation with deterministic verification and one-step rollback.

## 3. System contract

Trigger:
- `push` to `main`
- manual `workflow_dispatch`

Entrypoint:
- `.github/workflows/build-push-registry.yml`

Inputs:
- Git commit on `main`
- repository `Dockerfile`
- GitHub secrets:
  - `COOLIFY_DEPLOY_WEBHOOK`
  - `COOLIFY_API_TOKEN`
  - `COOLIFY_MANUAL_WEBHOOK_SECRET`
  - `REGISTRY_USERNAME` (optional)
  - `REGISTRY_PASSWORD` (optional)

Outputs:
- `192.168.1.158:5000/leadspark:latest`
- `192.168.1.158:5000/leadspark:<git-sha>`
- Coolify redeploy request
- runtime health payload with release metadata (`release.gitSha`, `release.buildTime`)

Side effects:
- updated local registry image
- Coolify deployment
- GitHub Actions audit log

## 4. Preconditions

- Self-hosted runner online with labels: `self-hosted`, `Linux`, `leadspark`
- Registry reachable: `http://192.168.1.158:5000/v2/_catalog`
- Coolify app configured to pull `192.168.1.158:5000/leadspark`
- Production URL and `/api/health` reachable from the operator environment

## 5. Canonical deploy procedure

1. Push approved commit to `main` or run the workflow manually.
2. Confirm both `latest` and SHA image tags are pushed.
3. Confirm Coolify redeploy trigger returns a deployment id.
4. Run deterministic verification:

```bash
cd leadspark
TARGET_URL=https://your-leadspark-domain \
REGISTRY_URL=http://192.168.1.158:5000 \
IMAGE_NAME=leadspark \
EXPECTED_SHA_TAG=<commit-sha> \
npm run verify:deploy
```

5. Record the evidence file from `ops/evidence/deploy-checks/`.

## 6. Verification contract

`scripts/verify-post-deploy.sh` must pass before the deploy is accepted.

Checks:
- homepage returns `200`
- homepage includes `Centro Fisioterapia Movimento`
- `/api/health` returns `200`
- health payload includes `"status":"ok"`
- health payload includes the expected runtime SHA
- registry contains `latest`
- registry contains `EXPECTED_SHA_TAG` when provided

## 7. Rollback procedure

Rollback after one failed verification retry when:
- homepage or health endpoint fails validation
- required image tags are missing

Procedure:
1. Find the last known-good SHA tag from prior evidence.
2. In Coolify, pin `192.168.1.158:5000/leadspark:<known-good-sha>`.
3. Trigger redeploy.
4. Re-run `npm run verify:deploy` with the rollback SHA.
5. Document the rollback in the issue.

Note:
- Accept the deploy only when the runtime health payload SHA matches the pinned rollback SHA. Registry tags alone are not sufficient evidence.

## 8. Failure handling and observability

- API webhook retries 3 times before failing the job.
- Signed manual webhook fallback is used when API credentials are absent.
- Required audit trail:
  - GitHub Actions run URL
  - commit SHA
  - evidence file path
  - rollback note if used
