"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Cloud, Layers, Server, HardDrive, Globe } from "lucide-react";

interface QuickActionsProps {
  disabled?: boolean;
}

export function QuickActions({ disabled = false }: QuickActionsProps) {
  const router = useRouter();
  const actions = [
    {
      label: "Cantech Cloud IaaS",
      icon: Cloud,
      color: "text-chart-1",
      url: "https://www.cantech.cloud/compute",
    },
    {
      label: "Cantech Cloud PaaS",
      icon: Layers,
      color: "text-chart-2",
      url: "https://www.cantech.cloud/paas",
    },
    {
      label: "Dedicated Server",
      icon: Server,
      color: "text-chart-3",
      url: "https://www.cantech.in/dedicated-server",
    },
    {
      label: "Standard VPS",
      icon: HardDrive,
      color: "text-chart-4",
      url: "https://www.cantech.in/vps-hosting",
    },
    {
      label: "Domain Registration",
      icon: Globe,
      color: "text-chart-5",
      url: "https://www.cantech.in/register-new-domain",
    },
  ];

  const handleAction = (url: string) => {

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );

  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Quick Actions
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">

          {actions.map((action) => (

            <Button key={action.label} variant="outline" className="h-auto flex flex-col items-center gap-2 py-4" onClick={() => handleAction(action.url)}>
              <action.icon className={`h-6 w-6 ${action.color}`} />
              <span className="text-xs text-center">{action.label}</span>
            </Button>
          ))}

        </div>
      </CardContent>
    </Card>
  );
}