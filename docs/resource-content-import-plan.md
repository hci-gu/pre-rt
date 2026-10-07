# Resource document import plan

Status: implemented for review on 24 September 2026. See the [implementation report](resource-content-implementation.md) and [operating guide](resource-content-workflow.md). The original source document and existing app resource content remain unchanged; draft imports were validated in isolated content-only databases. Publication remains gated on the source and coverage issues described below. This document records the approved design; the operating guide describes the delivered commands.

## Objective and recommended approach

Make `resources.docx` the editorial authority for every resource shown in the app: FAQ answers, questionnaire help, study information, and after-treatment information. Extract it into a versioned, validated JSON bundle with explicit content and layout blocks, then reconcile that bundle into PocketBase without changing existing record identities unnecessarily.

The repeatable workflow should be:

```text
resources.docx + small mapping manifest
    → OOXML extraction + original images + editorial issue report
    → validated content bundle + browser preview
    → comparison with last import and current PocketBase data
    → reviewed change plan
    → transactional PocketBase update + import receipt
```

Word owns wording, hierarchy, sequence, emphasis, illustration placement, advice boxes, and link labels. A small checked-in manifest owns persistent identities and interpretations Word does not express reliably, such as a screenshot's actual video URL or the destination of a placeholder internal link. It must not become a second store of patient-facing prose.

Use a typed JSON content tree as the canonical imported representation. Keep the existing PocketBase collections and relation IDs. Add a shared React block renderer rather than accumulating more title-specific HTML overrides. Existing HTML can remain as a temporary fallback during migration; imported records must render from blocks consistently everywhere.

## What was actually inspected

- All document body text, text boxes, styles, numbering, media relationships, body hyperlinks, comments, and comment hyperlinks.
- A 32-page rendering produced locally by Microsoft Word: all pages reviewed in contact sheets, with detailed checks of the timing, floating links, and emergency box. Pagination is a rendering property, not an import identifier. The packaged document rendering runtime was unavailable here; Quick Look was also tried but did not faithfully place floating shapes.
- Resource schema migrations, `web/scripts/seed-faq.mjs`, the resource/collection components, FAQ routes, questionnaire help, study settings, and the after-treatment page.
- Local PocketBase content and resource relations through read-only SQLite queries. This was not a production database audit and did not read participant answers or account records.

Source SHA-256: `5ae6d5a909b358fdfdfefc957abe4e76a8e914f6647cb10da6790eeab556fa09`.

### Document inventory

| Order | Document section | Resource sections | Initial app destination |
| --- | --- | ---: | --- |
| 1 | Strålbehandling och biverkningar | 10 | FAQ collection `85071a5innq3o43` |
| 2 | Användning av vaginalstav | 6 | FAQ collection `1ei3zjui10q8q91` |
| 3 | Om intimvård | 3 | FAQ collection `23s6oyiql5gc9qi` |
| 4 | Om sexuell hälsa | 4 | FAQ collection `94ze51rc8dz5oh6` |
| 5 | Frågor om våld | 5 | FAQ collection `7d5griw67n84z36` |
| 6 | För Pre-RT-armen, EFTER strålbehandlingen | 4 | New after-treatment collection, outside the FAQ listing |

That is **28 FAQ answers and 4 after-treatment sections**, plus an emergency information group. The emergency group is not a 33rd answer. Its intended collection-level placement should be recorded explicitly.

The physical OOXML contains:

