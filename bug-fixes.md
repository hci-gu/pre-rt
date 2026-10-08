# Bug fixes — full application audit

Updated: 2026-10-07.

**Status: A01–A19 are fixed and deployed to test on 2026-10-07.** A18 explicitly checks missing FAQ illustrations; A19 checks homepage title containment on load/reload and return navigation. The separately discovered A20 cache-header fix is verified locally and pushed, with rollout pending cluster connectivity. This document tracks the new audit bugs and their fixes. The original spreadsheet feedback remains in `implementation-plan.md`. Production has not been updated.

A01–A04 affect authentication, answer ownership, participant privacy and the accuracy of submitted data. Their backend migration is applied to the local and test instances. IDs A01–A17 are preserved below with the original reproductions and the implemented resolutions. Reproduction/cause descriptions record the original audit; resolution paragraphs describe the current behavior.

Source: [Full application audit — coverage, checks and evidence](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/docs/full-app-audit-20261007.md). Findings were reproduced locally against the current working tree with imported production questionnaire definitions and updated resources, using synthetic participants. Production was not penetration-tested. During remediation, a read-only schema query confirmed that production still has a public OTP list rule, a visible OTP password field and the permissive answer-create rule. The backend release must apply the new security migration; these production exposures are not yet remediated.

## Findings by priority

P0 = critical authentication exposure; P1 = high-impact privacy/data-integrity issue; P2 = functional or layout defect. A08 now honors the imported production `required` flags; no questionnaire definitions were changed to impose a new mandatory-answer policy.

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
| A18 | P2 | Test FAQ category cards omit their original illustrations |
| A19 | P2 | Homepage cards become too small and clip their labels on wider screens |
| A20 | P2 | Cached page HTML can reference removed JavaScript after deployment |

### A20 — Cached page references an old build

**Status:** Fix built, verified locally and pushed. Test rollout is pending:
cluster requests began failing with connection resets/timeouts after the API
restart, before the web rollout. The existing test app remains healthy.

**Reproduction:** After the web build changed, a browser reused HTML referencing
`index-CT5era8H.js`. That bundle no longer existed in the current image, and
Nginx returned SPA HTML for the missing JavaScript path. The browser rejected
its MIME type and the page remained blank. Reloading fetched the current build.

**Cause:** Page HTML had no revalidation policy, and asset requests shared the
SPA fallback. This is separate from A19's measured grid-sizing defect.

**Resolution:** HTML now sends `Cache-Control: no-cache`; hashed assets may be
cached permanently, and missing assets return 404 instead of the app shell.

**Verification:** The built Nginx image passes its configuration check. Local
HTTP checks confirm revalidation headers on `/`, `/faq` and `/index.html`, a
successful JavaScript response with immutable caching, and 404 for a missing
bundle. Pushed web digest:
`sha256:6c37a80765efe60eb3db30614844d0decd7d193539193a3a948373c61392b417`.
Evidence: `output/playwright/home-card-fix/cache-local.log` and `deploy-cache.log`.

### A19 — Homepage cards shrink and clip labels

**Status:** Fixed and verified locally and in test on 2026-10-07.

**Reproduction:** Load `/`, reload, return with browser Back from FAQ, or follow
Start from About. At 1366×768 the overview grid fits four 139-pixel-wide cards in
one row; their wide aspect ratio leaves only 64 pixels of height. Five of six
headings extend below the visible cards. The same defect occurs at desktop and
tablet widths and survives font loading and navigation.

**Cause:** `8472586` changed the grid from two columns to auto-fit with an 8.5rem
minimum, intended to accommodate enlarged text. That mobile-sized minimum was
also used with the short desktop artwork. There was no title-containment check
in the earlier homepage smoke test.

**Resolution:** Keep the 8.5rem mobile minimum and require 17rem for wide cards.
This yields two adequately sized columns inside the 40rem page content area,
while retaining a single column when enlarged text or limited space requires it.
The same pass also found that the shared test account's reset button overflowed
at 320 pixels with 32-pixel root text; its label now wraps within the panel.

**Verification:** `web/scripts/check-home-card-layout.js` reproduces 28 failing
states before the fix and passes all 56 afterwards locally and in test: seven widths (1920,
1366, 768, 640, 639, 390, 320), normal/enlarged text, and initial load, reload,
browser Back and Start-link navigation. It requires six cards, checks title
containment/card height and rejects horizontal overflow. Laptop cards now measure
306×142 pixels. TypeScript/Vite build passes. Shared test-account answers were
not reset or submitted. Evidence: `output/playwright/home-card-fix/`.

