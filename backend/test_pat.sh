#!/bin/bash

if [ -f .env ]; then
  export $(cat .env | xargs)
fi

if [ -z "$GITHUB_TOKEN" ]; then
  echo "Error: GITHUB_TOKEN environment variable is not set."
  exit 1
fi

echo "Testing GITHUB_TOKEN against GitHub GraphQL API..."

RESPONSE=$(curl -s -X POST https://api.github.com/graphql \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "query { viewer { login } rateLimit { remaining resetAt cost } }"}')

echo "Raw Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
