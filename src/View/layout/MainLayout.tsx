import { Outlet } from "react-router-dom";
import Sidebar from "../../shared/components/Sidebar";
import { useContext } from "react";
import { ThemeContext } from "../../shared/theme/ThemeContext";

export default function MainLayout() {
  const { toggleTheme, theme } = useContext(ThemeContext);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--bg)", // 테마에 맞는 배경색 적용 중
        color: "var(--text)",
      }}
    >
      <Sidebar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "0 16px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg)",
          }}
        >
          {/* 버튼 클릭 시 Context가 바뀌고 -> App.tsx의 ConfigProvider가 감지해서 antd를 바꿉니다 */}
          <button
            onClick={toggleTheme}
            style={{
              cursor: "pointer",
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--bg-sub)",
              color: "var(--text)",
              fontWeight: 600,
            }}
          >
            {theme === "light" ? "🌙 Dark" : "☀️ Light"}
          </button>
        </header>

        <main style={{ flex: 1, padding: 24 }}>
          {/* 상세 검색 페이지가 여기에 렌더링됩니다 */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}