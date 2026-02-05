import React from "react";
import { FileSearch } from "lucide-react";
import "./WelcomePage.css";

const CLAIM_PART = (text: string, highlight?: boolean, label?: string) =>
  ({ text, highlight, label } as const);

const ANALYSIS_BLOCKS: ReadonlyArray<{
  header: string;
  claimParts: ReadonlyArray<{ text: string; highlight?: boolean; label?: string }>;
  insights: ReadonlyArray<{ title: string; body: string }>;
  conclusion: string;
}> = [
  {
    header: "[분석 중] 10-2024-0000776: 압력감지센서 및 모니터링 서비스 제공 방법",
    claimParts: [
      CLAIM_PART("청구항 제1항 "),
      CLAIM_PART("압력감지", true, "핵심 기술 요소"),
      CLAIM_PART("센서와, 상기 압력감지 센서로부터 수신한 신호를 처리하는 "),
      CLAIM_PART("데이터 전송 모듈", true, "핵심 기술 요소"),
      CLAIM_PART(
        " 및 상기 데이터 전송 모듈을 통해 외부 장치와 연동하여 모니터링 서비스를 제공하는 제어부를 포함하는, 압력감지센서 및 모니터링 서비스 제공 방법에 있어서, 상기 제어부가 수집된 압력 데이터를 기반으로 이상 구간을 판별하고 해당 구간에 대한 알림을 생성하는 단계를 포함하는 것을 특징으로 하는 방법."
      ),
    ],
    insights: [
      { title: "권리 범위 분석", body: "독립항으로서 광범위한 권리 범위를 형성함" },
      { title: "기술적 차별성", body: "기존 센서 대비 저전력 데이터 처리 알고리즘 포함" },
    ],
    conclusion:
      "본 청구항은 기존 기술 대비 데이터 정확도 측면에서 강력한 독창성을 가집니다.",
  },
  {
    header: "[분석 중] 10-2023-0097051: 귀 질환 진단 방법 및 장치",
    claimParts: [
      CLAIM_PART("청구항 제1항 "),
      CLAIM_PART("청력 손실", true, "핵심 기술 요소"),
      CLAIM_PART("을 진단하기 위한 "),
      CLAIM_PART("오디오 신호 처리", true, "핵심 기술 요소"),
      CLAIM_PART(
        " 방법에 있어서, 대상자의 청각 반응을 수집하는 단계와, 상기 수집된 신호에 대해 주파수별 임계값을 적용하여 이상 청력을 판별하는 단계를 포함하는 것을 특징으로 하는 귀 질환 진단 방법."
      ),
    ],
    insights: [
      { title: "권리 범위 분석", body: "진단 방법의 전 단계를 독립항으로 포괄하여\n권리 범위가 명확함" },
      { title: "기술적 차별성", body: "주파수별 임계값 적용을 통한 정량적 진단 알고리즘\n포함" },
    ],
    conclusion:
      "본 청구항은 청력 손실의 정밀 진단을 위한 방법론적 독창성을 인정받을 수 있습니다.",
  },
];

function ClaimAnalysisBlock({
  header,
  claimParts,
  insights,
  conclusion,
}: (typeof ANALYSIS_BLOCKS)[number]): React.ReactElement {
  return (
    <div className="linkai-claim-block">
      <div className="linkai-claim-viewer-header">
        <FileSearch className="linkai-claim-viewer-header-icon" size={18} aria-hidden />
        <span className="linkai-claim-viewer-header-text">{header}</span>
      </div>

      <div className="linkai-claim-viewer-split">
        <div className="linkai-claim-viewer-original">
          <div className="linkai-claim-viewer-original-label">원문</div>
          <div className="linkai-claim-viewer-claim-text">
            {claimParts.map((part, idx) =>
              part.highlight ? (
                <span key={idx} className="linkai-claim-highlight-wrap">
                  <span className="linkai-claim-highlight">{part.text}</span>
                  {part.label && (
                    <span className="linkai-claim-annotation">{part.label}</span>
                  )}
                </span>
              ) : (
                <span key={idx}>{part.text}</span>
              )
            )}
          </div>
        </div>
        <div className="linkai-claim-viewer-insights">
          <div className="linkai-claim-viewer-insights-label">인사이트 요약</div>
          {insights.map((item) => (
            <div key={item.title} className="linkai-claim-insight-card">
              <div className="linkai-claim-insight-card-title">[{item.title}]</div>
              <p className="linkai-claim-insight-card-body">{item.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="linkai-claim-viewer-conclusion">
        <p className="linkai-claim-viewer-conclusion-text">{conclusion}</p>
      </div>
    </div>
  );
}

/**
 * 3단계 청구항 중심 맥락 추론: 심층 분석 뷰어 (정적, 애니메이션 없음).
 */
export default function ClaimDeepDiveViewer(): React.ReactElement {
  return (
    <div className="linkai-claim-viewer">
      {ANALYSIS_BLOCKS.map((block, idx) => (
        <ClaimAnalysisBlock key={idx} {...block} />
      ))}
    </div>
  );
}
