// src/app/api/whmcs/client/contacts/route.ts
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { getWhmcsContacts } from "@/lib/whmcs/client/contacts/getContacts";
import { addWhmcsContact } from "@/lib/whmcs/client/contacts/addContact";
import { updateWhmcsContact } from "@/lib/whmcs/client/contacts/updateContact";
import { deleteWhmcsContact } from "@/lib/whmcs/client/contacts/deleteContact";
import { z } from "zod";

const contactFieldsSchema = z.object({
    firstName: z.string().trim().min(1, "First name is required.").min(2, "First name must be at least 2 characters."),
    lastName: z.string().trim().min(1, "Last name is required.").min(2, "Last name must be at least 2 characters."),
    email: z.string().trim().min(1, "Email address is required.").email("Please enter a valid email address."),
    phone: z.string().optional().nullable().refine((val) => {
        if (!val || !val.trim()) return true;
        const digitsOnly = val.trim().replace(/^\+\d{1,4}\s*/, "");
        return /^\d{6,15}$/.test(digitsOnly);
    }, { message: "Phone number must be 6–15 digits." }),
    companyName: z.string().optional().nullable(),
    address1: z.string().optional().nullable(),
    address2: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    postcode: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    generalEmails: z.any().optional(),
    invoiceEmails: z.any().optional(),
    supportEmails: z.any().optional(),
    productEmails: z.any().optional(),
    domainEmails: z.any().optional(),
    affiliateEmails: z.any().optional(),
});

const putContactSchema = contactFieldsSchema.extend({
    contactId: z.union([z.string(), z.number()]).transform((val) => Number(val)),
});

const deleteContactSchema = z.object({
    contactId: z.union([z.string(), z.number()]).transform((val) => Number(val)),
});

// ─────────────────────────────────────────────────────────────────────────────
// GET — fetch all contacts for the authenticated user
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
    try {
        const user = await getUserFromRequest(req);

        if (!user || !user.whmcsClientId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const contacts = await getWhmcsContacts(user.whmcsClientId);

        return NextResponse.json({ contacts });

    } catch (error: any) {
        console.error("Error fetching WHMCS contacts:", error);

        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — add a new contact
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
    try {
        const user = await getUserFromRequest(req);

        if (!user || !user.whmcsClientId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
        }

        const parsed = contactFieldsSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0].message },
                { status: 400 }
            );
        }

        const {
            firstName,
            lastName,
            email,
            companyName,
            address1,
            address2,
            city,
            state,
            postcode,
            country,
            phone,
            generalEmails,
            invoiceEmails,
            supportEmails,
            productEmails,
            domainEmails,
            affiliateEmails,
        } = parsed.data;

        const result = await addWhmcsContact({
            clientId: user.whmcsClientId,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            companyName: companyName ?? undefined,
            address1: address1 ?? undefined,
            address2: address2 ?? undefined,
            city: city ?? undefined,
            state: state ?? undefined,
            postcode: postcode ?? undefined,
            country: country ?? undefined,
            phone: phone ?? undefined,
            generalEmails,
            invoiceEmails,
            supportEmails,
            productEmails,
            domainEmails,
            affiliateEmails,
        });

        return NextResponse.json({
            success: true,
            contactId: result.contactId,
        });

    } catch (error: any) {
        console.error("Error adding WHMCS contact:", error);

        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT — update an existing contact
// ─────────────────────────────────────────────────────────────────────────────
export async function PUT(req: Request) {
    try {
        const user = await getUserFromRequest(req);

        if (!user || !user.whmcsClientId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
        }

        const parsed = putContactSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0].message },
                { status: 400 }
            );
        }

        const {
            contactId,
            firstName,
            lastName,
            email,
            companyName,
            address1,
            address2,
            city,
            state,
            postcode,
            country,
            phone,
            generalEmails,
            invoiceEmails,
            supportEmails,
            productEmails,
            domainEmails,
            affiliateEmails,
        } = parsed.data;

        // Verify the contact belongs to this client
        const existingContacts = await getWhmcsContacts(user.whmcsClientId);
        const contactBelongsToClient = existingContacts.some(
            (c: any) => c.id === Number(contactId)
        );

        if (!contactBelongsToClient) {
            return NextResponse.json(
                { error: "Contact not found for this client." },
                { status: 403 }
            );
        }

        await updateWhmcsContact({
            contactId: Number(contactId),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),

            companyName: companyName ?? undefined,
            address1: address1 ?? undefined,
            address2: address2 ?? undefined,
            city: city ?? undefined,
            state: state ?? undefined,
            postcode: postcode ?? undefined,
            country: country ?? undefined,
            phone: phone ?? undefined,

            generalEmails,
            invoiceEmails,
            supportEmails,
            productEmails,
            domainEmails,
            affiliateEmails,
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Error updating WHMCS contact:", error);

        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE — delete an existing contact
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: Request) {
    try {
        const user = await getUserFromRequest(req);

        if (!user || !user.whmcsClientId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
        }

        const parsed = deleteContactSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0].message },
                { status: 400 }
            );
        }

        const { contactId } = parsed.data;

        const contacts = await getWhmcsContacts(user.whmcsClientId);
        const exists = contacts.some((c: any) => c.id === Number(contactId));

        if (!exists) {
            return NextResponse.json(
                { error: "Contact not found" },
                { status: 404 }
            );
        }

        await deleteWhmcsContact(Number(contactId));

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}