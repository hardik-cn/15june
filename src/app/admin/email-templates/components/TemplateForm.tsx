"use client";
import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin/adminFetch";
import { Save, ChevronDown, Code, Eye, FileCode2, RefreshCw } from "lucide-react";
import { ADMIN_ROUTES } from "@/lib/routes";
import { EMAIL_VARIABLES } from "@/lib/emails/emailVariables";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { html } from "@codemirror/lang-html";
import { foldGutter } from "@codemirror/language";

const monoTheme = EditorView.theme({
  ".cm-foldGutter": {
    display: "none",
  },
  ".cm-gutters-before": {
    display: "none !important",
  },

  // ".cm-foldGutter": { display: "none" },
  "&": {
    background: "#0a0a0a !important",
    color: "rgba(255,255,255,0.85)",
  },
  ".cm-content": {
    caretColor: "#ffffff",
  },
  ".cm-cursor": {
    borderLeftColor: "#ffffff !important",
  },
  ".cm-gutters": {
    backgroundColor: "#0a0a0a !important",
    borderRight: "1px solid rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.2)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.4) !important",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    background: "rgba(255,255,255,0.12) !important",
  },
  ".cm-searchMatch": {
    background: "rgba(255,255,255,0.15)",
    outline: "1px solid rgba(255,255,255,0.3)",
  },
}, { dark: true });

type EditorMode = "wysiwyg" | "preview";

interface TemplateFormProps {
  initialData?: {
    id?: number;
    name: string;
    subject: string;
    body: string;
    status?: string | number;
  };
  isEdit?: boolean;
}

// Isolated component so the iframe always mounts fresh and we can safely write HTML
function PreviewFrame({ html }: { html: string }) {
  const safeHtml = html.replace(/<!doctype[^>]*>/i, "");

  return (
    <iframe
      title="preview"
      className="w-full border rounded-xl bg-white"
      style={{ height: "400px" }}
      srcDoc={safeHtml}
    />
  );
}

