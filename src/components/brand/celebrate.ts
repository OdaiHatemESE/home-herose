import confetti from 'canvas-confetti';

const COLORS = ['#F2B705', '#6D3FD6', '#F05A9B', '#2F7BEA', '#1FA971'];

/** One short, colourful burst. Respects reduced-motion preferences. */
export function celebrate(kind: 'small' | 'big' = 'small') {
  if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  confetti({
    particleCount: kind === 'big' ? 140 : 50,
    spread: kind === 'big' ? 100 : 60,
    startVelocity: kind === 'big' ? 45 : 30,
    origin: { y: 0.7 },
    colors: COLORS,
    scalar: 0.9,
    disableForReducedMotion: true,
  });
}
