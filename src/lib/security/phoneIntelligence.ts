// src/lib/security/phoneIntelligence.ts
import twilio from "twilio";

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
);

export async function checkPhoneIntelligence(phone: string) {
    try {
        const data = await client.lookups.v2.phoneNumbers(phone).fetch({
            fields: "line_type_intelligence,sms_pumping_risk",
        });

        const lineType = data.lineTypeIntelligence?.type;

        const riskScore = Number(
            (data.smsPumpingRisk as any)?.score ?? 0
        );

        if (lineType !== "mobile") {
            return { allowed: false, message: "Invalid phone number type" };
        }

        if (riskScore > 70) {
            return { allowed: false, message: "High risk number detected" };
        }

        return { allowed: true };

    } catch (err) {
        console.error("Twilio Lookup Error:", err);
        return { allowed: true };
    }
}