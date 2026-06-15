import crypto from "crypto";

export function verifyDiditSignature(signature: string | null, body: any) {

    if (!signature) return false;

    const secret = process.env.DIDIT_WEBHOOK_SECRET!;

    const expected = crypto
        .createHmac("sha256", secret)
        .update(JSON.stringify(body))
        .digest("hex");

    return signature === expected;
}