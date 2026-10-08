#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

# Local development uses the existing shared test account without SMS.
export WEB_URL="${WEB_URL:-http://127.0.0.1:5173}"
export API_URL="${API_URL:-http://127.0.0.1:8090}"
export APP_ENV=test
export TEST_LOGIN_USER_ID=publictestuser1

exec go run . serve --http=127.0.0.1:8090 "$@"
