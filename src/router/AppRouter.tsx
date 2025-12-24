import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "../View/layout/MainLayout";

import AdvancedSearchPage from "../View/advancedSearch/AdvancedSearchPage";


export default function AppRouter(){
    return(
        <Routes>
            <Route element = {<MainLayout />}>
            {/* 기본 진입 */}
            <Route path= "/" element={<Navigate to="/advanced-search" replace />}/>

            <Route path="/advanced-search" element={<AdvancedSearchPage />} />

            {/* 404 */}
             <Route path="*" element={<h1>Not Found</h1>} />
     
            </Route>
        </Routes>
    );
}