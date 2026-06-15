"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef, ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkProps extends Omit<ComponentPropsWithoutRef<typeof Link>, 'className'> {
  className?: string;
  activeClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ href, className, activeClassName, children, ...props }, ref) => {
    const pathname = usePathname();
    const isActive = pathname === href;

    return (
      <Link
        href={href}
        ref={ref}
        className={cn(className, isActive && activeClassName)}
        {...props}
      >
        {children}
      </Link>
    );
  }
);

NavLink.displayName = "NavLink";

export { NavLink };