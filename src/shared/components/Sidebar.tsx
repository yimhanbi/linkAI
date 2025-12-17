import { NavLink } from "react-router-dom";

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  display: "block",
  padding: "10px 12px",
  borderRadius: 8,
  textDecoration: "none",
  marginBottom: 8,
  fontWeight: 500,
  color: isActive
    ? "var(--sidebar-link-active-text)"
    : "var(--sidebar-link)",
  background: isActive
    ? "var(--sidebar-link-active-bg)"
    : "transparent",
});

export default function Sidebar() {
  return (
    <aside
      style={{
        width: 260,
        padding: 16,
        background: "var(--sidebar-bg)",
        color: "var(--sidebar-text)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {/* Logo / Title */}
      <div style={{ fontWeight: 800, marginBottom: 16 }}>
        moaai
      </div>

      {/* Section label */}
      <div
        style={{
          opacity: 1,
          fontSize: 14,
          marginBottom: 8,
          color: "var(--sidebar-text-sub)",
        }}
      >
        SERVICE
      </div>

      <NavLink to="/advanced-search" style={linkStyle}>
        Advanced Search
      </NavLink>

      <NavLink to="/ip-manager/calendar" style={linkStyle}>
        IP Manager
      </NavLink>

      <div
        style={{
          marginTop: 16,
          fontSize: 12,
          color: "var(--sidebar-text-sub)",
        }}
      >
        (나중에 여기 아래로 Users/Groups 등 추가)
      </div>
    </aside>
  );
}
