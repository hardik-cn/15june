// app/api/verify/didit/callback/route.ts
//
// Didit redirects the user's browser here after verification with:
//   GET ?verificationSessionId=<id>&status=Approved|Declined|In+Review
//
// Didit also calls this as a webhook POST (JSON body) so the DB record
// stays in sync even if the popup postMessage doesn't fire.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDiditSession, extractAddressFromDiditResult } from "@/lib/didit";
import { verifyDiditSignature } from "@/lib/didit/verifySignature";

// ── Shared processing logic ───────────────────────────────────────────────────

async function processSession(sessionId: string) {
  const result = await getDiditSession(sessionId);

  // Extract document data from first ID verification (if present)
  const idVerif = result?.id_verifications?.[0] ?? {};
  const address = extractAddressFromDiditResult(result);

  const sessionStatus: string = result.status ?? "Not Started";

  const isVerified =
    sessionStatus === "Approved" || sessionStatus === "In Review";

  await db.diditSession.updateMany({
    where: { sessionId },
    data: {
      status: sessionStatus,
      // Document fields
      documentType: idVerif.document_type ?? null,
      documentNumber: idVerif.document_number ?? null,
      firstName: idVerif.first_name ?? null,
      lastName: idVerif.last_name ?? null,
      dateOfBirth: idVerif.date_of_birth
        ? new Date(idVerif.date_of_birth)
        : null,
      nationality: idVerif.nationality ?? null,
      // Address fields
      addressStreet: address.streetAddress ?? null,
      addressStreet2: address.streetAddress2 ?? null,
      addressCity: address.city ?? null,
      addressState: address.state ?? null,
      addressPostalCode: address.postalCode ?? null,
      addressCountry: address.country ?? null,
      // Raw response for audit
      rawDecisionResponse: result as any,
      ...(isVerified ? { approvedAt: new Date() } : {}),
    },
  });

  return { result, address, sessionStatus, isVerified };
}

// ── GET  ─ browser redirect from Didit popup ──────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("verificationSessionId");

  if (!sessionId) {
    return new NextResponse("Missing verificationSessionId", { status: 400 });
  }

  let sessionStatus = "Not Started";
  let isApproved = false;
  let address = {
    streetAddress: null as string | null,
    streetAddress2: null as string | null,
    city: null as string | null,
    state: null as string | null,
    postalCode: null as string | null,
    country: null as string | null,
  };

  try {
    const processed = await processSession(sessionId);
    sessionStatus = processed.sessionStatus;
    isApproved = processed.isVerified;
    address = processed.address;
  } catch (err) {
    // console.error("[didit/callback GET] processSession error:", err);
    // Still render the popup close page — don't leave the user stuck
  }

  // Build the address payload for the opener
  const addressPayload = {
    streetAddress: address.streetAddress,
    streetAddress2: address.streetAddress2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
  };

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Verification Complete</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center;
           justify-content: center; height: 100vh; margin: 0; }
    .msg { text-align: center; color: #555; }
  </style>
</head>
<body>
  <div class="msg">
    <p>Verification ${sessionStatus}. You can close this window.</p>
  </div>
  <script>
    var payload = {
      type: "DIDIT_SUCCESS",
      sessionId: ${JSON.stringify(sessionId)},
      status: ${JSON.stringify(sessionStatus)},
      isApproved: ${JSON.stringify(isApproved)}
    };
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(payload, window.location.origin);
      }
    } catch (e) {}
    setTimeout(function () { window.close(); }, 1500);
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

// ── POST  ─ webhook from Didit ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {

    const body = await req.json();

    // Verify Didit webhook signature
    const signature = req.headers.get("x-didit-signature");

    if (!verifyDiditSignature(signature, body)) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Didit may use either field name
    const sessionId: string | undefined =
      body?.session_id ?? body?.verificationSessionId;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing session_id" },
        { status: 400 }
      );
    }

    await processSession(sessionId);

    return NextResponse.json({ ok: true });

  } catch (err) {

    // console.error("[didit/callback POST]", err);

    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}