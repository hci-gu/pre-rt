# Word → PocketBase resource workflow

`resources.docx` owns patient-facing resource text, meaningful block layout and original illustrations. `content/resources/manifest.json` owns stable identities, app destinations, reviewed audience rules and bindings that Word cannot currently supply. Generated JSON and PocketBase content are outputs; do not hand-edit them to correct prose.

The 2026-09-30 revision is applied to the actual local PocketBase database and available in the normal app at <http://127.0.0.1:5173/faq>. It has complete coverage of existing referenced resources, both corrected illustrations and all 37 approved alternative texts. Publication validation has zero blockers; six accepted video placeholders remain until URLs are supplied. See [the implementation report](resource-content-implementation.md) for the backup and verified import receipt, [the original design](resource-content-import-plan.md) and [the document inventory](resources-document-inventory.md).

## Prerequisites

- Python 3.11+; extraction uses only the standard library.
- Go/toolchain and dependencies declared by `pocketbase/go.mod` (PocketBase v0.24.1). The wrapper builds a temporary standalone CLI; it never starts the reminder scheduler, SMS hooks or application server.
- The web project's Node runtime and pnpm **8.15.9**, declared in `web/package.json`. Install with `corepack pnpm install --frozen-lockfile` or `npx pnpm@8.15.9 install --frozen-lockfile`. If this checkout's dependencies use a custom pnpm store, pass the same `--store-dir` used by that installation.

Commands below run from the repository root. Every database command requires an explicit `--dir`. Use an absolute path so the target is unambiguous. The wrapper takes the command first; the underlying Go binary takes flags before the command.

## 1. Extract and inspect a Word revision

```sh
scripts/resources/resources extract
scripts/resources/resources validate
scripts/resources/resources preview --port 5174
```

Open <http://127.0.0.1:5174/resource-review.html>. The preview is local development tooling and is excluded from the production build. It uses the same block renderer as FAQ, About, questionnaire help and after-treatment pages. It provides category navigation, PRE/POST and treatment-phase views, source warnings and an optional database coverage report.

Extraction writes:

| Output | Purpose |
| --- | --- |
| `content/resources/generated/bundle.json` | Versioned collections, resource blocks, ordered membership, audience rules, links, source locators and hashes |
| `content/resources/generated/assets/<sha256>.png` | Original media bytes; filename identity survives Word media renaming |
| `content/resources/generated/issues.json` | Source problems with evidence and stable fingerprints |
| `content/resources/generated/coverage.json` | Paragraph dispositions, source text, image/shape counts, comments and thread metadata |

Commit the document, manifest, compiler/schema changes and regenerated bundle/assets together. Review `git diff`, the preview and `coverage.json`. Old hashed assets may remain on disk; only assets listed in the bundle are imported. No automatic deletion is performed.

Normal extraction permits a draft with editorial issues; structural/schema errors still fail. `validate --publish` also rejects unresolved source issues. The importer separately validates its input and enforces required image descriptions, explicit video placeholders or destinations, allowed URLs and supported block/audience types.

## 2. Review against existing app content without copying participants

Export only resource content and inbound content relations from the intended database. The snapshot includes resources, collections, question resource/collection IDs and study-settings content bindings; it does not export accounts, answers or questionnaire response data.

```sh
scripts/resources/resources snapshot --dir /absolute/path/to/pb_data --out /tmp/resource-content-snapshot.json
scripts/resources/resources init-review --dir /tmp/resource-review-new
scripts/resources/resources load-review --dir /tmp/resource-review-new --snapshot /tmp/resource-content-snapshot.json
scripts/resources/resources plan --dir /tmp/resource-review-new --review --out /tmp/resource-plan.json
scripts/resources/resources report /tmp/resource-plan.json
```

`init-review` requires a new database directory. It creates a marker that is required for draft imports; adding `--review` cannot bypass publication checks on a normal database. `load-review` is for content-only review and relaxes questionnaire requirements on its isolated settings records because questionnaire definitions are intentionally absent.

The plan lists exact before/after values, stable IDs, creations/updates/retirements, relation changes, database conflicts and coverage. `report` produces `generated/review-report.md` and `.json`; these target-specific files are ignored by Git. The browser preview reads the report when its extraction hash matches and warns when it is stale. Regenerate the report after each extraction or target change.

The review is deliberately conservative: it checks every resource relation in every collection and question, including hidden collections, plus About and after-treatment bindings. Unreferenced records are listed separately. An unreachable record is not automatically deleted. A reachable resource absent from Word blocks full publication.

Apply the reviewed draft in the isolated database:

```sh
scripts/resources/resources apply --dir /tmp/resource-review-new --plan /tmp/resource-plan.json
# Use the Run ID printed by apply:
scripts/resources/resources verify --dir /tmp/resource-review-new --run RUN_ID
scripts/resources/resources plan --dir /tmp/resource-review-new --review --out /tmp/resource-reapply.json
```

