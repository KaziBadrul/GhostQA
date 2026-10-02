// Presentation-only projection of a GhostQA finding report. Reads committed
// report documents and never evaluates, classifies, or re-derives anything.
export interface ReportStep {
  id: string;
  operationId: string;
  url: string | null;
  status: number | null;
  elapsedMs: number | null;
  response: string | null;
  truncated: boolean;
}

export interface ReportTrial {
  label: string;
  evidenceId: string;
  trialId: string;
  outcome: string;
  baselineVerdict: string;
  steps: ReportStep[];
}

export interface ReportTransition {
  prior: string | null;
  next: string;
  reason: string;
  evidenceRefs: string[];
}

export interface ReportView {
  runId: string;
  formatVersion: number;
  classification: string;
  consistent: boolean;
  findingId: string;
  predicateSource: string;
  predicateSourceRef: string;
  predicateEligible: boolean;
  predicateHash: string;
  predicateAssertions: string[];
  originalLength: number;
  bestLength: number;
  locallyIrreducible: boolean;
  minimizationStop: string;
  reproductionClaim: string;
  truncated: boolean;
  verification: string;
  generationState: string;
  trials: ReportTrial[];
  transitions: ReportTransition[];
}

type Json = Record<string, unknown>;

function isJson(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === undefined || value === null) return '';
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function shortBody(value: unknown, limit = 320): string {
  const raw = text(value);
  return raw.length > limit ? `${raw.slice(0, limit)}…` : raw;
}

function projectTrial(
  label: string,
  node: unknown,
): ReportTrial | null {
  if (!isJson(node)) return null;
  const evidence = isJson(node['evidence']) ? node['evidence'] : {};
  const observations = Array.isArray(node['observations']) ? node['observations'] : [];
  const baseline = isJson(node['baseline']) ? node['baseline'] : {};
  const steps = observations.flatMap((observation) => {
    if (!isJson(observation)) return [];
    const result = isJson(observation['result']) ? observation['result'] : {};
    const request = isJson(result['sanitizedRequest'])
      ? result['sanitizedRequest']
      : {};
    const response = isJson(result['sanitizedResponse'])
      ? result['sanitizedResponse']
      : {};
    return [
      {
        id: text(observation['stepId']),
        operationId: text(request['operationId']) || text(observation['stepId']),
        url: typeof request['url'] === 'string' ? request['url'] : null,
        status: typeof response['status'] === 'number' ? response['status'] : null,
        elapsedMs:
          typeof result['elapsedMs'] === 'number'
            ? Math.round(result['elapsedMs'] * 100) / 100
            : null,
        response: shortBody(response['body']),
        truncated:
          response['truncated'] === true || result['truncated'] === true,
      },
    ];
  });
  return {
    label,
    evidenceId: text(evidence['id']),
    trialId: text(evidence['trialId']),
    outcome: text(evidence['outcome']),
    baselineVerdict: text(baseline['verdict']),
    steps,
  };
}

export function projectReport(input: unknown): ReportView | null {
  if (!isJson(input) || input['formatVersion'] !== 1) return null;
  const finding = isJson(input['finding']) ? input['finding'] : {};
  const predicate = isJson(input['predicate']) ? input['predicate'] : {};
  const approval = isJson(input['approval']) ? input['approval'] : {};
  const minimization = isJson(input['minimization']) ? input['minimization'] : {};
  const replayNodes = Array.isArray(input['replays']) ? input['replays'] : [];
  const trials = [
    projectTrial('Initial exploration', input['initial']),
    ...replayNodes.map((node, index) =>
      projectTrial(`Independent replay ${index + 1}`, node),
    ),
  ].filter((trial): trial is ReportTrial => trial !== null);

  return {
    runId: text(input['runId']),
    formatVersion: 1,
    classification: text(finding['classification']),
    consistent: finding['consistent'] === true,
    findingId: text(finding['id']),
    predicateSource: text(predicate['source']),
    predicateSourceRef: text(predicate['sourceRef']),
    predicateEligible: approval['eligible'] === true,
    predicateHash: text(predicate['canonicalHash']),
    predicateAssertions: (Array.isArray(predicate['assertions'])
      ? predicate['assertions']
      : []
    ).map((assertion) =>
      isJson(assertion)
        ? `${text(assertion['left'])} ${text(assertion['op'])} ${text(assertion['right'])}`
        : text(assertion),
    ),
    originalLength: Number(input['originalLength'] ?? 0),
    bestLength: Number(input['bestLength'] ?? 0),
    locallyIrreducible: minimization['locallyIrreducible'] === true,
    minimizationStop: text(input['stopReason'] || minimization['stopReason']),
    reproductionClaim: text(input['reproductionClaim']),
    truncated: input['truncated'] === true,
    verification: text(input['verification']),
    generationState: text(input['generationState']),
    trials,
    transitions: (Array.isArray(finding['transitions'])
      ? finding['transitions']
      : []
    ).flatMap((transition) =>
      isJson(transition)
        ? [
            {
              prior:
                typeof transition['prior'] === 'string' ? transition['prior'] : null,
              next: text(transition['next']),
              reason: text(transition['reason']),
              evidenceRefs: (
                Array.isArray(transition['evidenceRefs'])
                  ? transition['evidenceRefs']
                  : []
              ).map((ref) => text(ref)),
            },
          ]
        : [],
    ),
  };
}