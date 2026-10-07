# Local production-questionnaire import

Completed 2026-10-07. This records a local development data import, not a test or production deployment.

This is the historical import record. The subsequent approved feedback work
removed the weight-question help, integrated the three helpers into Word and
deployed the reviewed definitions/resources to test. See
[the implementation record](feedback-implementation-20261007.md) for the current
state and verification; the before/after values below describe the original import.

## Scope and result

The user requested the production questionnaire definitions together with the updated local resources. They authorized contextual help remapping and explicitly approved importing three otherwise-missing production helper records verbatim.

| Collection | Before | After | Treatment |
| --- | ---: | ---: | --- |
| `questions` | 54 | 86 | Production IDs, wording, order, conditions and flags; ten reviewed help remaps |
| `questionOptions` | 19 | 23 | Production records and response values |
| `questionnaires` | 5 | 6 | Production definitions and graph; five existing local `introText` overrides retained |
| `resource` | 60 | 63 | All 60 existing rows unchanged; only the three approved helpers added |
| `resourceCollection` | 9 | 9 | All rows unchanged |

Source: `/Users/sebastianandreasson/Downloads/pb_backup_acme_20261007082741`.

Target: `/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/pocketbase/pb_data`.

All existing local question, option and questionnaire IDs were present in the production snapshot, so no local records needed deletion. No production users, answers, authentication data, settings, resource assets or resource collections were imported. Existing local participant accounts and answers were preserved exactly.

## Help reconciliation

Production resource content was read as reference material to identify equivalent current local resources. It was not used to overwrite the updated local articles.

| Question/context | Current local destination | Reason |
| --- | --- | --- |
| Four pain, discomfort and fear questions | `dilator.pain-discomfort` | Current combined article replaces four legacy collections |
| Bleeding question | `dilator.bleeding` | Updated bleeding guidance |
| PCL-5 closing support section | `violence.support` | Current consolidated support article |
| Two violence follow-up questions | `violence` collection | Current violence information and support |
| Initial dilator-trial question | `dilator` collection | Complete usage instructions and PRE/POST timing |
| Production sexual-health collection reference on the weight question | `sexual-health` collection | Preserves the source topic; questionable original placement is tracked as F12 |

These ten question remaps are also recorded in `content/resources/manifest.json` and the regenerated bundle. The obsolete radiation-question remap was removed because production has no help on that question. Existing valid same-ID size, length and purpose help references were retained.

Approved new helpers:

| Production ID | Title | Referencing question records |
| --- | --- | ---: |
| `h3t6383vxtilg44` | Närstående | 5 |
| `8d2vi8ipto076du` | Vaginalt sex | 7 |
| `iiqw74s03f6273r` | Hormonplåster | 1 |

Their source fields and text match production. No existing resource membership or content was changed to add them.

## Integration changes

- Added the production `questionnaires.dependency`, `dependencyValue` and `followup` fields. The repository migration only adds missing fields and preserves existing values, including on rollback. Already-compatible production schemas are a no-op.
- Expanded the frontend questionnaire query to load follow-up questions, options and help. Without this small loading change, the restored graph existed in the database but PCL-5 would not be built in the client.
- Regenerated the resource bundle for the reviewed manifest bindings. Resource and collection content in the bundle is unchanged.

The baseline (`u6917wm639q1d01`) now references PCL-5 (`5u3cydwh92re50o`). Any `Ja` on the five production violence gates includes the follow-up. PCL-5 has 28 question/section records and remains disabled as a standalone listing, as in production.

## Validation

The import was rehearsed in an isolated database before applying the same plan locally. The graph was written transactionally and all imported records passed PocketBase validation before commit.

- SQLite integrity check passed.
- All imported fields match production except the documented help remaps; local-only introduction overrides were preserved.
- All 215 questionnaire/question relation edges resolve to existing, active records.
- All 60 original resources and all resource collections match the pre-import backup exactly.
- Local users, answers, settings, assets and other unrelated application tables match their pre-import hashes.
- The development test login caused normal auth-origin bookkeeping for the existing local test account only; non-test-account origins are unchanged. This occurred after the import, during runtime verification.
- `go test ./...` passed, including the idempotent schema/preservation regression check.
- Frontend unit tests passed: 67 tests across 10 files, including conditional follow-up loading with options/help.
- Frontend production build passed; its existing large-chunk warning remains.
- The authenticated local API returns all 42 baseline records, all 28 PCL-5 records, their options and the remapped help expansions.
- Chromium browser checks confirmed PCL-5 inclusion, actual response options, exclusion when all five gates are `Nej`, the closing support section and its updated local article, and the hormone helper text. The support dialog was visually checked at 375 × 812.

Browser checks used a synthetic draft confined to an isolated browser session. Answer GETs were replaced with empty fixture responses and collection writes were blocked. Nothing was submitted, and the existing test account was not reset. The session's storage was cleared afterwards. These checks do not certify physical Android/iOS behaviour or answer persistence/export.

## Remaining work discovered or clarified

The updated [implementation plan](../implementation-plan.md) remains the task list.

- F03: Quick exit appears on PCL-5 symptom questions but disappears on its separate closing section. Fix the section eligibility logic and verify the complete sensitive flow.
- F04: Production places support immediately before the submit screen. Confirm whether the older request requires it on the same screen as the submit button.
- F11: Production's age placeholder is empty; preserved local introduction counts must be reconciled with the restored conditional questionnaire graph.
- F12: The original weight-question link to sexual-health information appears unrelated and needs an explicit removal/replacement decision.
- C10: The three approved helpers are not yet represented in `resources.docx`. A fresh resource plan proposes zero operations but reports these three blocking source-coverage gaps. Add them to the editorial source before publication; do not bypass coverage checks. The plan also retains 17 existing nonblocking issues.
- Saving/export, quick-exit behaviour, physical devices and deployment validation remain untested by this import.

No unrelated feedback fixes, remote changes, commits or deployments were performed.

## Backup and audit artifacts

The local service was stopped before making the full pre-import backup. All 134 backed-up files were verified against SHA-256 hashes.

Backup directory:

`/Users/sebastianandreasson/Library/Application Support/PRE-RT/backups/questionnaire-sync-20261007-91f8b0a3`

`backup-file-hashes.json` records the original files. The `import-audit/` subdirectory retains the content-only production reference export, reviewed import plan and mappings, import/verification scripts, and pre-runtime/runtime validation receipts. These private artifacts are outside Git and contain no production participant export. The backup itself contains the original local database and should be treated accordingly.

Working temporary directory:

`/var/folders/pr/pgg2q0rx2mj3nnb9j0dk75rr0000gn/T/pre-rt-questionnaire-sync-8o6cm3n6`

For recovery, stop the local PocketBase process, preserve the current `pb_data` separately, and restore the original database/storage files identified in `backup-file-hashes.json` from the backup. Do not copy the new `import-audit/` directory into `pb_data`. This reverses local data changes; repository changes require separate review. Do not run these one-off local scripts against test or production.
