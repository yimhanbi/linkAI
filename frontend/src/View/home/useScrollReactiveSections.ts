import { useEffect, useState } from "react";

const INTERSECTION_THRESHOLD = 0.6;
const ROOT_MARGIN = "0px 0px -20% 0px";
const SECTION_SELECTOR = "[data-scroll-section]";

/**
 * Tracks which of the observed blocks inside the container is currently "active"
 * based on viewport intersection. Uses IntersectionObserver only (no window scroll).
 * Container children with data-scroll-section are observed; the one with the
 * largest visible ratio above the threshold becomes active.
 */
export function useScrollReactiveSections(
  containerRef: React.RefObject<HTMLElement | null>,
  sectionCount: number
): number {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || sectionCount <= 0) return;

    const blocks = container.querySelectorAll<HTMLElement>(SECTION_SELECTOR);
    if (blocks.length === 0) return;

    const ratios = new Map<Element, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target, entry.intersectionRatio);
        }
        const index = pickActiveIndex(blocks, ratios, INTERSECTION_THRESHOLD);
        setActiveIndex(index);
      },
      {
        threshold: [0, 0.25, 0.5, INTERSECTION_THRESHOLD, 0.75, 1],
        rootMargin: ROOT_MARGIN,
      }
    );

    blocks.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [containerRef, sectionCount]);

  return activeIndex;
}

function pickActiveIndex(
  blocks: NodeListOf<HTMLElement>,
  ratios: Map<Element, number>,
  threshold: number
): number {
  let bestIndex = 0;
  let bestRatio = 0;

  blocks.forEach((el, i) => {
    const r = ratios.get(el) ?? 0;
    if (r >= threshold && r > bestRatio) {
      bestRatio = r;
      bestIndex = i;
    }
  });

  if (bestRatio >= threshold) return bestIndex;

  blocks.forEach((el, i) => {
    const r = ratios.get(el) ?? 0;
    if (r > bestRatio) {
      bestRatio = r;
      bestIndex = i;
    }
  });

  return bestIndex;
}
