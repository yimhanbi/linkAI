import React from "react";
import "./WelcomePage.css";

/**
 * 정적 특허 분석 데모 (애니메이션 없음).
 * '이O준' 특허 리스트와 dlOOswns→이O준 정정 강조.
 */
export default function AIEngineStaticDemo(): React.ReactElement {
  return (
    <div className="linkai-static-demo">
      <div className="linkai-static-demo-bubble">
        <p className="linkai-static-demo-p">
          다음으로 정리해 드립니다. (&apos;dlOOswns&apos;는 한영전환 오류로 보이며 <strong>&apos;이O준&apos;</strong>으로 정정)
        </p>
        <p className="linkai-static-demo-p linkai-static-demo-heading">이O준 발명 특허</p>
        <p className="linkai-static-demo-p">10-2023-0097051: 귀 질환 진단 방법 및 장치</p>
        <p className="linkai-static-demo-p">10-2021-0128479: 외부 저장소에 저장된 파일을 보호하는 방법 및 장치</p>
      </div>
    </div>
  );
}
