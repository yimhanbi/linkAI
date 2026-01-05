import { Outlet } from "react-router-dom";
import Sidebar from "../../shared/components/Sidebar";
import Header from "./Header"; // 분리한 Header 컴포넌트 임포트

export default function MainLayout() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      {/* 왼쪽 사이드바 */}
      <Sidebar />

      {/* 오른쪽 콘텐츠 영역 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* 상단 헤더 (로그인/프로필/테마) */}
        <Header />

        {/* 메인 콘텐츠 (라우터에 따라 변경됨) */}
        <main style={{ flex: 1, padding: 24 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}