### A18 — FAQ category artwork missing in test

**Status:** Fixed and deployed to test on 2026-10-07. The initializer restored five
cards; all six FAQ cards pass image-presence, loading and responsive-source checks
at 1920×1080, 1366×768, 390×844 and 320×568. Screenshots confirm the result.

**Reproduction:** Open `/faq` in test. The five category cards are solid turquoise,
while “Om du vill veta mer” retains its pink illustration. The five cards contain
no `<img>` elements; each corresponding PocketBase record has empty `image` and
`imageCompact` fields. Local already has these uploads.

**Cause:** The earlier `df02b34` refactor changed FAQ cards to use database artwork,
but test's content initializer never populated these fields. The files still
exist in the repository. The final card uses a bundled image and is unaffected.
The earlier audit's broken-image checks missed images absent from the DOM.

**Resolution:** A repeatable `seed-card-images` content command restores the
original wide/mobile SVGs by collection `sourceKey`. Test packages and seeds
them after its existing imports. It preserves existing artwork, text, links,
ordering and participant data; repeat runs are no-ops. The frontend continues
to use editable database artwork.

**Verification:** Backend integration coverage checks actual stored image bytes,
custom-art preservation, preflight failure without partial updates and repeat
runs. The browser regression in `web/scripts/check-faq-card-images.js` requires
all six cards and an actual loaded, visible image in each, including the correct
wide/mobile source at 1920, 1366, 390 and 320 pixels. Before the fix, it fails on
the first missing illustration. Evidence: `output/playwright/faq-art-fix/`.

### A01 — Login codes exposed to unauthenticated clients

**Resolution:** `/otp-create` now returns only the challenge ID. A migration denies all direct participant/anonymous OTP access and hides the password field. Failed SMS delivery deletes the new challenge and returns a usable error. Backend tests cover disclosure, delivery failure and access rules; a live synthetic API check confirms legitimate verification still works and used/incorrect codes fail. **Production release remains pending.**

**Reproduction:** request an OTP for the synthetic second participant. `/otp-create` returns HTTP 200 with the complete record, including `password`, `id` and `user`. Using the returned code with `/otp-verify` returned HTTP 200 and an authentication token without receiving an SMS. Separately, an unauthenticated GET of `/api/collections/otp/records?perPage=1` returned a record containing `password`.

**Impact:** the code-delivery step does not establish possession of the phone. The public collection listing also exposes available OTP records without first knowing a phone number.

**Cause:** [pocketbase/main.go](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/pocketbase/main.go) serializes the entire OTP record. The base schema at [pocketbase/migrations/1736260000_ensure_base_schema.go](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/pocketbase/migrations/1736260000_ensure_base_schema.go) has a public OTP list rule and a non-hidden password field; the fixture's live API confirms that exposure.

**Fix direction:** return only the challenge identifier and necessary non-secret metadata; deny public OTP list/view access and keep code fields hidden. Verify that authentication cannot succeed using only data returned by the challenge endpoint. Check deployed collection rules as part of remediation.

**Evidence:** [output/playwright/full-app-audit/api-otp.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/api-otp.json); [final-checks.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/final-checks.json) → `public-otp-list`. Evidence records statuses and field names, not actual login codes or tokens.

### A02 — Answer creation does not enforce ownership

**Resolution:** The migration requires the authenticated participant to own each new answer. A server hook also rejects another owner on direct collection requests, before downstream processing. Superuser administrative operations remain possible. Migration/router tests and live fixture requests reject cross-owner writes and permit owned answers. **Production release remains pending.**

**Reproduction:** authenticate as synthetic participant A (`feedbacktest001`), then create an answer whose `user` is participant B (`auditsecond0001`). The real fixture API accepted the request with HTTP 200 and saved B as its owner.

**Impact:** a participant can inject questionnaire data attributed to another participant if their record ID is known. This bypasses the ownership protections on reading existing answers and on the dedicated treatment-end endpoint.

**Cause:** the `answers` create rule only requires a non-empty authenticated ID. See [pocketbase/migrations/1736260000_ensure_base_schema.go](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/pocketbase/migrations/1736260000_ensure_base_schema.go). The generic creation path does not replace the supplied owner with the authenticated user.

**Fix direction:** enforce the authenticated owner in the create rule/server handler, including direct collection API requests. Test both ordinary answers and any downstream actions triggered by their creation.

