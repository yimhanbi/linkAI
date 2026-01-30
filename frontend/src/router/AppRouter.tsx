import { Navigate, Route, Routes } from "react-router-dom";
import { useState, useEffect } from "react";
import MainLayout from "../View/layout/MainLayout";
import AdvancedSearchPage from "../View/advancedSearch/AdvancedSearchPage";
import LoginPage from "@/View/auth/LoginPage";

export default function AppRouter() {
  // 1. 로컬 스토리지에서 토큰 확인 (로그인 여부) - 상태로 관리하여 변경 감지
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));

  // 2. localStorage 변경 감지
  useEffect(() => {
    const checkAuth = () => {
      setIsLoggedIn(!!localStorage.getItem("token"));
    };

    // 초기 확인
    checkAuth();

    // storage 이벤트 리스너 (다른 탭에서의 변경 감지)
    window.addEventListener("storage", checkAuth);

    // 커스텀 이벤트 리스너 (같은 탭에서의 변경 감지)
    window.addEventListener("authChange", checkAuth);

    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("authChange", checkAuth);
    };
  }, []);

  return (
    <Routes>
      {/* 기본 접속(/) 시: 로그인 여부에 따라 리다이렉트 */}
      <Route 
        path="/" 
        element={isLoggedIn ? <Navigate to="/chatbot" replace /> : <Navigate to="/login" replace />} 
      />

      {/* 로그인 페이지: 레이아웃 없이 단독으로 보여야 함 */}
      <Route 
        path="/login" 
        element={isLoggedIn ? <Navigate to="/chatbot" replace /> : <LoginPage />} 
      />

      {/* 메인 서비스 영역: 로그인한 경우에만 접근 가능 (MainLayout 적용) */}
      <Route element={isLoggedIn ? <MainLayout /> : <Navigate to="/login" replace />}>
        {/* 상세 검색 페이지 */}
        <Route path="/advanced-search" element={<AdvancedSearchPage />} />
        {/* 챗봇 페이지 (실제 UI는 MainLayout의 ChatbotContainer가 담당) */}
        <Route path="/chatbot" element={<div />} />
        
        {/* 추후 추가될 챗봇 등의 페이지는 여기에 계속 추가 */}
      </Route>

      {/* 404 페이지 */}
      <Route path="*" element={<h1>Not Found</h1>} />
    </Routes>
  );
}