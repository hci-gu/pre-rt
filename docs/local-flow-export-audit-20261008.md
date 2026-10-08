# Local onboarding, questionnaires and export audit — 2026-10-08

**Follow-up:** All seven findings below have now been implemented locally. See [export-format.md](export-format.md) for the revised export contract and verification: 95 values across five responses, including a new start time and multiline comment, reconciled successfully. The original findings below describe the pre-fix audit. No production deployment has been made.

The tested participant journey works, and **all 88 saved answer values are present in the downloaded export**. Four answer records were reconciled against independently recorded browser inputs, successful save responses and the local database. The export still has interpretation and metadata gaps described below; it should not yet be treated as an unambiguous analysis dataset.

## Environment and approach

- App: http://127.0.0.1:5173
- PocketBase admin: http://127.0.0.1:8090/_/
- Isolated database: `/tmp/pre-rt-flow-audit-20261008/pb_data`.
- Current working tree on `feature/redesign-2.0`, based on `ff2e015`, plus the local setup fixes below.
- Imported `content/questionnaires/production-20261007.json` and the packaged resource bundle; configured the baseline, daily and treatment-end questionnaire relations in local study settings.
- Created synthetic participants through the actual admin UI. Entered all questionnaire answers through Chromium controls and submitted to the real local API. No mocked API responses or directly seeded answer records were used.
- SMS messages were logged by the development backend; actual SMS delivery was not tested. No hosted participant data was touched and nothing was deployed or committed.

## Completed journey

The application uses administrator-created accounts and an invitation link, rather than public self-registration. The main participant was created with study code `AUDIT-20261008`, diagnosis `corpus`, and treatment start `2026-10-05`. The generated group was `PRE`; the internal user ID is `pv6syji8knvwy44`.

| Step | Result |
| --- | --- |
| Admin creates participant and invitation | Passed. The original link pointed at hosted test; after the URL configuration fix, a second admin-created participant received a localhost link that logged in successfully without rewriting it. |
| Initial invitation login | Passed with the real OTP. For the first run only, the original invitation's host was replaced with localhost, preserving its token and code. |
| Initial questionnaire | Completed and submitted; 66 answer values saved. Included conditional child-birth counts, vaginal-stav size/length, sexuality, nested violence follow-ups and embedded PCL-5. |
| Draft restoration | Reloaded partway through the initial questionnaire; progress and entered answers persisted. |
| Optional answer | Left one comment unanswered; it was absent from the saved answers and blank in the export. |
| Completion | Initial questionnaire showed as complete on the home page. |
| Daily questionnaire, 8 October | 8 values: use branch, `Stor`, `10cm`, symptom answers and quoted Swedish comment. |
| Daily questionnaire, 7 October | 6 values: no-use branch with reason answers; inactive size/symptom branch absent. |
| Daily questionnaire, 6 October | 8 values: use branch, `Mindre`, `2cm`, symptom answers and comment. |
| Calendar | All three dates marked answered; future dates unavailable. Desktop and 390 px mobile checked; mobile had no horizontal overflow. |
| Duplicate access | Opening the completed 7 October form directly displayed “Du har redan svarat på det här formuläret.” No extra record was created. |
| Logout and return | Logout returned to welcome. An incorrect OTP produced a visible error; requesting a new OTP and typing it logged in successfully. All three answered dates remained visible. |
| Admin export | Created an `exports` record and clicked its generated link in the admin UI. ZIP downloaded successfully from localhost. |
| Single-use export | After download the export record was removed; reopening its link returned 404. All four answer records remained intact. |

The extra onboarding account, `AUDIT-ONBOARDING-20261008`, has no submitted answers. It was used to check the corrected invitation and the state before a treatment-start date has been set.

## Export reconciliation

The downloaded ZIP contains:

| File | Data rows | Columns |
| --- | ---: | ---: |
| `din_startpunkt_ids.csv` | 1 | 94 |
| `din_startpunkt_names.csv` | 1 | 94 |
| `dagligt_formulär_ids.csv` | 3 | 17 |
| `dagligt_formulär_names.csv` | 3 | 17 |
| `question_lookup.csv` | 114 | 2 |

All 85 scalar values and the 12 cells representing three multiple-choice answers matched. Those three answers plus the 85 scalars comprise the 88 saved answer values. Both CSV versions contained identical data rows. Record IDs, user IDs, selected questionnaire dates and creation/update timestamps matched the database. The three daily dates remained distinct from the date they were actually submitted. All ID-based headers were unique.

