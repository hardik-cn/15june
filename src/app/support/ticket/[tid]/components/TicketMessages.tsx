import { Badge } from "@/app/components/ui/badge";
import { User, CircleUser, Paperclip, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TicketDetail } from "./types";
import { isOperator } from "./utils";
import { formatTicketDate } from "@/app/support/page";

interface TicketMessagesProps {
  ticket: TicketDetail;
  downloadingAtt: string | null;
  onDownload: (relatedid: string, type: string, index: number, filename: string) => void;
}

export function TicketMessages({ ticket, downloadingAtt, onDownload }: TicketMessagesProps) {
  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden flex flex-col h-[650px]">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-muted/10 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-base font-semibold text-foreground tracking-tight">Ticket #{ticket.tid} - {ticket.subject}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatTicketDate(ticket.date)}
          </p>
        </div>
        <div className="text-xs text-muted-foreground font-medium bg-muted/30 px-3 py-1.5 rounded-md border shrink-0">
          {ticket.replies.length} Replies
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto flex flex-col divide-y divide-border">
        {ticket.replies.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm flex-1 flex items-center justify-center">
            No messages yet.
          </div>
        ) : (
          ticket.replies.map((reply, idx) => {
            const operator = isOperator(reply);
            const displayName = reply.requestor_name || reply.name || (operator ? "Support Team" : "You");
            const subLabel = operator
              ? `From - ${reply.admin || "support team"}`
              : reply.requestor_email || "";
            const attachmentList = Array.isArray(reply.attachments) && reply.attachments.length > 0 && !Array.isArray(reply.attachments[0])
              ? (reply.attachments as { filename: string; index: number }[])
              : [];

            return (
              <div key={reply.replyid ?? idx} className="px-6 py-5 hover:bg-muted/5 transition-colors">
                {/* Row: Avatar + Meta + Date */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-sm",
                        operator
                          ? "bg-white text-black"
                          : "text-white bg-gradient-to-br bg-gradientBg border border-gradientBorder"
                      )}
                    >
                      {!operator ? <User /> : <CircleUser />}
                    </div>

                    {/* Name & subtitle */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground leading-tight">
                          {displayName}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "h-4 px-1.5 text-[9px] rounded-sm uppercase tracking-wider font-bold border",
                            operator
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/25"
                              : "bg-blue-500/10 text-blue-400 border-blue-500/25"
                          )}
                        >
                          {operator ? "Operator" : reply.requestor_type || "Customer"}
                        </Badge>
                      </div>
                      {subLabel && (
                        <span className="text-xs text-muted-foreground mt-0.5">
                          {subLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <span className="text-xs text-muted-foreground whitespace-nowrap pt-0.5 shrink-0">
                    {formatTicketDate(reply.date)}
                  </span>
                </div>

                {/* Message Body */}
                <div className="pl-[52px] prose prose-sm max-w-none break-words whitespace-pre-wrap leading-relaxed text-foreground/85 dark:prose-invert prose-p:text-foreground/80 prose-headings:text-foreground prose-a:text-blue-400 hover:prose-a:text-blue-300 prose-strong:text-foreground prose-code:text-foreground/80">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {
                      reply.message.replace(
                        /\n*Service Configuration:[\s\S]*$/i,
                        ""
                      ).trim()
                    }
                  </ReactMarkdown>
                </div>

                {/* Attachments */}
                {attachmentList.length > 0 && (
                  <div className="pl-[52px] mt-3 flex flex-wrap gap-2">
                    {attachmentList.map((att, i) => {
                      const isDownloading = downloadingAtt === `reply-${reply.replyid}-${att.index}`;
                      return (
                        <button
                          key={i}
                          disabled={isDownloading}
                          onClick={() => onDownload(reply.replyid, "reply", att.index, att.filename)}
                          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors group/att cursor-pointer bg-muted/40 border border-border hover:bg-muted/70 text-foreground/70"
                        >
                          <Paperclip className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[150px]">{att.filename}</span>
                          {isDownloading ? (
                            <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                          ) : (
                            <Download className="w-3 h-3 transition-opacity shrink-0 opacity-50 group-hover/att:opacity-100" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
