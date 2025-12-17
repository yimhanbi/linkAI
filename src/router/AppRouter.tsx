import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "../View/layout/MainLayout";
import IPManagerLayout from "../View/layout/IPManagerLayout";

import AdvancedSearchPage from "../View/advancedSearch/AdvancedSearchPage";
import AnnualFeeCalendarPage from "../View/ipManager/calendar/AnnualFeeCalendarPage";
import AnnualFeeRequestPage from "../View/ipManager/paymentRequest/AnnualFeeRequestPage";
import MaintenanceTargetPage from "../View/ipManager/maintenance/MaintenanceTargetPage";
import AbandonmentTargetPage from "../View/ipManager/abandonment/AbandonmentTargetPage";


export default function AppRouter(){
    return(
        <Routes>
            <Route element = {<MainLayout />}>
            {/* 기본 진입 */}
            <Route path= "/" element={<Navigate to="/advanced-search" replace />}/>

            <Route path="/advanced-search" element={<AdvancedSearchPage />} />

             <Route path="/ip-manager" element={<IPManagerLayout />}>
             <Route path = "" element={<Navigate to = "calendar" replace />}/>
             <Route path="calendar" element={<AnnualFeeRequestPage />}/>
             <Route path="payment-request" element ={<AnnualFeeCalendarPage /> } />
             <Route path="maintenance" element = {<MaintenanceTargetPage />}/>
             <Route path="abandonment" element = {<AbandonmentTargetPage/>}/>
             
             </Route>

            {/* 404 */}
             <Route path="*" element={<h1>Not Found</h1>} />
     
            </Route>
        </Routes>
    );
}