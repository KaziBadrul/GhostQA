# Neon connection verification — 2026-10-20

## Configuration

- Project: `fragrant-fire-68405665`; organization: `org-delicate-base-35193038`.
- Branch: `production` (`br-winter-violet-b4hom44u`).
- Only Postgres is declared in `neon.ts`; no additional paid services were added.
- `.neon` and environment files are ignored by Git. The prior local environment
  was backed up privately before CLI setup. Existing Gemini settings, the local
  test-database URL, and the credential encryption key were retained.
- The CLI installed its agent plugins/skills and the config/env dependencies.
- The existing `pg` driver remains in use. Runtime and migrations prefer
  `DATABASE_URL_UNPOOLED` for session-level advisory locks and migration state.
- Local Neon URLs use `sslmode=verify-full`; credential values are not recorded here.

## Successful command output

`neon config plan` and `neon deploy`:

```text
No changes — branch production already matches the policy.
Utilized services: Postgres
Pulled 3 Neon variables into .env.local
  Postgres        DATABASE_URL, DATABASE_URL_UNPOOLED
  Branch          NEON_BRANCH
```

`npm run build` exited 0:

```text
Compiled successfully in 2.2s
Finished TypeScript in 3.0s
Generating static pages using 9 workers (11/11)
```

`npx vitest run tests/unit/config.test.ts`:

```text
Test Files  1 passed (1)
Tests  13 passed (13)
```

The local production app was started using Node 24.21.0:

```sh
NODE_OPTIONS=--no-network-family-autoselection npm run db:migrate
NODE_OPTIONS=--no-network-family-autoselection npm start
```

The migration command exited 0. Startup loaded the Neon configuration and served
the app at `http://127.0.0.1:3000`.

## End-to-end database verification

The verification used real application HTTP handlers with the existing same-origin
CSRF cookie/token, not a replacement repository or mock database. It created a
project, imported `examples/orders.openapi.json`, read the saved specification,
and requested an MCP preview from that saved project:

```text
HTTP project create: 201
HTTP OpenAPI save: 200
HTTP project read: 200; 6 saved operations
MCP preview from Neon-saved project: 200; 6 operations
```

A separate direct database connection verified persisted data and client TLS:

```text
Client TLS: {"encrypted":true,"authorized":true,"protocol":"TLSv1.3"}
Neon persistence: 1 project, 1 specification, 5 applied migrations
Application read from Neon: HTTP 200, 6 operations
Neon dedicated-session advisory lock exclusion and release: PASS
```

The advisory-lock check used two independent connections and a temporary lock key:
the second connection could not acquire it until the first released it.

The retained verification project is
`c47b8886-da06-4974-b4d8-e5c0fbecd97f`, named **Neon connection verification**.

## Failures and limitations

- Initial TCP connection attempts timed out during Node address-family selection.
  The local command-line option above resolved this without disabling TLS or
  modifying deterministic target-execution authority.
- Initial builds exposed TypeScript parameter-type errors in the new connection
  selector; these were corrected before the successful build.
- An initial probe incorrectly expected server-side `pg_stat_ssl` to describe
  the external TLS connection through Neon's proxy. The actual client socket was
  then checked for both encryption and successful certificate verification.
- `npm audit` reports seven high-severity dependency findings, including existing
  Next.js/ESLint-related dependencies. No forced upgrades or security downgrades
  were applied as part of the Neon connection work.
- Only the targeted configuration tests were rerun for this integration. The
  earlier 980-test website verification predates the Neon changes.
- This provisions/connects the database. It does not publish the frontend on
  Render or change the application's localhost access policy.
