# Three-month follow-up reminders

The backend checks daily at **18:00 Europe/Stockholm** for participants who:

- Have a nonempty telephone number and recorded `treatmentEnd` date.
- Have reached three calendar months after that date, or are overdue.
- Have not submitted an answer record for the configured follow-up questionnaire.
- Have not already received that form's follow-up invitation.

Both PRE and POST participants use the same rule. A treatment-start date is not
needed. Drafts do not count as submitted answers. The shared public test-login
account is excluded.

Three months means calendar months, with the day clamped to the last day when
necessary: 30 November → 28 February (29 February in leap years), and 31 January
→ 30 April. Dates become eligible at midnight in Sweden; the daily job sends at
18:00. Overdue participants are included after downtime or late entry/correction
of their treatment-end date. No SMS is sent just because the server starts.

## Configuration

`studySettings.followupQuestionnaire` selects the form. An empty relation disables
these reminders. The selected questionnaire must be enabled and have occurrence
`once`. Disable the form or clear the relation to stop its reminders.

Migration `1791464400` adds this optional relation and the `followupReminders`
collection. If the reviewed three-month form already exists when the migration
runs, it sets the initial relation. Otherwise it leaves it empty: import the
reviewed form, then select it in the default study-settings record. Re-running
the migration preserves existing selections and delivery history.

The SMS links to `${WEB_URL}/forms/${followupQuestionnaire}`. It uses the existing
participant login flow and SMS provider credentials. If logged out, the welcome,
login, code-entry and code-retry steps preserve the form destination. Only valid
internal questionnaire paths are accepted; external redirects are rejected. Configure `WEB_URL` for the
actual environment before enabling hosted delivery.

Current wording:

> Hej! Det har gått tre månader sedan din strålbehandling avslutades. Besvara uppföljningsformuläret här: [form link]

This is one invitation per participant/form. There is no automatic repeated
reminder campaign for unanswered forms, and no six- or twelve-month scheduling.
Changing a treatment-end date after an invitation was sent does not send another.

## Delivery tracking

`followupReminders` is accessible only to superusers and has a unique
`user, questionnaire` index. A transaction rechecks the participant's current end
date and answers, then saves a `pending` claim **before** contacting the provider.
Overlapping checks therefore cannot both claim the same invitation.

- `sent`: provider accepted the message; includes `sentAt`.
- `failed`: confirmed rejection or missing configuration. Retry on the next daily
  check only if the participant is still eligible and has not answered.
- `unknown`: transport failure, timeout, HTTP 408 or server error. The provider
  might have accepted it, so no automatic retry occurs.
- `pending`: a send is in progress, or the process stopped before its result was
  saved. No automatic retry occurs.

The record also stores attempt count/time, treatment-end date used, due date and
last error. It stores no message text or telephone number. Provider response
bodies and credentials are not logged. HTTP errors are no longer mistaken for
successful sends; provider requests time out after 15 seconds.

For old `pending` or `unknown` records, reconcile with the provider: mark `sent`
if accepted, or `failed` if confirmed not accepted. This makes the next scheduled
retry deliberate. A provider acceptance is not proof of delivery to the handset.
A successful send whose receipt cannot be saved stays `pending` and is reported
in application logs, rather than being automatically sent again.

## Verification and local behavior

Automated tests use temporary databases and a fake sender/local HTTP server.
They cover missing/future end dates, calendar boundaries, overdue participants,
completion of this versus another form, empty phone numbers, disabled settings,
Swedish midnight, failures, persistent deduplication across re-bootstrap,
overlapping jobs, and changed dates/answers before retries.

The existing local `dev.sh` server logs SMS instead of sending them. The reviewed
follow-up form has a separate definition file, now packaged and imported by the
test deployment initializer together with its study-settings binding. See [local form instructions](follow-up-questionnaire-local.md).

Verified locally on 8 October 2026:

- `go test ./...` passed, including migration/history preservation.
- `go test -race ./internal/followup ./internal/sms` passed.
- 98 frontend unit tests and 58 existing browser tests passed.
- Frontend production build passed (existing bundle-size advisory).
- Targeted lint had no errors; the two pre-existing hook/Fast Refresh warnings
  remain.
- Real local browser flow: opened the follow-up link while logged out, requested
  an OTP for the synthetic audit account, entered the locally logged code and
  arrived directly at the three-month form. No real SMS was sent.
- Local migration applied and `studySettings.followupQuestionnaire` points to
  `355082bf942bf57`. The restarted development server has the scheduler running.
  See the subsequent deployment verification below for hosted test status.

## Test deployment — 8 October 2026

Built and deployed with `scripts/deploy/test.sh` after adding the follow-up snapshot
and atomic scheduler binding to the test initializer. Both rollouts and health
checks passed. Production was not changed.

- API image: `sha256:d7f9e0fa6de60f28bb536f09be691bd483da6822bb4cb11fbe1f58e665859099`.
- Web image: `sha256:aa61162e8d628c200474066cfb70bec117d2f88f6ca54e3e2ad4e7a5634cc75e`.
- Initializer: 26 added definitions, configured follow-up `355082bf942bf57`;
  base questionnaire/resource content unchanged, participant answers untouched.
- Live API: enabled one-time form with 18 question/section records, three resolved
  help resources, and the matching `studySettings.followupQuestionnaire` relation.
- Live browser: follow-up link → welcome → login → shared test account → correct
  follow-up form. No answers were submitted or SMS sent by these checks.
- Import/binding tests passed, including rollback when settings are missing and
  idempotence of repeated import. Logs: `/tmp/pre-rt-followup-test-deploy-20261008.log`;
  API evidence: `output/playwright/follow-up-deploy/api-verification.json`.

Test form: <https://pre-rt.test.appadem.in/forms/355082bf942bf57>.
The hosted test backend uses the configured SMS provider; unlike local `go run`,
it is not log-only. The shared public test account is excluded from follow-up SMS.
