"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Check,
  Copy,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface InviteClientProps {
  inviteId?: string;
  defaultEmail?: string;
  defaultCompanyName?: string;
}

export default function InviteClient({
  inviteId = "",
  defaultEmail = "",
  defaultCompanyName = "Cantech Networks"
}: InviteClientProps) {
  const router = useRouter();

  // Tab State: "login" | "register"
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // Form Loading States
  const [isLoading, setIsLoading] = useState(false);

  // Common Form States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Login Form States
  const [loginEmail, setLoginEmail] = useState(defaultEmail);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginRemember, setLoginRemember] = useState(false);

  // Registration Form States
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState(defaultEmail);
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regAgreeTerms, setRegAgreeTerms] = useState(false);

  // Form Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Password Strength State
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0, // 0 to 4
    feedback: "Enter a password",
    colorClass: "bg-neutral-800"
  });

  // Calculate Password Strength
  useEffect(() => {
    if (!regPassword) {
      setPasswordStrength({
        score: 0,
        feedback: "Enter a password",
        colorClass: "bg-neutral-800"
      });
      return;
    }

    let score = 0;
    const checks = {
      length: regPassword.length >= 8,
      hasUpper: /[A-Z]/.test(regPassword),
      hasLower: /[a-z]/.test(regPassword),
      hasDigit: /[0-9]/.test(regPassword),
      hasSpecial: /[^A-Za-z0-9]/.test(regPassword)
    };

    if (checks.length) score += 1;
    if (checks.hasUpper && checks.hasLower) score += 1;
    if (checks.hasDigit) score += 1;
    if (checks.hasSpecial) score += 1;

    let feedback = "Weak";
    let colorClass = "bg-neutral-600"; // Medium gray

    if (score === 2) {
      feedback = "Fair";
      colorClass = "bg-neutral-500";
    } else if (score === 3) {
      feedback = "Good";
      colorClass = "bg-neutral-300";
    } else if (score === 4) {
      feedback = "Strong";
      colorClass = "bg-white"; // Pure white contrast
    }

    setPasswordStrength({ score, feedback, colorClass });
  }, [regPassword]);

  useEffect(() => {
    if (defaultEmail) {
      setLoginEmail(defaultEmail);
      setRegEmail(defaultEmail);
    }
  }, [defaultEmail]);

  // Generate strong random password
  const handleGeneratePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let generated = "";
    for (let i = 0; i < 14; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    setRegPassword(generated);
    setRegConfirmPassword(generated);
    setShowPassword(true);
    setShowConfirmPassword(true);

    // Copy to clipboard
    navigator.clipboard.writeText(generated);
    toast.success("Strong password generated and copied to clipboard!", {
      description: generated,
      icon: <Sparkles className="h-4 w-4 text-white" />
    });
  };

  // Field Level Validation
  const validateField = (name: string, value: string, compareValue?: string) => {
    let error = "";
    if (name === "email") {
      if (!value) {
        error = "Email address is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        error = "Please enter a valid email address";
      }
    } else if (name === "password") {
      if (!value) {
        error = "Password is required";
      } else if (value.length < 6) {
        error = "Password must be at least 6 characters";
      }
    } else if (name === "fullName") {
      if (!value.trim()) {
        error = "Full name is required";
      }
    } else if (name === "confirmPassword") {
      if (!value) {
        error = "Please confirm your password";
      } else if (value !== compareValue) {
        error = "Passwords do not match";
      }
    }
    return error;
  };

  // Blur Handler
  const handleBlur = (fieldName: string, value: string, compareValue?: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    const error = validateField(fieldName, value, compareValue);
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  // Login Submit Handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailErr = validateField("email", loginEmail);
    const passErr = validateField("password", loginPassword);

    setTouched({ email: true, password: true });
    setErrors({ email: emailErr, password: passErr });

    if (emailErr || passErr) {
      toast.error("Please resolve validation errors");
      return;
    }

    setIsLoading(true);
    try {
      // Hit simulated or actual API
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      toast.success("Login successful! Redirecting...");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Registration Submit Handler
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameErr = validateField("fullName", regFullName);
    const emailErr = validateField("email", regEmail);
    const passErr = validateField("password", regPassword);
    const confirmErr = validateField("confirmPassword", regConfirmPassword, regPassword);

    setTouched({
      fullName: true,
      email: true,
      password: true,
      confirmPassword: true
    });

    setErrors({
      fullName: nameErr,
      email: emailErr,
      password: passErr,
      confirmPassword: confirmErr
    });

    if (nameErr || emailErr || passErr || confirmErr) {
      toast.error("Please resolve validation errors");
      return;
    }

    if (!regAgreeTerms) {
      toast.error("You must agree to the Terms of Service and Privacy Policy");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: regFullName,
          email: regEmail,
          password: regPassword,
          inviteId: inviteId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      toast.success("Account created successfully!", {
        description: "Welcome to your workspace. Setting up your client profile...",
      });

      // Redirect to onboarding or dashboard
      router.push(`/onboarding?id=${data.onboardingUuid}`);
    } catch (err: any) {
      toast.error(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-mulish select-none">
      {/* Background Gradients: Sleek monochrome transition from black to white */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.06),transparent_40%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.8),rgba(24,24,27,0.4))]" />

      {/* Subtle Fine Mesh Grid Pattern for Depth */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-[480px] relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-700">

        {/* Header Invitation Prompt if inviteId is present */}
        {/* {inviteId && (
          <div className="text-center mb-8 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-800 bg-neutral-900/50 backdrop-blur-md text-xs text-neutral-400">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              Invitation ID: {inviteId.substring(0, 8)}...
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Join <span className="text-neutral-400">{defaultCompanyName}</span>
            </h1>
            <p className="text-sm text-neutral-400 max-w-sm mx-auto">
              Confirm your identity to accept the account invitation.
            </p>
          </div>
        )} */}

        {/* Standard Brand Logo Header if no inviteId */}
        {/* {!inviteId && (
          <div className="text-center mb-8 space-y-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white to-neutral-500 p-0.5 mx-auto flex items-center justify-center shadow-xl shadow-black/50">
              <div className="w-full h-full bg-black rounded-[10px] flex items-center justify-center">
                <span className="font-extrabold text-white text-xl tracking-tighter">CT</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Client Portal</h2>
            <p className="text-sm text-neutral-400">Minimalist infrastructure management.</p>
          </div>
        )} */}

        {/* Form Card */}
        <div className="bg-neutral-950/45 backdrop-blur-xl border border-neutral-900/90 rounded-2xl p-6 sm:p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] glow-border transition-all">

          {/* Tab Controller: Pill Switcher */}
          <div className="bg-neutral-900/60 p-1 rounded-xl border border-neutral-800/40 flex mb-8">
            <button
              onClick={() => {
                setActiveTab("login");
                setErrors({});
                setTouched({});
              }}
              className={cn(
                "flex-1 py-2 text-xs uppercase tracking-wider font-bold rounded-lg transition-all duration-300",
                activeTab === "login"
                  ? "bg-white text-black shadow-md"
                  : "text-neutral-400 hover:text-neutral-200"
              )}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setActiveTab("register");
                setErrors({});
                setTouched({});
              }}
              className={cn(
                "flex-1 py-2 text-xs uppercase tracking-wider font-bold rounded-lg transition-all duration-300",
                activeTab === "register"
                  ? "bg-white text-black shadow-md"
                  : "text-neutral-400 hover:text-neutral-200"
              )}
            >
              Create Account
            </button>
          </div>

          {/* SIGN IN FORM */}
          {activeTab === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-5 animate-in fade-in duration-300">

              {/* Email Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-between" htmlFor="login-email">
                  {/* <span>Work Email</span> */}
                  {touched.email && errors.email && (
                    <span className="text-[10px] text-neutral-400 normal-case font-normal flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-neutral-400" /> {errors.email}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    onBlur={() => handleBlur("email", loginEmail)}
                    className={cn(
                      "w-full pl-10 pr-4 py-3 bg-neutral-950/60 border rounded-xl focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all text-sm text-white placeholder-neutral-600",
                      touched.email && errors.email ? "border-neutral-700 bg-neutral-950/40" : "border-neutral-900"
                    )}
                    readOnly={!!inviteId}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5 mt-2">
                {/* <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400" htmlFor="login-password">
                    Password
                  </label>
                  <a href="/forgot-password" className="text-xs text-neutral-500 hover:text-white transition-colors">
                    Forgot?
                  </a>
                </div> */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    onBlur={() => handleBlur("password", loginPassword)}
                    className={cn(
                      "w-full pl-10 pr-10 py-3 bg-neutral-950/60 border rounded-xl focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all text-sm text-white placeholder-neutral-600",
                      touched.password && errors.password ? "border-neutral-700 bg-neutral-950/40" : "border-neutral-900"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {touched.password && errors.password && (
                  <p className="text-[10px] text-neutral-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3 text-neutral-400" /> {errors.password}
                  </p>
                )}
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="login-remember"
                  checked={loginRemember}
                  onChange={(e) => setLoginRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-800 bg-neutral-950 text-white focus:ring-white focus:ring-offset-black accent-white cursor-pointer"
                />
                <label htmlFor="login-remember" className="text-xs text-neutral-400 cursor-pointer select-none hover:text-neutral-200 transition-colors">
                  Keep me logged in for 30 days
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-white text-black hover:bg-neutral-200 py-3 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 text-sm shadow-md"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* CREATE ACCOUNT FORM */}
          {activeTab === "register" && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4.5 animate-in fade-in duration-300">

              {/* Full Name Field */}
              <div className="space-y-1.5 mt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-between" htmlFor="reg-name">
                  {/* <span>Full Name</span> */}
                  {touched.fullName && errors.fullName && (
                    <span className="text-[10px] text-neutral-400 normal-case font-normal flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-neutral-400" /> {errors.fullName}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="reg-name"
                    type="text"
                    required
                    placeholder="John Doe"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    onBlur={() => handleBlur("fullName", regFullName)}
                    className={cn(
                      "w-full pl-10 pr-4 py-2.5 bg-neutral-950/60 border rounded-xl focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all text-sm text-white placeholder-neutral-600",
                      touched.fullName && errors.fullName ? "border-neutral-700 bg-neutral-950/40" : "border-neutral-900"
                    )}
                  />
                </div>
              </div>

              {/* Email Address Field */}
              <div className="space-y-1.5 mt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-between" htmlFor="reg-email">
                  {/* <span>Email Address</span> */}
                  {touched.email && errors.email && (
                    <span className="text-[10px] text-neutral-400 normal-case font-normal flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-neutral-400" /> {errors.email}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    onBlur={() => handleBlur("email", regEmail)}
                    className={cn(
                      "w-full pl-10 pr-4 py-2.5 bg-neutral-950/60 border rounded-xl focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all text-sm text-white placeholder-neutral-600",
                      touched.email && errors.email ? "border-neutral-700 bg-neutral-950/40" : "border-neutral-900"
                    )}
                    readOnly={!!inviteId}
                  />
                </div>
              </div>

              {/* Password Field with Password Generator */}
              <div className="space-y-1.5 mt-2">
                {/* <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400" htmlFor="reg-password">
                    Choose Password
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-xs text-neutral-500 hover:text-white transition-colors flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> Generate
                  </button>
                </div> */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    onBlur={() => handleBlur("password", regPassword)}
                    className={cn(
                      "w-full pl-10 pr-10 py-2.5 bg-neutral-950/60 border rounded-xl focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all text-sm text-white placeholder-neutral-600",
                      touched.password && errors.password ? "border-neutral-700 bg-neutral-950/40" : "border-neutral-900"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {touched.password && errors.password && (
                  <p className="text-[10px] text-neutral-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3 text-neutral-400" /> {errors.password}
                  </p>
                )}
              </div>

              {/* Password Strength Indicator */}
              {/* {regPassword && (
                <div className="space-y-1.5 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center text-[10px] text-neutral-400">
                     <span className="font-semibold uppercase tracking-wider">{passwordStrength.feedback}</span>
                  </div>
                   <div className="grid grid-cols-4 gap-1.5">
                    {[1, 2, 3, 4].map((index) => (
                      <div
                        key={index}
                        className={cn(
                          "h-1 rounded-full transition-all duration-300",
                          index <= passwordStrength.score
                            ? passwordStrength.colorClass
                            : "bg-neutral-900"
                        )}
                      />
                    ))}
                  </div>
                </div>
              )} */}

              {/* Confirm Password Field */}
              <div className="space-y-1.5 mt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-between" htmlFor="reg-confirm-password">
                  {/* <span>Confirm Password</span> */}
                  {touched.confirmPassword && errors.confirmPassword && (
                    <span className="text-[10px] text-neutral-400 normal-case font-normal flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-neutral-400" /> {errors.confirmPassword}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="reg-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    onBlur={() => handleBlur("confirmPassword", regConfirmPassword, regPassword)}
                    className={cn(
                      "w-full pl-10 pr-10 py-2.5 bg-neutral-950/60 border rounded-xl focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all text-sm text-white placeholder-neutral-600",
                      touched.confirmPassword && errors.confirmPassword ? "border-neutral-700 bg-neutral-950/40" : "border-neutral-900"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Terms and Privacy Checkbox */}
              <div className="flex items-start gap-2.5 py-1 mt-2 mb-2">
                <input
                  type="checkbox"
                  id="reg-terms"
                  checked={regAgreeTerms}
                  onChange={(e) => setRegAgreeTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-neutral-800 bg-neutral-950 text-white focus:ring-white focus:ring-offset-black accent-white cursor-pointer shrink-0"
                />
                <label htmlFor="reg-terms" className="text-xs text-neutral-400 cursor-pointer select-none leading-normal">
                  I agree to the{" "}
                  <a href="/terms" className="underline hover:text-white transition-colors">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" className="underline hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                  .
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-white text-black hover:bg-neutral-200 py-3 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 text-sm shadow-md"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    Register Account
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
