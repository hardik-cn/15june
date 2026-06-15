import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Calendar, ExternalLink } from "lucide-react";

interface ServiceCardProps {
  name: string;
  status: "active" | "pending" | "suspended";
  type: string;
  details: string;
  expiryDate: string;
}

export function ServiceCard({ name, status, type, details, expiryDate }: ServiceCardProps) {
  const statusVariant = {
    active: "default",
    pending: "secondary",
    suspended: "destructive",
  }[status] as "default" | "secondary" | "destructive";

  const statusColor = {
    active: "text-success",
    pending: "text-warning",
    suspended: "text-destructive",
  }[status];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{details}</p>
          </div>
          <Badge variant={statusVariant} className="capitalize">
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 mr-2" />
            <span>Expires: {new Date(expiryDate).toLocaleDateString()}</span>
          </div>
          <Button variant="ghost" size="sm">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}