- 506 top-level paragraphs; 255 are blank and contain no drawing. Much of the page spacing is made from empty paragraphs.
- Five `Rubrik1Sd` category headings. `Rubrik2Sd` occurs 34 times: 32 resource headings, one blank heading, and the `Inforuta:` label. Two additional `Rubrik2` paragraphs are blank/image-only.
- Both custom heading styles have `outlineLvl=0`, despite representing different semantic levels. Heading extraction cannot rely on outline level alone.
- The after-treatment boundary is an ordinary bold, yellow-highlighted paragraph, not a category heading.
- 37 embedded PNGs, including six video-player screenshots. No video media file or playable video relationship was found in the package. No drawing has a `wp:docPr/@descr` alt description.
- 16 `mc:AlternateContent` containers. Selecting their supported modern branch yields 17 text boxes: 12 pink link shapes, three peach advice boxes, and two yellow emergency boxes in one grouped drawing. Reading both Choice and Fallback duplicates content.
- Eight body hyperlinks after branch selection: three placeholder internal links, one 1177 page link, two organisation links, and two telephone links. Raw traversal finds ten because the emergency links also occur in the fallback branch.
- 19 comments: 11 reference comments holding 12 hyperlinks, and eight editorial comments. Comments include threaded discussion and need their anchors and thread metadata preserved in the audit.
- One portrait A4 section, no tables, no content controls, and no tracked insertions/deletions in this revision.

The detailed heading inventory is in [resources-document-inventory.md](resources-document-inventory.md).

### Layout contract

| Source pattern | Imported representation | App behaviour |
| --- | --- | --- |
| Category and question headings | Collection and resource titles | Preserve exact wording and document order |
| Paragraphs, emphasis, inline links | Paragraph blocks with inline marks | Preserve content and meaningful breaks |
| Lists, including those in text boxes | List blocks with ordered/unordered items | Resolve `numbering.xml`; preserve nesting and starts |
| Step text followed by an illustration | List items containing text and image blocks | Keep each illustration attached to its step; no appended gallery |
| Inline illustrations | Image blocks with asset reference and size/aspect metadata | Preserve sequence, source crop, and relative scale |
| Peach advice boxes, fill `FBEEE5` | Callout blocks | Preserve heading, bullets, background and placement |
| Pink link shapes, fill `FFC0C0` | Link-button blocks | Combine visible label with the anchored comment's URL |
| Yellow emergency pair, fill `FFFFD5` | Two-column group of callout blocks | Side by side when space permits; stack in source order on mobile |
| Video screenshot and film introduction | Video block with poster, title, verified destination | Require an actual playback/link target; a screenshot is not a video |
| Quoted definition and inline bold subheadings | Quote/subheading blocks or marked paragraphs | Preserve their role within an answer |
| Highlighted audience instruction | Audience metadata | Exclude editorial instruction from patient-facing prose |
| Empty paragraphs and print pagination | Source evidence only | Use responsive spacing rather than dozens of empty lines |

Preserve the original PNGs first. Existing redesign SVGs are not automatic substitutes for document illustrations. Any later replacement needs an explicit, reviewed asset mapping. Text inside raster illustrations remains part of the source; changing only the surrounding text is insufficient when an illustration repeats an instruction.

Floating link shapes sometimes render away from their `Läs mer här:` marker or wrap through the next paragraph. Assign them to the intended link marker using shape anchors, comment anchors, and visual review, and record the few necessary placement exceptions. Do not reproduce accidental floating-object collisions as mobile layout.

## Current app and database constraints

The local snapshot contains **52 resources, eight collections, and ten question records with a resource or resource-collection relation**. Re-read these from each target environment during import planning; local IDs are bootstrap candidates, not proof of production contents.

Existing storage already supports:

- `resource.title` and `resource.description` HTML.
- `resourceCollection.name`, `pageTitle`, `description`, `footerContent`, `resources`, `sort`, `image`, `imageCompact`, `visible_on_questions_and_answers`, and `showQuickExit`.
- Ordered collection membership: `mapResourceCollection` reconstructs expanded resources in the order of the `resources` relation array.
- Shared resources referenced by questionnaire help and the About collection, selected through `studySettings.aboutCollection`.

Important differences from the document:

