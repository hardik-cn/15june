import { Button } from "@/app/components/ui/button";
import { Paperclip, Loader2, Download } from "lucide-react";
import { formatTicketDate } from "@/app/support/page";

interface TicketAttachmentsTabProps {
  allAttachments: { relatedid: string, type: string, index: number, filename: string, uploader: string, date: string }[];
  downloadingAtt: string | null;
  onDownload: (relatedid: string, type: string, index: number, filename: string) => void;
}

export function TicketAttachmentsTab({
  allAttachments,
  downloadingAtt,
  onDownload
}: TicketAttachmentsTabProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">This tab displays <strong className="text-foreground font-medium">all file attachments added throughout the support ticket</strong> thread. You can view and download any files shared during the conversation from this section.</p>

      <div className="bg-muted/20 rounded-md border p-4 text-sm text-muted-foreground">
        {allAttachments.length === 0 ? "No attachments have been added to this ticket yet." : (
          <div className="space-y-2">
            {allAttachments.map((att, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-background border rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <Paperclip className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm leading-none mb-1.5">{att.filename}</p>
                    <p className="text-[11px] text-muted-foreground">Uploaded by {att.uploader} on {formatTicketDate(att.date)}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onDownload(att.relatedid, att.type, att.index, att.filename)} disabled={downloadingAtt === `${att.type}-${att.relatedid}-${att.index}`}>
                  {downloadingAtt === `${att.type}-${att.relatedid}-${att.index}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
