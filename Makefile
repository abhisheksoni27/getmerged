# Save this text inside a file named 'Makefile' in your project root
.PHONY: setup check check-fe check-be

setup:
	@echo "🔧 Configuring local Git hook paths..."
	git config core.hooksPath .githooks
	chmod +x .githooks/*
	@echo "✅ Setup complete! Code review graphs will auto-update on git pull."

check-fe:
	cd frontend && npm run check

check-be:
	cd backend && go vet ./...

check: check-fe check-be
	@echo "✅ All frontend and backend checks passed!"

COMMIT_HASH ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
LDFLAGS := -s -w -X github.com/abhisheksoni27/opendoor/internal/handler.CommitHash=$(COMMIT_HASH)

swagger:
	@which swag > /dev/null 2>&1 || (echo "Installing swag..." && go install github.com/swaggo/swag/cmd/swag@latest)
	cd backend && swag init -g cmd/server/main.go

build: swagger
	cd backend && go build -ldflags="$(LDFLAGS)" -o bin/server ./cmd/server && go build -ldflags="$(LDFLAGS)" -o bin/gharchive ./cmd/gharchive

# Live-reloading development server using air
dev: swagger
	@which air > /dev/null 2>&1 || (echo "Installing air for live reload..." && go install github.com/air-verse/air@latest)
	cd backend && air -c .air.toml

fdev:
	cd frontend && npm run dev

# Cross-compile Linux x86_64 binary locally (fast, low memory)
build-linux: swagger
	cd backend && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="$(LDFLAGS)" -o bin/server-linux ./cmd/server

# Cross-compile Linux ARM64 binary locally (Oracle Ampere ARM)
build-linux-arm: swagger
	cd backend && CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -ldflags="$(LDFLAGS)" -o bin/server-linux-arm ./cmd/server

# Cross-compile recalculate_history tool for Linux ARM64 (Oracle Ampere ARM)
build-recalculate-linux-arm:
	cd backend && CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -ldflags="$(LDFLAGS)" -o bin/recalculate-history-linux-arm ./cmd/recalculate_history

build-discover-catalog:
	cd backend && go build -ldflags="$(LDFLAGS)" -o bin/discover_catalog ./cmd/discover_catalog

build-backfill:
	cd backend && go build -ldflags="$(LDFLAGS)" -o bin/backfill ./cmd/backfill

build-backfill-topics:
	cd backend && go build -ldflags="$(LDFLAGS)" -o bin/backfill-topics ./cmd/backfill_topics

build-generate-sitemap:
	cd backend && go build -ldflags="$(LDFLAGS)" -o bin/generate_sitemap ./cmd/generate_sitemap

build-morning-brief:
	cd backend && go build -ldflags="$(LDFLAGS)" -o bin/morning_brief ./cmd/morning_brief

generate-sitemap-server: build-generate-sitemap
	cp backend/bin/generate_sitemap /opt/opendoor/backend/generate_sitemap
	chmod +x /opt/opendoor/backend/generate_sitemap

morning-brief-server: build-morning-brief
	cp backend/bin/morning_brief /opt/opendoor/backend/morning_brief
	chmod +x /opt/opendoor/backend/morning_brief

backfill-topics-server: build-backfill-topics
	cp backend/bin/backfill-topics /opt/opendoor/backend/backfill-topics
	chmod +x /opt/opendoor/backend/backfill-topics


recalculate-history: build-recalculate-linux-arm
	scp backend/bin/recalculate-history-linux-arm deploy@oracle:/tmp/recalculate-history
	ssh deploy@oracle '\
		mv -f /tmp/recalculate-history /opt/opendoor/backend/recalculate-history && \
		chmod +x /opt/opendoor/backend/recalculate-history && \
		export $$(cat /opt/opendoor/.env | grep -v "^#" | xargs) 2>/dev/null || true && \
		export $$(cat /opt/opendoor/backend/.env | grep -v "^#" | xargs) 2>/dev/null || true && \
		/opt/opendoor/backend/recalculate-history && \
		sudo systemctl restart opendoor.service'

# Deploy from a checkout of this repo already on the server - no ssh/rsync, plain copy.
recalculate-history-server: build-recalculate-linux-arm
	cp backend/bin/recalculate-history-linux-arm /opt/opendoor/backend/recalculate-history
	chmod +x /opt/opendoor/backend/recalculate-history
	export $$(cat /opt/opendoor/.env | grep -v "^#" | xargs) 2>/dev/null || true
	export $$(cat /opt/opendoor/backend/.env | grep -v "^#" | xargs) 2>/dev/null || true
	/opt/opendoor/backend/recalculate-history
	sudo systemctl restart opendoor.service

deploy: build-linux-arm
	scp backend/bin/server-linux-arm deploy@oracle:/tmp/server
	ssh deploy@oracle '\
		mv -f /tmp/server /opt/opendoor/backend/server && \
		chmod +x /opt/opendoor/backend/server && \
		sudo restorecon -v /opt/opendoor/backend/server && \
		sudo systemctl restart opendoor.service && \
		sudo systemctl status opendoor.service --no-pager'

# Deploy from a checkout of this repo already on the server - no ssh/rsync, plain copy.
deploy-server: build build-discover-catalog
	@echo "=== Copy backend binary & nlp_sidecar ==="
	cd backend && go build -ldflags="$(LDFLAGS)" -o bin/eventstream ./cmd/eventstream
	cp backend/bin/server /opt/opendoor/backend/server.new
	cp backend/bin/gharchive /opt/opendoor/backend/gharchive.new
	cp backend/bin/eventstream /opt/opendoor/backend/eventstream.new
	cp backend/bin/discover_catalog /opt/opendoor/backend/discover_catalog.new
	mv -f /opt/opendoor/backend/server.new /opt/opendoor/backend/server
	mv -f /opt/opendoor/backend/gharchive.new /opt/opendoor/backend/gharchive
	mv -f /opt/opendoor/backend/eventstream.new /opt/opendoor/backend/eventstream
	mv -f /opt/opendoor/backend/discover_catalog.new /opt/opendoor/backend/discover_catalog
	chmod +x /opt/opendoor/backend/server
	chmod +x /opt/opendoor/backend/gharchive
	chmod +x /opt/opendoor/backend/eventstream
	chmod +x /opt/opendoor/backend/discover_catalog
	cp -r backend/nlp_sidecar /opt/opendoor/backend/
	sudo restorecon -v /opt/opendoor/backend/server
	sudo systemctl restart opendoor.service
	sudo systemctl restart opendoor-events.service
	sudo systemctl status opendoor.service --no-pager
	sudo systemctl status opendoor-events.service --no-pager


score-repo:
	@curl -X POST 'http://localhost:10000/internal/score-repo' \
		-H 'x-api-key: $(INTERNAL_API_KEY)' \
		-H 'Content-Type: application/json' \
		-d '{"owner": "$(OWNER)", "name": "$(NAME)"}'

check-pat:
	@curl -X POST 'http://localhost:10000/internal/check-pat' \
		-H 'x-api-key: $(INTERNAL_API_KEY)'

purge-cache:
	@curl -X POST 'http://localhost:10000/internal/purge-cache' \
		-H 'x-api-key: $(INTERNAL_API_KEY)'

purge-cf-all:
	./scripts/purge-cloudflare-cache.sh --all

purge-cf-repo:
	./scripts/purge-cloudflare-cache.sh --repo $(REPO)

purge-cf-topic:
	./scripts/purge-cloudflare-cache.sh --topic $(TOPIC)

purge-cf-tags:
	./scripts/purge-cloudflare-cache.sh --tags "$(TAGS)"

RSYNC_FLAGS = -az \
	--delete \
	--exclude='.DS_Store' \
	--exclude='._*'

build-frontend:
	cd frontend && npm run build

deploy-frontend: build-frontend
	@echo "=== Sync standalone root ==="
	rsync $(RSYNC_FLAGS) \
		frontend/.next/standalone/ \
		deploy@oracle:/opt/opendoor/frontend/

	@echo "=== Sync static assets ==="
	ssh deploy@oracle 'mkdir -p /opt/opendoor/frontend/.next/static /opt/opendoor/frontend/public'
	rsync $(RSYNC_FLAGS) \
		frontend/.next/static/ \
		deploy@oracle:/opt/opendoor/frontend/.next/static/

	@echo "=== Sync public assets ==="
	rsync $(RSYNC_FLAGS) \
		frontend/public/ \
		deploy@oracle:/opt/opendoor/frontend/public/

	@echo "=== Restart frontend service ==="
	ssh deploy@oracle '\
		sudo systemctl restart opendoor-frontend && \
		sudo systemctl status opendoor-frontend --no-pager'

# Deploy from a checkout of this repo already on the server - no ssh, local rsync.
deploy-frontend-server: build-frontend
	@echo "=== Sync standalone root ==="
	rsync $(RSYNC_FLAGS) \
		frontend/.next/standalone/frontend/ \
		/opt/opendoor/frontend/

	@echo "=== Sync static assets ==="
	mkdir -p /opt/opendoor/frontend/.next/static /opt/opendoor/frontend/public
	rsync $(RSYNC_FLAGS) \
		frontend/.next/static/ \
		/opt/opendoor/frontend/.next/static/

	@echo "=== Sync public assets ==="
	rsync $(RSYNC_FLAGS) \
		frontend/public/ \
		/opt/opendoor/frontend/public/

	@echo "=== Restart frontend service ==="
	sudo systemctl restart opendoor-frontend
	sudo systemctl status opendoor-frontend --no-pager
