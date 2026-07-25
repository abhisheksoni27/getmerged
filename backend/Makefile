.PHONY: build swagger test lint run dev build-linux build-linux-arm deploy score-repo check-pat

COMMIT_HASH ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
LDFLAGS := -s -w -X github.com/abhisheksoni27/opendoor/internal/handler.CommitHash=$(COMMIT_HASH)

swagger:
	@which swag > /dev/null 2>&1 || (echo "Installing swag..." && go install github.com/swaggo/swag/cmd/swag@latest)
	swag init -g cmd/server/main.go

build: swagger
	go build -ldflags="$(LDFLAGS)" -o bin/server ./cmd/server

# Live-reloading development server using air
dev: swagger
	@which air > /dev/null 2>&1 || (echo "Installing air for live reload..." && go install github.com/air-verse/air@latest)
	air -c .air.toml

# Cross-compile Linux x86_64 binary locally (fast, low memory)
build-linux: swagger
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="$(LDFLAGS)" -o bin/server-linux ./cmd/server

# Cross-compile Linux ARM64 binary locally (Oracle Ampere ARM)
build-linux-arm: swagger
	CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -ldflags="$(LDFLAGS)" -o bin/server-linux-arm ./cmd/server

test:
	go test -v ./...

lint:
	go vet ./...

run: swagger
	go run ./cmd/server

# Zero-downtime deployment (cross-compile locally -> scp to /tmp -> atomic mv -> systemctl restart)
deploy: build-linux
	@echo "=== Ensuring target directory exists on server ==="
	ssh ubuntu@opendoor.opendoor "mkdir -p /data/apps/opendoor/backend"
	@echo "=== Copying binary to /tmp/server ==="
	scp bin/server-linux ubuntu@opendoor.opendoor:/tmp/server
	@echo "=== Atomically replacing server binary & restarting service ==="
	ssh ubuntu@opendoor.opendoor "mv -f /tmp/server /data/apps/opendoor/backend/server && chmod +x /data/apps/opendoor/backend/server && sudo systemctl restart opendoor.service && sudo systemctl status opendoor.service --no-pager"

score-repo:
	@curl -X POST 'http://localhost:10000/internal/score-repo' \
		-H 'x-api-key: $(INTERNAL_API_KEY)' \
		-H 'Content-Type: application/json' \
		-d '{"owner": "$(OWNER)", "name": "$(NAME)"}'

check-pat:
	@curl -X POST 'http://localhost:10000/internal/check-pat' \
		-H 'x-api-key: $(INTERNAL_API_KEY)'
