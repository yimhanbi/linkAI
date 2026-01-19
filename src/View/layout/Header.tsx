import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from "../../shared/theme/ThemeContext";

const Header = () => {
  const { toggleTheme, theme } = useContext(ThemeContext);
  const navigate = useNavigate();

  // 1. 누락되었던 상태(State)와 참조(Ref) 정의 추가
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 2. localStorage에서 실시간으로 이름과 이메일 가져오기
  const userName = localStorage.getItem('name') || '사용자';
  const userEmail = localStorage.getItem('email') || '이메일 정보 없음';
  const isLoggedIn = !!localStorage.getItem("token");

  // 외부 클릭 시 드롭다운 닫기 로직
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role"); // role도 함께 삭제 권장
    localStorage.removeItem("name"); // name도 삭제
    localStorage.removeItem("email"); // email도 삭제
    window.dispatchEvent(new Event('authChange'));
    alert("로그아웃 되었습니다.");
    setIsMenuOpen(false);
    navigate("/login");
  };

  return (
    <header style={headerContainerStyle}>
      <span
        style={{ fontWeight: 800, fontSize: 18, color: "#1890ff", cursor: "pointer" }}
        onClick={() => navigate('/')}
      >
        LinkAI
      </span>

      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        {/* 테마 변경 버튼 */}
        <button onClick={toggleTheme} style={headerButtonStyle}>
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>

        {/* 프로필 드롭다운 */}
        {isLoggedIn ? (
          <div style={{ position: "relative" }} ref={dropdownRef}>
            <div 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <i className='bx bxs-user-circle' style={{ fontSize: '32px', color: 'var(--text)' }}></i>
            </div>

            {isMenuOpen && (
              <div style={dropdownMenuStyle}>
                <div style={{ padding: "12px 16px" }}>
                  {/* 3. 하드코딩 대신 변수 적용 */}
                  <div style={{ fontWeight: "bold", fontSize: "14px", color: "var(--text)" }}>
                    {userName}
                  </div>
                  <div style={{ fontSize: "12px", color: "gray" }}>
                    {userEmail}
                  </div>
                </div>
                <div style={dividerStyle} />
                <div style={menuItemStyle} onClick={() => {navigate('/settings'); setIsMenuOpen(false);}}>Settings</div>
                <div style={dividerStyle} />
                <div 
                  style={{ ...menuItemStyle, color: "#ff4d4f" }} 
                  onClick={handleLogout}
                >
                  Log out
                </div>
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => navigate('/login')} style={headerButtonStyle}>
            Login
          </button>
        )}
      </div>
    </header>
  );
};

// --- 스타일 정의 (기존과 동일) ---
const headerContainerStyle: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 2000,
  height: 56,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 16px",
  borderBottom: "1px solid var(--border)",
  background: "var(--bg)",
};

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

const dropdownMenuStyle: React.CSSProperties = {
  position: "absolute",
  top: "45px",
  right: "0",
  width: "220px",
  backgroundColor: "var(--bg)",
  borderRadius: "12px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
  border: "1px solid var(--border)",
  zIndex: 2100,
  overflow: "hidden"
};

const menuItemStyle: React.CSSProperties = {
  padding: "10px 16px",
  fontSize: "13px",
  cursor: "pointer",
  color: "var(--text)"
};

const dividerStyle: React.CSSProperties = {
  height: "1px",
  backgroundColor: "var(--border)",
  margin: "4px 0"
};

export default Header;