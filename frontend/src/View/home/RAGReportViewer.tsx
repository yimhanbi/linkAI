import React from "react";
import "./WelcomePage.css";

const TOP_BADGE_LABEL = "준비중인 서비스";
const STATUS_TITLE =
  "AI가 데이터 접점을 바탕으로 비즈니스 전략을 수립 중입니다.";

const USER_QUESTION = "강O태 교수의 특허를 분석해서 사업화 전략을 내줘";
const KEYWORD_TAGS = ["#강O태", "#특허 분석", "#사업화 전략"];

const LOG_ENTRIES = [
  {
    status: "success" as const,
    text: "한양대 에리카 특허 DB 매칭 완료 (유사도 98.4%)",
  },
  {
    status: "success" as const,
    text: "강O태 교수 특허 포트폴리오(압력감지센서 외 3건) 로드 성공",
  },
  {
    status: "running" as const,
    text: "RAG 기반 사업화 전략 및 수요처 매칭 알고리즘 가동 중...",
  },
];

const GRAPH_QUERY_LABEL = "내 질문";
const GRAPH_NODE_LABEL = "강O태";
const GRAPH_EDGE_LABEL = "데이터 매칭 중";
const GRAPH_SIMILARITY = "0.95";

const INSIGHT_CARDS = [
  { label: "수요처 추천", body: "삼성전자, 현대모비스 등 타겟팅 가능" },
  {
    label: "사업화 전략",
    body: "기술 가치 평가 기반 라이선싱 모델 제안",
  },
];
const CARD_BADGE_LABEL = "준비 중";

const FOOTER_TEXT =
  "본 리포트는 1~3단계 분석 데이터를 기반으로 생성되며, 추후 정식 업데이트 예정입니다.";

/**
 * 4단계: 전문가 수준의 RAG 답변 - 입력 추출 → 분석 엔진 → 전략 미리보기 (정적).
 */
export default function RAGReportViewer(): React.ReactElement {
  return (
    <div className="linkai-rag-workspace">
      <div className="linkai-rag-workspace-top">
        <span className="linkai-rag-top-badge" aria-hidden>
          {TOP_BADGE_LABEL}
        </span>
        <p className="linkai-rag-workspace-title">
          {STATUS_TITLE}
          <span className="linkai-rag-status-cursor" aria-hidden />
        </p>
      </div>

      <div className="linkai-rag-workspace-body">
        {/* 1. 사용자 질문(말풍선) + 쿼리에서 추출한 키워드 */}
        <section className="linkai-rag-question-block" aria-label="내 질문">
          <div className="linkai-rag-question-bubble">
            <span className="linkai-rag-question-bubble-label">사용자 질문</span>
            <p className="linkai-rag-question-text">{USER_QUESTION}</p>
          </div>
          <p className="linkai-rag-keywords-caption">쿼리에서 추출된 키워드</p>
          <div className="linkai-rag-keywords">
            {KEYWORD_TAGS.map((tag) => (
              <span key={tag} className="linkai-rag-keyword-tag">
                {tag}
              </span>
            ))}
          </div>
        </section>

        {/* 2. 중앙: 분석 엔진 (터미널 + 관계도) */}
        <div className="linkai-rag-process-grid">
          <section
            className="linkai-rag-terminal"
            aria-label="분석 프로세스 로그"
          >
            <div className="linkai-rag-terminal-inner">
              {LOG_ENTRIES.map((entry, i) => (
                <div key={i} className="linkai-rag-log-line">
                  <span
                    className={
                      entry.status === "success"
                        ? "linkai-rag-log-dot linkai-rag-log-dot-success"
                        : "linkai-rag-log-dot linkai-rag-log-dot-running"
                    }
                    aria-hidden
                  />
                  <span className="linkai-rag-log-text">
                    &gt; {entry.text}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section
            className="linkai-rag-graph"
            aria-label="질문-발명자 데이터 연결"
          >
            <div className="linkai-rag-graph-inner linkai-rag-graph-single">
              <div className="linkai-rag-graph-node linkai-rag-graph-node-center">
                {GRAPH_QUERY_LABEL}
              </div>
              <div className="linkai-rag-graph-connection">
                <div className="linkai-rag-graph-edge-bold" aria-hidden />
                <span className="linkai-rag-graph-edge-mid-label">
                  {GRAPH_EDGE_LABEL}
                </span>
              </div>
              <div className="linkai-rag-graph-node linkai-rag-graph-node-outer">
                {GRAPH_NODE_LABEL}
              </div>
              <div className="linkai-rag-graph-similarity">
                Similarity: {GRAPH_SIMILARITY}
              </div>
            </div>
          </section>
        </div>

        {/* 3. 하단: 전략 수립 미리보기 */}
        <section
          className="linkai-rag-cards-wrap"
          aria-label="전략 카드 미리보기"
        >
          {INSIGHT_CARDS.map((card) => (
            <div key={card.label} className="linkai-rag-insight-card">
              <span className="linkai-rag-card-badge">
                {CARD_BADGE_LABEL}
              </span>
              <h5 className="linkai-rag-card-label">[{card.label}]</h5>
              <p className="linkai-rag-card-body">{card.body}</p>
            </div>
          ))}
        </section>
      </div>

      <footer className="linkai-rag-workspace-footer">{FOOTER_TEXT}</footer>
    </div>
  );
}
