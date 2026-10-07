# Bug fixes — full application audit

Updated: 2026-10-07.

**Status: all 17 findings are open.** This document tracks the new bugs found during the full-app audit. No application fixes have been made for these findings. The original spreadsheet feedback remains in `implementation-plan.md`.

Address A01–A04 first: they affect authentication, answer ownership, participant privacy and the accuracy of submitted questionnaire data. IDs A01–A17 are preserved for follow-up and verification.

Source: [Full application audit — coverage, checks and evidence](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/docs/full-app-audit-20261007.md). Findings were reproduced locally against the current working tree with imported production questionnaire definitions and updated resources, using synthetic participants. Production was not penetration-tested and its current database permissions were not inspected.

## Findings by priority

P0 = critical authentication exposure; P1 = high-impact privacy/data-integrity issue; P2 = functional or layout defect. A08 is a confirmed inconsistency between the questionnaire metadata and the UI; its intended mandatory-answer policy should be made explicit.

| ID | Priority | Finding |
| --- | --- | --- |
| A01 | P0 | Login codes are exposed by the API, including unauthenticated OTP listing |
| A02 | P1 | An authenticated participant can create answers for another participant |
| A03 | P1 | Logging out and switching accounts exposes the previous participant's draft |
| A04 | P1 | Hidden conditional/PCL-5 answers remain in the submitted payload |
| A05 | P2 | Clearing an inline numeric answer retains and restores its old value |
| A06 | P2 | Impossible numeric values, such as negative age, are accepted |
| A07 | P2 | Daily questionnaire progress is lost on reload |
| A08 | P2 | Questions marked optional are still mandatory in navigation |
| A09 | P2 | Profile date pickers accept clicks but never save the selected date |
| A10 | P2 | Profile and logout have no reachable navigation entry |
| A11 | P2 | History offers daily questionnaires after the schedule's end date |
| A12 | P2 | Invalid OTP and failed login requests provide no usable error feedback |
| A13 | P2 | Small-mobile check-in cards clip the treatment date and date-entry label |
| A14 | P2 | Login content is clipped and controls are covered on short screens |
| A15 | P2 | Enlarged text makes the history calendar's dates and buttons overlap |
| A16 | P2 | Enlarged text overflows FAQ navigation and the quick-exit control |
| A17 | P2 | Missing questionnaires and unknown routes show technical router errors |

### A01 — Login codes exposed to unauthenticated clients

**Reproduction:** request an OTP for the synthetic second participant. `/otp-create` returns HTTP 200 with the complete record, including `password`, `id` and `user`. Using the returned code with `/otp-verify` returned HTTP 200 and an authentication token without receiving an SMS. Separately, an unauthenticated GET of `/api/collections/otp/records?perPage=1` returned a record containing `password`.

**Impact:** the code-delivery step does not establish possession of the phone. The public collection listing also exposes available OTP records without first knowing a phone number.

**Cause:** [pocketbase/main.go:733](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/pocketbase/main.go:733) serializes the entire OTP record. The base schema at [pocketbase/migrations/1736260000_ensure_base_schema.go:130](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/pocketbase/migrations/1736260000_ensure_base_schema.go:130) has a public OTP list rule and a non-hidden password field; the fixture's live API confirms that exposure.

**Fix direction:** return only the challenge identifier and necessary non-secret metadata; deny public OTP list/view access and keep code fields hidden. Verify that authentication cannot succeed using only data returned by the challenge endpoint. Check deployed collection rules as part of remediation.

**Evidence:** [output/playwright/full-app-audit/api-otp.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/api-otp.json); [final-checks.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/final-checks.json) → `public-otp-list`. Evidence records statuses and field names, not actual login codes or tokens.

### A02 — Answer creation does not enforce ownership

**Reproduction:** authenticate as synthetic participant A (`feedbacktest001`), then create an answer whose `user` is participant B (`auditsecond0001`). The real fixture API accepted the request with HTTP 200 and saved B as its owner.

**Impact:** a participant can inject questionnaire data attributed to another participant if their record ID is known. This bypasses the ownership protections on reading existing answers and on the dedicated treatment-end endpoint.

**Cause:** the `answers` create rule only requires a non-empty authenticated ID. See [pocketbase/migrations/1736260000_ensure_base_schema.go:136](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/pocketbase/migrations/1736260000_ensure_base_schema.go:136). The generic creation path does not replace the supplied owner with the authenticated user.

**Fix direction:** enforce the authenticated owner in the create rule/server handler, including direct collection API requests. Test both ordinary answers and any downstream actions triggered by their creation.

**Evidence:** [output/playwright/full-app-audit/api-ownership.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/api-ownership.json). Only a synthetic cross-owner record was created.

