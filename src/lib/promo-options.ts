export type PromoOptions = {
  name?: string;
  accent?: string;
  background?: string;
  code?: string;
  terms?: string;
  expiresAt?: string;
};

export function isPromoOptions(value: unknown): value is PromoOptions {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const allowed = ["name", "accent", "background", "code", "terms", "expiresAt"];
  if (Object.keys(value).some((key) => !allowed.includes(key))) return false;
  for (const [key, field] of Object.entries(value)) {
    if (typeof field !== "string") return false;
    if (key === "name" && (!field.trim() || field.length > 80)) return false;
    if ((key === "accent" || key === "background") && !/^#[0-9a-f]{6}$/i.test(field)) return false;
    if (key === "code" && (!field.trim() || field.length > 64)) return false;
    if (key === "terms" && (!field.trim() || field.length > 500)) return false;
    if (key === "expiresAt" && !isExpiry(field)) return false;
  }
  return true;
}

export function isExpiry(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString() === value.replace(/Z$/, value.includes(".") ? "Z" : ".000Z");
}

export function offerExpired(expiresAt?: string, now = Date.now()): boolean {
  return expiresAt !== undefined && now >= Date.parse(expiresAt);
}
