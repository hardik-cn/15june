"use client";

import React from "react";
import AdminDashboardWrapper from "../../components/AdminDashboardWrapper";
import TemplateForm from "../components/TemplateForm";


export default function CreateTemplatePage() {
  return (
    <AdminDashboardWrapper requireModule="email_templates" requireAction="create">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent mb-2">Create New Template</h1>
        </div>
        <div className="pt-4">
          <TemplateForm />
        </div>
      </div>
    </AdminDashboardWrapper>
  );
}
