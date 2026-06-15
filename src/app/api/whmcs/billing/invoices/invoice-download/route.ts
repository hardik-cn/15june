import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { createSsoToken } from "@/lib/whmcs/billing/createSsoToken";
import { getWhmcsInvoice } from "@/lib/whmcs/billing/getinvoices";

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const invoiceId = searchParams.get("id");

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    const whmcsClientId = (user as any)?.whmcsClientId;

    if (!whmcsClientId) {
      return NextResponse.json(
        { error: "WHMCS client id not linked" },
        { status: 400 }
      );
    }

    // Security check: Verify the invoice belongs to the user
    const invoice = await getWhmcsInvoice(invoiceId);

    if (invoice.result !== "success") {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    if (String(invoice.userid) !== String(whmcsClientId)) {
      return NextResponse.json(
        { error: "Unauthorized access to this invoice" },
        { status: 403 }
      );
    }
    // Create SSO Token
    const goto = `dl.php?type=i&id=${invoiceId}`;
    const ssoData = await createSsoToken(whmcsClientId, goto);

    if (ssoData.result !== "success") {
      return NextResponse.json(
        { error: "Failed to generate download token" },
        { status: 500 }
      );
    }

    const ssoUrl = ssoData.redirect_url;

    // Proxy the download to hide the WHMCS URL and trigger direct download
    try {
      // console.log(`Starting proxy download for invoice ${invoiceId}. SSO URL: ${ssoUrl}`);

      let currentUrl = ssoUrl;
      let cookieMap = new Map<string, string>();
      let redirectCount = 0;
      let finalRes: Response | null = null;

      const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

      while (redirectCount < 10) {
        const cookieHeader = Array.from(cookieMap.entries())
          .map(([k, v]) => `${k}=${v}`)
          .join('; ');

        // console.log(`Proxy Step ${redirectCount + 1}: Fetching ${currentUrl}`);

        const res = await fetch(currentUrl, {
          method: 'GET',
          redirect: 'manual',
          headers: {
            'User-Agent': userAgent,
            ...(cookieHeader ? { 'Cookie': cookieHeader } : {})
          }
        });

        const setCookieHeader = res.headers.get('set-cookie');
        if (setCookieHeader) {
          const rawCookies = setCookieHeader.split(/,(?=[^;]*=)/);
          rawCookies.forEach(c => {
            const firstPart = c.split(';')[0].trim();
            const eqIdx = firstPart.indexOf('=');
            if (eqIdx !== -1) {
              const key = firstPart.substring(0, eqIdx);
              const value = firstPart.substring(eqIdx + 1);
              cookieMap.set(key, value);
            }
          });
        }

        if (res.status >= 300 && res.status < 400) {
          const location = res.headers.get('location');
          if (!location) break;

          const nextUrl = location.startsWith('http') ? location : new URL(location, currentUrl).toString();
          // console.log(`Proxy Step ${redirectCount + 1}: Redirecting to ${nextUrl}`);
          currentUrl = nextUrl;
          redirectCount++;
          continue;
        }

        finalRes = res;
        break;
      }

      if (!finalRes || !finalRes.ok) {
        // console.error("WHMCS Proxy Final Response NOT OK:", finalRes?.status, finalRes?.statusText);
        throw new Error(`Failed to fetch PDF from WHMCS: ${finalRes?.statusText || 'Unknown error'}`);
      }

      const contentType = finalRes.headers.get("Content-Type") || "application/pdf";
      // console.log("WHMCS Proxy Success:", {
      //     finalUrl: finalRes.url,
      //     status: finalRes.status,
      //     contentType: contentType
      // });

      // If the content type is HTML, it means the SSO failed or redirected to a login/error page
      if (contentType.includes("text/html")) {
        const text = await finalRes.text();
        // console.error("WHMCS Proxy returned HTML instead of PDF. First 200 chars:", text.substring(0, 200));
        return NextResponse.json(
          { error: "WHMCS returned an HTML page instead of a PDF." },
          { status: 500 }
        );
      }

      const buffer = await finalRes.arrayBuffer();

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="invoice-${invoiceId}.pdf"`,
          "Cache-Control": "no-cache",
        },
      });

    } catch (proxyError) {
      console.error("Proxy download error:", proxyError);
      return NextResponse.json({ error: "Failed to proxy download" }, { status: 500 });
    }

  } catch (error: any) {
    console.error("GET /api/whmcs/billing/invoices/invoice-download error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
