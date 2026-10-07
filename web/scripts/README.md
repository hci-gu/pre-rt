# Resource content workflow

`seed-faq.mjs` is retired and exits without modifying data. Resource text and
layout now come from the repository's `resources.docx`.

See [the resource content runbook](../../docs/resource-content-workflow.md) for
extraction, local review, PocketBase planning/apply, conflict handling and rollback.
Do not edit document-managed text directly in PocketBase: the importer detects
those edits as conflicts. Make the editorial change in Word, then rerun.
