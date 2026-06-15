// lib/didit.ts
//
// Helpers for the Didit verification Sessions API

const DIDIT_API_BASE = "https://verification.didit.me";
const DIDIT_API_KEY = process.env.DIDIT_API_KEY!;
const DIDIT_WORKFLOW_ID = process.env.DIDIT_WORKFLOW_ID!;

// ── Types ────────────────────────────────────────────────────────────────────

export interface CreateDiditSessionParams {
    vendorData?: string;
    /** Absolute URL that Didit will redirect the user to after verification */
    callbackPath: string;
    email?: string;
    /** Pass the full name entered by the user – we split it for Didit */
    expectedDetails?: {
        /** Full name exactly as entered by the user */
        name?: string;
        dateOfBirth?: string;
        nationality?: string;
    };
    /** Pre-fill user's first name in the Didit flow */
    firstName?: string;
    /** Pre-fill user's last name in the Didit flow */
    lastName?: string;
}

export interface DiditSessionResponse {
    session_id: string;
    session_number: number;
    session_token: string;
    vendor_data: string;
    status: string;
    workflow_id: string;
    callback: string;
    url: string;
}

export interface ParsedAddress {
    streetAddress: string | null;
    streetAddress2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Split a full name string into first + last name parts.
 * e.g. "John Michael Smith" → { firstName: "John", lastName: "Michael Smith" }
 */
function splitFullName(fullName: string): { firstName: string; lastName: string } {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
        return { firstName: parts[0], lastName: "" };
    }
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ");
    return { firstName, lastName };
}

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * Create a new Didit verification session.
 * Returns the raw Didit response including the `url` to open for the user.
 */
export async function createDiditSession(
    params: CreateDiditSessionParams
): Promise<DiditSessionResponse> {
    const {
        vendorData,
        callbackPath,
        email,
        firstName,
        lastName,
        expectedDetails,
    } = params;

    // Build the absolute callback URL
    const appBaseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_URL ||
        "https://app.cantech.network";
    const callbackUrl = callbackPath.startsWith("http")
        ? callbackPath
        : `${appBaseUrl}${callbackPath}`;

    // Resolve expected first/last name
    // Priority: explicitly passed firstName/lastName → split from expectedDetails.name
    let expFirstName = firstName ?? "";
    let expLastName = lastName ?? "";

    if ((!expFirstName || !expLastName) && expectedDetails?.name) {
        const split = splitFullName(expectedDetails.name);
        expFirstName = expFirstName || split.firstName;
        expLastName = expLastName || split.lastName;
    }

    const body: Record<string, unknown> = {
        workflow_id: DIDIT_WORKFLOW_ID,
        callback: callbackUrl,
        // Use "both" so the callback fires on whichever device completes the flow
        callback_method: "both",
        vendor_data: vendorData,
        language: "en",
    };

    // Contact details (pre-fill + notifications)
    if (email) {
        body.contact_details = {
            email,
            send_notification_emails: false,
        };
    }

    // Expected details for name-match cross-validation
    if (expFirstName || expLastName || expectedDetails?.dateOfBirth || expectedDetails?.nationality) {
        body.expected_details = {
            ...(expFirstName ? { first_name: expFirstName } : {}),
            ...(expLastName ? { last_name: expLastName } : {}),
            ...(expectedDetails?.dateOfBirth ? { date_of_birth: expectedDetails.dateOfBirth } : {}),
            ...(expectedDetails?.nationality ? { nationality: expectedDetails.nationality } : {}),
        };
    }

    const res = await fetch(`${DIDIT_API_BASE}/v3/session/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": DIDIT_API_KEY,
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Didit createSession failed (${res.status}): ${err}`);
    }

    return res.json() as Promise<DiditSessionResponse>;
}

/**
 * Retrieve full verification decision for a session from Didit.
 * Uses GET /v3/session/{sessionId}/decision/
 */
export async function getDiditSession(sessionId: string): Promise<any> {
    const res = await fetch(
        `${DIDIT_API_BASE}/v3/session/${sessionId}/decision/`,
        {
            method: "GET",
            headers: {
                "x-api-key": DIDIT_API_KEY,
            },
        }
    );

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Didit getSession failed (${res.status}): ${err}`);
    }

    return res.json();
}

/**
 * Extract a normalised address from the full Didit decision response.
 *
 * Didit stores address in `id_verifications[0].parsed_address` with fields:
 *   street_1, street_2, city, region, country, postal_code
 *
 * Falls back to POA parsed_address if ID verification address is empty.
 */
export function extractAddressFromDiditResult(result: any): ParsedAddress {
    // Try ID verification parsed address first
    const idVerif = result?.id_verifications?.[0];
    const parsedAddr = idVerif?.parsed_address;

    if (parsedAddr?.street_1) {
        return {
            streetAddress: parsedAddr.street_1 ?? null,
            streetAddress2: parsedAddr.street_2 ?? null,
            city: parsedAddr.city ?? null,
            state: parsedAddr.region ?? null,
            postalCode: parsedAddr.postal_code ?? null,
            country: parsedAddr.country ?? null,
        };
    }

    // Fallback: raw address string from the document
    if (idVerif?.address) {
        return {
            streetAddress: idVerif.address,
            streetAddress2: null,
            city: null,
            state: null,
            postalCode: null,
            country: null,
        };
    }

    // Fallback: POA (Proof of Address) parsed address
    const poaAddr = result?.poa_verifications?.[0]?.poa_parsed_address;
    if (poaAddr) {
        return {
            streetAddress: poaAddr.street_1 ?? null,
            streetAddress2: poaAddr.street_2 ?? null,
            city: poaAddr.city ?? null,
            state: poaAddr.region ?? null,
            postalCode: poaAddr.postal_code ?? null,
            country: poaAddr.country ?? null,
        };
    }

    return {
        streetAddress: null,
        streetAddress2: null,
        city: null,
        state: null,
        postalCode: null,
        country: null,
    };
}

/**
 * Delete a Didit session permanently.
 * Uses DELETE /v3/session/{sessionId}/delete/
 * Called when the user closes the popup before completing verification.
 */
export async function deleteDiditSession(sessionId: string): Promise<void> {
    const res = await fetch(
        `${DIDIT_API_BASE}/v3/session/${sessionId}/delete/`,
        {
            method: "DELETE",
            headers: {
                "x-api-key": DIDIT_API_KEY,
            },
        }
    );

    // 204 No Content is the success response; anything else is an error
    if (!res.ok && res.status !== 204) {
        const err = await res.text().catch(() => "");
        throw new Error(`Didit deleteSession failed (${res.status}): ${err}`);
    }
}

export async function getDiditSessionData(sessionId: string) {
    if (!sessionId) return null;

    try {
        const response = await fetch(`${DIDIT_API_BASE}/v3/session/${sessionId}/decision/`, {
            method: 'GET',
            headers: {
                'x-api-key': DIDIT_API_KEY,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("Didit API Error:", error);
            return null;
        }

        return await response.json();
    } catch (error) {
    }
}

export async function updateDiditSessionStatus(sessionId: string, status: string) {
    if (!sessionId) return false;

    try {
        const response = await fetch(`${DIDIT_API_BASE}/v3/session/${sessionId}/update-status/`, {
            method: 'PATCH',
            headers: {
                'x-api-key': DIDIT_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ new_status: status })
        });

        if (!response.ok) {
            const error = await response.text().catch(() => "");
            console.error("Didit update-status API Error:", response.status, error);
            return false;
        }

        return true;
    } catch (error) {
        return false;
    }
}