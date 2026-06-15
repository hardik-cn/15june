"use client";
import React from "react";

const OTPInput = ({ value, onChange, isLoading, monochrome = false }: { value: string, onChange: (val: string) => void, isLoading: boolean, monochrome?: boolean }) => {
    const inputs = React.useRef<HTMLInputElement[]>([]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const val = e.target.value.replace(/\D/g, "");
        if (!val && e.target.value) return;

        const newValue = value.split("");
        newValue[index] = val.slice(-1);
        const joined = newValue.join("");
        onChange(joined);

        // Move to next input
        if (val && index < 5) {
            inputs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === "Backspace" && !value[index] && index > 0) {
            inputs.current[index - 1].focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (paste.length > 0) {
            onChange(paste);
            const nextIndex = Math.min(paste.length, 5);
            inputs.current[nextIndex].focus();
        }
    };

    return (
        <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
            {[...Array(6)].map((_, i) => (
                <input
                    key={i}
                    ref={(el) => { if (el) inputs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value[i] || ""}
                    onChange={(e) => handleChange(e, i)}
                    onKeyDown={(e) => handleKeyDown(e, i)}
                    disabled={isLoading}
                    autoFocus={i === 0}
                    className={`w-10 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold rounded-xl border-2 transition-all duration-300 outline-none
                        ${monochrome
                            ? "bg-black text-white border-white/80 focus:border-white focus:scale-110 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                            : "bg-black text-white border-white/20 focus:border-white focus:bg-white/[0.05]"
                        }`}
                />
            ))}
        </div>
    );
};

export default OTPInput;