**Evidence:** [output/playwright/full-app-audit/api-ownership.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/api-ownership.json). Only a synthetic cross-owner record was created.

### A03 — Drafts cross account boundaries

**Resolution:** Versioned drafts include the participant, questionnaire and selected answer period. Legacy unowned drafts are discarded; logout and account switching clear other participants’ drafts. PocketBase authentication changes also update open tabs, and cached answers are filtered by the current owner. Browser regressions cover A→logout→B and logout in a second tab.

**Reproduction:** participant A enters age `57` in the baseline questionnaire, logs out through `/profile`, and participant B signs in in the same browser. Opening B's baseline and navigating to age displays `57` from A's draft.

**Impact:** private questionnaire answers can be shown to, and subsequently submitted by, a different participant on a shared browser.

**Cause:** draft keys contain the questionnaire ID, but not the authenticated user ID ([web/src/pages/form/hooks/useFormState.tsx](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/pages/form/hooks/useFormState.tsx)). Logout clears authentication but leaves these drafts ([web/src/pages/profile/index.tsx](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/pages/profile/index.tsx)).

**Fix direction:** namespace drafts by participant and questionnaire/answer date, discard legacy unowned drafts safely, and define cleanup on logout and account switching.

**Evidence:** [actions-confirm.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/actions-confirm.json) → `cross-account-draft`; [cross-account-draft.png](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/cross-account-draft.png) in the audit evidence directory.

### A04 — Removed branches still submit their old answers

**Resolution:** Submission is filtered and validated against the final active question graph, including selected composite option keys. Inactive answers can remain in the editing draft but are excluded from submission. Graph pruning repeats to remove stale dependent chains. Unit and browser tests cover changed dilator/violence gates, PCL responses and composite follow-ups.

**Reproduction:** start with a completed synthetic Yes path, then change the initial dilator-trial answer to `Nej` and all five violence answers to `Nej` through the UI. The conditional questions disappear. Submit the form and inspect the outgoing answer object.

**Actual result:** the payload still contains dilator size `Mindre`, insertion length `2cm`, and **26 PCL-prefixed answer keys**, even though every violence gate is `Nej`.

**Impact:** submitted data contradicts the final answers and includes sensitive follow-up responses that are no longer applicable. The existing rendering tests do not establish payload correctness after changing an earlier answer.

**Cause:** `useQuestions` filters the rendered graph, while [web/src/pages/form/index.tsx](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/pages/form/index.tsx) submits all values from `useWatch`, including retained fields from unmounted questions.

**Fix direction:** construct and validate the submission from the final active question graph, including composite follow-up keys. Define whether temporarily hidden values are retained only for editing or cleared immediately; either way, inactive values must not be submitted silently.

**Evidence:** [actions-confirm.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/actions-confirm.json) → `hidden-values-submitted`. The request was intercepted for inspection, not written to participant data. This finding concerns the behavior covered by F03/F10 in the original feedback plan; the new fix is tracked here.

### A05 — Clearing a numeric option does not clear its answer

**Resolution:** Clearing an amount input now updates the parent answer to its empty placeholder. Incomplete selected amount options cannot advance or submit. A browser regression clears the number, reloads and verifies it stays empty.

**Reproduction:** choose the smoking-history option with an age, enter `18`, then erase the number. The visible input is empty, but the stored answer still contains `{18}`. Reload and revisit the question: `18` reappears.

**Cause:** [web/src/pages/form/components/Select.tsx](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/pages/form/components/Select.tsx) only propagates a numeric input value when its length is greater than zero.

**Fix direction:** synchronize an empty input with the parent answer and prevent incomplete amount options from passing validation.

**Evidence:** [settled-checks.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/settled-checks.json) → `cleared-amount` / `cleared-amount-after-reload`; [cleared-number-restored.png](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/cleared-number-restored.png).

### A06 — Numeric validation accepts impossible values

**Resolution:** Navigation and submission share explicit validation. Supplied numbers must be finite and nonnegative; ages must be whole years, height/weight positive and pain scores integers from 0–10. Swedish errors explain invalid input. Study-specific maximum age/height/weight limits have not been invented; future clinical limits remain a study-policy decision.

**Reproduction:** enter `-12` for age and choose “Gå vidare”. The questionnaire advances and retains `-12`.

**Cause:** the numeric input has no relevant bounds ([web/src/pages/form/components/QuestionSelector.tsx](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/pages/form/components/QuestionSelector.tsx)), navigation checks truthiness, and numeric question schemas fall through to strings ([web/src/state.tsx](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/state.tsx)). Submission also bypasses the normal form validation handler.

