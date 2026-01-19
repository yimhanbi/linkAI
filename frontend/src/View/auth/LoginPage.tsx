import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../Service/authService';
import './LoginPage.css'; 

const LoginPage = () => {
  const navigate = useNavigate();
  const [isSignIn, setIsSignIn] = useState(true);

  // 1. 로그인용 상태
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 2. 회원가입용 상태 추가 (백엔드 필드명: name, email, password)
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  useEffect(() => {
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

  // 로그인 로직
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await authService.login(email, password);
      
      //토큰과 함께 role 정보를 localStorage에 저장함
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('role',data.role);
      localStorage.setItem('name',data.name);
      localStorage.setItem('email',email);

      window.dispatchEvent(new Event('authChange'));
      alert('로그인 성공!');
      navigate('/advanced-search');
    } catch (error) {
      alert('로그인 실패: 정보를 확인해주세요.');
    }
  };

  // 3. 회원가입 로직 추가
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 백엔드가 요구하는 JSON 구조 전송
      await authService.signup({
        name: signupName,
        email: signupEmail,
        password: signupPassword,
        role: "user" // 기본값 설정
      });
      alert('회원가입 성공! 이제 로그인해주세요.');
      toggle(); // 성공 시 로그인 폼으로 전환
      
      // 가입 필드 초기화
      setSignupName('');
      setSignupEmail('');
      setSignupPassword('');
    } catch (error: any) {
      const msg = error.response?.data?.detail || '회원가입 실패';
      alert(msg);
    }
  };

  return (
    <div id="container" className="container">
      <div className="row">
        {/* SIGN UP SECTION */}
        <div className="col align-items-center flex-col sign-up">
          <div className="form-wrapper align-items-center">
            {/* 4. form 태그와 onSubmit 연결 */}
            <form className="form sign-up" onSubmit={handleSignup}>
              <div className="input-group">
                <i className='bx bxs-user'></i>
                <input 
                  type="text" 
                  placeholder="User name" 
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  required 
                />
              </div>
              <div className="input-group">
                <i className='bx bxs-envelope'></i>
                <input 
                  type="email" 
                  placeholder="Email" 
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required 
                />
              </div>
              <div className="input-group">
                <i className='bx bxs-lock-alt'></i>
                <input 
                  type="password" 
                  placeholder="Password" 
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required 
                />
              </div>
              <button type="submit">Sign up</button>
              <p>
                <span>Already have an account?</span>
                <b onClick={toggle} className="pointer"> Sign in here</b>
              </p>
            </form>
          </div>
        </div>

        {/* SIGN IN SECTION */}
        <div className="col align-items-center flex-col sign-in">
          <div className="form-wrapper align-items-center">
            <form className="form sign-in" onSubmit={handleLogin}>
              <div className="input-group">
                <i className='bx bxs-envelope'></i> {/* 아이콘 통일 */}
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

      {/* CONTENT SECTION  */}
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