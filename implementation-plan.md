# Implementation plan: feedback and delivery status

Updated: 2026-10-07.

This plan covers all three sheets in `Webb-app förbättring.xlsx`. `Blad1` and `Blad2` identify those sheets; `Aug` identifies `2026-08-26`; numbers are spreadsheet rows. Duplicate feedback is grouped. Record-ID-only rows are reference notes.

The user's decisions below take precedence over older requests in the workbook. The independent fixes are implemented locally and deployed to [test](https://pre-rt.test.appadem.in). Production has not been deployed. Physical-device checks and the FPI contact audit remain open; C02–C04 are explicitly deferred.

Sources:

- Feedback: `/Users/sebastianandreasson/Downloads/Webb-app förbättring.xlsx`.
- Editorial source: `resources.docx`; stable identities/audience/bindings: `content/resources/manifest.json`.
- Reviewed questionnaire definitions: `content/questionnaires/production-20261007.json`.
- [Production-definition import record](docs/questionnaire-production-import.md).
- [Implementation and verification record](docs/feedback-implementation-20261007.md).
- [Resource workflow](docs/resource-content-workflow.md) and [questionnaire layout contract](web/src/pages/form/LAYOUT.md).

## Decisions recorded, in the user's order

| Order | Topic | Decision and resulting action |
| --- | --- | --- |
| 1 | Newer resources versus older feedback | Keep the newer comfortable-size guidance, combined pain/discomfort article and violence FAQ organization (C06–C08). |
| 2 | Study explanation | Leave the current wording and presentation as is. Keep C03–C04 as deferred TODOs. |
| 3 | Linda's number | `031-786 61 59` is correct; use `tel:0317866159`. The workbook's alternative is superseded (C05). |
| 4 | Videos | Keep the requests as TODOs; approved links/media are not available (C02). |
| 5 | Relationships/sexuality link | Link to the existing sexual-health relationship content; no external URL is needed (C09). |
| 6 | PCL-5 support placement | Keep production's separate support section immediately before submission (F04). |
| 7 | Weight-question help | Remove the unrelated sexual-health help link and its manifest remap (F12). |

The earlier explicit approval to add the three production helpers **Närstående**, **Vaginalt sex** and **Hormonplåster** verbatim is also retained (C10). Their addition does not authorize replacing the newer resource library with production resources.

## Remaining inputs and review gates

1. **C05 — FPI document:** supply the path/file for the current Pre-RT participant-information material. The similarly named PDF found in Downloads concerns another study and was not edited. Linda's number is settled; its consistency in the unavailable document cannot yet be checked.
2. **V01 / C01 — physical devices:** check a real Android phone and iPhone. Record device, OS and browser; verify long help scrolling/closing, last answer and continue-button reachability, keyboard-open states, enlarged text, portrait/landscape, quick exit and telephone handoff without placing a call. Chromium/WebKit emulation is already covered but does not certify these device checks.
3. **C02 — deferred media:** provide approved films/URLs when available. Keep all six placeholders explicitly deferred.
4. **C03–C04 — deferred study explanation:** revisit the wording, timing and presentation later. Preserve the current content until then.
5. **User review:** review the implemented changes on test using **Prova med testkonto**. Production deployment is a later task.

No further decision is needed on resource precedence, Linda's number, the internal sexual-health link, PCL-5 placement or weight-question help removal.

## Questionnaire and functional items

### F01 — Display and edit the treatment end date

**Status:** Implemented and verified locally; deployed to test. **Feedback:** Aug 3, 25.

Check-in now shows the end date and an edit action. The configured end-date form prefills the current value. An authenticated transaction updates the existing answer and user date together, preserves unrelated answer fields and rejects ambiguous duplicate historical records without overwriting them. Failed saves show retry feedback. Other once-only forms retain their completion guard.

Verified: entry, edit, reload, failed-save retry, ownership, rollback and retaining the same answer ID. The isolated API fixture confirmed that PRE and POST daily schedules use the edited date. Participant data was not rewritten by the migration/import.

