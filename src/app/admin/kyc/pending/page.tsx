// src/app/admin/kyc/pending/page.tsx

import AdminDashboardWrapper from "../../components/AdminDashboardWrapper";
import PendingKYCClient from "./PendingKYCClient";

export const dynamic = "force-dynamic";

export default async function PendingKYCPage() {
    return (
        <AdminDashboardWrapper requireModule="kyc_pending">
            <PendingKYCClient />
        </AdminDashboardWrapper>
    );
}