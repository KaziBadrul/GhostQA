export function responseExecutionError(
  status: number,
  expectedStatuses: readonly number[],
): string | undefined {
  if (status === 429) return 'TARGET RATE LIMIT';
  if ([401, 403].includes(status) && !expectedStatuses.includes(status))
    return 'AUTHENTICATION REJECTION';
}