**Fix direction:** validate number types and meaningful per-question limits when navigating and submitting, with visible Swedish feedback. Negative age can be rejected directly; any study-specific allowed ranges for age, height and weight should be agreed before introducing stricter upper/lower limits.

**Evidence:** [actions-confirm.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/actions-confirm.json) → `negative-age`.

### A07 — Daily drafts disappear on reload

**Resolution:** All occurrence types save answers and the current page. Daily drafts use the selected local calendar date, including historical dates. Browser tests verify reload recovery and separation between two selected days.

**Reproduction:** open the daily form, answer its first question, wait for the next question, then reload. The introduction returns and the answer is gone. No daily draft key was saved.

**Cause:** [web/src/pages/form/hooks/useFormState.tsx](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/pages/form/hooks/useFormState.tsx) writes local storage only for `occurrence === 'once'`, despite having date-based keys for recurring forms.

**Fix direction:** persist recurring drafts using the participant and the selected answer date, including historical dates chosen through the calendar. Keep drafts for different dates separate.

**Evidence:** [actions-confirm.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/actions-confirm.json) → `daily-draft-lost`. This confirmation waits for the next page before reloading, so it is not an auto-advance timing artifact.

### A08 — Optional metadata is ignored by navigation

**Resolution:** Optional questions can be skipped with a continue action. Required questions, including required text and active follow-ups, must be answered. Optional supplied values are still validated. Imported production metadata stays unchanged.

**Reproduction:** the imported age question has `required = false`. Leave it empty: both advancement paths remain disabled. The same navigation calculation treats every non-text/non-section question as required.

**Cause:** the requiredness filter is commented out at [web/src/pages/form/state.tsx](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/pages/form/state.tsx), although schema generation separately honors `required`.

**Fix direction:** make the production flags, schema and navigation agree. If the flags intentionally represent optional questions, allow skipping them; if some answers are compulsory, encode that deliberately in the definitions. Do not silently change the imported questionnaire's policy while fixing layout.

**Evidence:** [actions-confirm.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/actions-confirm.json) → `optional-number-blocks`; the fixture question record `c2xmobhywcotlrq`. This qualifies the earlier F10 statement that optional metadata was preserved: the metadata was preserved, but the UI does not honor it.

### A09 — Profile date controls do not work

**Resolution:** Treatment start is explicitly read-only. Treatment end displays its saved value and links to the existing authoritative end-date editor, which supports saving, editing and retry. The misleading no-op date pickers are removed.

**Reproduction:** open `/profile`, change the treatment-start date in the picker, and close it. The displayed date remains `15 september 2026`. Treatment-end has the same implementation.

**Cause:** both date pickers have empty `onChange` handlers at [web/src/pages/profile/index.tsx](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/pages/profile/index.tsx) and `:44`.

**Fix direction:** show read-only dates when editing is not permitted, or connect the permitted edit to the authoritative update flow. The dedicated treatment-end page already provides an editing path; the profile should not imply that a no-op picker saves data.

**Evidence:** [actions-audit.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/actions-audit.json) → `profile-date-selection`; [action-profile-date-unchanged.png](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/action-profile-date-unchanged.png).

### A10 — No visible route to profile or logout

**Resolution:** The shared authenticated header now provides “Profil och logga ut”. Browser coverage follows it from the home page and exercises logout at desktop/mobile sizes.

**Reproduction:** start from the authenticated home page and inspect its navigation, the shared header and footer. None links to profile or offers logout. Directly entering `/profile` works and reveals the only “Logga ut” action.

**Cause:** the route exists in [web/src/main.tsx](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/main.tsx), but the shared shell ([web/src/components/study-shell.tsx](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/components/study-shell.tsx)) contains home/breadcrumb navigation only. Source search found no link to `/profile` elsewhere in the app.

**Impact:** users cannot find the normal logout flow without knowing a URL, which matters particularly on shared devices.

**Fix direction:** provide a discoverable account/logout entry that works at all four layout sizes.

**Evidence:** [settled-checks.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/settled-checks.json) → `settled-home-navigation`, plus the route and navigation source inventory.

### A11 — History ignores the daily schedule's end date

**Resolution:** History eligibility is inclusive from schedule start through the earlier of schedule end and today. Direct daily form navigation and the backend collection-create hook enforce the same window. Tests cover PRE/POST boundaries, future dates, missing treatment dates and Stockholm midnight; eligible missed days remain answerable.

