import React, { useRef, useState } from "react";
import { Sparkles, Database, FileSearch, ShieldCheck } from "lucide-react";
import { useScrollReactiveSections } from "./useScrollReactiveSections";
import AIEngineDemoChat from "./AIEngineDemoChat";
import HybridSearchReport from "./HybridSearchReport";
import ClaimDeepDiveViewer from "./ClaimDeepDiveViewer";
import RAGReportViewer from "./RAGReportViewer";
import "./WelcomePage.css";

const LEFT_ITEMS: { label: string; body: string }[] = [
  {
    label: "LLM 기반 의도 구조화",
    body: "질문 속 오타나 모호한 표현을 정제하고, 검색에 필요한 핵심 키워드와 가중치를 스스로 설계합니다.",
  },
  {
    label: "하이브리드 검색 엔진",
    body: "벡터 임베딩을 통한 맥락 검색과 가중치 기반 정밀 검색을 결합하여\n단 하나의 관련 특허도 놓치지 않습니다.",
  },
  {
    label: "청구항 중심 맥락 추론",
    body: "요약문을 넘어 특허의 핵심인 '청구항' 전체를 분석하여 기술의 권리 범위와 실질적 활용 가치를 판단합니다.",
  },
  {
    label: "전문가 수준의 RAG 답변",
    body: "분석된 수많은 특허 데이터를 근거(Context)로 삼아, 외부 지식 섞임 없는 가장 정확한 분석 결과를 제공합니다.",
  },
];

const RIGHT_BLOCKS: ReadonlyArray<{
  title: string;
  content: string;
  Icon: React.ComponentType<{ className?: string; size?: number }>;
}> = [
  {
    title: "LLM 기반 의도 구조화",
    content:
      "질문 속 오타나 모호한 표현을 정제하고, 검색에 필요한 핵심 키워드와 가중치를 스스로 설계합니다.",
    Icon: Sparkles,
  },
  {
    title: "하이브리드 검색 엔진",
    content:
      "벡터 임베딩을 통한 맥락 검색과 가중치 기반 정밀 검색을 결합하여 단 하나의 관련 특허도 놓치지 않습니다.",
    Icon: Database,
  },
  {
    title: "청구항 중심 맥락 추론",
    content:
      "요약문을 넘어 특허의 핵심인 '청구항' 전체를 분석하여 기술의 권리 범위와 실질적 활용 가치를 판단합니다.",
    Icon: FileSearch,
  },
  {
    title: "전문가 수준의 RAG 답변",
    content:
      "분석된 수많은 특허 데이터를 근거(Context)로 삼아, 외부 지식 섞임 없는 가장 정확한 분석 결과를 제공합니다.",
    Icon: ShieldCheck,
  },
];

export default function AIEngineScrollSection(): React.ReactElement {
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const activeIndex = useScrollReactiveSections(rightColumnRef, LEFT_ITEMS.length);
  const [demoHovered, setDemoHovered] = useState(false);
  const demoTrigger = activeIndex === 0 || demoHovered;

  return (
    <div className="linkai-scroll-reactive">
      <div className="linkai-scroll-reactive-inner">
        <aside className="linkai-scroll-reactive-left">
          {LEFT_ITEMS.map((item, i) => (
            <div
              key={item.label}
              className="linkai-scroll-reactive-item"
              data-active={i === activeIndex ? "true" : "false"}
            >
              <div className="linkai-scroll-reactive-item-label">
                {item.label}
              </div>
              <div className="linkai-scroll-reactive-item-body">{item.body}</div>
            </div>
          ))}
        </aside>
        <div
          ref={rightColumnRef}
          className="linkai-scroll-reactive-right"
          role="region"
          aria-label="AI Engine 설명"
        >
          {RIGHT_BLOCKS.map((block, i) => {
            const isActive = i === activeIndex;
            const { Icon } = block;
            const isFirstBlock = i === 0;
            return (
              <section
                key={block.title}
                className="linkai-scroll-reactive-block"
                data-scroll-section
                data-active={isActive ? "true" : "false"}
                onMouseEnter={isFirstBlock ? () => setDemoHovered(true) : undefined}
                onMouseLeave={isFirstBlock ? () => setDemoHovered(false) : undefined}
              >
                <div
                  className="linkai-scroll-reactive-block-icon"
                  data-active={isActive ? "true" : "false"}
                  aria-hidden
                >
                  <Icon className="linkai-scroll-reactive-block-icon-svg" size={32} />
                </div>
                <h3 className="linkai-scroll-reactive-block-title">
                  {block.title}
                </h3>
                {isFirstBlock ? (
                  <div className="linkai-demo-chat-wrap">
                    <AIEngineDemoChat trigger={demoTrigger} />
                  </div>
                ) : i === 1 ? (
                  <HybridSearchReport />
                ) : i === 2 ? (
                  <ClaimDeepDiveViewer />
                ) : i === 3 ? (
                  <RAGReportViewer />
                ) : (
                  <p className="linkai-scroll-reactive-block-content">
                    {block.content}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