1. The app currently orders sexual health before intimate care. The import should follow the document's order.
2. The one-time seed retains old clinical HTML, adds illustrations after it, and supplies short hand-written answers for wounds and shaving. These must be replaced by document-derived content, not retained as overrides.
3. Timing currently uses encoded or literal `<pre>`/`<post>` tags interpreted by regex in `resource.tsx`. The new document does not provide a complete replacement PRE/POST specification.
4. Resource accordion anchors derive from titles. A title update changes deep links; duplicate titles can collide. Introduce stable resource-key/ID anchors and retain explicit old-slug aliases.
5. `/after-treatment` currently renders only a heading. It needs a configured collection and actual audience-aware content.
6. `ResourceCollection` footers render on the FAQ page but not through every help-drawer path. A violence information group must not disappear in questionnaire help.
7. Collection introductions are currently forced bold by their container. Imported typography should come from block semantics instead.
8. The frontend user model exposes PRE/POST and treatment dates, but does not currently map diagnosis. Diagnosis-specific filtering requires an explicit model change and an agreed mapping to backend diagnosis values.

### Coverage requirement for ALL resources

Before cutover, generate a reachability report across all resource collections, `questions.resource`, `questions.resourceCollection`, `studySettings.aboutCollection`, and the new after-treatment binding. Classify every one of the 52 local resources, then repeat against the target environment:

- **Mapped:** same semantic resource, reuse its existing ID and replace its content from Word.
- **Merged or split:** explicitly map each old ID and every inbound relation to the appropriate document resource or source-backed excerpt.
- **Missing from Word:** keep as a reported migration gap until the author adds it to Word or explicitly chooses to retire its use.
- **Unreferenced/test:** report separately; do not delete merely because it is absent from Word.

Examples of missing or incomplete coverage include the full study-purpose/introduction text, reasons for answering questionnaires, named study contacts, standalone bleeding help, and some fear/pain help variants. The document ends with `(kontaktruta)` but supplies no names. Its generic contact paragraph cannot supply the missing contact details.

There are also several old violence answers and duplicate contact/reason records. Similar titles do not establish identical meaning. Review their inbound uses before consolidation. A temporary HTML fallback is acceptable during rollout, but **the all-resources objective is not complete while any reachable resource depends on prose absent from Word**. Do not silently delete missing material or declare an FAQ-only import complete.

## Extraction and identity design

### 1. Deterministic OOXML parser

Implement a small dedicated extractor, preferably Python with ZIP/XML parsing and a pinned environment. A general DOCX-to-HTML converter may help with previewing, but cannot be the sole extractor for this file's shapes, alternate branches, and comments.

Read `document.xml`, `styles.xml`, `numbering.xml`, document relationships, `comments.xml`, comment relationships/thread metadata, and `word/media/*`. Walk body and drawing content in order, selecting one supported branch of each `AlternateContent`. Resolve inherited styles plus direct paragraph/run formatting. Handle future unsupported constructs by reporting them rather than silently dropping them.

Separate ordinary text, text-box content, and drawing anchors before assigning resources. Preserve exact Swedish text and punctuation. Normalize run boundaries and XML whitespace semantics; do not spell-correct or rewrite text. Classify blank spacer paragraphs, editorial labels, comments, and duplicated fallback nodes with an explicit reason.

Produce a coverage ledger: every text-bearing source node, image, hyperlink, and shape must be assigned to an output block, an editorial issue, or a documented exclusion. Extract first, then validate; unresolved material must remain inspectable in a draft bundle.

### 2. Persistent source keys

Assign each resource/collection an immutable `sourceKey` such as `dilator.measure-length`. Never derive identity from its current title, sequence, page number, DOCX relationship ID, or image filename.

Bootstrap a checked-in manifest with source keys, heading `w14:paraId` anchors, expected style, existing PocketBase IDs where confirmed, and title history. Match unchanged anchors first. If Word rewrites paragraph IDs, use historical title/content context to propose matches, then require explicit resolution of ambiguous renames, splits or merges. Fuzzy matching must not silently decide record identity.

Initially the author can continue editing the existing Word document. As an optional later improvement, add durable bookmarks/content-control tags for section keys. This is not a prerequisite for the first parser and would require a deliberate edit to Word.

Keep technical resolutions in the manifest: internal-link target keys, video bindings, placement exceptions, disposition of editorial comments, alt text/decorative classification, and identity aliases. Tie each resolution to a source fingerprint; changed source content invalidates stale resolutions. Patient-facing wording corrections go back into Word.

### 3. Canonical content bundle

Proposed files:

