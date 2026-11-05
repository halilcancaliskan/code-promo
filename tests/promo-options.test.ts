import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isExpiry, isPromoOptions, offerExpired } from "../src/lib/promo-options.ts";
import { isHostMessage, PROTOCOL } from "../src/lib/protocol.ts";

test("options externes bornées, champs inconnus et valeurs invalides refusés", () => {
  assert.equal(isPromoOptions({}), true);
  assert.equal(isPromoOptions({ name: "Ma boutique", accent: "#285c4f", background: "#ffffff", code: "SHOP10", terms: "-10 %", expiresAt: "2026-12-31T22:59:59Z" }), true);
  for (const value of [null, [], { accent: "red" }, { code: "" }, { code: "a".repeat(65) },
    { name: " " }, { name: "a".repeat(81) }, { terms: "a".repeat(501) }, { expiresAt: "2026-02-30T00:00:00Z" }, { allowedOrigins: ["*"] }]) {
    assert.equal(isPromoOptions(value), false);
  }
  assert.equal(isHostMessage({ protocol: PROTOCOL, channel: "abc", type: "init", completed: false, options: { code: "" } }, "abc"), false);
});

test("date UTC exacte et expiration à la milliseconde limite", () => {
  assert.equal(isExpiry("2026-12-31T22:59:59Z"), true);
  assert.equal(isExpiry("2026-12-31T22:59:59.123Z"), true);
  assert.equal(isExpiry("2026-12-31"), false);
  assert.equal(isExpiry("2026-12-31T23:59:59+01:00"), false);
  const limit = "2026-12-31T22:59:59Z";
  assert.equal(offerExpired(limit, Date.parse(limit) - 1), false);
  assert.equal(offerExpired(limit, Date.parse(limit)), true);
  assert.equal(offerExpired(undefined), false);
});
