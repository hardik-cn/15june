// src/lib/security/otpGenerate.ts
import crypto from "crypto";

const OTP_WINDOW = 300; // 5 min (in seconds)

// Generate OTP
export function generateOtp(length = 6) {
    const min = 10 ** (length - 1);
    const max = (10 ** length) - 1;
    // const digits = "0123456789";
    // let otp = "";

    // const bytes = crypto.randomBytes(length);

    // for (let i = 0; i < length; i++) {
    //     otp += digits[bytes[i] % 10];
    // }

    return crypto.randomInt(min, max).toString();
}

// Get current time window
export function getTimeWindow() {
    return Math.floor(Date.now() / 1000 / OTP_WINDOW);
}

// Hash OTP with binding
export function hashOtp(otp: string, email: string, window: number) {
    const data = `${otp}:${email}:${window}`;

    return crypto
        .createHmac("sha256", process.env.OTP_SECRET!)
        .update(data)
        .digest("hex");
}