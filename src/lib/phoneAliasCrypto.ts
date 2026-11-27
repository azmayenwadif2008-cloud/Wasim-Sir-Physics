function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function derivePhoneAesKey(
  normalizedPhone: string,
  password: string,
  usages: KeyUsage[],
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(`wsp-salt:${normalizedPhone}`),
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    usages,
  );
}

export async function derivePhoneAliasId(normalizedPhone: string): Promise<string> {
  const encoder = new TextEncoder();
  const digest = await window.crypto.subtle.digest(
    'SHA-256',
    encoder.encode(`wsp-phone-alias:${normalizedPhone}`),
  );
  return bytesToHex(new Uint8Array(digest));
}

export async function encryptEmailForPhoneAlias(
  normalizedPhone: string,
  password: string,
  email: string,
): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const key = await derivePhoneAesKey(normalizedPhone, password, ['encrypt']);
  const ivBytes = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    encoder.encode(email.trim().toLowerCase()),
  );
  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(ivBytes),
  };
}

export async function decryptEmailFromPhoneAlias(
  normalizedPhone: string,
  password: string,
  ciphertext: string,
  iv: string,
): Promise<string | null> {
  try {
    const key = await derivePhoneAesKey(normalizedPhone, password, ['decrypt']);
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(iv) },
      key,
      base64ToBytes(ciphertext),
    );
    const decoded = new TextDecoder().decode(decrypted).trim().toLowerCase();
    if (/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(decoded)) {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
}
