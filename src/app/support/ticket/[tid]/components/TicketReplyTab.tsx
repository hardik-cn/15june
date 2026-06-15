import { Button } from "@/app/components/ui/button";
import { Loader2, Paperclip, Info, X } from "lucide-react";
import TicketEditor from "@/app/support/create-ticket/TicketEditor";
import { TicketDetail } from "./types";
import { RefObject } from "react";

interface TicketReplyTabProps {
  ticket: TicketDetail;
  replyMessage: string;
  setReplyMessage: (msg: string) => void;
  replyAttachments: File[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  isSubmittingReply: boolean;
  messageStats: { lines: number; words: number };
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeAttachment: (index: number) => void;
  handleReplySubmit: (e: React.FormEvent) => void;
}

export function TicketReplyTab({
  ticket,
  replyMessage,
  setReplyMessage,
  replyAttachments,
  fileInputRef,
  isSubmittingReply,
  messageStats,
  handleFileChange,
  removeAttachment,
  handleReplySubmit
}: TicketReplyTabProps) {
  return (
    <form onSubmit={handleReplySubmit} className="space-y-4">
      <div className="bg-muted/30 rounded-lg p-4 border border-transparent">
        <p className="font-semibold text-sm">{ticket.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{ticket.email}</p>
      </div>

      <div className="flex flex-col border rounded-md overflow-hidden bg-background">
        <TicketEditor
          content={replyMessage}
          onChange={setReplyMessage}
          placeholder="Write your reply..."
        />
        <div className="flex justify-end text-xs text-muted-foreground p-2 border-t bg-muted/10">
          lines: {messageStats.lines} words: {messageStats.words}
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <input
          type="file"
          multiple
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".jpg,.jpeg,.gif,.png,.txt,.pdf"
        />
        <div
          className="border border-dashed rounded-md p-4 flex items-center gap-2 text-muted-foreground bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="w-4 h-4 ml-2" />
          <span className="text-sm font-medium">Add Attachments...</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-1 mt-2">
          <Info className="w-3.5 h-3.5" />
          <span>Allowed File Extensions: .jpg, .jpeg, .png, .pdf (Max file size: 5MB)</span>
        </div>

        {replyAttachments.length > 0 && (
          <div className="mt-4 space-y-2">
            {replyAttachments.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-muted/30 border rounded-md px-3 py-2 text-sm">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate max-w-[200px] sm:max-w-[300px]">{file.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => removeAttachment(index)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isSubmittingReply} className="bg-primary hover:bg-primary/80 border-0 font-semibold px-6">
          {isSubmittingReply ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Send Message
        </Button>
      </div>
    </form>
  );
}
