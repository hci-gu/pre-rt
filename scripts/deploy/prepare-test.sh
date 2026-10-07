#!/bin/sh
# Build the reviewed worktree for test; this script never pushes or deploys.
set -eu
deploy_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$deploy_root"
api_image=$(sed -n "s/.*image: '\([^']*\)'.*/\1/p" deploy/test/api.yaml | head -n 1)
web_image=$(sed -n "s/.*image: '\([^']*\)'.*/\1/p" deploy/test/web.yaml | head -n 1)
scripts/resources/resources validate --publish
docker buildx build --platform linux/amd64 --load \
  -f pocketbase/Dockerfile -t "$api_image" .
docker buildx build --platform linux/amd64 --load \
  --build-arg VITE_API_URL=https://pre-rt-api.test.appadem.in \
  -t "$web_image" web
docker image inspect --format '{{.RepoTags}} {{.Os}}/{{.Architecture}} {{.Id}}' \
  "$api_image" "$web_image"
