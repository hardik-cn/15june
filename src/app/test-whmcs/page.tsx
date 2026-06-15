// src/app/test-whmcs/page.tsx

"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { TicketAdditionalInfoTab } from "@/app/support/ticket/[tid]/components/TicketAdditionalInfoTab"

export default function TestWhmcsPage() {
    const [ticket, setTicket] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadCustomFields() {
            try {
                const res = await apiFetch(
                    `${process.env.NEXT_PUBLIC_APP_URL}/api/whmcs/tickets/customfields?department_id=1`
                );

                const json = await res.json();

                console.log(json);

                setTicket({
                    customfields: (json.fields || []).map((field: any) => ({
                        id: field.id,
                        name: field.name,
                        value: field.description || "",
                    })),
                });
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        loadCustomFields();
    }, []);

    if (loading) {
        return <div className="p-10">Loading...</div>;
    }

    return (
        <div className="p-10 max-w-4xl">
            <TicketAdditionalInfoTab ticket={ticket} />
        </div>
    );
}