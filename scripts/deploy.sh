#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"
echo "IMAGE_TAG=${IMAGE_TAG}"
docker compose -p marcenaria up -d --build "$@"
