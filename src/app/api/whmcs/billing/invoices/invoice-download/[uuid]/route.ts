// src/app/api/whmcs/billing/invoices/invoice-download/[uuid]/route.ts
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { createSsoToken } from "@/lib/whmcs/billing/createSsoToken";
import { getWhmcsInvoice } from "@/lib/whmcs/billing/getinvoices";
import { getInvoiceIdFromUuid } from "@/lib/whmcs/billing/invoiceMapper";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ uuid: string }> }
) {
    try {
        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { uuid } = await params;

        if (!uuid) {
            return NextResponse.json(
                { error: "Invoice UUID is required" },
                { status: 400 }
            );
        }

        const whmcsClientId =
            (user as any)?.whmcsClientId;

        if (!whmcsClientId) {
            return NextResponse.json(
                { error: "WHMCS client id not linked" },
                { status: 400 }
            );
        }

        // Resolve WHMCS invoice ID from UUID
        const invoiceId = await getInvoiceIdFromUuid(uuid, String(user.id));

        // Verify invoice belongs to user
        const invoice = await getWhmcsInvoice(invoiceId);

        if (invoice.result !== "success") {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        if (String(invoice.userid) !== String(whmcsClientId)) {
            return NextResponse.json(
                { error: "Unauthorized access to this invoice" }, { status: 403 }
            );
        }

        // Create SSO Token
        const goto = `dl.php?type=i&id=${invoiceId}`;

        const ssoData = await createSsoToken(
            whmcsClientId,
            goto
        );

        if (ssoData.result !== "success") {
            return NextResponse.json(
                { error: "Failed to generate download token" },
                { status: 500 }
            );
        }

        const ssoUrl: string = ssoData.redirect_url;
        const baseUrl = new URL(ssoUrl).origin;
        const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

        try {
            // Step 1 — Establish SSO session
            let currentUrl = ssoUrl;
            const cookieMap = new Map<string, string>();

            let redirectCount = 0;

            while (redirectCount < 10) {
                const cookieHeader = Array.from(cookieMap.entries())
                    .map(([k, v]) => `${k}=${v}`)
                    .join("; ");

                const res = await fetch(
                    currentUrl,
                    {
                        method: "GET",
                        redirect: "manual",
                        headers: {
                            "User-Agent": userAgent,
                            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
                        },
                    }
                );

                const setCookieHeader =
                    res.headers.get("set-cookie");

                if (setCookieHeader) {
                    setCookieHeader.split(/,(?=[^;]*=)/).forEach((c) => {
                        const firstPart = c.split(";")[0].trim();
                        const eqIdx = firstPart.indexOf("=");
                        if (eqIdx !== -1) {
                            cookieMap.set(
                                firstPart.substring(0, eqIdx),
                                firstPart.substring(eqIdx + 1)
                            );
                        }
                    });
                }

                if (res.status >= 300 && res.status < 400) {
                    const location = res.headers.get("location");
                    if (!location) break;
                    currentUrl = location.startsWith("http") ? location : new URL(location, currentUrl).toString();
                    redirectCount++;
                    continue;
                }
                break;
            }

            // Step 2 — Download actual PDF
            const downloadUrl = `${baseUrl}/dl.php?type=i&id=${invoiceId}`;
            const cookieHeader = Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`).join("; ");

            const dlRes = await fetch(
                downloadUrl,
                {
                    method: "GET",
                    redirect: "follow",
                    headers: {
                        "User-Agent": userAgent,
                        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
                    },
                }
            );

            if (!dlRes.ok) {
                throw new Error(`dl.php responded with ${dlRes.status}`);
            }

            const contentType = dlRes.headers.get("Content-Type") || "application/pdf";

            if (contentType.includes("text/html")) {
                return NextResponse.json(
                    { error: "WHMCS returned HTML instead of PDF" },
                    { status: 500 }
                );
            }

            const buffer = await dlRes.arrayBuffer();

            return new NextResponse(
                buffer,
                {
                    status: 200,
                    headers: {
                        "Content-Type": contentType,
                        "Content-Disposition": `attachment; filename="invoice-${invoiceId}.pdf"`,
                        "Cache-Control": "no-cache",
                    },
                }
            );

        } catch (proxyError) {
            console.error("Proxy download error:", proxyError);

            return NextResponse.json(
                { error: "Failed to proxy download" },
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error("Invoice download error:", error);

        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}