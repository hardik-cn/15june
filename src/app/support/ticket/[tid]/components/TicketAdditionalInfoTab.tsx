import { TicketDetail } from "./types";
import { Monitor, List, FileText, Info } from "lucide-react";

interface TicketAdditionalInfoTabProps {
  ticket: TicketDetail;
}

export function TicketAdditionalInfoTab({ ticket }: TicketAdditionalInfoTabProps) {
  const fields = ticket.customfields || [];
  console.log("[DEBUG TicketAdditionalInfoTab] Received Ticket Details:", ticket);
  console.log("[DEBUG TicketAdditionalInfoTab] Custom Fields display list:", fields);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        This tab displays all <strong className="text-foreground font-medium">additional information</strong> you provided when submitting the ticket. These details help our support team better understand your request and assist you more efficiently.
      </p>

      {fields.length === 0 ? (
        <div className="bg-muted/20 rounded-md border p-4 text-sm text-muted-foreground flex items-center gap-2">
          <Info className="w-4 h-4" />
          No additional information was provided for this ticket.
        </div>
      ) : (
        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <label className="text-sm text-muted-foreground ml-1">{field.name}:</label>
              <div className="bg-muted/20 rounded-lg border px-4 py-3 flex items-center gap-3">
                {field.name.toLowerCase().includes("ip") || field.name.toLowerCase().includes("host") ? (
                  <Monitor className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <List className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">{field.value || "N/A"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
