// src/app/layout.tsx
import type { Metadata } from "next";
import { Mulish } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

import { ThemeProvider } from "@/app/components/ThemeProvider";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { KycProvider } from "@/lib/kyc/KycContext";

const mulish = Mulish({
  variable: "--font-mulish",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Client Area - Cantech Networks Private Limited",
  description: "Cantech Networks Private Limited",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={mulish.variable}>
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4000}
          expand
          visibleToasts={3}
        />
        <AuthProvider>
          <ThemeProvider>
            <KycProvider>
              {children}
            </KycProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}