### F02 — Read after-treatment information before treatment ends

**Status:** Implemented; deployed to test. **Feedback:** Aug 26.

Removed the collection's `after` restriction; child resources inherit unrestricted phase access. Existing PRE/POST content groups remain separate. The page explains that the information can be read in advance and that the stated timing still applies. Reading it does not write answers or change schedules. Verification includes before/during/after treatment and an unknown end date for both arms.

### F03 — Restore PCL-5 and its intended trigger

**Status:** Implemented and covered by automated/browser checks; deployed to test. **Feedback:** Aug 21.

Production supplies PCL-5 (`5u3cydwh92re50o`), its 28 question/section records, response options and the baseline trigger: any `Ja` on the five violence questions. It remains hidden from standalone listings. All-five-`Nej` excludes the follow-up.

Quick exit now covers symptom questions, closing support, help dialogs, the question menu and submission. It clears the parent questionnaire's draft. Browser checks cover submission payloads and draft behaviour. The isolated real API/CSV check confirms that conditional and PCL answer keys survive saving and export; the exporter previously omitted these composite keys and has been corrected.

**Remaining shared gate:** physical-device verification under V01.

### F04 — PCL-5 completion/support message

**Status:** Production placement preserved and quick-exit/help behaviour verified. **Feedback:** Blad1 75.

Keep `9ecl9c22y6hw843` as a separate support section immediately before `Skicka in`, linked to the newer `violence.support` content. The older same-screen placement request is superseded. No duplicate support message was added.

### F05 — Daily length option

**Status:** Restored, saved/exported in the fixture and deployed to test. **Feedback:** Aug 39.

The production option values remain `2cm`, `4cm`, `6cm`, `8cm`, `10cm`. Browser submission and the isolated API/CSV export retain `10cm` without renaming the stored value. The measurement illustration is preserved.

### F06 — Radiation-question help

**Status:** Removed/restored correctly and deployed. **Feedback:** Blad1 33.

`Har du fått strålbehandling idag?` (`v3pcgtlpz9w3oh1`) has no help binding. Its obsolete manifest remap is absent, so resource publication does not restore it. The sexual-health article remains available in its intended contexts.

### F07 — “Närstående” help

**Status:** Maintained in Word, bound to all five questions and deployed. **Feedback:** Blad1 26.

The approved production wording is preserved under `questionnaire-help.close-person`. All five question relations match the deployed snapshot and their help buttons were exercised at phone width. Physical-device checks remain under V01.

### F08 — Hormone treatment through the skin

**Status:** Maintained in Word, connected and deployed. **Feedback:** Blad1 41.

`questionnaire-help.hormone-skin` clarifies that patches, gel and spray count. It is attached to `dfz5iu5fwp1q3k9`. Production question wording and options remain unchanged.

### F09 — Vaginal-sex definition

**Status:** Maintained in Word, connected and deployed. **Feedback:** Blad1 6, 8.

`questionnaire-help.vaginal-sex` preserves the approved definition and all seven production question references, including conditional questions. The section introduction is retained. The deployed full form hides follow-ups for the inapplicable answer and opens the definition on the applicable follow-up path. Help buttons were checked at phone width; physical-device verification remains under V01.

### F10 — Initial dilator-trial and length sequence

**Status:** Production sequence restored and deployed; browser/fixture verification recorded. **Feedback:** Blad1 81–83.

Baseline retains the trial question, size and insertion length conditional on `Ja`, and the free comment. Production response formats, placement and optional requiredness remain unchanged. The `Nej` path hides the size/length questions. The `Ja` path retains size and `10cm` in the draft across reload. Saving/export is verified with synthetic fixture answers. This measurement stays separate from daily reporting.

The introductory help opens current dilator guidance; size help links onward to full instructions, and measurement help remains separate (C06).

### F11 — Units and introduction counts

**Status:** Implemented and deployed. **Related feedback:** Aug 19.

