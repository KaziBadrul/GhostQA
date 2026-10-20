export function fadeInUp({
  delay = 0,
  duration = 0.8,
  className,
}: {
  delay?: number;
  duration?: number;
  className?: string;
}) {
  return {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { delay, duration, type: 'spring' } },
    ...(className && { className }),
  };
}

export function staggerChildren({
  delayChildren = 0.2,
  staggerChildren,
  ...rest
}: {
  delayChildren?: number;
  staggerChildren?: number;
}) {
  return {
    delayChildren,
    children: { stagger: staggerChildren },
    ...rest,
  };
}

export function variantFadeInUp(delay = 0) {
  return {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        delay,
        type: 'spring',
        stiffness: 100,
        damping: 15,
      },
    },
  };
}

export function variantContainer(delay = 0.15) {
  return {
    hidden: { opacity: 0, scale: 0.95 },
    show: {
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        delay,
        stiffness: 200,
        damping: 20,
      },
    },
  };
}
