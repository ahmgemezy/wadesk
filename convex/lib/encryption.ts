// Uses Web Crypto API (globalThis.crypto) — available in Convex's default runtime.
// No Node.js `crypto` import needed.

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function importKey(): Promise<CryptoKey> {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) throw new Error("ENCRYPTION_SECRET env var is not set");
  const keyBytes = hexToBytes(secret);
  if (keyBytes.length !== 32) {
    throw new Error("ENCRYPTION_SECRET must be a 32-byte hex string (64 hex chars)");
  }
  return globalThis.crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: ALGORITHM },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypts plaintext using AES-256-GCM via Web Crypto API.
 * Returns `iv:ciphertext` (hex-encoded). Auth tag is appended to ciphertext by SubtleCrypto.
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await importKey();
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuffer = await globalThis.crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
    key,
    encoded.buffer as ArrayBuffer,
  );
  return `${bytesToHex(iv)}:${bytesToHex(new Uint8Array(cipherBuffer))}`;
}

/**
 * Decrypts a string produced by `encrypt`.
 */
export async function decrypt(ciphertext: string): Promise<string> {
  const key = await importKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 2) {
    throw new Error("Invalid ciphertext format — expected iv:data");
  }
  const [ivHex, dataHex] = parts;
  const iv = hexToBytes(ivHex);
  const data = hexToBytes(dataHex);
  if (iv.length !== IV_LENGTH) throw new Error("Invalid IV length");
  const plainBuffer = await globalThis.crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
    key,
    data.buffer as ArrayBuffer,
  );
  return new TextDecoder().decode(plainBuffer);
}
