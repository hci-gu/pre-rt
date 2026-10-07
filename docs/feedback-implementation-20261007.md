# Feedback implementation and verification — 2026-10-07

The independent changes from [implementation-plan.md](../implementation-plan.md) are implemented locally and deployed to **https://pre-rt.test.appadem.in**. This record does not close the unavailable FPI document audit, physical Android/iPhone checks or the user's explicitly deferred C02–C04 content work. Production was not deployed. Changes remain uncommitted for review.

## Changes delivered

- **F01:** Check-in shows the treatment end date and allows editing. `PUT /treatment-end` validates the authenticated participant/date, updates the existing answer and user record atomically, and preserves unrelated answer fields. Conflicting duplicate historical answers return a clear conflict instead of guessing which record to overwrite. The UI refreshes dates, answers and schedules after saving; other once-only forms remain protected.
- **F02:** After-treatment resources are readable in advance. PRE/POST instructions retain their original audience groups and timing. The page distinguishes advance reading from when to follow the instructions.
- **F03–F10:** Production questionnaire definitions and approved help bindings are restored. Quick exit covers the full PCL sequence, closing support, dialogs/menu and submission, and clears the parent draft. The initial dilator sequence and production support placement remain intact. The three approved helper definitions are now maintained verbatim in Word.
- **F11–F12:** Age/height/weight units stay visible; introductions acknowledge conditional questions instead of inaccurate fixed counts. The unrelated weight help and its manifest remap are removed.
- **C01/C05/C06/C09:** Missing phone links were added, Linda's confirmed number retained, size help links to full illustrated instructions, and the sexual-health treatment-effects article links to existing relationship content.
- **V02/V03:** Cards/header/breadcrumb/footer/toast layout supports small widths and enlarged text. FAQ toggles preserve position; internal links and browser Back restore the appropriate article and reading position. Help dialogs do not alter form URLs.
- **Export correction:** CSV previously considered only directly declared questionnaire question IDs, omitting composite conditional/PCL answer keys. The exporter now retains all stored keys and resolves their source question/options for labels. Historical participant answers are not rewritten.

## Data and publication safety

Before local application, a full backup was made at:

`/Users/sebastianandreasson/Library/Application Support/PRE-RT/backups/feedback-20261007-before-apply`

SQLite backup APIs were used for the live databases. Protected-table hashes for users, answers and question options were checked before/after; they remained unchanged, and database integrity checks passed.

The content/data migration was rehearsed in `/tmp/pre-rt-implementation-20261007/rehearsal`. The reviewed resource plan contained 14 expected operations. The same operations were applied locally only after rehearsal validation.

| Target | Resource receipt | Verification |
| --- | --- | --- |
| Rehearsal | `fnbt8gsfksq67ip` | Passed; subsequent plan had zero operations |
| Local | `qgx72q20on4m1e6` | Passed; protected participant tables unchanged |
| Test | `uly68eiw0kx6o26` | Init-container verification passed; subsequent plan had zero operations |

The earlier production-definition import and its separate recovery backup are documented in [questionnaire-production-import.md](questionnaire-production-import.md).

## Repeatable test deployment

The reviewed public-content snapshot is `content/questionnaires/production-20261007.json`: **86 questions, 23 option records and 6 questionnaires**. It contains no accounts, answers or credentials. Help is expressed using stable resource source keys, not assumptions about environment-specific resource IDs.

The test init container performs:

1. Schema/data migrations.
2. Questionnaire graph preparation, temporarily allowing missing resource targets.
3. Reviewed Word resource plan/apply/verify.
4. Strict questionnaire import resolving and validating every help binding before the API starts.

This order resolves the circular dependency between incoming question IDs and resource remap validation. Missing final help relations fail startup. The importer requires `APP_ENV=test` and whitelists the three definition collections. The final import is transactional and repeatable; its unit coverage verifies preparation, strict rejection of missing help, idempotency and rollback. Direct test-database definition edits are overwritten by the reviewed snapshot on the next deployment; update the source for durable changes.

`scripts/deploy/test.sh` rebuilt/pushed both images and rolled out both test deployments. API health and the web route returned HTTP 200. A transient web 503 during endpoint replacement was retried successfully by the existing deployment script.

Deployed image digests:

- API: `sha256:0996fa0fe0f608c6b4b4576d20acc2476af43c8a2b2b2076998e8d728ccdc1c5`
- Web: `sha256:9151c30be160a8bec344c57182e11af35b419bab0a0be28c16eb36d68eebbaf0`

A read-only comparison of the deployed APIs confirmed all **115 definition records** and every expected help mapping against the snapshot. Disabled forms were read by ID rather than assuming the enabled-form list included them. Production manifests were not changed or deployed.

## Verification evidence

