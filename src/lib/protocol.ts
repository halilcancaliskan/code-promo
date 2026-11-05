import { isPromoOptions, type PromoOptions } from "./promo-options.ts";

export const PROTOCOL = "basketball-promo/v1";
export type HostMessage =
  | { protocol: typeof PROTOCOL; channel: string; type: "init"; completed: boolean; options?: PromoOptions }
  | { protocol: typeof PROTOCOL; channel: string; type: "focus"; edge: "first" | "last" };

export function isHostMessage(value: unknown, channel: string): value is HostMessage {
  if (typeof value !== "object" || value === null) return false;
  if (!("protocol" in value) || value.protocol !== PROTOCOL ||
      !("channel" in value) || value.channel !== channel || !("type" in value)) return false;
  return (value.type === "init" && "completed" in value && typeof value.completed === "boolean" &&
    (!("options" in value) || isPromoOptions(value.options))) ||
    (value.type === "focus" && "edge" in value && (value.edge === "first" || value.edge === "last"));
}
