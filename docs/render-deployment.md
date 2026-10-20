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
The full regression suite passed in a disposable local PostgreSQL database:

```text
Test Files  74 passed (74)
Tests  998 passed (998)
Duration  170.29s
```

Typecheck, ESLint, formatting of the hosting modules, and `git diff --check` also
passed. These local tests do not claim that Render is live.

## Render rollout status

Application release `21123d2` was pushed to `main`. The obsolete initial
deployment was canceled after its logs confirmed that it listened on localhost
instead of Render's assigned interface. `/healthz` was saved as the health path.

Render successfully built the release using Node 24.21.0. Startup failed closed
at operator-password validation. A fresh deployment with the saved environment
also rejected the value. A metadata-only inspection confirmed that the saved
password had 31 characters and no forbidden control characters; its value was
not printed, copied into code, or recorded. The operator was asked to add at
least one character and save before another rollout attempt.

The operator saved the corrected password. Deployment
`dep-dbbp8ioae00c73ac8i9g` of release `21123d2` succeeded and Render reported
**Live** on 2026-10-20. Independent HTTPS requests verified:

```text
/healthz       200 {"status":"ok"}
/              401 Basic realm="GhostQA", charset="UTF-8"
/api/projects  401 Basic realm="GhostQA", charset="UTF-8"
```

The live URL is https://ghostqa-u1z0.onrender.com. Sign in as `ghostqa` with
the private operator password saved in Render. Authenticated hosted behavior was
verified in the local production smoke test above; the cloud authenticated UI
has not been exercised with the operator's private password.

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
