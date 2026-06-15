"use client";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Paperclip, Info, X } from "lucide-react";
import TicketEditor from "../TicketEditor";
import { RefObject } from "react";

interface TicketDetailsProps {
  subject: string;
  setSubject: (subject: string) => void;
  message: string;
  setMessage: (message: string) => void;
  messageStats: { lines: number; words: number };
  attachments: File[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeAttachment: (index: number) => void;
}

export function TicketDetails({
  subject,
  setSubject,
  message,
  setMessage,
  messageStats,
  attachments,
  fileInputRef,
  handleFileChange,
  removeAttachment,
}: TicketDetailsProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-normal text-muted-foreground">Ticket Details</h2>
      <div className="bg-card rounded-xl border p-6 space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Subject <span className="text-red-500"> *</span></Label>
          <Input
            placeholder="Briefly describe your issue"
            className="h-11 bg-background"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold">Message</Label>
          <div className="flex flex-col gap-2">
            <TicketEditor
              content={message}
              onChange={(content) => setMessage(content)}
              placeholder="Describe your issue in detail..."
            />
            <div className="flex justify-end text-xs text-muted-foreground pr-2">
              lines: {messageStats.lines} words: {messageStats.words}
            </div>
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

          {attachments.length > 0 && (
            <div className="mt-4 space-y-2">
              {attachments.map((file, index) => (
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
      </div>
    </div>
  );
}
