import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Header = () => {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('token'); // 로그인 여부 확인

  const handleLogout = () => {
    localStorage.removeItem('token');
    alert('로그아웃 되었습니다.');
    navigate('/');
    window.location.reload(); // 상태 반영을 위해 새로고침
  };

  return (
    <header className="main-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 5%' }}>
      <div className="logo">
        <Link to="/">LINK AI</Link>
      </div>
      <nav>
        <Link to="/advanced-search" style={{ marginRight: '20px' }}>특허검색</Link>
        {isLoggedIn ? (
          <button onClick={handleLogout}>로그아웃</button>
        ) : (
          <Link to="/login">로그인</Link>
        )}
      </nav>
    </header>
  );
};

export default Header;