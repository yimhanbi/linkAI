import { NavLink, Outlet } from "react-router-dom";

const tabStyle = ({ isActive }: { isActive: boolean }) => ({
  padding: "10px 12px",
  borderRadius: 8,
  textDecoration: "none",
  fontSize: 14,
  fontWeight: 500,
  border: "1px solid var(--tab-border)",
  color: isActive ? "var(--tab-text-active)" : "var(--tab-text)",
  background: isActive ? "var(--tab-bg-active)" : "var(--tab-bg)",
});

export default function IPManagerLayout() {
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <NavLink to="calendar" style={tabStyle}>
          연차료 납부 캘린더
        </NavLink>
        <NavLink to="payment-request" style={tabStyle}>
          연차료 납부요청
        </NavLink>
        <NavLink to="maintenance" style={tabStyle}>
          특허 유지대상
        </NavLink>
        <NavLink to="abandonment" style={tabStyle}>
          유지포기대상
        </NavLink>
      </div>

      <Outlet />
    </div>
  );
}
