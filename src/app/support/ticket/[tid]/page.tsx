"use client";
import { DashboardLayout } from "@/app/components/dashboard/DashboardLayout";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Loader2, AlertCircle } from "lucide-react";

// Components
import { TicketHeader } from "./components/TicketHeader";
import { TicketStatusBanner } from "./components/TicketStatusBanner";
import { TicketSidebar } from "./components/TicketSidebar";
import { TicketMessages } from "./components/TicketMessages";
import { TicketReplyTab } from "./components/TicketReplyTab";
import { TicketCcTab } from "./components/TicketCcTab";
import { TicketAttachmentsTab } from "./components/TicketAttachmentsTab";
import { TicketAdditionalInfoTab } from "./components/TicketAdditionalInfoTab";

// Hook
import { useTicket } from "./components/useTicket";

export default function ViewTicketPage() {
  const {
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
  } = useTicket();

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto py-4">
        {/* Header */}
        <TicketHeader 
          ticket={ticket} 
          tid={tid} 
          loading={loading} 
          onRefresh={fetchTicket} 
        />

        {/* Loading State */}
        {loading && !ticket && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">Loading ticket details...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-red-400 font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchTicket}>Try Again</Button>
          </div>
        )}

        {/* Content */}
        {!loading && !error && ticket && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">

            {/* Left Column: Settings + Messages */}
            <div className="space-y-6">

              {/* Closed Status Banner */}
              {ticket.status.toLowerCase() === "closed" && <TicketStatusBanner />}

              {/* Ticket Settings Tabs */}
              <div className="bg-card rounded-xl border overflow-hidden">
                <div className="px-6 border-b pt-4 flex gap-6 overflow-x-auto whitespace-nowrap hide-scrollbar">
                  <button onClick={() => setActiveTab("reply")} className={cn("pb-4 text-sm font-medium border-b-2 transition-colors", activeTab === "reply" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
                    Reply
                  </button>
                  <button onClick={() => setActiveTab("cc")} className={cn("pb-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5", activeTab === "cc" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
                    CC Recipients <Badge variant="secondary" className={cn("h-5 px-1.5 text-[10px] rounded-full", activeTab === "cc" ? "bg-primary/20 text-primary border-primary/30" : "")}>{ccRecipients.length}</Badge>
                  </button>
                  <button onClick={() => setActiveTab("attachments")} className={cn("pb-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5", activeTab === "attachments" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
                    Attachments <Badge variant="secondary" className={cn("h-5 px-1.5 text-[10px] rounded-full", activeTab === "attachments" ? "bg-primary/20 text-primary border-primary/30" : "")}>{allAttachments.length}</Badge>
                  </button>
                  <button onClick={() => setActiveTab("additional")} className={cn("pb-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5", activeTab === "additional" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
                    Additional Information <Badge variant="secondary" className={cn("h-5 px-1.5 text-[10px] rounded-full", activeTab === "additional" ? "bg-primary/20 text-primary border-primary/30" : "")}>{ticket.customfields.length}</Badge>
                  </button>
                </div>

                <div className="p-6">
                  {activeTab === "reply" && (
                    <TicketReplyTab 
                      ticket={ticket}
                      replyMessage={replyMessage}
                      setReplyMessage={setReplyMessage}
                      replyAttachments={replyAttachments}
                      fileInputRef={fileInputRef}
                      isSubmittingReply={isSubmittingReply}
                      messageStats={messageStats}
                      handleFileChange={handleFileChange}
                      removeAttachment={removeAttachment}
                      handleReplySubmit={handleReplySubmit}
                    />
                  )}

                  {activeTab === "cc" && (
                    <TicketCcTab 
                      ccRecipients={ccRecipients}
                      ccEmail={ccEmail}
                      setCcEmail={setCcEmail}
                      isSubmittingCc={isSubmittingCc}
                      handleAddCc={handleAddCc}
                      updateCc={updateCc}
                    />
                  )}

                  {activeTab === "attachments" && (
                    <TicketAttachmentsTab 
                      allAttachments={allAttachments}
                      downloadingAtt={downloadingAtt}
                      onDownload={handleDownloadAttachment}
                    />
                  )}

                  {activeTab === "additional" && (
                    <TicketAdditionalInfoTab ticket={ticket} />
                  )}
                </div>
              </div>

              {/* Ticket Messages Feed */}
              <TicketMessages 
                ticket={ticket} 
                downloadingAtt={downloadingAtt} 
                onDownload={handleDownloadAttachment} 
              />

              {/* Back Link */}
              <div className="flex justify-start">
                <Button variant="outline" size="sm" asChild className="text-xs h-8 px-3">
                  <Link href="/support">← Back to Tickets</Link>
                </Button>
              </div>
            </div>

            {/* Right Column: Ticket Info Sidebar */}
            <TicketSidebar ticket={ticket} />

          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
