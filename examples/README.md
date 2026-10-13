# Test your first custom project

1. Start GhostQA: `npm run dev` (Node 24 and configured PostgreSQL/Gemini).
2. In another terminal, start the disposable target: `npm run example`.
3. Import `examples/orders.openapi.json`, validate it, name the project, and click **Save project and configure**.
4. In **Target and operations**, set the target to `http://127.0.0.1:4010/api` and choose **Save target and continue**. Leave all six operations included. Continue without credentials in the Authentication step.
5. In **Fresh-state checks**, click **Load Orders example**, open **Advanced reset definition**, and click **Save advanced checks**.
6. In **Expected behavior**, click **Load Orders invariant example**, click **Save invariant**, review the saved rule, select its approval checkbox, and click **Approve saved invariant**.
7. Continue to **Review and run** and click **Preview execution scope**, review the addresses and phase-specific operations, acknowledge mutations, and start the run.
8. Watch the run, inspect the trace, and download reports and the regression runner if a failure is confirmed.

The example API is intentionally faulty by default. To compare repaired behavior, stop the target and run `npm run example -- --fixed`, then start a new GhostQA run with a new scope preview. Discovery uses the configured Gemini provider; provider availability, quota and planning quality can affect the outcome. No confirmed finding does not prove the API is bug-free.

The specification alone is not a running server. Reset clears all example orders before each trial. Use only disposable local data. The invariant describes expected behavior, not a prescribed workflow; GhostQA must propose its own valid dependent journey.
