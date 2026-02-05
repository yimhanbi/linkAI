import React from "react";
import HeroSection from "./HeroSection";
import "./WelcomePage.css";

/**
 * Hero 래퍼: 단일 100vh 블록. 슬라이드/캐러셀 없음.
 * Hero는 '제품 사용 시작 지점' 하나의 상태만 가짐.
 */
export default function ScrollTriggerWrapper(): React.ReactElement {
  return (
    <div className="linkai-hero-scroll-trigger-wrapper" style={{ height: "100vh" }}>
      <HeroSection />
    </div>
  );
}
