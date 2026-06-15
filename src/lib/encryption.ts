// lib/encryption.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(64).toString('hex');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt sensitive data like Aadhaar, PAN, GST numbers
 */
export function encrypt(text: string): string {
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const key = Buffer.from(ENCRYPTION_KEY, 'hex');

        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        // Format: iv:authTag:encryptedData
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedData: string): string {
    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format');
        }

        const [ivHex, authTagHex, encrypted] = parts;

        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const key = Buffer.from(ENCRYPTION_KEY, 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
}

/**
 * Mask sensitive data for display (e.g., XXXX-XXXX-1234)
 */
export function maskDocument(documentNumber: string, visibleDigits: number = 4): string {
    if (!documentNumber || documentNumber.length <= visibleDigits) {
        return documentNumber;
    }

    const masked = 'X'.repeat(documentNumber.length - visibleDigits);
    const visible = documentNumber.slice(-visibleDigits);

    return `${masked}${visible}`;
}

/**
 * Mask Aadhaar number (XXXX-XXXX-1234)
 */
export function maskAadhaar(aadhaar: string): string {
    if (!aadhaar || aadhaar.length !== 12) {
        return aadhaar;
    }

    return `XXXX-XXXX-${aadhaar.slice(-4)}`;
}

/**
 * Mask GST number
 */
export function maskGST(gst: string): string {
    if (!gst || gst.length !== 15) {
        return gst;
    }

    // Show first 2 and last 3 characters
    return `${gst.slice(0, 2)}XXXXXXXXXX${gst.slice(-3)}`;
}

/**
 * Hash data for indexing/searching without storing plain text
 */
export function hashDocument(documentNumber: string): string {
    return crypto
        .createHash('sha256')
        .update(documentNumber)
        .digest('hex');
}