Verified examples include age `52`, height `168`, weight `64.5`, child-birth counts `2` and `1`, `10cm` and `2cm`, selected violence periods and relatives, the two nested frequency answers, all embedded PCL-5 answers, and text containing commas, quotes, åäö and an en dash. CSV quoting parsed correctly. Inactive daily branches stayed blank in the export.

## Remaining findings

1. **Readable export headers are ambiguous.** Nine baseline header names occur twice: the declared violence-follow-up columns and the actual parent-specific follow-up columns use the same labels. For example, a generic “Tidigare Partner” column is `0` while the parent-specific column with the same readable label is `1`. The ID-based file preserves the distinction, but the names file does not explain which original violence question each follow-up belongs to. Add parent-question context to readable headers.

2. **Two nested follow-up answers lack readable labels and lookup entries.** `w60agvus8oz07k8_fjkqkrffjmulav7_0` and `w60agvus8oz07k8_fjkqkrffjmulav7_2` correctly contain “Vid upprepade tillfällen”, but appear as opaque IDs even in the names CSV and are absent from `question_lookup.csv`. Resolve these to the parent question, period option and frequency follow-up.

3. **Unanswered multiple-choice questions become zeroes.** The unused generic `phsclj2eksh3qse` and `fjkqkrffjmulav7` keys are absent from the stored answers, yet their option columns are all `0`. This conflates missing/not-shown with answered-but-not-selected. Export blank cells or a separate response-status field for missing answers, while preserving `0` for an unselected option on an answered question.

4. **Participant study metadata is absent.** The ZIP links answers only by internal `user` ID. It does not include the study code, diagnosis, PRE/POST group or treatment dates, so the ZIP alone cannot support joins or grouping by those fields. Whether to add a separate participant table remains a scope decision; phone numbers and email are not needed for that table. No export-schema change was made during this audit.

5. **`started` is empty for all four submissions.** This is not export loss: `submitQuestionnaire` never supplies a start time, and the database is already blank. If questionnaire duration is required, capture an actual start timestamp and preserve it across draft reloads. Historical start times cannot be reconstructed from this export.

6. **The registration card gives no action or explanation before a start date exists.** The second invited account could log in, but “Registrera dig” was an incomplete, non-clickable card. There is no participant registration form; staff must supply the treatment-start date. The waiting state should say that clearly if this is the intended workflow.

7. **Free-comment fields are single-line.** A pasted newline in the baseline comment became a space before saving. The CSV faithfully exported that saved text, including commas, quotes and Swedish characters. Use multiline inputs if preserving paragraph breaks is intended.

Development console warnings about RadioGroup switching from uncontrolled to controlled were observed. They did not prevent these answers from saving. The disabled public test-login endpoint also produces an expected 404 during feature detection. These are separate from the export findings.

## Local setup fixes made

- The resource importer previously rejected a fresh database because legacy records scheduled for retirement did not exist. It now skips absent retirement records while retaining validation of invalid collections and conflicts with active bundle records. Added an import/idempotence regression test.
- Invitation, reminder and export URLs now honor backend `WEB_URL` and `API_URL` environment variables. `pocketbase/dev.sh` supplies localhost defaults, and the README documents direct-start configuration. Hosted defaults remain the fallback. Added configuration tests and verified actual new invitation and export links through the browser.

`go test ./...` passed. The frontend production build passed, with its existing warning about a JavaScript chunk exceeding 500 kB. `git diff --check` passed. The export implementation itself was not changed, so the downloaded ZIP demonstrates the existing export behavior rather than a revised schema.

## Evidence and limits

Evidence is in `output/playwright/local-flow-audit/`:

- `data_export.zip`: the actual admin-UI download.
- `verification.json` and `verify_export.py`: read-only reconciliation results and script.
- `baseline-result.json`, baseline batch logs and the three daily logs: synthetic input/save evidence.
- `history-desktop.png` and `history-mobile.png`: completed calendar states.
- `go-tests.log`, `web-build.log`, `import-tests.log` and `url-tests.log`: checks for the setup fixes.

This run covers one complete initial-questionnaire path, three daily submissions covering both use/no-use branches, two newly invited accounts and a returning-user login. It is not every possible questionnaire combination, diagnosis/group, browser or physical device. No real SMS was sent. Local services and the synthetic database were left running for review.
