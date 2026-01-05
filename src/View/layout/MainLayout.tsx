import { Outlet, useNavigate, Link } from "react-router-dom"; // useNavigate, Link 추가
import Sidebar from "../../shared/components/Sidebar";
import { useContext } from "react";
import { ThemeContext } from "../../shared/theme/ThemeContext";

export default function MainLayout() {
  const { toggleTheme, theme } = useContext(ThemeContext);
  const navigate = useNavigate();

  // 1. 로그인 여부 확인 (토큰이 있으면 true)
  const isLoggedIn = !!localStorage.getItem("token");

  // 2. 로그아웃 함수
  const handleLogout = () => {
    localStorage.removeItem("token");
    // authChange 이벤트 발생시켜 AppRouter의 상태 갱신
    window.dispatchEvent(new Event('authChange'));
    alert("로그아웃 되었습니다.");
    navigate("/login");
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--bg)",
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
            justifyContent: "space-between",
            padding: "0 16px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg)",
          }}
        >
          <span
            style={{
              fontWeight: 800,
              fontSize: 18,
              color: "#1890ff",
              cursor: "pointer"
            }}
            onClick={() => navigate('/')} // 로고 클릭 시 홈 이동
          >
            LinkAI
          </span>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {/* 3. 로그인 상태에 따른 버튼 렌더링 */}
            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                style={headerButtonStyle}
              >
                Logout
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                style={headerButtonStyle}
              >
                Login
              </button>
            )}

            {/* 테마 변경 버튼 */}
            <button
              onClick={toggleTheme}
              style={headerButtonStyle}
            >
              {theme === "light" ? "🌙 Dark" : "☀️ Light"}
            </button>
          </div>
        </header>

        <main style={{ flex: 1, padding: 24 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// 중복되는 버튼 스타일 정의
const headerButtonStyle: React.CSSProperties = {
  cursor: "pointer",
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-sub)",
  color: "var(--text)",
  fontWeight: 600,
  fontSize: "14px"
};