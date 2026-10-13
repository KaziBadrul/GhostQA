# Implementation plan
1. Record the owner-approved product scope and constitutional amendment.
2. Add a wizard using existing import and saved-project APIs; no database required for direct conversion.
3. Build strict conversion contracts, deterministic manifests/templates and bounded tar.gz packaging.
4. Isolate Gemini notes processing behind a provider function with strict output validation and fallback.
5. Verify generated stdio packages using the official SDK client and disposable Orders fixture,
   then typecheck, lint and build the web application.
