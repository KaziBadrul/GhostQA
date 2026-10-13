'use client';
import type { ErrorGuidance, FieldIssue } from '@/lib/error-guidance';
export function ActionableError({
  error,
  onFix,
}: {
  error: ErrorGuidance & { issues?: FieldIssue[] };
  onFix?: (step: number) => void;
}) {
  return (
    <div className="setup-error actionable-error" role="alert">
      <strong>{error.title}</strong>
      <p>{error.message}</p>
      {!!error.issues?.length && (
        <ul>
          {error.issues.map((issue, index) => (
            <li key={index}>
              <code>{issue.field}</code>: {issue.message}
            </li>
          ))}
        </ul>
      )}
      <p>
        <strong>Next step:</strong> {error.action}
      </p>
      {error.step !== undefined && onFix && (
        <button
          type="button"
          className="text-action"
          onClick={() => onFix(error.step!)}
        >
          Go to{' '}
          {
            [
              'API specification',
              'target settings',
              'authentication',
              'fresh-state checks',
              'expected behavior',
              'execution review',
            ][error.step]
          }
        </button>
      )}
    </div>
  );
}
