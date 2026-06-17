// src/app/api/whmcs/tickets/open/route.ts
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { openWhmcsTicket } from "@/lib/whmcs/support/openTicket";
import { z } from "zod";

const openTicketSchema = z.object({
    deptid: z.string().min(1, "Department is required"),
    subject: z.string().trim().min(1, "Subject is required"),
    message: z.string().trim().min(1, "Message is required"),
    priority: z.string().default("Medium"),
    serviceid: z.string().min(1, "Service is required"),
});

function phpSerialize(obj: Record<string, any>): string {
    const entries = Object.entries(obj);

    let serialized = `a:${entries.length}:{`;

    for (const [key, value] of entries) {
        const stringKey = String(key);
        const stringValue = String(value);

        serialized += `s:${stringKey.length}:"${stringKey}";`;
        serialized += `s:${stringValue.length}:"${stringValue}";`;
    }

    serialized += "}";

    return serialized;
}

export async function POST(req: Request) {
    try {
        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const whmcsClientId = user.whmcsClientId;

        if (!whmcsClientId) {
            return NextResponse.json(
                { error: "No WHMCS client linked" },
                { status: 404 }
            );
        }

        const formData = await req.formData();

        const rawDeptId = formData.get("deptid")?.toString();
        const rawSubject = formData.get("subject")?.toString();
        const rawMessage = formData.get("message")?.toString();
        const rawPriority = formData.get("priority")?.toString() || "Medium";
        const rawServiceId = formData.get("serviceid")?.toString();

        // ---------- Service Config Options ----------
        const serviceConfigOptionsRaw = formData.get("serviceConfigOptions")?.toString();
        const serviceConfigOptions = serviceConfigOptionsRaw ? JSON.parse(serviceConfigOptionsRaw) : [];

        // ---------- Custom Fields ----------
        const customfieldsRaw = formData.get("customfields")?.toString();
        const customFieldDefinitionsRaw = formData.get("customFieldDefinitions")?.toString();
        const customfieldsData = customfieldsRaw ? JSON.parse(customfieldsRaw) : {};
        const customFieldDefinitions = customFieldDefinitionsRaw ? JSON.parse(customFieldDefinitionsRaw) : [];

        // Validate required fields with Zod
        const parsed = openTicketSchema.safeParse({
            deptid: rawDeptId,
            subject: rawSubject,
            message: rawMessage,
            priority: rawPriority,
            serviceid: rawServiceId,
        });


        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0].message },
                { status: 400 }
            );
        }

        const {
            deptid,
            subject,
            message,
            priority,
            serviceid,
        } = parsed.data;

        for (const field of customFieldDefinitions) {
            const isRequired = field.required === "on";

            if (isRequired) {
                const key = `field_${field.id}`;
                const value = customfieldsData[key];

                if (!value || String(value).trim() === "") {
                    return NextResponse.json(
                        {
                            error: `${field.fieldname} is required`
                        },
                        { status: 400 }
                    );
                }
            }
        }

        // Handle file uploads
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
        const maxFileSize = 5 * 1024 * 1024; // 5MB
        const attachments: { name: string; data: string }[] = [];

        const files = formData.getAll("attachments") as File[];
        for (const file of files) {
            // Validation
            const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
            if (!allowedExtensions.includes(ext)) {
                return NextResponse.json(
                    { error: `Invalid file type: ${file.name}. Allowed types: ${allowedExtensions.join(', ')}` },
                    { status: 400 }
                );
            }
            if (file.size > maxFileSize) {
                return NextResponse.json(
                    { error: `File too large: ${file.name}. Max size is 5MB` },
                    { status: 400 }
                );
            }

            // Convert to base64
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64Data = buffer.toString("base64");
            attachments.push({ name: file.name, data: base64Data });
        }

        const attachmentsBase64 = Buffer.from(JSON.stringify(attachments)).toString("base64");

        const formattedCustomFields: Record<string, any> = {};

        for (const key in customfieldsData) {
            if (key.startsWith("field_")) {
                const fieldId = key.replace("field_", "");
                formattedCustomFields[fieldId] = customfieldsData[key];
            }
        }

        const serialized = phpSerialize(formattedCustomFields);
        const customfieldsBase64 = Buffer.from(serialized).toString("base64");

        let formattedMessage = message.trim();

        // ---------- Custom Fields ----------
        if (Object.keys(formattedCustomFields).length > 0) {
            formattedMessage += "\n\n---\n\n";

            for (const field of customFieldDefinitions) {
                const key = `field_${field.id}`;
                const value = customfieldsData[key];

                if (value) {
                    formattedMessage += `${field.fieldname}: ${value}\n`;
                }
            }
        }

        // ---------- Service Config Options ----------
        if (serviceConfigOptions.length > 0) {
            formattedMessage += "\n\nService Configuration:\n";

            for (const option of serviceConfigOptions) {
                formattedMessage += `${option.option}: ${option.value}\n`;
            }
        }

        const data = await openWhmcsTicket({
            deptid: Number(deptid),
            subject: subject.trim(),
            message: formattedMessage,
            clientid: whmcsClientId,
            priority,
            serviceid: serviceid && serviceid !== "none" ? Number(serviceid) : undefined,
            markdown: true,
            attachments: attachmentsBase64,
            customfields: customfieldsBase64,
        });

        if (data.result !== "success") {
            return NextResponse.json(
                { error: data.message || "Failed to create ticket" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            id: data.id,
            tid: data.tid,
            c: data.c,
        });

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