**Reproduction:** supply a daily schedule from 1–30 September, with the browser date at 7 October. Open daily history. The calendar still offers “svara” for 1–7 October.

**Cause:** [web/src/pages/form/history/index.tsx](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/pages/form/history/index.tsx) disables only dates before the start or after today, and the rendering condition at `:99` likewise compares against today instead of the schedule end.

**Fix direction:** cap eligible dates at the earlier of today and the schedule end, with consistent server-side eligibility where required. Preserve access to genuinely eligible missed days.

**Evidence:** [actions-confirm.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/actions-confirm.json) → `calendar-after-end`; [calendar-after-end.png](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/calendar-after-end.png). The schedule response was mocked to isolate this boundary; actual UI navigation and rendering were used. This proves the UI offers the dates, not that a production server accepted an out-of-window answer.

### A12 — Login failures are silent

**Resolution:** Phone and OTP requests now show Swedish network/server/invalid-code errors, pending states, retry controls and a link to request another code. The backend reports SMS delivery failure. Browser tests cover recovery without losing the login screen.

**Reproduction:** return a failed response from OTP verification after entering six digits. The form stays unchanged, with no visible error; it still says a code was sent. Separately, abort the phone-number login request: an unhandled “Failed to fetch” occurs without user feedback.

**Cause:** [web/src/pages/login/code.tsx](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/pages/login/code.tsx) only logs verification errors. The phone-number submission at [web/src/pages/login/index.tsx](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/pages/login/index.tsx) has no network-failure handler.

**Fix direction:** show recoverable Swedish messages for invalid/expired codes and network errors, with usable retry/resend behavior and pending-state handling.

**Evidence:** [actions-audit.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/actions-audit.json) → `invalid-otp` / `network-failed-login`; [action-invalid-otp.png](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/action-invalid-otp.png). Failure responses were deliberately simulated.

### A13 — Treatment-date cards clip their important content

**Resolution:** Check-in cards grow with their content. Desktop/laptop use two columns; narrow phones switch to a single column before labels become cramped. Date badges and completion icons retain room. Geometry tests cover 1920, 1366, 390 and 320 CSS-pixel widths.

**Reproduction:** open `/check-in` at 320 × 568 with a known treatment start and no end date.

**Actual result:** the start-date badge is entirely below the visible card, and “Ange datum” is cut off. Measured descendant bounds extend approximately **58 px** and **23 px** beyond the card bottom respectively.

**Cause:** the fixed card aspect ratio and `overflow-hidden` at [web/src/pages/check-in/index.tsx](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/pages/check-in/index.tsx) do not accommodate the wrapped title, completion icon padding and date/action badge in the narrow two-column layout.

**Fix direction:** let these cards grow with content or switch to an appropriate single-column layout before the text/badges stop fitting.

**Evidence:** [final-checks.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/final-checks.json) → `check-in-clipping`; [small-mobile-_check-in.png](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/small-mobile-_check-in.png).

### A14 — Short-screen login clips and covers controls

**Resolution:** Login uses a scrolling document with a normal-flow footer instead of fixed fractional heights and hidden overflow. Action labels wrap and stay reachable. Browser hit tests cover 320×568, 390×420 and 568×320, with and without the test-login panel.

**Reproduction:** open `/login` with the test-login panel enabled. At 320 × 568, the breadcrumb is partially above the screen. At 390 × 420 and 568 × 320, the lower “Prova med testkonto” button lies under the footer.

**Actual result:** hit-testing the center of that button returns footer text, not the button. Scrolling does not help: the document remains at `scrollY = 0`.

**Cause:** [web/src/root.tsx](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/root.tsx) combines `h-screen` and `overflow-hidden`, while its centered login content and footer have fixed 3/4 and 1/4 height allocations.

**Fix direction:** allow vertical growth/scrolling and keep important actions reachable when the available height shrinks. Recheck without the test panel as well as with it. The reduced-height test models limited space; it is not a real mobile-keyboard test.

**Evidence:** [final-checks.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/final-checks.json) → `login-clipping`; [small-mobile-_login.png](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/small-mobile-_login.png), [small-landscape-_login.png](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/small-landscape-_login.png) and [mobile-keyboard-_login.png](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/mobile-keyboard-_login.png) where present in the evidence directory.

### A15 — Enlarged-text calendar has overlapping controls

**Resolution:** History uses a per-date list in narrow containers and a seven-column calendar only when there is room. Date labels, answer actions and treatment markers wrap within their cells. Tests inspect control geometry at 320px and 200% text.

