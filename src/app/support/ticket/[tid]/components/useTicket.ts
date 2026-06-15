import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { toast } from "sonner";
import { TicketDetail } from "./types";
import { isOperator } from "./utils";

export function useTicket() {
  const params = useParams();
  const searchParams = useSearchParams();

  const tid = params?.tid as string;
  const c = searchParams?.get("c") || "";

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settings Tabs State
  const [activeTab, setActiveTab] = useState<"reply" | "cc" | "attachments" | "additional">("reply");

  // Reply State
  const [replyMessage, setReplyMessage] = useState("");
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CC State
  const [ccEmail, setCcEmail] = useState("");
  const [ccRecipients, setCcRecipients] = useState<string[]>([]);
  const [isSubmittingCc, setIsSubmittingCc] = useState(false);

  // Downloading attachment tracking
  const [downloadingAtt, setDownloadingAtt] = useState<string | null>(null);

  const fetchTicket = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/whmcs/tickets/by-tid/${encodeURIComponent(tid)}?c=${encodeURIComponent(c)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load ticket");
      }
      const data = await res.json();
      setTicket(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [tid, c]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  useEffect(() => {
    if (ticket?.cc) {
      setCcRecipients(ticket.cc.split(",").map(e => e.trim()).filter(Boolean));
    } else {
      setCcRecipients([]);
    }
  }, [ticket]);

  // Derived state
  const messageStats = useMemo(() => {
    const lines = replyMessage ? replyMessage.split("\n").length : 0;
    const words = replyMessage.trim() ? replyMessage.trim().split(/\s+/).length : 0;
    return { lines, words };
  }, [replyMessage]);

  const allAttachments = useMemo(() => {
    const atts: { relatedid: string, type: string, index: number, filename: string, uploader: string, date: string }[] = [];
    if (ticket) {
      ticket.replies.forEach(reply => {
        if (Array.isArray(reply.attachments) && reply.attachments.length > 0 && !Array.isArray(reply.attachments[0])) {
          (reply.attachments as { filename: string; index: number }[]).forEach(att => {
            atts.push({
              relatedid: reply.replyid,
              type: "reply",
              index: att.index,
              filename: att.filename,
              uploader: reply.requestor_name || reply.name || (isOperator(reply) ? "Support Team" : "You"),
              date: reply.date
            });
          });
        }
      });
    }
    return atts;
  }, [ticket]);

  // Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
    const maxFileSize = 5 * 1024 * 1024; //5MB

    const validFiles: File[] = [];
    newFiles.forEach((file) => {
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        toast.error(`Invalid file type: ${file.name}`);
        return;
      }
      if (file.size > maxFileSize) {
        toast.error(`File too large: ${file.name} (Max 256MB)`);
        return;
      }
      validFiles.push(file);
    });

    if (validFiles.length > 0) {
      setReplyAttachments((prev) => [...prev, ...validFiles]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setReplyAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim()) {
      toast.error("Message cannot be empty.");
      return;
    }
    if (!ticket) return;

    setIsSubmittingReply(true);
    try {
      const formData = new FormData();
      formData.append("ticketid", ticket.ticketid);
      formData.append("message", replyMessage.trim());

      replyAttachments.forEach((file) => {
        formData.append("attachments", file);
      });

      const res = await apiFetch("/api/whmcs/tickets/reply", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send reply");

      sessionStorage.removeItem("whmcs_ticket_list");
      toast.success("Reply sent successfully");
      setReplyMessage("");
      setReplyAttachments([]);
      fetchTicket();
    } catch (err: any) {
      toast.error(err.message || "Failed to send reply");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleAddCc = async () => {
    const email = ccEmail.trim().toLowerCase();
    if (!ccEmail.trim()) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Invalid email format");
      return;
    }
    if (ccRecipients.includes(email)) {
      toast.error("Email already exists in CC");
      return;
    }
    const newRecipients = [...ccRecipients, email];
    await updateCc(newRecipients);
  };

  const updateCc = async (newRecipients: string[]) => {
    if (!ticket) return;
    setIsSubmittingCc(true);
    try {
      const res = await apiFetch("/api/whmcs/tickets/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketid: ticket.ticketid,
          cc: newRecipients.join("|"),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update CC recipients");

      toast.success("CC Recipients updated successfully");
      setCcRecipients(newRecipients);
      setCcEmail("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update CC");
    } finally {
      setIsSubmittingCc(false);
    }
  };

  const handleDownloadAttachment = async (relatedid: string, type: string, index: number, filename: string) => {
    const key = `${type}-${relatedid}-${index}`;
    setDownloadingAtt(key);
    try {
      const res = await apiFetch(`/api/whmcs/tickets/attachment?relatedid=${relatedid}&type=${type}&index=${index}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to download");

      const binaryString = atob(data.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/octet-stream" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename || filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.message || "Failed to download attachment");
    } finally {
      setDownloadingAtt(null);
    }
  };

  return {
    tid,
    ticket,
    loading,
    error,
    activeTab,
    setActiveTab,
    replyMessage,
    setReplyMessage,
    replyAttachments,
    fileInputRef,
    isSubmittingReply,
    ccEmail,
    setCcEmail,
    ccRecipients,
    isSubmittingCc,
    downloadingAtt,
    fetchTicket,
    messageStats,
    allAttachments,
    handleFileChange,
    removeAttachment,
    handleReplySubmit,
    handleAddCc,
    updateCc,
    handleDownloadAttachment
  };
}
