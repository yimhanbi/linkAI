import React, { useState } from "react";
import { Typography } from "antd";
import { ArrowUp } from "lucide-react";
import AIEngineScrollSection from "./AIEngineScrollSection";
import ScrollTriggerWrapper from "./ScrollTriggerWrapper";
import "./WelcomePage.css";

const { Title, Text } = Typography;
const CTA_HERO_TEXT = "지금 바로 1~3단계 분석 경험하기";

function scrollToHero(e: React.MouseEvent<HTMLAnchorElement>): void {
  e.preventDefault();
  document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" });
}

export default function WelcomePage() {
  const [operators, setOperators] = useState<Array<"AND" | "OR">>([
    "AND",
    "AND",
    "AND",
    "AND",
    "AND",
  ]);

  const handleOperatorClick = (index: number, value: "AND" | "OR"): void => {
    setOperators((prev) =>
      prev.map((op, i) => (i === index ? value : op))
    );
  };

  return (
    <div className="linkai-welcome-root">
      <ScrollTriggerWrapper />

      <div className="linkai-bridge">
        <section
          id="ai-engine"
          className="linkai-section linkai-section-after-footer linkai-section-after-footer-ai"
        >
          <Title level={2} className="linkai-section-title">
            AI Engine
          </Title>
          <div className="linkai-section-bullets linkai-section-bullets-ai">
            <Text className="linkai-section-bullets-text">
              <strong className="linkai-keyword">AI Engine</strong>은 단순한 키워드 검색을 넘어, 자연어에 담긴 복잡한 발명 의도를 <strong className="linkai-keyword">하이브리드 RAG 엔진</strong>으로 구조화합니다.
              <br />
              질문 하나로 <strong className="linkai-keyword">한양대 ERICA</strong>의 특허 자산과 시장의 니즈를 연결하여, 최적의 <strong className="linkai-keyword">기술사업화 경로</strong>를 정교하게 설계합니다.
            </Text>
          </div>

          <AIEngineScrollSection />

          <div className="linkai-cta-to-hero-wrap linkai-cta-to-hero-wrap-ai">
            <a
              href="#hero"
              className="linkai-cta-to-hero"
              aria-label="상단 검색창으로 이동"
              onClick={scrollToHero}
            >
              <ArrowUp className="linkai-cta-to-hero-icon" size={18} aria-hidden />
              <span>{CTA_HERO_TEXT}</span>
            </a>
          </div>
        </section>
      </div>

      <div className="linkai-advanced-section-bg">
        <section
          id="advanced-search"
          className="linkai-section linkai-section-after-footer linkai-section-after-footer-advanced"
        >
          <div className="linkai-advanced-inner">
            <h2 className="linkai-advanced-heading">Advanced Search</h2>
            <p className="linkai-advanced-lead">
              단편적인 키워드 검색을 넘어, 당신의 질문 속에 담긴{" "}
              <span className="linkai-advanced-emphasis">기술적 맥락</span>과{" "}
              <span className="linkai-advanced-emphasis">비즈니스 의도</span>를 정확히 읽어냅니다.
            </p>
            <p className="linkai-advanced-lead">
              <span className="linkai-advanced-emphasis">방대한 특허 전문 데이터</span>를 실시간으로 분석하여 오타나 모호한 표현 속에서도
              <br />
              <span className="linkai-advanced-emphasis">최적의 기술 접점</span>을 찾아내며 복잡한 검색식 없이도 가장 본질에 가까운{" "}
              <span className="linkai-advanced-emphasis">전략적 자산</span>을 도출합니다.
            </p>

            <div className="linkai-advanced-board">
              <div className="linkai-advanced-rows">
                <div className="linkai-advanced-row">
                  <div className="linkai-advanced-field-main">
                    <label className="linkai-advanced-label">기술 키워드</label>
                    <input
                      className="linkai-advanced-input"
                      placeholder="예: 귀 질환 진단, 실시간 생체 신호 분석"
                    />
                  </div>
                  <div
                    className="linkai-advanced-operator-group"
                    role="group"
                    aria-label="기술 키워드 결합 방식"
                  >
                    <button
                      type="button"
                      className={`linkai-advanced-operator ${
                        operators[0] === "AND" ? "is-active" : ""
                      }`}
                      aria-pressed={operators[0] === "AND"}
                      onClick={() => handleOperatorClick(0, "AND")}
                    >
                      AND
                    </button>
                    <button
                      type="button"
                      className={`linkai-advanced-operator ${
                        operators[0] === "OR" ? "is-active" : ""
                      }`}
                      aria-pressed={operators[0] === "OR"}
                      onClick={() => handleOperatorClick(0, "OR")}
                    >
                      OR
                    </button>
                  </div>
                  <div className="linkai-advanced-guide-item">
                    특허 원문 및 AI 기술 분석에서 추출된 핵심 기술 키워드로 검색
                  </div>
                </div>

                <div className="linkai-advanced-row">
                  <div className="linkai-advanced-field-main">
                    <label className="linkai-advanced-label">제품 키워드</label>
                    <input
                      className="linkai-advanced-input"
                      placeholder="예: 인솔, 웨어러블 디바이스, 모듈"
                    />
                  </div>
                  <div
                    className="linkai-advanced-operator-group"
                    role="group"
                    aria-label="제품 키워드 결합 방식"
                  >
                    <button
                      type="button"
                      className={`linkai-advanced-operator ${
                        operators[1] === "AND" ? "is-active" : ""
                      }`}
                      aria-pressed={operators[1] === "AND"}
                      onClick={() => handleOperatorClick(1, "AND")}
                    >
                      AND
                    </button>
                    <button
                      type="button"
                      className={`linkai-advanced-operator ${
                        operators[1] === "OR" ? "is-active" : ""
                      }`}
                      aria-pressed={operators[1] === "OR"}
                      onClick={() => handleOperatorClick(1, "OR")}
                    >
                      OR
                    </button>
                  </div>
                  <div className="linkai-advanced-guide-item">
                    기술이 적용될 수 있는 제품·응용 분야 중심 키워드로 검색
                  </div>
                </div>

                <div className="linkai-advanced-row">
                  <div className="linkai-advanced-field-main">
                    <label className="linkai-advanced-label">책임연구자</label>
                    <input
                      className="linkai-advanced-input"
                      placeholder="예: 강O태, 이O준"
                    />
                  </div>
                  <div
                    className="linkai-advanced-operator-group"
                    role="group"
                    aria-label="책임연구자 결합 방식"
                  >
                    <button
                      type="button"
                      className={`linkai-advanced-operator ${
                        operators[2] === "AND" ? "is-active" : ""
                      }`}
                      aria-pressed={operators[2] === "AND"}
                      onClick={() => handleOperatorClick(2, "AND")}
                    >
                      AND
                    </button>
                    <button
                      type="button"
                      className={`linkai-advanced-operator ${
                        operators[2] === "OR" ? "is-active" : ""
                      }`}
                      aria-pressed={operators[2] === "OR"}
                      onClick={() => handleOperatorClick(2, "OR")}
                    >
                      OR
                    </button>
                  </div>
                  <div className="linkai-advanced-guide-item">
                    책임연구자 및 연구그룹 기반 검색
                  </div>
                </div>

                <div className="linkai-advanced-row">
                  <div className="linkai-advanced-field-main">
                    <label className="linkai-advanced-label">연구자 소속</label>
                    <input
                      className="linkai-advanced-input"
                      placeholder="예: 한양대학교 ERICA, 의과대학, 전자공학과"
                    />
                  </div>
                  <div
                    className="linkai-advanced-operator-group"
                    role="group"
                    aria-label="연구자 소속 결합 방식"
                  >
                    <button
                      type="button"
                      className={`linkai-advanced-operator ${
                        operators[3] === "AND" ? "is-active" : ""
                      }`}
                      aria-pressed={operators[3] === "AND"}
                      onClick={() => handleOperatorClick(3, "AND")}
                    >
                      AND
                    </button>
                    <button
                      type="button"
                      className={`linkai-advanced-operator ${
                        operators[3] === "OR" ? "is-active" : ""
                      }`}
                      aria-pressed={operators[3] === "OR"}
                      onClick={() => handleOperatorClick(3, "OR")}
                    >
                      OR
                    </button>
                  </div>
                  <div className="linkai-advanced-guide-item linkai-advanced-guide-item--muted">
                    연구자 소속 정보를 함께 지정하면 조직·연구그룹 관점의 탐색
                  </div>
                </div>

                <div className="linkai-advanced-row">
                  <div className="linkai-advanced-field-main">
                    <label className="linkai-advanced-label">출원번호 / 등록번호</label>
                    <input
                      className="linkai-advanced-input"
                      placeholder="예: 10-2023-0097051, 10-2024-0000776"
                    />
                  </div>
                  <div
                    className="linkai-advanced-operator-group"
                    role="group"
                    aria-label="출원/등록번호 결합 방식"
                  >
                    <button
                      type="button"
                      className={`linkai-advanced-operator ${
                        operators[4] === "AND" ? "is-active" : ""
                      }`}
                      aria-pressed={operators[4] === "AND"}
                      onClick={() => handleOperatorClick(4, "AND")}
                    >
                      AND
                    </button>
                    <button
                      type="button"
                      className={`linkai-advanced-operator ${
                        operators[4] === "OR" ? "is-active" : ""
                      }`}
                      aria-pressed={operators[4] === "OR"}
                      onClick={() => handleOperatorClick(4, "OR")}
                    >
                      OR
                    </button>
                  </div>
                  <div className="linkai-advanced-guide-item">
                    출원번호/등록번호 기반 검색
                  </div>
                </div>
              </div>

              <div className="linkai-advanced-form-footer">
                <button type="button" className="linkai-advanced-filter-button">
                  상세 검색 
                </button>
                <button type="button" className="linkai-advanced-submit-button">
                  검색하기
                </button>
              </div>
            </div>

            <div className="linkai-advanced-grid">
              <div className="linkai-advanced-card search">
                <div className="linkai-advanced-title">Full-text Engine</div>
                <div className="linkai-advanced-body">
                  방대한 특허 전문(Full-text)을 초고속으로 검색하여 기술 배경과 맥락까지 한 번에 파악합니다.
                </div>
              </div>
              <div className="linkai-advanced-card ai">
                <div className="linkai-advanced-title">Semantic Matching</div>
                <div className="linkai-advanced-body">
                  문장·질문 단위의 의미를 이해하여 문맥 유사도 기반으로 가장 관련도 높은 특허를 도출합니다.
                </div>
              </div>
              <div className="linkai-advanced-card market">
                <div className="linkai-advanced-title">Smart Correction</div>
                <div className="linkai-advanced-body">
                  오타 자동 교정 및 동의어 사전 적용으로, 사용자의 다양한 표현을 일관된 검색 질의로 통합합니다.
                </div>
              </div>
              <div className="linkai-advanced-card trl">
                <div className="linkai-advanced-title">NLP Optimized</div>
                <div className="linkai-advanced-body">
                  n-gram 기반 한국어 형태소 분석과 기술 용어 최적화를 통해 도메인 특화 검색 품질을 높입니다.
                </div>
              </div>
            </div>

            <div className="linkai-advanced-cta-wrap">
              <button
                type="button"
                className="linkai-cta-to-hero"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById("hero")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <ArrowUp className="linkai-cta-to-hero-icon" size={18} aria-hidden />
                <span>Advanced Search 이용하기</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