The age placeholder is restored to `år`. Numeric age/height/weight units remain visible after typing. Fixed baseline/daily question counts were replaced with wording that acknowledges conditional questions, rather than presenting raw database record counts as participant-facing totals. Existing unrelated editorial overrides are preserved by the targeted migration.

### F12 — Unrelated weight-question help

**Status:** Removed and deployed. **Source:** relation reconciliation; removal explicitly approved.

`Vikt` (`zlay0n666s5d1r3`) no longer links to the sexual-health collection. The manifest remap is removed, the reviewed snapshot has no help binding, and a subsequent resource plan proposes no reattachment. Other uses of the sexual-health collection remain intact.

## Resource and editorial items

### C01 — Actionable telephone numbers

**Status:** App/source links implemented and checked; physical telephone handoff remains. **Feedback:** Aug 24, 33.

Added missing `tel:` links in the violence-information and cancer-rehabilitation text. Existing staff/support links are retained. Extraction checks verify the telephone targets; deployed article inspection checks the rendered links. Finish the phone-level check described above without placing a call.

### C02 — Video resources

**Status:** Deferred TODO by user decision. **Feedback:** Blad1 35–38; Blad2 14.

No approved media/URLs are available. Keep `Film – länk kommer`; do not invent destinations. The six outstanding placeholders are:

- `radiation.dry-mucosa`
- `dilator.how-to`
- `sexual-health.definition`
- `sexual-health.treatment-effects`
- `sexual-health.relationships`
- `sexual-health.support`

When media is supplied, reconcile the local-oestrogen and discomfort/bleeding/pain/fear film requests with the accepted newer combined article. Agree shared versus separate films, add accessible labels and supported destinations, then verify playback/opening on desktop and phones.

### C03 — “Om studien” introduction, explanation and layout

**Status:** Deferred TODO; current content preserved. **Feedback:** Blad2 8–11; Aug 12.

Later review: the observational-study sentence; participation overview and timing of the longer questionnaires, daily reporting and measurements; expandable presentation; and historical/randomized-study wording against the approved protocol. No current removal or rewrite is authorized by the recorded decision.

### C04 — Why participants answer questions

**Status:** Deferred TODO; current explanation preserved. **Feedback:** Aug 13.

Later compare `study.questionnaire` with the proposed explanation about knowledge to prevent radiation-related side effects. Decide whether to replace or supplement the current text, then update Word through the resource workflow.

### C05 — Linda's contact details

**Status:** App/source occurrences verified; FPI document unavailable. **Feedback:** Aug 14.

The confirmed number is **031-786 61 59**, target **tel:0317866159**. Study and after-treatment contact content use it; Josefin remains included. The workbook's proposed `031-343 99 47` is superseded. The FPI audit remains open until the current study document is supplied or located. A targeted search of Downloads, Documents, Desktop and the Pre-RT source folder found related source notes but no current FPI; the two consent/information PDF candidates concern other studies.

### C06 — Size help and full instructions

**Status:** Newer guidance retained; onward link implemented and deployed. **Feedback:** Blad1 4–5, 28.

Keep comfortable size and regular use as the newer guidance; do not restore “choose the largest possible size.” `dilator.size` now links to `dilator.how-to` with the complete illustrated instructions. Size choice and insertion-length measurement remain distinct.

### C07 — Combined pain/discomfort help

**Status:** Accepted newer content retained; all four bindings verified. **Feedback:** Blad1 35, 37–39.

The four discomfort, pain and fear questions use `dilator.pain-discomfort`. Its support, next-time and treatment-phase guidance remain unchanged. Older conflicting requests for separate fear-specific versions and nested dropdowns are superseded. Films remain deferred under C02.

### C08 — Violence-information organization

**Status:** Accepted newer content preserved; navigation/quick exit covered. **Feedback:** Blad1 23, 61–62.

Keep `Frågor om våld`, the newer wording and separate FAQ answers. Preserve existing support destinations, including the two requested 1177 links. Quick exit is visible when opening the category or following a deep link; destination headings and breadcrumbs retain context. All three 1177 contact links resolved to their intended pages in the final audit.

