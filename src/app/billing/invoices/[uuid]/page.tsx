// app/billing/invoices/[uuid]/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/app/components/dashboard/DashboardLayout";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { apiFetch } from "@/lib/apiFetch";
import { countryCodes } from "@/lib/countries";
import { getSessionCache, setSessionCache } from "@/lib/whmcs/billing/sessionCache";

const BOOTSTRAP_CACHE_KEY = "billing_bootstrap";

const BOOTSTRAP_CACHE_TIME = 1000 * 60 * 30; // 30 min

type ApiInvoice = {
  id: number;
  invoiceid: string;
  invoicenum?: string;
  userid?: number | string;
  date: string;
  duedate: string;
  datepaid?: string;
  subtotal?: string;
  credit?: string;
  tax?: string;
  tax2?: string;
  total: string;
  balance?: string;
  status: string;
  paymentmethod?: string;
  notes?: string;
  items?: {
    id: number | string;
    type?: string;
    relid?: number | string;
    description: string;
    amount: string;
    taxed?: number | string;
  }[];
  transactions?: {
    id: string;
    invoiceid?: string;
    gateway?: string;
    date?: string;
    transid?: string;
    amountin?: string;
  }[];
};

type ClientDetails = {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  currencyCode?: string;
  currencySymbol?: string;
  customfields1?: string;
};

type WhmcsInvoiceSettings = {
  CompanyName?: string;
  InvoicePayTo?: string;
};

function formatDmy(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDmyFromDateTime(dateStr?: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isTruthyAmount(v?: string) {
  if (!v) return false;
  const cleaned = v.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n);
}

function splitDescription(description: string) {
  const raw = description?.trim() || "";
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length >= 2) {
    const title = lines[0];
    const details: Array<{ k: string; v: string }> = [];

    for (const line of lines.slice(1)) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      if (!k || !v) continue;
      details.push({ k, v });
    }

    return { title, details };
  }

  const normalized = raw.replace(/\s+/g, " ").trim();
  if (!normalized.includes(":")) {
    return { title: raw, details: [] as Array<{ k: string; v: string }> };
  }

  const segments = normalized.split(/\s+(?=[A-Za-z][A-Za-z0-9\s()\-–._/]+:)/g);
  const titleParts: string[] = [];
  const details: Array<{ k: string; v: string }> = [];

  for (const seg of segments) {
    const idx = seg.indexOf(":");
    if (idx === -1) {
      titleParts.push(seg);
      continue;
    }
    const k = seg.slice(0, idx).trim();
    const v = seg.slice(idx + 1).trim();
    if (!k || !v) {
      titleParts.push(seg);
      continue;
    }
    details.push({ k, v });
  }

  const title = titleParts.join(" ").trim() || raw;
  return { title, details };
}

function formatCurrency(amount: string, currency: string = "INR", locale: string = "en-IN") {
  const cleaned = amount.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return amount;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return amount;
  }
}

