"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, } from "@/app/components/ui/command";
import { Home, Server, CreditCard, MessageSquare, Globe, User, Shield, Lock, } from "lucide-react";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home, group: "Navigation" },
  { title: "My Services", url: "/services", icon: Server, group: "Navigation" },
  { title: "Domain", url: "/domains", icon: Globe, group: "Navigation" },
  { title: "Billing", url: "/billing", icon: CreditCard, group: "Navigation" },
  { title: "Support", url: "/support", icon: MessageSquare, group: "Navigation" },
  { title: "Your Profile", url: "/profile", icon: User, group: "Account" },
  { title: "User Management", url: "/users", icon: User, group: "Account" },
  { title: "Change Password", url: "/change-password", icon: Lock, group: "Account" },
  { title: "Security Settings", url: "/security", icon: Shield, group: "Account" },
];

interface CommandSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandSearch({ open, onOpenChange }: CommandSearchProps) {
  const router = useRouter();

  const handleSelect = useCallback(
    (url: string) => {
      onOpenChange(false);
      router.push(url);
    },
    [router, onOpenChange]
  );

  const groupedItems = menuItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, typeof menuItems>);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search menus..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {Object.entries(groupedItems).map(([group, items]) => (
          <CommandGroup key={group} heading={group}>
            {items.map((item) => (
              <CommandItem
                key={item.url}
                onSelect={() => handleSelect(item.url)}
                className="cursor-pointer"
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}