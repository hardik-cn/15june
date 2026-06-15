import { useState } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/app/components/ui/breadcrumb";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { RefreshCcw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TicketDetail } from "./types";
import { apiFetch } from "@/lib/apiFetch";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";

interface TicketHeaderProps {
  ticket: TicketDetail | null;
  tid: string;
  loading: boolean;
  onRefresh: () => void;
}

export function TicketHeader({
  ticket,
  tid,
  loading,
  onRefresh,
}: TicketHeaderProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleTicketClose = async () => {
    if (!ticket) return;

    setIsClosing(true);
    try {
      const res = await apiFetch("/api/whmcs/tickets/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketid: ticket.ticketid }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to close ticket");
      }

      toast.success("Ticket closed successfully");
      sessionStorage.removeItem("whmcs_ticket_list");
      setIsConfirmOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to close ticket");
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <div>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator />

          <BreadcrumbItem>
            <BreadcrumbLink href="/support">Tickets</BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator />

          <BreadcrumbItem>
            <BreadcrumbPage>
              {loading ? (
                <Skeleton className="h-4 w-48" />
              ) : ticket ? (
                `#${ticket.tid} – ${ticket.subject}`
              ) : (
                `#${tid}`
              )}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-start justify-between mt-3 gap-4 flex-wrap">
        <div>
          {loading ? (
            <Skeleton className="h-9 w-[320px]" />
          ) : (
            <h1 className="text-3xl font-bold tracking-tight">
              {ticket
                ? `Ticket #${ticket.tid} – ${ticket.subject}`
                : `Ticket #${tid}`}
            </h1>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs gap-1.5 hover:bg-muted/30"
            onClick={onRefresh}
            disabled={loading || isClosing}
          >
            <RefreshCcw
              className={cn("w-3.5 h-3.5", (loading || isClosing) && "animate-spin")}
            />
            Refresh
          </Button>

          {ticket && ticket.status.toLowerCase() !== "closed" && (
            <Button
              variant={"destructive"}
              size={"sm"}
              className="h-8 px-3 text-xs gap-1.5 hover:bg-destructive/80"
              onClick={() => setIsConfirmOpen(true)}
              disabled={loading || isClosing}
            >
              Close Ticket
            </Button>
          )}
        </div>
      </div>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Close Ticket</DialogTitle>
            <DialogDescription>
              Are you sure you want to close this ticket? This will mark the ticket as resolved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isClosing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleTicketClose}
              disabled={isClosing}
            >
              {isClosing && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Close Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}