"use client";

import { useEffect, useState } from "react";
import { Lock, Wallet } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import { useKycPopup } from "@/lib/kyc/KycContext";

type BalanceData = {
  credit: string;
  currencyCode: string;
  currencySymbol: string;
};

export function Balance() {
  const [data, setData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);

  const { kycStatus, loading: onboardingLoading } = useKycPopup();
  const isOnboarded = kycStatus?.toLowerCase().trim() === "approved";

  useEffect(() => {
    // Skip API call if KYC is not yet approved
    if (onboardingLoading) return;
    if (!isOnboarded) {
      setLoading(false);
      return;
    }

    const fetchBalance = async () => {
      try {
        const res = await apiFetch("/api/whmcs/client/details");
        if (res.ok) {
          const json = await res.json();
          setData({
            credit: json.credit,
            currencyCode: json.currencyCode,
            currencySymbol: json.currencySymbol,
          });
        }
      } catch (error) {
        console.error("Failed to fetch balance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, [isOnboarded, onboardingLoading]);

  if (loading) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-black/40 animate-pulse">
        <div className="h-8 w-8 rounded-lg bg-white/[0.05]" />
        <div className="space-y-1.5">
          <div className="h-2 w-12 bg-white/[0.05] rounded" />
          <div className="h-3.5 w-20 bg-white/[0.05] rounded" />
        </div>
      </div>
    );
  }

  if (!isOnboarded) {
    return (
      <div
        title="Complete KYC to see your balance"
        className="flex items-center gap-2.5 px-5 py-1.5 rounded-xl border border-white/[0.08] bg-black/40 backdrop-blur-xl cursor-default opacity-50 select-none"
      >
        <Lock className="h-4 w-4 text-white/50" />
        <div className="flex flex-col justify-center">
          <p className="text-[10px] font-medium text-white/60 tracking-widest leading-none mb-1">
            Credits
          </p>
          <p className="text-xs font-semibold text-white/40 leading-none tracking-tight">
            — —
          </p>
        </div>
      </div>
    );
  }

  const balance = parseFloat(data?.credit || "0");
  const symbol = data?.currencySymbol || (data?.currencyCode === "USD" ? "$" : "₹");
  const locale = data?.currencyCode === "INR" ? "en-IN" : "en-US";

  return (
    <div className="flex items-center gap-2.5 px-5 py-1.5 rounded-xl border border-white/[0.08] bg-black/40 backdrop-blur-xl hover:bg-white/[0.03] transition-all duration-300 cursor-default group">
      {/* <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/[0.05] text-white/70 border border-white/[0.05] group-hover:scale-105 transition-transform duration-500"> */}
      <Wallet className="h-4 w-4" />
      {/* </div> */}
      <div className="flex flex-col justify-center">
        <p className="text-[10px] font-medium text-white/60 tracking-widest leading-none mb-1">
          Credits
        </p>
        <p className="text-xs font-semibold text-white leading-none tracking-tight">
          {symbol} {balance.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    </div>
  );
}