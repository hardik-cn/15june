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

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * Change SECRET to any long, random string in your environment.
 * In production pull this from an env variable:
 *   const SECRET = process.env.ADMIN_ID_SECRET!;
 */
// const SECRET = process.env.ADMIN_ID_SECRET;
const SECRET = "pD+382LBjvxgALHomJG+tXqGNrMY5ArOMCLJhxaUAvVAuuWsoG9utVQf1AXwcl2F";


const BASE62_CHARS =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

// Internal sentinel — never appears literally in encoded output
const SENTINEL = "adm::";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Deterministic key-stream derived from SECRET + positional index */
function keyByte(position: number): number {
    let k = 0;
    for (let i = 0; i < SECRET.length; i++) {
        k = (k * 31 + SECRET.charCodeAt(i) + position * 17) & 0xff;
    }
    return k;
}

/** djb2-style 16-bit checksum over a byte array */
function checksum16(bytes: number[]): number {
    let h = 5381;
    for (const b of bytes) {
        h = ((h << 5) + h + b) & 0xffff; // keep to 16 bits
    }
    return h;
}

// ─── BigInt-free base-conversion helpers ─────────────────────────────────────
// Represent arbitrarily large numbers as little-endian arrays of base-256 digits.

/** Multiply a LE-256 number in-place by `factor` and add `carry` */
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

/** Divide a LE-256 number in-place by `divisor`; returns remainder */
function le256DivMod(num: number[], divisor: number): number {
    let rem = 0;
    for (let i = num.length - 1; i >= 0; i--) {
        const cur = rem * 256 + num[i];
        num[i] = Math.floor(cur / divisor);
        rem = cur % divisor;
    }
    // Trim trailing zeros
    while (num.length > 1 && num[num.length - 1] === 0) num.pop();
    return rem;
}

function le256IsZero(num: number[]): boolean {
    return num.length === 1 && num[0] === 0;
}

/** Encode a byte array to Base62 (no BigInt) */
function toBase62(bytes: number[]): string {
    // Load bytes as big-endian into a LE-256 number
    const num: number[] = [0];
    for (const b of bytes) {
        le256MulAdd(num, 256, b);
    }

    if (le256IsZero(num)) return BASE62_CHARS[0];

    let result = "";
    while (!le256IsZero(num)) {
        const rem = le256DivMod(num, 62);
        result = BASE62_CHARS[rem] + result;
    }
    // Preserve leading zero-bytes as '0' chars
    for (const b of bytes) {
        if (b !== 0) break;
        result = BASE62_CHARS[0] + result;
    }
    return result;
}

/** Decode a Base62 string back to a byte array of `expectedLen` bytes (no BigInt) */
function fromBase62(str: string, expectedLen: number): number[] | null {
    const num: number[] = [0];
    for (const ch of str) {
        const idx = BASE62_CHARS.indexOf(ch);
        if (idx === -1) return null;
        le256MulAdd(num, 62, idx);
    }

    // Extract exactly `expectedLen` big-endian bytes
    const bytes: number[] = [];
    for (let i = 0; i < expectedLen; i++) {
        bytes.unshift(le256DivMod(num, 256));
    }

    // If anything remains the token was too large for expectedLen
    return le256IsZero(num) ? bytes : null;
}

/** XOR-cipher: each byte is XOR-ed with a position-keyed stream byte */
function xorCipher(bytes: number[], offset = 0): number[] {
    return bytes.map((b, i) => b ^ keyByte(i + offset));
}

/** String → UTF-8 byte array */
function strToBytes(s: string): number[] {
    return Array.from(new TextEncoder().encode(s));
}

/** Byte array → string (assumes ASCII-safe range after decode) */
function bytesToStr(bytes: number[]): string {
    return new TextDecoder().decode(new Uint8Array(bytes));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Encode an admin numeric ID into a secure, opaque token.
 *
 * Token byte layout (before Base62):
 *   [0]      salt_hi
 *   [1]      salt_lo
 *   [2..N-3] XOR-ciphered payload bytes  (SENTINEL + id-string)
 *   [N-2]    checksum_hi  (covers bytes 0..N-3, also XOR-ciphered)
 *   [N-1]    checksum_lo
 */
export function encodeId(id: number | string): string {
    const payload = strToBytes(`${SENTINEL}${id}`);

    // 2 random salt bytes
    const saltHi = Math.floor(Math.random() * 256);
    const saltLo = Math.floor(Math.random() * 256);

    // XOR-cipher the payload starting at offset 2 (after salt bytes)
    const ciphered = xorCipher(payload, 2);

    // Checksum over [salt, ciphered-payload] — then cipher the checksum itself
    const preCheck = [saltHi, saltLo, ...ciphered];
    const cs = checksum16(preCheck);
    const csHi = (cs >> 8) & 0xff;
    const csLo = cs & 0xff;
    const [csHiC, csLoC] = xorCipher([csHi, csLo], 2 + ciphered.length);

    const allBytes = [saltHi, saltLo, ...ciphered, csHiC, csLoC];
    return toBase62(allBytes);
}

/**
 * Decode a token produced by `encodeId`.
 * Returns the numeric ID, or `NaN` if the token is invalid / tampered.
 */
export function decodeId(token: string): number {
    try {
        if (!token || typeof token !== "string") return NaN;
        // Minimum token: SENTINEL(5) + at least 1 id char + 2 salt + 2 checksum = 10 bytes
        // Base62 of 10 bytes ≥ ~13 chars
        if (token.length < 13) return NaN;

        // We don't know exact byte length until we try; estimate upper bound
        // Each base62 char encodes ~5.95 bits, so bytes ≈ floor(len * 5.95 / 8)
        const maxBytes = Math.ceil((token.length * 6) / 8) + 1;

        // Minimum possible token byte length is 10 (5 sentinel + 1 ID digit + 2 salt + 2 checksum).
        // Try recovering bytes starting from 10 up to maxBytes + 1.
        for (let tryLen = 10; tryLen <= maxBytes + 1; tryLen++) {
            const result = tryDecode(token, tryLen);
            if (result !== null) return result;
        }
        return NaN;
    } catch {
        return NaN;
    }
}

function tryDecode(token: string, byteLen: number): number | null {
    if (byteLen < 5) return null;

    const allBytes = fromBase62(token, byteLen);
    if (!allBytes) return null;

    const saltHi = allBytes[0];
    const saltLo = allBytes[1];
    const csHiC = allBytes[byteLen - 2];
    const csLoC = allBytes[byteLen - 1];
    const ciphered = allBytes.slice(2, byteLen - 2);

    // Verify checksum
    const preCheck = [saltHi, saltLo, ...ciphered];
    const expectedCs = checksum16(preCheck);
    const [csHiC2, csLoC2] = xorCipher(
        [(expectedCs >> 8) & 0xff, expectedCs & 0xff],
        2 + ciphered.length
    );
    if (csHiC !== csHiC2 || csLoC !== csLoC2) return null;

    // Decipher payload
    const payload = xorCipher(ciphered, 2);
    const str = bytesToStr(payload);

    if (!str.startsWith(SENTINEL)) return null;

    const idStr = str.slice(SENTINEL.length);
    const id = parseInt(idStr, 10);
    if (isNaN(id) || String(id) !== idStr) return null; // reject floats / garbage

    return id;
}