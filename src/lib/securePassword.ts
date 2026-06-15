// src/lib/securePassword.ts
import crypto from "crypto";
import os from "os";

const ALGO = "aes-256-gcm";

// function getKey() {
//     const seed =
//         (process.env.KEY_SALT || "private") +
//         os.hostname() +
//         (process.env.NODE_ENV || "dev");

//     return crypto.createHash("sha256").update(seed).digest();
// }

function getKey() {
    const seed = process.env.KEY_SALT || "private";
    return crypto.createHash("sha256").update(seed).digest();
}

const KEY = getKey();

export function encrypt(text: string) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, KEY, iv);

    let enc = cipher.update(text, "utf8", "base64");
    enc += cipher.final("base64");

    const tag = cipher.getAuthTag();

    return (
        "CNPL1$" +
        iv.toString("hex") +
        "$" +
        tag.toString("hex") +
        "$" +
        Buffer.from(enc).toString("hex")
    );
}

export function decrypt(payload: string) {
    const [, ivHex, tagHex, dataHex] = payload.split("$");

    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const encrypted = Buffer.from(dataHex, "hex").toString();

    const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
    decipher.setAuthTag(tag);

    let dec = decipher.update(encrypted, "base64", "utf8");
    dec += decipher.final("utf8");

    return dec;
}