### A03 — Drafts cross account boundaries

**Reproduction:** participant A enters age `57` in the baseline questionnaire, logs out through `/profile`, and participant B signs in in the same browser. Opening B's baseline and navigating to age displays `57` from A's draft.

**Impact:** private questionnaire answers can be shown to, and subsequently submitted by, a different participant on a shared browser.

**Cause:** draft keys contain the questionnaire ID, but not the authenticated user ID ([web/src/pages/form/hooks/useFormState.tsx:11](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/pages/form/hooks/useFormState.tsx:11)). Logout clears authentication but leaves these drafts ([web/src/pages/profile/index.tsx:12](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/pages/profile/index.tsx:12)).

**Fix direction:** namespace drafts by participant and questionnaire/answer date, discard legacy unowned drafts safely, and define cleanup on logout and account switching.

**Evidence:** [actions-confirm.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/actions-confirm.json) → `cross-account-draft`; [cross-account-draft.png](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/cross-account-draft.png) in the audit evidence directory.

### A04 — Removed branches still submit their old answers

**Reproduction:** start with a completed synthetic Yes path, then change the initial dilator-trial answer to `Nej` and all five violence answers to `Nej` through the UI. The conditional questions disappear. Submit the form and inspect the outgoing answer object.

**Actual result:** the payload still contains dilator size `Mindre`, insertion length `2cm`, and **26 PCL-prefixed answer keys**, even though every violence gate is `Nej`.

**Impact:** submitted data contradicts the final answers and includes sensitive follow-up responses that are no longer applicable. The existing rendering tests do not establish payload correctness after changing an earlier answer.

**Cause:** `useQuestions` filters the rendered graph, while [web/src/pages/form/index.tsx:157](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/pages/form/index.tsx:157) submits all values from `useWatch`, including retained fields from unmounted questions.

**Fix direction:** construct and validate the submission from the final active question graph, including composite follow-up keys. Define whether temporarily hidden values are retained only for editing or cleared immediately; either way, inactive values must not be submitted silently.

**Evidence:** [actions-confirm.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/actions-confirm.json) → `hidden-values-submitted`. The request was intercepted for inspection, not written to participant data. This finding concerns the behavior covered by F03/F10 in the original feedback plan; the new fix is tracked here.

### A05 — Clearing a numeric option does not clear its answer

**Reproduction:** choose the smoking-history option with an age, enter `18`, then erase the number. The visible input is empty, but the stored answer still contains `{18}`. Reload and revisit the question: `18` reappears.

**Cause:** [web/src/pages/form/components/Select.tsx:106](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/pages/form/components/Select.tsx:106) only propagates a numeric input value when its length is greater than zero.

**Fix direction:** synchronize an empty input with the parent answer and prevent incomplete amount options from passing validation.

**Evidence:** [settled-checks.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/settled-checks.json) → `cleared-amount` / `cleared-amount-after-reload`; [cleared-number-restored.png](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/cleared-number-restored.png).

### A06 — Numeric validation accepts impossible values

**Reproduction:** enter `-12` for age and choose “Gå vidare”. The questionnaire advances and retains `-12`.

**Cause:** the numeric input has no relevant bounds ([web/src/pages/form/components/QuestionSelector.tsx:47](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/pages/form/components/QuestionSelector.tsx:47)), navigation checks truthiness, and numeric question schemas fall through to strings ([web/src/state.tsx:403](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/state.tsx:403)). Submission also bypasses the normal form validation handler.

**Fix direction:** validate number types and meaningful per-question limits when navigating and submitting, with visible Swedish feedback. Negative age can be rejected directly; any study-specific allowed ranges for age, height and weight should be agreed before introducing stricter upper/lower limits.

**Evidence:** [actions-confirm.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/actions-confirm.json) → `negative-age`.

### A07 — Daily drafts disappear on reload

**Reproduction:** open the daily form, answer its first question, wait for the next question, then reload. The introduction returns and the answer is gone. No daily draft key was saved.

**Cause:** [web/src/pages/form/hooks/useFormState.tsx:104](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/pages/form/hooks/useFormState.tsx:104) writes local storage only for `occurrence === 'once'`, despite having date-based keys for recurring forms.

**Fix direction:** persist recurring drafts using the participant and the selected answer date, including historical dates chosen through the calendar. Keep drafts for different dates separate.

**Evidence:** [actions-confirm.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/actions-confirm.json) → `daily-draft-lost`. This confirmation waits for the next page before reloading, so it is not an auto-advance timing artifact.

### A08 — Optional metadata is ignored by navigation

**Reproduction:** the imported age question has `required = false`. Leave it empty: both advancement paths remain disabled. The same navigation calculation treats every non-text/non-section question as required.

