# Render Free deployment

Service: `srv-dbbp073rjlhs73ae9a7g`.
URL: `https://ghostqa-u1z0.onrender.com`.
Repository: `KaziBadrul/GhostQA`, branch `main`.

The existing service uses the Free instance, build command
`npm ci && npm run build`, and start command `npm start`. No second service or
paid resource is required. `render.yaml` documents equivalent Blueprint settings.

## Private configuration

Keep these values in Render's private Environment settings:

- `DATABASE_URL` and `DATABASE_URL_UNPOOLED` from the configured Neon branch.
- `GEMINI_API_KEY` and the explicitly selected `GEMINI_MODEL`.
- The existing `GHOSTQA_CREDENTIAL_KEY`, preserved across deployments.
- `GHOSTQA_ADMIN_PASSWORD`: a unique password of 32–256 characters, entered by
  the operator. Username: `ghostqa`.

Render supplies `PORT`, `RENDER`, and `RENDER_EXTERNAL_URL`. For another hosting
platform, explicitly set `GHOSTQA_PUBLIC_ORIGIN` to the exact HTTPS origin.
Use Node 24; set `NODE_VERSION=24.21.0` if the platform does not select it from
the package's Node engine constraint. Set the health-check path to `/healthz`.
`TEST_DATABASE_URL` is not required on Render.

Start only with `npm start` / `server.ts`. The single ingress validates the
approved Host, requires Basic authentication, and derives TLS forwarding metadata
from the configured origin. Only exact `GET /healthz` is public; it reports fixed
process-readiness information and has no target-execution capability. All setup
writes retain authentication, exact-Origin, and same-origin CSRF checks.

Missing/short passwords stop hosted startup rather than exposing the application.
Do not change `GHOSTQA_CREDENTIAL_KEY` to fix a startup error: doing so would make
previously encrypted credentials unreadable.

## Verification before publication

The optimized production build and 55 targeted tests passed. A separate real
production Node process, connected to Neon and configured with a temporary test
password, produced:

```text
Hosted process: assigned port, health 200, unauthenticated pages/APIs 401,
authenticated homepage 200, forged host 403
Hosted real Next.js flow: secure nonce cookie 200, CSRF-protected project
create 201, Neon project read 200, cross-origin write 403
Hosted smoke test: PASS
```

The test password was temporary and was not copied into Render or committed.
The full regression suite is recorded separately in the deployment verification
results when it finishes. These local tests do not claim that Render is live.

## Free-plan limits and recovery

Free instances sleep when idle and have ephemeral local storage. Projects and
engine evidence persist in Neon. Transient demo presentation records/files may
disappear on a restart; download desired demo artifacts. This does not change
durable engine evidence or finding classifications. Fuzzing targets are reached
from Render's network, so localhost targets refer to Render, not your laptop.

If the new release fails, Render keeps the prior healthy release when one exists.
Use the previous successful deployment's rollback action after checking migration
compatibility. Startup applies the existing versioned additive migrations; do not
delete database state or rotate encryption keys during rollback.
