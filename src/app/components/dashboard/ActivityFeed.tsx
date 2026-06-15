import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";

interface ActivityItem {
  id: string;
  description: string;
  date: string;
  amount?: string;
}

interface ActivityFeedProps {
  title: string;
  items: ActivityItem[];
}

export function ActivityFeed({ title, items }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between items-start border-b border-border last:border-0 pb-3 last:pb-0">
              <div className="flex-1">
                <p className="font-medium text-sm">{item.id}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.date}</p>
              </div>
              {item.amount && (
                <span className="font-semibold text-sm">{item.amount}</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}