function formatDate(dateString?: string) {
  if (!dateString) return "-";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

function humanizeInvoiceItemType(type?: string) {
  const t = (type || "").trim();
  if (!t) return "-";

  const map: Record<string, string> = {
    Hosting: "Hosting",
    Domain: "Domain",
    Addon: "Addon",
    Upgrade: "Upgrade",
    "Late Fee": "Late Fee",
    Invoice: "Invoice",
    Item: "Item",
  };

  return map[t] || t;
}

function displayCountry(country?: string) {
  const c = (country || "").trim();
  if (!c) return "";

  const code = c.toUpperCase();
  const found = countryCodes.find((x) => x.iso.toUpperCase() === code);
  return found?.country || c;
}

function parseAmount(v?: string) {
  if (!v) return null;
  const cleaned = v.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function toWordsBelow100(n: number) {
  const ones = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ];
  const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o ? `${tens[t]} ${ones[o]}` : tens[t];
}

function toWordsWestern(n: number) {
  if (n === 0) return "zero";
  const parts: string[] = [];

  const billion = Math.floor(n / 1000000000);
  n %= 1000000000;
  const million = Math.floor(n / 1000000);
  n %= 1000000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = Math.floor(n / 100);
  n %= 100;

  if (billion) parts.push(`${toWordsBelow100(billion)} billion`);
  if (million) parts.push(`${toWordsBelow100(million)} million`);
  if (thousand) parts.push(`${toWordsBelow100(thousand)} thousand`);
  if (hundred) parts.push(`${toWordsBelow100(hundred)} hundred`);
  if (n) parts.push(toWordsBelow100(n));

  return parts.join(" ");
}

function toWordsIndian(n: number) {
  if (n === 0) return "zero";
  const parts: string[] = [];

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = Math.floor(n / 100);
  n %= 100;

  if (crore) parts.push(`${toWordsBelow100(crore)} crore`);
  if (lakh) parts.push(`${toWordsBelow100(lakh)} lakh`);
  if (thousand) parts.push(`${toWordsBelow100(thousand)} thousand`);
  if (hundred) parts.push(`${toWordsBelow100(hundred)} hundred`);
  if (n) parts.push(toWordsBelow100(n));

  return parts.join(" ");
}

function amountToWords(amountStr: string, currencyCode: string = "INR") {
  const n = parseAmount(amountStr);
  if (n === null) return "";
  const main = Math.floor(n);
  const fraction = Math.round((n - main) * 100);

  let mainWords = "";
  let fractionWords = "";
  let mainUnit = "";
  let fractionUnit = "";

  if (currencyCode === "INR") {
    mainWords = toWordsIndian(main);
    fractionWords = toWordsBelow100(fraction);
    mainUnit = main === 1 ? "rupee" : "rupees";
    fractionUnit = "paise";
  } else {
    mainWords = toWordsWestern(main);
    fractionWords = toWordsBelow100(fraction);
    mainUnit = main === 1 ? "dollar" : "dollars";
    fractionUnit = fraction === 1 ? "cent" : "cents";
  }

  const fractionPart = fraction ? ` ${fractionWords} ${fractionUnit}` : "";
  const finalStr = `${mainWords} ${mainUnit}${fractionPart} only`;
  return finalStr.charAt(0).toUpperCase() + finalStr.slice(1);
}

export default function InvoiceDetailsPage() {
  const router = useRouter();
  const params = useParams<{ uuid: string }>();

  const invoiceUuid = useMemo(() => {
    const uuid = params?.uuid;
    return typeof uuid === "string"
      ? uuid
      : "";
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<ApiInvoice | null>(null);
  const [clientDetails, setClientDetails] = useState<ClientDetails | null>(null);
  const [invoiceSettings, setInvoiceSettings] = useState<WhmcsInvoiceSettings | null>(null);
  const [currencyData, setCurrencyData] = useState({ code: "INR", symbol: "₹" });

  const [downloading, setDownloading] = useState(false);

  // useEffect(() => {
  //   let cancelled = false;

  //   const load = async () => {
  //     setLoading(true);
  //     setError(null);

  //     try {
  //       const res = await apiFetch(`/api/whmcs/billing/invoices/${invoiceUuid}`);
  //       if (!res.ok) {
  //         let msg = "Failed to load invoice";
  //         try {
  //           const body = await res.json();
  //           msg = body?.error || msg;
  //         } catch {
  //         }
  //         throw new Error(msg);
  //       }

  //       const data = (await res.json()) as ApiInvoice;

  //       if (!cancelled) {
  //         setInvoice(data);
  //       }

  //       const clientRes = await apiFetch("/api/whmcs/client/details");
  //       if (clientRes.ok) {
  //         const cd = (await clientRes.json()) as ClientDetails;
  //         if (!cancelled) {
  //           setClientDetails(cd);
  //           setCurrencyData({
  //             code: cd.currencyCode || "INR",
  //             symbol: cd.currencySymbol || "₹"
  //           });
  //         }
  //       }

  //       const settingsRes = await apiFetch("/api/whmcs/settings");
  //       if (settingsRes.ok) {
  //         const s = (await settingsRes.json()) as WhmcsInvoiceSettings;
  //         if (!cancelled) {
  //           setInvoiceSettings(s);
  //         }
  //       }
  //     } catch (e) {
  //       if (!cancelled) {
  //         setError(e instanceof Error ? e.message : "Unable to fetch invoice");
  //         setInvoice(null);
  //       }
  //     } finally {
  //       if (!cancelled) {
  //         setLoading(false);
  //       }
  //     }
  //   };

  //   if (invoiceUuid) {
  //     load();
  //   } else {
  //     setLoading(false);
  //     setError("Invalid invoice id");
  //   }

  //   return () => {
  //     cancelled = true;
  //   };
  // }, [invoiceUuid]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {

        // =========================
        // 1. Load Invoice
        // =========================

        const invoicePromise = apiFetch(`/api/whmcs/billing/invoices/${invoiceUuid}`);

        // =========================
        // 2. Load Bootstrap Cache
        // =========================

        let bootstrap = getSessionCache<any>(BOOTSTRAP_CACHE_KEY, BOOTSTRAP_CACHE_TIME);

        // =========================
        // 3. Fetch Bootstrap If Missing
        // =========================

        if (!bootstrap) {
          const bootstrapRes = await apiFetch("/api/whmcs/billing/bootstrap");
          if (bootstrapRes.ok) {
            bootstrap = await bootstrapRes.json();
            setSessionCache(BOOTSTRAP_CACHE_KEY, bootstrap);
          }
        }

        // =========================
        // 4. Wait Invoice
        // =========================

        const invoiceRes = await invoicePromise;
        if (!invoiceRes.ok) {
          let msg = "Failed to load invoice";
          try {
            const body = await invoiceRes.json();
            msg = body?.error || msg;
          } catch { }
          throw new Error(msg);
        }
        const invoiceData = await invoiceRes.json();

        // =========================
        // 5. Set All State Together
        // =========================

        if (!cancelled) {
          setInvoice(invoiceData);
          if (bootstrap?.client) {
            setClientDetails(bootstrap.client);
            setCurrencyData({
              code: bootstrap.client.currencyCode || "INR",
              symbol: bootstrap.client.currencySymbol || "₹",
            });
          }

          if (bootstrap?.settings) {
            setInvoiceSettings(
              bootstrap.settings
            );
          }
        }

      } catch (e) {
        if (!cancelled) {

          setError(
            e instanceof Error
              ? e.message
              : "Unable to fetch invoice"
          );
          setInvoice(null);
        }

      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (invoiceUuid) {
      load();
    } else {
      setLoading(false);
      setError("Invalid invoice id");
    }

    return () => {
      cancelled = true;
    };

  }, [invoiceUuid]);

  const handleDownloadInvoice = async () => {
    if (!invoiceUuid || downloading) return;
    setDownloading(true);

    try {
      const res = await apiFetch(`/api/whmcs/billing/invoices/invoice-download/${invoiceUuid}`);
      if (!res.ok) {
        let msg = "Failed to download invoice";
        try {
          const body = await res.json();
          msg = body?.error || msg;
        } catch { }
        throw new Error(msg);
      }

      // Handle the binary PDF response
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      // Create a hidden link and trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${invoice?.invoicenum || invoiceUuid}.pdf`;
      document.body.appendChild(a);
      a.click();

      // Clean up
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download invoice error:", e);
      alert(e instanceof Error ? e.message : "Unable to download invoice");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <DashboardLayout>
      {/* <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6"> */}
      <div className="w-full max-w-4xl mx-auto">
        <div className="space-y-6">
          {/* <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Invoice</h1>
              <div className="text-sm text-muted-foreground">
                {invoice ? `#${invoice.invoicenum || invoice.invoiceid}` : null}
              </div>
            </div>
            <Button variant="outline" onClick={() => router.push("/billing/invoices")}>Back</Button>
          </div> */}

          <div className="bg-card rounded-xl border">
            <div className="p-[60px]">
              {loading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-5 w-52 bg-muted rounded" />
                  <div className="h-4 w-72 bg-muted rounded" />
                  <div className="h-4 w-64 bg-muted rounded" />
                </div>
              ) : error ? (
                <div className="text-sm text-muted-foreground">{error}</div>
              ) : invoice ? (
                <div className="space-y-8">
                  {/* Header Bar */}
                  <div className="flex items-center justify-end">
                    {/* <div className="text-sm font-semibold">Invoice Details</div> */}
                    <div className="flex items-center gap-2">

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDownloadInvoice}
                        disabled={downloading}
                      >
                        {downloading ? "Downloading..." : "Download Invoice"}
                        <svg className="ml-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    <div className="space-y-2">
                      {invoiceSettings?.CompanyName ? (
                        <div className="text-lg font-semibold">{invoiceSettings.CompanyName}</div>
                      ) : null}
                      <div className="text-lg font-semibold flex items-center">
                        Invoice #{invoice.invoicenum || invoice.invoiceid}
                        <div className="inline-block ml-2">
                          <Badge
                            variant="outline"
                            className={
                              invoice.status === "Paid"
                                ? "bg-transparent text-foreground border-foreground/20 px-4 font-medium text-[10px] tracking-widest"
                                : "bg-transparent text-foreground border-foreground/20 px-4 font-medium text-[10px] tracking-widest"
                            }
                          >
                            {invoice.status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                      <div className="space-y-1">
                        <div className="text-muted-foreground">Invoice Date</div>
                        <div className="text-foreground font-medium">{formatDmy(invoice.date)}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground">Payment Method</div>
                        <div className="text-foreground font-medium">{invoice.paymentmethod || "-"}</div>
                      </div>
                    </div> */}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 text-sm text-left">
                      <div className="text-foreground text-base font-bold tracking-wider">Invoiced To</div>
                      <div className="text-muted-foreground leading-6">
                        {clientDetails ? (
                          <>
                            <div className="text-white/80 font-medium tracking-wide">
                              {`${clientDetails.firstName || ""} ${clientDetails.lastName || ""}`.trim() || "Client"}
                            </div>
                            {clientDetails.companyName ? <div>{clientDetails.companyName}</div> : null}
                            {clientDetails.address1 ? <div>{clientDetails.address1}</div> : null}
                            {clientDetails.address2 ? <div>{clientDetails.address2}</div> : null}
                            <div>
                              {[clientDetails.city, clientDetails.state, clientDetails.postcode]
                                .filter(Boolean)
                                .join(", ")}
                            </div>
                            {clientDetails.country ? <div>{displayCountry(clientDetails.country)}</div> : null}

                            {typeof clientDetails.customfields1 === "string" && clientDetails.customfields1.trim() !== "" ? (
                              <div className="pt-3 tracking-normal">GST Number: {clientDetails.customfields1}</div>
                            ) : null}
                          </>
                        ) : (
                          <>
                            Client #{invoice.userid ?? "-"}
                            <br />
                            (Details from WHMCS client profile)
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-right">
                      <div className="text-foreground text-base font-bold tracking-wider">Pay To</div>
                      <div className="text-muted-foreground leading-6">

                        {invoiceSettings?.InvoicePayTo ? (
                          invoiceSettings.InvoicePayTo.split(/\r?\n/).map((line, idx) => (
                            <div key={idx}>{line}</div>
                          ))
                        ) : (
                          <>

                          </>
                        )}
                      </div>
                    </div>


                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                    <div className="space-y-1 text-left">
                      <div className="text-foreground text-base font-bold tracking-wider">Invoice Date</div>
                      <div className="text-muted-foreground">{formatDmy(invoice.date)}</div>
                    </div>
                    <div className="space-y-1 text-right">
                      <div className="text-foreground text-base font-bold tracking-wider">Payment Method</div>
                      <div className="text-muted-foreground">{invoice.paymentmethod || "-"}</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="text-base font-semibold">Invoice Items</div>
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground bg-muted/40 border-b">
                          <tr>
                            <th className="px-4 py-3 font-medium">Description</th>
                            <th className="px-4 py-3 font-medium">Item type</th>
                            {/* <th className="px-4 py-3 font-medium">Taxed</th> */}
                            <th className="px-4 py-3 font-medium text-right">Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {(invoice.items || []).length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                                No items
                              </td>
                            </tr>
                          ) : (
                            (invoice.items || []).map((it) => (
                              <tr key={String(it.id)} className="hover:bg-muted/20 transition-colors">
                                <td className="px-4 py-3 text-foreground">
                                  {(() => {
                                    const { title, details } = splitDescription(it.description);
                                    return (
                                      <div className="space-y-1">
                                        <div className="font-medium">{title}</div>
                                        {details.length ? (
                                          <div className="grid grid-cols-1 sm:grid-cols-1 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                                            {details.map((d) => (
                                              <div key={d.k} className="flex gap-2 items-center">
                                                <div className="text/80 text-sm">{d.k}:</div>
                                                <div className="text-foreground/90">{d.v}</div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : null}
                                      </div>
                                    );
                                  })()}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{humanizeInvoiceItemType(it.type)}</td>
                                {/* <td className="px-4 py-3 text-muted-foreground">{String(it.taxed) === "1" ? "Yes" : "No"}</td> */}
                                <td className="px-4 py-3 text-right font-medium text-foreground">{formatCurrency(it.amount, currencyData.code, currencyData.code === "INR" ? "en-IN" : "en-US")}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end">
                      <div className="w-full bg-muted/30 border rounded-lg p-4 space-y-3 text-sm">
                        {isTruthyAmount(invoice.subtotal) ? (
                          <div className="flex items-center justify-between">
                            <div className="text-muted-foreground">Subtotal:</div>
                            <div className="font-medium text-foreground">{formatCurrency(invoice.subtotal || "0", currencyData.code, currencyData.code === "INR" ? "en-IN" : "en-US")}</div>
                          </div>
                        ) : null}

                        {isTruthyAmount(invoice.tax) || isTruthyAmount(invoice.tax2) ? (
                          <div className="flex items-center justify-between">
                            <div className="text-muted-foreground">GST:</div>
                            <div className="font-medium text-foreground">
                              {formatCurrency(String((parseAmount(invoice.tax) || 0) + (parseAmount(invoice.tax2) || 0)), currencyData.code, currencyData.code === "INR" ? "en-IN" : "en-US")}
                            </div>
                          </div>
                        ) : null}

                        <div className="flex items-center justify-between">
                          <div className="text-muted-foreground">Total Amount Incl. GST:</div>
                          <div className="font-medium text-foreground">{formatCurrency(invoice.total, currencyData.code, currencyData.code === "INR" ? "en-IN" : "en-US")}</div>
                        </div>

                        <div className="flex items-start justify-between gap-3">
                          <div className="text-muted-foreground">Total Amount Incl. GST (in words):</div>
                          <div className="font-medium text-foreground text-right">{amountToWords(invoice.total, currencyData.code)}</div>
                        </div>

                        {isTruthyAmount(invoice.credit) ? (
                          <div className="flex items-center justify-between">
                            <div className="text-muted-foreground">Funds Applied:</div>
                            <div className="font-medium text-foreground">{formatCurrency(invoice.credit || "0", currencyData.code, currencyData.code === "INR" ? "en-IN" : "en-US")}</div>
                          </div>
                        ) : null}

                        {isTruthyAmount(invoice.balance) ? (
                          <div className="flex items-center justify-between border-t pt-3">
                            <div className="text-muted-foreground">Balance:</div>
                            <div className="font-medium text-foreground">{formatCurrency(invoice.balance || "0", currencyData.code, currencyData.code === "INR" ? "en-IN" : "en-US")}</div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-base font-semibold">Transactions</div>
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground bg-muted/40 border-b">
                          <tr>
                            <th className="px-4 py-3 font-medium">Date</th>
                            <th className="px-4 py-3 font-medium">Gateway</th>
                            <th className="px-4 py-3 font-medium">Transaction ID</th>
                            <th className="px-4 py-3 font-medium text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {(invoice.transactions || []).length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                                No transactions
                              </td>
                            </tr>
                          ) : (
                            (invoice.transactions || []).map((t) => (
                              <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                                <td className="px-4 py-3 text-muted-foreground">{formatDmyFromDateTime(t.date)}</td>
                                <td className="px-4 py-3 text-muted-foreground">{t.gateway || "-"}</td>
                                <td className="px-4 py-3 text-foreground">{t.transid || "-"}</td>
                                <td className="px-4 py-3 text-right font-medium text-foreground">{formatCurrency(t.amountin || "0", currencyData.code, currencyData.code === "INR" ? "en-IN" : "en-US")}</td>
                              </tr>
                            ))
                          )}
                          {isTruthyAmount(invoice.credit) && parseFloat(invoice.credit!) > 0 && (
                            <tr className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 text-muted-foreground">{formatDmyFromDateTime(invoice.date)}</td>
                              {/* <td className="px-4 py-3 text-muted-foreground">Credit</td> */}
                              <td className="px-4 py-3 text-muted-foreground">Funds Applied</td>
                              <td></td>
                              <td className="px-4 py-3 text-right font-medium text-foreground">
                                {formatCurrency(invoice.credit || "0", currencyData.code, currencyData.code === "INR" ? "en-IN" : "en-US")}
                              </td>
                            </tr>
                          )}
                        </tbody>
                        {/* {isTruthyAmount(invoice.balance) ? (
                          <tfoot className="border-t bg-muted/20">
                            <tr>
                              <td colSpan={3} className="px-4 py-3 text-right font-medium text-muted-foreground">
                                Balance
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-foreground">
                                {formatCurrency(invoice.balance || "0", currencyData.code, currencyData.code === "INR" ? "en-IN" : "en-US")}
                              </td>
                            </tr>
                          </tfoot>
                        ) : null} */}
                      </table>
                    </div>
                  </div>
                  <div className="flex justify-end mt-2">
                    <div className="w-full sm:w-80 bg-muted/30 border rounded-lg p-4 space-y-3 text-sm">
                      {isTruthyAmount(invoice.balance) ? (
                        <div className="flex items-center justify-between">
                          <div className="text-muted-foreground">Balance:</div>
                          <div className="font-medium text-foreground">{formatCurrency(invoice.balance || "0", currencyData.code, currencyData.code === "INR" ? "en-IN" : "en-US")}</div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {invoice.notes ? (
                    <div className="bg-muted/30 border rounded-lg p-4 text-sm text-muted-foreground">
                      Notes: {invoice.notes}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* <div className="space-y-6">
          <div className="bg-card rounded-xl border">
            <div className="p-6 space-y-4">
              <div className="text-sm font-semibold">Actions</div>
              <Button className="w-full" variant="outline" disabled={!invoice || downloading} onClick={handleDownloadInvoice}>
                Download Invoice
              </Button>
              <div className="text-xs text-muted-foreground">Full invoice statement</div>
            </div>
          </div>
        </div> */}
      </div>
    </DashboardLayout>
  );
}
