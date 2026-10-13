'use client';

export function AnimatedGradient({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'> & {
  className?: string;
}) {
  return (
    <div
      className={`absolute inset-0 -z-10 ${className} bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-canvas)]`}
      {...props}
    />
  );
}