**Cause:** the requiredness filter is commented out at [web/src/pages/form/state.tsx:24](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/pages/form/state.tsx:24), although schema generation separately honors `required`.

**Fix direction:** make the production flags, schema and navigation agree. If the flags intentionally represent optional questions, allow skipping them; if some answers are compulsory, encode that deliberately in the definitions. Do not silently change the imported questionnaire's policy while fixing layout.

**Evidence:** [actions-confirm.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/actions-confirm.json) → `optional-number-blocks`; the fixture question record `c2xmobhywcotlrq`. This qualifies the earlier F10 statement that optional metadata was preserved: the metadata was preserved, but the UI does not honor it.

### A09 — Profile date controls do not work

**Reproduction:** open `/profile`, change the treatment-start date in the picker, and close it. The displayed date remains `15 september 2026`. Treatment-end has the same implementation.

**Cause:** both date pickers have empty `onChange` handlers at [web/src/pages/profile/index.tsx:37](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/pages/profile/index.tsx:37) and `:44`.

**Fix direction:** show read-only dates when editing is not permitted, or connect the permitted edit to the authoritative update flow. The dedicated treatment-end page already provides an editing path; the profile should not imply that a no-op picker saves data.

**Evidence:** [actions-audit.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/actions-audit.json) → `profile-date-selection`; [action-profile-date-unchanged.png](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/action-profile-date-unchanged.png).

### A10 — No visible route to profile or logout

**Reproduction:** start from the authenticated home page and inspect its navigation, the shared header and footer. None links to profile or offers logout. Directly entering `/profile` works and reveals the only “Logga ut” action.

**Cause:** the route exists in [web/src/main.tsx:89](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/main.tsx:89), but the shared shell ([web/src/components/study-shell.tsx:150](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/components/study-shell.tsx:150)) contains home/breadcrumb navigation only. Source search found no link to `/profile` elsewhere in the app.

**Impact:** users cannot find the normal logout flow without knowing a URL, which matters particularly on shared devices.

**Fix direction:** provide a discoverable account/logout entry that works at all four layout sizes.

**Evidence:** [settled-checks.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/settled-checks.json) → `settled-home-navigation`, plus the route and navigation source inventory.

### A11 — History ignores the daily schedule's end date

**Reproduction:** supply a daily schedule from 1–30 September, with the browser date at 7 October. Open daily history. The calendar still offers “svara” for 1–7 October.

**Cause:** [web/src/pages/form/history/index.tsx:80](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/pages/form/history/index.tsx:80) disables only dates before the start or after today, and the rendering condition at `:99` likewise compares against today instead of the schedule end.

**Fix direction:** cap eligible dates at the earlier of today and the schedule end, with consistent server-side eligibility where required. Preserve access to genuinely eligible missed days.

**Evidence:** [actions-confirm.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/actions-confirm.json) → `calendar-after-end`; [calendar-after-end.png](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/calendar-after-end.png). The schedule response was mocked to isolate this boundary; actual UI navigation and rendering were used. This proves the UI offers the dates, not that a production server accepted an out-of-window answer.

### A12 — Login failures are silent

**Reproduction:** return a failed response from OTP verification after entering six digits. The form stays unchanged, with no visible error; it still says a code was sent. Separately, abort the phone-number login request: an unhandled “Failed to fetch” occurs without user feedback.

**Cause:** [web/src/pages/login/code.tsx:81](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/pages/login/code.tsx:81) only logs verification errors. The phone-number submission at [web/src/pages/login/index.tsx:49](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/pages/login/index.tsx:49) has no network-failure handler.

**Fix direction:** show recoverable Swedish messages for invalid/expired codes and network errors, with usable retry/resend behavior and pending-state handling.

**Evidence:** [actions-audit.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/actions-audit.json) → `invalid-otp` / `network-failed-login`; [action-invalid-otp.png](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/action-invalid-otp.png). Failure responses were deliberately simulated.

### A13 — Treatment-date cards clip their important content

**Reproduction:** open `/check-in` at 320 × 568 with a known treatment start and no end date.

**Actual result:** the start-date badge is entirely below the visible card, and “Ange datum” is cut off. Measured descendant bounds extend approximately **58 px** and **23 px** beyond the card bottom respectively.

**Cause:** the fixed card aspect ratio and `overflow-hidden` at [web/src/pages/check-in/index.tsx:41](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/pages/check-in/index.tsx:41) do not accommodate the wrapped title, completion icon padding and date/action badge in the narrow two-column layout.

**Fix direction:** let these cards grow with content or switch to an appropriate single-column layout before the text/badges stop fitting.

