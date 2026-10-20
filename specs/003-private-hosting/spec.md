# Private single-owner Render hosting

This deployment extension implements the owner's 2026-10-20 request to deploy
GhostQA on Render Free with Neon PostgreSQL. It preserves the existing engine,
single-application architecture, execution authority, and local development flow.

- Local mode binds to loopback and retains its current local Host/Origin policy.
- Hosted mode is explicitly configured with an HTTPS public origin, or Render's
  platform-provided external URL, and a private operator password. It binds to
  `0.0.0.0` and the assigned `PORT`. Missing/invalid hosting credentials stop startup.
- All hosted application pages, APIs, reports, and assets require HTTP Basic
  authentication as `ghostqa`, with a private 32–256-character password supplied
  through the hosting environment. Render supplies public HTTPS termination.
- The ingress validates the exact approved Host and overwrites forwarding headers
  from trusted configuration. Request-supplied forwarding headers grant no authority.
- Setup APIs additionally validate authentication, exact configured Origin, and
  existing same-origin CSRF cookie/token semantics. Hosted setup cookies are Secure.
- Only exact `GET /healthz` is unauthenticated; it exposes fixed process-readiness
  status, cannot access project data or dispatch target requests, and checks Host.
- Start through `npm start` and `server.ts`; direct `next start` is unsupported.
- This remains one private operator's developer tool, not public multi-tenancy.
  Fuzzing destinations refer to the hosted server's network, not the operator's
  laptop. Target HTTP authority and all accepted run safety requirements remain.
- Projects and engine evidence remain in PostgreSQL. Render Free's local demo
  presentation files are ephemeral; losing them does not rewrite engine evidence.
  Built-in recorded evidence remains in the repository. No paid disk is provisioned.
- The environment password and direct database connection string are included in
  the known-secret documentation redaction boundary.

Verification covers fail-closed startup, exact Host, authentication on pages and
APIs, forwarding-header spoofing, CSRF, Secure cookies, credential redaction,
assigned port binding, and the existing local application contracts.
