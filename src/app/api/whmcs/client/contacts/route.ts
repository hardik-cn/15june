// src/app/api/whmcs/client/contacts/route.ts
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { getWhmcsContacts } from "@/lib/whmcs/client/contacts/getContacts";
import { addWhmcsContact } from "@/lib/whmcs/client/contacts/addContact";
import { updateWhmcsContact } from "@/lib/whmcs/client/contacts/updateContact";
import { deleteWhmcsContact } from "@/lib/whmcs/client/contacts/deleteContact";

// ─────────────────────────────────────────────────────────────────────────────
// Shared validation helper
// ─────────────────────────────────────────────────────────────────────────────
function validateContactFields(fields: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
}): string | null {
    const { firstName, lastName, email, phone } = fields;

    if (!firstName?.trim()) return "First name is required.";
    if (firstName.trim().length < 2) return "First name must be at least 2 characters.";

    if (!lastName?.trim()) return "Last name is required.";
    if (lastName.trim().length < 2) return "Last name must be at least 2 characters.";

    if (!email?.trim()) return "Email address is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Please enter a valid email address.";

    // Phone is optional, but if provided must be digits (with optional leading country code)
    if (phone && phone.trim()) {
        // Strip any leading country code (e.g. "+91 ") before validating digit length
        const digitsOnly = phone.trim().replace(/^\+\d{1,4}\s*/, "");
        if (digitsOnly && !/^\d{6,15}$/.test(digitsOnly)) {
            return "Phone number must be 6–15 digits.";
        }
    }

    return null;
}

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

        const body = await req.json();

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
        } = body;

        // Backend validation
        const validationError = validateContactFields({ firstName, lastName, email, phone });
        if (validationError) {
            return NextResponse.json(
                { error: validationError },
                { status: 400 }
            );
        }

        const result = await addWhmcsContact({
            clientId: user.whmcsClientId,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
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

        const body = await req.json();

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
        } = body;

        if (!contactId) {
            return NextResponse.json(
                { error: "contactId is required." },
                { status: 400 }
            );
        }

        // Backend validation
        const validationError = validateContactFields({ firstName, lastName, email, phone });
        if (validationError) {
            return NextResponse.json(
                { error: validationError },
                { status: 400 }
            );
        }

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

        const body = await req.json();
        const { contactId } = body;

        if (!contactId) {
            return NextResponse.json(
                { error: "contactId is required" },
                { status: 400 }
            );
        }

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