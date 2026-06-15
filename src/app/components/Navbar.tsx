"use client";

import { useState, useEffect } from "react";
import { Menu, Search, BookOpen } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { UserDropdown } from "./UserDropdown";
import { CommandSearch } from "./dashboard/CommandSearch";
import { NotificationDropdown } from "./NotificationDropdown";
import { useMobileSidebar } from "./dashboard/MobileSidebarContext";
import { Balance } from "./Balance";
import Link from "next/link";

export function Navbar() {
  const [commandOpen, setCommandOpen] = useState(false);
  const { toggle: toggleMobileSidebar } = useMobileSidebar();

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <header className="h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30">
        <div className="flex h-full items-center gap-3 px-4 md:px-6">

          {/* ── Mobile hamburger ── */}
          <Button
            id="mobile-nav-trigger"
            variant="ghost"
            size="icon"
            onClick={toggleMobileSidebar}
            className="h-8 w-8 shrink-0 md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-4 w-4" />
          </Button>

          {/* ── Search bar ── */}
          <div className="flex-1 max-w-md">
            <Button
              variant="outline"
              className="w-full justify-start text-muted-foreground h-9 px-3 bg-muted/50 border-border hover:bg-muted"
              onClick={() => setCommandOpen(true)}
            >
              <Search className="mr-2 h-4 w-4 shrink-0" />
              <span className="hidden sm:inline-flex">Search</span>
              <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          </div>

          {/* ── Right-side actions ── */}
          <div className="flex items-center gap-1 md:gap-2 ml-auto">
            <Balance />
            <NotificationDropdown />
            <Link
              className="h-8 w-8 flex items-center justify-center shrink-0"
              aria-label="Knowledge Base"
              href="https://docs.cantech.ng"
              target="_blank"
            >
              <BookOpen className="h-4 w-4" />
            </Link>
            <ThemeSwitcher />
            <UserDropdown />
          </div>
        </div>
      </header>

      <CommandSearch open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  );
}