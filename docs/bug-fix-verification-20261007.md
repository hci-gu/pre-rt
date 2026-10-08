# Bug-fix verification — 7 October 2026

A01–A17 in [bug-fixes.md](../bug-fixes.md) are implemented and verified locally, and deployed to test on 2026-10-07. The original spreadsheet plan is unchanged. Production has not been deployed.

The subsequent missing FAQ artwork report is tracked as A18 and is also fixed in
test. Its focused verification and replacement API digest are recorded below.

## Automated checks

| Check | Result |
| --- | --- |
| `go test ./...` in `pocketbase` | All packages pass, including OTP privacy/delivery failure, ownership migration and 14 daily-date cases |
| `pnpm run test:unit` | 80 tests pass across 13 files |
| `pnpm run test:e2e` | 54 tests pass across desktop and mobile projects |
| `tsc -b` and Vite production build | Pass; existing large-bundle warning remains |
| Chromium page/resource sweep | 262 page states; no page errors, horizontal overflow or broken images |
| WebKit page/resource sweep | 131 page states; no page errors, horizontal overflow or broken images |
| Imported questionnaire sweep | 40 scenarios, 1,056 rendered steps plus the end-date editor at four sizes; no clipped panels, horizontal overflow, overflowing help dialogs or page errors |
| Additional questionnaire layouts | 135 Chromium + 135 WebKit cases; all pass |
| Questionnaire control hit tests | 120 Chromium + 120 WebKit checks; all pass, including dialog dismissal and leaving with a saved draft |
| Chromium touch/form interactions | Scroll, last option, numeric input, rotation, help/menu, retained answers, submission and success pass |
| Continue-action checks | Pass on four constrained viewports, including 200% text |
| FAQ actions at 320px / 200% text | Back and quick exit are inside the viewport and their centers are unobstructed |
| `git diff --check` | Pass |

The main sizes were 1920×1080, 1366×768, 390×844 and 320×568 CSS pixels. Additional checks covered 320×240, 390×420 and landscape layouts, with 200% root text where specified. WebKit's mobile harness does not support the wheel probe: 135 wheel checks were explicitly skipped there. Chromium wheel/touch and both engines' layout/control checks passed. These are browser tests, not physical iPhone/Android tests.

The page sweep includes 8 managed collections and 38 articles at each of the four Chromium sizes, the public/login/account/history/error routes, and enlarged-text principal pages. WebKit repeats those pages at the two phone sizes, plus the enlarged small-phone pages.

| Questionnaire | Branches / states across four sizes |
| --- | --- |
| Din startpunkt | Yes, No and Other; 748 rendered states |
| Dagligt formulär | Yes and No; 64 states |
| PCL-5 | Yes and Other; 228 states |
| Testformulär | 8 states |
| Initiellt formulär | 8 states |
| Treatment end | Date editor/calendar at all four sizes; saving/editing/retry also covered by browser regressions |

## Backend and data preservation

Live API checks used an isolated database containing the imported questionnaire definitions, current resources and **two synthetic participants**. No real participant answers were created by verification. The checks establish that:

- OTP creation returns exactly `id`; anonymous and participant OTP reads return 403.
- An incorrect OTP and a reused OTP return 401. Verification with the privately obtained synthetic code succeeds.
- Cross-owner answer creation returns 403. Owned, eligible daily answers succeed.
- Dates before the schedule, in the future and after treatment end return 400; inclusive start/end dates succeed.

The security migration was applied to the running local instance on port 8090 after a consistent SQLite backup. Before/after hashes of every row in `resource`, `resourceCollection`, `questions`, `questionOptions`, `questionnaires`, `users` and `answers` match. Health returns 200. The local rules now deny OTP access, hide the password field and require answer ownership.

Local rollback reference: `/tmp/pre-rt-before-bug-fixes-20261007/data.db`. The migration's down action deliberately does not restore the insecure permissions. Rolling back application code must not reopen the exposed collections.

## Behavior choices

- Production `required` flags determine whether a question can be skipped. No questionnaire definitions or resources were changed by this implementation pass.
- Invalid supplied answers still block submission, even on optional questions. Age must be a whole nonnegative number, height/weight positive, and pain scores integers from 0–10. Study-specific clinical limits remain a future policy choice.
- Hidden answers may remain in the current participant's editing draft; only the final active graph is submitted.
- Legacy drafts have no reliable owner and are discarded on upgrade. New drafts are participant/date scoped and cleared on logout or account switching, including another open tab.
- Profile start date is read-only; end date links to the existing saving/editing flow.

## Test deployment — 2026-10-07

Built the current working tree using `scripts/deploy/test.sh`, pushed both images and successfully rolled out `pre-rt-api-test` and `pre-rt-web-test`. The existing test tags were reused as documented; running image digests exactly match the uploaded builds:

- API and resource-import init container: `sha256:8df87d6ff9bf8ab1a3254fc5facea775ef84c3d5b5b8e8ccda8e253d58093b8a`.
- Web: `sha256:8fa4d4eb5294f9bd339b9e174a7fb4a1cc0e55c8fec73f971a7222af8fadb0c9`.
- Served JavaScript: `/assets/index-CT5era8H.js`, including the new scoped drafts, profile navigation, daily-date guard and error page.

Both deployments are ready and API health returns 200. The initializer completed migration/import/strict validation successfully. The packaged questionnaire/resource definitions already matched test: zero content changes were needed, and users/answers were not reset.

Read-only deployed schema verification confirms that OTP list/view/create access is locked, the password is hidden and answer creation requires the authenticated participant as owner. Anonymous and authenticated test-participant OTP reads both return 403.

Browser smoke checks passed test-account login, logout and 14 page views at 1366×768 and 320×568: home, check-in, profile, FAQ, daily history, baseline and missing-form recovery. There were no page errors or horizontal overflow. Existing test-account answers were preserved. No SMS was sent by these checks.