The second plan should contain zero operations. A no-op apply prints `Run: unchanged`, creates no receipt and updates no content timestamps. There is no run ID to verify for a no-op. The preview renders the extracted bundle; verification checks the actual imported database and stored asset bytes.

## 3. Make routine document updates

1. Edit Word, preserving the existing heading paragraphs when possible. Correct medical prose and text inside illustrations in Word; do not patch generated JSON or legacy HTML.
2. Rerun `extract` and `validate`.
3. Review the generated diff, source warnings and visual layout. Update the manifest only where identities, new sections, verified media metadata or app bindings require it.
4. Build a fresh target-specific plan and report, review it, then apply and verify. Apply rechecks both the source bundle and target content state and rejects stale or hand-edited plans.

Minor title/text/style/order edits use the same source key and PocketBase record ID. The compiler uses Word paragraph IDs rather than page numbers or heading text as identity. Existing title slugs become historical aliases; new deep links use stable keys. Missing or ambiguous paragraph IDs require a reviewed manifest adjustment. New resource keys are permanent, even if the title changes later.

For a new section, add an entry under `resources` or `collections` with `sourceKey`, `paraId`, and `titleHistory`. Obtain paragraph IDs from `coverage.json`. An `existingId` is an explicit bootstrap mapping only when the existing record has the same meaning. If it is absent in a fresh database, the importer creates a deterministic record ID; future runs locate records by owner/source key.

The `study` collection first falls back to the target's `studySettings.aboutCollection` when its bootstrap ID is absent. That migration creates a different About collection ID on each installation; following the binding preserves the correct page across local and test databases.

Audience metadata supports `arms: ["PRE", "POST"]`, `phases: ["before", "during", "after"]` and `diagnoses: ["anal", "corpus", "cervix"]`, each as an optional nonempty subset. Missing user data does not match a restriction. Treatment dates include their whole local calendar days. The after-treatment category is available to both PRE and POST after treatment. Timing sections use reviewed `audienceRanges` with inclusive start/end Word paragraph IDs, and split only by PRE/POST. Missing, moved, duplicated or out-of-section boundaries and unassigned timing content block publication. Existing diagnosis-labelled follow-up prose remains visible to both arms as requested.

## 4. Resolve source and coverage issues

| Issue | Resolution location |
| --- | --- |
| Incorrect or contradictory patient text, placeholder contacts, inline author notes | Correct the Word document |
| Missing image descriptions | Prefer Word drawing alt text, or add reviewed `assets[SHA].alt` in the manifest; use `decorative: true` only for genuinely decorative media |
| Video screenshot without playback destination | The six current missing links have explicit `placeholder: true`; patients see “Film – länk kommer”. Later add a verified HTTPS `url` (and remove `placeholder`); the screenshot remains its poster |
| Changed heading anchor or new section | Review and update the manifest identity mapping |
| Open editorial comment | Resolve in Word, or record a reviewer/date/rationale under `resolutions[ISSUE_ID]` |
| Confirmed frequency wording | Correct Word, or record the author's explicit confirmation under the exact timing issue fingerprint |
| Live app prose absent from Word | Add source-backed sections and mappings, or explicitly retire/remap their existing uses |

Only editorial-comment and timing-frequency issues accept fingerprinted resolutions. Changed evidence invalidates that resolution. Unsupported source constructs, inline drafting notes, missing identities and missing image descriptions must be fixed; they cannot be waived by a resolution note. An intentional video placeholder requires `assets[SHA].placeholder: true`. Resolved Word comment threads are retained in audit metadata without generating an unresolved issue. Video URLs are rendered as links, not arbitrary provider embeds.

Image-description proposals and their approval status are in `content/resources/alt-text-drafts.json` and the preview gallery. All 37 current descriptions were approved by the user on 2026-09-30 and copied to their assets’ `alt` fields in the manifest and Word’s drawing alternative text. Future proposals must be approved before applying them to the manifest or Word’s drawing alternative text. An `assets[SHA].reviewNote` keeps a specific illustration correction visible until that asset has been corrected and reviewed. Both initial illustration corrections are complete; their old/new hashes and edit instructions are recorded in `content/resources/illustration-corrections.json`.

The received revision and previous source are preserved in `content/resources/source-history`. Study contacts appear in both the About and after-treatment sections of Word; update both appearances when the contacts change.

The manifest does not replace body text. If a replacement changes the source's meaning, change Word. Reference comments supply link destinations and remain audit metadata; editorial comments are never rendered as patient prose.

Explicit relation remapping and retirement use this shape:

```json
{
  "relationRemaps": [
    {
      "collection": "questions",
      "id": "EXISTING_ROW_ID",
      "field": "resource",
      "target": "permanent.source-key"
    }
  ],
  "retirements": [
    { "collection": "resource", "id": "OLD_RESOURCE_ID" }
  ]
}
```

