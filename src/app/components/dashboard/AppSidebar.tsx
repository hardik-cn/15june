"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  Server,
  CreditCard,
  MessageSquare,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  ChevronRight,
  ChevronDown,
  X,
  FileText,
  TicketIcon,
  PlusCircle,
  Globe,
  Shield,
} from "lucide-react";
import { NavLink } from "@/app/components/NavLink";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useMobileSidebar } from "./MobileSidebarContext";
import { useKycPopup } from "@/lib/kyc/KycContext";

// ─── Types ────────────────────────────────────────────────────────────────────
type DesktopMode = "full" | "icons" | "hover";

interface SubItem {
  title: string;
  url: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems?: SubItem[];
  badge?: number;
}

// ─── Menu Data ────────────────────────────────────────────────────────────────
const menuItems: MenuItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "My Services", url: "/services", icon: Server },
  { title: "Domains", url: "/domains", icon: Globe },
  {
    title: "Billing",
    url: "/billing",
    icon: CreditCard,
    subItems: [
      { title: "Invoices", url: "/billing/invoices", icon: FileText },
    ],
  },
  {
    title: "Support",
    url: "/support",
    icon: MessageSquare,
    subItems: [
      { title: "My Tickets", url: "/support", icon: TicketIcon },
      { title: "Open Ticket", url: "/support/create-ticket", icon: PlusCircle },
    ],
  },
  {
    title: "Security",
    url: "/security-settings",
    icon: Shield,
    subItems: [
      { title: "Two-Factor Auth", url: "/security-settings", icon: Shield },
      { title: "Active Sessions", url: "/active-sessions", icon: Shield },
    ],
  },
];

// ─── Shared Nav Content ────────────────────────────────────────────────────────
interface NavContentProps {
  isCollapsed: boolean;
  showLabels: boolean;
  expandedMenus: Record<string, boolean>;
  toggleMenu: (title: string, e: React.MouseEvent) => void;
  onNavClick?: () => void;
  /** Desktop-only: current mode for the toggle button */
  desktopMode?: DesktopMode;
  onModeToggle?: () => void;
  isMobile?: boolean;
}