| Area | Result and scope |
| --- | --- |
| Full web suite | 70 unit tests and 30 Playwright desktop/mobile tests passed |
| Production frontend build | Passed; existing large-chunk warning remains |
| Backend | `go -C pocketbase test ./...` passed; final importer preparation coverage also passed |
| Resource compiler | All 12 Python tests passed; publication validation has zero blockers |
| Chromium layout/control regression | 135 layout scenarios and 120 control checks passed; continue and touch/interactions scripts passed |
| Mobile WebKit | 135 layout scenarios and 120 control checks passed |
| Synthetic persistence/export | Isolated actual API saved and exported 73 baseline keys, including 26 PCL keys; daily `10cm` retained; date edit retained the same answer ID and corrected CSV value |
| Date-dependent schedules | Real fixture API verified unknown end date, initial save and edit for PRE and POST, including updated POST start/end offsets |
| Deployed initial dilator flow | `Nej` hides size/length; `Ja` retains `Mellan` and `10cm` in the draft across reload |
| Deployed after-treatment content | PRE and POST each checked before, during, after and with unknown end date; the correct arm's instructions appeared in all eight scenarios |
| Internal links/navigation | New size→instructions and treatment-effects→relationships links open their destination and restore source position/expansion on Back; existing E2E coverage checks cross-category Back and low-page accordion toggles |
| Help connections | 23 deployed-content help buttons checked at 375 px, including all five Närstående references, all seven vaginal-sex references, hormone help, four shared pain/fear questions, size/measurement and closing support |
| Final deployed questionnaire checks | Inapplicable vaginal-sex path hides follow-ups; applicable path opens the definition; weight has no help; `år` remains visible after typing |
| Deployed resources | 76 article checks (all 38 source-managed articles at 375 px and 1280 px) passed image loading and horizontal-overflow checks; expected telephone targets rendered |
| Editorial source | 34 rendered Word pages visually inspected; 38 managed articles, 8 managed collections, 37 images; original illustration order and approved helper wording retained |

Browser help-binding checks isolate each question using its deployed definition and actual deployed resource records; those checks do not alone prove conditional placement. The full deployed initial flow and existing graph/E2E checks provide separate path coverage. The synthetic API export fixture intentionally exercises all stored conditional key formats; it is not represented as a single clinically valid participant response path.

The source preview and normal app were reviewed at desktop and phone widths. Resource checks await rendered content before inspecting image loads, horizontal overflow and links. The newer sexual-health illustration order, bleeding paragraphs and seven illustrated usage steps are preserved. Film placeholders remain visibly deferred.

All answer writes for local persistence/export verification used the disposable fixture at `/tmp/pre-rt-implementation-20261007/fixture` (port 8092). Deployed content/path checks used the public test login, blocked answer writes, and substituted synthetic user/answer responses in the browser when exercising treatment phases. They did not submit fabricated participant answers or change shared-account treatment dates. Telephone links were inspected without placing calls.

Mobile WebKit does not support synthetic mouse-wheel input in mobile mode. Its regression script verified native scroll-container geometry/reachability programmatically; Chromium covered touch interaction. Neither replaces a physical Android/iPhone test.

Temporary diagnostic logs/scripts and the synthetic export are under `/tmp/pre-rt-implementation-20261007/`. Browser screenshots are under `output/playwright/`; both locations are review evidence, not production content.

## Outstanding review and inputs

- **C05:** current Pre-RT FPI/participant-information document path or file. An unrelated study PDF was excluded; no claim is made about its contact details.
- **V01/C01:** physical Android/iPhone device/browser results, including help scrolling, keyboard/enlarged-text controls, quick exit and telephone handoff without making calls.
- **C02:** approved media/URLs for all six placeholders and the requested film topics, explicitly deferred by the user.
- **C03–C04:** study wording/timing/presentation review, explicitly deferred with current content preserved.
- **User review on test**, followed by a separately requested production deployment later.


## Final dependency audit

A targeted follow-up search covered document filenames in Downloads, Documents
and Desktop, then inspected the Pre-RT source folder at
`/Users/sebastianandreasson/Documents/data/pre-rt`. Its approved FOV document
references the FPI and its risk wording, but is a questionnaire/source note rather
than the current participant-information document. `Digitalization Support
Questions.docx` independently contains Linda's confirmed `031-786 61 59` number.
The generic `Downloads/Samtyckesblankett.pdf` concerns joint-replacement research,
so it is not a suitable Pre-RT FPI source. No unrelated study documents were edited.
C05 therefore still requires the current Pre-RT document.

The violence-support links were opened on 2026-10-07 and resolved to the intended
1177 contact pages:

- [Mottagning sexuella övergrepp](https://www.1177.se/Vastra-Gotaland/hitta-vard/kontaktkort/Mottagning-sexuella-overgrepp/).
- [Utväg Skaraborg, Skövde](https://www.1177.se/hitta-vard/kontaktkort/Utvag-Skaraborg-Skovde/).
- [Utväg Södra Älvsborg, Borås](https://www.1177.se/hitta-vard/kontaktkort/Utvag-Sodra-Alvsborg-Boras/).

This confirms the external destinations for C08; it does not replace the pending
physical-device checks or change any approved clinical wording.

Physical-device inventory was also checked: Android tooling reported no attached
devices, and Apple's device tooling listed the paired iPhone as unavailable. No
physical-phone test could be run from this environment. The temporary Android
device-discovery daemon was stopped after the check.