Production deployment generations, images and restart annotations match their pre-deployment values. Deployment logs, image/schema checks and screenshots are in [`output/playwright/test-deploy-20261007/`](../output/playwright/test-deploy-20261007/).

## FAQ artwork follow-up — A18

The user reported five blank FAQ cards in test after deployment. The earlier
refactor `df02b34` removed bundled fallbacks, but test's five database records had
empty `image` / `imageCompact` fields. Local already had these uploads. The
original SVGs remained in the repository; the sixth card still used a bundled
illustration. The prior broken-image checks did not detect missing image elements.

Added `seed-card-images` to the standalone resource CLI and test initializer.
It uploads the original wide/mobile SVGs by stable collection `sourceKey`, leaves
existing artwork/content intact and makes no changes on subsequent runs. The
API image packages the original assets. No frontend behavior was changed.

- All Go packages pass. The new integration regression verifies stored bytes,
  custom-art preservation, no partial updates on missing files, idempotency and
  preservation of resource text and the synthetic answer sentinel.
- The local command reports zero changes, and a subsequent resource plan reports
  zero operations.
- Test rollout succeeded. Its initializer reports **five cards restored**, zero
  questionnaire changes and zero resource-content import operations.
- API and init container now run
  `sha256:f585d84e0bfec9c0033bdd9c5ef67d0c476368ce82d0675e43235881f6cdc7cb`.
  The web digest remains
  `sha256:8fa4d4eb5294f9bd339b9e174a7fb4a1cc0e55c8fec73f971a7222af8fadb0c9`.
- `web/scripts/check-faq-card-images.js` reproduced the missing-image failure
  before deployment and passes afterwards: all six cards contain loaded, visible
  images with the correct wide/compact sources at 1920×1080, 1366×768, 390×844 and
  320×568. No horizontal overflow; laptop and small-mobile screenshots were
  visually inspected. Browser console has no errors.
- API health is 200; both test deployments are ready. Production was not updated.

Evidence: [`output/playwright/faq-art-fix/`](../output/playwright/faq-art-fix/),
including initializer logs, deployed digests, before/after browser results and
four screenshots. This check requires actual image presence, avoiding the earlier
audit's false confidence from inspecting only existing images.

## Homepage follow-up — A19 and A20

A19 fixes the overview grid using its small mobile minimum for wide desktop
artwork. At laptop size, four 139×64-pixel cards clipped five headings. The wide
layout now uses a 17rem minimum, producing two 306×142-pixel cards per row while
allowing a single column for constrained/enlarged-text layouts. The shared test
account reset button also wraps instead of overflowing at 320px with 32px text.

`web/scripts/check-home-card-layout.js` first reproduced 28 failures out of 56
states. All 56 now pass both locally and on the deployed test app: seven widths
(1920, 1366, 768, 640, 639, 390, 320), normal/enlarged text, initial load, reload,
browser Back from FAQ, and Start from About. There are no clipped headings or
horizontal overflows. Laptop and enlarged small-mobile screenshots were inspected.
TypeScript/Vite build passes. These checks did not reset or submit test answers.

The layout build was deployed successfully with web digest
`sha256:fcea9a8ce41a6c450d48a88d2714475e1f9abe0320ffec80f19c718a83f9af5b`.
The API digest is unchanged from A18. Its initializer reported zero changes to
questionnaires, resource content or FAQ artwork.

During verification, A20 exposed cached HTML referencing the old JavaScript
bundle after rollout. Nginx returned SPA HTML for the missing asset, producing
a module MIME error. Added HTML revalidation and separate asset handling.
The replacement image passes `nginx -t` and local HTTP checks for `/`, `/faq`,
`/index.html`, a real hashed JavaScript asset and a missing asset. It is pushed as
`sha256:6c37a80765efe60eb3db30614844d0decd7d193539193a3a948373c61392b417`,
but its web rollout is pending cluster connectivity: requests reset or time out.
The running layout fix is verified; the cache headers are not yet deployed.

Evidence: [`output/playwright/home-card-fix/`](../output/playwright/home-card-fix/),
including before/local/deployed browser logs, screenshots, build and deployment
logs, and local cache-header checks. Production was not updated.

## Release gates

These gates concern deployment; the local A01–A17 implementation and verification are complete.

1. **Production security release:** a read-only query of the deployed `_collections` schema confirmed `otp.listRule = ""`, `password.hidden = false`, and `answers.createRule = @request.auth.id != ""`. No production login codes, users or answers were queried. A temporary read-only schema utility was removed after use. These exposures remain until the backend release applies `1791378000_participant_security.go` and the new OTP handler. Deploy backend and frontend together through the reviewed production process, then verify the rules and legitimate SMS login.
2. **Real devices:** before production release, check iPhone Safari and Android Chrome with the keyboard open/closed, browser bars expanding/collapsing, rotation, long questions/help, amount inputs, login, history and quick exit. No physical device was available during this pass. Keep this as a pre-release TODO unless device results are supplied.
3. **Draft transition:** account for loss of legacy unsubmitted browser drafts when scheduling the release. Submitted answers remain unchanged.

## Evidence

Local evidence is in [`output/playwright/bug-fix-verification/`](../output/playwright/bug-fix-verification/), ignored by Git. It includes test/build logs, sweep JSON, screenshots, API status-only probes, local migration verification and production schema metadata. It contains no logged OTP values or authentication tokens. The isolated runtime's private server log is outside the repository and is not part of the evidence bundle.

Useful visual checks: `final-cards-320.png`, `final-cards-390.png`, `laptop-_check-in.png`, `final-history-200.png`, and `final-faq-back-200.png`.