Supported remaps are `questions.resource`, `questions.resourceCollection`, `studySettings.aboutCollection` and `studySettings.afterTreatmentCollection`. Targets must be source keys of the correct type. Collection membership comes from document order. Retiring a collection clears membership and hides it; retiring a resource archives it. Any remaining inbound reference blocks apply. To remove a question's help relation without a replacement, update that configuration deliberately before creating the import plan; the importer does not rewrite questionnaires.

Do not remove an old manifest entry until its removed source section has been assessed. Once retirement is approved, remove the absent identity entry and add the explicit retirement. Previously managed records that disappear without retirement are also flagged in the target plan.

## 5. Publish after review is complete

For the disposable test environment, run `scripts/deploy/test.sh`; it builds,
pushes, deploys and imports resources automatically. See the
[short test guide](../deploy/test/README.md). The manual backup and rollout steps
below apply to production or other environments whose data must be preserved.

Use the normal database backup and deployment process, deploy the backend schema migration before the web app, then build a fresh publication plan on the actual target. The CLI's `migrate` command runs all pending repository migrations, not just the resource migration; review pending migrations before using it on an existing environment.

```sh
scripts/resources/resources validate --publish
scripts/resources/resources migrate --dir /absolute/path/to/pb_data
scripts/resources/resources plan --dir /absolute/path/to/pb_data --out /secure/path/resource-publish-plan.json
scripts/resources/resources report /secure/path/resource-publish-plan.json
scripts/resources/resources apply --dir /absolute/path/to/pb_data --plan /secure/path/resource-publish-plan.json
scripts/resources/resources verify --dir /absolute/path/to/pb_data --run RUN_ID
```

`plan` can succeed while reporting blockers so its output remains reviewable; **apply refuses publication when any blocker remains**. Review mode is never the publication escape hatch. Normal schema migration adds structured fields without rewriting old prose; unmapped resources temporarily use the sanitized legacy renderer.

Before record writes, assets are staged and checked by their actual byte hash. All resource, collection and approved relation changes plus the receipt are saved in one PocketBase transaction. A failure leaves no partial content update, although staged unused files may remain for retry. The CLI serializes its own runs and checks target state again inside the transaction. No participant records are imported or restored.

An external edit to an imported field produces a database conflict, even if Word is unchanged. Move the intended correction into Word, or explicitly choose Word's version on a new plan:

```sh
scripts/resources/resources plan --dir /absolute/path/to/pb_data --prefer-source resource/RECORD_ID --out /secure/path/resolved-plan.json
```

Review the new plan before applying it. The conflict override is recorded in that plan; it cannot bypass source or coverage blockers. Future updates overwrite only importer-owned fields. Collection card images and unrelated configuration remain outside the importer.

## 6. Verify, retry and roll back

If apply output is interrupted, inspect `resourceImportRun` in the target's admin UI, verify the reported/latest matching receipt, and regenerate the plan. Do not assume the absence of terminal output means nothing committed. A successful no-op retry performs no writes.

```sh
scripts/resources/resources rollback --dir /absolute/path/to/pb_data --run RUN_ID --out /secure/path/resource-rollback.json
# Review the rollback's exact before/after operations, then:
scripts/resources/resources apply --dir /absolute/path/to/pb_data --plan /secure/path/resource-rollback.json
scripts/resources/resources verify --dir /absolute/path/to/pb_data --run ROLLBACK_RUN_ID
```

Rollback restores prior content fields, relation arrays, settings bindings and import provenance. Newly created records are archived rather than deleted. It refuses to overwrite later changes or leave a newer inbound reference dangling. Work backwards through dependent runs. Retained assets allow rollback and are not automatically garbage-collected; clean them up only after auditing references and the desired rollback retention period.

Receipts and baselines are admin-only/hidden, and resource reads remain authenticated. Archived resource records are excluded by API rules and frontend mappings. The schema down migration intentionally preserves imported data; content rollback is the supported undo operation.

## Maintenance checks

```sh
python3 -m unittest discover -s scripts/resources -p 'test_*.py'
go -C pocketbase test ./...
pnpm --dir web build
pnpm --dir web test:unit
pnpm --dir web test:e2e
```

The baseline extraction tests describe the current source revision. Update their counts intentionally when the document adds/removes content; do not turn them into permanent document limits. When extraction semantics change, bump the parser version and review generated diffs. When the block contract changes, update the JSON schema, Go validation and shared renderer together.

The temporary HTML path uses [DOMPurify](https://github.com/cure53/DOMPurify) with a restricted tag/attribute and URL set, after legacy PRE/POST substitution. Imported content is rendered as typed React nodes and never converted to arbitrary HTML.