```text
content/resources/manifest.json             # identities and narrow interpretation rules
content/resources/schema.json               # versioned JSON Schema
content/resources/generated/bundle.json     # generated; never hand edited
content/resources/generated/assets/<sha>.png
content/resources/generated/issues.json
content/resources/generated/coverage.json
scripts/resources/                         # extract, validate, preview, plan
pocketbase/internal/resourceimport/         # validated reconciliation and apply
web/src/components/resource-content/        # shared renderer
```

The bundle contains source hash, parser/schema/manifest versions, collections, resources, assets, source locators, and validation findings. A resource contains `sourceKey`, `title`, `audience`, `blocks`, and semantic hashes. Each block retains a source locator so a review can return to the originating paragraph/shape/comment.

Use a small discriminated block union: paragraph, subheading, list, image, callout, columns, quote, linkButton, video, and audienceGroup. List items and callouts contain child blocks, allowing illustrated instructions without losing their grouping. Inline nodes support text, emphasis, and external/internal/telephone links.

Audience data distinguishes **study arm** from **treatment phase**. For example, the final section explicitly describes PRE participants after treatment; that does not mean POST participants. Represent arm, phase, and optional diagnosis separately. Do not infer new clinical audience rules from text or apply generic timing to all participants by default. Missing user data must not select an unverified variant.

Use SHA-256 image identities, independent of Word's `image18.png` names. Preserve occurrence-level crop/size/alt metadata separately from the binary so one image can be reused in multiple places. Produce readable diffs for text, block order, emphasis, assets, links, and audience rules; a Word save that only changes ZIP metadata should not update PocketBase records.

## PocketBase changes

Use normal schema migrations for fields/indexes. Content revisions use the importer, not one new Go migration per document edit.

| Collection | Proposed additions | Purpose |
| --- | --- | --- |
| `resource` | `sourceKey`, `content` JSON, `contentSchemaVersion`, `contentHash`, `sourceDocumentHash`, `importRun`, `managedBy`, `archived` | Store canonical blocks, ownership and provenance |
| `resourceCollection` | Same identity/provenance fields; `introContent`, `footerBlocks`, `audience` JSON | Source-driven shared layout and collection eligibility |
| `resourceAsset` | `sourceKey`/binary hash, `file`, media type, dimensions | Deduplicated PocketBase file storage; block references resolve through its records |
| `resourceImportRun` | document/bundle/manifest hashes, parser version, status, target identity, summary, rollback bundle | Auditable import and previous managed values |
| `studySettings` | `afterTreatmentCollection` relation | Configure the final four sections without hard-coded frontend IDs |

Use uniqueness constraints on nonempty managed source keys, scoped to this source where appropriate. Old unmapped records must coexist during adoption. Verify field size limits against actual bundles; large base64 images currently make some HTML fields exceed 1 MB, so store extracted images as files rather than embedding them in JSON/HTML.

Keep authenticated content read rules and superuser-only writes; import receipts, comments, and rollback artifacts should not become participant-readable. Validate keys, audience enums, block schemas, file hashes, and links server-side. Allow only supported URL schemes/media providers. Render text as React nodes; restrict and sanitize any temporary HTML path.

### Renderer integration

Use one renderer for FAQ answers, single-resource help, collection help, About, and after-treatment. Ensure introduction and footer blocks follow the same rendering path. Resolve media through PocketBase's file API, not fixed development URLs.

Preserve accordion interaction, quick exit, and app navigation. Word controls the layout inside and between resources; responsive app controls remain implemented in React. Add stable resource anchors and old title-slug aliases, including explicit collision handling. Resolve internal links from source keys to the target collection and resource anchor; never emit the current placeholder `/about` URL by default.

## Safe, repeatable updates

