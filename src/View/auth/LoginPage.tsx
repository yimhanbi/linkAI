import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../Service/authService';
import './LoginPage.css'; 

const LoginPage = () => {
  const [isSignIn, setIsSignIn] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // 접속 시 바로 sign-in 애니메이션이 작동하도록 설정
    const container = document.getElementById('container');
    if (container) container.classList.add('sign-in');
  }, []);

  const toggle = () => {
    setIsSignIn(!isSignIn);
    const container = document.getElementById('container');
    if (container) {
      container.classList.toggle('sign-in');
      container.classList.toggle('sign-up');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await authService.login(email, password);
      localStorage.setItem('token', data.access_token);
      // authChange 이벤트 발생시켜 AppRouter의 상태 갱신
      window.dispatchEvent(new Event('authChange'));
      alert('로그인 성공!');
      navigate('/advanced-search'); // 로그인 후 메인(검색) 페이지로 이동
    } catch (error) {
      alert('로그인 실패: 정보를 확인해주세요.');
    }
  };

  return (
    <div id="container" className="container">
      <div className="row">
        {/* SIGN UP SECTION */}
        <div className="col align-items-center flex-col sign-up">
          <div className="form-wrapper align-items-center">
            <div className="form sign-up">
              <div className="input-group">
                <i className='bx bxs-user'></i>
                <input type="text" placeholder="Username" />
              </div>
              <div className="input-group">
                <i className='bx bx-mail-send'></i>
                <input type="email" placeholder="Email" />
              </div>
              <div className="input-group">
                <i className='bx bxs-lock-alt'></i>
                <input type="password" placeholder="Password" />
              </div>
              <button onClick={() => alert('회원가입 기능 준비 중')}>Sign up</button>
              <p>
                <span>Already have an account?</span>
                <b onClick={toggle} className="pointer"> Sign in here</b>
              </p>
            </div>
          </div>
        </div>

        {/* 회원가입 */}
        <div className="col align-items-center flex-col sign-in">
          <div className="form-wrapper align-items-center">
            <form className="form sign-in" onSubmit={handleLogin}>
              <div className="input-group">
                <i className='bx bxs-user'></i>
                <input 
                  type="email" 
                  placeholder="Email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <i className='bx bxs-lock-alt'></i>
                <input 
                  type="password" 
                  placeholder="Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit">Sign in</button>
              <p><b>Forgot password?</b></p>
              <p>
                <span>Don't have an account?</span>
                <b onClick={toggle} className="pointer"> Sign up here</b>
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* CONTENT SECTION */}
      <div className="row content-row">
        <div className="col align-items-center flex-col">
          <div className="text sign-in">
            <h2>Welcome Back</h2>
          </div>
        </div>
        <div className="col align-items-center flex-col">
          <div className="text sign-up">
            <h2>Join With Us</h2>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;