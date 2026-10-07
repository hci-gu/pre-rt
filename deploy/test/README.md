# Deploy to test

Test data is disposable. Production is separate and keeps its own backup and
migration safeguards.

With Docker running and Docker/OpenShift logged in, run from the repository root:

```sh
scripts/deploy/test.sh
```

This builds and pushes both images, deploys the API and web app, and checks they
start. The API automatically runs migrations and imports the packaged Word
resources before serving requests. No manual import, backup or approval steps.

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
