---
name: service-deployer
description: Safe, verified deployer for GetMerged services. Runs Makefile deployment targets, verifies systemd service health, checks HTTP endpoints, and triggers rollbacks if unhealthy.
---

# service-deployer Skill

Deploys backend and frontend services using the project's official Makefile targets.

## Mandatory Rules (from AGENTS.md)
1. **NEVER run manual `go build` or ad-hoc binaries on the server**.
2. **ALWAYS use Makefile targets only**:
   - Backend: `make deploy-server`
   - Frontend: `make deploy-frontend-server`

## Deployment & Verification Workflow
1. **Pre-Deploy Gate**:
   - Verify `go test ./...` passes (for backend).
   - Verify `npm run lint` passes (for frontend).
2. **Deploy Execution**:
   - Run `make deploy-server` or `make deploy-frontend-server`.
3. **Health Check (Post-Deploy)**:
   - Backend: `curl -f http://localhost:10000/api/v1/health`
   - Frontend: `curl -f http://localhost:3000/`
4. **Service Status**:
   - `sudo systemctl status opendoor.service --no-pager`
   - `sudo systemctl status opendoor-frontend.service --no-pager`
5. **Rollback Trigger**:
   - If health check fails or systemd service crashes, restore previous binary/build and alert immediately.
