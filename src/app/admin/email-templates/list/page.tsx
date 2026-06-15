// src/app/admin/email-templates/list/page.tsx

"use client";

import React, { useState, useEffect, useRef } from "react";
import AdminDashboardWrapper, { useAdmin } from "../../components/AdminDashboardWrapper";

import { adminFetch } from "@/lib/admin/adminFetch";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ADMIN_ROUTES } from "@/lib/routes";
import PaginationControls from "../../components/PaginationControls";
import { format } from "date-fns";
import {
  Plus, Edit, Trash2, Mail, Eye, X,
  Search, ChevronDown, CheckCircle, AlertCircle,
  Send, History, Copy, Clock
} from "lucide-react";

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  status: string;
}

const Modal = ({ isOpen, onClose, title, children, size = "md" }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: "md" | "lg" | "xl" }) => {
  if (!isOpen) return null;
  const sizeClasses = {
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl"
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center !mt-0">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full ${sizeClasses[size]} mx-4 bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-white/[0.1] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08] sticky top-0 bg-[#1a1a1a] z-10">
          <h3 className="text-xl font-semibold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.05] transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export default function EmailTemplatesListPage() {
  const router = useRouter();
  // const { hasPermission } = useAdmin();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalType, setModalType] = useState<"preview" | "test" | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasFetched = useRef(false);
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await adminFetch("/api/admin/email-templates");
      const data = await res.json();
      if (res.ok && data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      toast.error("Failed to load email templates");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreate = () => {
    router.push(ADMIN_ROUTES.EMAIL_TEMPLATES.CREATE);
  };

  const handleOpenEdit = (template: EmailTemplate) => {
    router.push(`${ADMIN_ROUTES.EMAIL_TEMPLATES.LIST}/../edit/${template.id}`);
  };


  const handleSendTest = async () => {
    if (!testEmail || !selectedTemplate) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await adminFetch(`/api/admin/email-templates/${selectedTemplate.id}/test`, {
        method: "POST",
        body: JSON.stringify({ testEmail })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Test email sent!");
        setModalType(null);
      } else {
        toast.error(data.error || "Failed to send test email");
      }
    } catch (error) {
      toast.error("Error sending test email");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Pagination calculations
  const totalItems = filteredTemplates.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTemplates = filteredTemplates.slice(startIndex, endIndex);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  return (
    <AdminDashboardWrapper>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent mb-2">Email Templates</h1>
          </div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-white/15 to-white/10 hover:from-white/20 hover:to-white/15 text-white font-medium transition-all border border-white/[0.1]">
            <Plus size={18} />
            New Template
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
            <p className="text-white/40 text-sm font-medium mb-2">Total Templates</p>
            <p className="text-3xl font-bold text-white/90">{templates.length}</p>
          </div>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
            <p className="text-white/40 text-sm font-medium mb-2">Active</p>
            <p className="text-3xl font-bold text-white/90">{templates.filter(t => String(t.status) === "1").length}</p>
          </div>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
            <p className="text-white/40 text-sm font-medium mb-2">Inactive</p>
            <p className="text-3xl font-bold text-white/90">{templates.filter(t => String(t.status) === "0").length}</p>
          </div>
          {/* <div className="p-6 rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
            <p className="text-white/40 text-sm font-medium mb-2">Recent Updates</p>
            <p className="text-3xl font-bold text-white/90">{templates.filter(u => {
              const d = new Date(u.updatedAt);
              const now = new Date();
              const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              return d >= weekAgo && d <= now;
            }).length}</p>
          </div> */}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
          <input
            type="text"
            placeholder="Search by name or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08] text-white/90 placeholder-white/30 focus:outline-none focus:border-white/[0.2]"
          />
        </div>

        {/* Top Pagination Controls */}
        {totalItems > 0 && (
          <PaginationControls
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            totalItems={totalItems}
            totalPages={totalPages}
          />
        )}

        {/* Templates Table */}
        {isLoading ? (
          <div className="py-20 text-center text-white/40">Loading templates...</div>
        ) : filteredTemplates.length === 0 ? (
          <div className="py-20 text-center text-white/40">
            {searchQuery ? "No templates match your search." : "No email templates found. Create your first one!"}
          </div>
        ) : (
          <div className="rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left py-4 px-6 text-white/50 text-sm font-medium">Template Name</th>
                    {/* <th className="text-left py-4 px-6 text-white/50 text-sm font-medium">Email Subject</th> */}
                    {/* <th className="text-left py-4 px-6 text-white/50 text-sm font-medium">Variables</th> */}
                    <th className="text-left py-4 px-6 text-white/50 text-sm font-medium">Created At</th>
                    <th className="text-left py-4 px-6 text-white/50 text-sm font-medium">Updated At</th>
                    <th className="text-left py-4 px-6 text-white/50 text-sm font-medium">Status</th>
                    <th className="text-right py-4 px-6 text-white/50 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTemplates.map((template, index) => (
                    <tr
                      key={template.id}
                      className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${index === filteredTemplates.length - 1 ? 'border-b-0' : ''
                        }`}>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-white/90 font-medium">
                              {template.name}
                            </p>
                          </div>
                        </div>
                      </td>
                      {/* <td className="py-4 px-6">
                        <p className="font-medium text-[14px] text-white/90 tracking-wide" title={template.subject}>
                          {template.subject}
                        </p>
                      </td> */}
                      {/* <td className="py-4 px-6">
                        <p className="text-white/40 text-sm">
                          {template.body.split("{{").length - 1} used
                        </p>
                      </td> */}
                      <td className="py-4 px-6">

                        <span className="text-white/90 text-xs tracking-wide">{format(new Date(template.createdAt), "dd MMM yyyy, h:mm:ss a")}</span>
                        {/* <p className="text-white/40 text-sm">
                        
                          {new Date(template.createdAt).toLocaleString('en-US', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          }).replace(',', ',')}
                        </p> */}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-white/90 text-xs tracking-wide">{format(new Date(template.updatedAt), "dd MMM yyyy, h:mm:ss a")}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5 ${String(template.status) === "1"
                          ? "bg-[#ffffff0f] text-white border border-white/20"
                          : "bg-[#ffffff0f] text-white/50"
                          }`}>
                          {String(template.status) === "1" ? (
                            <>
                              Active
                            </>
                          ) : (
                            <>
                              Inactive
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-1">

                          <button
                            onClick={() => handleOpenEdit(template)}
                            className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.05]"
                          // title="Edit"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                          </button>
                          <button
                            onClick={() => { setSelectedTemplate(template); setModalType("test"); }}
                            className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.05]"
                          // title="Send Test"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"></path><path d="M22 2l-7 20-4-9-9-4 20-7z"></path></svg>
                          </button>

                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bottom Pagination Controls */}
        {totalItems > 0 && (
          <PaginationControls
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            totalItems={totalItems}
            totalPages={totalPages}
          />
        )}

        {/* Test Email Modal */}
        <Modal
          isOpen={modalType === "test"}
          onClose={() => setModalType(null)}
          title="Send Test Email"
          size="md"
        >
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-gradient-to-r from-white/[0.05] to-white/[0.02] border border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="2"><path d="M22 2L11 13"></path><path d="M22 2l-7 20-4-9-9-4 20-7z"></path></svg>
                </div>
                <div>
                  <p className="text-white/70 font-medium">Confirm Send Test Mail</p>
                  <p className="text-white/40 text-sm">Send a test email for <span className="text-white font-medium">"{selectedTemplate?.name}"</span> to your inbox.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">Recipient Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#0f0f0f] border border-white/[0.08] text-white/90 placeholder-white/30 focus:outline-none focus:border-white/[0.2]"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setModalType(null)}
                className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white/70 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendTest}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white/80 font-medium transition-all border border-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Sending..." : "Confirm"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminDashboardWrapper>
  );
}
