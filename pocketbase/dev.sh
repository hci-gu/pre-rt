#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

# Local development uses the existing shared test account without SMS.
export APP_ENV=test
export TEST_LOGIN_USER_ID=publictestuser1

exec go run . serve --http=127.0.0.1:8090 "$@"
