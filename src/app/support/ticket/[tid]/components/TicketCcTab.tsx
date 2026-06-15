import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { User, Loader2, X } from "lucide-react";

interface TicketCcTabProps {
  ccRecipients: string[];
  ccEmail: string;
  setCcEmail: (email: string) => void;
  isSubmittingCc: boolean;
  handleAddCc: () => void;
  updateCc: (newRecipients: string[]) => void;
}

export function TicketCcTab({
  ccRecipients,
  ccEmail,
  setCcEmail,
  isSubmittingCc,
  handleAddCc,
  updateCc
}: TicketCcTabProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Add email addresses to <strong className="text-foreground font-medium">send a copy of all ticket replies</strong> to additional recipients. This is useful for keeping team members or third parties informed throughout the conversation.</p>

      <div className="bg-muted/20 rounded-md border p-4 text-sm text-muted-foreground">
        {ccRecipients.length === 0 ? "No additional recipients have been added to this ticket." : (
          <div className="flex flex-wrap gap-2">
            {ccRecipients.map((email, idx) => (
              <Badge key={idx} variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5 text-xs">
                {email}
                <button onClick={() => updateCc(ccRecipients.filter((_, i) => i !== idx))} disabled={isSubmittingCc} className="hover:text-destructive text-muted-foreground transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 max-w-lg">
        <div className="relative flex-1">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={ccEmail} onChange={e => setCcEmail(e.target.value)} placeholder="Enter email address to add as CC" className="pl-10 h-10" />
        </div>
        <Button onClick={handleAddCc} disabled={isSubmittingCc} className="bg-primary hover:bg-primary/80 border-0 font-semibold h-10 px-5">
          {isSubmittingCc ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Add CC Recipient
        </Button>
      </div>
    </div>
  );
}