**Evidence:** [final-checks.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/final-checks.json) → `check-in-clipping`; [small-mobile-_check-in.png](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/small-mobile-_check-in.png).

### A14 — Short-screen login clips and covers controls

**Reproduction:** open `/login` with the test-login panel enabled. At 320 × 568, the breadcrumb is partially above the screen. At 390 × 420 and 568 × 320, the lower “Prova med testkonto” button lies under the footer.

**Actual result:** hit-testing the center of that button returns footer text, not the button. Scrolling does not help: the document remains at `scrollY = 0`.

**Cause:** [web/src/root.tsx:37](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/root.tsx:37) combines `h-screen` and `overflow-hidden`, while its centered login content and footer have fixed 3/4 and 1/4 height allocations.

**Fix direction:** allow vertical growth/scrolling and keep important actions reachable when the available height shrinks. Recheck without the test panel as well as with it. The reduced-height test models limited space; it is not a real mobile-keyboard test.

**Evidence:** [final-checks.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/final-checks.json) → `login-clipping`; [small-mobile-_login.png](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/small-mobile-_login.png), [small-landscape-_login.png](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/small-landscape-_login.png) and [mobile-keyboard-_login.png](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/mobile-keyboard-_login.png) where present in the evidence directory.

### A15 — Enlarged-text calendar has overlapping controls

**Reproduction:** open daily history at 320 × 568 and set the root font size to 200%. Weekday labels wrap, dates crowd together, and “svara” buttons overlap neighboring columns. Reproduces in Chromium and WebKit.

**Cause:** [web/src/components/ui/calendar.tsx:127](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/components/ui/calendar.tsx:127) uses seven narrow columns and margins with unconstrained button content; the answer buttons at [web/src/pages/form/history/index.tsx:106](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/pages/form/history/index.tsx:106) outgrow their cells.

**Fix direction:** use an accessible calendar/list layout whose controls do not overlap under enlarged text; verify each day's actual hit target, not only document overflow.

**Evidence:** [small-mobile-200-_forms_sdzkpd49ndccf5b_history.png](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/small-mobile-200-_forms_sdzkpd49ndccf5b_history.png); matching WebKit screenshot and [pages-sweep.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/pages-sweep.json) / [webkit-pages.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/webkit-pages.json).

### A16 — FAQ return and quick-exit controls overflow with enlarged text

**Reproduction:** open `/faq/mer` at 320 × 568 and 200% root font size. The “Tillbaka till frågor och svar” link is approximately **406 px** wide in a **320 px** viewport. The fixed “Lämna genast” control also extends past the right edge. Both engines reproduce it.

**Cause:** the return action at [web/src/pages/faq/more.tsx:21](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/pages/faq/more.tsx:21) inherits a non-wrapping button style. The non-inline quick-exit variant at [web/src/components/ui/AbortButton.tsx:15](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/components/ui/AbortButton.tsx:15) lacks the width/wrapping constraints used by its questionnaire variant. The enlarged sticky breadcrumbs also consume much of the short viewport.

**Fix direction:** constrain and wrap these controls, keep quick exit fully on-screen, and verify navigation/content reachability with the enlarged header.

**Evidence:** [settled-checks.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/settled-checks.json) → `faq-200-return`; [faq-more-200-bottom-settled.png](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/faq-more-200-bottom-settled.png); the overflow entries in both page-sweep JSON files.

### A17 — Invalid pages fall into the default technical error screen

**Reproduction:** open `/forms/nonexistent` while authenticated. The app shows “Unexpected Application Error” and a PocketBase error instead of a recovery page. On phone layouts the error text also creates horizontal overflow. An unknown route displays the default router 404 screen.

**Cause:** the questionnaire data read can fail before the local form boundary, and the root route in [web/src/main.tsx:35](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/main.tsx:35) has no suitable error page/catch-all route.

**Fix direction:** provide a Swedish not-found/error state with home/back/retry navigation, including deleted questionnaire IDs and failed questionnaire fetches. Keep technical details in diagnostics.

**Evidence:** [mobile-_forms_nonexistent.png](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/mobile-_forms_nonexistent.png), [small-mobile-_forms_nonexistent.png](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/small-mobile-_forms_nonexistent.png), the WebKit equivalents, and unknown-route screenshots. The development build shows a stack trace; production rendering of that trace was not tested.

## Implementation order and verification

Suggested implementation order: A01–A02 authentication/ownership, A03–A04 draft isolation and payload filtering, A05–A08 validation/draft consistency, A09–A12 navigation and date/login behavior, then A13–A17 layout and recovery pages. Re-run the relevant reproductions after each fix, followed by real iPhone/Android checks. Application changes require a separate implementation pass; this audit only records findings.
