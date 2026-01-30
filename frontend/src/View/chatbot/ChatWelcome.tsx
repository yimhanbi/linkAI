import React from "react";

type WelcomeCard = {
  title: string;
  description: string;
  template: string;
};

type Props = {
  onPickTemplate: (template: string) => void;
};

const WELCOME_CARDS: WelcomeCard[] = [
  {
    title: "특허검색",
    description: "자연어 질의로 보유특허를 검색합니다.",
    template: "특허검색: ",
  },
  {
    title: "연구자 분석",
    description: "보유특허로 연구자의 연구분야를 분석합니다.",
    template: "연구자 분석: ",
  },
  {
    title: "적용제품 분석",
    description: "특허기술이 적용가능한 제품을 분석합니다.",
    template: "적용제품 분석: ",
  },
  {
    title: "사업화 전략분석",
    description: "수요기업과 라이센싱 전략을 분석합니다.",
    template: "사업화 전략분석: ",
  },
];

const ChatWelcome: React.FC<Props> = ({ onPickTemplate }) => {
  return (
    <div className="chatbot-welcome" aria-label="Chat welcome">
      <div className="chatbot-welcome-inner">
        {/* 헤더 배너 */}
        <div className="chatbot-header-banner">
          <span className="chatbot-header-subtitle">Hybrid Keyword & Vector Search</span>
          <h2 className="chatbot-header-title">Engine Alpha (α)</h2>
        </div>
        <h1 className="chatbot-welcome-title">무엇을 도와드릴까요?</h1>
        <p className="chatbot-welcome-subtitle">
          AI 기반 자연어 처리로 맞춤형 특허분석정보를 제공합니다.
        </p>
        <div className="chatbot-welcome-grid" role="list">
          {WELCOME_CARDS.map((c) => (
            <button
              key={c.title}
              type="button"
              className="chatbot-welcome-card"
              onClick={() => onPickTemplate(c.template)}
              role="listitem"
            >
              <div className="chatbot-welcome-card-title">{c.title}</div>
              <div className="chatbot-welcome-card-desc">{c.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatWelcome;

