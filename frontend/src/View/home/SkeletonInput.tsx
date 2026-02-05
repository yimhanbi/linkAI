import React, { useLayoutEffect, useRef, useState } from "react";
import "./WelcomePage.css";

type SkeletonInputProps = {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholderNode: React.ReactNode | null;
  "aria-label"?: string;
};

/**
 * Input with a skeleton that grows in real-time to match typed text width.
 * Uses a hidden span (same font/size as input) to measure width; skeleton width follows with transition.
 */
export default function SkeletonInput({
  value,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  placeholderNode,
  "aria-label": ariaLabel,
}: SkeletonInputProps): React.ReactElement {
  const measureRef = useRef<HTMLSpanElement>(null);
  const [skeletonWidth, setSkeletonWidth] = useState(0);

  useLayoutEffect(() => {
    if (!measureRef.current) return;
    const w = measureRef.current.getBoundingClientRect().width;
    setSkeletonWidth(w);
  }, [value]);

  return (
    <div className="linkai-hero-input-wrap">
      <div className="linkai-hero-input-inner">
        <input
          type="text"
          className="linkai-hero-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          aria-label={ariaLabel ?? "특허 질문 입력"}
          autoComplete="off"
        />
        <span
          ref={measureRef}
          className="linkai-hero-input-measure"
          aria-hidden
        >
          {value || "\u00A0"}
        </span>
        {value.length > 0 && (
          <span
            className="linkai-hero-input-skeleton"
            style={{ width: skeletonWidth }}
            aria-hidden
          />
        )}
        {placeholderNode != null && (
          <span className="linkai-hero-input-placeholder" aria-hidden>
            {placeholderNode}
          </span>
        )}
      </div>
    </div>
  );
}
