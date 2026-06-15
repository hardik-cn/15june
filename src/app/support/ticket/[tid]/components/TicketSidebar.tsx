import { Badge } from "@/app/components/ui/badge";
import { User, Building2, AlertCircle, CalendarDays, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { TicketDetail } from "./types";
import { getStatusDot, getStatusColor, getPriorityColor } from "./utils";
import { formatTicketDate } from "@/app/support/page";

interface TicketSidebarProps {
  ticket: TicketDetail;
}

export function TicketSidebar({ ticket }: TicketSidebarProps) {
  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h3 className="text-sm font-semibold">Ticket Information</h3>
        </div>
        <div className="divide-y divide-border">

          {/* Status */}
          <div className="px-5 py-3.5 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
              <span className={cn("w-2 h-2 rounded-full", getStatusDot(ticket.status))} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Status</p>
              <Badge
                variant="secondary"
                className={cn("text-xs px-2.5 h-5 rounded-full border font-medium capitalize", getStatusColor(ticket.status))}
              >
                {ticket.status}
              </Badge>
            </div>
          </div>

          {/* Requestor */}
          <div className="px-5 py-3.5 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Requestor</p>
              <p className="text-sm font-medium leading-tight">{ticket.requestor_name || ticket.name}</p>
              <Badge variant="secondary" className="mt-1 text-[10px] h-4 px-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border">
                {ticket.requestor_type || "Owner"}
              </Badge>
            </div>
          </div>

          {/* Department */}
          <div className="px-5 py-3.5 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Department</p>
              <p className="text-sm font-medium">{ticket.deptname}</p>
            </div>
          </div>

          {/* Priority */}
          <div className="px-5 py-3.5 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
              <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Priority</p>
              <Badge
                variant="secondary"
                className={cn("text-xs px-2.5 h-5 rounded-full border font-medium capitalize", getPriorityColor(ticket.priority))}
              >
                {ticket.priority}
              </Badge>
            </div>
          </div>

          {/* Submitted */}
          <div className="px-5 py-3.5 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Submitted</p>
              <p className="text-sm font-medium">{formatTicketDate(ticket.date)}</p>
            </div>
          </div>

          {/* Last Updated */}
          <div className="px-5 py-3.5 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Last Updated</p>
              <p className="text-sm font-medium">{formatTicketDate(ticket.lastreply)}</p>
            </div>
          </div>

        </div>
      </div>

      {/* Ticket ID info */}
      <div className="bg-card rounded-xl border px-5 py-4">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Ticket Reference</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Ticket No.</span>
            <span className="text-xs font-mono font-medium">#{ticket.tid}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Access Key</span>
            <span className="text-xs font-mono font-medium text-muted-foreground">{ticket.c}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
