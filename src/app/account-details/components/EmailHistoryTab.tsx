// src/app/account-details/components/EmailHistoryTab.tsx
"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/app/components/ui/card";
import { toast } from "sonner";
import { Loader2, Mail, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { apiFetch } from "@/lib/apiFetch";

interface Email {
    id: number;
    to: string;
    subject: string;
    dateSent: string;
    body: string;
}

const PAGE_SIZE = 10;

export function EmailHistoryTab() {
    const [loading, setLoading] = useState(true);
    const [emails, setEmails] = useState<Email[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

    const fetchEmails = async (currentPage: number) => {
        setLoading(true);
        try {
            const res = await apiFetch(
                `/api/whmcs/client/email-history?limitStart=${currentPage * PAGE_SIZE}&limitNum=${PAGE_SIZE}`
            );
            if (!res.ok) throw new Error("Failed to fetch email history");
            const data = await res.json();
            setEmails(data.emails ?? []);
            setTotal(data.totalResults ?? 0);
        } catch {
            toast.error("Failed to load email history");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmails(page);
    }, [page]);

    const totalPages = Math.ceil(total / PAGE_SIZE);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "—";
        try {
            const d = new Date(dateStr);
            return d.toLocaleString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return dateStr;
        }
    };

    if (selectedEmail) {
        return (
            <div className="space-y-4">
                <button
                    onClick={() => setSelectedEmail(null)}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back to Email History
                </button>
                <Card className="border-border/60 bg-card">
                    <CardContent className="pt-6 space-y-4">
                        <div className="border-b border-border/50 pb-4 space-y-2">
                            <h2 className="text-base font-semibold text-foreground">{selectedEmail.subject}</h2>
                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                                <span>To: {selectedEmail.to}</span>
                                <span>Date: {formatDate(selectedEmail.dateSent)}</span>
                            </div>
                        </div>
                        <div
                            className="prose prose-sm dark:prose-invert max-w-none text-sm text-foreground"
                            dangerouslySetInnerHTML={{ __html: selectedEmail.body || "<p>No content available.</p>" }}
                        />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Email History</h2>
                {total > 0 && (
                    <span className="text-sm text-muted-foreground">
                        {total} email{total !== 1 ? "s" : ""} total
                    </span>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : emails.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
                    <Mail className="h-10 w-10 opacity-40" />
                    <p className="text-sm">No email history found.</p>
                </div>
            ) : (
                <Card className="border-border/60 bg-card overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-[1fr_2fr] border-b border-border/60 bg-muted/30 px-4 py-2.5">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                            Date Sent
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                            Message Subject
                        </span>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-border/50">
                        {emails.map((email) => (
                            <button
                                key={email.id}
                                id={`email-row-${email.id}`}
                                onClick={() => setSelectedEmail(email)}
                                className="w-full grid grid-cols-[1fr_2fr] px-4 py-3.5 text-left hover:bg-muted/30 transition-colors group"
                            >
                                <span className="text-sm text-muted-foreground">
                                    {formatDate(email.dateSent)}
                                </span>
                                <span className="text-sm text-primary group-hover:underline truncate">
                                    {email.subject}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-border/60 px-4 py-3 bg-muted/20">
                            <span className="text-xs text-muted-foreground">
                                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    id="email-prev-page"
                                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                    className="h-8 px-3 text-xs"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                                    Previous
                                </Button>
                                <span className="text-xs text-muted-foreground px-1">
                                    Page {page + 1} / {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    id="email-next-page"
                                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                                    disabled={page >= totalPages - 1}
                                    className="h-8 px-3 text-xs"
                                >
                                    Next
                                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
}
