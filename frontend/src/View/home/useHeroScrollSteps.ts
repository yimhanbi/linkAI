import { useEffect, useState } from "react";

const STEP_SELECTOR = "[data-step]";
const THRESHOLD = 0.6;
const ROOT_MARGIN = "0px 0px -25% 0px";

/**
 * Hero scroll state: derived from which "step" is in view, not from scroll Y.
 *
 * WHY: Scroll position is brittle (layout changes, zoom, etc.). Observing
 * semantic step elements gives a discrete state (0|1|2) that maps to
 * "which part of the hero narrative the user is in". UI then reacts to
 * that state (opacity, translateY) via CSS. No scroll listeners.
 */
export function useHeroScrollSteps(
  stepsContainerRef: React.RefObject<HTMLElement | null>,
  stepCount: number
): number {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const container = stepsContainerRef.current;
    if (!container || stepCount <= 0) return;

    const steps = container.querySelectorAll<HTMLElement>(STEP_SELECTOR);
    if (steps.length === 0) return;

    const ratios = new Map<Element, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) ratios.set(entry.target, entry.intersectionRatio);
        const next = pickActiveStep(steps, ratios, THRESHOLD);
        setActiveStep(next);
      },
      {
        threshold: [0, 0.25, 0.5, THRESHOLD, 0.75, 1],
        rootMargin: ROOT_MARGIN,
      }
    );

    steps.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [stepsContainerRef, stepCount]);

  return activeStep;
}

function pickActiveStep(
  steps: NodeListOf<HTMLElement>,
  ratios: Map<Element, number>,
  threshold: number
): number {
  let best = 0;
  let bestRatio = 0;

  steps.forEach((el, i) => {
    const r = ratios.get(el) ?? 0;
    if (r >= threshold && r > bestRatio) {
      bestRatio = r;
      best = i;
    }
  });
  if (bestRatio >= threshold) return best;

  steps.forEach((el, i) => {
    const r = ratios.get(el) ?? 0;
    if (r > bestRatio) {
      bestRatio = r;
      best = i;
    }
  });
  return best;
}
