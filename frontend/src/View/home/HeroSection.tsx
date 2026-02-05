import React, { useCallback, useEffect, useRef, useState } from "react";
import { Typography } from "antd";
import SkeletonInput from "./SkeletonInput";
import { useTypingPlaceholder } from "./useTypingPlaceholder";
import "./WelcomePage.css";

const { Title, Text } = Typography;

const STATUS_MESSAGES = [
  "AI가 질문에서 키워드와 가중치를 추출하고 있습니다...",
  "벡터 DB에서 관련 특허 20여 개를 교차 검증 중입니다...",
  "추출된 청구항을 바탕으로 전문 분석 답변을 생성 중입니다...",
];

const STATUS_STEP_DURATION_MS = 1800;

/**
 * Hero = 제품 데모이자 첫 입력 인터페이스.
 * Title → Large Input (skeleton typing + typewriter placeholder) → Navigation dots.
 * Focus 시 배경 "AI waking up" glow. 확장: onSearch(query)로 실제 API 연결 가능.
 */
export default function HeroSection(): React.ReactElement {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusStep, setStatusStep] = useState(-1);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const placeholderText = useTypingPlaceholder();
  const isActive = isFocused || value.length > 0;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter" || isSubmitting) return;
      e.preventDefault();
      setIsSubmitting(true);
      setStatusStep(0);
    },
    [isSubmitting]
  );

  useEffect(() => {
    if (!isSubmitting || statusStep < 0) return;
    if (statusStep >= STATUS_MESSAGES.length) {
      const t = setTimeout(() => {
        setIsSubmitting(false);
        setStatusStep(-1);
      }, 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStatusStep((s) => s + 1), STATUS_STEP_DURATION_MS);
    statusTimeoutRef.current = t;
    return () => {
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    };
  }, [isSubmitting, statusStep]);

  return (
    <section
      id="hero"
      className="linkai-hero-section"
      data-hero-active={isActive}
      aria-label="Hero"
    >
      <div className="linkai-hero-content linkai-hero-content-sticky" role="region" aria-label="Hero">
        <Title level={1} className="linkai-hero-headline">
          특허를 검색하지 마세요, AI와 함께 기술을 설계하세요
        </Title>
        <Text className="linkai-hero-subtitle">
          GPT-5 기반의 의도 분석과 하이브리드 검색 엔진이 한양대 ERICA의
          <br />
          방대한 특허 자산을 맥락으로 연결합니다.
        </Text>

        <SkeletonInput
          value={value}
          onChange={setValue}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholderNode={
            value.length === 0 ? (
              <>
                {placeholderText}
                <span className="linkai-hero-input-cursor" />
              </>
            ) : null
          }
          aria-label="특허 질문 입력"
        />

        <div className="linkai-hero-quicklinks">
          <a
            href="/chatbot"
            className="linkai-hero-quicklink linkai-hero-quicklink-ai"
          >
            챗봇 서비스
          </a>
          <a
            href="/advanced-search"
            className="linkai-hero-quicklink linkai-hero-quicklink-search"
          >
            특허 검색 서비스
          </a>
        </div>

        {isSubmitting && statusStep >= 0 && statusStep < STATUS_MESSAGES.length && (
          <div className="linkai-hero-status" role="status" aria-live="polite">
            <span className="linkai-hero-status-spinner" aria-hidden />
            <span className="linkai-hero-status-text">
              {STATUS_MESSAGES[statusStep]}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
