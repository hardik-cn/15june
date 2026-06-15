"use client";

import { Bell, BellOff } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/app/components/ui/dropdown-menu";

interface Notification {
    id: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
}

interface NotificationDropdownProps {
    notifications?: Notification[];
}

export function NotificationDropdown({
    notifications = [],
}: NotificationDropdownProps) {
    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium flex items-center justify-center">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className="w-80 bg-popover border-border z-50"
            >
                <DropdownMenuLabel className="font-medium flex items-center justify-between">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                        <span className="text-xs text-muted-foreground font-normal">
                            {unreadCount} unread
                        </span>
                    )}
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="py-8 px-4 flex flex-col items-center justify-center text-center">
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                <BellOff className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium text-foreground">
                                No notifications
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                You're all caught up! Check back later.
                            </p>
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 ${!notification.read ? "bg-muted/30" : ""
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div
                                        className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${!notification.read ? "bg-primary" : "bg-transparent"
                                            }`}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {notification.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                            {notification.message}
                                        </p>
                                        <p className="text-xs text-muted-foreground/70 mt-1">
                                            {notification.time}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {notifications.length > 0 && (
                    <>
                        <DropdownMenuSeparator />
                        <div className="p-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-xs text-muted-foreground hover:text-foreground"
                            >
                                Mark all as read
                            </Button>
                        </div>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
