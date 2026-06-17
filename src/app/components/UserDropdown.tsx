"use client";

import { useEffect, useState } from "react";
import { User, CircleUser, Users, Lock, Shield, LogOut } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/app/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { useKycPopup } from "@/lib/kyc/KycContext";
import { logout } from "@/lib/auth/logout";

type User = {
  firstName: string;
  lastName: string;
  email: string;
};

export function UserDropdown() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const { openPopup, kycStatus, onboardingStatus, hasKycProfile, loading } = useKycPopup();

  const lockedRoutes = [
    "/profile",
    "/account-details",
    "/user-management",
    "/change-password",
    "/security-settings"
  ];

  const handleProtectedRoute = (url: string) => {

    if (loading) {
      return;
    }

    const onboardingCompleted =
      onboardingStatus === "completed";

    const normalizedKycStatus =
      kycStatus?.toLowerCase().trim();

    const userFullyVerified =
      onboardingCompleted &&
      (
        normalizedKycStatus === "approved" ||
        !hasKycProfile
      );

    if (!userFullyVerified) {

      if (
        hasKycProfile &&
        normalizedKycStatus === "pending"
      ) {
        openPopup("review");
      } else {
        openPopup("required");
      }

      return;
    }

    router.push(url);
  };

  // Fetch logged-in user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await apiFetch("/api/auth/user");
        if (!res.ok) throw new Error("Unauthorized");
        const data = await res.json();
        setUser(data);
      } catch {
        console.error("User fetch failed");
      }
    };

    fetchUser();
  }, []);

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {initials.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user ? `${user.firstName} ${user.lastName}` : "Loading..."}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email ?? ""}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem className="cursor-pointer" onClick={() => handleProtectedRoute("/profile")}>
          <User className="mr-2 h-4 w-4" />
          Your Profile
        </DropdownMenuItem>

        <DropdownMenuItem className="cursor-pointer" onClick={() => handleProtectedRoute("/account-details")}>
          <CircleUser className="mr-2 h-4 w-4" />
          Account Details
        </DropdownMenuItem>

        <DropdownMenuItem className="cursor-pointer" onClick={() => handleProtectedRoute("/user-management")}>
          <Users className="mr-2 h-4 w-4" />
          User Management
        </DropdownMenuItem>

        <DropdownMenuItem className="cursor-pointer" onClick={() => handleProtectedRoute("/change-password")}>
          <Lock className="mr-2 h-4 w-4" />
          Change Password
        </DropdownMenuItem>

        <DropdownMenuItem className="cursor-pointer" onClick={() => handleProtectedRoute("/security-settings")}>
          <Shield className="mr-2 h-4 w-4" />
          Security Settings
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={logout}
          className="text-destructive cursor-pointer focus:text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}