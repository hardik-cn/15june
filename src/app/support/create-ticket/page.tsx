"use client";
import { DashboardLayout } from "@/app/components/dashboard/DashboardLayout";
import { Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import Link from "next/link";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { TicketInformation } from "./components/TicketInformation";
import { TicketDetails } from "./components/TicketDetails";
import { AdditionalInformation } from "./components/AdditionalInformation";

// ---------- Types ----------
interface Department {
  id: string;
  name: string;
  awaitingreply: string;
  opentickets: string;
}

interface Service {
  id: string;
  name: string;
  domain: string;
  status: string;
  groupname: string;
}

interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
}

export default function CreateTicketPage() {
  const router = useRouter();

  // User info
  const [user, setUser] = useState<UserInfo | null>(null);

  // Department state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptsLoading, setDeptsLoading] = useState(true);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);

  // Services state
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [serviceConfigOptions, setServiceConfigOptions] = useState<any[]>([]);

  // Form state
  const [priority, setPriority] = useState("Medium");
  const [serviceid, setServiceid] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Additional Information State
  const [additionalData, setAdditionalData] = useState<Record<string, any>>({
    serverIp: "",
    username: "",
    password: "",
    port: "22",
    rebootConsent: "No",
    paymentMethod: "None",
    transactionId: "",
    transactionDate: "",
    amount: "",
    contactName: "",
    contactNumber: "",
    interestedService: "VPS Hosting",
    contactEmail: ""
  });

  const updateAdditionalData = (key: string, value: any) => {
    setAdditionalData(prev => ({ ...prev, [key]: value }));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---------- Fetch user info ----------
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await apiFetch("/api/auth/user");
        if (!res.ok) throw new Error("Failed to load user");
        const data = await res.json();
        setUser(data);
      } catch {
        console.error("User fetch failed");
      }
    };
    fetchUser();
  }, []);

  // ---------- Fetch departments ----------
  const fetchDepartments = useCallback(async () => {
    setDeptsLoading(true);
    try {
      const res = await apiFetch("/api/whmcs/tickets/departments");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load departments");
      }
      const data = await res.json();
      setDepartments(data.departments || []);
    } catch (err: any) {
      console.error("Fetch departments error:", err);
      toast.error(err.message || "Failed to load departments");
    } finally {
      setDeptsLoading(false);
    }
  }, []);

  // ---------- Fetch services ----------
  const fetchServices = useCallback(async () => {
    setServicesLoading(true);
    try {
      const res = await apiFetch("/api/whmcs/products/details");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load services");
      }
      const data = await res.json();
      setServices(data.services || []);
    } catch (err: any) {
      console.error("Fetch services error:", err);
      // Don't toast for services — it's optional
    } finally {
      setServicesLoading(false);
    }
  }, []);

  const fetchServiceDetails = async (id: string) => {
    try {
      const res = await apiFetch(`/api/whmcs/products/ticket-details?serviceid=${id}`);

      if (!res.ok) return;

      const data = await res.json();

      const service = data?.services?.[0];

      setServiceConfigOptions(service?.configOptions || []);
      console.log("SERVICE DETAILS:", data);

    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (serviceid) {
      fetchServiceDetails(serviceid);
    }
  }, [serviceid]);

  useEffect(() => {
    fetchDepartments();
    fetchServices();
  }, [fetchDepartments, fetchServices]);

  // ---------- Fetch department wise custom fields ----------  
  const fetchCustomFields = async (deptId: string) => {
    if (!deptId) return;

    setFieldsLoading(true);

    try {
      const res = await apiFetch(`/api/whmcs/tickets/customfields?department_id=${deptId}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setCustomFields(data.fields || []);
    } catch (err: any) {
      console.error("Custom fields error:", err);
      toast.error(err.message || "Failed to load additional fields");
    } finally {
      setFieldsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDeptId) {
      fetchCustomFields(selectedDeptId);
    }
  }, [selectedDeptId]);

  // ---------- Message stats ----------
  const messageStats = useMemo(() => {
    const lines = message ? message.split("\n").length : 0;
    const words = message.trim() ? message.trim().split(/\s+/).length : 0;
    return { lines, words };
  }, [message]);

  // ---------- Handle File Selection ----------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const newFiles = Array.from(e.target.files);
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
    const maxFileSize = 256 * 1024 * 1024; // 256MB

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
      setAttachments((prev) => [...prev, ...validFiles]);
    }

    // Reset input so the same file can be selected again if removed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // ---------- Submit ticket ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDeptId) {
      toast.error("Please select a department");
      return;
    }

    if (!serviceid) {
      toast.error("Please select a service");
      return;
    }

    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    if (!message.trim()) {
      toast.error("Message is required");
      return;
    }

    // ---------- Validate Dynamic Required Fields ----------
    for (const field of customFields) {
      const isRequired = field.required === "on";

      if (isRequired) {
        const key = `field_${field.id}`;
        const value = additionalData[key];

        if (!value || String(value).trim() === "") {
          toast.error(`${field.fieldname} is required`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("deptid", selectedDeptId);
      formData.append("subject", subject.trim());
      formData.append("message", message.trim());
      formData.append("priority", priority);
      if (serviceid) formData.append("serviceid", serviceid);

      attachments.forEach((file) => {
        formData.append("attachments", file);
      });

      // ---------- Send Custom Fields ----------
      formData.append(
        "customfields",
        JSON.stringify(additionalData)
      );

      formData.append(
        "serviceConfigOptions",
        JSON.stringify(serviceConfigOptions)
      );

      formData.append(
        "customFieldDefinitions",
        JSON.stringify(customFields)
      );

      // We use apiFetch directly to maintain auth state. 
      // When sending FormData, DO NOT set Content-Type header to JSON, the browser will set it with the correct boundary automatically.
      const apiRes = await apiFetch("/api/whmcs/tickets/open", {
        method: "POST",
        body: formData,
      });

      const data = await apiRes.json();

      if (!apiRes.ok) {
        throw new Error(data.error || "Failed to create ticket");
      }

      // ---------- Clear the Ticket Cache ----------
      sessionStorage.removeItem("whmcs_ticket_list");

      toast.success(`Ticket #${data.tid} created successfully`);
      router.push("/support");
    } catch (err: any) {
      console.error("Submit ticket error:", err);
      toast.error(err.message || "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 w-full p-2 py-4">
        {/* Header Section */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Open Ticket</h1>
          <div className="flex items-center text-sm text-muted-foreground gap-1.5 flex-wrap">
            <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <span className="opacity-50">/</span>
            <Link href="/support" className="hover:text-foreground">Tickets</Link>
            <span className="opacity-50">/</span>
            <span className="font-medium">Create Ticket</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <TicketInformation
            user={user}
            departments={departments}
            selectedDeptId={selectedDeptId}
            setSelectedDeptId={setSelectedDeptId}
            deptsLoading={deptsLoading}
            services={services}
            serviceid={serviceid}
            setServiceid={setServiceid}
            servicesLoading={servicesLoading}
            priority={priority}
            setPriority={setPriority}
          />

          <TicketDetails
            subject={subject}
            setSubject={setSubject}
            message={message}
            setMessage={setMessage}
            messageStats={messageStats}
            attachments={attachments}
            fileInputRef={fileInputRef}
            handleFileChange={handleFileChange}
            removeAttachment={removeAttachment}
          />

          <AdditionalInformation
            fields={customFields}
            values={additionalData}
            setValues={updateAdditionalData}
            loading={fieldsLoading}
          />

          <div className="rounded-xl flex justify-end items-center gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/support">Back to Tickes</Link>
            </Button>
            <Button type="submit" disabled={submitting} className="bg-white hover:bg-white/90 text-black">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                "Send Message"
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}