1. **Extract:** generate the bundle, assets, issues, coverage ledger, and preview without database writes.
2. **Validate:** reject unsupported blocks, missing assets, ambiguous identities, unresolved link/video targets, unclassified source content, and incomplete audience rules for publication. Draft previews may display clear review placeholders.
3. **Plan:** read all target resource content and inbound relations. Compare the new bundle, the last successful import, and current managed field values. Report creates, edits, renames, moves, retirements, unchanged records, external changes, and missing coverage.
4. **Resolve conflicts:** Word remains authoritative, but out-of-band PocketBase edits must be visible. Bring intended editorial changes into Word, or explicitly resolve replacement in the reviewed plan. No silent mixing of old DB copy and new document copy.
5. **Stage assets:** upload content-addressed files and verify their availability before publishing references. Reuse existing hashes. A failed run may leave unused staged assets; report them and clean them separately.
6. **Apply:** use a backend Go command/service and `RunInTransaction`, with the transaction's app for every record operation. Recheck the plan's target preconditions inside the transaction, then update resources, ordered memberships, approved relation remaps, settings, and the successful import receipt together. Serialize imports; reject a plan if its source or database preconditions changed.
7. **Verify:** read back touched records and file references; check canonical hashes, relation order, all inbound links, and rendered views. Record success only when the intended database state is verified. If a post-commit callback errors, inspect the receipt/state before deciding whether retry is safe.

