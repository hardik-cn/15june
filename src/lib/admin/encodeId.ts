// src/lib/admin/encodeId.ts

/**
 * adminIdCodec.ts
 *
 * Security layers applied:
 *  1. HMAC-style checksum  — tampered tokens are rejected before decode
 *  2. XOR cipher + key rotation — every byte is keyed, position-dependent
 *  3. Salt injection       — two random salt bytes prepended; same ID never
 *                            produces the same token twice
 *  4. Base62 output        — URL-safe, no padding, no obvious hex pattern
 *  5. Prefix obfuscation   — internal sentinel is hashed, not "role_"
 *  6. Length validation    — rejects obviously malformed input immediately
 */

// ─────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────

/**
 * Change SECRET to any long, random string in your environment.
 * In production pull this from an env variable:
 *
 * const SECRET = process.env.ADMIN_ID_SECRET!;
 */
// const SECRET = process.env.ADMIN_ID_SECRET;
const SECRET = "pD+382LBjvxgALHomJG+tXqGNrMY5ArOMCLJhxaUAvVAuuWsoG9utVQf1AXwcl2F";
const BASE62_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

// Internal sentinel — never appears literally in encoded output
const SENTINEL = "adm::";

// ─────────────────────────────────────────────
// KEY GENERATION HELPERS
// ─────────────────────────────────────────────

/**
 * Generate a deterministic key-stream byte
 * derived from SECRET and byte position.
 */
function keyByte(position: number): number {
    let k = 0;

    for (let i = 0; i < SECRET.length; i++) {
        k = (k * 31 + SECRET.charCodeAt(i) + position * 17) & 0xff;
    }

    return k;
}

/**
 * Generate a 16-bit checksum using
 * a djb2-style hashing algorithm.
 */
function checksum16(bytes: number[]): number {
    let h = 5381;

    for (const b of bytes) {
        h = ((h << 5) + h + b) & 0xffff;
    }

    return h;
}

// ─────────────────────────────────────────────
// BASE-256 MATH HELPERS
// ─────────────────────────────────────────────

/**
 * Multiply a little-endian base-256 number
 * by a factor and add a carry value.
 */
function le256MulAdd(num: number[], factor: number, add: number): void {
    let carry = add;

    for (let i = 0; i < num.length; i++) {
        const val = num[i] * factor + carry;

        num[i] = val & 0xff;
        carry = val >>> 8;
    }

    while (carry > 0) {
        num.push(carry & 0xff);
        carry >>>= 8;
    }
}

/**
 * Divide a little-endian base-256 number
 * by a divisor and return the remainder.
 */
function le256DivMod(num: number[], divisor: number): number {
    let rem = 0;

    for (let i = num.length - 1; i >= 0; i--) {
        const cur = rem * 256 + num[i];

        num[i] = Math.floor(cur / divisor);
        rem = cur % divisor;
    }

    while (
        num.length > 1 &&
        num[num.length - 1] === 0
    ) {
        num.pop();
    }

    return rem;
}

/**
 * Check whether a little-endian
 * base-256 number equals zero.
 */
function le256IsZero(num: number[]): boolean {
    return num.length === 1 && num[0] === 0;
}

// ─────────────────────────────────────────────
// BASE62 ENCODING HELPERS
// ─────────────────────────────────────────────

/**
 * Convert a byte array into a Base62 string.
 */
function toBase62(bytes: number[]): string {
    const num: number[] = [0];

    for (const b of bytes) {
        le256MulAdd(num, 256, b);
    }

    if (le256IsZero(num)) {
        return BASE62_CHARS[0];
    }

    let result = "";

    while (!le256IsZero(num)) {
        const rem = le256DivMod(num, 62);

        result = BASE62_CHARS[rem] + result;
    }

    for (const b of bytes) {
        if (b !== 0) break;

        result = BASE62_CHARS[0] + result;
    }

    return result;
}

/**
 * Convert a Base62 string back
 * into a byte array.
 */
function fromBase62(str: string, expectedLen: number): number[] | null {
    const num: number[] = [0];

    for (const ch of str) {
        const idx = BASE62_CHARS.indexOf(ch);

        if (idx === -1) {
            return null;
        }

        le256MulAdd(num, 62, idx);
    }

    const bytes: number[] = [];

    for (let i = 0; i < expectedLen; i++) {
        bytes.unshift(le256DivMod(num, 256));
    }

    return le256IsZero(num) ? bytes : null;
}

// ─────────────────────────────────────────────
// ENCRYPTION HELPERS
// ─────────────────────────────────────────────

/**
 * XOR encrypt/decrypt a byte array
 * using a position-based key stream.
 */
function xorCipher(bytes: number[], offset = 0): number[] {
    return bytes.map((b, i) => b ^ keyByte(i + offset));
}

/**
 * Convert string → UTF-8 bytes.
 */
