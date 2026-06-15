// src/app/admin/kyc/approved/page.tsx

import AdminDashboardWrapper from "../../components/AdminDashboardWrapper";
import ApprovedKYCClient from "./ApprovedKYCClient";

export const dynamic = "force-dynamic";

export default async function ApprovedKYCPage() {
    return (
        <AdminDashboardWrapper requireModule="kyc_approved">
            <ApprovedKYCClient />
        </AdminDashboardWrapper>
    );
}
