import twilio from "twilio";

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
);

export async function sendOtp(phone: string) {
    const verification = await client.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
        .verifications.create({
            to: phone,
            channel: "sms",
        });

    return verification;
}

export async function verifyOtp(phone: string, otp: string) {
    const check = await client.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
        .verificationChecks.create({
            to: phone,
            code: otp,
        });

    if (check.status !== "approved") {
        throw new Error("Invalid OTP");
    }

    return true;
}