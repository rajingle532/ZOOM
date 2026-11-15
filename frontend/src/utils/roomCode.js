const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const ALPHABET_LEN = ALPHABET.length;
// Largest multiple of ALPHABET_LEN (31) <= 256 is 248 (31 * 8)
const MAX_VALID_BYTE = Math.floor(256 / ALPHABET_LEN) * ALPHABET_LEN;
const ROOM_CODE_REGEX = /^[a-z0-9_-]{3,64}$/;

/**
 * Generates a 10-character cryptographically secure room code without look-alikes
 * ("abcdefghjkmnpqrstuvwxyz23456789") using crypto.getRandomValues with rejection
 * sampling to completely eliminate modulo bias.
 * @param {number} [length=10]
 * @returns {string}
 */
export function generateRoomCode(length = 10) {
    const cryptoObj = typeof window !== "undefined" && window.crypto
        ? window.crypto
        : (typeof crypto !== "undefined" ? crypto : null);

    if (!cryptoObj || typeof cryptoObj.getRandomValues !== "function") {
        throw new Error("crypto.getRandomValues is not available in current environment");
    }

    let result = "";
    const buffer = new Uint8Array(length * 2);

    while (result.length < length) {
        cryptoObj.getRandomValues(buffer);
        for (let i = 0; i < buffer.length && result.length < length; i++) {
            const byte = buffer[i];
            if (byte < MAX_VALID_BYTE) {
                result += ALPHABET[byte % ALPHABET_LEN];
            }
        }
    }

    return result;
}

/**
 * Parses a room code from a bare string, path, or full URL.
 * Strips query parameters, hashes, and trailing slashes.
 * Returns the lowercase code if it matches /^[a-z0-9_-]{3,64}$/, else null.
 * Never throws.
 * @param {any} input
 * @returns {string|null}
 */
export function parseRoomCode(input) {
    if (!input || typeof input !== "string") {
        return null;
    }

    try {
        let trimmed = input.trim();
        if (!trimmed) return null;

        // Strip hash and query parameters first
        trimmed = trimmed.split("#")[0].split("?")[0];

        // Strip trailing slashes
        trimmed = trimmed.replace(/\/+$/, "");

        let candidate = trimmed;

        // If it looks like a URL (e.g. "https://...", "http://...")
        if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)) {
            try {
                const parsedUrl = new URL(trimmed);
                const segments = parsedUrl.pathname.split("/").filter(Boolean);
                candidate = segments.length > 0 ? segments[segments.length - 1] : "";
            } catch {
                const parts = trimmed.split("/").filter(Boolean);
                candidate = parts.length > 0 ? parts[parts.length - 1] : "";
            }
        } else if (candidate.includes("/")) {
            // Path like "/abc123" or "example.com/abc123"
            const parts = candidate.split("/").filter(Boolean);
            candidate = parts.length > 0 ? parts[parts.length - 1] : "";
        }

        const normalized = candidate.toLowerCase();
        if (ROOM_CODE_REGEX.test(normalized)) {
            return normalized;
        }

        return null;
    } catch {
        return null;
    }
}
