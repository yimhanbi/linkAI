import React, { useState } from 'react';
import { Layout, Menu } from 'antd';
import { NavLink, useLocation } from 'react-router-dom';
import styled from 'styled-components';
// 사용할 아이콘들 import
import {
  SearchOutlined,
  UserOutlined,
  SettingOutlined,
  MenuOutlined, 
} from '@ant-design/icons';

const { Sider } = Layout;

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
    
    a {
      color: var(--sidebar-link-active-text) !important;
    }
    
    /* 아이콘 색상 강제 적용 */
    .anticon {
      color: var(--sidebar-link-active-text) !important;
    }
  }

  .ant-menu-submenu-title {
    color: var(--sidebar-link) !important;
  }
`;

const HeaderArea = styled.div<{ collapsed: boolean }>`
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  justify-content: ${props => props.collapsed ? 'center' : 'flex-end'};
  color: var(--sidebar-text);

  /* 햄버거 아이콘 스타일 */
  .toggle-icon {
    font-size: 20px;
    cursor: pointer;
    color: var(--sidebar-text);
    transition: transform 0.2s;

    &:hover {
      opacity: 0.8;
    }
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

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <StyledSider 
      trigger={null} 
      collapsible 
      collapsed={collapsed} 
      width={260}
      collapsedWidth={80}
    >
      <HeaderArea collapsed={collapsed}>
        {/*  Ant Design의 MenuOutlined 아이콘 사용 */}
        <MenuOutlined 
          className="toggle-icon" 
          onClick={() => setCollapsed(!collapsed)} 
        />
      </HeaderArea>

      {!collapsed && <SectionLabel>SERVICE</SectionLabel>}

      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
      >
        <Menu.Item key="/advanced-search" icon={<SearchOutlined />}>
          <NavLink to="/advanced-search">Advanced Search</NavLink>
        </Menu.Item>

        {!collapsed && <SectionLabel>MANAGEMENT</SectionLabel>}

        <Menu.Item key="/users" icon={<UserOutlined />}>
          <NavLink to="/users">Users</NavLink>
        </Menu.Item>

        <Menu.Item key="/settings" icon={<SettingOutlined />}>
          <NavLink to="/settings">Settings</NavLink>
        </Menu.Item>
      </Menu>
    </StyledSider>
  );
}