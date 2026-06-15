// src/app/admin/kyc/rejected/page.tsx
import { format } from "path";
import AdminDashboardWrapper from "../../components/AdminDashboardWrapper";
import RejectedKYCClient from "./RejectedKYCClient";

export const dynamic = "force-dynamic";

export default async function RejectedKYCPage() {
    return (
        <AdminDashboardWrapper requireModule="kyc_rejected">
            <RejectedKYCClient />
        </AdminDashboardWrapper>
    );
}