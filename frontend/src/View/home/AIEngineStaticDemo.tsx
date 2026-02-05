import React from "react";
import "./WelcomePage.css";

/**
 * 정적 특허 분석 데모 (애니메이션 없음).
 * '이연준/안제민/강경태' 특허 리스트와 dlduswns→이연준 정정 강조.
 */
export default function AIEngineStaticDemo(): React.ReactElement {
  return (
    <div className="linkai-static-demo">
      <div className="linkai-static-demo-bubble">
        <p className="linkai-static-demo-p">
          다음으로 정리해 드립니다. (&apos;dlduswns&apos;는 한영전환 오류로 보이며 <strong>&apos;이연준&apos;</strong>으로 정정)
        </p>
        <p className="linkai-static-demo-p linkai-static-demo-heading">이연준 발명 특허</p>
        <p className="linkai-static-demo-p">10-2023-0097051: 귀 질환 진단 방법 및 장치</p>
        <p className="linkai-static-demo-p">10-2021-0128479: 외부 저장소에 저장된 파일을 보호하는 방법 및 장치</p>
        <p className="linkai-static-demo-p linkai-static-demo-heading">안제민 발명 특허</p>
        <p className="linkai-static-demo-p">10-2021-0101096: 프리로드 스캐닝을 이용한 웹 페이지 로딩 방법</p>
        <p className="linkai-static-demo-p">10-2020-0057329: 프록시 서버 및 이를 이용한 웹 오브젝트 예측 방법</p>
        <p className="linkai-static-demo-p linkai-static-demo-heading">강경태 발명 특허</p>
        <p className="linkai-static-demo-p">10-2024-0000776: 압력감지센서 및 모니터링 서비스 제공 방법</p>
        <p className="linkai-static-demo-p">10-2023-0164745: 음성길이를 고려한 기계번역 장치 및 방법</p>
      </div>
    </div>
  );
}
