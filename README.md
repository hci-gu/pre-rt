# Cancer Pain App (Pre-RT Study)

Full-stack web app for the Pre-RT research study run by the University of Gothenburg and Sahlgrenska. The app collects questionnaires, provides study resources, and sends SMS-based OTP login links and reminders for participants.

**Overview**
- Web client: React + Vite + Tailwind, state managed with Jotai, PocketBase JS SDK for API access.
- Backend: PocketBase (Go) with custom endpoints for OTP auth, daily schedules, and CSV exports, plus cron-based SMS reminders.

**Project Structure**
- `web/` React app (Vite, Tailwind, PocketBase JS SDK).
- `pocketbase/` PocketBase backend (Go) and migrations.
- `deploy/` OpenShift manifests for web + API.
- `docker-compose.yml` Runs the prebuilt web image.
- `LICENSE`

**Requirements**
- Go 1.23.x (see `pocketbase/go.mod` toolchain).
- Node.js 21+ and `pnpm` (frontend tooling).
- Optional: Docker for container builds or `docker-compose`.

**Local Development**
1. Backend (PocketBase):
Run `cd pocketbase` then `go run .`. This serves PocketBase at `http://127.0.0.1:8090` by default, auto-applies migrations when using `go run`, and exposes the admin UI at `http://127.0.0.1:8090/_/`.
2. Frontend (Vite):
Run `cd web`, `pnpm install`, then `VITE_API_URL=http://127.0.0.1:8090 pnpm dev`. The app will be at `http://localhost:5173`.

Note: SMS links and export links are built from `WEB_URL` and `API_URL` constants in `pocketbase/main.go`. For local testing, update those constants (there is a commented local `WEB_URL` example).

**Configuration**
- `VITE_API_URL` (web): Base URL for the PocketBase API.
- `ELKS_API_USERNAME` and `ELKS_API_PASSWORD` (backend): 46elks SMS credentials. When running via `go run`, SMS messages are logged to the console instead of being sent.

**Backend Behavior**
- OTP auth:
`POST /otp-create` creates an OTP for a phone number and sends it via SMS.
`POST /otp-verify` verifies the OTP and returns a PocketBase auth token.
- Daily schedule:
`GET /daily-schedule` returns start/end dates for daily questionnaires based on treatment dates and user type (`PRE` starts 14 days before treatment start and ends on treatment end; `POST` starts 14 days after treatment end and ends 56 days after treatment end).
- Reminders:
Cron job at 18:00 sends daily questionnaire reminders.
Cron job at 17:00 sends treatment-end reminders (5 weeks after treatment start, if not already set).
- User type assignment:
New users are assigned `PRE` or `POST` based on diagnosis and the last created user in that diagnosis group.

**Data Export**
- Create a record in the `exports` collection (e.g., via the PocketBase admin UI). The backend sets `exports.link` to `API_URL/data-export/{id}`.
- Fetching that link returns a zip of CSV files per questionnaire plus a question lookup table, then deletes the export record.
- `web/export.js` currently targets `/data-export` without an id and will need updating if you want a scripted export.

**Deployment**
- `deploy/api.yaml` and `deploy/web.yaml` define OpenShift deployments + routes.
- `deploy/secrets.yaml` stores 46elks credentials.
- `pocketbase/pb_data` is expected to be persisted; the API deployment mounts a PVC at `/pb/pb_data`.

**License**
See `LICENSE`.
