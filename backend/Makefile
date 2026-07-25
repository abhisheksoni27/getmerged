.PHONY: build test lint run build-linux build-linux-arm deploy score-repo check-pat

build:
	go build -o bin/server ./cmd/server

# Cross-compile Linux x86_64 binary locally (fast, low memory)
build-linux:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o bin/server-linux ./cmd/server

# Cross-compile Linux ARM64 binary locally (Oracle Ampere ARM)
build-linux-arm:
	CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -ldflags="-s -w" -o bin/server-linux-arm ./cmd/server

test:
	go test -v ./...

lint:
	go vet ./...

run:
	go run ./cmd/server

# One-command deployment to Oracle VM (cross-compiles locally + scp + systemctl restart)
deploy: build-linux
	@echo "=== Copying binary to opendoor.abhishekco.de ==="
	scp bin/server-linux ubuntu@opendoor.abhishekco.de:/data/apps/opendoor/backend/server
	@echo "=== Restarting opendoor.service ==="
	ssh ubuntu@opendoor.abhishekco.de "sudo systemctl restart opendoor.service && sudo systemctl status opendoor.service --no-pager"

score-repo:
	@curl -X POST 'http://localhost:10000/internal/score-repo' \
		-H 'x-api-key: $(INTERNAL_API_KEY)' \
		-H 'Content-Type: application/json' \
		-d '{"owner": "$(OWNER)", "name": "$(NAME)"}'

check-pat:
	@curl -X POST 'http://localhost:10000/internal/check-pat' \
		-H 'x-api-key: $(INTERNAL_API_KEY)'