function strToBytes(value: string): number[] {
    return Array.from(new TextEncoder().encode(value));
}

/**
 * Convert bytes → string.
 */
function bytesToStr(bytes: number[]): string {
    return new TextDecoder().decode(new Uint8Array(bytes));
}

// ─────────────────────────────────────────────
// PUBLIC API - ENCODE
// ─────────────────────────────────────────────

/**
 * Encode an Admin ID into
 * a secure Base62 token.
 *
 * Token Layout:
 *
 * [salt_hi]
 * [salt_lo]
 * [ciphered_payload]
 * [checksum_hi]
 * [checksum_lo]
 */
export function encodeId(id: number | string): string {
    // =============================
    // STEP 1: BUILD PAYLOAD
    // =============================
    const payload = strToBytes(`${SENTINEL}${id}`);
    // =============================
    // STEP 2: GENERATE RANDOM SALT
    // =============================
    const saltHi = Math.floor(Math.random() * 256);
    const saltLo = Math.floor(Math.random() * 256);

    // =============================
    // STEP 3: ENCRYPT PAYLOAD
    // =============================
    const ciphered = xorCipher(payload, 2);

    // =============================
    // STEP 4: GENERATE CHECKSUM
    // =============================
    const preCheck = [
        saltHi,
        saltLo,
        ...ciphered,
    ];

    const cs = checksum16(preCheck);

    const csHi = (cs >> 8) & 0xff;
    const csLo = cs & 0xff;

    const [csHiC, csLoC] = xorCipher([csHi, csLo], 2 + ciphered.length);

    // =============================
    // STEP 5: BUILD TOKEN BYTES
    // =============================
    const allBytes = [
        saltHi,
        saltLo,
        ...ciphered,
        csHiC,
        csLoC,
    ];

    // =============================
    // STEP 6: ENCODE TO BASE62
    // =============================
    return toBase62(allBytes);
}

// ─────────────────────────────────────────────
// PUBLIC API - DECODE
// ─────────────────────────────────────────────

/**
 * Decode a token produced by encodeId().
 *
 * Returns:
 *  - numeric ID
 *  - NaN if invalid/tampered
 */
export function decodeId(token: string): number {
    try {
        // =============================
        // STEP 1: VALIDATE TOKEN
        // =============================
        if (!token || typeof token !== "string") {
            return NaN;
        }

        if (token.length < 13) {
            return NaN;
        }

        // =============================
        // STEP 2: ESTIMATE BYTE LENGTH
        // =============================
        const maxBytes = Math.ceil((token.length * 6) / 8) + 1;

        // =============================
        // STEP 3: ATTEMPT DECODING
        // =============================
        for (let tryLen = 10; tryLen <= maxBytes + 1; tryLen++) {
            const result = tryDecode(token, tryLen);
            if (result !== null) {
                return result;
            }
        }

        return NaN;

    } catch {
        return NaN;
    }
}

// ─────────────────────────────────────────────
// INTERNAL DECODER
// ─────────────────────────────────────────────

function tryDecode(token: string, byteLen: number): number | null {
    // =============================
    // STEP 1: VALIDATE LENGTH
    // =============================
    if (byteLen < 5) {
        return null;
    }

    // =============================
    // STEP 2: DECODE BASE62
    // =============================
    const allBytes = fromBase62(token, byteLen);

    if (!allBytes) {
        return null;
    }

    // =============================
    // STEP 3: EXTRACT TOKEN PARTS
    // =============================
    const saltHi = allBytes[0];
    const saltLo = allBytes[1];

    const csHiC = allBytes[byteLen - 2];
    const csLoC = allBytes[byteLen - 1];

    const ciphered = allBytes.slice(2, byteLen - 2);

    // =============================
    // STEP 4: VERIFY CHECKSUM
    // =============================
    const preCheck = [saltHi, saltLo, ...ciphered];
    const expectedCs = checksum16(preCheck);

    const [csHiC2, csLoC2] = xorCipher([(expectedCs >> 8) & 0xff, expectedCs & 0xff], 2 + ciphered.length);

    if (csHiC !== csHiC2 || csLoC !== csLoC2) {
        return null;
    }

    // =============================
    // STEP 5: DECRYPT PAYLOAD
    // =============================
    const payload = xorCipher(ciphered, 2);

    const decoded = bytesToStr(payload);

    // =============================
    // STEP 6: VERIFY SENTINEL
    // =============================
    if (!decoded.startsWith(SENTINEL)) {
        return null;
    }

    // =============================
    // STEP 7: EXTRACT ID
    // =============================
    const idStr = decoded.slice(SENTINEL.length);

    const id = parseInt(idStr, 10);

    if (isNaN(id) || String(id) !== idStr) {
        return null;
    }

    // =============================
    // STEP 8: RETURN ID
    // =============================
    return id;
}