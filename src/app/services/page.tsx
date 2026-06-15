"use client";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/app/components/dashboard/DashboardLayout";
import { Server, Activity, Banknote, TrendingUp, Search, SlidersHorizontal, RefreshCcw, MoreHorizontal } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import Link from "next/link";
import { Badge } from "@/app/components/ui/badge";
import { apiFetch } from "@/lib/apiFetch";


export default function ServicesPage() {

  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await apiFetch("/api/whmcs/products/details");
        const data = await res.json();

        if (data.services) {
          setServices(data.services);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const SkeletonBox = ({ className }: { className: string }) => (
    <div className={`bg-muted animate-pulse rounded ${className}`} />
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">My Services</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-6 border flex items-center justify-between">
            <div className="bg-gradientBg border border-gradientBorder p-4 rounded-lg">
              <Server className="w-8 h-8" />
            </div>
            <div className="text-right">
              {loading ? <SkeletonBox className="h-8 w-12 ml-auto" /> : <p className="text-3xl font-bold">{services.length}</p>}
              <p className="text-sm text-muted-foreground">Total Services</p>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 border flex items-center justify-between">
            <div className="bg-gradientBg border border-gradientBorder p-4 rounded-lg">
              <Activity className="w-8 h-8" />
            </div>
            <div className="text-right">
              {loading ? <SkeletonBox className="h-8 w-12 ml-auto" /> : <p className="text-3xl font-bold">{services.filter((s) => s.status === "Active").length}</p>}
              <p className="text-sm text-muted-foreground">Active Services</p>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 border flex items-center justify-between">
            <div className="bg-gradientBg border border-gradientBorder p-4 rounded-lg">
              <Banknote className="w-8 h-8" />
            </div>
            <div className="text-right">
              {loading ? <SkeletonBox className="h-8 w-20 ml-auto" /> : <p className="text-3xl font-bold">Rs. {services.reduce((acc, service) => acc + (parseFloat(service.recurringAmount) || 0), 0).toFixed(2)}</p>}
              <p className="text-sm text-muted-foreground">Total Spend on Orders</p>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 border flex items-center justify-between">
            <div className="bg-gradientBg border border-gradientBorder p-4 rounded-lg">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div className="text-right">
              {loading ? <SkeletonBox className="h-8 w-20 ml-auto" /> : <p className="text-3xl font-bold">{services.length > 0 ? Math.round((services.filter((s) => s.status === "Active").length / services.length) * 100) : 0}% </p>}
              <p className="text-sm text-muted-foreground">Active Rate</p>
            </div>
          </div>
        </div>


        {/* Services Table Area */}
        <div className="bg-card rounded-xl border flex flex-col">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Project & Services</h2>
          </div>

          <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-muted/20">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by keyword" className="pl-9 w-full bg-background" />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full md:w-auto flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4" />
                    All Services ({services.length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>All Services</DropdownMenuItem>
                  <DropdownMenuItem>Active</DropdownMenuItem>
                  <DropdownMenuItem>Pending</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon">
                <RefreshCcw className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-y">
                <tr>
                  <th className="px-6 py-4 font-medium">NAME</th>
                  <th className="px-6 py-4 font-medium">STATUS</th>
                  <th className="px-6 py-4 font-medium">PRICING</th>
                  <th className="px-6 py-4 font-medium">NEXT DUE DATE</th>
                  <th className="px-6 py-4 font-medium text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-4 w-40 bg-muted rounded mb-2"></div>
                        <div className="h-3 w-24 bg-muted rounded"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-16 bg-muted rounded"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-20 bg-muted rounded mb-2"></div>
                        <div className="h-3 w-16 bg-muted rounded"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-28 bg-muted rounded"></div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="h-8 w-20 bg-muted rounded ml-auto"></div>
                      </td>
                    </tr>
                  ))
                ) : services.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No products found
                    </td>
                  </tr>
                ) : (
                  services.map((service: any) => (
                    <tr key={service.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">{service.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">{service.domain}</div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={service.status === 'Active' ? 'default' : 'secondary'}
                          className={service.status === 'Active' ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20 shadow-none border-0' : ''}
                        >
                          {service.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-medium">
                        <div className="font-semibold text-foreground">Rs. {service.recurringAmount}</div>
                        <div className="text-xs text-muted-foreground mt-1">{service.billingCycle}</div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {new Date(service.nextDueDate).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        }).replace(/(\d{2} \w+) (\d{4})/, '$1, $2')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="default" size="sm" asChild>
                          <Link href={`/services/${service.uuid}`}>Manage</Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}