import { ConfigProvider, theme as antTheme } from "antd";
import { useContext } from "react";
import {ThemeContext} from "./shared/theme/ThemeContext";
import AppRouter  from "./router/AppRouter";


export default function App(){
  const { theme } = useContext(ThemeContext);

return (
    <ConfigProvider
      theme={{
        // 핵심: theme 상태에 따라 antd의 다크/라이트 알고리즘을 스위칭합니다.
        algorithm: theme === "dark" ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorPrimary: "#1890ff", // 포인트 컬러 
          borderRadius: 8,
        },
      }}
    >
      <AppRouter />
    </ConfigProvider>
  );
}