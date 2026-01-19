import { useState } from 'react';
import { Layout, Menu } from 'antd';
import { NavLink, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import {
  SearchOutlined,
  UserOutlined,
  SettingOutlined,
  MenuOutlined,
  MessageOutlined, // 챗봇 아이콘
} from '@ant-design/icons';
import { useChatbotStore } from '@/ViewModel/useChatbotVM';

const { Sider } = Layout;
const CHATBOT_PATH = '/chatbot';

// --- 메인 Sidebar 컴포넌트 ---
export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  // 챗봇 제어 함수 가져오기
  const { isOpen, openChatbot, closeChatbot } = useChatbotStore();

  // 로그인 시 저장했던 role 정보를 가져옵니다.
  const userRole = localStorage.getItem('role') || 'user';

  const selectedKey = location.pathname === CHATBOT_PATH || isOpen ? CHATBOT_PATH : location.pathname;

  return (
    <StyledSider 
      trigger={null} 
      collapsible 
      collapsed={collapsed} 
      width={260}
      collapsedWidth={80}
    >
      <HeaderArea $collapsed={collapsed}>
        <MenuOutlined 
          className="toggle-icon" 
          onClick={() => setCollapsed(!collapsed)} 
        />
      </HeaderArea>

      {!collapsed && <SectionLabel>SERVICE</SectionLabel>}

      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
      >
        {/* 1. AI Chatbot 메뉴 추가 (Advanced Search 위) */}
        <Menu.Item 
          key={CHATBOT_PATH} 
          icon={<MessageOutlined />} 
          onClick={() => {
            if (isOpen) {
              closeChatbot();
              return;
            }
            openChatbot();
          }}
        >
          <NavLink to={CHATBOT_PATH}>AI Chatbot</NavLink>
        </Menu.Item>

        <Menu.Item key="/advanced-search" icon={<SearchOutlined />} onClick={closeChatbot}>
          <NavLink to="/advanced-search">Advanced Search</NavLink>
        </Menu.Item>

        {/* 2. 관리자(admin)일 때만 MANAGEMENT 섹션 노출 */}
        {userRole === 'admin' && (
          <>
            {!collapsed && <SectionLabel>MANAGEMENT</SectionLabel>}

            <Menu.Item key="/users" icon={<UserOutlined />}>
              <NavLink to="/users">Users</NavLink>
            </Menu.Item>

            <Menu.Item key="/settings" icon={<SettingOutlined />}>
              <NavLink to="/settings">Settings</NavLink>
            </Menu.Item>
          </>
        )}
      </Menu>
    </StyledSider>
  );
}

// --- 스타일 컴포넌트 정의 (파일 하단 배치 추천) ---

const StyledSider = styled(Sider)`
  background: var(--sidebar-bg) !important;
  border-right: 1px solid var(--sidebar-border);

  .ant-layout-sider-children {
    display: flex;
    flex-direction: column;
    background: var(--sidebar-bg);
  }

  .ant-menu {
    background: transparent !important;
    color: var(--sidebar-link) !important;
    border-inline-end: none !important;
  }

  .ant-menu-item {
    color: var(--sidebar-link) !important;
    margin: 4px 8px !important;
    width: calc(100% - 16px) !important;
    border-radius: 8px !important;

    &:hover {
      background-color: var(--sidebar-link-hover-bg) !important;
    }
  }

  .ant-menu-item-selected {
    background-color: var(--sidebar-link-active-bg) !important;
    color: var(--sidebar-link-active-text) !important;
    
    a { color: var(--sidebar-link-active-text) !important; }
    .anticon { color: var(--sidebar-link-active-text) !important; }
  }
`;

const HeaderArea = styled.div<{ $collapsed: boolean }>`
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  justify-content: ${props => props.$collapsed ? 'center' : 'flex-end'};
  color: var(--sidebar-text);

  .toggle-icon {
    font-size: 20px;
    cursor: pointer;
    transition: transform 0.2s;
    &:hover { opacity: 0.8; }
  }
`;

const SectionLabel = styled.div`
  padding: 16px 24px 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--sidebar-text-sub);
  letter-spacing: 0.5px;
  text-transform: uppercase;
`;