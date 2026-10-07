# Full application audit — 2026-10-07

**Result: 17 findings**, now tracked in [bug-fixes.md](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/bug-fixes.md). Address A01–A04 first: they affect authentication, answer ownership, participant privacy and the accuracy of submitted questionnaire data. No application fixes were made during this audit.

This report evaluates the current working tree with the imported production questionnaire definitions and the updated resource library. Findings were reproduced locally; this is not a claim that production was penetration-tested or that its current database permissions were inspected.

## Coverage and environment

An isolated PocketBase fixture ran on `127.0.0.1:8092`, with the current frontend on `127.0.0.1:4173`. The fixture contained synthetic participants only. API probes and answer writes used those participants. No real SMS messages, participant changes, deployments, commits or pushes were made for this audit.

| Layout | Size in CSS pixels | Coverage |
| --- | --- | --- |
| Desktop | 1920 × 1080 | All page routes, collections/articles and questionnaire branches in Chromium |
| Laptop | 1366 × 768 | Same full pass in Chromium |
| Mobile | 390 × 844 | Same full pass in Chromium; page/resource pass in mobile WebKit |
| Small mobile | 320 × 568 | Same full pass in Chromium; page/resource pass in mobile WebKit |
| Additional constrained layouts | 390 × 420; 568 × 320 | Login with reduced available height and landscape |
| Enlarged text | 200% root font size | Seven principal pages on laptop/small mobile; small-mobile WebKit; questionnaire component matrix |

The route inventory covered `/`, `/forms` (redirect), `/check-in`, `/forms/:id`, `/forms/:id/history`, `/form/success`, `/profile`, `/faq`, `/faq/mer`, `/faq/:collectionId`, `/about`, `/after-treatment`, `/welcome`, `/login` and `/login/:token`. Missing questionnaire/resource IDs and unknown routes were also checked.

- Opened all **8 managed resource collections and all 38 articles** at each of the four requested sizes, including hidden questionnaire helpers. Checked rendered images, overflow, and screenshots; repeated the page/resource pass in WebKit at both phone sizes.
- Covered all **6 questionnaire definitions**, including disabled standalone/legacy forms, and all **82 question records referenced by them**. The four unused records have no reachable questionnaire page and are listed in the coverage evidence.
- Inspected **1,056 rendered questionnaire steps** across 40 form/branch/viewport scenarios, plus **20 introductions**. The treatment-end editor and its calendar were exercised separately at all four sizes. Form counts include repeated questions across branches, viewports, section pages and submission screens; they are not counts of distinct questions.
- Exercised Yes/No branches, both conditional “Annat” paths, embedded and standalone PCL-5, previous/next/menu navigation, typed amounts, draft reload, cross-account login, changed conditional answers, submission payloads and error cases. Opened/closed **73 questionnaire help dialogs** during the small-mobile branch sweeps.
- An additional **135 WebKit questionnaire layout scenarios** passed. WebKit's mobile context does not support Playwright mouse-wheel simulation; those checks used programmatic scrolling. This does not certify native touch/keyboard behavior.

The questionnaire sweeps seeded synthetic answers to reach every branch, then inspected each rendered step through real navigation. Targeted tests changed answers through the UI and captured the submitted payload. They do not represent every possible answer combination.

Physical iPhone/Android testing, delivery of real SMS, operating-system telephone handoff, and a full independent security/accessibility review remain outside this browser-based pass. The previously deferred videos, study wording and unavailable FPI document remain separate items in the implementation plan.

| Questionnaire | Record ID | Paths checked |
| --- | --- | --- |
| Din startpunkt | `u6917wm639q1d01` | Yes, No and conditional “Annat”; embedded PCL-5; editing gates before submission |
| Dagligt formulär | `sdzkpd49ndccf5b` | Yes/No, reload, daily history and previous dates |
| PCL-5 | `5u3cydwh92re50o` | Standalone definition and embedded follow-up, including “Annat” and closing help |
| Testformulär | `6vc0a2dmcl2xmkc` | Direct-route introduction, question and submission screen |
| Initiellt formulär | `muyb28eqa5xq39k` | Direct-route introduction, question and submission screen |
| Treatment-end questionnaire | `p8ow7xj8h4uuv43` | Dedicated date editor and calendar at all four sizes; existing save/edit/retry tests |

## Findings

All 17 detailed findings, their priorities, reproduction steps, causes and fix directions are tracked in [bug-fixes.md](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/bug-fixes.md). That file is the checklist for subsequent bug-fix work; this report retains the audit coverage, verification results and evidence inventory.

## Checks that passed and remaining limits

- All 82 referenced question records were reached, including section-only records and the dedicated treatment-end question. All four unused records are explicitly identified in [question-coverage.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/question-coverage.json).
- The 1,056-step questionnaire sweep found no panel-boundary overflow, header/footer collision or help-dialog horizontal overflow at the four normal text-size viewports. This does not negate the behavioral findings above.
- All 38 resource articles rendered with no broken images or normal-size horizontal overflow detected in the four-size Chromium pass and the two-size WebKit pass.
- The 20 questionnaire introductions had visible continue controls without horizontal overflow. The end-date editor/calendar was inspected separately at each requested size.
- The 135-scenario WebKit questionnaire component layout matrix passed, subject to the scrolling limitation described above.
- `corepack pnpm run test:unit`: **70 passed**. `go test ./...`: **passed** (Go reported cached results). `corepack pnpm run build`: **passed**, with the existing warning about a JavaScript chunk above 500 kB. That warning is not counted as a demonstrated runtime defect.
- `corepack pnpm run test:e2e`: **30 passed** across desktop and mobile projects. These existing tests mock API responses; they cover ordinary submissions, failed-save recovery, cached once-only forms, help/quick exit, FAQ behavior and treatment-end editing. The new audit cases expose gaps beyond those passing regressions.
- The production placement of PCL-5's final support section, approved resource precedence, Linda's chosen phone number and deferred editorial/media decisions were preserved. They are not new bugs.

## Evidence and next work

Evidence is stored under `output/playwright/full-app-audit/` (git-ignored). The directory contains screenshots, the browser scripts, structured results and command logs. Main files are [pages-sweep.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/pages-sweep.json), [public-sweep.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/public-sweep.json), [webkit-pages.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/webkit-pages.json), [forms-sweep.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/forms-sweep.json), [question-coverage.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/question-coverage.json), [actions-audit.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/actions-audit.json), [actions-confirm.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/actions-confirm.json), [final-checks.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/final-checks.json), [settled-checks.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/settled-checks.json), [api-otp.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/api-otp.json) and [api-ownership.json](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/output/playwright/full-app-audit/api-ownership.json).

The isolated database is retained at `/tmp/pre-rt-full-audit-20261007` for reproduction; it contains synthetic audit data and should not be deployed. Screenshots/contact sheets should be interpreted alongside the recorded DOM bounds: full-page screenshots can render a sticky header at the captured scroll position, which alone is not a separate layout defect.

Track implementation and verification of A01–A17 in [bug-fixes.md](/Users/sebastianandreasson/Documents/code/work/gu/cancer-pain-app/bug-fixes.md). No application fixes were made during this audit.