**Reproduction:** open daily history at 320 × 568 and set the root font size to 200%. Weekday labels wrap, dates crowd together, and “svara” buttons overlap neighboring columns. Reproduces in Chromium and WebKit.

**Cause:** [web/src/components/ui/calendar.tsx](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/components/ui/calendar.tsx) uses seven narrow columns and margins with unconstrained button content; the answer buttons at [web/src/pages/form/history/index.tsx](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/pages/form/history/index.tsx) outgrow their cells.

**Fix direction:** use an accessible calendar/list layout whose controls do not overlap under enlarged text; verify each day's actual hit target, not only document overflow.

**Evidence:** [small-mobile-200-_forms_sdzkpd49ndccf5b_history.png](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/small-mobile-200-_forms_sdzkpd49ndccf5b_history.png); matching WebKit screenshot and [pages-sweep.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/pages-sweep.json) / [webkit-pages.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/webkit-pages.json).

### A16 — FAQ return and quick-exit controls overflow with enlarged text

**Resolution:** FAQ return and quick-exit actions now wrap within the available width. The mobile header scrolls with the document; deep-link positioning accounts for whether the header is actually sticky. Existing deep-link/back/quick-exit regressions and enlarged-text checks verify navigation remains usable.

**Reproduction:** open `/faq/mer` at 320 × 568 and 200% root font size. The “Tillbaka till frågor och svar” link is approximately **406 px** wide in a **320 px** viewport. The fixed “Lämna genast” control also extends past the right edge. Both engines reproduce it.

**Cause:** the return action at [web/src/pages/faq/more.tsx](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/pages/faq/more.tsx) inherits a non-wrapping button style. The non-inline quick-exit variant at [web/src/components/ui/AbortButton.tsx](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/components/ui/AbortButton.tsx) lacks the width/wrapping constraints used by its questionnaire variant. The enlarged sticky breadcrumbs also consume much of the short viewport.

**Fix direction:** constrain and wrap these controls, keep quick exit fully on-screen, and verify navigation/content reachability with the enlarged header.

**Evidence:** [settled-checks.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/settled-checks.json) → `faq-200-return`; [faq-more-200-bottom-settled.png](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/faq-more-200-bottom-settled.png); the overflow entries in both page-sweep JSON files.

### A17 — Invalid pages fall into the default technical error screen

**Resolution:** The root router has a Swedish error boundary and a catch-all not-found page. Missing forms, unknown routes and failed fetches offer home/retry recovery without showing a technical stack trace. Browser regressions cover each case.

**Reproduction:** open `/forms/nonexistent` while authenticated. The app shows “Unexpected Application Error” and a PocketBase error instead of a recovery page. On phone layouts the error text also creates horizontal overflow. An unknown route displays the default router 404 screen.

**Cause:** the questionnaire data read can fail before the local form boundary, and the root route in [web/src/main.tsx](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/web/src/main.tsx) has no suitable error page/catch-all route.

**Fix direction:** provide a Swedish not-found/error state with home/back/retry navigation, including deleted questionnaire IDs and failed questionnaire fetches. Keep technical details in diagnostics.

**Evidence:** [mobile-_forms_nonexistent.png](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/mobile-_forms_nonexistent.png), [small-mobile-_forms_nonexistent.png](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/small-mobile-_forms_nonexistent.png), the WebKit equivalents, and unknown-route screenshots. The development build shows a stack trace; production rendering of that trace was not tested.

## Implementation order and verification

The original reproductions above describe the pre-fix behavior. Current verification and remaining release gates are recorded in [Bug-fix verification](docs/bug-fix-verification-20261007.md).

- [x] Implement A01–A17 locally and add meaningful regressions.
- [x] Apply the security migration to the running local PocketBase instance after making a backup; verify resources, questionnaire definitions, users and answers are unchanged.
- [x] Inspect deployed collection rules read-only.
- [x] Finish the stable-build Chromium/WebKit page and questionnaire sweep: 393 page states, 1,056 imported-questionnaire states, 270 additional layouts and 240 control checks.

- [x] Build and deploy the current frontend/backend to test; verify matching image digests, successful content import, security rules and 14 deployed desktop/mobile page checks.

### Before production release

- [ ] Release the reviewed backend/frontend changes to production; test deployment is complete.
- [ ] Before production release, check real iPhone/Android keyboards and browser chrome; desktop browser emulation cannot establish hardware behavior.
