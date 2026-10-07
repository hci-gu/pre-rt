#!/bin/sh
# Test only. Test data is disposable; production has its own deployment process.
set -eu
deploy_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$deploy_root"

scripts/deploy/prepare-test.sh
api_image=$(sed -n "s/.*image: '\([^']*\)'.*/\1/p" deploy/test/api.yaml | head -n 1)
web_image=$(sed -n "s/.*image: '\([^']*\)'.*/\1/p" deploy/test/web.yaml | head -n 1)
docker push "$api_image"
docker push "$web_image"

oc -n appademin apply -f deploy/test/api.yaml
# Restart also covers rebuilding a test image under the same tag.
oc -n appademin rollout restart deployment/pre-rt-api-test
if ! oc -n appademin rollout status deployment/pre-rt-api-test --timeout=300s; then
  oc -n appademin logs deployment/pre-rt-api-test -c resource-import --tail=40 || true
  exit 1
fi
oc -n appademin apply -f deploy/test/web.yaml
oc -n appademin rollout restart deployment/pre-rt-web-test
oc -n appademin rollout status deployment/pre-rt-web-test --timeout=180s
# Routes can briefly return 503 while OpenShift updates their endpoints.
curl --fail --silent --show-error --retry 6 --retry-delay 2 --retry-connrefused --max-time 20 https://pre-rt-api.test.appadem.in/api/health
curl --fail --silent --show-error --retry 6 --retry-delay 2 --retry-connrefused --max-time 20 https://pre-rt.test.appadem.in/ > /dev/null
echo 'Test deployment ready: https://pre-rt.test.appadem.in'
