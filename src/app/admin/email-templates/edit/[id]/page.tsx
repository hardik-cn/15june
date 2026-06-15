"use client";

import React, { useState, useEffect, useRef } from "react";
import AdminDashboardWrapper from "../../..//components/AdminDashboardWrapper";
import TemplateForm from "../../components/TemplateForm";

import { adminFetch } from "@/lib/admin/adminFetch";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ADMIN_ROUTES } from "@/lib/routes";


export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const [template, setTemplate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hasFetched = useRef(false);
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    if (params.id) {
      fetchTemplate();
    }
  }, [params.id]);

  const fetchTemplate = async () => {
    setIsLoading(true);
    try {
      const res = await adminFetch(`/api/admin/email-templates/${params.id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setTemplate(data.template);
      } else {
        toast.error("Template not found");
        router.push(ADMIN_ROUTES.EMAIL_TEMPLATES.LIST);
      }

    } catch (error) {
      console.error("Failed to fetch template:", error);
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AdminDashboardWrapper>
        <div className="py-20 text-center text-white/40">Loading template...</div>
      </AdminDashboardWrapper>
    );
  }

  if (!template) return null;

  return (
    <AdminDashboardWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent mb-2">Edit Template</h1>
          <p className="text-white/40 font-medium">Update <span className="text-white">"{template.name}"</span> template structure and content.</p>
        </div>

        <div className="pt-4">
          <TemplateForm initialData={template} isEdit={true} />
        </div>
      </div>
    </AdminDashboardWrapper>
  );
}
