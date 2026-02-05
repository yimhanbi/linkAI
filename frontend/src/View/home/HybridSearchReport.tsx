import React from "react";
import "./WelcomePage.css";

const SUMMARY_TEXT =
  "검색 범위: 한양대학교 ERICA 보유 특허 2,000+ 건 / 매칭 결과: 총 5건 발견";

const PATENT_ITEMS: ReadonlyArray<{
  number: string;
  title: string;
  snippet: string;
}> = [
  {
    number: "10-2023-0097051",
    title: "귀 질환 진단 방법 및 장치",
    snippet: "청구항 1: 청력 손실을 진단하기 위한 오디오 신호 처리 방법…",
  },
  {
    number: "10-2021-0128479",
    title: "외부 저장소에 저장된 파일을 보호하는 방법 및 장치",
    snippet: "암호화된 파일의 무결성 검증 및 접근 제어 방법에 관한 발명.",
  },
  {
    number: "10-2021-0101096",
    title: "프리로드 스캐닝을 이용한 웹 페이지 로딩 방법",
    snippet: "리소스 프리로드와 스캐닝 순서 최적화로 로딩 시간 단축.",
  },
  {
    number: "10-2020-0057329",
    title: "프록시 서버 및 이를 이용한 웹 오브젝트 예측 방법",
    snippet: "캐시 예측 및 프록시 기반 웹 오브젝트 제공 방법.",
  },
  {
    number: "10-2024-0000776",
    title: "압력감지센서 및 모니터링 서비스 제공 방법",
    snippet: "압력 데이터 수집·분석을 통한 실시간 모니터링 서비스.",
  },
];

/**
 * 2단계 하이브리드 검색 엔진: 검색 결과 리포트 스타일 (정적, 애니메이션 없음).
 */
export default function HybridSearchReport(): React.ReactElement {
  return (
    <div className="linkai-hybrid-report">
      <div className="linkai-hybrid-report-summary">
        {SUMMARY_TEXT}
      </div>
      <ul className="linkai-hybrid-report-list">
        {PATENT_ITEMS.map((item) => (
          <li key={item.number} className="linkai-hybrid-report-card">
            <div className="linkai-hybrid-report-card-badges">
              <span className="linkai-hybrid-badge linkai-hybrid-badge-context">
                맥락 일치
              </span>
              <span className="linkai-hybrid-badge linkai-hybrid-badge-keyword">
                키워드 검증
              </span>
            </div>
            <div className="linkai-hybrid-report-card-number">
              {item.number}
            </div>
            <div className="linkai-hybrid-report-card-title">
              {item.title}
            </div>
            <p className="linkai-hybrid-report-card-snippet">
              {item.snippet}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
