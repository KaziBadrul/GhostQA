# Landing and custom OpenAPI preview

## Scope and modes

Scoped extension of the implemented charcoal, blue-accent, system-sans developer interface. Landing (`src/components/hero-section.tsx`) uses **Persuade** mode; custom import (`src/components/openapi-setup.tsx`) uses **Operate** mode. This brief does not replace the app's visual identity or regenerate DESIGN.md.

## Audience, job, and action

Developers should understand workflow fuzzing, choose Import OpenAPI or a bundled demo, and inspect their specification before considering execution. The import surface accepts JSON/YAML files or pasted OpenAPI 3.0/3.1 source, validates it, and presents searchable supported/excluded operations with reasons.

## Content and capability boundary

The landing workflow is explicitly illustrative, not a discovered or live finding. Custom import currently validates and previews only: it does not save a project or execute a custom target. Bundled demos have a separate run entry point. Import eligibility never authorizes execution; target scope, reset, baseline, invariants, limits, and operation classifications remain separate requirements. Documents are limited to 2 MiB and local references.

## Direction and first viewport

Use a clear workflow question and two concrete actions beside an ordered API sequence. Blue/teal radial light supports the technical content; the old-token question is the memorable moment. Preserve readable monospace methods, paths, and response codes. The import view pairs a file/paste editor with a concise next-step guide, then exposes operation status in a table after validation.

## Palette, motion, and accessibility

Retain the incumbent ink/charcoal surfaces, pale-blue actions, muted cool text, and green/amber status accents from `src/app/globals.css`. System sans carries prose; system monospace carries API data. Surface borders and restrained rounded corners establish hierarchy. Landing light drifts over 16 seconds; the workflow preview enters once over 0.9 seconds; action hover transitions last 0.2 seconds. Reduced-motion styling disables those animations and smooth scrolling.

Keep visible keyboard focus, labeled source/filter controls, a keyboard-accessible file chooser alongside drag/drop, alert errors, textual status labels, and the illustrative sequence label. CSS stacks the landing below 900px and import layout below 1050px, with further small-screen adjustments. These are implementation observations, not a completed mobile or assistive-technology validation.

## Evidence and unresolved review

Inspected DESIGN.md, PRODUCT.md, globals.css, HeroSection, OpenApiSetup, and Impeccable's document/new-work guidance. DESIGN.md remains historical Spotify inspiration; PRODUCT.md still describes FastAPI and an unimplemented application. Those preexisting records were preserved. No `.impeccable/design.json` was present at inspection, and none was synthesized for this scoped extension. Parent inspected rendered desktop landing; this documentation pass inspected code only. Mobile rendered review remains outstanding.
