// URL-safe base64 (no padding) of `bytes`.
function toBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

// 16 random bytes -> 22-char unguessable, URL-safe token (the group credential).
export function newSlug(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(16)))
}

export function newId(): string {
  return crypto.randomUUID()
}