export default function TemplateForm({ initialData, isEdit = false }: TemplateFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    subject: initialData?.subject || "",
    body: initialData?.body || "",
    status: String(initialData?.status ?? "1"),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("wysiwyg");
  const [previewKey, setPreviewKey] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close variables dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowVariables(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // const handleRefreshPreview = () => setPreviewKey((k) => k + 1);

  const handleInsertVariable = (key: string) => {
    const variable = `{{${key}}}`;
    navigator.clipboard.writeText(variable);
    toast.success(`Copied ${variable} — paste it into the editor`);
    setShowVariables(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.subject || !formData.body) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setIsSubmitting(true);
    try {
      const url = isEdit
        ? `/api/admin/email-templates/${initialData?.id}`
        : "/api/admin/email-templates";
      const method = isEdit ? "PATCH" : "POST";
      const res = await adminFetch(url, { method, body: JSON.stringify(formData) });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Template ${isEdit ? "updated" : "created"} successfully!`);
        router.push(ADMIN_ROUTES.EMAIL_TEMPLATES.LIST);
        router.refresh();
      } else {
        toast.error(data.error || "Something went wrong");
      }
    } catch {
      toast.error("Failed to save template");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="relative rounded-3xl bg-[#0a0a0a]/80 backdrop-blur-3xl border border-white/[0.05] shadow-[0_8px_30px_rgb(0,0,0,0.5)] overflow-hidden flex flex-col">
          {/* Decorative Elements */}
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent pointer-events-none" />
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-white/[0.02] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-white/[0.01] rounded-full blur-3xl pointer-events-none" />

          {/* Template Details Section */}
          <div className="relative z-10 p-8 border-b border-white/[0.06] bg-white/[0.01]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-sm font-medium text-white/80 tracking-wide">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter email template name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-white/[0.1] rounded-lg px-4 py-3 text-white transition-all placeholder:text-white/20"
                  required
                />
                {/* <p className="text-[11px] text-white/30 font-medium tracking-tight">
                  Used internally to identify the template (e.g., welcome_email).
                </p> */}
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-white/80 tracking-wide">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter email template subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-white/[0.1] rounded-lg px-4 py-3 text-white transition-all placeholder:text-white/20"
                  required
                />
                {/* <p className="text-[11px] text-white/30 font-medium tracking-tight">
                  The subject line visible to the recipient.
                </p> */}
              </div>
              <div className="space-y-3 md:col-span-2 pt-2">
                <label className="text-sm font-medium text-white/80 tracking-wide">
                  Status
                </label>
                <div
                  className="flex items-center justify-between px-4 py-3 rounded-lg border border-white/[0.1] bg-[#0a0a0a] cursor-pointer  hover:border-white/[0.2] transition-all"
                  onClick={() => setFormData({ ...formData, status: formData.status === "1" ? "0" : "1" })}
                >
                  <span className={`text-sm font-medium transition-colors ${formData.status === "1" ? "text-white" : "text-white/50"}`}>
                    {formData.status === "1" ? "Active" : "Inactive"}
                  </span>
                  <button
                    type="button"
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.status === "1" ? "bg-white" : "bg-white/10"
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full transition-transform ${formData.status === "1" ? "translate-x-6 bg-[#0a0a0a]" : "translate-x-1 bg-white/50"
                        }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Email Body Section */}
          <div className="relative z-10 p-8 space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white/80 tracking-wide">
                Email Body <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                {/* Refresh preview button */}
                {/* {editorMode === "preview" && (
                  <button
                    type="button"
                    onClick={handleRefreshPreview}
                    title="Refresh preview"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-[12px] text-white/50 hover:text-white transition-all"
                  >
                    <RefreshCw size={13} />
                  </button>
                )} */}


                {/* WYSIWYG / Preview toggle */}
                <div className="flex items-center rounded-lg bg-white/[0.03] border border-white/[0.06] p-0.5 gap-0.5">
                  <button
                    type="button"
                    onClick={() => setEditorMode("wysiwyg")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${editorMode === "wysiwyg"
                      ? "bg-white/[0.12] text-white shadow-sm"
                      : "text-white/40 hover:text-white/70"
                      }`}
                  >
                    <FileCode2 size={13} />
                    HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode("preview")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${editorMode === "preview"
                      ? "bg-white/[0.12] text-white shadow-sm"
                      : "text-white/40 hover:text-white/70"
                      }`}
                  >
                    <Eye size={13} />
                    Preview
                  </button>
                </div>

                {/* Variables dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowVariables(!showVariables)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-[12px] text-white/70 hover:text-white font-medium transition-all"
                  >
                    <Code size={14} />
                    Variables
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${showVariables ? "rotate-180" : ""}`}
                    />
                  </button>
                  {showVariables && (
                    <div className="absolute right-0 top-full mt-2 w-80 max-h-80 overflow-y-auto rounded-xl bg-[#111] border border-white/[0.08] shadow-2xl z-50 py-2 custom-scrollbar">
                      <p className="px-4 pt-1 pb-2 text-[10px] text-white/25 uppercase tracking-widest font-semibold">
                        Click to copy, then paste into editor
                      </p>
                      {EMAIL_VARIABLES.map((v) => (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => handleInsertVariable(v.key)}
                          className="w-full flex flex-col items-start px-4 py-2 hover:bg-white/[0.04] transition-colors text-left group"
                        >
                          <span className="text-white/80 text-sm font-mono">{`{{${v.key}}}`}</span>
                          <span className="text-[12px] text-white/40 group-hover:text-white/60 transition-colors">
                            {v.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── WYSIWYG Editor ── */}
            {editorMode === "wysiwyg" && (
              <div className="rounded-xl overflow-hidden border border-white/[0.08]">
                {/*  */}
                <CodeMirror
                  value={formData.body}
                  height="400px"
                  width="100%"
                  placeholder={"Enter your HTML template here..."}
                  extensions={[html({ autoCloseTags: true }), EditorView.lineWrapping, monoTheme]}
                  // extensions={[html(), EditorView.lineWrapping]}
                  // extensions={[html(), EditorView.lineWrapping, monoTheme]}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, body: value }))
                  }
                  theme={monoTheme}
                />
              </div>
            )}

            {/* ── Live Preview (iframe) ── */}
            {editorMode === "preview" && (
              <PreviewFrame html={formData.body} />
            )}
          </div>

          {/* Action Section */}
          <div className="relative z-10 px-8 py-6 bg-white/[0.01] border-t border-white/[0.06] flex items-center justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-white text-[#0a0a0a] font-bold text-sm hover:bg-white/90 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              <Save size={18} />
              {isSubmitting ? "Processing..." : isEdit ? "Update Template" : "Save Template"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}