### C09 — Existing relationships/sexuality content

**Status:** Internal link added to Word and deployed. **Feedback:** Blad2 19.

`sexual-health.treatment-effects` now links to `sexual-health.relationships` using the supported stable-target format. No external URL is needed. Verify link destination and browser Back as part of V03.

### C10 — Three production helpers in the editorial source

**Status:** Complete; publication coverage gaps resolved. **Dependencies:** F07–F09.

Added **Närstående**, **Vaginalt sex** and **Hormonplåster** verbatim under stable source keys and bootstrap IDs. Their helper collection is hidden from general FAQ listings. Word is now the durable source; future resource publications preserve the question bindings.

The generated bundle has 38 resources, 8 managed collections and 37 images. Publication validation has zero blockers; the test import was verified and its subsequent resource plan has zero operations. All 34 rendered Word pages were visually inspected.

## Verification items

### V01 — Android/iPhone help and questionnaire controls

**Status:** Browser checks passed; physical devices remain open. **Feedback:** Blad1 35; Blad2 25; Aug 5, 19, 27, 30, 32, 35, 37–38.

Chromium and mobile WebKit each passed 135 layout scenarios and 120 control checks. Chromium also passed continue-button and touch/interactions checks. Scenarios cover portrait, landscape, keyboard-sized viewports, enlarged text, all input formats, long help, navigation and retained drafts. The deployed application was checked with the actual help content at phone width.

Physical Android/iPhone scrolling, keyboard and telephone integration still require the device/browser evidence listed above. Mobile WebKit automation cannot synthesize a wheel device; its scroll geometry was checked programmatically, not represented as a physical touch test.

### V02 — After-treatment title and content clipping

**Status:** Reproduced and fixed; automated desktop/phone checks passed. **Feedback:** Aug 4.

Cards now grow with wrapped text; grid, breadcrumb, header/footer and toast overflow no longer clip the title at 320 px with 200% text. Card links have explicit accessible names. The after-treatment page supports advance reading (F02).

### V03 — FAQ position and destination context

**Status:** Implemented; direct-link, toggle and Back regression checks passed. **Feedback:** Blad2 4–5.

Ordinary accordion toggles preserve position. Internal links open their target answer; browser Back restores the prior expanded answer and reading position. Scrolling waits for asynchronous content/images/fonts and stops when the reader interacts. Help-dialog accordions do not alter the parent form URL. Sticky headers and quick exit are included in destination checks.

### V04 — Resource spacing and illustrations

**Status:** Source document, source preview and deployed resource review completed; device gate shared with V01. **Feedback:** Blad1 22, 35–39, 61–62; Aug 7, 16.

Preserved the newer paragraph boundaries, bleeding-text separation, seven illustrated usage steps and sexual-health treatment-effects illustration order. Desktop and phone-width source previews were inspected. Deployed article checks cover source-managed resources at both widths, image loading, horizontal overflow and link rendering. Deferred video links remain tracked separately in C02.

## Delivery and completion checklist

- [x] Record all seven decisions and superseded older requests.
- [x] Restore production questionnaire definitions while preserving newer resources; document recovery and participant-data checks.
- [x] Implement independent functional, resource and layout fixes through repeatable sources/migrations.
- [x] Maintain the three approved helpers in Word; regenerate, validate and inspect the document and bundle.
- [x] Run focused tests, the full web suite/build, backend tests and resource tests.
- [x] Verify synthetic saving/export and PRE/POST date-dependent schedules in an isolated database.
- [x] Deploy code, questionnaire definitions and resources to test; compare the deployed graph and verify a zero-operation resource re-plan.
- [ ] Finish physical Android/iPhone checks and any resulting fixes (V01, C01).
- [ ] Locate and audit the current FPI document (C05).
- [ ] User review of the test application.
- [ ] Revisit explicitly deferred C02–C04 when their inputs/decisions become available.

This plan does not claim that unavailable documents, untested physical devices, deferred media or production deployment are complete.
