# Three-month follow-up questionnaire

The form is deployed to [hosted test](https://pre-rt.test.appadem.in/forms/355082bf942bf57),
including the reminder configuration. It is also available locally at
<http://127.0.0.1:5173/forms/355082bf942bf57>. Sign in using **Prova med testkonto**
on <http://127.0.0.1:5173/login> first.

Source: `/Users/sebastianandreasson/Documents/data/pre-rt/Follow-up Form 3 6 12 Months.docx`.
All three rendered pages were inspected. The filename mentions 3, 6 and 12 months,
but the document itself is titled “UPPFÖLJNING 3-månader”. This import creates one
three-month form. It does not introduce six/twelve-month forms. Three-month reminder logic has
subsequently been added; see [follow-up reminders](follow-up-reminders.md).

## Content and reuse

The additive definition file is
[`content/questionnaires/follow-up-3-months.json`](../content/questionnaires/follow-up-3-months.json).
It contains 15 source questions, one conditional text field, and two section headings.
All questions are optional, matching the existing questionnaires.

None of the existing question records matches the source question wording,
reference period and response options together. For example, existing estrogen
questions concern the preceding six months, while this form asks about use during
radiotherapy. Existing stav size/length questions lack the source's “not used” and
“not possible” responses. Reusing those IDs would conflate different questions in
exports or change the initial/daily forms.

The form therefore adds 18 question/section records and seven option sets, while
reusing the existing `YesNo` and `Importance` option records and the existing help
resources for discomfort, size and length measurement. Existing questions,
questionnaires, answers and participant records are not modified by the import.
The shared yes/no options retain the app's existing Ja/Nej ordering.

- The brachytherapy question is hidden when the questionnaire's diagnosis answer
  is **Analcancer**. It uses the existing conditional-question mechanism.
- Choosing **Ja, annan, nämligen:** for moisturising gel opens a text field.
- Changing either answer hides the dependent field and excludes its stale value
  from submission, through the existing answer-cleaning mechanism.
- The Word's stav markings are **2, 4, 6, 8**; the daily form's additional 10 cm
  option is deliberately not added here.
- The final free comment uses the app's multiline text input.
- The editorial note “Frågor om våld?? Återkommer om det ska in.” and stray closing
  parenthesis are omitted. No violence questions were specified in this document.
- Obvious punctuation/grammar errors in the first introduction sentence are fixed.
  Contact details are clickable; Linda's telephone uses the already approved
  app contact number **031-786 6159** instead of the document's older number.
- The existing submission confirmation supplies the closing thank-you message.

The source introduction mentions questions about digital support but supplies no
such questions. Its claim that responses are “helt anonymt” is retained for this
local content preview; it needs editorial review against the study's actual
handling of participant-linked responses before publication. No extra questions
or privacy assurances have been invented.

## Local import and startup

This file is separate from the base snapshot. `scripts/deploy/test.sh` now imports
it after the base content and configures the follow-up reminder in one transaction. With the existing base
questionnaires and resources already imported, run from `pocketbase/`:

```sh
APP_ENV=test go run ./cmd/testquestionnaires \
  --dir /tmp/pre-rt-flow-audit-20261008/pb_data \
  --snapshot ../content/questionnaires/follow-up-3-months.json

./dev.sh --dir=/tmp/pre-rt-flow-audit-20261008/pb_data --dev=false
```

Start the frontend separately from `web/`:

```sh
VITE_API_URL=http://127.0.0.1:8090 pnpm dev --host 127.0.0.1 --port 5173 --strictPort
```

The importer validates the complete added graph, resolves help by source key and
runs without SMS hooks. Repeating the import makes zero changes. The development
backend logs SMS locally instead of sending them. The form can be opened directly
for testing without waiting three months or changing treatment dates. It uses the
existing one-time completion and export behavior. It has no homepage entry yet. The backend now checks the configured follow-up
form daily; see [follow-up reminders](follow-up-reminders.md) for configuration.
Local development logs SMS rather than sending them.

## Verification

- Initial import: 26 new definitions (18 questions/sections, 7 option sets, 1 form).
- Repeat import: zero changes; all database record fingerprints unchanged.
- Completed two real browser submissions to the local API: 14 answers for the
  anal-cancer/no-other-gel path and 16 for the cervix/other-gel path.
- Verified brachytherapy appears for corpus/cervix and disappears for anal cancer.
  Previously entered brachytherapy and other-gel answers were excluded after
  changing the controlling answers; both values saved correctly when applicable.
- Reload restored the draft and its multiline comment. Reopening a submitted
  form displayed the already-answered screen.
- Inspected desktop and mobile screenshots, including the longest question and
  all six stav-marking choices. The 320 × 568 introduction scrolls vertically
  without horizontal overflow, and its continue button is reachable.
- Existing local participants, answers and definitions retained their record
  fingerprints throughout the browser tests. Removed only this run's shared-test
  account responses afterward, leaving a fresh form for user review.
- Browser scripts and screenshots are in `output/playwright/follow-up/`. No
  frontend/backend implementation changes or hosted deployments were needed.
