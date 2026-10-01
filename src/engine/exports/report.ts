import type { Json } from '../contracts';
import { canonical } from '../detection/predicate';
import { eligiblePredicate } from '../validation/predicate';
import { SecretVault } from '../secrets/vault';
import type { ExportInput } from './contracts';
import { exportSource } from './source';
export type { ExportInput } from './contracts';

export function generateReport(
  input: ExportInput,
  suppliedVault?: SecretVault,
) {
  const vault = suppliedVault ?? new SecretVault();
  try {
    const { source, predicate } = exportSource(input);
    const { run, original, minimization, initial, replays } = source;
    const truncated = [
      ...initial.observations,
      ...replays.flatMap((t) => t.observations),
      ...minimization.attempts.flatMap((a) => a.observations),
    ].some((o) => o.result.truncated);
    const report = {
      formatVersion: 1,
      runId: run.id,
      finding: minimization.finding,
      predicate,
      predicateRef: minimization.finding.predicateRef,
      approval: {
        source: predicate.source,
        sourceRef: predicate.sourceRef,
        ...(predicate.approvalRef
          ? { approvalRef: predicate.approvalRef }
          : {}),
        eligible: eligiblePredicate(
          predicate,
          source.approvals,
          source.specificationAssertions,
        ),
        asOf: run.budget.acceptedAt,
      },
      originalJourney: original,
      bestJourney: minimization.best,
      originalLength: original.steps.length,
      bestLength: minimization.best.steps.length,
      initial,
      replays,
      minimization,
      truncated,
      stopReason: minimization.stopReason,
      executionProvenance: {
        runId: run.id,
        trialIds: [
          initial.evidence.trialId,
          ...replays.map((t) => t.evidence.trialId),
        ],
        acceptedAt: run.budget.acceptedAt,
        deadlineAt: run.budget.deadlineAt,
      },
      generationState: 'GENERATED',
      verification: 'UNVERIFIED',
      reproductionClaim: 'shortest verified sequence found',
      setup:
        'Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.',
    };
    // The report is descriptive, not an executable predicate replacement. Apply
    // existing classification/value/encoded-echo redaction before serialization.
    const json = canonical(vault.sanitize(report as unknown as Json, true));
    const safe = JSON.parse(json) as typeof report;
    const code = (s: string) =>
      '`' + s.replaceAll('`', '\\`').replaceAll('\n', ' ') + '`';
    const refs = [safe.initial, ...safe.replays];
    const markdown = [
      '# GhostQA finding evidence',
      '',
      `Finding: ${code(safe.finding.id)} — ${safe.finding.classification}`,
      `Evidence chain: ${safe.finding.transitions
        .map((t) =>
          typeof t === 'object' && t !== null && !Array.isArray(t)
            ? String(t.next ?? '')
            : '',
        )
        .filter(Boolean)
        .join(' → ')} → best verified reproducer.`,
      `Consistency: ${safe.finding.consistent}. Artifact: GENERATED / UNVERIFIED.`,
      '',
      `Predicate: ${code(safe.predicate.id)}, version ${safe.predicate.version}, canonical hash ${code(safe.predicate.canonicalHash)}.`,
      `Approval provenance: ${safe.approval.source}; source ${code(safe.approval.sourceRef)}${safe.predicate.approvalRef ? `; approval ${code(safe.predicate.approvalRef)}` : ''}; eligible as of run acceptance: ${safe.approval.eligible}.`,
      '',
      `Original journey length: ${safe.originalLength}. Best verified journey length: ${safe.bestLength}.`,
      'This is the shortest verified sequence found.',
      ...(safe.minimization.locallyIrreducible
        ? ['It is locally irreducible under attempted deletion strategy.']
        : []),
      `Local minimization stop reason: ${safe.stopReason}.`,
      `Truncated: ${safe.truncated ? 'yes' : 'no'}.`,
      '',
      '## Expected invariant',
      '',
      'When the applicability conditions hold, every approved assertion must be satisfied:',
      '',
      ...safe.predicate.assertions.map(
        (assertion) =>
          `- ${code(canonical(assertion.left))} ${assertion.op}${assertion.right ? ` ${code(canonical(assertion.right))}` : ''}`,
      ),
      '',
      '## Evidence references',
      '',
      ...refs.map(
        (t) =>
          `- ${t.evidence.phase}: evidence ${code(t.evidence.id)}, trial ${code(t.evidence.trialId)}, baseline ${code(t.baseline.id)}, verdict ${t.evidence.outcome}.`,
      ),
      '',
      '## Minimized reproduction',
      '',
      ...safe.bestJourney.steps.map(
        (s, i) => `${i + 1}. ${code(s.id)} — ${code(s.operationId)}`,
      ),
      '',
      '## Minimized attempt history',
      '',
      ...safe.minimization.attempts.map(
        (a) =>
          `- Remove ${code(a.removedStepId)}: ${a.accepted ? 'accepted' : 'rejected'}; ${a.reason}; candidate ${code(a.candidate.id)}${a.trialId ? `; trial ${code(a.trialId)}` : ''}${a.baseline ? `; baseline ${code(a.baseline.id)}` : ''}${a.evidence ? `; evidence ${code(a.evidence.id)}, ${a.evidence.outcome}` : ''}${a.executionOutcome ? `; execution ${a.executionOutcome}` : ''}.`,
      ),
      '',
      '## Setup and verification',
      '',
      safe.setup,
      'Generation does not establish supervised verification. This manifest has not been verified through the originating run.',
      '',
      '## Exact assertions and sanitized evidence',
      '',
      // JSON supplies full reset, approval, observations, bindings and reasons;
      // embedding identical sanitized content avoids a second lossy report model.
      '```json',
      JSON.stringify(JSON.parse(json), null, 2).replaceAll(
        '```',
        '\\u0060\\u0060\\u0060',
      ),
      '```',
      '',
    ].join('\n');
    return { json, markdown };
  } finally {
    if (!suppliedVault) vault.discard();
  }
}
