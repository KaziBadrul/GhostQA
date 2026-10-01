import type { Journey, Operand } from '../contracts';
export function validateDependencies(journey: Journey) {
  const priorSteps = new Set<string>(),
    variables = new Map<string, string | undefined>();
  for (const v of journey.variables) {
    if (v.source.kind !== 'input' && v.source.kind !== 'generate')
      throw new Error('INVALID DEPENDENCY');
    if (variables.has(v.name)) throw new Error('DUPLICATE VARIABLE');
    variables.set(v.name, undefined);
  }
  const check = (operand: Operand, consumer: string) => {
    if (operand.kind === 'variable') {
      if (!variables.has(operand.name)) throw new Error('INVALID DEPENDENCY');
      const producer = variables.get(operand.name);
      if (
        producer &&
        !journey.dependencies.some(
          (d) =>
            d.producer === producer &&
            d.consumer === consumer &&
            d.variable === operand.name,
        )
      )
        throw new Error('INVALID DEPENDENCY');
    } else if ('stepId' in operand && !priorSteps.has(operand.stepId))
      throw new Error('INVALID DEPENDENCY');
  };
  for (const step of journey.steps) {
    if (priorSteps.has(step.id)) throw new Error('DUPLICATE STEP');
    for (const p of step.parameters) check(p.value, step.id);
    for (const b of step.bodyBindings) check(b.value, step.id);
    priorSteps.add(step.id);
    for (const v of step.extracts) {
      if (v.source.kind === 'input' || v.source.kind === 'generate')
        throw new Error('INVALID EXTRACTION');
      check(v.source, step.id);
      if (variables.has(v.name)) throw new Error('DUPLICATE VARIABLE');
      variables.set(v.name, step.id);
    }
  }
  for (const d of journey.dependencies) {
    const producer = journey.steps.findIndex((s) => s.id === d.producer),
      consumer = journey.steps.findIndex((s) => s.id === d.consumer);
    if (
      producer < 0 ||
      consumer <= producer ||
      variables.get(d.variable) !== d.producer
    )
      throw new Error('INVALID DEPENDENCY');
  }
}
