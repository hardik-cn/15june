import { TicketReply } from "./types";

export function getPriorityColor(priority: string) {
  switch (priority?.toLowerCase()) {
    case "high": return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "urgent": return "bg-red-500/10 text-red-400 border-red-500/20";
    case "low": return "bg-green-500/10 text-green-400 border-green-500/20";
    default: return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
  }
}

export function getStatusColor(status: string) {
  const s = status?.toLowerCase();
  if (s === "closed") return "bg-muted/60 text-muted-foreground border-white/[0.10]";
  if (s === "answered") return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  if (s === "customer-reply" || s === "in progress") return "bg-purple-500/10 text-purple-400 border-purple-500/20";
  return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
}

export function getStatusDot(status: string) {
  const s = status?.toLowerCase();
  if (s === "closed") return "bg-muted-foreground";
  if (s === "answered") return "bg-blue-400";
  if (s === "customer-reply" || s === "in progress") return "bg-purple-400";
  return "bg-emerald-400";
}

export function isOperator(reply: TicketReply) {
  return reply.requestor_type === "Operator" || !!reply.admin;
}