PocketBase database transactions are documented in [Go database operations](https://pocketbase.io/docs/go-database/); the repository's pinned backend is **v0.24.1**, and `core/db_tx.go` in that version was checked for `RunInTransaction`. Test the importer against that exact version rather than assuming examples for newer versions apply unchanged. Treat file storage as a separately staged concern, not as guaranteed transactional rollback of file bytes.

Preserve existing PocketBase record IDs on edits, title changes, and category moves. Completely replace the ordered membership of each fully managed collection with the intended source membership once coverage is resolved; appending unmanaged leftovers would violate Word's order and completeness. Unmanaged collections require explicit reconciliation, not blanket replacement.

A removed source section becomes a proposed retirement. Block retirement while live references lack an approved replacement/removal; retain the old record for rollback instead of hard deletion. Reader queries, expansion mapping, and direct access must respect archive state. Do not allow an archived answer to remain reachable through a questionnaire.

Retain previous managed field values, relation arrays, settings, and asset references in a rollback bundle. Reverting an import must be a new checked operation that verifies no intervening changes and restores only imported content/configuration, never participant answers. Keep old assets until rollback retention ends.

**Idempotence:** applying the same semantic bundle to an unchanged target performs zero content writes, does not change record `updated` timestamps, and uploads no duplicate files. Title/order edits affect the intended records only. Extraction hashes exclude volatile Word metadata; compilation/schema changes have explicit versioned effects.

## Source issues to resolve before publication

These are findings in this source revision, not wording changes to make automatically.

| Issue | Evidence | Required resolution |
| --- | --- | --- |
| Timing conflict and unspecified audience | Body paragraphs 213 and 487 say `2-3 gånger dagligen`; the local PRE record says `2-3 gånger i veckan`. The timeline image says `Sedan 2-3 ggr i 2-3 år` without a frequency period. Comment `151723897` asks about diagnosis and PRE/POST variants. | Author confirms the intended wording and audience in Word, including image consistency and the missing POST instructions |
| Local estrogen during treatment | Comment `1153755283` asks whether to wait until after radiation; comment `271943988` explains a moved advice box | Keep the box in its current source position; record a content-owner decision on the unresolved treatment wording |
| Section placement and wording | Comments `1333713561` and `43954456` question the partner-discussion category and phrasing | Preserve current document placement until revised; do not move it to sexual health based only on a question in a comment |
| Shaving and violence edits | Comments `740263242` and `1447515033` ask about adding waxing advice and omitted violence content | Resolve or explicitly classify these editorial comments; do not invent additions |
| Follow-up promise | Comment `1978030157` questions the three-month follow-up/SMS statement | Confirm it in Word and reconcile with the study workflow; a content import must not silently change reminder scheduling |
| Missing video sources | Six player screenshots, one general 1177 page URL, no embedded video files | Bind each to a verified video or author-approved link; reuse the estrogen video binding where the text requests the same film |
| Placeholder internal links | All three point to `https://pre-rt.prod.appadem.in/about` despite different labels | Map estrogen, intimate care, and dry-mucosa links to explicit source keys |
| Missing contacts and other resource coverage | `(kontaktruta)` without names; current study and questionnaire help extends beyond the document | Add source sections or make explicit retirement/rebinding decisions |
| Emergency group placement | `Inforuta:` uses a question style but contains two grouped boxes | Map to collection footer/shared safety content, retain quick exit, and verify it appears in violence questionnaire help |
| Authoring debris and accessibility | Stray `¨`, blank headings, explanatory `(lokal länk)` text, missing figure alt descriptions, anatomy legend omits number 11 before `Yttre blygdläppar` | Record exclusions/corrections individually; supply author-reviewed accessible descriptions for meaningful images |

Contact numbers and other time-sensitive facts should be checked by the content owner during source sign-off. This audit records their presence; it does not independently certify clinical advice or contact details. Source corrections must flow through Word so subsequent imports retain them.

## Delivery phases and acceptance criteria

| Phase | Deliverable | Complete when |
| --- | --- | --- |
| 1. Source baseline and mapping | Full target inventory, source manifest, issue/coverage register | Every existing resource and inbound relation has a disposition; all 32 sections and the emergency group are identified |
| 2. Extractor and draft bundle | OOXML parser, JSON schema, original assets, preview | All source text/media/shapes are accounted for; no duplicate fallback text; comments remain review metadata |
| 3. Source resolution | Updated Word and narrow manifest resolutions | Missing coverage, audience conflicts, video/link bindings and publication-blocking comments are resolved |
| 4. PocketBase importer | Schema migrations, dry-run planner, transactional apply, receipts and rollback | A copy of the local data can be imported, reapplied without writes, and rolled back; a fresh instance can also be populated without relying on old seed records |
| 5. Shared app rendering | Blocks on every resource surface; after-treatment binding; stable anchors | Text, order and layout match the source; audience variants, links, media, quick exit and help drawers work |
| 6. Cutover and maintenance | Reviewed target plan, verified import, runbook, retired old seed instructions | No reachable resource depends on non-document prose; future edits use the documented rerun workflow |

Recommended meaningful tests:

- Fixture extraction of the three peach boxes, pink links with comment URLs, the grouped emergency pair, step illustrations, lists with direct numbering, and the highlighted after-treatment boundary.
- Coverage baseline of 28 FAQ answers + 4 after-treatment sections, 37 image occurrences, 17 text boxes, 19 comments, and eight effective body hyperlinks for this exact source hash. Treat these as a baseline fixture, not permanent limits on future revisions.
- Update scenarios: punctuation-only edit; title rename; category reorder; move between categories; new answer; removed answer still used by a questionnaire; regenerated paragraph IDs; changed screenshot; ambiguous merge; external PocketBase edit.
- Import failure before commit, failure during record update, staged-asset failure, retry after uncertain completion, rollback, and no-op reapply. Verify no participant records are changed.
- PRE/POST and before/during/after views, missing treatment dates, supported diagnosis variants, and missing diagnosis. Do not infer a clinical rule to make a test pass.
- Visual comparison of every resource at desktop/mobile widths, including source image ordering and advice/emergency boxes; explicit checks for duplicate text, fake video players, broken internal anchors, and absent footers in help dialogs.

## Routine author workflow after implementation

The following names are proposed commands, not commands available today:

```sh
resources extract resources.docx
resources validate
resources preview
resources plan --target local
resources apply --plan <reviewed-plan.json>
resources verify --run <import-run-id>
```

For an ordinary wording/image/order change: edit Word, rerun extraction, inspect the semantic diff and changed previews, then apply the reviewed plan. No parser edit, manual HTML editing, or new content migration should be needed. New headings or structural changes may require a small manifest identity/placement update. New unsupported Word features require an explicit parser addition rather than silent degradation.

Update `web/scripts/README.md` to replace its current instruction to edit resource content directly in PocketBase. Retire `seed-faq.mjs` from the active workflow after adoption so it cannot reinstate the former wording or layout. Preserve historical migrations; use the importer as the sole ongoing writer of document-managed fields.
