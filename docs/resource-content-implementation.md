# Resource import implementation and review

Applied to the actual local PocketBase database on 2026-09-30 following the revised PRE-RT document and the user's content decisions. All referenced app resources are covered by the source or explicit remapping/retirement. Both illustration corrections and all 37 approved alternative texts are included in Word and the published content.

Review the normal app at <http://127.0.0.1:5173/faq>, backed by local PocketBase at <http://127.0.0.1:8090>. The source preview remains at <http://127.0.0.1:5174/resource-review.html>; restart it with `scripts/resources/resources preview --port 5174`. See the [operating guide](resource-content-workflow.md) for repeat imports, publication and rollback.

## Source and approved changes

Source SHA-256: `e8f9e63196e569e7b319990f93e3875854a9364344b251518e0297eb0245ce6d`.

- Seven source categories, 35 resource sections, 37 original images, six intentional video placeholders, 17 text boxes and 24 Word comments. Every body paragraph is accounted for.
- The updated Word revision is the new `resources.docx`. Both the prior source and received document are preserved under `content/resources/source-history`.
- Existing PocketBase study introduction, questionnaire explanation, bleeding answer and the two staff contacts have been carried into Word. Phone and email links are clickable. Only grammatical omissions in the bleeding answer were corrected; its clinical advice was retained.
- Four pain/discomfort/fear question help links now target `dilator.pain-discomfort`; the broader sexual-health question targets `sexual-health.treatment-effects`. Superseded help records and the Test resource/collection are archived through explicit plan operations.
- The partner-conversation section moves into sexual health while retaining its permanent source key and PocketBase identity.
- PRE/POST timing is represented by explicit paragraph ranges in both FAQ and after-treatment instructions. The after-treatment category applies to both arms. No diagnosis filtering is applied. The three-month/SMS wording and existing follow-up paragraphs remain as requested.
- Local-link drafting notes, the stray character and contact placeholder were removed. Bullet capitalization was corrected. Twelve rotated pink link shapes were made horizontal and placed after their read-more paragraphs; their labels, reference targets and colors are retained.
- The emergency pair follows the updated source location inside the support answer. Resolved Word comments no longer create unresolved issues; user decisions are recorded against exact comment fingerprints.

## Content status

| Item | Count | Status |
| --- | ---: | --- |
| Image alternative texts | 37 | Approved by the user on 2026-09-30 and applied to Word drawings and asset metadata; approval retained in `content/resources/alt-text-drafts.json` |
| Anatomy illustration numbering | 1 | Corrected the lower duplicate 6 to 7; bladder remains 6 |
| PRE timeline illustration | 1 | Added “per vecka” after “2–3 ggr” to match the adjacent weekly-use text |
| Video URLs | 6 | Accepted placeholders, not publication blockers; add verified URLs later |
| Resource/collection coverage gaps | 0 | All existing referenced content has an explicit disposition |

There are zero blocking review occurrences, 11 resolved editorial issues, and six informational video placeholders. The compiler and importer retain publication checks. The two corrected images were edited with built-in image_gen and inserted into Word; old/new asset hashes and edit instructions are retained in [the correction audit](../content/resources/illustration-corrections.json). The pre-correction Word file is preserved in `content/resources/source-history/resources-before-illustration-fixes.docx`.

## Implementation and verification

The existing deterministic compiler, typed schema, PocketBase migration, content-only snapshots, import plans, transactional application, asset verification, provenance, conflict detection and rollback are retained. The app uses one renderer across FAQ, About, questionnaire help and after-treatment, with stable anchors and sanitized legacy fallback.

- 11 Python extraction tests pass, including source counts, deterministic reruns, stable IDs, invalidated comment decisions, audience boundaries, contact links and explicit placeholder requirements.
- PocketBase import tests pass, including no-op, rollback, atomicity, relation remaps, participant-data sentinels and enforced alt text even for accepted video placeholders.
- 66 frontend unit tests pass. The new tests render actual compiled PRE/POST sections across all three diagnosis values, and verify placeholder-to-working-link behavior.
- Production build passes with the existing large-bundle warning. The 18 existing browser tests passed during the original implementation; they were not rerun for this revision.
- The final 33-page Word document was rendered: 31 pages are pixel-identical to the previously inspected revision. The two changed pages were visually inspected; only the intended illustration regions changed.
- The normal app was checked against the actual local database using its existing test-account sign-in. The anatomy image and approved description load from PocketBase, About includes both staff contacts, POST timing displays the correct one-month schedule, and unavailable videos display “Film – länk kommer”.

## Local application receipt

The resource migration and 55-operation publication plan were applied to `pocketbase/pb_data`: 41 resource operations (35 managed resources and six retirements), eight collection operations, five question-help remaps and one study-settings binding. All 37 assets are stored and verified. Receipt: `54g504m1e9250gd`. Publication validation and post-import verification passed; a fresh normal publication plan contains zero operations.

A complete, hash-verified backup of all 60 local database/storage files (approximately 152 MB) was created before migration at `/Users/sebastianandreasson/Library/Application Support/PRE-RT/backups/resource-cutover-20260930-114046`. It includes the reviewed publication plan and integrity evidence. Before/after hashes confirm that the migration and import left user, answer and OTP records unchanged. This comparison was completed before starting the backend and signing in with the existing test account.

Earlier isolated review receipts were `9tp64occkw4b34d` and `gn4n0f94833o2lj`, in `/tmp/resource-review-20260930`. Those were content-only rehearsals. The generated review report now describes the actual 55-operation local publication plan. Temporary review databases are not deployment artifacts.

## Review and next update

The corrected illustrations and approved alternative texts are applied and ready to review in the normal local app. For the next Word revision, re-extract, inspect the preview, build a fresh plan against the intended target, and apply after publication validation passes. Six placeholder video links remain until their URLs are supplied.
