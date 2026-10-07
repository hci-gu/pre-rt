# Deploy to test

Test data is disposable. Production is separate and keeps its own backup and
migration safeguards.

With Docker running and Docker/OpenShift logged in, run from the repository root:

```sh
scripts/deploy/test.sh
```

This builds and pushes both images, deploys the API and web app, and checks they
start. The API automatically runs migrations, creates the reviewed questionnaire
graph, imports the packaged Word resources, then resolves and validates every
questionnaire help binding before serving requests. Missing help targets are
permitted only during that initial preparation; the final strict import must
succeed or the API cannot start. The packaged questionnaire
snapshot contains no users or answers. Its importer requires `APP_ENV=test`,
validates all relations in one transaction, and leaves participant data intact. No manual import, backup or approval steps.

`content/questionnaires/production-20261007.json` is the reviewed definition
snapshot, including the approved local introduction and help corrections. Update
that source when changing test questionnaire definitions: the next deployment
reapplies it, so direct database edits are not a durable content workflow.

Open **https://pre-rt.test.appadem.in** and use **Prova med testkonto**.

To build only, without pushing or deploying:

```sh
scripts/deploy/prepare-test.sh
```

Image tags live in `api.yaml` and `web.yaml`. Keep the API and its `resource-import`
init container on the same image. Reusing a tag is fine for test; the script
restarts both deployments and pulls the images again.

If deployment fails, fix the error and rerun the same command. Import errors are
visible with `oc -n appademin logs deployment/pre-rt-api-test -c resource-import`.
Test data can be reset or replaced when needed; nothing needs preserving.
Both scripts target the test deployments only. They do not deploy to production.
