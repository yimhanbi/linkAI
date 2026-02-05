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
  return (
    <div className="linkai-welcome-root">
      <ScrollTriggerWrapper />

      <div className="linkai-bridge">
        <p className="linkai-bridge-slogan">
          기술사업화의 새로운 기준, LinkAI
        </p>
        <section className="linkai-section linkai-section-after-footer linkai-section-after-footer-ai">
          <Title level={2} className="linkai-section-title">
            AI Engine
          </Title>
          <div className="linkai-section-bullets linkai-section-bullets-ai">
            <Text className="linkai-section-bullets-text">
              <strong className="linkai-keyword">AI Engine</strong>은 단순한 키워드 검색을 넘어, 자연어에 담긴 복잡한 발명 의도를 <strong className="linkai-keyword">하이브리드 RAG 엔진</strong>으로 구조화합니다. 질문 하나로
              <br />
              <strong className="linkai-keyword">한양대 ERICA</strong>의 특허 자산과 시장의 니즈를 연결하여, 최적의 <strong className="linkai-keyword">기술사업화 경로</strong>를 정교하게 설계합니다.
            </Text>
          </div>

          <AIEngineScrollSection />
        </section>
      </div>

      <div className="linkai-cta-to-hero-wrap">
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

      <section className="linkai-section linkai-section-after-footer linkai-section-after-footer-advanced">
        <Title level={2} className="linkai-section-title">
          Advanced Search
        </Title>
        <div className="linkai-section-bullets">
          <Text>
            특허전문가가 아니어도 복잡한 검색식을 만들지 않아도, 자연어 키워드와 필터만으로 정교한 특허 검색과 분석을 할 수 있습니다.
          </Text>
          <Text>
            키워드·제품·연구자·기관·출원번호 조건을 조합해 수요기술과 연관된 특허를 빠르게 찾고, 특허별 AI 분석 정보를 한 화면에서 확인하세요.
          </Text>
        </div>

        <div className="linkai-advanced-grid">
          <div className="linkai-advanced-card search">
            <div className="linkai-advanced-title">특허 검색</div>
            <div className="linkai-advanced-body">
              기술 키워드, 제품 키워드, 책임연구자, 연구자 소속, 출원번호·등록번호를 한 번에 조합해 정교한 검색식을 만들 수 있습니다.
            </div>
          </div>
          <div className="linkai-advanced-card ai">
            <div className="linkai-advanced-title">AI 분석 기술정보</div>
            <div className="linkai-advanced-body">
              발명 요약, 핵심 기술 요약, 발명 효과 등 특허별 AI 분석 정보를 구조화된 카드 형태로 제공합니다.
            </div>
          </div>
          <div className="linkai-advanced-card market">
            <div className="linkai-advanced-title">적용 제품·시장 분석</div>
            <div className="linkai-advanced-body">
              특허가 적용될 수 있는 제품·산업·수요기업 정보를 함께 제공해 사업화 관점에서 특허를 해석할 수 있습니다.
            </div>
          </div>
          <div className="linkai-advanced-card trl">
            <div className="linkai-advanced-title">기술성숙도 · R&amp;D</div>
            <div className="linkai-advanced-body">
              TRL, 기술성숙 단계, 관련 R&amp;D 과제 정보를 연계해 현재 기술 수준과 추가 개발 필요성을 판단할 수 있습니다.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