function NavContent({
  isCollapsed,
  showLabels,
  expandedMenus,
  toggleMenu,
  onNavClick,
  desktopMode,
  onModeToggle,
  isMobile = false,
}: NavContentProps) {
  const pathname = usePathname();
  const { openPopup, kycStatus, onboardingStatus, } = useKycPopup();

  const lockedRoutes = [
    "/services",
    "/domains",
    "/billing",
    "/support",
    "/profile",
    "/billing/invoices",
    "/support/tickets",
    "/support/create-ticket",
    "/active-sessions",
    "/security-settings"
  ];

  const handleProtectedNavigation = (
    e: React.MouseEvent,
    url: string
  ) => {

    const isLocked =
      lockedRoutes.includes(url);

    if (isLocked) {
      const normalizedKycStatus = kycStatus?.toLowerCase().trim();

      const onboardingCompleted = onboardingStatus === "completed";

      const userFullyVerified = onboardingCompleted && normalizedKycStatus === "approved";

      // still loading → allow middleware to decide
      if (
        onboardingStatus === null &&
        kycStatus === null
      ) {
        e.preventDefault();
        openPopup("required");
        return;
      }

      if (!userFullyVerified) {
        e.preventDefault();

        if (normalizedKycStatus === "pending") {
          openPopup("review");
        } else {
          openPopup("required");
        }

        return;
      }
    }

    onNavClick?.();
  };

  const isParentActive = (item: MenuItem) =>
    item.subItems
      ? item.subItems.some((s) => pathname === s.url) || pathname === item.url
      : pathname === item.url;

  /* Desktop collapse toggle button icon & label */
  const modeIcon = {
    full: <PanelLeftClose className="h-4 w-4" />,
    icons: <PanelLeft className="h-4 w-4" />,
    hover: <ChevronRight className="h-4 w-4" />,
  }[desktopMode ?? "full"];

  const modeLabel = {
    full: "Collapse to icons",
    icons: "Hover-to-expand mode",
    hover: "Pin sidebar open",
  }[desktopMode ?? "full"];

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col h-full select-none overflow-hidden bg-[hsl(var(--sidebar-background))]">

        {/* ── Header ─────────────────────────────── */}
        <div
          className={cn(
            "flex items-center border-b border-[hsl(var(--sidebar-border))] shrink-0",
            "h-14 px-3 gap-2"
          )}
        >
          {/* Logo / icon */}
          <div
            className={cn(
              "flex items-center gap-2 flex-1 min-w-0 transition-all duration-300 overflow-hidden",
              isCollapsed && !isMobile ? "w-0 opacity-0 pointer-events-none" : "opacity-100"
            )}
          >
            <Image
              src="/logo/cantech-logo.svg"
              alt="Cantech Networks"
              width={116}
              height={44}
              className="shrink-0 object-contain"
              priority
            />
          </div>

          {/* Collapsed — show brand initial */}
          {isCollapsed && !isMobile && (
            <div className="flex-1 flex justify-center">
              <div className="h-8 w-8 rounded-lg bg-[hsl(var(--sidebar-accent))] flex items-center justify-center shrink-0 ring-1 ring-[hsl(var(--sidebar-border))]">
                <span className="text-[hsl(var(--sidebar-foreground))] text-xs font-bold tracking-tight">
                  C
                </span>
              </div>
            </div>
          )}

          {/* Desktop mode-cycle button (only when expanded) */}
          {!isMobile && showLabels && onModeToggle && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onModeToggle}
                  aria-label={modeLabel}
                  className={cn(
                    "h-7 w-7 shrink-0 flex items-center justify-center rounded-md",
                    "text-[hsl(var(--sidebar-foreground))]/50",
                    "hover:text-[hsl(var(--sidebar-foreground))]",
                    "hover:bg-[hsl(var(--sidebar-accent))]",
                    "transition-colors duration-200"
                  )}
                >
                  {modeIcon}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">{modeLabel}</TooltipContent>
            </Tooltip>
          )}

          {/* Mobile close button */}
          {isMobile && onNavClick && (
            <button
              onClick={onNavClick}
              aria-label="Close menu"
              className={cn(
                "h-7 w-7 shrink-0 flex items-center justify-center rounded-md ml-auto",
                "text-[hsl(var(--sidebar-foreground))]/60",
                "hover:text-[hsl(var(--sidebar-foreground))]",
                "hover:bg-[hsl(var(--sidebar-accent))]",
                "transition-colors duration-200"
              )}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── Navigation ─────────────────────────── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2" style={{ scrollbarWidth: "none" }}>
          <ul className="space-y-0.5">
            {menuItems.map((item) => {
              const active = isParentActive(item);
              const expanded = !!expandedMenus[item.title];
              const hasChildren = !!item.subItems;

              return (
                <li key={item.title}>
                  {/* ── Parent button ── */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {hasChildren ? (
                        <button
                          onClick={(e) => toggleMenu(item.title, e)}
                          aria-expanded={expanded}
                          className={cn(
                            "group relative flex w-full items-center rounded-lg text-sm font-medium",
                            "transition-colors duration-200 ease-out",
                            "gap-3 px-3 py-2.5",
                            isCollapsed && !isMobile
                              ? "justify-center px-0 py-3"
                              : "justify-between",
                            active
                              ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))]"
                              : [
                                "text-[hsl(var(--sidebar-foreground))]/65",
                                "hover:bg-[hsl(var(--sidebar-accent))]/60",
                                "hover:text-[hsl(var(--sidebar-foreground))]",
                              ]
                          )}
                        >
                          {/* Active bar */}
                          {active && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[hsl(var(--sidebar-foreground))]" />
                          )}

                          <span className={cn("flex items-center", isCollapsed && !isMobile ? "gap-0" : "gap-3")}>
                            <item.icon
                              className={cn(
                                "shrink-0 transition-transform duration-200 group-hover:scale-110",
                                isCollapsed && !isMobile ? "h-5 w-5" : "h-4 w-4"
                              )}
                            />
                            {showLabels && (
                              <span className="truncate">{item.title}</span>
                            )}
                          </span>

                          {showLabels && (
                            <ChevronDown
                              className={cn(
                                "h-3.5 w-3.5 shrink-0 text-[hsl(var(--sidebar-foreground))]/40",
                                "transition-transform duration-300",
                                expanded ? "rotate-0" : "-rotate-90"
                              )}
                            />
                          )}
                        </button>
                      ) : (

                        <NavLink
                          href={item.url}
                          onClick={(e) =>
                            handleProtectedNavigation(e, item.url)
                          }
                          className={cn(
                            "group relative flex w-full items-center rounded-lg text-sm font-medium",
                            "transition-colors duration-200 ease-out",
                            "gap-3 px-3 py-2.5",
                            isCollapsed && !isMobile
                              ? "justify-center px-0 py-3"
                              : "",
                            "text-[hsl(var(--sidebar-foreground))]/65",
                            "hover:bg-[hsl(var(--sidebar-accent))]/60",
                            "hover:text-[hsl(var(--sidebar-foreground))]"
                          )}
                          activeClassName="!bg-[hsl(var(--sidebar-accent))] !text-[hsl(var(--sidebar-foreground))]"
                        >
                          {/* Active bar */}
                          {active && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[hsl(var(--sidebar-foreground))]" />
                          )}
                          <item.icon
                            className={cn(
                              "shrink-0 transition-transform duration-200 group-hover:scale-110",
                              isCollapsed && !isMobile ? "h-5 w-5" : "h-4 w-4"
                            )}
                          />
                          {showLabels && (
                            <>
                              <span className="truncate flex-1">{item.title}</span>
                              {item.badge != null && (
                                <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[hsl(var(--sidebar-foreground))] px-1 text-[10px] font-semibold text-[hsl(var(--sidebar-primary-foreground))] leading-none">
                                  {item.badge}
                                </span>
                              )}
                            </>
                          )}
                        </NavLink>
                      )}
                    </TooltipTrigger>

                    {/* Show tooltip only when collapsed on desktop */}
                    {isCollapsed && !isMobile && (
                      <TooltipContent side="right" className="text-xs font-medium">
                        {item.title}
                        {item.badge != null && (
                          <span className="ml-1.5 rounded-full bg-[hsl(var(--sidebar-foreground))] px-1.5 py-0.5 text-[10px] text-[hsl(var(--sidebar-primary-foreground))]">
                            {item.badge}
                          </span>
                        )}
                      </TooltipContent>
                    )}
                  </Tooltip>

                  {/* ── Sub-menu ── */}
                  {hasChildren && showLabels && (
                    <div
                      className={cn(
                        "grid transition-all duration-300 ease-in-out",
                        expanded
                          ? "grid-rows-[1fr] opacity-100 mt-0.5"
                          : "grid-rows-[0fr] opacity-0"
                      )}
                    >
                      <div className="overflow-hidden">
                        <ul className="ml-4 mt-1 mb-1 space-y-0.5 border-l border-[hsl(var(--sidebar-border))] pl-3">
                          {item.subItems!.map((sub) => {
                            const subActive = pathname === sub.url;
                            return (
                              <li key={sub.title}>
                                <NavLink
                                  href={sub.url}
                                  onClick={(e) =>
                                    handleProtectedNavigation(e, sub.url)
                                  }
                                  className={cn(
                                    "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm",
                                    "transition-colors duration-200",
                                    "text-[hsl(var(--sidebar-foreground))]/55",
                                    "hover:bg-[hsl(var(--sidebar-accent))]/60",
                                    "hover:text-[hsl(var(--sidebar-foreground))]"
                                  )}
                                  activeClassName="!bg-[hsl(var(--sidebar-accent))] !text-[hsl(var(--sidebar-foreground))] font-medium"
                                >
                                  {sub.icon && (
                                    <sub.icon className="h-3.5 w-3.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                                  )}
                                  <span className="flex-1 truncate">{sub.title}</span>
                                  {subActive && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--sidebar-foreground))] shrink-0" />
                                  )}
                                </NavLink>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ── Footer ─────────────────────────────── */}
        <div className="shrink-0 border-t border-[hsl(var(--sidebar-border))] p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                aria-label="Sign out"
                className={cn(
                  "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                  "transition-colors duration-200",
                  "text-[hsl(var(--sidebar-foreground))]/55",
                  "hover:bg-red-500/10 hover:text-red-500",
                  "dark:hover:bg-red-500/15",
                  isCollapsed && !isMobile ? "justify-center px-0 py-3" : ""
                )}
              >
                <LogOut
                  className={cn(
                    "shrink-0 transition-transform duration-200 group-hover:scale-110",
                    isCollapsed && !isMobile ? "h-5 w-5" : "h-4 w-4"
                  )}
                />
                {showLabels && <span>Sign Out</span>}
              </button>
            </TooltipTrigger>
            {isCollapsed && !isMobile && (
              <TooltipContent side="right" className="text-xs font-medium text-red-500">
                Sign Out
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ─── Mobile Drawer ─────────────────────────────────────────────────────────────
interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  expandedMenus: Record<string, boolean>;
  toggleMenu: (title: string, e: React.MouseEvent) => void;
}

function MobileDrawer({ open, onClose, expandedMenus, toggleMenu }: MobileDrawerProps) {
  /* Lock body scroll while drawer is open */
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  /* Close on Escape key */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 md:hidden",
          "bg-black/50 backdrop-blur-[2px]",
          "transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 md:hidden",
          "shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NavContent
          isCollapsed={false}
          showLabels={true}
          expandedMenus={expandedMenus}
          toggleMenu={toggleMenu}
          onNavClick={onClose}
          isMobile={true}
        />
      </aside>
    </>
  );
}

// ─── AppSidebar (public export) ────────────────────────────────────────────────
export function AppSidebar() {
  const [desktopMode, setDesktopMode] = useState<DesktopMode>("full");
  const [isHovered, setIsHovered] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  /* Mobile drawer state comes from context (opened by Navbar hamburger) */
  const { open: mobileOpen, setOpen: setMobileOpen } = useMobileSidebar();

  const toggleMenu = useCallback((title: string, e: React.MouseEvent) => {
    e.preventDefault();
    setExpandedMenus((prev) => ({ ...prev, [title]: !prev[title] }));
  }, []);

  const cycleModeForward = useCallback(() => {
    setDesktopMode((prev) =>
      prev === "full" ? "icons" : prev === "icons" ? "hover" : "full"
    );
  }, []);

  const isCollapsed =
    desktopMode === "icons" || (desktopMode === "hover" && !isHovered);
  const showLabels =
    desktopMode === "full" || (desktopMode === "hover" && isHovered);

  return (
    <>
      {/* Mobile drawer (controlled via MobileSidebarContext) */}
      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        expandedMenus={expandedMenus}
        toggleMenu={toggleMenu}
      />

      {/* Desktop sidebar — sticky, full height */}
      <aside
        aria-label="Main navigation"
        onMouseEnter={() => desktopMode === "hover" && setIsHovered(true)}
        onMouseLeave={() => desktopMode === "hover" && setIsHovered(false)}
        className={cn(
          "hidden md:block",
          "sticky top-0 h-screen shrink-0",
          "border-r border-[hsl(var(--sidebar-border))]",
          "transition-[width] duration-300 ease-in-out",
          isCollapsed ? "w-14" : "w-64"
        )}
      >
        <NavContent
          isCollapsed={isCollapsed}
          showLabels={showLabels}
          expandedMenus={expandedMenus}
          toggleMenu={toggleMenu}
          desktopMode={desktopMode}
          onModeToggle={cycleModeForward}
          isMobile={false}
        />
      </aside>
    </>
  );
}