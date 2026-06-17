import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { callWhmcsApi } from "@/lib/whmcs";
import { z } from "zod";

const getTicketByTidSchema = z.object({
    tid: z.string().min(1, "Ticket number is required"),
    repliessort: z.enum(["ASC", "DESC"]).default("ASC"),
});

export async function GET(
    req: Request,
    { params }: { params: Promise<{ tid: string }> }
) {
    try {

        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        function parseAdditionalInformation(message: string) {
            const fields: {
                id: string;
                name: string;
                value: string;
            }[] = [];

            // Split lines
            const lines = message.split("\n");

            let index = 0;

            for (const line of lines) {
                // Match: Label: Value
                const match = line.match(/^(.+?):\s*(.+)$/);

                if (match) {
                    fields.push({
                        id: String(index++),
                        name: match[1].trim(),
                        value: match[2].trim(),
                    });
                }
            }

            return fields;
        }

        const { tid: routeTid } = await params;

        const { searchParams } = new URL(req.url);
        const repliessortParam = searchParams.get("repliessort") || undefined;


        const parsed = getTicketByTidSchema.safeParse({
            tid: routeTid,
            repliessort: repliessortParam,
        });

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid parameters", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { tid, repliessort } = parsed.data;

        // =========================
        // Get Ticket
        // =========================

        const data = await callWhmcsApi("GetTicket", {
            ticketnum: tid,
            repliessort,
        });

        // =========================
        // Normalize Replies
        // =========================

        let replies: any[] = [];

        if (data.replies?.reply) {
            replies = Array.isArray(data.replies.reply)
                ? data.replies.reply
                : [data.replies.reply];
        }

        // =========================
        // Normalize Notes
        // =========================

        let notes: any[] = [];

        if (data.notes?.note) {
            notes = Array.isArray(data.notes.note)
                ? data.notes.note
                : [data.notes.note];
        }

        // =========================
        // Normalize Ticket Custom Field Values
        // =========================

        let ticketCustomFields: any[] = [];

        if (data.customfields?.customfield) {
            ticketCustomFields = Array.isArray(
                data.customfields.customfield
            )
                ? data.customfields.customfield
                : [data.customfields.customfield];
        }

        // =========================
        // Fetch Department Field Definitions
        // =========================

        let mergedCustomFields: any[] = [];

        try {
            const customFieldRes = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/whmcs/tickets/customfields?department_id=${data.deptid}`,
                {
                    headers: {
                        Authorization: req.headers.get("authorization") || "",
                        Cookie: req.headers.get("cookie") || "",
                    },
                    cache: "no-store",
                }
            );

            const customFieldData = await customFieldRes.json();

            const departmentFields =
                customFieldData.fields || [];

            // Merge names + values
            mergedCustomFields = departmentFields.map(
                (field: any) => {
                    const ticketValue =
                        ticketCustomFields.find(
                            (f: any) =>
                                String(f.id) === String(field.id)
                        );

                    let val = ticketValue?.value || "";

                    // Whitelisted parsing: If the API doesn't return a value directly, 
                    // extract it from the first reply message using the official fieldname definition
                    if (!val) {
                        const firstMessage = replies?.[0]?.message || "";
                        const escapedName = (field.fieldname || "").replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
                        const regex = new RegExp(`^${escapedName}:\\s*(.+)$`, "m");
                        const match = firstMessage.match(regex);
                        if (match) {
                            val = match[1].trim();
                        }
                    }

                    return {
                        id: field.id,
                        name: field.fieldname || field.name || "",
                        value: val,
                    };
                }
            ).filter((field: any) => {
                const val = field.value?.trim();
                return val && val !== "" && val.toLowerCase() !== "n/a";
            });
        } catch (err) {
            console.error(
                "Custom field merge error:",
                err
            );
        }

        return NextResponse.json({
            ticketid: data.ticketid,
            tid: data.tid,
            c: data.c,
            deptid: data.deptid,
            deptname: data.deptname,
            userid: data.userid,
            name: data.name,
            email: data.email,
            requestor_name: data.requestor_name,
            requestor_type: data.requestor_type,
            requestor_email: data.requestor_email,
            cc: data.cc,
            date: data.date,
            subject: data.subject,
            status: data.status,
            priority: data.priority,
            admin: data.admin,
            lastreply: data.lastreply,
            flag: data.flag,
            service: data.service,
            replies,
            notes,

            // Final merged fields - only show official customfields
            customfields: mergedCustomFields,
        });

    } catch (error: any) {
        console.error(
            "GET /api/whmcs/tickets/by-tid/[tid] error:",
            error
        );

        return NextResponse.json(
            {
                error:
                    error.message ||
                    "Internal Server Error",
            },
            { status: 500 }
        );
    }
}