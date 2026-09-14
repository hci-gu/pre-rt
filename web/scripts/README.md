# Local FAQ content migration

With the local PocketBase running and a local superuser token in
`PB_SUPERUSER_TOKEN`, run from `web/`:

```sh
node scripts/seed-faq.mjs
node scripts/seed-faq.mjs --apply
```

`PB_URL` defaults to `http://127.0.0.1:8090`. Remote hosts are rejected.
The first command previews the changes; the second applies them through the
running PocketBase API. Before writing, it saves the original resources,
collections and collection schema in `pocketbase/pb_data/faq-backups/`.
Those backups contain the original HTML, including embedded media.

The seed creates four real resources, updates FAQ titles and relations, and
adds the existing redesign illustrations to the stored HTML. Existing clinical
copy and PRE/POST conditions are retained. Separate pain/discomfort resources
remain available to questionnaire relations. Existing collection images and
unrelated resource relations are preserved.

The timing resource uses the existing database instructions. The former React
timing panel and its illustration are intentionally not copied because they
conflicted with those instructions.

Collection display fields are shared with the Go schema migration. The seed
also adds any missing fields through the API so it works without restarting
the running local server. Subsequent migration runs skip fields already added.
Reruns reuse the four resource IDs and do not duplicate illustrations or files.
This is a one-time content migration: after running it, edit titles, HTML,
ordering, artwork, visibility and quick-exit behavior in PocketBase.
