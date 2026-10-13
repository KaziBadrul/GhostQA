'use client';

export function PulseBgs({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'> & {
  className?: string;
}) {
  return (
    <div
      className={`fixed inset-0 pointer-events-none ${className} bg-[var(--color-surface)]`}
      {...props}
    >
      <div className="absolute w-64 h-64 rounded-full opacity-20 bg-[var(--color-accent)] top-20 left-20 animate-pulse-slow" />
      <div className="absolute w-32 h-32 rounded-full opacity-10 bg-[var(--color-accent)] bottom-20 right-20 animate-pulse" />
      <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-[var(--color-accent)] to-transparent" />
    </div>
  );
}