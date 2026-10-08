# Questionnaire export

Create a record in the admin UI's `exports` collection and open its generated link to download a ZIP. Links are single-use. Creating a fresh export reads current stored data; these formatting changes do not require questionnaire resubmission or a database migration.

## Files and joins

- Each questionnaire with submitted answers has an `_ids.csv` and a `_names.csv`. Both contain the same rows and values; only their question headings differ.
- Each response row starts with `id`, `user`, `started`, `date`, `created`, `updated`. `date` identifies the questionnaire day; `created` is when the response was submitted.
- `participants.csv` contains all current participants, including those with no submitted answers. Its columns are `id`, `code`, `diagnosis`, `type`, `treatmentStart`, `treatmentEnd`. Join answer rows' `user` to participant `id`. `type` is the PRE/POST group. These are current participant fields, not snapshots taken at each submission.
- Participant phone numbers, email, usernames and authentication fields are excluded.
- `question_lookup.csv` maps base and stored composite question keys to readable descriptions, including nested option follow-ups. Expanded checkbox headers append the option text to the question key.

## Answer interpretation

For a multiple-choice question with an answer, each option is exported as `1` when selected and `0` when unselected. Options containing `{AMOUNT}` instead contain the entered count when selected. If the question's answer is missing, null, blank or an empty list, all its option cells are blank. A blank does not distinguish a skipped question from a question hidden by branching.

Follow-up headings include their parent question or follow-up questionnaire. Nested option follow-ups include the relevant option label and contain the scalar follow-up answer, rather than another set of checkboxes. Any remaining duplicate readable headings receive stable column-ID suffixes. Unknown historical keys remain exported under their IDs if their definitions no longer exist.

CSV files are UTF-8 with standard CSV quoting. Commas, quotes and multiline comments must be read with a CSV parser; one physical line is not necessarily one record.

## Start times and drafts

New questionnaire sessions capture `started` when the form opens, including its introduction. This client timestamp is retained with the participant/date-specific draft across reloads and failed submissions, then sent when the form is submitted. The treatment-end editor also retains its draft, and editing an existing treatment-end response preserves its original start time.

Existing responses and drafts without a known start time remain blank. They are not backfilled with a guessed time. Previously removed comment line breaks also cannot be reconstructed; new text answers use multiline fields.

## Verification — 2026-10-08

The updated export was downloaded through the local admin UI and independently compared with browser input records and the isolated database. All **95 answer values across five responses** matched; both participants' study fields matched. The baseline export had no duplicate readable headings or unlabelled nested answers. Missing generic checkbox answers were blank, while selected and unselected options retained their correct values. A new daily submission preserved its start time and multiline Swedish comment through reload, submission and export.

Evidence: `output/playwright/local-flow-audit/data_export_fixed.zip`, `verification-fixed.json`, and `verify_export_fixed.py`. Go tests, 86 frontend unit tests, 58 existing desktop/mobile browser tests, and the frontend production build passed. This verification used synthetic local participants; production has not been deployed or audited by this change.
