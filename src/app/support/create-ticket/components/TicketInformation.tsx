"use client";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Loader2 } from "lucide-react";

interface Department {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
  domain: string;
}

interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
}

interface TicketInformationProps {
  user: UserInfo | null;
  departments: Department[];
  selectedDeptId: string;
  setSelectedDeptId: (id: string) => void;
  deptsLoading: boolean;
  services: Service[];
  serviceid: string;
  setServiceid: (id: string) => void;
  servicesLoading: boolean;
  priority: string;
  setPriority: (priority: string) => void;
}

export function TicketInformation({
  user,
  departments,
  selectedDeptId,
  setSelectedDeptId,
  deptsLoading,
  services,
  serviceid,
  setServiceid,
  servicesLoading,
  priority,
  setPriority,
}: TicketInformationProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-normal text-muted-foreground">Ticket Information</h2>
      <div className="bg-card rounded-xl border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ticket Creator */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Ticket Creator</Label>
            <div className="bg-muted/30 rounded-lg p-4 border border-transparent">
              {user ? (
                <div>
                  <p className="font-semibold text-sm">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading...</span>
                </div>
              )}
            </div>
          </div>

          {/* Department Dropdown */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Ticket Department <span className="text-red-500"> *</span></Label>
            <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
              <SelectTrigger className="w-full h-11 bg-background">
                <SelectValue placeholder={deptsLoading ? "Loading departments..." : "Select a department"} />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={String(dept.id)}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Related Service */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Related Service <span className="text-red-500"> *</span></Label>
            <Select value={serviceid} onValueChange={setServiceid}>
              <SelectTrigger className="w-full h-11 bg-background">
                <SelectValue placeholder={servicesLoading ? "Loading services..." : "Select a service"} />
              </SelectTrigger>
              <SelectContent>
                {services.map((svc) => (
                  <SelectItem key={svc.id} value={svc.id}>
                    {svc.name}{svc.domain ? ` - ${svc.domain}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-full h-11 bg-background">
                <SelectValue placeholder="Select Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
