# Load .env for make targets that call curl
ifneq (,$(wildcard .env))
  include .env
  export
endif

BINARY   := bin/opendoor
CMD      := ./cmd/server
ORACLE_USER ?= ubuntu
ORACLE_HOST ?= YOUR_ORACLE_IP

.PHONY: dev test test-cover build deploy seed update swagger lint clean

## Local development with hot-reload (requires: go install github.com/air-verse/air@latest)
dev:
	air -c .air.toml

## Run all tests
test:
	go test ./... -v -race

## Run tests with coverage report
test-cover:
	go test ./... -coverprofile=coverage.out
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: coverage.html"

## Generate swagger docs (must run before first build)
swagger:
	swag init -g $(CMD)/main.go -o docs

## Build production binary (Linux amd64)
build: swagger
	GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w" -o $(BINARY) $(CMD)
	@echo "Built: $(BINARY)"

## Deploy binary to Oracle VM and restart service
deploy: build
	scp $(BINARY) $(ORACLE_USER)@$(ORACLE_HOST):/opt/opendoor/opendoor
	ssh $(ORACLE_USER)@$(ORACLE_HOST) "sudo systemctl restart opendoor && sudo systemctl status opendoor --no-pager"

## Trigger seed on local server
seed:
	curl -s -X POST http://localhost:$(PORT)/internal/seed \
	  -H "x-api-key: $(INTERNAL_API_KEY)" \
	  -H "Content-Type: application/json" \
	  -d '{"languages":["Go","Python","JavaScript"]}' | jq .

## Trigger score update on local server
update:
	curl -s -X POST http://localhost:$(PORT)/internal/update-scores \
	  -H "x-api-key: $(INTERNAL_API_KEY)" | jq .

## Trigger score update on prod
update-prod:
	ssh $(ORACLE_USER)@$(ORACLE_HOST) \
	  "curl -s -X POST http://localhost:8080/internal/update-scores \
	   -H 'x-api-key: \$$(cat /opt/opendoor/.api_key)' | jq ."

## Lint (requires: go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest)
lint:
	golangci-lint run ./...

## Remove build artifacts
clean:
	rm -rf bin/ tmp/ coverage.out coverage.html docs/

## Generate a 256-char API key
keygen:
	@openssl rand -base64 192 | tr -d '\n' | fold -w 256 | head -n 1
