import { validInput } from '../openapi/schemas';
import { serializedHeaders } from '../execution/auth';
import {
  JourneySchema,
  type ApiModel,
  type FrozenScope,
  type Phase,
} from '../contracts';
import { authorizeOperation } from '../policy/scope';
import { validateDependencies } from './dependencies';
import { pointerRead } from '../execution/variables';
export function validateJourney(
  value: unknown,
  api: ApiModel,
  scope: FrozenScope,
  phase: Phase,
) {
  const journey = JourneySchema.parse(value);
  validateDependencies(journey);
  for (const step of journey.steps) {
    const operation = api.operations.find((o) => o.id === step.operationId);
    if (!operation?.eligible) throw new Error('UNKNOWN OPERATION');
    authorizeOperation(scope, operation.id, phase);
    const names = new Set<string>();
    for (const parameter of step.parameters) {
      const key =
        parameter.location +
        ':' +
        (parameter.location === 'header'
          ? parameter.name.toLowerCase()
          : parameter.name);
      if (names.has(key)) throw new Error('DUPLICATE PARAMETER');
      names.add(key);
      if (
        !operation.parameters.some(
          (p) =>
            p.in === parameter.location &&
            (p.in === 'header'
              ? p.name.toLowerCase() === parameter.name.toLowerCase()
              : p.name === parameter.name),
        )
      )
        throw new Error('UNKNOWN PARAMETER');
      if (['__proto__', 'constructor', 'prototype'].includes(parameter.name))
        throw new Error('INVALID PARAMETER NAME');
      if (parameter.value.kind === 'literal') {
        const declared = operation.parameters.find(
          (p) =>
            p.in === parameter.location &&
            (p.in === 'header'
              ? p.name.toLowerCase() === parameter.name.toLowerCase()
              : p.name === parameter.name),
        )!;
        if (
          !validInput(
            declared.schema,
            parameter.value.value,
            api.openapiVersion,
          )
        )
          throw new Error('INVALID PARAMETER');
      }
      if (parameter.location === 'header')
        serializedHeaders({
          [parameter.name]:
            parameter.value.kind === 'literal'
              ? parameter.value.value
              : 'validation-placeholder',
        });
    }
    for (const p of operation.parameters)
      if (
        p.required &&
        !step.parameters.some(
          (bound) =>
            bound.location === p.in &&
            (p.in === 'header'
              ? bound.name.toLowerCase() === p.name.toLowerCase()
              : bound.name === p.name),
        )
      )
        throw new Error('MISSING PARAMETER');
    if (operation.requestBody !== undefined && step.body === undefined)
      throw new Error('MISSING BODY');
    if (
      operation.requestBody === undefined &&
      (step.body !== undefined || step.bodyBindings.length)
    )
      throw new Error('UNDECLARED BODY');
    if (
      step.body !== undefined &&
      step.bodyBindings.length === 0 &&
      operation.requestBody !== undefined &&
      !validInput(operation.requestBody, step.body, api.openapiVersion)
    )
      throw new Error('INVALID BODY');
    for (const binding of step.bodyBindings)
      if (
        step.body === undefined ||
        pointerRead(step.body, binding.pointer).kind !== 'value'
      )
        throw new Error('INVALID BODY POINTER');
  }
  return journey;
}
