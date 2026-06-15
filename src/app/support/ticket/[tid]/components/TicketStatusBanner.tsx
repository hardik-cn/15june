import { CheckCircle2 } from "lucide-react";

export function TicketStatusBanner() {
  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-5 py-3.5 flex items-center gap-3">
      <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
      <p className="text-sm text-blue-300">
        This ticket is closed. You may reply to this ticket to reopen it.
      </p>
    </div>
  );
}
